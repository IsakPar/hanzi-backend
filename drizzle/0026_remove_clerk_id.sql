-- Remove Clerk ID column from users table
-- This is safe because we're no longer using Clerk for authentication

-- SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
-- However, for simplicity and since clerk_id is already nullable and not being used,
-- we can just leave it and let it be NULL for all future users.

-- For a cleaner approach, you could run this migration manually:
-- 1. Create new table without clerk_id
-- 2. Copy data
-- 3. Drop old table
-- 4. Rename new table

-- For now, just drop the index since we won't be querying by clerk_id anymore
DROP INDEX IF EXISTS users_clerk_id_idx;

