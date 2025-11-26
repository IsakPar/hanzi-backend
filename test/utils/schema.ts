export const SYSTEM_EVENTS_SCHEMA = [
  `CREATE TABLE system_events (
    id TEXT PRIMARY KEY NOT NULL,
    event_type TEXT NOT NULL,
    request_id TEXT,
    model_used TEXT,
    prompt_slug TEXT,
    prompt_version INTEGER,
    latency_ms INTEGER,
    cost_usd REAL,
    user_id TEXT,
    metadata TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );`,
  `CREATE INDEX system_events_type_idx ON system_events (event_type);`,
  `CREATE INDEX system_events_created_idx ON system_events (created_at);`,
];

export const API_USAGE_SCHEMA = [
  `CREATE TABLE api_usage (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    request_id TEXT NOT NULL,
    model_used TEXT NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    estimated_cost REAL DEFAULT 0,
    latency_ms INTEGER,
    success INTEGER DEFAULT 1,
    error_message TEXT,
    prompt_slug TEXT,
    prompt_version INTEGER,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );`,
  `CREATE INDEX api_usage_user_idx ON api_usage (user_id);`,
  `CREATE INDEX api_usage_model_idx ON api_usage (model_used);`,
  `CREATE INDEX api_usage_date_idx ON api_usage (created_at);`,
  `CREATE INDEX api_usage_prompt_idx ON api_usage (prompt_slug, prompt_version);`,
];

export const PROMPT_TEMPLATES_SCHEMA = [
  `CREATE TABLE prompt_templates (
    id TEXT PRIMARY KEY NOT NULL,
    slug TEXT NOT NULL,
    version INTEGER NOT NULL,
    status TEXT NOT NULL,
    body TEXT,
    notes TEXT,
    metadata TEXT,
    created_by TEXT,
    promoted_by TEXT,
    steps TEXT,
    cost_limits TEXT,
    quality_gate TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    updated_at INTEGER DEFAULT (strftime('%s','now'))
  );`,
  `CREATE INDEX prompt_templates_slug_version_idx ON prompt_templates (slug, version);`,
  `CREATE INDEX prompt_templates_slug_status_idx ON prompt_templates (slug, status);`,
  `CREATE TABLE prompt_template_history (
    id TEXT PRIMARY KEY NOT NULL,
    slug TEXT NOT NULL,
    from_version INTEGER,
    to_version INTEGER NOT NULL,
    reason TEXT,
    changed_by TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );`,
  `CREATE INDEX prompt_template_history_slug_idx ON prompt_template_history (slug, created_at);`,
];

