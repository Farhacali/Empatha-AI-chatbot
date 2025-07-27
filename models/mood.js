const mongoose = require('mongoose');

const moodSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mood: {
    type: String,
    required: true,
    enum: ['very-happy', 'happy', 'neutral', 'sad', 'very-sad']
  },
  label: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Mood', moodSchema);
