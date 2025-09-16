const express = require('express');
const cors = require('cors');

// Import route modules
const healthRoutes = require('./routes/health');
const usersRoutes = require('./routes/users');
const questionsRoutes = require('./routes/questions');
const answersRoutes = require('./routes/answers');
const statsRoutes = require('./routes/stats');
const contactsRoutes = require('./routes/contacts');

const app = express();

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const isProd = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors(isProd ? { origin: CLIENT_ORIGIN } : { origin: true }));
app.use(express.json());

// Route handlers
app.use('/api/health', healthRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/answers', answersRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/contacts', contactsRoutes);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`CORS allowed origin: ${CLIENT_ORIGIN}`);
});