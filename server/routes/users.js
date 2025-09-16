const express = require('express');
const db = require('../db');
const router = express.Router();

// Get user by ID
router.get('/:userId', (req, res) => {
  const { userId } = req.params;
  const user = db.getUserById(userId);
  res.json(user || { userId });
});

// Update user details
router.put('/:userId', (req, res) => {
  const { userId } = req.params;
  const { name = null, email = null, address = null, dateOfBirth = null } = req.body || {};
  const saved = db.saveUser({ userId, name, email, address, dateOfBirth });
  res.json(saved);
});

module.exports = router;
