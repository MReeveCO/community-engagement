const express = require('express');
const db = require('../db');
const router = express.Router();

// Save an answer
router.post('/', (req, res) => {
  const { userId, questionId, answer } = req.body || {};
  if (!userId || typeof questionId !== 'number' || typeof answer !== 'boolean') {
    return res.status(400).json({ error: 'Missing or invalid fields: userId, questionId:number, answer:boolean' });
  }
  try {
    const saved = db.saveAnswer({ userId, questionId, answer });
    res.status(201).json(saved);
  } catch (e) {
    res.status(500).json({ error: 'Failed to save answer' });
  }
});

// Get answers for a user
router.get('/:userId', (req, res) => {
  const { userId } = req.params;
  const answers = db.getAnswersForUser(userId);
  res.json(answers);
});

// Delete all answers for a user
router.delete('/:userId', (req, res) => {
  const { userId } = req.params;
  try {
    const removed = db.removeAnswersForUser(userId);
    res.json({ removed });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete answers' });
  }
});

module.exports = router;
