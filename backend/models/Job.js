const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  hash: {
    type: String,
    sparse: true,
    index: true,
  },
  title: { type: String, default: 'Unknown Title' },
  company: { type: String, default: 'Unknown Company' },
  location: { type: String, default: '' },
  rawText: { type: String, default: '' },
  source: {
    type: String,
    enum: ['manual', 'adzuna', 'internshala', 'linkedin', 'naukri', 'other'],
    default: 'manual',
    index: true,
  },
  sourceUrl: { type: String, default: '' },
  redirectUrl: { type: String, default: '' },
  jobType: {
    type: String,
    enum: ['internship', 'full-time', 'part-time', 'contract', 'unknown'],
    default: 'unknown',
  },
  // Top-level skill arrays for fast querying
  skillsRequired: [{ type: String }],
  keywords: [{ type: String }],
  parsedData: {
    title: String,
    company: String,
    requirements: [String],
    skills: [String],
    keywords: [String],
    responsibilities: [String],
    niceToHave: [String],
  },
  cachedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 7 * 24 * 60 * 60 * 1000),
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Job', jobSchema);
