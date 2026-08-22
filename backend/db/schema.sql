-- THE TYPEWRITER DIARY — schema.sql
-- Deliberately minimal: only the entry text and when it was filed.
-- No IP address, no session id, no user identifier of any kind is
-- stored anywhere — that's what makes this genuinely anonymous,
-- not just "no login screen."

CREATE TABLE IF NOT EXISTS entries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  text       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries (created_at DESC);
