/**
 * Stories CRUD Routes
 * Basic create, read, update, delete operations
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../../types/app';
import { createStoriesDomain } from '../../domains/stories';
import { AnalyticsService } from '../../services/analytics';
import { logWithContext } from '../../utils/logger';
import { createStorySchema, updateStorySchema, searchSchema } from './schemas';

const app = new Hono<AppEnv>();

const getServices = (env: AppEnv['Bindings']) => createStoriesDomain(env);

/**
 * GET /stories
 * List/search stories with filters
 */
app.get('/', zValidator('query', searchSchema), async (c) => {
  const filters = c.req.valid('query');
  const { stories } = getServices(c.env);

  try {
    const results = await stories.searchStories({
      hskLevel: filters.hsk_level,
      difficulty: filters.difficulty,
      topic: filters.topic,
      query: filters.query,
      published: filters.published,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    });

    return c.json({ stories: results, count: results.length });
  } catch (err) {
    logWithContext('error', 'stories.search_failed', {
      requestId: c.get('requestId'),
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Search failed' }, 500);
  }
});

/**
 * POST /stories
 * Create a new story
 */
app.post('/', zValidator('json', createStorySchema), async (c) => {
  const data = c.req.valid('json');
  const user = c.get('user');
  const { stories } = getServices(c.env);
  const analytics = new AnalyticsService(c.env.DB);

  try {
    logWithContext('info', 'stories.create_attempt', {
      requestId: c.get('requestId'),
      meta: { data: JSON.stringify(data) },
    });
    
    const story = await stories.createStory(data);

    await analytics.record({
      type: 'story.create',
      requestId: c.get('requestId'),
      userId: user?.id,
      metadata: { storyId: story.id, title: story.title },
    });

    return c.json({ story }, 201);
  } catch (err) {
    const error = err as Error;
    logWithContext('error', 'stories.create_failed', {
      requestId: c.get('requestId'),
      meta: { 
        error: error.message, 
        stack: error.stack,
        cause: (error as any).cause,
        data: JSON.stringify(data),
      },
    });
    return c.json({ error: 'Failed to create story', details: error.message }, 500);
  }
});

/**
 * GET /stories/lookup
 * Lookup story by title + seriesId (for import deduplication)
 * Query params: title (required), seriesId (optional)
 */
app.get('/lookup', async (c) => {
  const title = c.req.query('title');
  const seriesId = c.req.query('seriesId') || null;

  if (!title) {
    return c.json({ error: 'title query param required' }, 400);
  }

  const { stories } = getServices(c.env);

  try {
    const story = await stories.getStoryByTitleAndSeries(title, seriesId);
    if (!story) {
      return c.json({ exists: false, story: null });
    }

    return c.json({ exists: true, story });
  } catch (err) {
    logWithContext('error', 'stories.lookup_failed', {
      requestId: c.get('requestId'),
      meta: { title, seriesId, error: (err as Error).message },
    });
    return c.json({ error: 'Lookup failed' }, 500);
  }
});

/**
 * GET /stories/:id
 * Get story with all details
 */
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const { stories } = getServices(c.env);

  try {
    const story = await stories.getStoryWithDetails(id);
    if (!story) {
      return c.json({ error: 'Story not found' }, 404);
    }

    return c.json({ story });
  } catch (err) {
    logWithContext('error', 'stories.get_failed', {
      requestId: c.get('requestId'),
      meta: { storyId: id, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to get story' }, 500);
  }
});

/**
 * PUT /stories/:id
 * Update story metadata
 */
app.put('/:id', zValidator('json', updateStorySchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const user = c.get('user');
  const { stories } = getServices(c.env);
  const analytics = new AnalyticsService(c.env.DB);

  try {
    await stories.updateStory(id, data);

    await analytics.record({
      type: 'story.update',
      requestId: c.get('requestId'),
      userId: user?.id,
      metadata: { storyId: id, fields: Object.keys(data) },
    });

    return c.json({ success: true });
  } catch (err) {
    logWithContext('error', 'stories.update_failed', {
      requestId: c.get('requestId'),
      meta: { storyId: id, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to update story' }, 500);
  }
});

/**
 * DELETE /stories/:id
 * Delete a story
 */
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const { stories } = getServices(c.env);
  const analytics = new AnalyticsService(c.env.DB);

  try {
    await stories.deleteStory(id);

    await analytics.record({
      type: 'story.delete',
      requestId: c.get('requestId'),
      userId: user?.id,
      metadata: { storyId: id },
    });

    return c.json({ success: true });
  } catch (err) {
    logWithContext('error', 'stories.delete_failed', {
      requestId: c.get('requestId'),
      meta: { storyId: id, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to delete story' }, 500);
  }
});

export default app;

