/**
 * AI Assistant Routes
 * Manages tuning prompt and system files
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, asc } from 'drizzle-orm';
import * as schema from '../schema';
import type { AppEnv } from '../types/env';
import { betterAuthMiddleware } from '../middleware/better-auth';
import { logWithContext } from '../utils/logger';

const app = new Hono<AppEnv>();

// Auth required for all routes
app.use('*', betterAuthMiddleware({ allowRoles: ['admin', 'user'] }));

// ═══════════════════════════════════════════════════════════
// TUNING PROMPT
// ═══════════════════════════════════════════════════════════

/**
 * GET /settings - Get AI assistant settings (tuning prompt)
 */
app.get('/settings', async (c) => {
  const requestId = c.get('requestId');
  const db = drizzle(c.env.DB, { schema });
  
  try {
    const settings = await db.query.aiAssistantSettings.findFirst({
      where: eq(schema.aiAssistantSettings.id, 'default'),
    });
    
    return c.json({
      tuningPrompt: settings?.tuningPrompt || null,
      updatedAt: settings?.updatedAt || null,
      updatedBy: settings?.updatedBy || null,
    });
  } catch (err) {
    logWithContext('error', 'ai-assistant.settings.get_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch settings' }, 500);
  }
});

/**
 * PUT /settings - Update AI assistant settings (tuning prompt)
 */
const updateSettingsSchema = z.object({
  tuningPrompt: z.string().nullable(),
});

app.put('/settings', zValidator('json', updateSettingsSchema), async (c) => {
  const requestId = c.get('requestId');
  const user = c.get('user');
  const { tuningPrompt } = c.req.valid('json');
  const db = drizzle(c.env.DB, { schema });
  
  try {
    // Upsert settings
    await db
      .insert(schema.aiAssistantSettings)
      .values({
        id: 'default',
        tuningPrompt,
        updatedBy: user?.email || 'unknown',
      })
      .onConflictDoUpdate({
        target: schema.aiAssistantSettings.id,
        set: {
          tuningPrompt,
          updatedAt: new Date(),
          updatedBy: user?.email || 'unknown',
        },
      });
    
    logWithContext('info', 'ai-assistant.settings.updated', {
      requestId,
      meta: { updatedBy: user?.email },
    });
    
    return c.json({ success: true });
  } catch (err) {
    logWithContext('error', 'ai-assistant.settings.update_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to update settings' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// SYSTEM FILES
// ═══════════════════════════════════════════════════════════

/**
 * GET /system-files - List all system files
 */
app.get('/system-files', async (c) => {
  const requestId = c.get('requestId');
  const db = drizzle(c.env.DB, { schema });
  
  try {
    const files = await db.query.aiSystemFiles.findMany({
      orderBy: [asc(schema.aiSystemFiles.orderIndex), desc(schema.aiSystemFiles.createdAt)],
    });
    
    return c.json({ files });
  } catch (err) {
    logWithContext('error', 'ai-assistant.system-files.list_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch system files' }, 500);
  }
});

/**
 * GET /system-files/active - Get only active system files (for chat)
 */
app.get('/system-files/active', async (c) => {
  const requestId = c.get('requestId');
  const db = drizzle(c.env.DB, { schema });
  
  try {
    const files = await db.query.aiSystemFiles.findMany({
      where: eq(schema.aiSystemFiles.isActive, true),
      orderBy: [asc(schema.aiSystemFiles.orderIndex)],
    });
    
    return c.json({ files });
  } catch (err) {
    logWithContext('error', 'ai-assistant.system-files.active_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch active system files' }, 500);
  }
});

/**
 * POST /system-files - Create a new system file
 */
const createFileSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  content: z.string().min(1),
  fileType: z.enum(['text', 'markdown', 'json']).default('text'),
  isActive: z.boolean().default(true),
  orderIndex: z.number().default(0),
});

app.post('/system-files', zValidator('json', createFileSchema), async (c) => {
  const requestId = c.get('requestId');
  const user = c.get('user');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB, { schema });
  
  try {
    const id = crypto.randomUUID();
    
    await db.insert(schema.aiSystemFiles).values({
      id,
      name: data.name,
      description: data.description,
      content: data.content,
      fileType: data.fileType,
      isActive: data.isActive,
      orderIndex: data.orderIndex,
      createdBy: user?.email || 'unknown',
    });
    
    const file = await db.query.aiSystemFiles.findFirst({
      where: eq(schema.aiSystemFiles.id, id),
    });
    
    logWithContext('info', 'ai-assistant.system-files.created', {
      requestId,
      meta: { fileId: id, name: data.name },
    });
    
    return c.json({ file }, 201);
  } catch (err) {
    logWithContext('error', 'ai-assistant.system-files.create_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to create system file' }, 500);
  }
});

/**
 * PUT /system-files/:id - Update a system file
 */
const updateFileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  content: z.string().min(1).optional(),
  fileType: z.enum(['text', 'markdown', 'json']).optional(),
  isActive: z.boolean().optional(),
  orderIndex: z.number().optional(),
});

app.put('/system-files/:id', zValidator('json', updateFileSchema), async (c) => {
  const requestId = c.get('requestId');
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB, { schema });
  
  try {
    const existing = await db.query.aiSystemFiles.findFirst({
      where: eq(schema.aiSystemFiles.id, id),
    });
    
    if (!existing) {
      return c.json({ error: 'File not found' }, 404);
    }
    
    await db
      .update(schema.aiSystemFiles)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.aiSystemFiles.id, id));
    
    const file = await db.query.aiSystemFiles.findFirst({
      where: eq(schema.aiSystemFiles.id, id),
    });
    
    logWithContext('info', 'ai-assistant.system-files.updated', {
      requestId,
      meta: { fileId: id },
    });
    
    return c.json({ file });
  } catch (err) {
    logWithContext('error', 'ai-assistant.system-files.update_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to update system file' }, 500);
  }
});

/**
 * DELETE /system-files/:id - Delete a system file
 */
app.delete('/system-files/:id', async (c) => {
  const requestId = c.get('requestId');
  const id = c.req.param('id');
  const db = drizzle(c.env.DB, { schema });
  
  try {
    const existing = await db.query.aiSystemFiles.findFirst({
      where: eq(schema.aiSystemFiles.id, id),
    });
    
    if (!existing) {
      return c.json({ error: 'File not found' }, 404);
    }
    
    await db.delete(schema.aiSystemFiles).where(eq(schema.aiSystemFiles.id, id));
    
    logWithContext('info', 'ai-assistant.system-files.deleted', {
      requestId,
      meta: { fileId: id },
    });
    
    return c.json({ success: true });
  } catch (err) {
    logWithContext('error', 'ai-assistant.system-files.delete_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to delete system file' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// COST TRACKING
// ═══════════════════════════════════════════════════════════

/**
 * GET /cost-summary - Get AI cost for different periods
 */
app.get('/cost-summary', async (c) => {
  const requestId = c.get('requestId');
  const db = drizzle(c.env.DB, { schema });
  
  try {
    // Get cost from ai_logs for last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Query ai_logs table for token usage
    const logs7Days = await c.env.DB.prepare(`
      SELECT 
        COALESCE(SUM(input_tokens), 0) as input_tokens,
        COALESCE(SUM(output_tokens), 0) as output_tokens,
        COALESCE(SUM(cost), 0) as total_cost,
        COUNT(*) as request_count
      FROM ai_logs 
      WHERE created_at >= ?
    `).bind(Math.floor(sevenDaysAgo.getTime() / 1000)).first();
    
    const logs30Days = await c.env.DB.prepare(`
      SELECT 
        COALESCE(SUM(input_tokens), 0) as input_tokens,
        COALESCE(SUM(output_tokens), 0) as output_tokens,
        COALESCE(SUM(cost), 0) as total_cost,
        COUNT(*) as request_count
      FROM ai_logs 
      WHERE created_at >= ?
    `).bind(Math.floor(thirtyDaysAgo.getTime() / 1000)).first();
    
    return c.json({
      last7Days: {
        inputTokens: logs7Days?.input_tokens || 0,
        outputTokens: logs7Days?.output_tokens || 0,
        totalTokens: (logs7Days?.input_tokens || 0) + (logs7Days?.output_tokens || 0),
        cost: logs7Days?.total_cost || 0,
        requests: logs7Days?.request_count || 0,
      },
      last30Days: {
        inputTokens: logs30Days?.input_tokens || 0,
        outputTokens: logs30Days?.output_tokens || 0,
        totalTokens: (logs30Days?.input_tokens || 0) + (logs30Days?.output_tokens || 0),
        cost: logs30Days?.total_cost || 0,
        requests: logs30Days?.request_count || 0,
      },
    });
  } catch (err) {
    logWithContext('error', 'ai-assistant.cost-summary.failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    // Return zeros on error (table might not exist yet)
    return c.json({
      last7Days: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0, requests: 0 },
      last30Days: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0, requests: 0 },
    });
  }
});

export default app;

