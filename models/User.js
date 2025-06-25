const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  profile: {
    age: Number,
    medicalConditions: [String],
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      times: [String]
    }],
    emergencyContacts: [{
      name: String,
      phone: String,
      relationship: String
    }],
    preferences: {
      language: String,
      reminderStyle: String,
      communicationStyle: String
    }
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);