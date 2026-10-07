PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('producer', 'expert', 'institution')),
  profile TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'institution')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS sessions_user_id_index ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_index ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('agriculture', 'livestock', 'aquaculture', 'apiculture')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'mo')),
  has_voice INTEGER NOT NULL DEFAULT 0,
  has_photo INTEGER NOT NULL DEFAULT 0,
  photo_name TEXT,
  client_request_id TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS questions_category_created_index ON questions(category, created_at DESC);
CREATE INDEX IF NOT EXISTS questions_author_created_index ON questions(author_user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS questions_author_client_request_index ON questions(author_user_id, client_request_id) WHERE client_request_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS emergencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  author_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('veterinary', 'phytosanitary', 'livestock_epidemic', 'pest_attack', 'water_quality')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL CHECK (priority IN ('medium', 'high', 'critical')),
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'resolved', 'closed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS emergencies_status_created_index ON emergencies(status, created_at DESC);
CREATE INDEX IF NOT EXISTS emergencies_author_created_index ON emergencies(author_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS question_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  author_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'mo')),
  certified INTEGER NOT NULL DEFAULT 0,
  voice_asset_id INTEGER REFERENCES media_assets(id) ON DELETE SET NULL,
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
  client_request_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((question_id IS NOT NULL AND emergency_id IS NULL) OR (question_id IS NULL AND emergency_id IS NOT NULL) OR (question_id IS NULL AND emergency_id IS NULL)
));

CREATE INDEX IF NOT EXISTS media_assets_question_index ON media_assets(question_id, created_at DESC);
CREATE INDEX IF NOT EXISTS media_assets_emergency_index ON media_assets(emergency_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS media_assets_owner_client_request_index ON media_assets(owner_user_id, client_request_id) WHERE client_request_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS emergency_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  emergency_id INTEGER NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'assigned', 'resolved', 'closed')),
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS emergency_events_emergency_created_index ON emergency_events(emergency_id, created_at ASC);

CREATE TABLE IF NOT EXISTS expert_availability (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  is_available INTEGER NOT NULL DEFAULT 0 CHECK (is_available IN (0, 1)),
  latitude REAL,
  longitude REAL,
  radius_km REAL NOT NULL DEFAULT 50 CHECK (radius_km > 0 AND radius_km <= 500),
  last_seen_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))
);

CREATE INDEX IF NOT EXISTS expert_availability_active_index ON expert_availability(is_available, last_seen_at);

CREATE TABLE IF NOT EXISTS emergency_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  emergency_id INTEGER NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
  expert_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'offered' CHECK (status IN ('offered', 'accepted', 'declined', 'expired')),
  distance_km REAL NOT NULL,
  offered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  responded_at TEXT,
  UNIQUE (emergency_id, expert_user_id, offered_at)
);

CREATE INDEX IF NOT EXISTS emergency_assignments_emergency_index ON emergency_assignments(emergency_id, offered_at DESC);
CREATE INDEX IF NOT EXISTS emergency_assignments_expert_index ON emergency_assignments(expert_user_id, status, offered_at DESC);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'mo')),
  voice_enabled INTEGER NOT NULL DEFAULT 1,
  dark_mode INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS diagnoses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_asset_id INTEGER NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES questions(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('agriculture', 'livestock', 'aquaculture', 'apiculture')),
  context TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
  result_json TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'openai-vision',
  model TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS diagnoses_author_created_index ON diagnoses(author_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS diagnoses_question_index ON diagnoses(question_id);

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

CREATE TABLE IF NOT EXISTS user_territories (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  region_code TEXT NOT NULL,
  region_name TEXT NOT NULL,
  commune TEXT,
  source TEXT NOT NULL DEFAULT 'self_declared' CHECK (source IN ('self_declared', 'institution_verified', 'admin_verified')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS user_territories_region_index ON user_territories(region_code);

CREATE TABLE IF NOT EXISTS institution_memberships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  institution_key TEXT NOT NULL,
  institution_name TEXT NOT NULL,
  institution_type TEXT NOT NULL CHECK (institution_type IN ('ministry', 'ngo', 'partner')),
  access_role TEXT NOT NULL DEFAULT 'viewer' CHECK (access_role IN ('admin', 'analyst', 'viewer')),
  region_code TEXT NOT NULL DEFAULT 'national',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, institution_key, region_code)
);

CREATE INDEX IF NOT EXISTS institution_memberships_user_active_index ON institution_memberships(user_id, active);
CREATE INDEX IF NOT EXISTS institution_memberships_scope_index ON institution_memberships(institution_key, region_code, active);

CREATE TABLE IF NOT EXISTS institution_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  institution_key TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('dashboard_view', 'csv_export', 'report_view')),
  filters_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS institution_audit_created_index ON institution_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS institution_audit_actor_index ON institution_audit_logs(actor_user_id, created_at DESC);
