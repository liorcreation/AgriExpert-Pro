ALTER TABLE question_answers ADD COLUMN voice_asset_id INTEGER REFERENCES media_assets(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS expert_cases (
  question_id INTEGER PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  expert_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'waiting_producer', 'answered', 'transferred', 'closed')),
  accepted_at TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS expert_cases_expert_status_index ON expert_cases(expert_user_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS expert_case_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('accepted', 'replied', 'requested_info', 'annotated', 'status_changed', 'transferred', 'closed')),
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS expert_case_events_question_index ON expert_case_events(question_id, created_at ASC);

CREATE TABLE IF NOT EXISTS expert_case_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  author_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('request_info', 'internal_note')),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS expert_case_messages_question_index ON expert_case_messages(question_id, created_at ASC);

CREATE TABLE IF NOT EXISTS expert_annotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  media_asset_id INTEGER NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  expert_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  x REAL NOT NULL DEFAULT 0 CHECK (x >= 0 AND x <= 100),
  y REAL NOT NULL DEFAULT 0 CHECK (y >= 0 AND y <= 100),
  width REAL NOT NULL DEFAULT 12 CHECK (width > 0 AND width <= 100),
  height REAL NOT NULL DEFAULT 12 CHECK (height > 0 AND height <= 100),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS expert_annotations_question_index ON expert_annotations(question_id, created_at DESC);

CREATE TABLE IF NOT EXISTS expert_earnings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expert_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES questions(id) ON DELETE SET NULL,
  amount_xof INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at TEXT
);

CREATE INDEX IF NOT EXISTS expert_earnings_expert_status_index ON expert_earnings(expert_user_id, status, created_at DESC);
