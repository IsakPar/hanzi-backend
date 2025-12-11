/**
 * Mobile Stories API
 * 
 * Public endpoints for the mobile app to:
 * - Browse published stories catalog
 * - Download stories for offline listening
 * - Get personalized recommendations via vocab-validator
 * 
 * No authentication required - stories are public content.
 * Premium access control is handled by RevenueCat on the client.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types/app';
import { createStoriesDomain } from '../domains/stories';
import { logWithContext } from '../utils/logger';

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

export default app;

