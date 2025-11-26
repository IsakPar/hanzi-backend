-- Migration: Add upload_status field for safe R2 transaction handling
-- Created: 2025-11-24
-- Purpose: Enable pending -> ready flow to prevent orphaned R2 files

ALTER TABLE content_library ADD COLUMN upload_status TEXT CHECK(upload_status IN ('pending_upload', 'uploading', 'ready', 'failed')) DEFAULT 'ready';

-- Add index for cleanup queries
CREATE INDEX IF NOT EXISTS content_library_upload_status_idx ON content_library(upload_status, created_at);

-- Backfill existing records to 'ready'
UPDATE content_library SET upload_status = 'ready' WHERE upload_status IS NULL;

