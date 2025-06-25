// routes/reminders.js
const express = require('express');
// In ReminderService.js
const ReminderModel = require('../models/Reminder');

const router = express.Router();

router.get('/user/:userId', async (req, res) => {
  try {
    const reminders = await Reminder.find({ userId: req.params.userId });
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
