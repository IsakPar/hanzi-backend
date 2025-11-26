-- Engagement Tracking Tables Migration
-- Phase 3b: Anonymous content engagement analytics

-- ═══════════════════════════════════════════════════════════
-- RAW ENGAGEMENT EVENTS (90 days retention, auto-purged)
-- ═══════════════════════════════════════════════════════════

-- Raw engagement events from mobile app
CREATE TABLE IF NOT EXISTS engagement_events_raw (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,           -- 'lesson.started' | 'lesson.completed' | etc.
  content_id TEXT NOT NULL,           -- lesson_id or story_id
  content_type TEXT NOT NULL,         -- 'lesson' | 'story' | 'vocab'
  hsk_level INTEGER,
  
  -- Time metrics
  timestamp TEXT NOT NULL,            -- ISO 8601
  time_seconds INTEGER,               -- Duration for this event
  
  -- Event-specific payload (JSON)
  payload TEXT,                       -- JSON blob
  
  -- Processing status
  processed INTEGER DEFAULT 0,        -- 0 = pending, 1 = aggregated
  
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_engagement_events_type ON engagement_events_raw(event_type);
CREATE INDEX IF NOT EXISTS idx_engagement_events_content ON engagement_events_raw(content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_engagement_events_processed ON engagement_events_raw(processed);
CREATE INDEX IF NOT EXISTS idx_engagement_events_created ON engagement_events_raw(created_at);

-- ═══════════════════════════════════════════════════════════
-- AGGREGATED STATS (24 months retention)
-- ═══════════════════════════════════════════════════════════

-- Per-lesson aggregated statistics
CREATE TABLE IF NOT EXISTS analytics_lesson_stats (
  lesson_id TEXT PRIMARY KEY,
  
  -- Volume metrics
  total_starts INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  total_abandons INTEGER DEFAULT 0,
  
  -- Time metrics (in seconds)
  avg_time_seconds INTEGER DEFAULT 0,
  min_time_seconds INTEGER DEFAULT 0,
  max_time_seconds INTEGER DEFAULT 0,
  median_time_seconds INTEGER DEFAULT 0,
  p90_time_seconds INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  
  -- Quality metrics
  avg_score REAL DEFAULT 0,
  completion_rate REAL DEFAULT 0,      -- completions / starts * 100
  
  -- Per-block breakdown (JSON array)
  -- Format: [{ "index": 0, "type": "intro", "avgTime": 45, "completions": 100, "dropOffs": 5 }]
  block_stats TEXT,
  
  -- Timestamps
  first_event_at TEXT,
  last_event_at TEXT,
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Per-story aggregated statistics
CREATE TABLE IF NOT EXISTS analytics_story_stats (
  story_id TEXT PRIMARY KEY,
  
  -- Volume metrics
  total_starts INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  total_abandons INTEGER DEFAULT 0,
  
  -- Time metrics (in seconds)
  avg_time_seconds INTEGER DEFAULT 0,
  min_time_seconds INTEGER DEFAULT 0,
  max_time_seconds INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  
  -- Reading metrics
  avg_sentences_read REAL DEFAULT 0,
  completion_rate REAL DEFAULT 0,
  
  -- Per-sentence breakdown (JSON array)
  -- Format: [{ "index": 0, "avgTime": 12, "reads": 100, "dropOffs": 3 }]
  sentence_stats TEXT,
  
  -- Timestamps
  first_event_at TEXT,
  last_event_at TEXT,
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Per-vocabulary aggregated statistics
CREATE TABLE IF NOT EXISTS analytics_vocab_stats (
  vocab_id TEXT PRIMARY KEY,
  
  -- Review metrics
  total_reviews INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  incorrect_count INTEGER DEFAULT 0,
  
  -- Time metrics
  avg_response_time_ms INTEGER DEFAULT 0,
  
  -- Derived
  accuracy_rate REAL DEFAULT 0,        -- correct / total * 100
  
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Daily engagement summary (for trend charts)
CREATE TABLE IF NOT EXISTS analytics_engagement_daily (
  date TEXT NOT NULL,
  content_type TEXT NOT NULL,          -- 'lesson' | 'story' | 'vocab'
  
  total_events INTEGER DEFAULT 0,
  total_starts INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  avg_completion_rate REAL DEFAULT 0,
  
  PRIMARY KEY (date, content_type)
);
CREATE INDEX IF NOT EXISTS idx_engagement_daily_date ON analytics_engagement_daily(date);

