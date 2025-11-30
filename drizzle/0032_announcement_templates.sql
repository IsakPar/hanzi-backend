-- Announcement Templates Table
-- Allows creating and editing templates from the portal

CREATE TABLE IF NOT EXISTS announcement_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📢',
  description TEXT,
  
  -- Field definitions (JSON array)
  fields TEXT NOT NULL DEFAULT '[]',
  
  -- Default SDUI schema (JSON)
  default_schema TEXT NOT NULL,
  
  -- Ordering
  order_index INTEGER DEFAULT 0,
  
  -- Built-in templates can't be deleted
  is_builtin INTEGER DEFAULT 0,
  
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Seed default templates
INSERT OR IGNORE INTO announcement_templates (id, name, icon, description, fields, default_schema, order_index, is_builtin) VALUES
('update_required', 'Update Required', '📱', 'Prompt users to update the app', 
 '[{"key":"minVersion","label":"Minimum Version","type":"text","placeholder":"2.0.0"},{"key":"title","label":"Title","type":"text","default":"Update Required"},{"key":"body","label":"Message","type":"textarea","default":"A new version is available. Please update to continue."},{"key":"buttonText","label":"Button Text","type":"text","default":"Update Now"}]',
 '{"type":"modal","style":{"backgroundColor":"#3B82F6","textColor":"#ffffff"},"content":{"iconEmoji":"📱","title":"Update Required","body":"A new version is available. Please update to continue using HanziMaster."},"primaryCta":{"text":"Update Now","action":"open_store"},"secondaryCta":{"text":"Later","action":"dismiss"},"dismissible":true,"showOnce":false}',
 1, 1);

INSERT OR IGNORE INTO announcement_templates (id, name, icon, description, fields, default_schema, order_index, is_builtin) VALUES
('promotion', 'Promotion', '🎉', 'Announce a sale or special offer',
 '[{"key":"title","label":"Title","type":"text","default":"50% Off Premium!"},{"key":"body","label":"Message","type":"textarea","default":"Limited time offer. Upgrade now and save."},{"key":"buttonText","label":"Button Text","type":"text","default":"Claim Offer"},{"key":"backgroundColor","label":"Background Color","type":"color","default":"#7C3AED"}]',
 '{"type":"modal","style":{"backgroundGradient":"linear-gradient(135deg, #667eea 0%, #764ba2 100%)","textColor":"#ffffff"},"content":{"iconEmoji":"🎉","title":"50% Off Premium!","body":"Limited time offer. Upgrade now and save."},"primaryCta":{"text":"Claim Offer","action":"navigate","route":"/premium"},"secondaryCta":{"text":"Maybe Later","action":"dismiss"},"dismissible":true,"showOnce":true}',
 2, 1);

INSERT OR IGNORE INTO announcement_templates (id, name, icon, description, fields, default_schema, order_index, is_builtin) VALUES
('holiday', 'Holiday Greeting', '🎄', 'Send a seasonal greeting to users',
 '[{"key":"emoji","label":"Emoji","type":"text","default":"🎄"},{"key":"title","label":"Title","type":"text","default":"Merry Christmas!"},{"key":"body","label":"Message","type":"textarea","default":"Wishing you joy and happiness from the HanziMaster team."},{"key":"buttonText","label":"Button Text","type":"text","default":"Thank You!"},{"key":"backgroundColor","label":"Background Color","type":"color","default":"#DC2626"}]',
 '{"type":"modal","style":{"backgroundColor":"#DC2626","textColor":"#ffffff"},"content":{"iconEmoji":"🎄","title":"Merry Christmas!","body":"Wishing you joy and happiness from the HanziMaster team."},"primaryCta":{"text":"Thank You!","action":"dismiss"},"dismissible":true,"showOnce":true}',
 3, 1);

INSERT OR IGNORE INTO announcement_templates (id, name, icon, description, fields, default_schema, order_index, is_builtin) VALUES
('custom', 'Custom Message', '📢', 'Create a custom announcement',
 '[{"key":"type","label":"Display Type","type":"select","options":["modal","banner","fullscreen","bottom_sheet"],"default":"modal"},{"key":"emoji","label":"Emoji (optional)","type":"text","default":""},{"key":"title","label":"Title","type":"text","default":""},{"key":"body","label":"Message","type":"textarea","default":""},{"key":"buttonText","label":"Button Text","type":"text","default":"OK"},{"key":"backgroundColor","label":"Background Color","type":"color","default":"#1F2937"}]',
 '{"type":"modal","style":{"backgroundColor":"#1F2937","textColor":"#ffffff"},"content":{"title":"Announcement","body":"Your message here..."},"primaryCta":{"text":"OK","action":"dismiss"},"dismissible":true,"showOnce":true}',
 4, 1);

INSERT OR IGNORE INTO announcement_templates (id, name, icon, description, fields, default_schema, order_index, is_builtin) VALUES
('json', 'Advanced (JSON)', '🔧', 'Full JSON editor for custom SDUI',
 '[]',
 '{"type":"modal","style":{"backgroundColor":"#1F2937","textColor":"#ffffff"},"content":{"title":"Title","body":"Message body"},"primaryCta":{"text":"OK","action":"dismiss"},"dismissible":true,"showOnce":true}',
 99, 1);

CREATE INDEX IF NOT EXISTS announcement_templates_order_idx ON announcement_templates(order_index);

