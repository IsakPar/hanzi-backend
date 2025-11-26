-- Migration: Add tier system and subscription tracking
-- Created: 2025-11-24

-- Add tier and subscription fields to users table
ALTER TABLE users ADD COLUMN clerk_id TEXT;
ALTER TABLE users ADD COLUMN tier TEXT DEFAULT 'free' CHECK(tier IN ('free', 'premium', 'pro'));
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'none' CHECK(subscription_status IN ('none', 'active', 'past_due', 'canceled', 'expired'));
ALTER TABLE users ADD COLUMN subscription_platform TEXT CHECK(subscription_platform IN ('ios', 'android', 'web'));
ALTER TABLE users ADD COLUMN subscription_expires_at INTEGER;
ALTER TABLE users ADD COLUMN updated_at INTEGER DEFAULT (strftime('%s', 'now'));
ALTER TABLE users ADD COLUMN last_login_at INTEGER;

-- Create tier_limits configuration table
CREATE TABLE IF NOT EXISTS tier_limits (
  tier TEXT PRIMARY KEY CHECK(tier IN ('free', 'premium', 'pro')),
  requests_per_day INTEGER NOT NULL,
  tokens_per_day INTEGER NOT NULL,
  max_parallel_generations INTEGER DEFAULT 1,
  content_downloads_per_day INTEGER DEFAULT 5,
  offline_packages_allowed INTEGER DEFAULT 0,
  can_access_premium_content INTEGER DEFAULT 0
);

-- Seed tier limits with default values
INSERT INTO tier_limits (tier, requests_per_day, tokens_per_day, max_parallel_generations, content_downloads_per_day, offline_packages_allowed, can_access_premium_content) VALUES
  ('free',    10,   5000,  1,   5,   0,  0),
  ('premium', 100,  50000, 3,   50,  3,  1),
  ('pro',     1000, 500000, 10, -1,  -1, 1);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);

-- Create unique index on clerk_id (allows NULL values, unique for non-NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk_id_unique ON users(clerk_id) WHERE clerk_id IS NOT NULL;

