-- Story Series & Categories Migration
-- Enables organizing stories into series (multi-part collections) 
-- and managing home screen categories from the portal

-- ============================================
-- STORY SERIES (Multi-part collections)
-- e.g., "Journey to the West" with 12 parts
-- ============================================
CREATE TABLE IF NOT EXISTS story_series (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#4F46E5',
  icon TEXT DEFAULT 'book-open',
  hsk_level INTEGER,
  order_index INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_story_series_order ON story_series(order_index);
CREATE INDEX IF NOT EXISTS idx_story_series_published ON story_series(is_published);

-- ============================================
-- STORY CATEGORIES (Display sections on home)
-- e.g., "New Arrivals", "Featured", "Popular"
-- ============================================
CREATE TABLE IF NOT EXISTS story_categories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  display_type TEXT DEFAULT 'horizontal',  -- 'horizontal', 'grid', 'featured', 'series'
  filter_type TEXT DEFAULT 'manual',       -- 'recent', 'popular', 'manual', 'hsk', 'series'
  filter_value TEXT,                       -- JSON config for filter (e.g., {"hskLevel": 1})
  order_index INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 1,
  see_all_enabled INTEGER DEFAULT 1,
  max_items INTEGER DEFAULT 10,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_story_categories_order ON story_categories(order_index);
CREATE INDEX IF NOT EXISTS idx_story_categories_published ON story_categories(is_published);
CREATE UNIQUE INDEX IF NOT EXISTS idx_story_categories_slug ON story_categories(slug);

-- ============================================
-- STORY CATEGORY ITEMS (Manual assignments)
-- Links stories to categories with ordering
-- ============================================
CREATE TABLE IF NOT EXISTS story_category_items (
  category_id TEXT NOT NULL REFERENCES story_categories(id) ON DELETE CASCADE,
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  PRIMARY KEY (category_id, story_id)
);

CREATE INDEX IF NOT EXISTS idx_story_category_items_category ON story_category_items(category_id);
CREATE INDEX IF NOT EXISTS idx_story_category_items_story ON story_category_items(story_id);

-- ============================================
-- UPDATE STORIES TABLE
-- Add series relationship and featured flag
-- ============================================
ALTER TABLE stories ADD COLUMN series_id TEXT REFERENCES story_series(id) ON DELETE SET NULL;
ALTER TABLE stories ADD COLUMN series_order INTEGER DEFAULT 0;
ALTER TABLE stories ADD COLUMN is_featured INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_stories_series ON stories(series_id, series_order);
CREATE INDEX IF NOT EXISTS idx_stories_featured ON stories(is_featured);

-- ============================================
-- SEED DEFAULT CATEGORIES
-- These match the mobile app's current layout
-- ============================================
INSERT OR IGNORE INTO story_categories (id, title, slug, display_type, filter_type, order_index, is_published) VALUES
  ('cat-series', 'Curated Collections', 'curated-collections', 'series', 'series', 1, 1),
  ('cat-featured', 'Featured Stories', 'featured', 'featured', 'manual', 2, 1),
  ('cat-new', 'New Arrivals', 'new-arrivals', 'horizontal', 'recent', 3, 1),
  ('cat-popular', 'Popular This Week', 'popular', 'horizontal', 'popular', 4, 1);

