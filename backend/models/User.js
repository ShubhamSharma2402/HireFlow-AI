const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebase_uid: {
    type: String,
    unique: true,
    sparse: true,   // allows null without violating unique constraint
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Please add a name'],
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    index: true,
  },
  password: {
    type: String,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret) {
      delete ret.__v;
      delete ret.password;
      return ret;
    },
  },
});

module.exports = mongoose.model('User', userSchema);
