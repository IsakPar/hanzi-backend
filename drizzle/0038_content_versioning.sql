-- Content Versioning System
-- Tracks lesson content versions so user progress remains meaningful when content changes

-- Add version tracking to lessons
ALTER TABLE lessons ADD COLUMN content_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE lessons ADD COLUMN content_hash TEXT; -- SHA256 of blocks JSON for change detection

-- Add version tracking to user_progress
ALTER TABLE user_progress ADD COLUMN completed_version INTEGER; -- Version user completed
ALTER TABLE user_progress ADD COLUMN needs_review INTEGER NOT NULL DEFAULT 0; -- Flag if content changed significantly

-- Add version tracking to stories
ALTER TABLE stories ADD COLUMN content_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE stories ADD COLUMN content_hash TEXT;

-- Index for finding users who need review
CREATE INDEX IF NOT EXISTS idx_user_progress_needs_review ON user_progress(needs_review) WHERE needs_review = 1;

