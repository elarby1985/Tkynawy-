CREATE TABLE IF NOT EXISTS questions (id INTEGER PRIMARY KEY, domain TEXT NOT NULL, title TEXT NOT NULL, question TEXT NOT NULL, options TEXT NOT NULL, answer TEXT NOT NULL, explanation TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, salt TEXT NOT NULL, passhash TEXT NOT NULL, iterations INTEGER NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL, disabled INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS attempts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), started_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, completed_at INTEGER, position INTEGER NOT NULL DEFAULT 0, correct INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL DEFAULT 100);
CREATE TABLE IF NOT EXISTS attempt_questions (attempt_id TEXT NOT NULL REFERENCES attempts(id), position INTEGER NOT NULL, question_id INTEGER NOT NULL REFERENCES questions(id), selected TEXT, correct INTEGER, PRIMARY KEY(attempt_id,position));
CREATE INDEX IF NOT EXISTS idx_attempt_user ON attempts(user_id,started_at);
CREATE INDEX IF NOT EXISTS idx_session_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS login_throttle (email TEXT PRIMARY KEY, failures INTEGER NOT NULL, blocked_until INTEGER NOT NULL);
