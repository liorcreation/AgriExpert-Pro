ALTER TABLE emergencies ADD COLUMN assigned_expert_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE emergencies ADD COLUMN assigned_at TEXT;
ALTER TABLE emergencies ADD COLUMN acknowledged_at TEXT;
ALTER TABLE emergencies ADD COLUMN sla_due_at TEXT;
ALTER TABLE emergencies ADD COLUMN escalation_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS expert_availability (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  is_available INTEGER NOT NULL DEFAULT 0 CHECK (is_available IN (0, 1)),
  latitude REAL,
  longitude REAL,
  radius_km REAL NOT NULL DEFAULT 50 CHECK (radius_km > 0 AND radius_km <= 500),
  last_seen_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
));

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
