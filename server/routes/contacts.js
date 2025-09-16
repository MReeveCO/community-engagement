const express = require('express');
const db = require('../db');
const router = express.Router();

// Get all contacts
router.get('/', (req, res) => {
  const contacts = db.getAllContacts();
  res.json(contacts);
});

// Create a new contact
router.post('/', (req, res) => {
  const { name, phone } = req.body || {};
  if (!name || !phone) {
    return res.status(400).json({ error: 'Missing required fields: name, phone' });
  }
  const created = db.createContact(name, phone);
  res.status(201).json(created);
});

// Delete a contact
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const ok = db.removeContact(id);
  if (!ok) {
    return res.status(404).json({ error: 'Contact not found' });
  }
  res.json({ id });
});

module.exports = router;
