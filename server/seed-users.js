const Database = require('better-sqlite3')
const path = require('path')

const dbPath = path.join(__dirname, '..', 'database', 'contacts.db')
const db = new Database(dbPath)

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  address TEXT,
  date_of_birth TEXT
);
`)

const firstNames = ['Oliver','Amelia','Harry','Isla','Jack','Ava','Charlie','Mia','Thomas','Sophia','George','Grace','Jacob','Lily','Alfie','Emily','Leo','Evie','Freddie','Poppy','Samuel','Ella','Mason','Hannah','Theo','Amy','Finley','Scarlett','Logan','Ruby','Edward','Martha','Joseph','Erin','Daniel','Lucy','Harvey','Alice','Arthur','Nancy','Sebastian','Zara','Adam','Georgia','Harrison','Rebecca','Louis','Amber','Ryan','Jessica']
const lastNames = ['Smith','Jones','Taylor','Williams','Brown','Davies','Evans','Wilson','Thomas','Johnson','Roberts','Walker','Wright','Thompson','White','Hughes','Edwards','Green','Hall','Wood','Clarke','Harrison','Lewis','Moore','Jackson','Martin','Lee','Baker','Young','Allen','King','Scott','James','Morgan','Cooper','Phillips','Turner','Parker','Bennett','Hayes','Price','Chapman','Mills','Murray','Cole','Palmer','Mason','Rogers','Shaw']
const streets = ['High St','New St','Broad St','Station Rd','Bristol Rd','Hagley Rd','Alcester Rd','Pershore Rd','Warwick Rd','Coventry Rd','Lichfield Rd','Soho Rd','Moseley Rd','Ladbroke Grove','Colmore Row','Jewellery Quarter','Digbeth','Harborne High St','Kings Heath High St','Selly Oak Rd']

function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function randomDateOfBirth() {
  const age = Math.floor(Math.random() * (80 - 18 + 1)) + 18
  const now = new Date()
  const year = now.getFullYear() - age
  const month = Math.floor(Math.random() * 12)
  const day = Math.floor(Math.random() * 28) + 1
  const d = new Date(year, month, day)
  return d.toISOString().slice(0,10)
}

const insert = db.prepare(`
INSERT INTO users (user_id, name, email, address, date_of_birth)
VALUES (@userId, @name, @email, @address, @dateOfBirth)
ON CONFLICT(user_id) DO UPDATE SET
  name=excluded.name,
  email=excluded.email,
  address=excluded.address,
  date_of_birth=excluded.date_of_birth
`)

const txn = db.transaction((rows) => {
  for (const row of rows) insert.run(row)
})

const rows = []
for (let i = 0; i < 80; i++) {
  const first = randomChoice(firstNames)
  const last = randomChoice(lastNames)
  const name = `${first} ${last}`
  const userId = `seed_${first.toLowerCase()}_${last.toLowerCase()}_${i}`
  const email = `${first}.${last}${i}@example.co.uk`.toLowerCase().replace(/\s+/g,'')
  const house = Math.floor(Math.random() * 200) + 1
  const street = randomChoice(streets)
  const address = `${house} ${street}, Birmingham, B${Math.floor(Math.random()*9)+1} ${String.fromCharCode(65+Math.floor(Math.random()*26))}${Math.floor(Math.random()*9)}${String.fromCharCode(65+Math.floor(Math.random()*26))}`
  const dateOfBirth = randomDateOfBirth()
  rows.push({ userId, name, email, address, dateOfBirth })
}

txn(rows)

console.log(`Seeded ${rows.length} users into users table.`)


