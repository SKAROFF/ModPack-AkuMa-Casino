CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY,
  pseudo TEXT NOT NULL,
  pseudo_key TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  salt TEXT NOT NULL,
  password TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0,
  code_hash TEXT,
  code_expires INTEGER,
  code_attempts INTEGER NOT NULL DEFAULT 0,
  code_sent INTEGER,
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER,
  created INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions(
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS signups(ip TEXT NOT NULL, at INTEGER NOT NULL);
