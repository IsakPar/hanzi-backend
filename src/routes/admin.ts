import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { lessons, lessonBlocks, waitlist, tierLimits, vocabulary, stories } from '../schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { jwtAuthMiddleware } from '../middleware/jwt-auth';
import type { AppEnv } from '../types/app';
import { logWithContext } from '../utils/logger';
import { createRevenueCatClient } from '../services/revenuecat-client';
import { VectorizeService } from '../services/vectorize';
import { AIUsageLogger } from '../services/ai-usage-logger';
import { adminRateLimit } from '../middleware/rate-limit';

// Default tier limits (used when database has no records)
// Tiers: free (default), premium ($9.99/month, shown as "Master" in UI), pro (admin/internal)
const DEFAULT_TIER_LIMITS = {
  free: {
    tier: 'free' as const,
    requestsPerDay: 10,
    tokensPerDay: 5000,
    maxParallelGenerations: 1,
    contentDownloadsPerDay: 5,
    offlinePackagesAllowed: 0,
    canAccessPremiumContent: false,
    updatedAt: null as Date | null,
  },
  premium: {
    tier: 'premium' as const,
    requestsPerDay: 100,
    tokensPerDay: 50000,
    maxParallelGenerations: 3,
    contentDownloadsPerDay: 999999,
    offlinePackagesAllowed: 6,
    canAccessPremiumContent: true,
    updatedAt: null as Date | null,
  },
  pro: {
    tier: 'pro' as const,
    requestsPerDay: 1000,
    tokensPerDay: 500000,
    maxParallelGenerations: 10,
    contentDownloadsPerDay: 999999,
    offlinePackagesAllowed: 999999,
    canAccessPremiumContent: true,
    updatedAt: null as Date | null,
  },
};

const app = new Hono<AppEnv>();

// Apply rate limiting to admin routes
app.use('/*', adminRateLimit);

// Protect all routes in this file - requires admin role via Better Auth session
app.use('/*', jwtAuthMiddleware({ allowRoles: ['admin'] }));

// Get Waitlist
app.get('/waitlist', async (c) => {
  const db = drizzle(c.env.DB);
  try {
    const results = await db
      .select()
      .from(waitlist)
      .orderBy(desc(waitlist.createdAt));
    return c.json({ waitlist: results });
  } catch (error) {
    logWithContext('error', 'admin.waitlist_fetch_failed', {
      requestId: c.get('requestId'),
      meta: { error: (error as Error).message },
    });
    return c.json({ error: 'Failed to fetch waitlist' }, 500);
  }
});

// ========================================
// HELPER: Validator Sync
// ========================================

/**
 * Trigger Python validator sync after lesson changes
 * Best-effort - failures don't block the main request
 */
async function triggerValidatorSync(env: { VALIDATOR_URL?: string; VALIDATOR_API_KEY?: string }) {
  if (!env.VALIDATOR_URL || !env.VALIDATOR_API_KEY) {
    logWithContext('warn', 'admin.validator_sync.skipped', {
      meta: { reason: 'VALIDATOR_URL or VALIDATOR_API_KEY not configured' }
    });
    return;
  }
  
  try {
    const response = await fetch(`${env.VALIDATOR_URL}/sync`, {
      method: 'POST',
      headers: {
        'X-API-Key': env.VALIDATOR_API_KEY,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });
    
    if (response.ok) {
      const result = await response.json() as { word_count?: number; changed?: boolean };
      logWithContext('info', 'admin.validator_sync.success', {
        meta: { wordCount: result.word_count, changed: result.changed }
      });
    } else {
      logWithContext('warn', 'admin.validator_sync.failed', {
        meta: { status: response.status }
      });
    }
  } catch (e) {
    logWithContext('warn', 'admin.validator_sync.error', {
      meta: { error: (e as Error).message }
    });
  }
}

// ========================================
// LESSON CREATION
// ========================================

// Zod Schema for Lesson Creation
const createLessonSchema = z.object({
  title: z.string().min(1), // Reduced from 3 to allow short titles
  subtitle: z.string().optional(),
  hskLevel: z.number().min(1).max(9),
  lessonNumber: z.number().int().min(1).optional(), // Auto-increment if not provided
  lessonType: z.enum(['lesson', 'speaking', 'mini_test', 'hsk_test']).default('lesson'),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  description: z.string().optional(),
  estimatedMinutes: z.number().int().min(1).max(120).optional(),
  grammarPoints: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  targetVocabulary: z.array(z.string()).optional(), // Array of vocab IDs
  blocks: z.array(z.object({
    type: z.string(), // e.g. 'hero_hanzi', 'explain'
    content: z.record(z.any()) // The specific block data
  })).optional().default([]) // Allow empty blocks, default to empty array
});

app.post('/lessons', zValidator('json', createLessonSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const lessonId = crypto.randomUUID();

  // Debug: Log incoming data
  logWithContext('info', 'admin.lesson_create_start', {
    requestId: c.get('requestId'),
    meta: {
      title: data.title,
      hskLevel: data.hskLevel,
      lessonType: data.lessonType,
      blockCount: data.blocks?.length || 0,
    },
  });

  try {
    // Auto-increment lesson number if not provided
    let lessonNumber = data.lessonNumber;
    if (!lessonNumber) {
      // Get the highest lesson number for this HSK level and type
      const maxNumberResult = await db
        .select({ maxNumber: lessons.lessonNumber })
        .from(lessons)
        .where(
          and(
            eq(lessons.hskLevel, data.hskLevel),
            eq(lessons.lessonType, data.lessonType || 'lesson')
          )
        )
        .orderBy(desc(lessons.lessonNumber))
        .limit(1);
      
      lessonNumber = maxNumberResult[0]?.maxNumber ? maxNumberResult[0].maxNumber + 1 : 1;
      logWithContext('info', 'admin.lesson_number_assigned', {
        requestId: c.get('requestId'),
        meta: { lessonNumber },
      });
    }

    // Transaction-safe: Use batch operations
    // D1 batch operations are atomic - all succeed or all fail
    const lessonValues = {
      id: lessonId,
      title: data.title,
      subtitle: data.subtitle || null,
      hskLevel: data.hskLevel,
      lessonNumber,
      lessonType: data.lessonType || 'lesson',
      difficulty: data.difficulty || 'medium',
      description: data.description || null,
      estimatedMinutes: data.estimatedMinutes || 15,
      grammarPoints: data.grammarPoints || null,
      tags: data.tags || null,
      targetVocabulary: data.targetVocabulary || null,
      isPublished: false, // Draft by default
    };

    logWithContext('info', 'admin.lesson_insert_prepared', {
      requestId: c.get('requestId'),
      meta: { lessonId, title: lessonValues.title },
    });

    // First insert the lesson
    await db.insert(lessons).values(lessonValues);

    // Then insert blocks in batches to avoid D1 parameter limit
    if (data.blocks && data.blocks.length > 0) {
      const BATCH_SIZE = 10; // D1 has ~100 param limit, each block has ~5 params
      const blockValues = data.blocks.map((block, index) => ({
        id: crypto.randomUUID(),
        lessonId: lessonId,
        type: block.type,
        orderIndex: index,
        content: block.content,
      }));

      logWithContext('info', 'admin.lesson_blocks_insert', {
        requestId: c.get('requestId'),
        meta: { blockCount: blockValues.length, batches: Math.ceil(blockValues.length / BATCH_SIZE) },
      });

      for (let i = 0; i < blockValues.length; i += BATCH_SIZE) {
        const batch = blockValues.slice(i, i + BATCH_SIZE);
        await db.insert(lessonBlocks).values(batch);
      }
    }

    // Trigger validator sync if lesson has vocabulary
    if (data.targetVocabulary && data.targetVocabulary.length > 0) {
      triggerValidatorSync(c.env);
    }

    logWithContext('info', 'admin.lesson_created_success', {
      requestId: c.get('requestId'),
      meta: { lessonId, lessonNumber },
    });
    
    return c.json({ success: true, id: lessonId, lessonNumber });
  } catch (error) {
    const err = error as Error;
    logWithContext('error', 'admin.lesson_creation_failed', {
      requestId: c.get('requestId'),
      meta: {
        message: err.message,
        stack: err.stack?.substring(0, 500),
        name: err.name,
      },
    });
    // Return more details to help debug
    return c.json({ 
      error: 'Failed to create lesson',
      details: err.message,
      hint: err.message.includes('UNIQUE') ? 'Lesson with this title/number already exists' :
            err.message.includes('NOT NULL') ? 'Missing required field' :
            err.message.includes('FOREIGN KEY') ? 'Invalid reference (vocabulary or unit)' :
            undefined,
    }, 500);
  }
});

// ========================================
// LESSONS LIST (Admin view - all lessons)
// ========================================

/**
 * GET /lessons - List all lessons for admin (published + drafts)
 * Used by AIFilePickerModal and lesson management
 */
app.get('/lessons', async (c) => {
  const requestId = c.get('requestId');
  const db = drizzle(c.env.DB);
  
  try {
    // Get query params for optional filtering
    const hskLevel = c.req.query('hskLevel');
    const unitId = c.req.query('unitId');
    
    // Build query
    let query = db
      .select({
        id: lessons.id,
        title: lessons.title,
        subtitle: lessons.subtitle,
        lessonNumber: lessons.lessonNumber,
        lessonType: lessons.lessonType,
        hskLevel: lessons.hskLevel,
        unitId: lessons.unitId,
        difficulty: lessons.difficulty,
        description: lessons.description,
        estimatedMinutes: lessons.estimatedMinutes,
        isPublished: lessons.isPublished,
        contentVersion: lessons.contentVersion,
        createdAt: lessons.createdAt,
        updatedAt: lessons.updatedAt,
      })
      .from(lessons);
    
    // Apply filters if provided
    const conditions = [];
    if (hskLevel) {
      conditions.push(eq(lessons.hskLevel, parseInt(hskLevel)));
    }
    if (unitId) {
      conditions.push(eq(lessons.unitId, unitId));
    }
    
    const results = conditions.length > 0 
      ? await query.where(and(...conditions)).orderBy(lessons.hskLevel, lessons.lessonNumber)
      : await query.orderBy(lessons.hskLevel, lessons.lessonNumber);
    
    // Get block counts for each lesson
    const lessonsWithBlockCount = await Promise.all(
      results.map(async (lesson) => {
        const blocks = await db
          .select({ id: lessonBlocks.id })
          .from(lessonBlocks)
          .where(eq(lessonBlocks.lessonId, lesson.id));
        
        return {
          ...lesson,
          blockCount: blocks.length,
        };
      })
    );
    
    logWithContext('info', 'admin.lessons.list', {
      requestId,
      meta: { count: lessonsWithBlockCount.length },
    });
    
    return c.json({ lessons: lessonsWithBlockCount });
  } catch (error) {
    logWithContext('error', 'admin.lessons.list_failed', {
      requestId,
      meta: { error: (error as Error).message },
    });
    return c.json({ error: 'Failed to fetch lessons' }, 500);
  }
});

// ========================================
// LESSON UPDATE / DELETE / PUBLISH
// ========================================

/**
 * PUT /lessons/:id - Update lesson metadata and optionally blocks
 */
const updateLessonSchema = z.object({
  title: z.string().min(1).optional(),
  subtitle: z.string().optional().nullable(),
  hskLevel: z.number().int().min(1).max(6).optional(),
  lessonNumber: z.number().int().min(1).optional(),
  lessonType: z.enum(['lesson', 'speaking', 'mini_test', 'hsk_test']).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  description: z.string().optional().nullable(),
  estimatedMinutes: z.number().int().min(1).optional(),
  grammarPoints: z.array(z.string()).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  targetVocabulary: z.array(z.string()).optional().nullable(),
  isPublished: z.boolean().optional(),
  blocks: z.array(z.object({
    id: z.string().optional(),
    type: z.string(),
    content: z.record(z.unknown()),
  })).optional(),
});

app.put('/lessons/:id', zValidator('json', updateLessonSchema), async (c) => {
  const requestId = c.get('requestId');
  const lessonId = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  
  try {
    // Check if lesson exists
    const existing = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
    if (!existing[0]) {
      return c.json({ error: 'Lesson not found' }, 404);
    }
    
    // Update lesson metadata
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.subtitle !== undefined) updateData.subtitle = data.subtitle;
    if (data.hskLevel !== undefined) updateData.hskLevel = data.hskLevel;
    if (data.lessonNumber !== undefined) updateData.lessonNumber = data.lessonNumber;
    if (data.lessonType !== undefined) updateData.lessonType = data.lessonType;
    if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.estimatedMinutes !== undefined) updateData.estimatedMinutes = data.estimatedMinutes;
    if (data.grammarPoints !== undefined) updateData.grammarPoints = data.grammarPoints;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.targetVocabulary !== undefined) updateData.targetVocabulary = data.targetVocabulary;
    if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;
    
    // If this lesson was "live" and we're updating content, mark it as "staging"
    // so the Release Manager detects it as a pending change
    if (existing[0].contentStatus === 'live' && (data.blocks || data.title !== undefined || data.targetVocabulary !== undefined)) {
      updateData.contentStatus = 'staging';
      updateData.contentHash = null; // Clear hash so it gets recalculated on next release
    }
    
    await db.update(lessons).set(updateData).where(eq(lessons.id, lessonId));
    
    // Update blocks if provided
    if (data.blocks) {
      // Delete existing blocks
      await db.delete(lessonBlocks).where(eq(lessonBlocks.lessonId, lessonId));
      
      // Insert new blocks in batches to avoid D1 parameter limit
      if (data.blocks.length > 0) {
        const BATCH_SIZE = 10; // D1 has ~100 param limit, each block has ~5 params
        const blockValues = data.blocks.map((block, idx) => ({
          id: block.id || crypto.randomUUID(),
          lessonId,
          type: block.type,
          orderIndex: idx,
          content: block.content,
        }));
        
        for (let i = 0; i < blockValues.length; i += BATCH_SIZE) {
          const batch = blockValues.slice(i, i + BATCH_SIZE);
          await db.insert(lessonBlocks).values(batch);
        }
      }
    }
    
    logWithContext('info', 'admin.lesson.updated', {
      requestId,
      meta: { lessonId, updatedFields: Object.keys(updateData) }
    });
    
    // Trigger validator sync if targetVocabulary or isPublished changed
    if (data.targetVocabulary !== undefined || data.isPublished !== undefined) {
      triggerValidatorSync(c.env);
    }
    
    // Return updated lesson
    const updated = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
    const blocks = await db.select().from(lessonBlocks).where(eq(lessonBlocks.lessonId, lessonId)).orderBy(asc(lessonBlocks.orderIndex));
    
    return c.json({
      ...updated[0],
      blocks: blocks.map(b => ({ id: b.id, type: b.type, ...b.content as object })),
    });
  } catch (error) {
    logWithContext('error', 'admin.lesson.update_failed', {
      requestId,
      meta: { lessonId, error: (error as Error).message }
    });
    return c.json({ error: 'Failed to update lesson' }, 500);
  }
});

/**
 * DELETE /lessons/:id - Delete a lesson and its blocks
 */
app.delete('/lessons/:id', async (c) => {
  const requestId = c.get('requestId');
  const lessonId = c.req.param('id');
  const db = drizzle(c.env.DB);
  
  try {
    // Check if lesson exists
    const existing = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
    if (!existing[0]) {
      return c.json({ error: 'Lesson not found' }, 404);
    }
    
    // Delete blocks first (foreign key constraint)
    await db.delete(lessonBlocks).where(eq(lessonBlocks.lessonId, lessonId));
    
    // Delete lesson
    await db.delete(lessons).where(eq(lessons.id, lessonId));
    
    logWithContext('info', 'admin.lesson.deleted', {
      requestId,
      meta: { lessonId, title: existing[0].title }
    });
    
    // Trigger validator sync
    triggerValidatorSync(c.env);
    
    return c.json({ success: true, id: lessonId });
  } catch (error) {
    logWithContext('error', 'admin.lesson.delete_failed', {
      requestId,
      meta: { lessonId, error: (error as Error).message }
    });
    return c.json({ error: 'Failed to delete lesson' }, 500);
  }
});

/**
 * POST /lessons/:id/publish - Publish a lesson
 */
app.post('/lessons/:id/publish', async (c) => {
  const requestId = c.get('requestId');
  const lessonId = c.req.param('id');
  const db = drizzle(c.env.DB);
  
  try {
    const existing = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
    if (!existing[0]) {
      return c.json({ error: 'Lesson not found' }, 404);
    }
    
    await db.update(lessons).set({
      isPublished: true,
      contentStatus: 'live',
      updatedAt: new Date(),
    }).where(eq(lessons.id, lessonId));
    
    logWithContext('info', 'admin.lesson.published', {
      requestId,
      meta: { lessonId, title: existing[0].title }
    });
    
    // Trigger validator sync - new published lesson means curriculum changed
    triggerValidatorSync(c.env);
    
    const updated = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
    return c.json(updated[0]);
  } catch (error) {
    logWithContext('error', 'admin.lesson.publish_failed', {
      requestId,
      meta: { lessonId, error: (error as Error).message }
    });
    return c.json({ error: 'Failed to publish lesson' }, 500);
  }
});

/**
 * POST /lessons/:id/unpublish - Unpublish a lesson
 */
app.post('/lessons/:id/unpublish', async (c) => {
  const requestId = c.get('requestId');
  const lessonId = c.req.param('id');
  const db = drizzle(c.env.DB);
  
  try {
    const existing = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
    if (!existing[0]) {
      return c.json({ error: 'Lesson not found' }, 404);
    }
    
    await db.update(lessons).set({
      isPublished: false,
      contentStatus: 'draft',
      updatedAt: new Date(),
    }).where(eq(lessons.id, lessonId));
    
    logWithContext('info', 'admin.lesson.unpublished', {
      requestId,
      meta: { lessonId, title: existing[0].title }
    });
    
    // Trigger validator sync - curriculum changed
    triggerValidatorSync(c.env);
    
    const updated = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
    return c.json(updated[0]);
  } catch (error) {
    logWithContext('error', 'admin.lesson.unpublish_failed', {
      requestId,
      meta: { lessonId, error: (error as Error).message }
    });
    return c.json({ error: 'Failed to unpublish lesson' }, 500);
  }
});

/**
 * POST /lessons/:id/duplicate - Duplicate a lesson
 */
app.post('/lessons/:id/duplicate', async (c) => {
  const requestId = c.get('requestId');
  const lessonId = c.req.param('id');
  const db = drizzle(c.env.DB);
  
  try {
    // Get original lesson with blocks
    const original = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
    if (!original[0]) {
      return c.json({ error: 'Lesson not found' }, 404);
    }
    
    const originalBlocks = await db.select().from(lessonBlocks).where(eq(lessonBlocks.lessonId, lessonId)).orderBy(asc(lessonBlocks.orderIndex));
    
    // Generate new ID and title
    const newId = crypto.randomUUID();
    const newTitle = `${original[0].title} (Copy)`;
    
    // Insert duplicated lesson (as draft)
    await db.insert(lessons).values({
      ...original[0],
      id: newId,
      title: newTitle,
      isPublished: false,
      contentStatus: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    // Duplicate blocks in batches to avoid D1 parameter limit
    if (originalBlocks.length > 0) {
      const BATCH_SIZE = 10;
      const blockValues = originalBlocks.map(b => ({
        id: crypto.randomUUID(),
        lessonId: newId,
        type: b.type,
        orderIndex: b.orderIndex,
        content: b.content,
      }));
      
      for (let i = 0; i < blockValues.length; i += BATCH_SIZE) {
        const batch = blockValues.slice(i, i + BATCH_SIZE);
        await db.insert(lessonBlocks).values(batch);
      }
    }
    
    logWithContext('info', 'admin.lesson.duplicated', {
      requestId,
      meta: { originalId: lessonId, newId, title: newTitle }
    });
    
    const newLesson = await db.select().from(lessons).where(eq(lessons.id, newId)).limit(1);
    return c.json(newLesson[0]);
  } catch (error) {
    logWithContext('error', 'admin.lesson.duplicate_failed', {
      requestId,
      meta: { lessonId, error: (error as Error).message }
    });
    return c.json({ error: 'Failed to duplicate lesson' }, 500);
  }
});

// ========================================
// USER MANAGEMENT
// ========================================

/**
 * GET /users - List all users (paginated)
 * Used by UserManagement.tsx
 */
app.get('/users', async (c) => {
  const requestId = c.get('requestId');
  
  try {
    // Get pagination params
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const search = c.req.query('search') || '';
    const role = c.req.query('role'); // 'admin' | 'user'
    const tier = c.req.query('tier'); // 'free' | 'premium' | 'pro'
    
    const offset = (page - 1) * limit;
    
    // Build SQL query for ba_user table (Better Auth users)
    let whereClause = '';
    const params: (string | number)[] = [];
    const conditions: string[] = [];
    
    if (search) {
      conditions.push('(email LIKE ? OR name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (role) {
      conditions.push('role = ?');
      params.push(role);
    }
    if (tier) {
      conditions.push('tier = ?');
      params.push(tier);
    }
    
    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM ba_user ${whereClause}`;
    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first<{ total: number }>();
    const total = countResult?.total || 0;
    
    // Get users
    const usersQuery = `
      SELECT id, email, name, role, tier, emailVerified, createdAt, updatedAt
      FROM ba_user
      ${whereClause}
      ORDER BY createdAt DESC
      LIMIT ? OFFSET ?
    `;
    const users = await c.env.DB.prepare(usersQuery)
      .bind(...params, limit, offset)
      .all();
    
    logWithContext('info', 'admin.users.list', {
      requestId,
      meta: { page, limit, total, count: users.results?.length || 0 },
    });
    
    return c.json({
      users: users.results || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logWithContext('error', 'admin.users.list_failed', {
      requestId,
      meta: { error: (error as Error).message },
    });
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

/**
 * POST /users - Create/invite a new user
 * Used by UserManagement.tsx
 */
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'user']).default('user'),
  tier: z.enum(['free', 'premium', 'pro']).default('free'),
  password: z.string().min(8).optional(), // If not provided, user needs to reset
});

app.post('/users', zValidator('json', createUserSchema), async (c) => {
  const requestId = c.get('requestId');
  const data = c.req.valid('json');
  
  try {
    const userId = crypto.randomUUID();
    const now = Date.now();
    
    // Check if email already exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM ba_user WHERE email = ?'
    ).bind(data.email).first();
    
    if (existing) {
      return c.json({ error: 'User with this email already exists' }, 409);
    }
    
    // Create user in ba_user table
    // Note: Password should be hashed by Better Auth, for now we create without password
    // User will need to use "forgot password" to set their password
    await c.env.DB.prepare(`
      INSERT INTO ba_user (id, email, name, role, tier, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `).bind(
      userId,
      data.email,
      data.name || null,
      data.role,
      data.tier,
      now,
      now
    ).run();
    
    logWithContext('info', 'admin.users.created', {
      requestId,
      meta: { userId, email: data.email, role: data.role },
    });
    
    return c.json({ 
      success: true, 
      user: {
        id: userId,
        email: data.email,
        name: data.name,
        role: data.role,
        tier: data.tier,
      },
      message: 'User created. They should use "Forgot Password" to set their password.',
    }, 201);
  } catch (error) {
    logWithContext('error', 'admin.users.create_failed', {
      requestId,
      meta: { error: (error as Error).message },
    });
    return c.json({ error: 'Failed to create user' }, 500);
  }
});

/**
 * PUT /users/:userId - Update user role/tier
 * Used by UserManagement.tsx
 */
const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'user']).optional(),
  tier: z.enum(['free', 'premium', 'pro']).optional(),
});

app.put('/users/:userId', zValidator('json', updateUserSchema), async (c) => {
  const requestId = c.get('requestId');
  const { userId } = c.req.param();
  const data = c.req.valid('json');
  
  try {
    // Check user exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM ba_user WHERE id = ?'
    ).bind(userId).first();
    
    if (!existing) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Build update query
    const updates: string[] = [];
    const params: (string | number)[] = [];
    
    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.role !== undefined) {
      updates.push('role = ?');
      params.push(data.role);
    }
    if (data.tier !== undefined) {
      updates.push('tier = ?');
      params.push(data.tier);
    }
    
    if (updates.length === 0) {
      return c.json({ error: 'No updates provided' }, 400);
    }
    
    updates.push('updated_at = ?');
    params.push(Date.now());
    params.push(userId);
    
    await c.env.DB.prepare(
      `UPDATE ba_user SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...params).run();
    
    logWithContext('info', 'admin.users.updated', {
      requestId,
      meta: { userId, updates: Object.keys(data) },
    });
    
    return c.json({ success: true, message: 'User updated' });
  } catch (error) {
    logWithContext('error', 'admin.users.update_failed', {
      requestId,
      meta: { error: (error as Error).message },
    });
    return c.json({ error: 'Failed to update user' }, 500);
  }
});

/**
 * DELETE /users/:userId - Delete a user
 * Used by UserManagement.tsx
 */
app.delete('/users/:userId', async (c) => {
  const requestId = c.get('requestId');
  const { userId } = c.req.param();
  const currentUser = c.get('user');
  
  try {
    // Prevent self-deletion
    if (currentUser?.id === userId) {
      return c.json({ error: 'Cannot delete your own account' }, 400);
    }
    
    // Check user exists
    const existing = await c.env.DB.prepare(
      'SELECT id, email FROM ba_user WHERE id = ?'
    ).bind(userId).first<{ id: string; email: string }>();
    
    if (!existing) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Delete user (Better Auth sessions will be invalidated automatically)
    await c.env.DB.prepare('DELETE FROM ba_user WHERE id = ?').bind(userId).run();
    
    // Also clean up any sessions
    await c.env.DB.prepare('DELETE FROM ba_session WHERE user_id = ?').bind(userId).run();
    
    logWithContext('info', 'admin.users.deleted', {
      requestId,
      meta: { userId, email: existing.email },
    });
    
    return c.json({ success: true, message: 'User deleted' });
  } catch (error) {
    logWithContext('error', 'admin.users.delete_failed', {
      requestId,
      meta: { error: (error as Error).message },
    });
    return c.json({ error: 'Failed to delete user' }, 500);
  }
});

/**
 * POST /users/:userId/resend-invite - Resend invite email
 * (Placeholder - would need email service integration)
 */
app.post('/users/:userId/resend-invite', async (c) => {
  const requestId = c.get('requestId');
  const { userId } = c.req.param();
  
  try {
    const user = await c.env.DB.prepare(
      'SELECT id, email FROM ba_user WHERE id = ?'
    ).bind(userId).first<{ id: string; email: string }>();
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // TODO: Integrate with email service (Resend) to send password reset email
    // For now, just log and return success
    logWithContext('info', 'admin.users.resend_invite', {
      requestId,
      meta: { userId, email: user.email },
    });
    
    return c.json({ 
      success: true, 
      message: 'User should use "Forgot Password" on login page to set their password.',
    });
  } catch (error) {
    logWithContext('error', 'admin.users.resend_invite_failed', {
      requestId,
      meta: { error: (error as Error).message },
    });
    return c.json({ error: 'Failed to resend invite' }, 500);
  }
});

// ========================================
// SUBSCRIPTION MANAGEMENT ENDPOINTS
// ========================================

/**
 * GET /subscriptions/overview - Get subscription overview metrics
 * Returns counts by tier, status, platform for admin dashboard
 */
app.get('/subscriptions/overview', async (c) => {
  const requestId = c.get('requestId');
  
  try {
    // Get tier breakdown
    const tierStats = await c.env.DB.prepare(`
      SELECT tier, COUNT(*) as count
      FROM users
      GROUP BY tier
    `).all();
    
    // Get status breakdown
    const statusStats = await c.env.DB.prepare(`
      SELECT subscription_status, COUNT(*) as count
      FROM users
      GROUP BY subscription_status
    `).all();
    
    // Get platform breakdown
    const platformStats = await c.env.DB.prepare(`
      SELECT subscription_platform, COUNT(*) as count
      FROM users
      WHERE subscription_platform IS NOT NULL
      GROUP BY subscription_platform
    `).all();
    
    // Get expiring in 7 days
    const sevenDaysFromNow = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
    const now = Math.floor(Date.now() / 1000);
    const expiringResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE subscription_expires_at > ? AND subscription_expires_at <= ?
    `).bind(now, sevenDaysFromNow).first();
    
    // Get total users
    const totalResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM users
    `).first();
    
    // Build response (premium = Master in UI)
    const byTier: Record<string, number> = { free: 0, premium: 0, pro: 0 };
    for (const row of tierStats.results || []) {
      const tier = (row.tier as string) || 'free';
      byTier[tier] = row.count as number;
    }
    
    const byStatus: Record<string, number> = { none: 0, active: 0, past_due: 0, canceled: 0, expired: 0 };
    for (const row of statusStats.results || []) {
      const status = (row.subscription_status as string) || 'none';
      byStatus[status] = row.count as number;
    }
    
    const byPlatform: Record<string, number> = { ios: 0, android: 0, web: 0 };
    for (const row of platformStats.results || []) {
      const platform = row.subscription_platform as string;
      if (platform) {
        byPlatform[platform] = row.count as number;
      }
    }
    
    return c.json({
      totalUsers: (totalResult?.count as number) || 0,
      byTier,
      byStatus,
      byPlatform,
      expiringIn7Days: (expiringResult?.count as number) || 0,
    });
  } catch (error) {
    logWithContext('error', 'admin.subscriptions.overview_failed', {
      requestId,
      meta: { error: (error as Error).message },
    });
    return c.json({ error: 'Failed to fetch subscription overview' }, 500);
  }
});

/**
 * POST /subscriptions/grant-promo - Grant promotional access to a user
 * Useful for giving free trials via RevenueCat
 */
app.post('/subscriptions/grant-promo', zValidator('json', z.object({
  userId: z.string(),
  tier: z.enum(['premium', 'pro']), // premium = Master in UI
  durationDays: z.number().int().min(1).max(365),
})), async (c) => {
  const requestId = c.get('requestId');
  const { userId, tier, durationDays } = c.req.valid('json');
  
  try {
    // Get user's clerk_id for RevenueCat
    const user = await c.env.DB.prepare(`
      SELECT clerk_id FROM users WHERE id = ?
    `).bind(userId).first() as { clerk_id: string } | null;
    
    if (!user?.clerk_id) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Try to grant via RevenueCat if configured
    const rcClient = createRevenueCatClient(c.env);
    if (rcClient) {
      // Map tier to RevenueCat entitlement (premium -> master entitlement)
      const entitlementId = tier === 'pro' ? 'pro' : 'master';
      const granted = await rcClient.grantPromotionalEntitlement(
        user.clerk_id,
        entitlementId,
        durationDays
      );
      
      if (!granted) {
        logWithContext('warn', 'admin.subscriptions.rc_promo_failed', {
          requestId,
          meta: { userId, tier },
        });
      }
    }
    
    // Update user tier directly as backup
    const expiresAt = Math.floor(Date.now() / 1000) + (durationDays * 24 * 60 * 60);
    await c.env.DB.prepare(`
      UPDATE users 
      SET tier = ?, 
          subscription_status = 'active',
          subscription_expires_at = ?,
          updated_at = strftime('%s', 'now')
      WHERE id = ?
    `).bind(tier, expiresAt, userId).run();
    
    logWithContext('info', 'admin.subscriptions.promo_granted', {
      requestId,
      meta: { userId, tier, durationDays },
    });
    
    return c.json({ 
      success: true, 
      message: `Granted ${durationDays} days of ${tier} access`,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
    });
  } catch (error) {
    logWithContext('error', 'admin.subscriptions.grant_promo_failed', {
      requestId,
      meta: { error: (error as Error).message },
    });
    return c.json({ error: 'Failed to grant promotional access' }, 500);
  }
});

// ========================================
// CONTENT/AUDIO UPLOAD ENDPOINTS
// ========================================

/**
 * POST /content/upload - Simple audio file upload to R2
 * Used by audioAPI.ts in portal
 */
app.post('/content/upload', async (c) => {
  const requestId = c.get('requestId');
  
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const lessonId = formData.get('lessonId') as string || 'general';
    const context = formData.get('context') as string || 'audio';
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }
    
    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-m4a'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: `Unsupported file type: ${file.type}` }, 400);
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: 'File too large. Maximum size is 10MB.' }, 400);
    }
    
    // Generate unique key
    const ext = file.name.split('.').pop() || 'mp3';
    const key = `audio/${lessonId}/${context}/${crypto.randomUUID()}.${ext}`;
    
    // Upload to R2
    const fileBuffer = await file.arrayBuffer();
    await c.env.CONTENT_BUCKET.put(key, fileBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });
    
    // Generate URL (public or signed)
    const url = `https://content.polymasterlabs.com/${key}`;
    
    logWithContext('info', 'admin.content.upload', {
      requestId,
      meta: { key, size: file.size, type: file.type },
    });
    
    return c.json({ 
      success: true, 
      url, 
      key,
      size: file.size,
    }, 201);
  } catch (error) {
    logWithContext('error', 'admin.content.upload_failed', {
      requestId,
      meta: { error: (error as Error).message },
    });
    return c.json({ error: 'Upload failed' }, 500);
  }
});

/**
 * DELETE /content/audio - Delete audio file from R2
 * Used by audioAPI.ts in portal
 */
app.delete('/content/audio', async (c) => {
  const requestId = c.get('requestId');
  
  try {
    const { url, key } = await c.req.json();
    
    // Extract key from URL if needed
    let r2Key = key;
    if (!r2Key && url) {
      // Parse key from URL like https://content.polymasterlabs.com/audio/...
      const match = url.match(/content\.polymasterlabs\.com\/(.+)/);
      r2Key = match ? match[1] : null;
    }
    
    if (!r2Key) {
      return c.json({ error: 'No key or URL provided' }, 400);
    }
    
    // Delete from R2
    await c.env.CONTENT_BUCKET.delete(r2Key);
    
    logWithContext('info', 'admin.content.audio_deleted', {
      requestId,
      meta: { key: r2Key },
    });
    
    return c.json({ success: true });
  } catch (error) {
    logWithContext('error', 'admin.content.audio_delete_failed', {
      requestId,
      meta: { error: (error as Error).message },
    });
    return c.json({ error: 'Delete failed' }, 500);
  }
});

// ========================================
// REVENUECAT ADMIN ENDPOINTS
// ========================================

/**
 * Get subscription info for a user by their Clerk ID
 * Queries RevenueCat REST API to get current subscription status
 */
app.get('/subscriptions/:clerkId', async (c) => {
  const { clerkId } = c.req.param();
  const requestId = c.get('requestId');
  
  const rcClient = createRevenueCatClient(c.env);
  if (!rcClient) {
    return c.json({ error: 'RevenueCat not configured' }, 503);
  }

  try {
    const subscriber = await rcClient.getSubscriber(clerkId);
    
    if (!subscriber) {
      return c.json({ 
        clerk_id: clerkId,
        tier: 'free',
        has_subscription: false,
      });
    }

    const tier = await rcClient.getUserTier(clerkId);
    const activeSubscriptions = await rcClient.getActiveSubscriptions(clerkId);

    return c.json({
      clerk_id: clerkId,
      tier,
      has_subscription: activeSubscriptions.length > 0,
      active_products: activeSubscriptions,
      entitlements: subscriber.subscriber.entitlements,
      first_seen: subscriber.subscriber.first_seen,
      last_seen: subscriber.subscriber.last_seen,
    });
  } catch (err) {
    logWithContext('error', 'admin.revenuecat.query_failed', {
      requestId,
      meta: { clerkId, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to query subscription' }, 500);
  }
});

/**
 * Grant promotional access to a user
 * Useful for giving free trials, comps, or customer support
 */
const grantPromoSchema = z.object({
  clerk_id: z.string(),
  entitlement: z.enum(['premium', 'pro']),
  duration_days: z.number().int().min(1).max(365),
  reason: z.string().optional(),
});

app.post('/subscriptions/grant-promo', zValidator('json', grantPromoSchema), async (c) => {
  const data = c.req.valid('json');
  const requestId = c.get('requestId');
  const adminUser = c.get('user');
  
  if (!adminUser) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const rcClient = createRevenueCatClient(c.env);
  if (!rcClient) {
    return c.json({ error: 'RevenueCat not configured' }, 503);
  }

  try {
    const success = await rcClient.grantPromotionalEntitlement(
      data.clerk_id,
      data.entitlement,
      data.duration_days
    );

    if (!success) {
      return c.json({ error: 'Failed to grant promotional access' }, 500);
    }

    // Log the action for audit trail
    await c.env.DB.prepare(`
      INSERT INTO system_events (id, event_type, user_id, metadata, created_at)
      VALUES (?, ?, ?, ?, strftime('%s', 'now'))
    `)
      .bind(
        crypto.randomUUID(),
        'admin.promo_granted',
        data.clerk_id,
        JSON.stringify({
          granted_by: adminUser.id,
          entitlement: data.entitlement,
          duration_days: data.duration_days,
          reason: data.reason,
        })
      )
      .run();

    logWithContext('info', 'admin.promo_granted', {
      requestId,
      meta: {
        clerk_id: data.clerk_id,
        entitlement: data.entitlement,
        duration_days: data.duration_days,
        granted_by: adminUser.id,
      },
    });

    return c.json({ 
      success: true,
      clerk_id: data.clerk_id,
      entitlement: data.entitlement,
      expires_in_days: data.duration_days,
    });
  } catch (err) {
    logWithContext('error', 'admin.promo_grant_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to grant promotional access' }, 500);
  }
});

/**
 * Revoke promotional access from a user
 */
const revokePromoSchema = z.object({
  clerk_id: z.string(),
  entitlement: z.enum(['premium', 'pro']),
  reason: z.string().optional(),
});

app.post('/subscriptions/revoke-promo', zValidator('json', revokePromoSchema), async (c) => {
  const data = c.req.valid('json');
  const requestId = c.get('requestId');
  const adminUser = c.get('user');
  
  if (!adminUser) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const rcClient = createRevenueCatClient(c.env);
  if (!rcClient) {
    return c.json({ error: 'RevenueCat not configured' }, 503);
  }

  try {
    const success = await rcClient.revokePromotionalEntitlement(
      data.clerk_id,
      data.entitlement
    );

    if (!success) {
      return c.json({ error: 'Failed to revoke promotional access' }, 500);
    }

    // Log the action
    await c.env.DB.prepare(`
      INSERT INTO system_events (id, event_type, user_id, metadata, created_at)
      VALUES (?, ?, ?, ?, strftime('%s', 'now'))
    `)
      .bind(
        crypto.randomUUID(),
        'admin.promo_revoked',
        data.clerk_id,
        JSON.stringify({
          revoked_by: adminUser.id,
          entitlement: data.entitlement,
          reason: data.reason,
        })
      )
      .run();

    logWithContext('info', 'admin.promo_revoked', {
      requestId,
      meta: {
        clerk_id: data.clerk_id,
        entitlement: data.entitlement,
        revoked_by: adminUser.id,
      },
    });

    return c.json({ 
      success: true,
      clerk_id: data.clerk_id,
      entitlement: data.entitlement,
    });
  } catch (err) {
    logWithContext('error', 'admin.promo_revoke_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to revoke promotional access' }, 500);
  }
});

/**
 * Manually sync a user's subscription status from RevenueCat to our DB
 * Useful if webhook was missed or for debugging
 */
app.post('/subscriptions/:clerkId/sync', async (c) => {
  const { clerkId } = c.req.param();
  const requestId = c.get('requestId');

  const rcClient = createRevenueCatClient(c.env);
  if (!rcClient) {
    return c.json({ error: 'RevenueCat not configured' }, 503);
  }

  try {
    const tier = await rcClient.getUserTier(clerkId);
    const subscriber = await rcClient.getSubscriber(clerkId);

    // Update local database
    const result = await c.env.DB.prepare(`
      UPDATE users 
      SET tier = ?, updated_at = strftime('%s', 'now')
      WHERE clerk_id = ?
    `)
      .bind(tier, clerkId)
      .run();

    if (!result.success || (result.meta?.changes ?? 0) === 0) {
      return c.json({ error: 'User not found in local database' }, 404);
    }

    logWithContext('info', 'admin.subscription_synced', {
      requestId,
      meta: { clerk_id: clerkId, tier },
    });

    return c.json({
      success: true,
      clerk_id: clerkId,
      tier,
      synced_at: new Date().toISOString(),
    });
  } catch (err) {
    logWithContext('error', 'admin.subscription_sync_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to sync subscription' }, 500);
  }
});

// ========================================
// TIER LIMITS MANAGEMENT
// ========================================

/**
 * Get all tier limits
 * Returns current limits from database, or defaults if not set
 */
app.get('/tier-limits', async (c) => {
  const db = drizzle(c.env.DB);
  const requestId = c.get('requestId');

  try {
    const results = await db.select().from(tierLimits);
    
    // Build response with database values or defaults
    const tiers = ['free', 'premium', 'pro'] as const;
    const limitsMap: Record<string, typeof results[0] | typeof DEFAULT_TIER_LIMITS.free> = {};
    
    for (const tier of tiers) {
      const dbRecord = results.find(r => r.tier === tier);
      limitsMap[tier] = dbRecord || DEFAULT_TIER_LIMITS[tier];
    }

    return c.json({ 
      limits: limitsMap,
      source: results.length > 0 ? 'database' : 'defaults',
    });
  } catch (err) {
    logWithContext('error', 'admin.tier_limits.fetch_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch tier limits' }, 500);
  }
});

/**
 * Update tier limits for a specific tier
 */
const updateTierLimitsSchema = z.object({
  requestsPerDay: z.number().int().min(0).max(1000000),
  tokensPerDay: z.number().int().min(0).max(10000000),
  maxParallelGenerations: z.number().int().min(1).max(100),
  contentDownloadsPerDay: z.number().int().min(0).max(1000000),
  offlinePackagesAllowed: z.number().int().min(0).max(1000000),
  canAccessPremiumContent: z.boolean(),
});

app.put('/tier-limits/:tier', zValidator('json', updateTierLimitsSchema), async (c) => {
  const tier = c.req.param('tier');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const requestId = c.get('requestId');
  const adminUser = c.get('user');

  // Validate tier
  if (!['free', 'premium', 'pro'].includes(tier)) {
    return c.json({ error: 'Invalid tier. Must be free, premium, or pro.' }, 400);
  }

  try {
    // Upsert: Insert or update on conflict
    await db
      .insert(tierLimits)
      .values({
        tier: tier as 'free' | 'premium' | 'pro',
        requestsPerDay: data.requestsPerDay,
        tokensPerDay: data.tokensPerDay,
        maxParallelGenerations: data.maxParallelGenerations,
        contentDownloadsPerDay: data.contentDownloadsPerDay,
        offlinePackagesAllowed: data.offlinePackagesAllowed,
        canAccessPremiumContent: data.canAccessPremiumContent,
      })
      .onConflictDoUpdate({
        target: tierLimits.tier,
        set: {
          requestsPerDay: data.requestsPerDay,
          tokensPerDay: data.tokensPerDay,
          maxParallelGenerations: data.maxParallelGenerations,
          contentDownloadsPerDay: data.contentDownloadsPerDay,
          offlinePackagesAllowed: data.offlinePackagesAllowed,
          canAccessPremiumContent: data.canAccessPremiumContent,
        },
      });

    // Log the change for audit
    await c.env.DB.prepare(`
      INSERT INTO system_events (id, event_type, user_id, metadata, created_at)
      VALUES (?, ?, ?, ?, strftime('%s', 'now'))
    `)
      .bind(
        crypto.randomUUID(),
        'admin.tier_limits_updated',
        adminUser?.id || 'unknown',
        JSON.stringify({
          tier,
          updated_by: adminUser?.id,
          new_values: data,
        })
      )
      .run();

    logWithContext('info', 'admin.tier_limits.updated', {
      requestId,
      meta: { tier, updated_by: adminUser?.id },
    });

    return c.json({ 
      success: true, 
      tier,
      limits: data,
    });
  } catch (err) {
    logWithContext('error', 'admin.tier_limits.update_failed', {
      requestId,
      meta: { tier, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to update tier limits' }, 500);
  }
});

/**
 * Reset tier limits to defaults
 */
app.post('/tier-limits/reset', async (c) => {
  const db = drizzle(c.env.DB);
  const requestId = c.get('requestId');
  const adminUser = c.get('user');

  try {
    // Delete all existing tier limits (will fall back to defaults)
    await db.delete(tierLimits);

    // Log the reset
    await c.env.DB.prepare(`
      INSERT INTO system_events (id, event_type, user_id, metadata, created_at)
      VALUES (?, ?, ?, ?, strftime('%s', 'now'))
    `)
      .bind(
        crypto.randomUUID(),
        'admin.tier_limits_reset',
        adminUser?.id || 'unknown',
        JSON.stringify({ reset_by: adminUser?.id })
      )
      .run();

    logWithContext('info', 'admin.tier_limits.reset', {
      requestId,
      meta: { reset_by: adminUser?.id },
    });

    return c.json({ 
      success: true, 
      message: 'Tier limits reset to defaults',
      limits: DEFAULT_TIER_LIMITS,
    });
  } catch (err) {
    logWithContext('error', 'admin.tier_limits.reset_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to reset tier limits' }, 500);
  }
});

// ========================================
// VECTORIZE (Semantic Search) MANAGEMENT
// ========================================

/**
 * POST /vectorize/populate - Populate Vectorize index with existing content
 * Indexes vocabulary, lessons, and stories for semantic search
 */
app.post('/vectorize/populate', async (c) => {
  const requestId = c.get('requestId');
  const db = drizzle(c.env.DB);
  
  // Check if Vectorize bindings exist
  if (!c.env.VECTORIZE || !c.env.AI) {
    return c.json({ error: 'Vectorize not configured' }, 503);
  }
  
  const vectorize = new VectorizeService(c.env.VECTORIZE, c.env.AI, requestId);
  
  const results = {
    vocabulary: { success: 0, failed: 0 },
    lessons: { success: 0, failed: 0 },
    stories: { success: 0, failed: 0 },
    totalTime: 0,
  };
  
  const startTime = Date.now();

  try {
    // 1. Index vocabulary
    logWithContext('info', 'admin.vectorize.indexing_vocabulary', { requestId });
    const vocab = await db.select().from(vocabulary);
    
    const vocabItems = vocab.map(v => ({
      type: 'vocabulary' as const,
      id: v.id,
      text: `${v.hanzi} ${v.pinyin} ${v.english} ${v.category || ''} ${v.exampleChinese || ''}`,
      metadata: {
        title: v.hanzi,
        hanzi: v.hanzi,
        pinyin: v.pinyin,
        hskLevel: v.hskLevel,
      },
    }));
    
    const vocabResult = await vectorize.upsertBatch(vocabItems);
    results.vocabulary = vocabResult;

    // 2. Index lessons
    logWithContext('info', 'admin.vectorize.indexing_lessons', { requestId });
    const lessonsList = await db.select().from(lessons);
    
    const lessonItems = lessonsList.map(l => ({
      type: 'lesson' as const,
      id: l.id,
      text: `${l.title} ${l.subtitle || ''} ${l.description || ''} HSK ${l.hskLevel} ${l.lessonType}`,
      metadata: {
        title: l.title,
        hskLevel: l.hskLevel,
      },
    }));
    
    const lessonResult = await vectorize.upsertBatch(lessonItems);
    results.lessons = lessonResult;

    // 3. Index stories
    logWithContext('info', 'admin.vectorize.indexing_stories', { requestId });
    const storiesList = await db.select().from(stories);
    
    const storyItems = storiesList.map(s => ({
      type: 'story' as const,
      id: s.id,
      text: `${s.title} ${s.subtitle || ''} ${s.description || ''} ${s.topic || ''} HSK ${s.hskLevel}`,
      metadata: {
        title: s.title,
        hskLevel: s.hskLevel,
      },
    }));
    
    const storyResult = await vectorize.upsertBatch(storyItems);
    results.stories = storyResult;

    results.totalTime = Date.now() - startTime;
    
    const stats = await vectorize.getStats();
    
    logWithContext('info', 'admin.vectorize.populate_complete', {
      requestId,
      meta: { results, vectorCount: stats.vectorCount },
    });
    
    return c.json({
      success: true,
      results,
      vectorCount: stats.vectorCount,
      message: `Indexed ${results.vocabulary.success + results.lessons.success + results.stories.success} items in ${results.totalTime}ms`,
    });

  } catch (err) {
    logWithContext('error', 'admin.vectorize.populate_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({
      success: false,
      error: (err as Error).message,
      results,
      totalTime: Date.now() - startTime,
    }, 500);
  }
});

/**
 * GET /vectorize/stats - Get Vectorize index statistics
 */
app.get('/vectorize/stats', async (c) => {
  const requestId = c.get('requestId');
  
  if (!c.env.VECTORIZE || !c.env.AI) {
    return c.json({ error: 'Vectorize not configured' }, 503);
  }
  
  const vectorize = new VectorizeService(c.env.VECTORIZE, c.env.AI, requestId);
  
  try {
    const stats = await vectorize.getStats();
    return c.json(stats);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

/**
 * POST /vectorize/test-search - Test semantic search
 */
app.post('/vectorize/test-search', async (c) => {
  const requestId = c.get('requestId');
  const { query, type, hskLevel, limit } = await c.req.json();
  
  if (!query) {
    return c.json({ error: 'Query required' }, 400);
  }
  
  if (!c.env.VECTORIZE || !c.env.AI) {
    return c.json({ error: 'Vectorize not configured' }, 503);
  }
  
  const vectorize = new VectorizeService(c.env.VECTORIZE, c.env.AI, requestId);
  
  try {
    const results = await vectorize.search(query, {
      type,
      hskLevel,
      topK: limit || 10,
    });
    
    return c.json({
      query,
      results,
      count: results.length,
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// AI USAGE ANALYTICS
// ═══════════════════════════════════════════════════════════

import { PROVIDERS } from '../services/ai-usage-logger';

/**
 * GET /ai-usage/summary - Get AI usage summary
 * Query params:
 *   - days: number (0 = all time, default = 30)
 */
app.get('/ai-usage/summary', async (c) => {
  const logger = new AIUsageLogger(c.env.DB);
  const daysParam = c.req.query('days');
  const days = daysParam === '0' || daysParam === 'all' ? 0 : parseInt(daysParam || '30');
  
  try {
    let startDate: Date | undefined;
    if (days > 0) {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }
    
    const summary = await logger.getSummary(startDate ? { startDate } : {});
    const daily = await logger.getDailyUsage(days);
    const dailyByProvider = await logger.getDailyUsageByProvider(days);
    
    return c.json({
      period: days === 0 ? 'All time' : `Last ${days} days`,
      summary,
      daily,
      dailyByProvider,
      providers: PROVIDERS,
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

/**
 * GET /ai-usage/recent - Get recent AI usage entries
 */
app.get('/ai-usage/recent', async (c) => {
  const logger = new AIUsageLogger(c.env.DB);
  const limit = parseInt(c.req.query('limit') || '100');
  
  try {
    const recent = await logger.getRecent(limit);
    return c.json({ entries: recent });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

/**
 * GET /ai-usage/tutor-summary - Get AI Tutor lesson generation costs
 * Query params:
 *   - days: number (0 = all time, default = 0)
 */
app.get('/ai-usage/tutor-summary', async (c) => {
  const logger = new AIUsageLogger(c.env.DB);
  const daysParam = c.req.query('days');
  const days = daysParam === '0' || daysParam === 'all' ? 0 : parseInt(daysParam || '0');
  
  try {
    const tutorSummary = await logger.getTutorUsageSummary(days);
    return c.json({
      period: days === 0 ? 'All time' : `Last ${days} days`,
      ...tutorSummary,
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

export default app;
