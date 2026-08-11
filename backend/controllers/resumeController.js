const Resume = require('../models/Resume');

exports.uploadResume = async (req, res, next) => {
  try {
    const { userId, rawText } = req.body;
    const file = req.file;

    if (!userId) {
      res.status(400);
      throw new Error('UserId is required');
    }

    // In a real app, process file if provided (e.g., pdf-parse)
    const contentText = rawText || (file ? `Parsed content from ${file.originalname}` : '');

    const resume = await Resume.create({
      userId,
      originalFileName: file ? file.originalname : 'raw_text_input',
      rawText: contentText,
      versions: [{ version: 1, content: { rawText: contentText } }]
    });

    res.status(201).json({
      success: true,
      data: resume,
      message: 'Resume uploaded successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.getResume = async (req, res, next) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume) {
      res.status(404);
      throw new Error('Resume not found');
    }
    res.status(200).json({
      success: true,
      data: resume,
      message: 'Resume retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserResumes = async (req, res, next) => {
  try {
    const resumes = await Resume.find({ userId: req.params.userId });
    res.status(200).json({
      success: true,
      data: resumes,
      message: 'User resumes retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.updateResume = async (req, res, next) => {
  try {
    const resume = await Resume.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!resume) {
      res.status(404);
      throw new Error('Resume not found');
    }
    res.status(200).json({
      success: true,
      data: resume,
      message: 'Resume updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteResume = async (req, res, next) => {
  try {
    const resume = await Resume.findByIdAndDelete(req.params.id);
    if (!resume) {
      res.status(404);
      throw new Error('Resume not found');
    }
    res.status(200).json({
      success: true,
      data: {},
      message: 'Resume deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.getResumeVersions = async (req, res, next) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume) {
      res.status(404);
      throw new Error('Resume not found');
    }
    res.status(200).json({
      success: true,
      data: resume.versions,
      message: 'Resume versions retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};
