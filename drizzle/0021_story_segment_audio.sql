-- Migration: Story Segment Audio Enhancements
-- Adds support for sentence-level audio sync and configurable pause

-- Add pause configuration to stories table
ALTER TABLE stories ADD COLUMN pause_between_segments_ms INTEGER DEFAULT 500;

-- Add audio duration to story_sentences for playback timing
ALTER TABLE story_sentences ADD COLUMN audio_duration_ms INTEGER;

