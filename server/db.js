const Database = require('better-sqlite3')
const path = require('path')

const dbPath = path.join(__dirname, '..', 'database', 'contacts.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')

db.exec(`
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL
);
`)

db.exec(`
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prompt TEXT NOT NULL,
  image_url TEXT
);
`)

db.exec(`
CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  question_id INTEGER NOT NULL,
  answer INTEGER NOT NULL, -- 0 = left/false, 1 = right/true
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, question_id),
  FOREIGN KEY(question_id) REFERENCES questions(id) ON DELETE CASCADE
);
`)

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  address TEXT,
  date_of_birth TEXT
);
`)

// Seed a few questions if table is empty
const existingQuestions = db.prepare('SELECT COUNT(*) as cnt FROM questions').get()
if (existingQuestions.cnt === 0) {
  const seed = db.prepare('INSERT INTO questions (prompt, image_url) VALUES (?, ?)')
  const sample = [
    ['Do you enjoy outdoor activities?', null],
    ['Are you interested in volunteering weekly?', null],
    ['Do you prefer group events over solo tasks?', null],
  ]
  const txn = db.transaction(() => {
    for (const [prompt, image] of sample) seed.run(prompt, image)
  })
  txn()
}

const statements = {
  listContacts: db.prepare('SELECT id, name, phone FROM contacts ORDER BY id ASC'),
  insertContact: db.prepare('INSERT INTO contacts (name, phone) VALUES (?, ?)'),
  deleteContact: db.prepare('DELETE FROM contacts WHERE id = ?'),
  listQuestions: db.prepare('SELECT id, prompt, image_url AS imageUrl FROM questions ORDER BY id ASC'),
  insertQuestion: db.prepare('INSERT INTO questions (prompt, image_url) VALUES (?, ?)'),
  updateQuestion: db.prepare('UPDATE questions SET prompt = ?, image_url = ? WHERE id = ?'),
  deleteQuestion: db.prepare('DELETE FROM questions WHERE id = ?'),
  upsertAnswer: db.prepare(`
    INSERT INTO answers (user_id, question_id, answer)
    VALUES (@userId, @questionId, @answer)
    ON CONFLICT(user_id, question_id) DO UPDATE SET answer=excluded.answer, created_at=CURRENT_TIMESTAMP
  `),
  listAnswersForUser: db.prepare('SELECT question_id AS questionId, answer FROM answers WHERE user_id = ?'),
  deleteAnswersForUser: db.prepare('DELETE FROM answers WHERE user_id = ?'),
  answerStats: db.prepare(`
    SELECT q.id AS questionId,
           q.prompt AS prompt,
           COUNT(a.id) AS total,
           SUM(CASE WHEN a.answer = 1 THEN 1 ELSE 0 END) AS trueCount
    FROM questions q
    LEFT JOIN answers a ON a.question_id = q.id
    GROUP BY q.id
    ORDER BY q.id ASC
  `),
  getUser: db.prepare('SELECT user_id AS userId, name, email, address, date_of_birth AS dateOfBirth FROM users WHERE user_id = ?'),
  upsertUser: db.prepare(`
    INSERT INTO users (user_id, name, email, address, date_of_birth)
    VALUES (@userId, @name, @email, @address, @dateOfBirth)
    ON CONFLICT(user_id) DO UPDATE SET
      name = excluded.name,
      email = excluded.email,
      address = excluded.address,
      date_of_birth = excluded.date_of_birth
  `),
}

function getAllContacts() {
  return statements.listContacts.all()
}

function createContact(name, phone) {
  const info = statements.insertContact.run(name, phone)
  return { id: info.lastInsertRowid, name, phone }
}

function removeContact(id) {
  const info = statements.deleteContact.run(id)
  return info.changes > 0
}

module.exports = {
  getAllContacts,
  createContact,
  removeContact,
  getAllQuestions: () => statements.listQuestions.all(),
  createQuestion: ({ prompt, imageUrl }) => {
    const info = statements.insertQuestion.run(prompt, imageUrl || null)
    return { id: Number(info.lastInsertRowid), prompt, imageUrl: imageUrl || null }
  },
  updateQuestion: ({ id, prompt, imageUrl }) => {
    statements.updateQuestion.run(prompt, imageUrl || null, id)
    return { id, prompt, imageUrl: imageUrl || null }
  },
  deleteQuestion: (id) => {
    const res = statements.deleteQuestion.run(id)
    return res.changes > 0
  },
  saveAnswer: ({ userId, questionId, answer }) => {
    statements.upsertAnswer.run({ userId, questionId, answer: answer ? 1 : 0 })
    return { userId, questionId, answer: !!answer }
  },
  getAnswersForUser: (userId) => statements.listAnswersForUser.all(userId).map(r => ({ questionId: r.questionId, answer: !!r.answer })),
  removeAnswersForUser: (userId) => {
    const info = statements.deleteAnswersForUser.run(userId)
    return info.changes
  },
  getAnswerStats: () => statements.answerStats.all().map(r => {
    const total = Number(r.total) || 0
    const trueCount = Number(r.trueCount) || 0
    const percentTrue = total > 0 ? Math.round((trueCount / total) * 100) : 0
    return { questionId: r.questionId, prompt: r.prompt, total, trueCount, percentTrue }
  }),
  getUserById: (userId) => statements.getUser.get(userId) || null,
  saveUser: ({ userId, name, email, address, dateOfBirth }) => {
    statements.upsertUser.run({ userId, name, email, address, dateOfBirth })
    return { userId, name, email, address, dateOfBirth }
  },
}


