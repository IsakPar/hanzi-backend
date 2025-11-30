-- Control Center: Content staging and test devices
-- Allows content to be tested on specific devices before going live
-- NOTE: Using safe IF NOT EXISTS patterns for idempotent migrations

-- Test devices table - devices that can see staging content
CREATE TABLE IF NOT EXISTS test_devices (
  id TEXT PRIMARY KEY,
  device_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  platform TEXT,
  added_by TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Create index for device lookups
CREATE INDEX IF NOT EXISTS test_devices_device_id_idx ON test_devices(device_id);

-- Note: content_status columns on lessons and stories may already exist
-- SQLite doesn't support ALTER TABLE ADD COLUMN IF NOT EXISTS
-- These will be skipped if already present (handled by schema.ts)
