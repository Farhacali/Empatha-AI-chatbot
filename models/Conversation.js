const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userMessage: String,
  aiResponse: String,
  emotion: String,
  intent: String,
  actions: [Object],
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Conversation', conversationSchema);