-- Migration: Add audio and example sentence fields to vocabulary
-- Date: 2025-11-24
-- Purpose: Support word audio, example sentences, and sentence audio

-- Add word audio field
ALTER TABLE vocabulary ADD COLUMN word_audio_r2_key TEXT;

-- Add example sentence fields
ALTER TABLE vocabulary ADD COLUMN example_chinese TEXT;
ALTER TABLE vocabulary ADD COLUMN example_pinyin TEXT;
ALTER TABLE vocabulary ADD COLUMN example_english TEXT;

-- Add example sentence audio field
ALTER TABLE vocabulary ADD COLUMN example_audio_r2_key TEXT;

-- Create index for faster queries on entries with examples
CREATE INDEX IF NOT EXISTS vocab_has_example_idx ON vocabulary(example_chinese) WHERE example_chinese IS NOT NULL;

