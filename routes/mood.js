const express = require('express');
const Mood = require('../models/Mood');
const jwt = require('jsonwebtoken');

const router = express.Router();

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Save mood entry
router.post('/', authenticateToken, async (req, res) => {
  const { mood, label } = req.body;
  const moodEntry = new Mood({ userId: req.user.userId, mood, label });
  await moodEntry.save();
  res.json({ message: 'Mood saved', entry: moodEntry });
});

// Get mood history
router.get('/', authenticateToken, async (req, res) => {
  const moods = await Mood.find({ userId: req.user.userId }).sort({ timestamp: -1 }).limit(10);
  res.json({ moods });
});

module.exports = router;
