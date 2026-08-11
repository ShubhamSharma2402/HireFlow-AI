const Job = require('../models/Job');
const crypto = require('crypto');

exports.createJob = async (req, res, next) => {
  try {
    const { title, company, location, rawText, sourceUrl } = req.body;
    
    const stringToHash = sourceUrl || rawText || title + company;
    const hash = crypto.createHash('md5').update(stringToHash).digest('hex');

    let job = await Job.findOne({ hash });

    if (!job) {
      job = await Job.create({
        hash,
        title,
        company,
        location,
        rawText,
        sourceUrl
      });
    }

    res.status(201).json({
      success: true,
      data: job,
      message: 'Job processed successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.getJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      res.status(404);
      throw new Error('Job not found');
    }
    res.status(200).json({
      success: true,
      data: job,
      message: 'Job retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.getJobByHash = async (req, res, next) => {
  try {
    const job = await Job.findOne({ hash: req.params.hash });
    if (!job) {
      res.status(404);
      throw new Error('Job not found');
    }
    res.status(200).json({
      success: true,
      data: job,
      message: 'Job retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.updateJob = async (req, res, next) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!job) {
      res.status(404);
      throw new Error('Job not found');
    }
    res.status(200).json({
      success: true,
      data: job,
      message: 'Job updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) {
      res.status(404);
      throw new Error('Job not found');
    }
    res.status(200).json({
      success: true,
      data: {},
      message: 'Job deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find({});
    res.status(200).json({
      success: true,
      data: jobs,
      message: 'Jobs retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};
