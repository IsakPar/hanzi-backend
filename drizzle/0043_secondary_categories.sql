-- Add secondary categories to vocabulary for better RAG/distractor generation
-- Primary category is the main semantic group (family, food, etc.)
-- Secondary categories capture additional semantic relationships (e.g., "妈妈" could also be "people", "relationships")

ALTER TABLE vocabulary ADD COLUMN secondary_categories TEXT;
-- Stored as JSON array: ["people", "relationships", "honorifics"]

-- Index for queries filtering by secondary categories
CREATE INDEX IF NOT EXISTS vocab_secondary_cat_idx ON vocabulary(secondary_categories);

