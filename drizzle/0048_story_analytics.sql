-- ═══════════════════════════════════════════════════════════════════════════
-- Story Analytics & Showcase System
-- ═══════════════════════════════════════════════════════════════════════════

-- Track story listening events (start, complete, drop-off)
CREATE TABLE story_listens (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  device_id TEXT, -- For anonymous tracking
  
  -- Event type: 'start', 'complete', 'drop_off'
  event_type TEXT NOT NULL,
  
  -- Progress tracking
  progress_percent INTEGER DEFAULT 0, -- 0-100
  last_sentence_index INTEGER DEFAULT 0,
  duration_seconds INTEGER, -- Time spent listening
  
  -- Context
  source TEXT, -- 'showcase', 'search', 'series', 'recommendation'
  
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX story_listens_story_idx ON story_listens(story_id);
CREATE INDEX story_listens_user_idx ON story_listens(user_id);
CREATE INDEX story_listens_device_idx ON story_listens(device_id);
CREATE INDEX story_listens_event_idx ON story_listens(event_type);
CREATE INDEX story_listens_created_idx ON story_listens(created_at);

-- User ratings for stories (one per user per story, updateable)
CREATE TABLE story_ratings (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT, -- For anonymous ratings
  
  -- Rating data
  stars INTEGER NOT NULL CHECK(stars >= 1 AND stars <= 5),
  feedback TEXT, -- Optional short text feedback
  
  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  
  -- Unique constraint: one rating per user/device per story
  UNIQUE(story_id, user_id),
  UNIQUE(story_id, device_id)
);

CREATE INDEX story_ratings_story_idx ON story_ratings(story_id);
CREATE INDEX story_ratings_user_idx ON story_ratings(user_id);
CREATE INDEX story_ratings_stars_idx ON story_ratings(stars);

-- Cached aggregated stats for performance (updated periodically)
CREATE TABLE story_stats (
  story_id TEXT PRIMARY KEY REFERENCES stories(id) ON DELETE CASCADE,
  
  -- Listen counts
  listen_count INTEGER NOT NULL DEFAULT 0,
  complete_count INTEGER NOT NULL DEFAULT 0,
  unique_listeners INTEGER NOT NULL DEFAULT 0,
  
  -- Calculated metrics
  completion_rate REAL DEFAULT 0, -- 0.0 to 1.0
  avg_duration_seconds INTEGER DEFAULT 0,
  
  -- Rating aggregates
  rating_count INTEGER NOT NULL DEFAULT 0,
  rating_avg REAL DEFAULT 0, -- 0.0 to 5.0
  rating_distribution TEXT, -- JSON: {"1": 5, "2": 3, "3": 10, "4": 25, "5": 50}
  
  -- Trending score (for "Popular" section)
  trending_score REAL DEFAULT 0,
  
  -- Timestamps
  last_calculated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX story_stats_listen_idx ON story_stats(listen_count DESC);
CREATE INDEX story_stats_complete_idx ON story_stats(complete_count DESC);
CREATE INDEX story_stats_rating_idx ON story_stats(rating_avg DESC);
CREATE INDEX story_stats_trending_idx ON story_stats(trending_score DESC);

-- Configurable showcase sections for mobile app
CREATE TABLE story_showcase_sections (
  id TEXT PRIMARY KEY,
  
  -- Display info
  title TEXT NOT NULL,
  subtitle TEXT,
  icon TEXT, -- Emoji or icon name
  
  -- Section type determines content
  -- 'new_releases', 'popular', 'trending', 'series', 'curated', 'by_hsk', 'by_topic'
  section_type TEXT NOT NULL,
  
  -- Filtering/query config (JSON)
  -- e.g., {"hskLevel": 1, "limit": 10, "sortBy": "publishedAt"}
  config TEXT,
  
  -- Manual story selection (for 'curated' type)
  -- JSON array of story IDs: ["abc123", "def456"]
  curated_story_ids TEXT,
  
  -- Display order and visibility
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  
  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX story_showcase_order_idx ON story_showcase_sections(order_index);
CREATE INDEX story_showcase_active_idx ON story_showcase_sections(is_active);
CREATE INDEX story_showcase_type_idx ON story_showcase_sections(section_type);

-- Insert default showcase sections
INSERT INTO story_showcase_sections (id, title, subtitle, icon, section_type, config, order_index) VALUES
  ('section-new', 'New Releases', 'Fresh stories just added', '✨', 'new_releases', '{"limit": 10, "sortBy": "publishedAt"}', 1),
  ('section-popular', 'Most Popular', 'Stories everyone loves', '🔥', 'popular', '{"limit": 10, "sortBy": "completionCount"}', 2),
  ('section-series', 'Story Series', 'Multi-part adventures', '📚', 'series', '{"limit": 5}', 3),
  ('section-hsk1', 'HSK 1 Stories', 'Perfect for beginners', '🌱', 'by_hsk', '{"hskLevel": 1, "limit": 10}', 4),
  ('section-hsk2', 'HSK 2 Stories', 'Level up your reading', '🌿', 'by_hsk', '{"hskLevel": 2, "limit": 10}', 5);

