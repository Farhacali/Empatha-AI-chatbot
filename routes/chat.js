// routes/chat.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('Chat route is working.');
});

module.exports = router;
