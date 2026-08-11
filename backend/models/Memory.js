const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    unique: true,
    index: true
  },
  weakAreas: [{
    skill: String,
    count: Number,
    lastSeen: Date
  }],
  strongAreas: [{
    skill: String,
    count: Number
  }],
  applicationCount: {
    type: Number,
    default: 0
  },
  averageMatchScore: Number,
  commonMissingKeywords: [{
    keyword: String,
    count: Number
  }],
  lastActive: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('Memory', memorySchema);
