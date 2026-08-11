const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  hash: {
    type: String,
    unique: true,
    index: true
  },
  title: String,
  company: String,
  location: String,
  rawText: String,
  parsedData: {
    title: String,
    company: String,
    requirements: [String],
    skills: [String],
    keywords: [String],
    responsibilities: [String],
    niceToHave: [String]
  },
  sourceUrl: String,
  cachedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 7 * 24 * 60 * 60 * 1000)
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Job', jobSchema);
