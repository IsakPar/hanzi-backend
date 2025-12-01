/**
 * Control Center Routes
 * 
 * Content staging system for testing content on specific devices
 * before pushing to all users.
 * 
 * Flow: draft -> staging -> live
 */

import { Hono } from 'hono';
import { eq, or, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import type { AppEnv } from '../types/app';
import { jwtAuthMiddleware } from '../middleware/jwt-auth';
import { lessons, stories, testDevices } from '../schema';
import { nanoid } from 'nanoid';
import { adminRateLimit } from '../middleware/rate-limit';

const app = new Hono<AppEnv>();

// Apply rate limiting
app.use('/*', adminRateLimit);

// All routes require admin
app.use('/*', jwtAuthMiddleware({ allowRoles: ['admin'] }));

// ═══════════════════════════════════════════════════════════
// STAGED CONTENT
// ═══════════════════════════════════════════════════════════

/**
 * GET /v1/control-center/staged
 * List all content currently in staging
 */
app.get('/staged', async (c) => {
  const db = drizzle(c.env.DB);

  const [stagedLessons, stagedStories] = await Promise.all([
    db.select({
      id: lessons.id,
      title: lessons.title,
      hskLevel: lessons.hskLevel,
      lessonNumber: lessons.lessonNumber,
      contentStatus: lessons.contentStatus,
      updatedAt: lessons.updatedAt,
    })
    .from(lessons)
    .where(eq(lessons.contentStatus, 'staging')),

    db.select({
      id: stories.id,
      title: stories.title,
      hskLevel: stories.hskLevel,
      contentStatus: stories.contentStatus,
      updatedAt: stories.updatedAt,
    })
    .from(stories)
    .where(eq(stories.contentStatus, 'staging')),
  ]);

  return c.json({
    lessons: stagedLessons,
    stories: stagedStories,
    totalStaged: stagedLessons.length + stagedStories.length,
  });
});

/**
 * POST /v1/control-center/promote
 * Promote content from staging to live
 */
app.post('/promote', async (c) => {
  const db = drizzle(c.env.DB);
  const { lessonIds, storyIds } = await c.req.json<{
    lessonIds?: string[];
    storyIds?: string[];
  }>();

  const results = {
    lessonsPromoted: 0,
    storiesPromoted: 0,
  };

  if (lessonIds && lessonIds.length > 0) {
    await db
      .update(lessons)
      .set({ 
        contentStatus: 'live',
        isPublished: true,
        updatedAt: new Date(),
      })
      .where(inArray(lessons.id, lessonIds));
    results.lessonsPromoted = lessonIds.length;
  }

  if (storyIds && storyIds.length > 0) {
    await db
      .update(stories)
      .set({ 
        contentStatus: 'live',
        isPublished: true,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(inArray(stories.id, storyIds));
    results.storiesPromoted = storyIds.length;
  }

  return c.json({
    success: true,
    ...results,
  });
});

/**
 * POST /v1/control-center/stage
 * Move content from draft to staging
 */
app.post('/stage', async (c) => {
  const db = drizzle(c.env.DB);
  const { lessonIds, storyIds } = await c.req.json<{
    lessonIds?: string[];
    storyIds?: string[];
  }>();

  const results = {
    lessonsStaged: 0,
    storiesStaged: 0,
  };

  if (lessonIds && lessonIds.length > 0) {
    await db
      .update(lessons)
      .set({ 
        contentStatus: 'staging',
        updatedAt: new Date(),
      })
      .where(inArray(lessons.id, lessonIds));
    results.lessonsStaged = lessonIds.length;
  }

  if (storyIds && storyIds.length > 0) {
    await db
      .update(stories)
      .set({ 
        contentStatus: 'staging',
        updatedAt: new Date(),
      })
      .where(inArray(stories.id, storyIds));
    results.storiesStaged = storyIds.length;
  }

  return c.json({
    success: true,
    ...results,
  });
});

/**
 * POST /v1/control-center/unpublish
 * Move content back to draft
 */
app.post('/unpublish', async (c) => {
  const db = drizzle(c.env.DB);
  const { lessonIds, storyIds } = await c.req.json<{
    lessonIds?: string[];
    storyIds?: string[];
  }>();

  const results = {
    lessonsUnpublished: 0,
    storiesUnpublished: 0,
  };

  if (lessonIds && lessonIds.length > 0) {
    await db
      .update(lessons)
      .set({ 
        contentStatus: 'draft',
        isPublished: false,
        updatedAt: new Date(),
      })
      .where(inArray(lessons.id, lessonIds));
    results.lessonsUnpublished = lessonIds.length;
  }

  if (storyIds && storyIds.length > 0) {
    await db
      .update(stories)
      .set({ 
        contentStatus: 'draft',
        isPublished: false,
        updatedAt: new Date(),
      })
      .where(inArray(stories.id, storyIds));
    results.storiesUnpublished = storyIds.length;
  }

  return c.json({
    success: true,
    ...results,
  });
});

// ═══════════════════════════════════════════════════════════
// TEST DEVICES
// ═══════════════════════════════════════════════════════════

/**
 * GET /v1/control-center/test-devices
 * List all registered test devices
 */
app.get('/test-devices', async (c) => {
  const db = drizzle(c.env.DB);

  const devices = await db
    .select()
    .from(testDevices)
    .orderBy(testDevices.createdAt);

  return c.json({ devices });
});

/**
 * POST /v1/control-center/test-devices
 * Add a new test device
 */
app.post('/test-devices', async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get('user');
  const { deviceId, name, platform } = await c.req.json<{
    deviceId: string;
    name: string;
    platform?: 'ios' | 'android';
  }>();

  if (!deviceId || !name) {
    return c.json({ error: 'deviceId and name are required' }, 400);
  }

  // Check if device already exists
  const existing = await db
    .select()
    .from(testDevices)
    .where(eq(testDevices.deviceId, deviceId))
    .limit(1);

  if (existing.length > 0) {
    return c.json({ error: 'Device already registered' }, 409);
  }

  const device = {
    id: nanoid(),
    deviceId,
    name,
    platform: platform || null,
    addedBy: user?.id || null,
    createdAt: new Date(),
  };

  await db.insert(testDevices).values(device);

  return c.json({ success: true, device });
});

/**
 * DELETE /v1/control-center/test-devices/:id
 * Remove a test device
 */
app.delete('/test-devices/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  await db.delete(testDevices).where(eq(testDevices.id, id));

  return c.json({ success: true });
});

/**
 * GET /v1/control-center/is-test-device/:deviceId
 * Check if a device is a test device (public endpoint for mobile app)
 */
app.get('/is-test-device/:deviceId', async (c) => {
  const db = drizzle(c.env.DB);
  const deviceId = c.req.param('deviceId');

  const device = await db
    .select()
    .from(testDevices)
    .where(eq(testDevices.deviceId, deviceId))
    .limit(1);

  return c.json({ isTestDevice: device.length > 0 });
});

// ═══════════════════════════════════════════════════════════
// CONTENT OVERVIEW
// ═══════════════════════════════════════════════════════════

/**
 * GET /v1/control-center/overview
 * Get overview of all content by status
 */
app.get('/overview', async (c) => {
  const db = drizzle(c.env.DB);

  // Get lesson counts by status
  const allLessons = await db
    .select({
      id: lessons.id,
      contentStatus: lessons.contentStatus,
    })
    .from(lessons);

  const allStories = await db
    .select({
      id: stories.id,
      contentStatus: stories.contentStatus,
    })
    .from(stories);

  const lessonCounts = {
    draft: allLessons.filter(l => l.contentStatus === 'draft' || !l.contentStatus).length,
    staging: allLessons.filter(l => l.contentStatus === 'staging').length,
    live: allLessons.filter(l => l.contentStatus === 'live').length,
  };

  const storyCounts = {
    draft: allStories.filter(s => s.contentStatus === 'draft' || !s.contentStatus).length,
    staging: allStories.filter(s => s.contentStatus === 'staging').length,
    live: allStories.filter(s => s.contentStatus === 'live').length,
  };

  return c.json({
    lessons: lessonCounts,
    stories: storyCounts,
    total: {
      draft: lessonCounts.draft + storyCounts.draft,
      staging: lessonCounts.staging + storyCounts.staging,
      live: lessonCounts.live + storyCounts.live,
    },
  });
});

export default app;

