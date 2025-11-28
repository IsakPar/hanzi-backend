-- Add cover image support to story_series
-- Allows custom thumbnails for series collections

ALTER TABLE story_series ADD COLUMN cover_image_r2_key TEXT;

