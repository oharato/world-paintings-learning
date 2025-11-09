-- Initial database schema for national flag game
-- Creates all ranking tables with regional and format support

-- Daily ranking table (resets daily)
-- Tracks rankings per region and quiz format for each day
-- Each attempt is recorded separately (no UNIQUE constraint)
DROP TABLE IF EXISTS ranking_daily;
CREATE TABLE ranking_daily (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL,
  score INTEGER NOT NULL,
  region TEXT NOT NULL DEFAULT 'all',
  format TEXT NOT NULL DEFAULT 'flag-to-name',
  date TEXT NOT NULL DEFAULT (date('now', 'localtime')),
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- All-time ranking table (keeps top scores)
-- Stores best scores per region and quiz format
DROP TABLE IF EXISTS ranking_all_time;
CREATE TABLE ranking_all_time (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL,
  score INTEGER NOT NULL,
  region TEXT NOT NULL DEFAULT 'all',
  format TEXT NOT NULL DEFAULT 'flag-to-name',
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- Indexes for performance optimization
CREATE INDEX idx_ranking_daily_region_format_date_score 
  ON ranking_daily(region, format, date, score DESC, created_at ASC);

CREATE INDEX idx_ranking_all_time_region_format_score 
  ON ranking_all_time(region, format, score DESC, created_at ASC);
