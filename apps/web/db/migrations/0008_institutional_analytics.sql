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
