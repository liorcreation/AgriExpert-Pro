CREATE TABLE IF NOT EXISTS billing_plans (
  code TEXT PRIMARY KEY CHECK (code IN ('free', 'pro', 'institution')),
  name TEXT NOT NULL,
  amount_xof INTEGER CHECK (amount_xof IS NULL OR amount_xof >= 0),
  billing_interval TEXT NOT NULL DEFAULT 'none' CHECK (billing_interval IN ('none', 'month', 'year', 'contract')),
  sales_enabled INTEGER NOT NULL DEFAULT 0 CHECK (sales_enabled IN (0, 1)),
  features_json TEXT NOT NULL DEFAULT '[]',
  quotas_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

INSERT OR IGNORE INTO billing_plans (code, name, amount_xof, billing_interval, sales_enabled, features_json, quotas_json)
VALUES
  ('free', 'Free', 0, 'none', 1, '[]', '{}'),
  ('pro', 'PRO', NULL, 'month', 0, '[]', '{}'),
  ('institution', 'Institution', NULL, 'contract', 0, '[]', '{}');

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL REFERENCES billing_plans(code),
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'past_due', 'cancelled', 'expired', 'manual_review')),
  provider TEXT,
  provider_customer_ref TEXT,
  provider_subscription_ref TEXT,
  current_period_start TEXT,
  current_period_end TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0 CHECK (cancel_at_period_end IN (0, 1)),
  cancelled_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS subscriptions_user_status_index ON subscriptions(user_id, status, current_period_end);

CREATE TABLE IF NOT EXISTS billing_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
  plan_code TEXT NOT NULL REFERENCES billing_plans(code),
  provider TEXT NOT NULL,
  provider_reference TEXT UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  amount_xof INTEGER NOT NULL CHECK (amount_xof > 0),
  status TEXT NOT NULL CHECK (status IN ('created', 'pending', 'succeeded', 'failed', 'refunded', 'partially_refunded')),
  checkout_url TEXT,
  failure_code TEXT,
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS billing_payments_user_created_index ON billing_payments(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS billing_receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id INTEGER NOT NULL UNIQUE REFERENCES billing_payments(id) ON DELETE RESTRICT,
  receipt_number TEXT NOT NULL UNIQUE,
  snapshot_json TEXT NOT NULL,
  issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS billing_audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  subject_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS billing_audit_created_index ON billing_audit_events(created_at DESC);
