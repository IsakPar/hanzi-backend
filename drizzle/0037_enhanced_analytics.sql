-- Enhanced Analytics System
-- Phase 1-4: AI Tutor, Exercise Success, Executive Metrics, Story Deep Dive

-- ═══════════════════════════════════════════════════════════
-- PHASE 1: AI TUTOR ANALYTICS
-- ═══════════════════════════════════════════════════════════

-- AI Tutor Sessions
CREATE TABLE IF NOT EXISTS ai_tutor_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_started_at TEXT NOT NULL DEFAULT (datetime('now')),
  session_ended_at TEXT,
  message_count INTEGER DEFAULT 0,
  user_message_count INTEGER DEFAULT 0,
  ai_message_count INTEGER DEFAULT 0,
  topics_discussed TEXT,        -- JSON array
  vocabulary_used TEXT,         -- JSON array of word IDs
  grammar_points_covered TEXT,  -- JSON array
  corrections_made INTEGER DEFAULT 0,
  user_rating INTEGER,          -- 1-5 stars
  total_tokens_used INTEGER DEFAULT 0,
  estimated_cost_usd REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS ai_tutor_sessions_user_idx ON ai_tutor_sessions(user_id);
CREATE INDEX IF NOT EXISTS ai_tutor_sessions_date_idx ON ai_tutor_sessions(session_started_at);

-- AI Tutor Messages (for detailed analysis)
CREATE TABLE IF NOT EXISTS ai_tutor_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES ai_tutor_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,           -- 'user' | 'assistant'
  content_length INTEGER,
  word_count INTEGER,
  vocabulary_ids TEXT,          -- JSON array of word IDs used
  grammar_points TEXT,          -- JSON array of grammar detected
  is_correction INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS ai_tutor_messages_session_idx ON ai_tutor_messages(session_id);

-- ═══════════════════════════════════════════════════════════
-- PHASE 2: EXERCISE SUCCESS TRACKING
-- ═══════════════════════════════════════════════════════════

-- Exercise Attempts
CREATE TABLE IF NOT EXISTS exercise_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  lesson_id TEXT,
  story_id TEXT,
  block_id TEXT NOT NULL,
  exercise_type TEXT NOT NULL,  -- 'drag_sentence', 'multiple_choice', 'build_sentence', etc.
  is_correct INTEGER NOT NULL,
  attempt_number INTEGER DEFAULT 1,
  time_spent_ms INTEGER,
  hints_used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS exercise_attempts_user_idx ON exercise_attempts(user_id);
CREATE INDEX IF NOT EXISTS exercise_attempts_lesson_idx ON exercise_attempts(lesson_id);
CREATE INDEX IF NOT EXISTS exercise_attempts_type_idx ON exercise_attempts(exercise_type);
CREATE INDEX IF NOT EXISTS exercise_attempts_date_idx ON exercise_attempts(created_at);

-- Aggregated exercise stats (updated periodically)
CREATE TABLE IF NOT EXISTS exercise_stats_daily (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  exercise_type TEXT NOT NULL,
  lesson_id TEXT,
  total_attempts INTEGER DEFAULT 0,
  correct_attempts INTEGER DEFAULT 0,
  success_rate REAL DEFAULT 0,
  avg_time_ms INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(date, exercise_type, lesson_id)
);

CREATE INDEX IF NOT EXISTS exercise_stats_daily_date_idx ON exercise_stats_daily(date);

-- ═══════════════════════════════════════════════════════════
-- PHASE 3: EXECUTIVE METRICS
-- ═══════════════════════════════════════════════════════════

-- Daily aggregated metrics for fast dashboard queries
CREATE TABLE IF NOT EXISTS daily_metrics (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  
  -- User metrics
  total_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,        -- Users with any activity
  returning_users INTEGER DEFAULT 0,     -- Active users who joined before today
  
  -- Retention cohorts
  day1_retention_pct REAL DEFAULT 0,
  day7_retention_pct REAL DEFAULT 0,
  day30_retention_pct REAL DEFAULT 0,
  
  -- Learning metrics
  lessons_started INTEGER DEFAULT 0,
  lessons_completed INTEGER DEFAULT 0,
  lesson_completion_rate REAL DEFAULT 0,
  stories_started INTEGER DEFAULT 0,
  stories_completed INTEGER DEFAULT 0,
  story_completion_rate REAL DEFAULT 0,
  
  -- Vocabulary metrics
  words_learned INTEGER DEFAULT 0,       -- First time correct
  words_reviewed INTEGER DEFAULT 0,
  vocab_accuracy_rate REAL DEFAULT 0,
  
  -- AI Tutor metrics
  ai_sessions INTEGER DEFAULT 0,
  ai_messages INTEGER DEFAULT 0,
  ai_cost_usd REAL DEFAULT 0,
  
  -- Revenue metrics (if applicable)
  new_subscriptions INTEGER DEFAULT 0,
  churned_subscriptions INTEGER DEFAULT 0,
  mrr_usd REAL DEFAULT 0,
  
  -- Exercise metrics
  total_exercises INTEGER DEFAULT 0,
  correct_exercises INTEGER DEFAULT 0,
  exercise_success_rate REAL DEFAULT 0,
  
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS daily_metrics_date_idx ON daily_metrics(date);

-- User retention tracking
CREATE TABLE IF NOT EXISTS user_activity_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  activity_date TEXT NOT NULL,
  activity_type TEXT NOT NULL,  -- 'lesson', 'story', 'vocab', 'ai_chat'
  activity_count INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, activity_date, activity_type)
);

CREATE INDEX IF NOT EXISTS user_activity_log_user_idx ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS user_activity_log_date_idx ON user_activity_log(activity_date);

-- ═══════════════════════════════════════════════════════════
-- PHASE 4: STORY DEEP DIVE
-- ═══════════════════════════════════════════════════════════

-- Story reading events
CREATE TABLE IF NOT EXISTS story_reading_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  story_id TEXT NOT NULL,
  sentences_read INTEGER DEFAULT 0,
  total_sentences INTEGER,
  read_completion_pct REAL DEFAULT 0,
  words_tapped INTEGER DEFAULT 0,    -- Words tapped for definition
  audio_plays INTEGER DEFAULT 0,      -- Times audio was played
  time_spent_seconds INTEGER DEFAULT 0,
  scroll_depth_pct REAL DEFAULT 0,   -- How far they scrolled
  finished INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS story_reading_events_user_idx ON story_reading_events(user_id);
CREATE INDEX IF NOT EXISTS story_reading_events_story_idx ON story_reading_events(story_id);
CREATE INDEX IF NOT EXISTS story_reading_events_date_idx ON story_reading_events(created_at);

-- Story sentence interactions (which sentences caused confusion)
CREATE TABLE IF NOT EXISTS story_sentence_stats (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL,
  sentence_index INTEGER NOT NULL,
  times_displayed INTEGER DEFAULT 0,
  times_audio_played INTEGER DEFAULT 0,
  words_tapped INTEGER DEFAULT 0,
  avg_time_on_sentence_ms INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(story_id, sentence_index)
);

CREATE INDEX IF NOT EXISTS story_sentence_stats_story_idx ON story_sentence_stats(story_id);

