CREATE TABLE IF NOT EXISTS api_rate_limits (
  key_hash TEXT PRIMARY KEY,
  window_started_at TEXT NOT NULL,
  hit_count INTEGER NOT NULL CHECK (hit_count > 0)
);

CREATE INDEX IF NOT EXISTS api_rate_limits_window_index ON api_rate_limits(window_started_at);
