/**
 * Story Series Routes
 * CRUD operations for managing story series (multi-part collections)
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, asc, desc } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { nanoid } from 'nanoid';
import type { AppEnv } from '../types/app';
import { storySeries, stories } from '../schema';
import { apiRateLimit } from '../middleware/rate-limit';

const app = new Hono<AppEnv>();

// Apply rate limiting
app.use('/*', apiRateLimit);

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createSeriesSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#4F46E5'),
  icon: z.string().optional().default('book-open'),
  hskLevel: z.number().int().min(1).max(9).optional(),
  isPublished: z.boolean().optional().default(false),
});

const updateSeriesSchema = createSeriesSchema.partial();

const reorderStoriesSchema = z.object({
  storyIds: z.array(z.string()),
});

// ============================================
// ROUTES
// ============================================

/**
 * GET /story-series - List all series
 */
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  
  const allSeries = await db
    .select()
    .from(storySeries)
    .orderBy(asc(storySeries.orderIndex), desc(storySeries.createdAt))
    .all();

  // Get story counts for each series
  const seriesWithCounts = await Promise.all(
    allSeries.map(async (series) => {
      const storyCount = await db
        .select()
        .from(stories)
        .where(eq(stories.seriesId, series.id))
        .all();
      
      return {
        ...series,
        storyCount: storyCount.length,
      };
    })
  );

  return c.json({ series: seriesWithCounts });
});

/**
 * GET /story-series/:id - Get series with its stories
 */
app.get('/:id', async (c) => {
  const seriesId = c.req.param('id');
  const db = drizzle(c.env.DB);
  
  const series = await db
    .select()
    .from(storySeries)
    .where(eq(storySeries.id, seriesId))
    .get();

  if (!series) {
    return c.json({ error: 'Series not found' }, 404);
  }

  const seriesStories = await db
    .select({
      id: stories.id,
      title: stories.title,
      subtitle: stories.subtitle,
      hskLevel: stories.hskLevel,
      difficulty: stories.difficulty,
      estimatedMinutes: stories.estimatedMinutes,
      isPublished: stories.isPublished,
      seriesOrder: stories.seriesOrder,
      coverImageR2Key: stories.coverImageR2Key,
    })
    .from(stories)
    .where(eq(stories.seriesId, seriesId))
    .orderBy(asc(stories.seriesOrder))
    .all();

  return c.json({
    ...series,
    stories: seriesStories,
    storyCount: seriesStories.length,
  });
});

/**
 * POST /story-series - Create new series
 */
app.post('/', zValidator('json', createSeriesSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  
  // Get max order index
  const maxOrder = await db
    .select({ maxOrder: storySeries.orderIndex })
    .from(storySeries)
    .orderBy(desc(storySeries.orderIndex))
    .limit(1)
    .get();

  const newSeries = {
    id: nanoid(),
    title: data.title,
    description: data.description || null,
    color: data.color,
    icon: data.icon,
    hskLevel: data.hskLevel || null,
    orderIndex: (maxOrder?.maxOrder || 0) + 1,
    isPublished: data.isPublished,
  };

  await db.insert(storySeries).values(newSeries);

  return c.json({ success: true, series: newSeries }, 201);
});

/**
 * PUT /story-series/:id - Update series
 */
app.put('/:id', zValidator('json', updateSeriesSchema), async (c) => {
  const seriesId = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  
  const existing = await db
    .select()
    .from(storySeries)
    .where(eq(storySeries.id, seriesId))
    .get();

  if (!existing) {
    return c.json({ error: 'Series not found' }, 404);
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.color !== undefined) updates.color = data.color;
  if (data.icon !== undefined) updates.icon = data.icon;
  if (data.hskLevel !== undefined) updates.hskLevel = data.hskLevel;
  if (data.isPublished !== undefined) updates.isPublished = data.isPublished;

  await db
    .update(storySeries)
    .set(updates)
    .where(eq(storySeries.id, seriesId));

  return c.json({ success: true });
});

/**
 * DELETE /story-series/:id - Delete series
 * Stories are unlinked (seriesId set to null), not deleted
 */
app.delete('/:id', async (c) => {
  const seriesId = c.req.param('id');
  const db = drizzle(c.env.DB);
  
  // Unlink all stories first
  await db
    .update(stories)
    .set({ seriesId: null, seriesOrder: 0 })
    .where(eq(stories.seriesId, seriesId));

  // Delete the series
  await db
    .delete(storySeries)
    .where(eq(storySeries.id, seriesId));

  return c.json({ success: true });
});

/**
 * PUT /story-series/:id/stories - Reorder stories in series
 */
app.put('/:id/stories', zValidator('json', reorderStoriesSchema), async (c) => {
  const seriesId = c.req.param('id');
  const { storyIds } = c.req.valid('json');
  const db = drizzle(c.env.DB);
  
  // Verify series exists
  const series = await db
    .select()
    .from(storySeries)
    .where(eq(storySeries.id, seriesId))
    .get();

  if (!series) {
    return c.json({ error: 'Series not found' }, 404);
  }

  // Update each story's order
  await Promise.all(
    storyIds.map((storyId, index) =>
      db
        .update(stories)
        .set({ seriesId, seriesOrder: index })
        .where(eq(stories.id, storyId))
    )
  );

  return c.json({ success: true });
});

/**
 * PUT /story-series/reorder - Reorder series themselves
 */
app.put('/reorder', zValidator('json', z.object({ seriesIds: z.array(z.string()) })), async (c) => {
  const { seriesIds } = c.req.valid('json');
  const db = drizzle(c.env.DB);
  
  await Promise.all(
    seriesIds.map((id, index) =>
      db
        .update(storySeries)
        .set({ orderIndex: index })
        .where(eq(storySeries.id, id))
    )
  );

  return c.json({ success: true });
});

/**
 * POST /story-series/:id/add-story/:storyId - Add story to series
 */
app.post('/:id/add-story/:storyId', async (c) => {
  const seriesId = c.req.param('id');
  const storyId = c.req.param('storyId');
  const db = drizzle(c.env.DB);
  
  // Get current max order in series
  const maxOrder = await db
    .select({ max: stories.seriesOrder })
    .from(stories)
    .where(eq(stories.seriesId, seriesId))
    .orderBy(desc(stories.seriesOrder))
    .limit(1)
    .get();

  await db
    .update(stories)
    .set({ 
      seriesId, 
      seriesOrder: (maxOrder?.max || 0) + 1 
    })
    .where(eq(stories.id, storyId));

  return c.json({ success: true });
});

/**
 * POST /story-series/:id/remove-story/:storyId - Remove story from series
 */
app.post('/:id/remove-story/:storyId', async (c) => {
  const storyId = c.req.param('storyId');
  const db = drizzle(c.env.DB);
  
  await db
    .update(stories)
    .set({ seriesId: null, seriesOrder: 0 })
    .where(eq(stories.id, storyId));

  return c.json({ success: true });
});

/**
 * POST /story-series/:id/cover - Upload series cover image
 */
app.post('/:id/cover', async (c) => {
  const seriesId = c.req.param('id');
  const db = drizzle(c.env.DB);
  
  try {
    const formData = await c.req.formData();
    const cover = formData.get('cover') as File | null;
    
    if (!cover) {
      return c.json({ error: 'No cover image provided' }, 400);
    }

    if (cover.size > 5 * 1024 * 1024) {
      return c.json({ error: 'Cover image too large (max 5MB)' }, 400);
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(cover.type)) {
      return c.json({ error: 'Invalid image type (use PNG, JPEG, or WebP)' }, 400);
    }

    // Upload to R2
    const ext = cover.name.split('.').pop() || 'jpg';
    const r2Key = `images/series/${seriesId}.${ext}`;
    
    await c.env.CONTENT_BUCKET.put(r2Key, await cover.arrayBuffer(), {
      httpMetadata: { contentType: cover.type },
    });

    // Update series
    await db
      .update(storySeries)
      .set({ coverImageR2Key: r2Key, updatedAt: new Date() })
      .where(eq(storySeries.id, seriesId));

    return c.json({ success: true, r2Key });
  } catch (err) {
    return c.json({ error: 'Failed to upload cover' }, 500);
  }
});

/**
 * DELETE /story-series/:id/cover - Remove series cover image
 */
app.delete('/:id/cover', async (c) => {
  const seriesId = c.req.param('id');
  const db = drizzle(c.env.DB);
  
  try {
    // Get current cover
    const series = await db
      .select({ coverImageR2Key: storySeries.coverImageR2Key })
      .from(storySeries)
      .where(eq(storySeries.id, seriesId))
      .get();

    // Delete from R2 if exists
    if (series?.coverImageR2Key) {
      await c.env.CONTENT_BUCKET.delete(series.coverImageR2Key);
    }

    // Update series
    await db
      .update(storySeries)
      .set({ coverImageR2Key: null, updatedAt: new Date() })
      .where(eq(storySeries.id, seriesId));

    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: 'Failed to delete cover' }, 500);
  }
});

export default app;

