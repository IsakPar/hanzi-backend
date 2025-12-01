-- Migration: Add pedagogic metadata to vocabulary table
-- These columns enable deterministic distractor generation for MCQs
-- Note: 'category' already exists in the table

-- Add pos (part of speech) - nullable for now, enforce NOT NULL after backfill
-- Values: noun, verb, adj, adv, pronoun, particle, num, measure, conjunction, preposition
ALTER TABLE vocabulary ADD COLUMN pos TEXT;

-- Add tone_pattern - purely numeric format: "1-1", "3-3", "2-4", etc.
-- Single syllable: "1", "2", "3", "4", "5" (neutral)
-- Multi-syllable: "1-1", "3-3", "2-4-3", etc.
ALTER TABLE vocabulary ADD COLUMN tone_pattern TEXT;

-- Create indexes for fast querying (distractor generation queries)
CREATE INDEX IF NOT EXISTS idx_vocab_pos ON vocabulary(pos);
CREATE INDEX IF NOT EXISTS idx_vocab_tone ON vocabulary(tone_pattern);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_vocab_category_hsk ON vocabulary(category, hsk_level);
CREATE INDEX IF NOT EXISTS idx_vocab_pos_hsk ON vocabulary(pos, hsk_level);

