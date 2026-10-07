CREATE TABLE IF NOT EXISTS voice_transcriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  media_asset_id INTEGER NOT NULL UNIQUE REFERENCES media_assets(id) ON DELETE CASCADE,
  owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transcript TEXT,
  language TEXT NOT NULL CHECK (language IN ('fr', 'mo', 'unknown')),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  consent_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS voice_transcriptions_owner_created_index ON voice_transcriptions(owner_user_id, created_at DESC);
