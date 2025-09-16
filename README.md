## Phone Application (Node.js + React + Material UI)

### Prerequisites
- Node.js 18+ and npm

### Project Structure
- `server/`: Express API for contacts
- `client/`: React + Vite app with Material UI

### Setup
1. Install server deps:
   ```bash
   cd server && npm install
   ```
2. Install client deps:
   ```bash
   cd ../client && npm install
   ```

### Run
Single command dev (watches client and server):
```bash
npm run dev
```
Ports: server `http://localhost:4000`, client `http://localhost:5173`.

### Features
- Your Details: view/edit profile (name, email, address, date of birth)
- Swipe quiz: answer boolean questions by dragging card left/right; stored per user

### Notes
- Adjust CORS by setting `CLIENT_ORIGIN` env var for the server if needed.
- Data is stored in SQLite `database/contacts.db` (users, questions, answers). A random `userId` is generated and stored in `localStorage`.


