-- Remove UNIQUE constraint from ranking_daily to allow multiple attempts
-- This migration recreates the table without the constraint

-- Create new table without UNIQUE constraint
DROP TABLE IF EXISTS ranking_daily_new;
CREATE TABLE ranking_daily_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL,
  score INTEGER NOT NULL,
  region TEXT NOT NULL DEFAULT 'all',
  format TEXT NOT NULL DEFAULT 'flag-to-name',
  date TEXT NOT NULL DEFAULT (date('now', 'localtime')),
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- Copy existing data
INSERT INTO ranking_daily_new (id, nickname, score, region, format, date, created_at)
SELECT id, nickname, score, region, format, date, created_at
FROM ranking_daily;

-- Drop old table
DROP TABLE ranking_daily;

-- Rename new table
ALTER TABLE ranking_daily_new RENAME TO ranking_daily;

-- Recreate index
CREATE INDEX idx_ranking_daily_region_format_date_score 
  ON ranking_daily(region, format, date, score DESC, created_at ASC);
