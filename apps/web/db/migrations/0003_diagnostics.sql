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
