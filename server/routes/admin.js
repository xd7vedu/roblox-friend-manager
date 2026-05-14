const express = require('express');

module.exports = (pool) => {
  const router = express.Router();

  // Middleware: check admin
  const requireAdmin = (req, res, next) => {
    if (!req.session.isAdmin) return res.status(403).json({ error: 'Admin only' });
    next();
  };

  // Get all users
  router.get('/users', requireAdmin, async (req, res) => {
    try {
      const result = await pool.query('SELECT id, username, role, created_at FROM users');
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Disable user
  router.post('/users/:id/disable', requireAdmin, async (req, res) => {
    try {
      await pool.query('UPDATE users SET disabled = true WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Add Discord to allowlist
  router.post('/discord-allowlist', requireAdmin, async (req, res) => {
    const { discordId } = req.body;
    if (!discordId) return res.status(400).json({ error: 'No discordId provided' });

    try {
      await pool.query(
        'INSERT INTO discord_allowlist (discord_id) VALUES ($1) ON CONFLICT DO NOTHING',
        [discordId]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get announcements
  router.get('/announcements', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 1');
      res.json(result.rows[0] || {});
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Set announcement
  router.post('/announcements', requireAdmin, async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'No message provided' });

    try {
      await pool.query('DELETE FROM announcements');
      await pool.query('INSERT INTO announcements (message) VALUES ($1)', [message]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
