const axios = require('axios');

async function detectBot(userId, cookie, pool) {
  let score = 0;

  try {
    // Get user info
    const userResponse = await axios.get(`https://users.roblox.com/v1/users/${userId}`, {
      headers: { Cookie: `.ROBLOSECURITY=${cookie}` }
    });
    const user = userResponse.data;

    // Check account age
    const createdDate = new Date(user.created);
    const ageInDays = (Date.now() - createdDate) / (1000 * 60 * 60 * 24);
    if (ageInDays < 30) score += 30;

    // Check avatar
    const avatarResponse = await axios.get(
      `https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=150x150&format=Png&isCircular=false`
    );
    if (!avatarResponse.data.data[0].imageUrl) score += 25;

    // Check friends count
    const friendsResponse = await axios.get(
      `https://friends.roblox.com/v1/users/${userId}/friends/count`,
      { headers: { Cookie: `.ROBLOSECURITY=${cookie}` } }
    );
    if (friendsResponse.data.count === 0) score += 20;

    // Check username pattern (random letters/numbers)
    if (/^[a-zA-Z0-9]{8,}$/.test(user.name)) score += 15;

    // Check bot lists
    const botUsernameResult = await pool.query(
      'SELECT * FROM bot_usernames WHERE username = $1',
      [user.name]
    );
    if (botUsernameResult.rows.length > 0) score += 40;

    const botUserIdResult = await pool.query(
      'SELECT * FROM bot_user_ids WHERE roblox_id = $1',
      [userId]
    );
    if (botUserIdResult.rows.length > 0) score += 40;

    // Classify
    if (score >= 70) return { score, classification: 'bot' };
    if (score >= 40) return { score, classification: 'suspicious' };
    return { score, classification: 'clean' };
  } catch (err) {
    console.error('Bot detection error:', err);
    return { score: 0, classification: 'error' };
  }
}

module.exports = { detectBot };
