import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { units, lessons } from '../schema';
import { eq, and, asc, desc } from 'drizzle-orm';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { jwtAuthMiddleware } from '../middleware/jwt-auth';
import type { AppEnv } from '../types/app';
import { logWithContext } from '../utils/logger';
import { adminRateLimit } from '../middleware/rate-limit';

const app = new Hono<AppEnv>();

// Apply rate limiting
app.use('/*', adminRateLimit);

// Protect all routes - admin only
app.use('/*', jwtAuthMiddleware({ allowRoles: ['admin'] }));

// ==================== VALIDATION SCHEMAS ====================

const createUnitSchema = z.object({
  hskLevel: z.number().int().min(1).max(9),
  unitNumber: z.number().int().min(1).optional(), // Auto-increment if not provided
  title: z.string().min(3).max(100),
  description: z.string().optional(),
  gradientStart: z.string().optional(),
  gradientEnd: z.string().optional(),
  accentColor: z.string().optional(),
  orderIndex: z.number().int().min(0).optional(),
});

const updateUnitSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().optional(),
  gradientStart: z.string().optional(),
  gradientEnd: z.string().optional(),
  accentColor: z.string().optional(),
  orderIndex: z.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
});

const reorderLessonsSchema = z.object({
  lessonIds: z.array(z.string()), // Ordered array of lesson IDs
});

// ==================== ROUTES ====================

/**
 * GET /units?hsk_level=1
 * List all units for a specific HSK level
 */
app.get('/', async (c) => {
  const hskLevel = c.req.query('hsk_level');
  const db = drizzle(c.env.DB);

  try {
    const whereClause = hskLevel ? eq(units.hskLevel, Number(hskLevel)) : undefined;
    
    const allUnits = await db
      .select()
      .from(units)
      .where(whereClause)
      .orderBy(asc(units.hskLevel), asc(units.unitNumber));
    
    return c.json({ success: true, units: allUnits });
  } catch (error) {
    logWithContext('error', 'units.list_failed', {
      requestId: c.get('requestId'),
      meta: { message: (error as Error).message },
    });
    return c.json({ error: 'Failed to fetch units' }, 500);
  }
});

/**
 * GET /units/:id
 * Get a single unit by ID
 */
app.get('/:id', async (c) => {
  const { id } = c.req.param();
  const db = drizzle(c.env.DB);

  try {
    const unitResult = await db.select().from(units).where(eq(units.id, id)).limit(1);
    const unit = unitResult[0];

    if (!unit) {
      return c.json({ error: 'Unit not found' }, 404);
    }

    return c.json({ success: true, unit });
  } catch (error) {
    logWithContext('error', 'units.get_failed', {
      requestId: c.get('requestId'),
      meta: { unitId: id, message: (error as Error).message },
    });
    return c.json({ error: 'Failed to fetch unit' }, 500);
  }
});

/**
 * GET /units/:id/lessons
 * Get all lessons in a unit
 */
app.get('/:id/lessons', async (c) => {
  const { id } = c.req.param();
  const db = drizzle(c.env.DB);

  try {
    const unitLessons = await db
      .select()
      .from(lessons)
      .where(eq(lessons.unitId, id))
      .orderBy(asc(lessons.orderInUnit));

    return c.json({ success: true, lessons: unitLessons });
  } catch (error) {
    logWithContext('error', 'units.get_lessons_failed', {
      requestId: c.get('requestId'),
      meta: { unitId: id, message: (error as Error).message },
    });
    return c.json({ error: 'Failed to fetch unit lessons' }, 500);
  }
});

/**
 * POST /units
 * Create a new unit
 */
app.post('/', zValidator('json', createUnitSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const unitId = crypto.randomUUID();

  try {
    // Auto-increment unit number if not provided
    let unitNumber = data.unitNumber;
    if (!unitNumber) {
      const maxNumberResult = await db
        .select({ maxNumber: units.unitNumber })
        .from(units)
        .where(eq(units.hskLevel, data.hskLevel))
        .orderBy(desc(units.unitNumber))
        .limit(1);
      
      unitNumber = maxNumberResult[0]?.maxNumber ? maxNumberResult[0].maxNumber + 1 : 1;
    }

    await db.insert(units).values({
      id: unitId,
      hskLevel: data.hskLevel,
      unitNumber,
      title: data.title,
      description: data.description || null,
      gradientStart: data.gradientStart || '#EEF2FF',
      gradientEnd: data.gradientEnd || '#C7D2FE',
      accentColor: data.accentColor || '#4F46E5',
      orderIndex: data.orderIndex || unitNumber,
      isPublished: false,
    });

    return c.json({ success: true, id: unitId, unitNumber }, 201);
  } catch (error) {
    logWithContext('error', 'units.create_failed', {
      requestId: c.get('requestId'),
      meta: { message: (error as Error).message },
    });
    return c.json({ error: 'Failed to create unit', message: (error as Error).message }, 500);
  }
});

/**
 * PUT /units/:id
 * Update a unit
 */
app.put('/:id', zValidator('json', updateUnitSchema), async (c) => {
  const { id } = c.req.param();
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);

  try {
    // Build update object with proper typing
    const updateData: Partial<typeof units.$inferInsert> = {
      updatedAt: new Date(),
    };
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.gradientStart !== undefined) updateData.gradientStart = data.gradientStart;
    if (data.gradientEnd !== undefined) updateData.gradientEnd = data.gradientEnd;
    if (data.accentColor !== undefined) updateData.accentColor = data.accentColor;
    if (data.orderIndex !== undefined) updateData.orderIndex = data.orderIndex;
    if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;

    await db.update(units).set(updateData).where(eq(units.id, id));

    return c.json({ success: true });
  } catch (error) {
    logWithContext('error', 'units.update_failed', {
      requestId: c.get('requestId'),
      meta: { unitId: id, message: (error as Error).message },
    });
    return c.json({ error: 'Failed to update unit' }, 500);
  }
});

/**
 * DELETE /units/:id
 * Delete a unit (lessons will have unit_id set to null)
 */
app.delete('/:id', async (c) => {
  const { id } = c.req.param();
  const db = drizzle(c.env.DB);

  try {
    await db.delete(units).where(eq(units.id, id));
    return c.json({ success: true });
  } catch (error) {
    logWithContext('error', 'units.delete_failed', {
      requestId: c.get('requestId'),
      meta: { unitId: id, message: (error as Error).message },
    });
    return c.json({ error: 'Failed to delete unit' }, 500);
  }
});

/**
 * POST /units/:id/lessons/:lessonId
 * Add a lesson to a unit (or update its position)
 */
app.post('/:id/lessons/:lessonId', async (c) => {
  const { id, lessonId } = c.req.param();
  const db = drizzle(c.env.DB);

  try {
    // Get the current lesson count in the unit to determine order
    const lessonCount = await db
      .select({ count: lessons.id })
      .from(lessons)
      .where(eq(lessons.unitId, id));
    
    const nextOrder = lessonCount.length + 1;

    await db.update(lessons).set({
      unitId: id,
      orderInUnit: nextOrder,
      updatedAt: new Date(),
    }).where(eq(lessons.id, lessonId));

    return c.json({ success: true, orderInUnit: nextOrder });
  } catch (error) {
    logWithContext('error', 'units.add_lesson_failed', {
      requestId: c.get('requestId'),
      meta: { unitId: id, lessonId, message: (error as Error).message },
    });
    return c.json({ error: 'Failed to add lesson to unit' }, 500);
  }
});

/**
 * DELETE /units/:id/lessons/:lessonId
 * Remove a lesson from a unit
 */
app.delete('/:id/lessons/:lessonId', async (c) => {
  const { lessonId } = c.req.param();
  const db = drizzle(c.env.DB);

  try {
    await db.update(lessons).set({
      unitId: null,
      orderInUnit: null,
      updatedAt: new Date(),
    }).where(eq(lessons.id, lessonId));

    return c.json({ success: true });
  } catch (error) {
    logWithContext('error', 'units.remove_lesson_failed', {
      requestId: c.get('requestId'),
      meta: { lessonId, message: (error as Error).message },
    });
    return c.json({ error: 'Failed to remove lesson from unit' }, 500);
  }
});

/**
 * PUT /units/:id/lessons/reorder
 * Reorder lessons within a unit
 */
app.put('/:id/lessons/reorder', zValidator('json', reorderLessonsSchema), async (c) => {
  const { id } = c.req.param();
  const { lessonIds } = c.req.valid('json');
  const db = drizzle(c.env.DB);

  try {
    // Update order_in_unit for each lesson
    const updates = lessonIds.map((lessonId, index) => 
      db.update(lessons).set({
        orderInUnit: index + 1,
        updatedAt: new Date(),
      }).where(and(eq(lessons.id, lessonId), eq(lessons.unitId, id)))
    );

    await Promise.all(updates);

    return c.json({ success: true });
  } catch (error) {
    logWithContext('error', 'units.reorder_lessons_failed', {
      requestId: c.get('requestId'),
      meta: { unitId: id, message: (error as Error).message },
    });
    return c.json({ error: 'Failed to reorder lessons' }, 500);
  }
});

export default app;

