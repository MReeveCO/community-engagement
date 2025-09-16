const express = require('express');
const db = require('../db');
const router = express.Router();

// Get all questions
router.get('/', (req, res) => {
  const questions = db.getAllQuestions();
  res.json(questions);
});

// Create a new question
router.post('/', (req, res) => {
  const { prompt, imageUrl = null, additionalInfo = null } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt is required' });
  }
  const created = db.createQuestion({ prompt: prompt.trim(), imageUrl, additionalInfo });
  res.status(201).json(created);
});

// Update a question
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const { prompt, imageUrl = null, additionalInfo = null } = req.body || {};
  if (!prompt || Number.isNaN(id)) {
    return res.status(400).json({ error: 'invalid id or prompt' });
  }
  const updated = db.updateQuestion({ id, prompt: String(prompt).trim(), imageUrl, additionalInfo });
  res.json(updated);
});

// Delete a question
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });
  const ok = db.deleteQuestion(id);
  if (!ok) return res.status(404).json({ error: 'not found' });
  res.json({ id });
});

module.exports = router;
