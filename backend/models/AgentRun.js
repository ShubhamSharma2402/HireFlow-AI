const mongoose = require('mongoose');

const agentRunSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    default: null,
  },
  agentType: {
    type: String,
    enum: ['planner', 'scraper', 'matching', 'optimizer', 'cover_letter', 'automation_full'],
    default: 'automation_full',
  },
  steps: [mongoose.Schema.Types.Mixed],
  iterations: {
    type: Number,
    default: 0,
  },
  finalDecision: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['running', 'completed', 'failed'],
    default: 'running',
  },
}, {
  timestamps: true,
});

agentRunSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AgentRun', agentRunSchema);
