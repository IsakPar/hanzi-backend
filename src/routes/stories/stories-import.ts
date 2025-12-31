/**
 * Stories Import Routes
 * JSON import functionality for creating and updating stories
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../../types/app';
import { createStoriesDomain } from '../../domains/stories';
import { AnalyticsService } from '../../services/analytics';
import { logWithContext } from '../../utils/logger';
import { storyImportSchema } from './schemas';

const app = new Hono<AppEnv>();

const getServices = (env: AppEnv['Bindings']) => createStoriesDomain(env);

/**
 * POST /stories/import
 * Create a NEW story from JSON
 * Always generates new IDs, ignores any IDs in payload
 */
app.post('/import', zValidator('json', storyImportSchema, (result, c) => {
  if (!result.success) {
    const issues = result.error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
    logWithContext('warn', 'stories.import_validation_failed', {
      requestId: 'validation',
      meta: { issueCount: issues.length, issues },
    });
    return c.json({ 
      error: 'Validation failed',
      issues,
      message: issues.map(i => `${i.path || 'root'}: ${i.message}`).join('; '),
    }, 400);
  }
}), async (c) => {
  const data = c.req.valid('json');
  const user = c.get('user');
  const { stories } = getServices(c.env);
  const analytics = new AnalyticsService(c.env.DB);

  try {
    // Step 1: Create story
    logWithContext('info', 'stories.import_step1_create', {
      requestId: c.get('requestId'),
      meta: { title: data.title, hskLevel: data.hskLevel },
    });
    
    // Story type: use explicit value if provided, otherwise auto-detect from speakers
    const hasDialogue = data.segments.some((s: any) => s.speaker);
    const storyType = data.storyType || (hasDialogue ? 'dialogue' : 'text');
    
    let story;
    try {
      story = await stories.createStory({
        title: data.title,
        subtitle: data.subtitle || data.titleEn, // Use titleEn as subtitle fallback
        author: data.author,
        description: data.description,
        topic: data.topic,
        hskLevel: data.hskLevel,
        difficulty: data.difficulty,
        estimatedMinutes: data.estimatedMinutes,
        accessTier: data.accessTier,
        storyType, // Auto-detected: 'text' or 'dialogue'
        // Store practiceIntro with practiceBlocks
        practiceBlocks: data.practiceIntro 
          ? [{ type: '_practice_intro', content: data.practiceIntro }, ...data.practiceBlocks]
          : data.practiceBlocks,
        seriesId: data.seriesId,
        seriesOrder: data.seriesOrder,
      });
    } catch (storyErr) {
      logWithContext('error', 'stories.import_create_failed', {
        requestId: c.get('requestId'),
        meta: { error: (storyErr as Error).message, stack: (storyErr as Error).stack },
      });
      return c.json({ 
        error: 'Failed to create story', 
        details: (storyErr as Error).message,
        step: 'createStory',
      }, 500);
    }

    // Step 2: Update pause setting
    try {
      await stories.updateStory(story.id, {
        pauseBetweenSegmentsMs: data.pauseBetweenSegmentsMs,
      } as any);
    } catch (pauseErr) {
      logWithContext('warn', 'stories.import_pause_update_failed', {
        requestId: c.get('requestId'),
        meta: { error: (pauseErr as Error).message },
      });
      // Non-critical, continue
    }

    // Step 3: Create segments
    let segmentsCreated = 0;
    for (let i = 0; i < data.segments.length; i++) {
      const segment = data.segments[i];
      try {
        await stories.addSentence(story.id, {
          chinese: segment.chinese,
          pinyin: segment.pinyin,
          english: segment.english,
          speaker: segment.speaker, // Pass speaker for dialogue stories
        });
        segmentsCreated++;
      } catch (segErr) {
        logWithContext('error', 'stories.import_segment_failed', {
          requestId: c.get('requestId'),
          meta: { 
            segmentIndex: i, 
            error: (segErr as Error).message,
            segment: segment.chinese?.substring(0, 50),
          },
        });
        return c.json({ 
          error: 'Failed to create segment', 
          details: `Segment ${i + 1}: ${(segErr as Error).message}`,
          step: 'addSentence',
          segmentIndex: i,
        }, 500);
      }
    }

    await analytics.record({
      type: 'story.import',
      requestId: c.get('requestId'),
      userId: user?.id,
      metadata: { 
        storyId: story.id, 
        title: story.title,
        segmentCount: segmentsCreated,
      },
    });

    logWithContext('info', 'stories.import_success', {
      requestId: c.get('requestId'),
      meta: { storyId: story.id, segmentCount: segmentsCreated },
    });

    return c.json({ 
      success: true, 
      story: { id: story.id, title: story.title },
      segmentsCreated,
    }, 201);
  } catch (err) {
    logWithContext('error', 'stories.import_failed', {
      requestId: c.get('requestId'),
      meta: { error: (err as Error).message, stack: (err as Error).stack },
    });
    return c.json({ error: 'Import failed', details: (err as Error).message }, 500);
  }
});

/**
 * PUT /stories/:id/import
 * Update EXISTING story from JSON
 * Replaces all segments (deletes old, creates new from JSON)
 */
app.put('/:id/import', zValidator('json', storyImportSchema, (result, c) => {
  if (!result.success) {
    const issues = result.error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
    logWithContext('warn', 'stories.import_validation_failed', {
      requestId: 'validation',
      meta: { issueCount: issues.length, issues },
    });
    return c.json({ 
      error: 'Validation failed',
      issues,
      message: issues.map(i => `${i.path || 'root'}: ${i.message}`).join('; '),
    }, 400);
  }
}), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const user = c.get('user');
  const { stories } = getServices(c.env);
  const analytics = new AnalyticsService(c.env.DB);

  try {
    // Verify story exists
    const existing = await stories.getStoryWithDetails(id);
    if (!existing) {
      return c.json({ error: 'Story not found' }, 404);
    }

    // Story type: use explicit value if provided, otherwise auto-detect from speakers
    const hasDialogue = data.segments.some((s: any) => s.speaker);
    const storyType = data.storyType || (hasDialogue ? 'dialogue' : 'text');

    // Update story metadata
    await stories.updateStory(id, {
      title: data.title,
      subtitle: data.subtitle,
      author: data.author,
      description: data.description,
      topic: data.topic,
      hskLevel: data.hskLevel,
      difficulty: data.difficulty,
      estimatedMinutes: data.estimatedMinutes,
      storyType, // Auto-detected
      practiceBlocks: data.practiceBlocks,
      pauseBetweenSegmentsMs: data.pauseBetweenSegmentsMs,
    } as any);

    // Replace all segments using bulk save
    const segmentsForBulk = data.segments.map((seg: any, idx: number) => ({
      chinese: seg.chinese,
      pinyin: seg.pinyin,
      english: seg.english,
      speaker: seg.speaker || null,
      orderIndex: idx,
    }));

    // Delete existing and create new
    const result = await stories.bulkSaveSegments(id, segmentsForBulk);

    await analytics.record({
      type: 'story.import_update',
      requestId: c.get('requestId'),
      userId: user?.id,
      metadata: { 
        storyId: id, 
        title: data.title,
        segmentsCreated: result.created,
        segmentsUpdated: result.updated,
        segmentsDeleted: result.deleted,
      },
    });

    return c.json({ 
      success: true, 
      story: { id, title: data.title },
      segments: result,
    });
  } catch (err) {
    logWithContext('error', 'stories.import_update_failed', {
      requestId: c.get('requestId'),
      meta: { storyId: id, error: (err as Error).message },
    });
    return c.json({ error: 'Import update failed', details: (err as Error).message }, 500);
  }
});

export default app;

