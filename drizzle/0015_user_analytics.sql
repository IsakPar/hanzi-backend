-- User Analytics Tables Migration
-- Phase 2: User tracking, sessions, and daily aggregation

-- ═══════════════════════════════════════════════════════════
-- RAW EVENT TABLES (90 days retention, auto-purged by cron)
-- ═══════════════════════════════════════════════════════════

-- User activity events (sessions, page views, actions)
CREATE TABLE IF NOT EXISTS analytics_events_raw (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,          -- 'session_start' | 'session_end' | 'lesson_view' | 'story_complete' | etc.
  user_id TEXT,                       -- nullable for anonymous events
  session_id TEXT,                    -- Track session grouping
  payload TEXT,                       -- JSON blob for event-specific data
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_events_raw_created ON analytics_events_raw(created_at);
CREATE INDEX IF NOT EXISTS idx_events_raw_type ON analytics_events_raw(event_type);
CREATE INDEX IF NOT EXISTS idx_events_raw_user ON analytics_events_raw(user_id);
CREATE INDEX IF NOT EXISTS idx_events_raw_session ON analytics_events_raw(session_id);

-- ═══════════════════════════════════════════════════════════
-- AGGREGATED TABLES (24 months retention)
-- ═══════════════════════════════════════════════════════════

-- Daily user statistics (aggregated from raw events)
CREATE TABLE IF NOT EXISTS analytics_users_daily (
  date TEXT NOT NULL,                 -- '2024-01-15' (YYYY-MM-DD)
  total_users INTEGER NOT NULL DEFAULT 0,
  new_signups INTEGER NOT NULL DEFAULT 0,
  active_users INTEGER NOT NULL DEFAULT 0,   -- Users with at least 1 session
  returning_users INTEGER NOT NULL DEFAULT 0, -- Users who returned after first day
  avg_session_duration_seconds INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  PRIMARY KEY (date)
);
CREATE INDEX IF NOT EXISTS idx_users_daily_date ON analytics_users_daily(date);

-- Weekly retention cohorts
CREATE TABLE IF NOT EXISTS analytics_retention_cohorts (
  cohort_week TEXT NOT NULL,          -- '2024-W03' (signup week in ISO format)
  week_number INTEGER NOT NULL,       -- 0 = signup week, 1 = week 1, 2 = week 2, etc.
  users_in_cohort INTEGER NOT NULL,   -- Total users who signed up in this cohort
  users_retained INTEGER NOT NULL,    -- Users still active in week_number
  retention_rate REAL,                -- users_retained / users_in_cohort * 100
  PRIMARY KEY (cohort_week, week_number)
);
CREATE INDEX IF NOT EXISTS idx_retention_cohort_week ON analytics_retention_cohorts(cohort_week);

-- User tier history (track tier changes over time)
CREATE TABLE IF NOT EXISTS analytics_tier_daily (
  date TEXT NOT NULL,
  tier TEXT NOT NULL,                 -- 'free' | 'premium' | 'pro'
  user_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, tier)
);

