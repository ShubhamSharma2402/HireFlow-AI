const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  originalFileName: String,
  rawText: String,
  parsedData: {
    name: String,
    email: String,
    phone: String,
    summary: String,
    skills: [String],
    experience: [mongoose.Schema.Types.Mixed],
    education: [mongoose.Schema.Types.Mixed],
    projects: [mongoose.Schema.Types.Mixed]
  },
  versions: [{
    version: Number,
    content: mongoose.Schema.Types.Mixed,
    matchScore: Number,
    improvements: [mongoose.Schema.Types.Mixed],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  currentVersion: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Resume', resumeSchema);
