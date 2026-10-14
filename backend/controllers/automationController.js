const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');

const User = require('../models/User');
const Job = require('../models/Job');
const Resume = require('../models/Resume');
const JobMatch = require('../models/JobMatch');
const AgentRun = require('../models/AgentRun');
const Application = require('../models/Application');

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
  return res.status(410).json({
    success: false,
    message: 'Job automation scraping has been deprecated. Please use the direct agent optimization endpoint at /api/agent/run.',
  });
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
        matchId: m._id,
        jobId: m.jobId._id,
        title: m.jobId.title || 'Unknown Title',
        company: m.jobId.company || 'Unknown Company',
        skillsRequired: m.jobId.skillsRequired || [],
        keywords: m.jobId.keywords || [],
        source: m.jobId.source || 'internshala',
        sourceUrl: m.jobId.sourceUrl || '',
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
