const express = require('express');
const db = require('../db');
const router = express.Router();

// Get answer statistics
router.get('/answers', (req, res) => {
  const stats = db.getAnswerStats();
  res.json(stats);
});

module.exports = router;
