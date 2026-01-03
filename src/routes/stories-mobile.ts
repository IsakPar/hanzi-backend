/**
 * Mobile Stories API
 * 
 * Public endpoints for the mobile app to:
 * - Browse published stories catalog
 * - Download stories for offline listening
 * - Get personalized recommendations via vocab-validator
 * - Showcase sections (configurable home screen)
 * - Story events (listen, complete, rate)
 * 
 * No authentication required - stories are public content.
 * Premium access control is handled by RevenueCat on the client.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, asc, and, sql, inArray, isNotNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { AppEnv } from '../types/app';
import { createStoriesDomain } from '../domains/stories';
import { logWithContext } from '../utils/logger';
import { optionalJwtAuthMiddleware } from '../middleware/jwt-auth';
import { 
  stories, 
  storySeries,
  storyListens, 
  storyRatings, 
  storyStats, 
  storyShowcaseSections,
  storySentences,
} from '../schema';

const app = new Hono<AppEnv>();

// ═══════════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════════

const catalogQuerySchema = z.object({
  hsk_level: z.coerce.number().int().min(1).max(9).optional(),
  topic: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const recommendRequestSchema = z.object({
  lesson_id: z.string(),
  content_type: z.enum(['story', 'audiobook', 'all']).default('story'),
  items_per_tier: z.coerce.number().int().min(1).max(10).default(5),
});

// ═══════════════════════════════════════════════════════════════════
// CATALOG ENDPOINT
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /v1/mobile/stories
 * 
 * Get published stories catalog for browsing.
 * Returns lightweight metadata for cards (no full content).
 */
app.get('/', zValidator('query', catalogQuerySchema), async (c) => {
  const filters = c.req.valid('query');
  const { stories } = createStoriesDomain(c.env);

  try {
    const results = await stories.searchStories({
      hskLevel: filters.hsk_level,
      topic: filters.topic,
      difficulty: filters.difficulty,
      published: true, // Only published stories
      limit: filters.limit,
      offset: filters.offset,
    });

    // Map to mobile-friendly format (lightweight cards)
    const catalog = results.map(story => ({
      id: story.id,
      title: story.title,
      subtitle: story.subtitle,
      author: story.author,
      topic: story.topic,
      hskLevel: story.hskLevel,
      difficulty: story.difficulty,
      estimatedMinutes: story.estimatedMinutes,
      accessTier: story.accessTier || 'free',
      hasCoverImage: !!story.coverImageR2Key,
      // Could add: sentenceCount, wordCount from cache
    }));

    return c.json({
      stories: catalog,
      count: catalog.length,
      offset: filters.offset,
      hasMore: catalog.length === filters.limit,
    });
  } catch (err) {
    logWithContext('error', 'mobile.stories.catalog_failed', {
      requestId: c.get('requestId'),
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to load catalog' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════
// STORY DOWNLOAD ENDPOINT
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /v1/mobile/stories/:id/download
 * 
 * Download full story content for offline listening.
 * Includes sentences with audio URLs and practice blocks.
 */
app.get('/:id/download', async (c) => {
  const id = c.req.param('id');
  const { stories } = createStoriesDomain(c.env);

  try {
    const story = await stories.getStoryWithDetails(id);
    
    if (!story) {
      return c.json({ error: 'Story not found' }, 404);
    }

    if (!story.isPublished) {
      return c.json({ error: 'Story not available' }, 403);
    }

    // Build download bundle
    const bundle = {
      id: story.id,
      title: story.title,
      subtitle: story.subtitle,
      author: story.author,
      description: story.description,
      topic: story.topic,
      hskLevel: story.hskLevel,
      difficulty: story.difficulty,
      estimatedMinutes: story.estimatedMinutes,
      accessTier: story.accessTier || 'free',
      
      // Full content for offline playback
      sentences: story.sentences.map(s => ({
        id: s.id,
        orderIndex: s.orderIndex,
        chinese: s.chinese,
        pinyin: s.pinyin,
        english: s.english,
        // Audio URL (will be relative path in bundle or R2 URL)
        audioUrl: s.audioR2Key 
          ? `${c.env.R2_PUBLIC_URL || ''}/audio/stories/${story.id}/${s.id}.mp3`
          : null,
      })),

      // Vocabulary for lookup/highlighting
      vocabulary: story.vocabulary.map(v => ({
        vocabId: v.vocabId,
        hanzi: v.hanzi,
        pinyin: v.pinyin,
        english: v.english,
        contextSentence: v.contextSentence,
      })),

      // Practice exercises (blocks format like lessons)
      practiceBlocks: story.practiceBlocks || [],

      // Comprehension questions
      questions: story.questions.map(q => ({
        id: q.id,
        orderIndex: q.orderIndex,
        question: q.question,
        questionEnglish: q.questionEnglish,
        questionType: q.questionType,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      })),

      // Metadata for download tracking
      downloadedAt: new Date().toISOString(),
      bundleVersion: 1,
    };

    return c.json({ story: bundle });
  } catch (err) {
    logWithContext('error', 'mobile.stories.download_failed', {
      requestId: c.get('requestId'),
      meta: { storyId: id, error: (err as Error).message },
    });
    return c.json({ error: 'Download failed' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════
// RECOMMENDATIONS ENDPOINT (Proxy to vocab-validator)
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /v1/mobile/stories/recommend
 * 
 * Get personalized story recommendations based on user's vocabulary level.
 * Proxies to vocab-validator microservice.
 */
app.post('/recommend', zValidator('json', recommendRequestSchema), async (c) => {
  const { lesson_id, content_type, items_per_tier } = c.req.valid('json');

  // Get vocab-validator URL from environment
  const validatorUrl = c.env.VOCAB_VALIDATOR_URL;
  if (!validatorUrl) {
    logWithContext('error', 'mobile.stories.recommend_no_validator', {
      requestId: c.get('requestId'),
      meta: { error: 'VOCAB_VALIDATOR_URL not configured' },
    });
    return c.json({ error: 'Recommendations not available' }, 503);
  }

  try {
    // Forward to vocab-validator
    const response = await fetch(`${validatorUrl}/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lesson_id,
        content_type,
        items_per_tier,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logWithContext('error', 'mobile.stories.recommend_validator_error', {
        requestId: c.get('requestId'),
        meta: { status: response.status, error },
      });
      return c.json({ error: 'Recommendation service error' }, 502);
    }

    const recommendations = await response.json();
    return c.json(recommendations);
  } catch (err) {
    logWithContext('error', 'mobile.stories.recommend_failed', {
      requestId: c.get('requestId'),
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to get recommendations' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════
// STORY AUDIO ENDPOINT
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /v1/mobile/stories/:storyId/audio/:sentenceId
 * 
 * Stream audio for a specific sentence.
 * Returns the audio file from R2.
 */
app.get('/:storyId/audio/:sentenceId', async (c) => {
  const storyId = c.req.param('storyId');
  const sentenceId = c.req.param('sentenceId');

  try {
    // Try to get audio from R2
    const key = `audio/stories/${storyId}/${sentenceId}.mp3`;
    const object = await c.env.CONTENT_BUCKET.get(key);

    if (!object) {
      return c.json({ error: 'Audio not found' }, 404);
    }

    // Stream the audio
    return new Response(object.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': object.size.toString(),
        'Cache-Control': 'public, max-age=31536000', // 1 year cache
      },
    });
  } catch (err) {
    logWithContext('error', 'mobile.stories.audio_failed', {
      requestId: c.get('requestId'),
      meta: { storyId, sentenceId, error: (err as Error).message },
    });
    return c.json({ error: 'Audio not available' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════
// COVER IMAGE ENDPOINT
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /v1/mobile/stories/:id/cover
 * 
 * Get story cover image.
 */
app.get('/:id/cover', async (c) => {
  const id = c.req.param('id');
  const { stories } = createStoriesDomain(c.env);

  try {
    const story = await stories.getStory(id);
    if (!story || !story.coverImageR2Key) {
      // Return placeholder or 404
      return c.json({ error: 'No cover image' }, 404);
    }

    const object = await c.env.CONTENT_BUCKET.get(story.coverImageR2Key);
    if (!object) {
      return c.json({ error: 'Cover image not found' }, 404);
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400', // 1 day cache
      },
    });
  } catch (err) {
    logWithContext('error', 'mobile.stories.cover_failed', {
      requestId: c.get('requestId'),
      meta: { storyId: id, error: (err as Error).message },
    });
    return c.json({ error: 'Cover not available' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════
// SHOWCASE SECTIONS (For mobile home screen)
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /v1/mobile/stories/showcase
 * Get all active showcase sections with stories for mobile home screen
 * Supports optional HSK level filtering
 */
app.get('/showcase', async (c) => {
  const db = drizzle(c.env.DB);
  const hskFilter = c.req.query('hskLevel') ? parseInt(c.req.query('hskLevel')!) : null;

  logWithContext('info', 'mobile.stories.showcase', {
    requestId: c.get('requestId'),
    meta: { hskFilter },
  });

  // Get all active sections
  const sections = await db
    .select()
    .from(storyShowcaseSections)
    .where(eq(storyShowcaseSections.isActive, true))
    .orderBy(asc(storyShowcaseSections.orderIndex));

  // Build response with stories for each section
  const result = await Promise.all(sections.map(async (section) => {
    const config = (section.config || {}) as Record<string, unknown>;
    const limit = (config.limit as number) || 10;
    let sectionStories: any[] = [];

    // Apply HSK filter if provided
    const effectiveHskLevel = hskFilter || (config.hskLevel as number);

    switch (section.sectionType) {
      case 'new_releases': {
        sectionStories = await db
          .select({
            id: stories.id,
            title: stories.title,
            subtitle: stories.subtitle,
            hskLevel: stories.hskLevel,
            difficulty: stories.difficulty,
            estimatedMinutes: stories.estimatedMinutes,
            coverImageR2Key: stories.coverImageR2Key,
            publishedAt: stories.publishedAt,
          })
          .from(stories)
          .where(eq(stories.isPublished, true))
          .orderBy(desc(stories.publishedAt))
          .limit(limit);
        
        if (effectiveHskLevel) {
          sectionStories = sectionStories.filter(s => s.hskLevel === effectiveHskLevel);
        }
        break;
      }

      case 'popular': {
        const statsQuery = await db
          .select({
            storyId: storyStats.storyId,
            completeCount: storyStats.completeCount,
            ratingAvg: storyStats.ratingAvg,
          })
          .from(storyStats)
          .orderBy(desc(storyStats.completeCount))
          .limit(limit * 2);

        if (statsQuery.length > 0) {
          const storyIds = statsQuery.map(s => s.storyId);
          const popularStories = await db
            .select({
              id: stories.id,
              title: stories.title,
              subtitle: stories.subtitle,
              hskLevel: stories.hskLevel,
              difficulty: stories.difficulty,
              estimatedMinutes: stories.estimatedMinutes,
              coverImageR2Key: stories.coverImageR2Key,
            })
            .from(stories)
            .where(and(
              eq(stories.isPublished, true),
              inArray(stories.id, storyIds)
            ));

          sectionStories = popularStories
            .map(story => {
              const stat = statsQuery.find(s => s.storyId === story.id);
              return {
                ...story,
                completionCount: stat?.completeCount || 0,
                rating: stat?.ratingAvg || 0,
              };
            })
            .filter(s => !effectiveHskLevel || s.hskLevel === effectiveHskLevel)
            .slice(0, limit);
        }
        
        // Fallback: recent stories
        if (sectionStories.length === 0) {
          sectionStories = await db
            .select({
              id: stories.id,
              title: stories.title,
              subtitle: stories.subtitle,
              hskLevel: stories.hskLevel,
              difficulty: stories.difficulty,
              estimatedMinutes: stories.estimatedMinutes,
              coverImageR2Key: stories.coverImageR2Key,
            })
            .from(stories)
            .where(eq(stories.isPublished, true))
            .orderBy(desc(stories.publishedAt))
            .limit(limit);
        }
        break;
      }

      case 'series': {
        const seriesData = await db
          .select({
            id: storySeries.id,
            title: storySeries.title,
            description: storySeries.description,
            hskLevel: storySeries.hskLevel,
            coverImageR2Key: storySeries.coverImageR2Key,
            totalParts: storySeries.totalParts,
          })
          .from(storySeries)
          .where(eq(storySeries.isPublished, true))
          .orderBy(desc(storySeries.createdAt))
          .limit(limit);

        sectionStories = effectiveHskLevel 
          ? seriesData.filter(s => s.hskLevel === effectiveHskLevel)
          : seriesData;
        break;
      }

      case 'by_hsk': {
        const targetHsk = effectiveHskLevel || (config.hskLevel as number) || 1;
        sectionStories = await db
          .select({
            id: stories.id,
            title: stories.title,
            subtitle: stories.subtitle,
            hskLevel: stories.hskLevel,
            difficulty: stories.difficulty,
            estimatedMinutes: stories.estimatedMinutes,
            coverImageR2Key: stories.coverImageR2Key,
          })
          .from(stories)
          .where(and(
            eq(stories.isPublished, true),
            eq(stories.hskLevel, targetHsk)
          ))
          .orderBy(desc(stories.publishedAt))
          .limit(limit);
        break;
      }

      case 'curated': {
        if (section.curatedStoryIds && section.curatedStoryIds.length > 0) {
          sectionStories = await db
            .select({
              id: stories.id,
              title: stories.title,
              subtitle: stories.subtitle,
              hskLevel: stories.hskLevel,
              difficulty: stories.difficulty,
              estimatedMinutes: stories.estimatedMinutes,
              coverImageR2Key: stories.coverImageR2Key,
            })
            .from(stories)
            .where(and(
              eq(stories.isPublished, true),
              inArray(stories.id, section.curatedStoryIds)
            ));

          if (effectiveHskLevel) {
            sectionStories = sectionStories.filter(s => s.hskLevel === effectiveHskLevel);
          }
        }
        break;
      }
    }

    return {
      id: section.id,
      title: section.title,
      subtitle: section.subtitle,
      icon: section.icon,
      type: section.sectionType,
      stories: sectionStories,
      count: sectionStories.length,
    };
  }));

  const nonEmptySections = result.filter(s => s.count > 0);

  return c.json({
    sections: nonEmptySections,
    hskFilter,
    totalSections: nonEmptySections.length,
  });
});

// ═══════════════════════════════════════════════════════════════════
// STORY EVENTS (Listen, Complete, Rate)
// ═══════════════════════════════════════════════════════════════════

const listenSchema = z.object({
  deviceId: z.string().optional(),
  source: z.enum(['showcase', 'search', 'series', 'recommendation', 'direct']).optional(),
});

/**
 * POST /v1/mobile/stories/:id/listen
 * Track when user starts listening to a story
 */
app.post('/:id/listen', optionalJwtAuthMiddleware, zValidator('json', listenSchema), async (c) => {
  const db = drizzle(c.env.DB);
  const storyId = c.req.param('id');
  const { deviceId, source } = c.req.valid('json');
  const user = c.get('user');

  // Verify story exists
  const story = await db
    .select({ id: stories.id })
    .from(stories)
    .where(eq(stories.id, storyId))
    .limit(1);

  if (story.length === 0) {
    return c.json({ error: 'Story not found' }, 404);
  }

  const eventId = nanoid();
  await db.insert(storyListens).values({
    id: eventId,
    storyId,
    userId: user?.id || null,
    deviceId: deviceId || null,
    eventType: 'start',
    progressPercent: 0,
    lastSentenceIndex: 0,
    source: source || 'direct',
  });

  logWithContext('info', 'mobile.stories.listen', {
    requestId: c.get('requestId'),
    meta: { storyId, userId: user?.id, deviceId, source },
  });

  return c.json({ success: true, eventId });
});

const completeSchema = z.object({
  deviceId: z.string().optional(),
  durationSeconds: z.number().int().min(0).optional(),
});

/**
 * POST /v1/mobile/stories/:id/complete
 * Track when user completes a story
 */
app.post('/:id/complete', optionalJwtAuthMiddleware, zValidator('json', completeSchema), async (c) => {
  const db = drizzle(c.env.DB);
  const storyId = c.req.param('id');
  const { deviceId, durationSeconds } = c.req.valid('json');
  const user = c.get('user');

  const sentenceCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(storySentences)
    .where(eq(storySentences.storyId, storyId));

  const eventId = nanoid();
  await db.insert(storyListens).values({
    id: eventId,
    storyId,
    userId: user?.id || null,
    deviceId: deviceId || null,
    eventType: 'complete',
    progressPercent: 100,
    lastSentenceIndex: sentenceCount[0]?.count || 0,
    durationSeconds: durationSeconds || null,
  });

  await updateStoryStats(db, storyId);

  logWithContext('info', 'mobile.stories.complete', {
    requestId: c.get('requestId'),
    meta: { storyId, userId: user?.id, deviceId, durationSeconds },
  });

  return c.json({ success: true, eventId });
});

const rateSchema = z.object({
  stars: z.number().int().min(1).max(5),
  feedback: z.string().max(500).optional(),
  deviceId: z.string().optional(),
});

/**
 * POST /v1/mobile/stories/:id/rate
 * Submit or update rating for a story
 */
app.post('/:id/rate', optionalJwtAuthMiddleware, zValidator('json', rateSchema), async (c) => {
  const db = drizzle(c.env.DB);
  const storyId = c.req.param('id');
  const { stars, feedback, deviceId } = c.req.valid('json');
  const user = c.get('user');

  if (!user?.id && !deviceId) {
    return c.json({ error: 'Either authenticated user or deviceId required' }, 400);
  }

  let existingRating: any[] = [];
  if (user?.id) {
    existingRating = await db
      .select()
      .from(storyRatings)
      .where(and(
        eq(storyRatings.storyId, storyId),
        eq(storyRatings.userId, user.id)
      ))
      .limit(1);
  } else if (deviceId) {
    existingRating = await db
      .select()
      .from(storyRatings)
      .where(and(
        eq(storyRatings.storyId, storyId),
        eq(storyRatings.deviceId, deviceId)
      ))
      .limit(1);
  }

  let ratingId: string;
  let isUpdate = false;

  if (existingRating.length > 0) {
    ratingId = existingRating[0].id;
    isUpdate = true;
    await db
      .update(storyRatings)
      .set({
        stars,
        feedback: feedback || null,
        updatedAt: new Date(),
      })
      .where(eq(storyRatings.id, ratingId));
  } else {
    ratingId = nanoid();
    await db.insert(storyRatings).values({
      id: ratingId,
      storyId,
      userId: user?.id || null,
      deviceId: deviceId || null,
      stars,
      feedback: feedback || null,
    });
  }

  await updateStoryStats(db, storyId);

  logWithContext('info', 'mobile.stories.rate', {
    requestId: c.get('requestId'),
    meta: { storyId, userId: user?.id, stars, isUpdate },
  });

  return c.json({ 
    success: true, 
    ratingId,
    isUpdate,
    message: isUpdate ? 'Rating updated' : 'Rating submitted',
  });
});

/**
 * GET /v1/mobile/stories/:id/my-rating
 * Get current user's rating for a story
 */
app.get('/:id/my-rating', optionalJwtAuthMiddleware, async (c) => {
  const db = drizzle(c.env.DB);
  const storyId = c.req.param('id');
  const deviceId = c.req.query('deviceId');
  const user = c.get('user');

  if (!user?.id && !deviceId) {
    return c.json({ rating: null });
  }

  let rating: any[] = [];
  if (user?.id) {
    rating = await db
      .select()
      .from(storyRatings)
      .where(and(
        eq(storyRatings.storyId, storyId),
        eq(storyRatings.userId, user.id)
      ))
      .limit(1);
  } else if (deviceId) {
    rating = await db
      .select()
      .from(storyRatings)
      .where(and(
        eq(storyRatings.storyId, storyId),
        eq(storyRatings.deviceId, deviceId)
      ))
      .limit(1);
  }

  return c.json({
    rating: rating[0] ? {
      stars: rating[0].stars,
      feedback: rating[0].feedback,
      updatedAt: rating[0].updatedAt,
    } : null,
  });
});

/**
 * GET /v1/mobile/stories/:id/stats
 * Get public stats for a story
 */
app.get('/:id/stats', async (c) => {
  const db = drizzle(c.env.DB);
  const storyId = c.req.param('id');

  const stats = await db
    .select()
    .from(storyStats)
    .where(eq(storyStats.storyId, storyId))
    .limit(1);

  if (stats.length === 0) {
    return c.json({
      listenCount: 0,
      completeCount: 0,
      ratingAvg: 0,
      ratingCount: 0,
    });
  }

  return c.json({
    listenCount: stats[0].listenCount,
    completeCount: stats[0].completeCount,
    completionRate: stats[0].completionRate,
    ratingAvg: Math.round(stats[0].ratingAvg! * 10) / 10,
    ratingCount: stats[0].ratingCount,
    ratingDistribution: stats[0].ratingDistribution,
  });
});

// ═══════════════════════════════════════════════════════════════════
// HELPER: Update story stats
// ═══════════════════════════════════════════════════════════════════

async function updateStoryStats(db: ReturnType<typeof drizzle>, storyId: string) {
  const listenCounts = await db
    .select({
      eventType: storyListens.eventType,
      count: sql<number>`count(*)`,
    })
    .from(storyListens)
    .where(eq(storyListens.storyId, storyId))
    .groupBy(storyListens.eventType);

  const startCount = listenCounts.find(l => l.eventType === 'start')?.count || 0;
  const completeCount = listenCounts.find(l => l.eventType === 'complete')?.count || 0;

  const uniqueListeners = await db
    .select({ count: sql<number>`count(DISTINCT COALESCE(user_id, device_id))` })
    .from(storyListens)
    .where(eq(storyListens.storyId, storyId));

  const avgDuration = await db
    .select({ avg: sql<number>`avg(duration_seconds)` })
    .from(storyListens)
    .where(and(
      eq(storyListens.storyId, storyId),
      eq(storyListens.eventType, 'complete'),
      isNotNull(storyListens.durationSeconds)
    ));

  const ratingStats = await db
    .select({
      count: sql<number>`count(*)`,
      avg: sql<number>`avg(stars)`,
    })
    .from(storyRatings)
    .where(eq(storyRatings.storyId, storyId));

  const ratingDist = await db
    .select({
      stars: storyRatings.stars,
      count: sql<number>`count(*)`,
    })
    .from(storyRatings)
    .where(eq(storyRatings.storyId, storyId))
    .groupBy(storyRatings.stars);

  const distribution: Record<string, number> = {};
  ratingDist.forEach(r => {
    distribution[r.stars.toString()] = r.count;
  });

  const completionRate = startCount > 0 ? completeCount / startCount : 0;
  const trendingScore = completeCount * 2 + (ratingStats[0]?.count || 0) * 3;

  const existingStats = await db
    .select()
    .from(storyStats)
    .where(eq(storyStats.storyId, storyId))
    .limit(1);

  if (existingStats.length > 0) {
    await db
      .update(storyStats)
      .set({
        listenCount: startCount,
        completeCount,
        uniqueListeners: uniqueListeners[0]?.count || 0,
        completionRate,
        avgDurationSeconds: Math.round(avgDuration[0]?.avg || 0),
        ratingCount: ratingStats[0]?.count || 0,
        ratingAvg: ratingStats[0]?.avg || 0,
        ratingDistribution: distribution,
        trendingScore,
        lastCalculatedAt: new Date(),
      })
      .where(eq(storyStats.storyId, storyId));
  } else {
    await db.insert(storyStats).values({
      storyId,
      listenCount: startCount,
      completeCount,
      uniqueListeners: uniqueListeners[0]?.count || 0,
      completionRate,
      avgDurationSeconds: Math.round(avgDuration[0]?.avg || 0),
      ratingCount: ratingStats[0]?.count || 0,
      ratingAvg: ratingStats[0]?.avg || 0,
      ratingDistribution: distribution,
      trendingScore,
    });
  }
}

export default app;

