const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const isProd = process.env.NODE_ENV === 'production';

app.use(cors(isProd ? { origin: CLIENT_ORIGIN } : { origin: true }));
app.use(express.json());

// Contacts are persisted in SQLite via ./db

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/users/:userId', (req, res) => {
  const { userId } = req.params
  const user = db.getUserById(userId)
  res.json(user || { userId })
})

app.put('/api/users/:userId', (req, res) => {
  const { userId } = req.params
  const { name = null, email = null, address = null, dateOfBirth = null } = req.body || {}
  const saved = db.saveUser({ userId, name, email, address, dateOfBirth })
  res.json(saved)
})

app.get('/api/questions', (req, res) => {
  const questions = db.getAllQuestions()
  res.json(questions)
})

app.post('/api/questions', (req, res) => {
  const { prompt, imageUrl = null } = req.body || {}
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt is required' })
  }
  const created = db.createQuestion({ prompt: prompt.trim(), imageUrl })
  res.status(201).json(created)
})

app.put('/api/questions/:id', (req, res) => {
  const id = Number(req.params.id)
  const { prompt, imageUrl = null } = req.body || {}
  if (!prompt || Number.isNaN(id)) {
    return res.status(400).json({ error: 'invalid id or prompt' })
  }
  const updated = db.updateQuestion({ id, prompt: String(prompt).trim(), imageUrl })
  res.json(updated)
})

app.delete('/api/questions/:id', (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' })
  const ok = db.deleteQuestion(id)
  if (!ok) return res.status(404).json({ error: 'not found' })
  res.json({ id })
})

app.post('/api/answers', (req, res) => {
  const { userId, questionId, answer } = req.body || {}
  if (!userId || typeof questionId !== 'number' || typeof answer !== 'boolean') {
    return res.status(400).json({ error: 'Missing or invalid fields: userId, questionId:number, answer:boolean' })
  }
  try {
    const saved = db.saveAnswer({ userId, questionId, answer })
    res.status(201).json(saved)
  } catch (e) {
    res.status(500).json({ error: 'Failed to save answer' })
  }
})

app.get('/api/answers/:userId', (req, res) => {
  const { userId } = req.params
  const answers = db.getAnswersForUser(userId)
  res.json(answers)
})

app.delete('/api/answers/:userId', (req, res) => {
  const { userId } = req.params
  try {
    const removed = db.removeAnswersForUser(userId)
    res.json({ removed })
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete answers' })
  }
})

app.get('/api/stats/answers', (req, res) => {
  const stats = db.getAnswerStats()
  res.json(stats)
})

app.get('/api/contacts', (req, res) => {
  const contacts = db.getAllContacts();
  res.json(contacts);
});

app.post('/api/contacts', (req, res) => {
  const { name, phone } = req.body || {};
  if (!name || !phone) {
    return res.status(400).json({ error: 'Missing required fields: name, phone' });
  }
  const created = db.createContact(name, phone);
  res.status(201).json(created);
});

app.delete('/api/contacts/:id', (req, res) => {
  const id = Number(req.params.id);
  const ok = db.removeContact(id);
  if (!ok) {
    return res.status(404).json({ error: 'Contact not found' });
  }
  res.json({ id });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`CORS allowed origin: ${CLIENT_ORIGIN}`);
});


