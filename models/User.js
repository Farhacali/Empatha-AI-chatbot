const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  joinedDate: { type: Date, default: Date.now },
  settings: {
    dailyCheckins: { type: Boolean, default: true },
    moodReminders: { type: Boolean, default: true },
    weeklyReports: { type: Boolean, default: false },
    anonymousMode: { type: Boolean, default: false }
  },
  sessionCount: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
