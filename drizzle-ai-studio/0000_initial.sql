-- AI Studio Initial Schema
-- Separate database for AI-generated lesson drafts

CREATE TABLE IF NOT EXISTS lesson_drafts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  hsk_level INTEGER NOT NULL,
  lesson_number INTEGER,
  lesson_type TEXT NOT NULL,
  blocks_json TEXT NOT NULL,
  prompt TEXT NOT NULL,
  context_used TEXT,
  status TEXT NOT NULL DEFAULT 'generating',
  validation_passed INTEGER,
  validation_errors TEXT,
  quality_score INTEGER,
  quality_report TEXT,
  generator_model TEXT,
  validator_model TEXT,
  checker_model TEXT,
  generated_at TEXT NOT NULL,
  validated_at TEXT,
  checked_at TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  review_notes TEXT,
  approved_lesson_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS drafts_status_idx ON lesson_drafts(status);
CREATE INDEX IF NOT EXISTS drafts_hsk_idx ON lesson_drafts(hsk_level);
CREATE INDEX IF NOT EXISTS drafts_created_idx ON lesson_drafts(created_at);

CREATE TABLE IF NOT EXISTS generation_history (
  id TEXT PRIMARY KEY,
  request_type TEXT NOT NULL,
  prompt TEXT NOT NULL,
  parameters TEXT,
  success INTEGER NOT NULL,
  draft_ids TEXT,
  error_message TEXT,
  total_duration_ms INTEGER,
  generation_duration_ms INTEGER,
  validation_duration_ms INTEGER,
  check_duration_ms INTEGER,
  tokens_used INTEGER,
  estimated_cost TEXT,
  user_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS history_user_idx ON generation_history(user_id);
CREATE INDEX IF NOT EXISTS history_created_idx ON generation_history(created_at);
CREATE INDEX IF NOT EXISTS history_type_idx ON generation_history(request_type);

CREATE TABLE IF NOT EXISTS embedding_metadata (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  embedded_text TEXT NOT NULL,
  hsk_level INTEGER,
  unit_number INTEGER,
  lesson_number INTEGER,
  tags TEXT,
  last_synced_at TEXT NOT NULL,
  source_updated_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS embed_source_idx ON embedding_metadata(source_type, source_id);
CREATE INDEX IF NOT EXISTS embed_hsk_idx ON embedding_metadata(hsk_level);

CREATE TABLE IF NOT EXISTS generation_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  system_prompt TEXT,
  user_prompt_template TEXT NOT NULL,
  default_params TEXT,
  usage_count INTEGER DEFAULT 0,
  last_used_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS templates_category_idx ON generation_templates(category);

CREATE TABLE IF NOT EXISTS model_configs (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0,
  temperature TEXT,
  max_tokens INTEGER,
  additional_params TEXT,
  requests_per_minute INTEGER,
  tokens_per_minute INTEGER,
  cost_per_1k_tokens TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS models_role_idx ON model_configs(role);
CREATE INDEX IF NOT EXISTS models_active_idx ON model_configs(is_active);

