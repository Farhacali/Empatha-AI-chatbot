// routes/user.js
const express = require('express');
const User = require('../models/User');
const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
