const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');

const User = require('../models/User');
const Job = require('../models/Job');
const Resume = require('../models/Resume');
const JobMatch = require('../models/JobMatch');
const AgentRun = require('../models/AgentRun');
const Application = require('../models/Application');

const ToolRegistry = require('../agent/ToolRegistry');
const PlannerAgent = require('../agents/PlannerAgent');
const ScraperAgent = require('../agents/ScraperAgent');
const MatchingAgent = require('../agents/MatchingAgent');
const ResumeOptimizerAgent = require('../agents/ResumeOptimizerAgent');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const extractResumeText = async (file, textBody) => {
  if (textBody) return textBody;
  if (!file) throw new Error('No resume provided. Upload a PDF/TXT file or pass resumeText.');
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.pdf') {
    const buf = fs.readFileSync(file.path);
    const parsed = await pdfParse(buf);
    fs.unlinkSync(file.path);
    return parsed.text;
  } else if (ext === '.txt') {
    const text = fs.readFileSync(file.path, 'utf-8');
    fs.unlinkSync(file.path);
    return text;
  }
  throw new Error('Unsupported file type. Use PDF or TXT.');
};

const getOrCreateUser = async (firebaseUser) => {
  const { uid, email, name } = firebaseUser;
  let user = await User.findOne({ firebase_uid: uid });
  if (!user) {
    user = await User.findOne({ email });
    if (user) {
      user.firebase_uid = uid;
      await user.save();
    } else {
      user = await User.create({
        firebase_uid: uid,
        email,
        name: name || email.split('@')[0],
      });
    }
  }
  return user;
};

// ---------------------------------------------------------------------------
// POST /api/automation/start
// ---------------------------------------------------------------------------
exports.startAutomation = async (req, res, next) => {
  let agentRun = null;
  try {
    const { resumeText: bodyResumeText } = req.body;
    const file = req.file || null;

    // Parse roles from body (FormData sends arrays as JSON string or repeated keys)
    let roles = [];
    if (req.body.roles) {
      if (typeof req.body.roles === 'string') {
        try { roles = JSON.parse(req.body.roles); } catch { roles = [req.body.roles]; }
      } else if (Array.isArray(req.body.roles)) {
        roles = req.body.roles;
      }
    }

    if (!roles || roles.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one role must be selected.' });
    }

    // Extract resume
    const resumeText = await extractResumeText(file, bodyResumeText);
    if (!resumeText || resumeText.trim().length < 50) {
      return res.status(400).json({ success: false, message: 'Resume content is too short or empty.' });
    }

    // Get or create user
    const user = await getOrCreateUser(req.firebaseUser);

    // Step 1: Parse resume
    const resumeData = await ToolRegistry.executeTool('ResumeParser', resumeText);
    if (!resumeData.rawText) resumeData.rawText = resumeText;

    // Save resume to DB
    const savedResume = await Resume.create({
      userId: user._id,
      originalFileName: file?.originalname || 'resume.txt',
      rawText: resumeText,
      parsedData: {
        name: resumeData.name || '',
        email: resumeData.email || '',
        phone: resumeData.phone || '',
        summary: resumeData.summary || '',
        skills: Array.isArray(resumeData.skills) ? resumeData.skills : [],
        experience: Array.isArray(resumeData.experience) ? resumeData.experience : [],
        education: Array.isArray(resumeData.education) ? resumeData.education : [],
        projects: Array.isArray(resumeData.projects) ? resumeData.projects : [],
      },
      versions: [{ version: 1, content: resumeData, matchScore: 0, createdAt: new Date() }],
      currentVersion: 1,
    });

    // Step 2: Plan
    const planner = new PlannerAgent();
    const plan = planner.plan(roles, resumeData);

    agentRun = await AgentRun.create({
      userId: user._id,
      agentType: 'automation_full',
      steps: [{ ...plan, timestamp: new Date() }],
      status: 'running',
    });

    // Step 3: Scrape jobs
    const scraper = new ScraperAgent();
    const scrapedJobs = await scraper.scrapeAll(roles, resumeData.skills || []);

    agentRun.steps.push({
      step: 'scrape_complete',
      jobsFound: scrapedJobs.length,
      timestamp: new Date(),
    });
    await agentRun.save();

    // Step 4: Save jobs to DB (upsert)
    for (const job of scrapedJobs) {
      try {
        const saved = await Job.findOneAndUpdate(
          { title: job.title, company: job.company },
          {
            $set: {
              title: job.title,
              company: job.company || 'Unknown Company',
              rawText: job.description || '',
              source: job.source || 'adzuna',
              sourceUrl: job.sourceUrl || '',
              redirectUrl: job.redirectUrl || '',
              jobType: job.jobType || 'unknown',
              skillsRequired: job.skillsRequired || [],
              keywords: job.keywords || [],
              parsedData: {
                title: job.title,
                company: job.company,
                requirements: job.skillsRequired || [],
                skills: job.skillsRequired || [],
                keywords: job.keywords || [],
                responsibilities: [],
                niceToHave: [],
              },
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          },
          { upsert: true, new: true }
        );
        job._id = saved._id;
      } catch (err) {
        console.warn(`[Automation] Failed to save job "${job.title}":`, err.message);
      }
    }

    // Step 5: Match jobs to resume
    const matcher = new MatchingAgent();
    const matchResults = await matcher.matchAll(resumeData, scrapedJobs);

    agentRun.steps.push({
      step: 'match_complete',
      matchesComputed: matchResults.length,
      timestamp: new Date(),
    });
    await agentRun.save();

    // Step 6: Save job matches to DB
    const responseJobs = [];
    for (const m of matchResults) {
      if (!m.job || !m.job._id) continue;

      try {
        await JobMatch.findOneAndUpdate(
          { userId: user._id, jobId: m.job._id },
          {
            $set: {
              userId: user._id,
              jobId: m.job._id,
              matchScore: m.matchScore,
              missingSkills: m.missingSkills || [],
              strongSkills: m.strongSkills || [],
              atsScoreEstimate: m.atsScoreEstimate || 0,
              rank: m.rank,
            },
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.warn(`[Automation] Failed to save match:`, err.message);
      }

      responseJobs.push({
        _id: m.job._id,
        jobId: m.job._id,
        title: m.job.title,
        company: m.job.company,
        description: m.job.description,
        skillsRequired: m.job.skillsRequired || [],
        keywords: m.job.keywords || [],
        source: m.job.source || 'adzuna',
        sourceUrl: m.job.sourceUrl || '',
        redirectUrl: m.job.redirectUrl || '',
        jobType: m.job.jobType || 'unknown',
        role: m.job.role || '',
        matchScore: m.matchScore,
        atsScoreEstimate: m.atsScoreEstimate,
        missingSkills: m.missingSkills || [],
        strongSkills: m.strongSkills || [],
        rank: m.rank,
      });
    }

    // Finalize agent run
    agentRun.steps.push({
      step: 'rank_complete',
      totalRanked: responseJobs.length,
      timestamp: new Date(),
    });
    agentRun.finalDecision = `Scraped and ranked ${responseJobs.length} jobs across ${roles.length} role(s): ${roles.join(', ')}`;
    agentRun.status = 'completed';
    await agentRun.save();

    return res.status(200).json({
      success: true,
      message: `Found and ranked ${responseJobs.length} jobs`,
      data: {
        jobs: responseJobs,
        agentRunId: agentRun._id,
        resumeId: savedResume._id,
        userId: user._id,
        plan: plan.plan,
        rolesProcessed: roles,
      },
    });

  } catch (error) {
    console.error('[AutomationController] startAutomation error:', error);
    if (agentRun) {
      agentRun.status = 'failed';
      agentRun.steps.push({ step: 'error', message: error.message, timestamp: new Date() });
      await agentRun.save().catch(() => {});
    }
    next(error);
  }
};

// ---------------------------------------------------------------------------
// GET /api/automation/jobs
// ---------------------------------------------------------------------------
exports.getJobMatches = async (req, res, next) => {
  try {
    const user = await getOrCreateUser(req.firebaseUser);

    const matches = await JobMatch.find({ userId: user._id })
      .populate('jobId')
      .sort({ rank: 1 })
      .lean();

    const result = matches
      .filter(m => m.jobId) // guard against deleted jobs
      .map(m => ({
        _id: m.jobId._id,
        matchId: m._id,
        jobId: m.jobId._id,
        title: m.jobId.title || 'Unknown Title',
        company: m.jobId.company || 'Unknown Company',
        skillsRequired: m.jobId.skillsRequired || [],
        keywords: m.jobId.keywords || [],
        source: m.jobId.source || 'adzuna',
        sourceUrl: m.jobId.sourceUrl || '',
        redirectUrl: m.jobId.redirectUrl || '',
        jobType: m.jobId.jobType || 'unknown',
        description: m.jobId.rawText || '',
        matchScore: m.matchScore,
        atsScoreEstimate: m.atsScoreEstimate,
        missingSkills: m.missingSkills || [],
        strongSkills: m.strongSkills || [],
        rank: m.rank,
      }));

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// POST /api/automation/optimize/:jobId
// ---------------------------------------------------------------------------
exports.optimizeForJob = async (req, res, next) => {
  let agentRun = null;
  try {
    const { jobId } = req.params;
    const user = await getOrCreateUser(req.firebaseUser);

    // Get the job
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Get user's most recent resume
    const resume = await Resume.findOne({ userId: user._id }).sort({ createdAt: -1 });
    if (!resume || !resume.rawText) {
      return res.status(404).json({
        success: false,
        message: 'No resume found for this user. Please start automation first.',
      });
    }

    // Compose job text for optimizer
    const jobText = [
      `Job Title: ${job.title}`,
      `Company: ${job.company}`,
      job.rawText || '',
      job.skillsRequired?.length ? `Required Skills: ${job.skillsRequired.join(', ')}` : '',
      ...(job.parsedData?.requirements || []),
    ].filter(Boolean).join('\n');

    agentRun = await AgentRun.create({
      userId: user._id,
      jobId: job._id,
      agentType: 'optimizer',
      steps: [{ step: 'init', message: 'Starting resume optimization', jobTitle: job.title, timestamp: new Date() }],
      status: 'running',
    });

    // Run optimizer (wraps existing AgentLoop)
    const optimizer = new ResumeOptimizerAgent();
    const result = await optimizer.optimize({
      resumeText: resume.rawText,
      jobText,
      userId: user._id.toString(),
      userName: user.name || 'Candidate',
    });

    if (!result.success) {
      agentRun.status = 'failed';
      agentRun.steps.push({ step: 'error', message: result.error, timestamp: new Date() });
      await agentRun.save();
      return res.status(500).json({ success: false, message: result.error || 'Optimization failed' });
    }

    // Save application
    const application = await Application.create({
      userId: user._id,
      resumeId: resume._id,
      jobId: job._id,
      finalResumeContent: result.improvedResume,
      coverLetter: result.coverLetter,
      qaResponses: result.qaResponses,
      status: 'draft',
    });

    agentRun.steps.push({
      step: 'completed',
      applicationId: application._id,
      scoreImprovement: `${result.initialScore?.totalScore} → ${result.finalScore?.totalScore}`,
      timestamp: new Date(),
    });
    agentRun.finalDecision = `Optimized resume for "${job.title}" at ${job.company}`;
    agentRun.iterations = result.iterations || 0;
    agentRun.status = 'completed';
    await agentRun.save();

    return res.status(200).json({
      success: true,
      message: 'Resume optimized successfully',
      data: {
        applicationId: application._id,
        agentRunId: agentRun._id,
        result: {
          jobData: result.jobData,
          resumeData: result.resumeData,
          improvedResume: result.improvedResume,
          initialScore: result.initialScore,
          finalScore: result.finalScore,
          iterations: result.iterations,
          changeLog: result.changeLog,
          coverLetter: result.coverLetter,
          qaResponses: result.qaResponses,
          explanations: result.explanations,
          suggestions: result.suggestions,
          agentDecisions: result.agentDecisions,
        },
      },
    });
  } catch (error) {
    console.error('[AutomationController] optimizeForJob error:', error);
    if (agentRun) {
      agentRun.status = 'failed';
      agentRun.steps.push({ step: 'error', message: error.message, timestamp: new Date() });
      await agentRun.save().catch(() => {});
    }
    next(error);
  }
};
