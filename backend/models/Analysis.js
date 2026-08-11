const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
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
  initialMatchScore: Number,
  finalMatchScore: Number,
  improvement: Number,
  iterations: Number,
  missingKeywords: [String],
  strongAreas: [String],
  weakAreas: [String],
  atsScore: {
    before: Number,
    after: Number
  },
  changeLog: [{
    field: String,
    original: String,
    improved: String,
    reason: String
  }],
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Analysis', analysisSchema);
