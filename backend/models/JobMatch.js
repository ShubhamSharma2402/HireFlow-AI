const mongoose = require('mongoose');

const jobMatchSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true,
  },
  matchScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  missingSkills: [String],
  strongSkills: [String],
  atsScoreEstimate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  rank: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Compound index for efficient user job ranking queries
jobMatchSchema.index({ userId: 1, rank: 1 });
jobMatchSchema.index({ userId: 1, jobId: 1 }, { unique: true });

module.exports = mongoose.model('JobMatch', jobMatchSchema);
