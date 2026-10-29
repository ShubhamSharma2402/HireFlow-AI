const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const pdfjs = require('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js');
const crypto = require('crypto');

const mongoose = require('mongoose');
const Analysis = require('../models/Analysis');
const Application = require('../models/Application');
const Resume = require('../models/Resume');
const Job = require('../models/Job');
const Memory = require('../models/Memory');
const User = require('../models/User');
const AgentLoop = require('../agent/AgentLoop');
const ToolRegistry = require('../agent/ToolRegistry');
const config = require('../config/agentConfig');

const agentLoop = new AgentLoop();

/**
 * Helper: Ensure userId is a valid Mongoose ObjectId by looking up or creating a User record
 */
const resolveUserId = async (userId, userName) => {
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    const existingUser = await User.findById(userId);
    if (existingUser) return existingUser._id;
  }

  // Create a guest user record in MongoDB if string ID or non-existent ID was provided
  const guestName = userName || 'Guest Candidate';
  const guestEmail = `guest_${Date.now()}_${Math.floor(Math.random() * 10000)}@hireflow.ai`;

  const newUser = await User.create({
    name: guestName,
    email: guestEmail,
  });

  return newUser._id;
};

const flattenToText = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) {
    return val.map(flattenToText).filter(Boolean).join('\n');
  }
  if (typeof val === 'object') {
    return val.description || val.bullet || val.text || val.improved || val.original || val.reason || val.name || val.change || JSON.stringify(val);
  }
  return String(val);
};

/**
 * Helper: Safely normalize change log (from array, stringified JSON, or raw string)
 */
const normalizeChangeLog = (changeLog) => {
  if (!changeLog) return [];
  if (typeof changeLog === 'string') {
    try {
      const parsed = JSON.parse(changeLog);
      if (Array.isArray(parsed)) return normalizeChangeLog(parsed);
    } catch (e) {
      return [{ field: 'general', original: '', improved: changeLog, reason: 'LLM optimization' }];
    }
  }
  if (Array.isArray(changeLog)) {
    return changeLog.map(item => {
      if (typeof item === 'string') {
        return { field: 'general', original: '', improved: item, reason: 'Resume improvement' };
      }
      return {
        field: flattenToText(item?.field || item?.section || 'general'),
        original: flattenToText(item?.original || item?.old || ''),
        improved: flattenToText(item?.improved || item?.new || item?.description || ''),
        reason: flattenToText(item?.reason || item?.explanation || '')
      };
    });
  }
  return [];
};

/**
 * Helper: Safely normalize string arrays
 */
const normalizeStringArray = (arr) => {
  if (!arr) return [];
  if (typeof arr === 'string') return [arr];
  if (Array.isArray(arr)) {
    return arr.map(x => (typeof x === 'object' ? JSON.stringify(x) : String(x)));
  }
  return [];
};

/**
 * Helper: Extract text and embedded clickable hyperlinks from uploaded file or raw text body.
 * Accurately extracts embedded link annotations (e.g. from LaTeX/Overleaf, Word, or Canva)
 * so profiles like LinkedIn, GitHub, LeetCode, or personal portfolios are never lost or faked.
 */
const extractResumeText = async (file, resumeText) => {
  if (resumeText && typeof resumeText === 'string' && resumeText.trim().length > 0) {
    return resumeText.trim();
  }
  if (!file) throw new Error('No resume provided. Upload a file or pass resumeText.');

  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.pdf') {
    const dataBuffer = fs.readFileSync(file.path);
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

    try {
      const [pdfData, doc] = await Promise.all([
        pdfParse(dataBuffer),
        pdfjs.getDocument({ data: new Uint8Array(dataBuffer) })
      ]);

      const extractedLinks = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const annots = await page.getAnnotations();
        if (Array.isArray(annots)) {
          annots.forEach(a => {
            const u = a.url || a.unsafeUrl;
            if (a.subtype === 'Link' && u) {
              extractedLinks.push(u);
            }
          });
        }
      }

      let text = pdfData.text || '';
      const uniqueLinks = [...new Set(extractedLinks)];
      if (uniqueLinks.length > 0) {
        text += '\n\n' + uniqueLinks.join(' | ') + '\n';
      }

      return text.trim();
    } catch (err) {
      console.warn('PDF hyperlink extraction fallback to basic text parse:', err.message);
      const pdfData = await pdfParse(dataBuffer);
      return pdfData.text;
    }
  } else if (ext === '.txt') {
    const text = fs.readFileSync(file.path, 'utf-8');
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    return text;
  } else {
    throw new Error('Unsupported file type. Use PDF or TXT.');
  }
};

/**
 * Helper: Update user memory with weak/strong areas from analysis
 */
const updateMemory = async (userId, scoreData, jobData) => {
  try {
    if (!userId) return;

    let memory = await Memory.findOne({ userId });
    if (!memory) {
      memory = new Memory({ userId });
    }

    memory.applicationCount += 1;
    memory.lastActive = new Date();

    const prevAvg = memory.averageMatchScore || 0;
    memory.averageMatchScore = ((prevAvg * (memory.applicationCount - 1)) + scoreData.totalScore) / memory.applicationCount;

    for (const area of (scoreData.weakAreas || [])) {
      const existing = memory.weakAreas.find(w => w.skill === area);
      if (existing) {
        existing.count += 1;
        existing.lastSeen = new Date();
      } else {
        memory.weakAreas.push({ skill: area, count: 1, lastSeen: new Date() });
      }
    }

    for (const area of (scoreData.strongAreas || [])) {
      const existing = memory.strongAreas.find(s => s.skill === area);
      if (existing) {
        existing.count += 1;
      } else {
        memory.strongAreas.push({ skill: area, count: 1 });
      }
    }

    for (const kw of (scoreData.missingKeywords || [])) {
      const existing = memory.commonMissingKeywords.find(k => k.keyword === kw);
      if (existing) {
        existing.count += 1;
      } else {
        memory.commonMissingKeywords.push({ keyword: kw, count: 1 });
      }
    }

    await memory.save();
  } catch (err) {
    console.warn('⚠️ Memory update failed (non-critical):', err.message);
  }
};

/**
 * POST /api/agent/analyze-gaps
 * Pre-optimization analysis: parses documents, computes baseline match score,
 * and determines if missing skills require confirmation before resume generation.
 */
exports.analyzeGaps = async (req, res, next) => {
  try {
    const { jobText } = req.body;
    const resumeText = req.body.resumeText || null;
    const file = req.file || null;

    if (!jobText || jobText.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'jobText is required' });
    }
    if (!resumeText && !file) {
      return res.status(400).json({ success: false, message: 'Resume file or resumeText is required' });
    }

    // Extract resume text
    const extractedResumeText = await extractResumeText(file, resumeText);
    if (!extractedResumeText || extractedResumeText.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Could not extract readable text from resume. Please upload a valid PDF or TXT file.',
      });
    }

    // Run deterministic parsers
    const [jobData, resumeData] = await Promise.all([
      ToolRegistry.executeTool('JobDescriptionParser', jobText),
      ToolRegistry.executeTool('ResumeParser', extractedResumeText),
    ]);

    // Run keyword analysis & deterministic scoring
    const keywordData = await ToolRegistry.executeTool('KeywordExtractor', { jobData, resumeData });
    const baselineScore = await ToolRegistry.executeTool('MatchScorer', { jobData, resumeData, keywordData });

    const targetThreshold = config.SCORE_THRESHOLD || 80;
    const unsupportedSkills = keywordData.unsupportedSkills || [];
    const hasUnsupported = unsupportedSkills.length > 0;
    const isBelowThreshold = baselineScore.totalScore < targetThreshold;

    // Confirmation popup required if there are genuine missing skills and score is below threshold
    const requiresConfirmation = hasUnsupported && isBelowThreshold;

    res.status(200).json({
      success: true,
      data: {
        requiresConfirmation,
        targetThreshold,
        baselineScore: baselineScore.totalScore,
        breakdown: baselineScore.breakdown,
        matchedSkills: keywordData.matchedSkills || [],
        missingSkills: unsupportedSkills,
        missingRequired: keywordData.missingRequired || [],
        missingPreferred: keywordData.missingPreferred || [],
        extractedResumeText,
        jobData: {
          title: jobData.title,
          company: jobData.company,
          skills: jobData.skills,
        },
        resumeData: {
          name: resumeData.name,
          email: resumeData.email,
        },
      },
    });
  } catch (error) {
    console.error('❌ Error in analyzeGaps:', error);
    next(error);
  }
};

/**
 * POST /api/agent/run
 * Main entry point: runs the full agentic pipeline with user confirmed/declined skills
 */
exports.runAgent = async (req, res, next) => {
  try {
    const { userId, userName, jobText, jobUrl, userChoice = 'none' } = req.body;
    const resumeText = req.body.resumeText || null;
    const file = req.file || null;

    // Parse confirmedSkills and declinedSkills safely
    let confirmedSkills = [];
    if (req.body.confirmedSkills) {
      try {
        confirmedSkills = typeof req.body.confirmedSkills === 'string'
          ? JSON.parse(req.body.confirmedSkills)
          : req.body.confirmedSkills;
      } catch (e) {
        confirmedSkills = Array.isArray(req.body.confirmedSkills) ? req.body.confirmedSkills : [req.body.confirmedSkills];
      }
    }

    let declinedSkills = [];
    if (req.body.declinedSkills) {
      try {
        declinedSkills = typeof req.body.declinedSkills === 'string'
          ? JSON.parse(req.body.declinedSkills)
          : req.body.declinedSkills;
      } catch (e) {
        declinedSkills = Array.isArray(req.body.declinedSkills) ? req.body.declinedSkills : [req.body.declinedSkills];
      }
    }

    // --- Input validation ---
    if (!jobText) return res.status(400).json({ success: false, message: 'jobText is required' });
    if (!resumeText && !file) return res.status(400).json({ success: false, message: 'Resume file or resumeText is required' });

    // --- Resolve or create valid Mongoose ObjectId for user ---
    const validUserId = await resolveUserId(userId, userName);

    // --- Extract resume text ---
    const extractedResumeText = await extractResumeText(file, resumeText);

    // --- Job text ---
    const finalJobText = jobText;

    // --- Check job cache ---
    const jobHash = crypto.createHash('md5').update(finalJobText).digest('hex');
    let jobDoc = await Job.findOne({ hash: jobHash });

    // --- Create or retrieve Analysis record ---
    const analysisDoc = await Analysis.create({
      userId: validUserId,
      confirmedSkills,
      declinedSkills,
      userChoice,
      status: 'running',
    });

    // --- Run the agentic loop ---
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🤖 HireFlow AI Agent Starting`);
    console.log(`👤 User: ${userName || userId}`);
    console.log(`🎯 User Choice: ${userChoice}`);
    console.log(`${'='.repeat(60)}\n`);

    const result = await agentLoop.run({
      resumeText: extractedResumeText,
      jobText: finalJobText,
      userId: validUserId.toString(),
      userName: userName || 'Candidate',
      confirmedSkills,
      declinedSkills,
      userChoice,
    });

    if (!result.success) {
      await Analysis.findByIdAndUpdate(analysisDoc._id, { status: 'failed' });
      return res.status(500).json({ success: false, message: result.error || 'Agent failed' });
    }

    // --- Cache job description ---
    if (!jobDoc) {
      jobDoc = await Job.create({
        hash: jobHash,
        title: result.jobData.title || 'Unknown Role',
        company: result.jobData.company || 'Unknown Company',
        location: result.jobData.location || '',
        rawText: finalJobText,
        parsedData: result.jobData,
        sourceUrl: jobUrl || '',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    }

    const cleanChangeLog = normalizeChangeLog(result.changeLog);
    const cleanMissingKeywords = normalizeStringArray(
      result.finalScore?.allMissingSkills || result.finalScore?.missingCriticalSkills
    );
    const cleanStrongAreas = normalizeStringArray(result.finalScore?.strongAreas);
    const cleanWeakAreas = normalizeStringArray(result.finalScore?.weakAreas);

    // --- Save resume with versioning ---
    const resumeDoc = await Resume.create({
      userId: validUserId,
      originalFileName: file?.originalname || 'pasted_resume.txt',
      rawText: extractedResumeText,
      parsedData: result.resumeData,
      versions: [
        {
          version: 1,
          content: result.resumeData,
          matchScore: result.initialScore?.totalScore || 0,
          improvements: [],
          createdAt: new Date(),
        },
        ...(result.iterations > 0 ? [{
          version: 2,
          content: result.improvedResume,
          matchScore: result.finalScore?.totalScore || 0,
          improvements: cleanChangeLog,
          createdAt: new Date(),
        }] : []),
      ],
      currentVersion: result.iterations > 0 ? 2 : 1,
    });

    // --- Update analysis record ---
    await Analysis.findByIdAndUpdate(analysisDoc._id, {
      resumeId: resumeDoc._id,
      jobId: jobDoc._id,
      initialMatchScore: result.initialScore?.totalScore || 0,
      finalMatchScore: result.finalScore?.totalScore || 0,
      improvement: (result.finalScore?.totalScore || 0) - (result.initialScore?.totalScore || 0),
      iterations: result.iterations,
      missingKeywords: cleanMissingKeywords,
      strongAreas: cleanStrongAreas,
      weakAreas: cleanWeakAreas,
      atsScore: {
        before: result.initialScore?.breakdown?.atsScore || 0,
        after: result.finalScore?.breakdown?.atsScore || 0,
      },
      changeLog: cleanChangeLog,
      stopReason: result.stopReason,
      unsupportedSkills: result.unsupportedSkills || [],
      confirmedSkills,
      declinedSkills,
      userChoice,
      status: 'completed',
    });

    // --- Save application ---
    const applicationDoc = await Application.create({
      userId: validUserId,
      resumeId: resumeDoc._id,
      jobId: jobDoc._id,
      analysisId: analysisDoc._id,
      finalResumeContent: result.improvedResume,
      coverLetter: result.coverLetter,
      qaResponses: result.qaResponses,
      status: 'draft',
    });

    // --- Update memory (non-blocking) ---
    updateMemory(validUserId, result.finalScore, result.jobData);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ HireFlow AI Agent Completed Successfully`);
    console.log(`📊 Score: ${result.initialScore?.totalScore} → ${result.finalScore?.totalScore}`);
    console.log(`🔄 Iterations: ${result.iterations}`);
    console.log(`${'='.repeat(60)}\n`);

    res.status(200).json({
      success: true,
      message: 'Agent completed successfully',
      data: {
        analysisId: analysisDoc._id,
        applicationId: applicationDoc._id,
        resumeId: resumeDoc._id,
        jobId: jobDoc._id,
        result: {
          jobData: result.jobData,
          resumeData: result.resumeData,
          improvedResume: result.improvedResume,
          initialScore: result.initialScore,
          finalScore: result.finalScore,
          iterations: result.iterations,
          changeLog: cleanChangeLog,
          unsupportedSkills: result.unsupportedSkills || [],
          confirmedSkills,
          declinedSkills,
          userChoice,
          stopReason: result.stopReason,
          coverLetter: result.coverLetter,
          qaResponses: result.qaResponses,
          explanations: result.explanations || {},
          suggestions: normalizeStringArray(result.suggestions || result.explanations?.suggestions),
          agentDecisions: (result.agentDecisions || []).map(d => ({
            ...d,
            message: flattenToText(d.message || d.action || ''),
            step: flattenToText(d.step || '')
          })),
        },
      },
    });
  } catch (error) {
    console.error('❌ Agent Controller Error:', error);
    next(error);
  }
};

/**
 * GET /api/agent/analysis/:id
 */
exports.getAnalysis = async (req, res, next) => {
  try {
    const analysis = await Analysis.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('resumeId', 'originalFileName currentVersion')
      .populate('jobId', 'title company');

    if (!analysis) {
      res.status(404);
      throw new Error('Analysis not found');
    }

    res.status(200).json({ success: true, data: analysis });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/agent/application/:id
 */
exports.getApplication = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('resumeId')
      .populate('jobId')
      .populate('analysisId');

    if (!application) {
      res.status(404);
      throw new Error('Application not found');
    }

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/agent/application/:id/approve
 */
exports.approveApplication = async (req, res, next) => {
  try {
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedAt: new Date() },
      { new: true }
    );

    if (!application) {
      res.status(404);
      throw new Error('Application not found');
    }

    res.status(200).json({ success: true, data: application, message: 'Application approved!' });
  } catch (error) {
    next(error);
  }
};
