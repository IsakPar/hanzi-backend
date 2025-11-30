import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { jwtAuthMiddleware } from '../middleware/jwt-auth';
import { ModelManagerService } from '../services/model-manager';
import type { AppEnv } from '../types/app';

const app = new Hono<AppEnv>();

// Protect all routes
app.use('/*', jwtAuthMiddleware({ allowRoles: ['admin'] }));

// === MODEL MANAGEMENT ===

/**
 * GET /models - List all available AI models
 */
app.get('/models', async (c) => {
  const service = new ModelManagerService(c.env.DB);
  const models = await service.getAllModels();
  return c.json({ models });
});

/**
 * GET /models/active - Get currently active model
 */
app.get('/models/active', async (c) => {
  const service = new ModelManagerService(c.env.DB);
  const model = await service.getActiveModel();
  
  if (!model) {
    return c.json({ error: 'No active model configured' }, 404);
  }
  
  return c.json(model);
});

/**
 * PUT /models/active - Set the active model
 */
const setActiveModelSchema = z.object({
  model_id: z.string(),
});

app.put('/models/active', zValidator('json', setActiveModelSchema), async (c) => {
  const { model_id } = c.req.valid('json');
  const service = new ModelManagerService(c.env.DB);
  
  try {
    const result = await service.setActiveModel(model_id);
    return c.json({
      success: true,
      previous_model: result.previous,
      active_model: result.current,
      message: `Switched from ${result.previous || 'none'} to ${result.current}`
    });
  } catch (err: any) {
    return c.json({ error: 'Failed to switch model', message: err.message }, 500);
  }
});

/**
 * POST /models - Add a new AI model
 */
const addModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
  cost_per_1k_input: z.number().min(0),
  cost_per_1k_output: z.number().min(0),
  tier: z.enum(['nano', 'mini', 'standard', 'premium']),
  max_tokens: z.number().optional().default(4096),
  supports_json: z.boolean().optional().default(true),
});

app.post('/models', zValidator('json', addModelSchema), async (c) => {
  const data = c.req.valid('json');
  const service = new ModelManagerService(c.env.DB);
  
  try {
    const model = await service.addModel({
      id: data.id,
      name: data.name,
      provider: data.provider,
      costPer1kInput: data.cost_per_1k_input,
      costPer1kOutput: data.cost_per_1k_output,
      tier: data.tier,
      maxTokens: data.max_tokens,
      supportsJson: data.supports_json,
      isActive: false,
    });
    
    return c.json({ success: true, model }, 201);
  } catch (err: any) {
    return c.json({ error: 'Failed to add model', message: err.message }, 500);
  }
});

// === USAGE ANALYTICS ===

/**
 * GET /usage - Get API usage statistics
 */
const usageQuerySchema = z.object({
  from: z.string().optional(), // ISO date string
  to: z.string().optional(),   // ISO date string
  user_id: z.string().optional(),
});

app.get('/usage', zValidator('query', usageQuerySchema), async (c) => {
  const query = c.req.valid('query');
  const service = new ModelManagerService(c.env.DB);
  
  try {
    const stats = await service.getUsageStats({
      userId: query.user_id,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
    
    return c.json(stats);
  } catch (err: any) {
    return c.json({ error: 'Failed to fetch usage stats', message: err.message }, 500);
  }
});

/**
 * GET /usage/realtime - Get real-time usage (today + this month)
 */
app.get('/usage/realtime', async (c) => {
  const userId = c.req.query('user_id');
  const service = new ModelManagerService(c.env.DB);
  
  try {
    const stats = await service.getRealtimeUsage(userId);
    return c.json(stats);
  } catch (err: any) {
    return c.json({ error: 'Failed to fetch realtime usage', message: err.message }, 500);
  }
});

export default app;

