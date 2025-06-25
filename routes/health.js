// routes/health.js
const express = require('express');
const router = express.Router();

router.get('/status', (req, res) => {
  res.json({ status: 'Server is healthy' });
});

module.exports = router;
