const express = require('express');
const axios = require('axios');
const { detectBot } = require('../utils/botDetection');

module.exports = (pool) => {
  const router = express.Router();

  // Middleware: check auth
  const requireAuth = (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
    next();
  };

  // Connect Roblox cookie
  router.post('/connect', requireAuth, async (req, res) => {
    const { cookie } = req.body;
    if (!cookie) return res.status(400).json({ error: 'No cookie provided' });

    try {
      // Validate cookie by fetching authenticated user
      const response = await axios.get('https://users.roblox.com/v1/users/authenticated', {
        headers: { Cookie: `.ROBLOSECURITY=${cookie}` }
      });

      req.session.robloxCookie = cookie;
      req.session.robloxUserId = response.data.id;
      req.session.robloxUsername = response.data.name;

      res.json({ success: true, user: response.data });
    } catch (err) {
      res.status(401).json({ error: 'Invalid cookie' });
    }
  });

  // Get friend requests
  router.get('/friend-requests', requireAuth, async (req, res) => {
    if (!req.session.robloxCookie) return res.status(400).json({ error: 'Roblox not connected' });

    try {
      const response = await axios.get('https://friends.roblox.com/v1/my/friends/requests', {
        headers: { Cookie: `.ROBLOSECURITY=${req.session.robloxCookie}` }
      });

      // Scan each request for bots
      const scanned = await Promise.all(
        response.data.data.map(async (req) => {
          const botScore = await detectBot(req.id, req.session.robloxCookie, pool);
          return { ...req, botScore };
        })
      );

      res.json(scanned);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Accept friend request
  router.post('/accept', requireAuth, async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'No userId provided' });

    try {
      await axios.post(
        `https://friends.roblox.com/v1/users/${userId}/accept-friend-request`,
        {},
        { headers: { Cookie: `.ROBLOSECURITY=${req.session.robloxCookie}` } }
      );

      // Log activity
      await pool.query(
        'INSERT INTO activity_log (user_id, action, target_roblox_id, ip_address) VALUES ($1, $2, $3, $4)',
        [req.session.userId, 'accept', userId, req.ip]
      );

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Decline friend request
  router.post('/decline', requireAuth, async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'No userId provided' });

    try {
      await axios.post(
        `https://friends.roblox.com/v1/users/${userId}/decline-friend-request`,
        {},
        { headers: { Cookie: `.ROBLOSECURITY=${req.session.robloxCookie}` } }
      );

      await pool.query(
        'INSERT INTO activity_log (user_id, action, target_roblox_id, ip_address) VALUES ($1, $2, $3, $4)',
        [req.session.userId, 'decline', userId, req.ip]
      );

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Block user
  router.post('/block', requireAuth, async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'No userId provided' });

    try {
      await axios.post(
        `https://accountsettings.roblox.com/v1/users/${userId}/block`,
        {},
        { headers: { Cookie: `.ROBLOSECURITY=${req.session.robloxCookie}` } }
      );

      await pool.query(
        'INSERT INTO activity_log (user_id, action, target_roblox_id, ip_address) VALUES ($1, $2, $3, $4)',
        [req.session.userId, 'block', userId, req.ip]
      );

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
