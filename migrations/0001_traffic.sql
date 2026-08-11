CREATE TABLE IF NOT EXISTS traffic_totals (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0)
);

CREATE TABLE IF NOT EXISTS traffic_daily (
  date TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0)
);

CREATE TABLE IF NOT EXISTS traffic_visits (
  session_id TEXT PRIMARY KEY,
  first_seen INTEGER NOT NULL,
  first_seen_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS traffic_presence (
  session_id TEXT PRIMARY KEY,
  last_seen INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS traffic_presence_last_seen
  ON traffic_presence (last_seen);
