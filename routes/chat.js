// routes/chat.js
const express = require('express');
const router = express.Router();
const AIAgent = require('../services/AIAgent');

const agent = new AIAgent();

router.get('/', (req, res) => {
  res.json({ status: 'Chat route working' });
});

router.post('/message', async (req, res) => {
  try {
    const { message, userId } = req.body;
    if (!message || !userId) {
      return res.status(400).json({ error: 'message and userId are required' });
    }
    const result = await agent.processMessage(message, userId, null);
    res.json(result);
  } catch (err) {
    console.error('❌ Chat route error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
