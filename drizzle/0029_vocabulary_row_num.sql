-- Add row_num column to vocabulary for human-readable numeric IDs
-- This gives each word a permanent, simple ID like 1, 2, 3...

-- Step 1: Add the column (nullable first)
ALTER TABLE vocabulary ADD COLUMN row_num INTEGER;

-- Step 2: Create unique index for lookups
CREATE UNIQUE INDEX IF NOT EXISTS vocab_row_num_idx ON vocabulary(row_num);





