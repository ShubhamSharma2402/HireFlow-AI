const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    index: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    index: true
  },
  analysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Analysis'
  },
  finalResumeContent: mongoose.Schema.Types.Mixed,
  coverLetter: {
    subject: String,
    body: String,
    tone: String
  },
  qaResponses: [{
    question: String,
    answer: String,
    tips: String,
    type: { type: String }
  }],
  status: {
    type: String,
    enum: ['draft', 'approved', 'downloaded'],
    default: 'draft'
  },
  approvedAt: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('Application', applicationSchema);
