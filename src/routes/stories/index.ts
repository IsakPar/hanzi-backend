/**
 * Stories Routes
 * Main router that composes all story-related sub-routes
 * 
 * Route Structure:
 * - /stories/                  (CRUD)
 * - /stories/:id/sentences     (Content)
 * - /stories/:id/vocabulary    (Content)
 * - /stories/:id/questions     (Content)
 * - /stories/:id/cover         (Media)
 * - /stories/:id/sentences/:id/audio (Media)
 * - /stories/template          (Export)
 * - /stories/:id/export        (Export)
 * - /stories/import            (Import)
 * - /stories/:id/import        (Import)
 * - /stories/:id/generate-practice (AI)
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { jwtAuthMiddleware } from '../../middleware/jwt-auth';
import type { AppEnv } from '../../types/app';
import { apiRateLimit } from '../../middleware/rate-limit';
import { bulkSegmentsSchema } from './schemas';
import { createStoriesDomain } from '../../domains/stories';
import { logWithContext } from '../../utils/logger';

// Sub-routers
import storiesCrud from './stories-crud';
import storiesContent from './stories-content';
import storiesMedia from './stories-media';
import storiesExport from './stories-export';
import storiesImport from './stories-import';
import storiesAI from './stories-ai';

const app = new Hono<AppEnv>();

// Apply rate limiting
app.use('/*', apiRateLimit);

// PUBLIC: Template endpoint (no auth needed - static content)
app.get('/template', (c) => {
  return c.json({
    title: "故事标题",
    titleEn: "Story Title",
    subtitle: "A short tagline",
    description: "A brief description of the story.",
    author: "Your Name",
    topic: "daily-life",
    hskLevel: 1,
    difficulty: "easy",
    storyType: "dialogue",
    estimatedMinutes: 3,
    accessTier: "free",
    tags: ["conversation", "beginner"],
    sentences: [
      { chinese: "你好！", pinyin: "nǐ hǎo!", english: "Hello!", speaker: "A" },
      { chinese: "你好！", pinyin: "nǐ hǎo!", english: "Hello!", speaker: "B" }
    ],
    practiceIntro: {
      enabled: true,
      title: "Practice Time! 📝",
      message: "Want to test your understanding?",
      skipLabel: "Skip",
      startLabel: "Let's go!"
    },
    practiceBlocks: []
  });
});

// All other stories endpoints require admin auth
app.use('/*', jwtAuthMiddleware({ allowRoles: ['admin', 'user'] }));

// ═══════════════════════════════════════════════════════════
// SEGMENTS/BULK ROUTE - MUST BE BEFORE SUB-ROUTERS
// This route is defined here (not in stories-content.ts) to ensure
// it's matched before any sub-router catch-all routes
// ═══════════════════════════════════════════════════════════

app.post('/:id/segments/bulk', zValidator('json', bulkSegmentsSchema), async (c) => {
  const storyId = c.req.param('id');
  const { segments } = c.req.valid('json');
  const getServices = (env: AppEnv['Bindings']) => createStoriesDomain(env);
  const { stories } = getServices(c.env);

  logWithContext('info', 'stories.segments.bulk_direct', {
    requestId: c.get('requestId'),
    meta: { storyId, segmentCount: segments.length },
  });

  try {
    const segmentsWithOrder = segments.map((seg, idx) => ({
      ...seg,
      orderIndex: idx,
    }));
    const result = await stories.bulkSaveSegments(storyId, segmentsWithOrder);
    return c.json({ success: true, ...result });
  } catch (err) {
    logWithContext('error', 'stories.segments.bulk_failed', {
      requestId: c.get('requestId'),
      meta: { storyId, segmentCount: segments.length, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to save segments' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// SUB-ROUTERS
// ═══════════════════════════════════════════════════════════

// Export routes (/:id/export)
app.route('/', storiesExport);

// Import routes (POST /import must be before /:id)
app.route('/', storiesImport);

// AI generation
app.route('/', storiesAI);

// Media uploads
app.route('/', storiesMedia);

// Content management (sentences, vocabulary, questions)
app.route('/', storiesContent);

// Base CRUD (list, create, get, update, delete)
app.route('/', storiesCrud);

export default app;
