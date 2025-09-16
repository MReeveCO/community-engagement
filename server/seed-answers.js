const Database = require('better-sqlite3')
const path = require('path')

const dbPath = path.join(__dirname, '..', 'database', 'contacts.db')
const db = new Database(dbPath)

db.exec(`
CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  question_id INTEGER NOT NULL,
  answer INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, question_id)
);
`)

const users = db.prepare("SELECT user_id AS userId FROM users WHERE user_id LIKE 'seed_%'").all()
const questions = db.prepare('SELECT id FROM questions ORDER BY id').all().map(r => r.id)

function biasedAnswer(questionId) {
  // Default 50/50
  let pTrue = 0.5
  if (questionId === 6 || questionId === 7) pTrue = 0.75 // favour true
  if (questionId === 2 || questionId === 4) pTrue = 0.35 // slightly favour false
  return Math.random() < pTrue ? 1 : 0
}

const upsert = db.prepare(`
INSERT INTO answers (user_id, question_id, answer)
VALUES (@userId, @questionId, @answer)
ON CONFLICT(user_id, question_id) DO UPDATE SET answer=excluded.answer, created_at=CURRENT_TIMESTAMP
`)

const txn = db.transaction(() => {
  for (const { userId } of users) {
    for (const qId of questions) {
      // Randomly skip a few to simulate unanswered
      if (Math.random() < 0.1) continue
      upsert.run({ userId, questionId: qId, answer: biasedAnswer(qId) })
    }
  }
})

txn()

console.log(`Seeded answers for ${users.length} users across ${questions.length} questions (with biases).`)
