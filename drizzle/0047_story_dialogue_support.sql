-- Add dialogue support for stories
-- Enables speaker attribution for dialogue-style stories

-- Add speaker column to story_sentences
ALTER TABLE story_sentences ADD COLUMN speaker TEXT;

-- Add story_type to stories table
-- 'text' = narration style, 'dialogue' = conversation with speakers
ALTER TABLE stories ADD COLUMN story_type TEXT DEFAULT 'text';

