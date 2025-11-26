-- Curriculum Words Table
-- Stores all vocabulary words in teaching order for the AI lesson generator
CREATE TABLE IF NOT EXISTS curriculum_words (
  id TEXT PRIMARY KEY,
  hanzi TEXT NOT NULL UNIQUE,
  position INTEGER NOT NULL UNIQUE,
  hsk_level INTEGER NOT NULL,
  unit INTEGER,
  lesson INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  pos TEXT,
  tags TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_curriculum_position ON curriculum_words(position);
CREATE INDEX IF NOT EXISTS idx_curriculum_hsk ON curriculum_words(hsk_level);
CREATE INDEX IF NOT EXISTS idx_curriculum_active ON curriculum_words(is_active);
CREATE INDEX IF NOT EXISTS idx_curriculum_hanzi ON curriculum_words(hanzi);

-- Curriculum Version Table
-- Single-row table to track curriculum version for sync
CREATE TABLE IF NOT EXISTS curriculum_version (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version_hash TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Initialize with empty version
INSERT OR IGNORE INTO curriculum_version (id, version_hash, word_count) 
VALUES (1, '', 0);

