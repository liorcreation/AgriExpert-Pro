CREATE TABLE IF NOT EXISTS question_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  author_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'mo')),
  certified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS question_answers_question_created_index ON question_answers(question_id, created_at ASC);
CREATE INDEX IF NOT EXISTS question_answers_author_created_index ON question_answers(author_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS question_reactions (
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL DEFAULT 'useful' CHECK (reaction IN ('useful')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (question_id, user_id, reaction)
);

CREATE TABLE IF NOT EXISTS media_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
  emergency_id INTEGER REFERENCES emergencies(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('photo', 'voice')),
  object_key TEXT NOT NULL UNIQUE,
  file_name TEXT,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((question_id IS NOT NULL AND emergency_id IS NULL) OR (question_id IS NULL AND emergency_id IS NOT NULL) OR (question_id IS NULL AND emergency_id IS NULL))
);
CREATE INDEX IF NOT EXISTS media_assets_question_index ON media_assets(question_id, created_at DESC);
CREATE INDEX IF NOT EXISTS media_assets_emergency_index ON media_assets(emergency_id, created_at DESC);

CREATE TABLE IF NOT EXISTS emergency_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  emergency_id INTEGER NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'assigned', 'resolved', 'closed')),
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS emergency_events_emergency_created_index ON emergency_events(emergency_id, created_at ASC);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'mo')),
  voice_enabled INTEGER NOT NULL DEFAULT 1,
  dark_mode INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
