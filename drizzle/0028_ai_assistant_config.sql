-- AI Assistant Configuration
-- Stores persistent tuning prompt and system files

-- AI Settings (singleton for now, could be per-user later)
CREATE TABLE IF NOT EXISTS ai_assistant_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  tuning_prompt TEXT,
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_by TEXT
);

-- Insert default row
INSERT OR IGNORE INTO ai_assistant_settings (id) VALUES ('default');

-- AI System Files (persistent context files)
CREATE TABLE IF NOT EXISTS ai_system_files (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  file_type TEXT DEFAULT 'text', -- text, markdown, json
  is_active INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  created_by TEXT
);

-- Index for active files
CREATE INDEX IF NOT EXISTS ai_system_files_active_idx ON ai_system_files(is_active);

