const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const crypto = require('crypto');

const mongoose = require('mongoose');
const Analysis = require('../models/Analysis');
const Application = require('../models/Application');
const Resume = require('../models/Resume');
const Job = require('../models/Job');
const Memory = require('../models/Memory');
const User = require('../models/User');
const AgentLoop = require('../agent/AgentLoop');

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
        field: String(item?.field || 'general'),
        original: String(item?.original || ''),
        improved: String(item?.improved || ''),
        reason: String(item?.reason || '')
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
 * Helper: Extract text from uploaded file or raw text body
 */
const extractResumeText = async (file, resumeText) => {
  if (resumeText) return resumeText;
  if (!file) throw new Error('No resume provided. Upload a file or pass resumeText.');

  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.pdf') {
    const dataBuffer = fs.readFileSync(file.path);
    const pdfData = await pdfParse(dataBuffer);
    // Clean up uploaded file after parsing
    fs.unlinkSync(file.path);
    return pdfData.text;
  } else if (ext === '.txt') {
    const text = fs.readFileSync(file.path, 'utf-8');
    fs.unlinkSync(file.path);
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
    let memory = await Memory.findOne({ userId });
    if (!memory) {
      memory = new Memory({ userId });
    }

    memory.applicationCount += 1;
    memory.lastActive = new Date();

    // Update average match score
    const prevAvg = memory.averageMatchScore || 0;
    memory.averageMatchScore = ((prevAvg * (memory.applicationCount - 1)) + scoreData.totalScore) / memory.applicationCount;

    // Track weak areas
    for (const area of (scoreData.weakAreas || [])) {
      const existing = memory.weakAreas.find(w => w.skill === area);
      if (existing) {
        existing.count += 1;
        existing.lastSeen = new Date();
      } else {
        memory.weakAreas.push({ skill: area, count: 1, lastSeen: new Date() });
      }
    }

    // Track strong areas
    for (const area of (scoreData.strongAreas || [])) {
      const existing = memory.strongAreas.find(s => s.skill === area);
      if (existing) {
        existing.count += 1;
      } else {
        memory.strongAreas.push({ skill: area, count: 1 });
      }
    }

    // Track common missing keywords
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
 * POST /api/agent/run
 * Main entry point: runs the full agentic pipeline
 */
exports.runAgent = async (req, res, next) => {
  try {
    const { userId, userName, jobText, jobUrl } = req.body;
    const resumeText = req.body.resumeText || null;
    const file = req.file || null;

    // --- Input validation ---
    if (!jobText && !jobUrl) return res.status(400).json({ success: false, message: 'jobText or jobUrl is required' });
    if (!resumeText && !file) return res.status(400).json({ success: false, message: 'Resume file or resumeText is required' });

    // --- Resolve or create valid Mongoose ObjectId for user ---
    const validUserId = await resolveUserId(userId, userName);

    // --- Extract resume text ---
    const extractedResumeText = await extractResumeText(file, resumeText);

    // --- Job text: use provided text or jobUrl as-is ---
    const finalJobText = jobText || `Job URL provided: ${jobUrl}`;

    // --- Check job cache ---
    const jobHash = crypto.createHash('md5').update(finalJobText).digest('hex');
    let jobDoc = await Job.findOne({ hash: jobHash });

    // --- Create or retrieve Analysis record ---
    const analysisDoc = await Analysis.create({
      userId: validUserId,
      status: 'running',
    });

    // --- Run the agentic loop ---
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🤖 HireFlow AI Agent Starting`);
    console.log(`👤 User: ${userName || userId}`);
    console.log(`${'='.repeat(60)}\n`);

    const result = await agentLoop.run({
      resumeText: extractedResumeText,
      jobText: finalJobText,
      userId,
      userName: userName || 'Candidate',
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
    const cleanMissingKeywords = normalizeStringArray(result.finalScore?.missingKeywords);
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
        // Full result for frontend display
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
 * User approves the generated application
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
