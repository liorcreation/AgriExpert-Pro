CREATE TABLE IF NOT EXISTS emergency_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  emergency_id INTEGER NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('webhook', 'sms', 'phone')),
  target TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  provider_reference TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TEXT
);
CREATE INDEX IF NOT EXISTS emergency_notifications_emergency_index ON emergency_notifications(emergency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS emergency_notifications_status_index ON emergency_notifications(status, created_at ASC);
