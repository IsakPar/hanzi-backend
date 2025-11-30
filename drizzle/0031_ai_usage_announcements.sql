-- AI Usage Tracking + Announcements
-- Track every AI call with cost for analytics
-- Store SDUI announcements for app launch messages

-- AI Usage Log - tracks every AI API call
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  session_id TEXT,
  model TEXT NOT NULL,
  endpoint TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  latency_ms INTEGER,
  success INTEGER DEFAULT 1,
  error_message TEXT,
  metadata TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS ai_usage_user_idx ON ai_usage_log(user_id);
CREATE INDEX IF NOT EXISTS ai_usage_model_idx ON ai_usage_log(model);
CREATE INDEX IF NOT EXISTS ai_usage_created_idx ON ai_usage_log(created_at);
CREATE INDEX IF NOT EXISTS ai_usage_date_idx ON ai_usage_log(created_at);

-- Announcements - SDUI messages for app launch
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  
  -- SDUI Schema (JSON) - full UI definition
  ui_schema TEXT NOT NULL,
  
  -- Targeting
  target_audience TEXT DEFAULT 'all',
  min_app_version TEXT,
  max_app_version TEXT,
  
  -- Scheduling
  starts_at INTEGER,
  ends_at INTEGER,
  
  -- Behavior
  show_once INTEGER DEFAULT 1,
  is_dismissible INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0,
  
  -- Status
  is_active INTEGER DEFAULT 1,
  
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  created_by TEXT
);

-- Track dismissals
CREATE TABLE IF NOT EXISTS announcement_dismissals (
  id TEXT PRIMARY KEY,
  announcement_id TEXT NOT NULL,
  user_id TEXT,
  device_id TEXT,
  dismissed_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS dismissals_announcement_idx ON announcement_dismissals(announcement_id);
CREATE INDEX IF NOT EXISTS dismissals_user_idx ON announcement_dismissals(user_id);

