-- Lesson Alternatives & Connected Words System
-- Enables focus words, slot-based alternatives, and semantic word connections

-- Lesson block slots (defines word positions in a sentence)
CREATE TABLE IF NOT EXISTS lesson_block_slots (
  id TEXT PRIMARY KEY,
  block_id TEXT NOT NULL REFERENCES lesson_blocks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  word_id TEXT NOT NULL REFERENCES vocabulary(id),
  hanzi TEXT NOT NULL,
  is_focus INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS lesson_block_slots_block_idx ON lesson_block_slots(block_id);
CREATE INDEX IF NOT EXISTS lesson_block_slots_word_idx ON lesson_block_slots(word_id);

-- Slot alternatives (approved alternative words for each slot)
CREATE TABLE IF NOT EXISTS slot_alternatives (
  id TEXT PRIMARY KEY,
  slot_id TEXT NOT NULL REFERENCES lesson_block_slots(id) ON DELETE CASCADE,
  word_id TEXT NOT NULL REFERENCES vocabulary(id),
  hanzi TEXT NOT NULL,
  is_approved INTEGER DEFAULT 0,
  approved_by TEXT,
  approved_at TEXT,
  ai_suggested INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS slot_alternatives_slot_idx ON slot_alternatives(slot_id);
CREATE INDEX IF NOT EXISTS slot_alternatives_approved_idx ON slot_alternatives(is_approved);

-- Block connected words (related vocab for vocab track expansion)
CREATE TABLE IF NOT EXISTS block_connected_words (
  id TEXT PRIMARY KEY,
  block_id TEXT NOT NULL REFERENCES lesson_blocks(id) ON DELETE CASCADE,
  word_id TEXT NOT NULL REFERENCES vocabulary(id),
  hanzi TEXT NOT NULL,
  inferred_category TEXT,
  is_approved INTEGER DEFAULT 0,
  approved_by TEXT,
  approved_at TEXT,
  ai_suggested INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS block_connected_words_block_idx ON block_connected_words(block_id);
CREATE INDEX IF NOT EXISTS block_connected_words_approved_idx ON block_connected_words(is_approved);

