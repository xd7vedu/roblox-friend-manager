const express = require('express');
const bcrypt = require('bcrypt');
const axios = require('axios');

module.exports = (pool) => {
  const router = express.Router();

  // Register
  router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
        [username, hashedPassword, 'user']
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Login
  router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

    try {
      const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
      if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

      const user = result.rows[0];
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.isAdmin = user.role === 'admin';

      // Log activity
      await pool.query(
        'INSERT INTO activity_log (user_id, action, ip_address) VALUES ($1, $2, $3)',
        [user.id, 'login', req.ip]
      );

      res.json({ success: true, isAdmin: user.role === 'admin' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Discord OAuth callback
  router.get('/discord/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'No code provided' });

    try {
      // Exchange code for token
      const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', {
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI
      });

      // Get user info
      const userResponse = await axios.get('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` }
      });

      const discordId = userResponse.data.id;

      // Check allowlist
      const allowlistResult = await pool.query(
        'SELECT * FROM discord_allowlist WHERE discord_id = $1',
        [discordId]
      );

      if (allowlistResult.rows.length === 0) {
        return res.status(403).json({ error: 'Discord ID not in allowlist' });
      }

      // Create or get user
      let userResult = await pool.query('SELECT * FROM users WHERE discord_id = $1', [discordId]);
      let user;

      if (userResult.rows.length === 0) {
        const createResult = await pool.query(
          'INSERT INTO users (discord_id, username, role) VALUES ($1, $2, $3) RETURNING *',
          [discordId, userResponse.data.username, 'user']
        );
        user = createResult.rows[0];
      } else {
        user = userResult.rows[0];
      }

      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.isAdmin = user.role === 'admin';

      res.redirect('/');
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Logout
  router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
  });

  // Check auth status
  router.get('/status', (req, res) => {
    if (!req.session.userId) return res.json({ authenticated: false });
    res.json({ authenticated: true, username: req.session.username, isAdmin: req.session.isAdmin });
  });

  return router;
};
