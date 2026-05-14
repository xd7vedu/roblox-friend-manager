require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const path = require('path');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Session middleware
app.use(session({
  store: new pgSession({ pool }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

// Routes
app.use('/auth', require('./routes/auth')(pool));
app.use('/api', require('./routes/roblox')(pool));
app.use('/admin', require('./routes/admin')(pool));

// Activity log route
app.get('/api/activity-log', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  
  pool.query(
    'SELECT * FROM activity_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
    [req.session.userId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(result.rows);
    }
  );
});

// Serve index.html for SPA
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
