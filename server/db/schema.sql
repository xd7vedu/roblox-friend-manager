CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  discord_id VARCHAR(255) UNIQUE,
  role VARCHAR(50) DEFAULT 'user',
  disabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE activity_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(255),
  target_roblox_id VARCHAR(255),
  ip_address VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bot_usernames (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  username VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bot_user_ids (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  roblox_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE whitelist (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  roblox_id VARCHAR(255),
  roblox_username VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE announcements (
  id SERIAL PRIMARY KEY,
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE discord_allowlist (
  id SERIAL PRIMARY KEY,
  discord_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ip_blocklist (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);
