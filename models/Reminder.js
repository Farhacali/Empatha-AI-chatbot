// models/Reminder.js
const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: String,
  scheduledTime: Date,
  type: { type: String, default: 'general' },
  sent: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reminder', reminderSchema);
