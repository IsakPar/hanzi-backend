-- Seed AI Models (GPT-5 Nano, Mini, and fallbacks)

-- GPT-5 Nano (Active by default - cheapest option)
INSERT INTO ai_models (id, name, provider, cost_per_1k_input, cost_per_1k_output, is_active, tier, max_tokens, supports_json) 
VALUES ('gpt-5-nano', 'GPT-5 Nano', 'openai', 0.00015, 0.0003, 1, 'nano', 128000, 1);

-- GPT-5 Mini (Higher quality, moderate cost)
INSERT INTO ai_models (id, name, provider, cost_per_1k_input, cost_per_1k_output, is_active, tier, max_tokens, supports_json) 
VALUES ('gpt-5-mini', 'GPT-5 Mini', 'openai', 0.0003, 0.0006, 0, 'mini', 128000, 1);

-- GPT-4o (Standard fallback)
INSERT INTO ai_models (id, name, provider, cost_per_1k_input, cost_per_1k_output, is_active, tier, max_tokens, supports_json) 
VALUES ('gpt-4o', 'GPT-4o', 'openai', 0.0025, 0.01, 0, 'standard', 128000, 1);

-- GPT-4o-mini (Budget option)
INSERT INTO ai_models (id, name, provider, cost_per_1k_input, cost_per_1k_output, is_active, tier, max_tokens, supports_json) 
VALUES ('gpt-4o-mini', 'GPT-4o Mini', 'openai', 0.00015, 0.0006, 0, 'mini', 128000, 1);

-- o1-preview (Premium - for complex reasoning)
INSERT INTO ai_models (id, name, provider, cost_per_1k_input, cost_per_1k_output, is_active, tier, max_tokens, supports_json) 
VALUES ('o1-preview', 'o1 Preview', 'openai', 0.015, 0.06, 0, 'premium', 128000, 0);

-- Note: Actual GPT-5 nano/mini pricing is placeholder - update when released
-- These are estimates based on expected pricing tiers

