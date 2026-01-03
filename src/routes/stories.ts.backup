import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { jwtAuthMiddleware } from '../middleware/jwt-auth';
import type { AppEnv } from '../types/app';
import { createStoriesDomain } from '../domains/stories';
import { AnalyticsService } from '../services/analytics';
import { logWithContext } from '../utils/logger';
import { apiRateLimit } from '../middleware/rate-limit';

const app = new Hono<AppEnv>();

// Apply rate limiting
app.use('/*', apiRateLimit);

// All stories endpoints require admin auth
app.use('/*', jwtAuthMiddleware({ allowRoles: ['admin'] }));

const getServices = (env: AppEnv['Bindings']) => createStoriesDomain(env);

// --- VALIDATION SCHEMAS ---

const createStorySchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  author: z.string().optional(),
  contentLibraryId: z.string().optional(),
  description: z.string().optional(),
  topic: z.string().optional(),
  hskLevel: z.number().int().min(1).max(9),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  estimatedMinutes: z.number().int().min(1).optional(),
  accessTier: z.enum(['free', 'premium']).optional(),
});

const updateStorySchema = z.object({
  title: z.string().min(1).optional(),
  subtitle: z.string().optional(),
  author: z.string().optional(),
  contentLibraryId: z.string().optional(),
  description: z.string().optional(),
  topic: z.string().optional(),
  hskLevel: z.number().int().min(1).max(9).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  estimatedMinutes: z.number().int().min(1).optional(),
  isPublished: z.boolean().optional(),
  accessTier: z.enum(['free', 'premium']).optional(),
});

const createSentenceSchema = z.object({
  chinese: z.string().min(1),
  pinyin: z.string().min(1),
  english: z.string().min(1),
  audioR2Key: z.string().optional(),
});

const updateSentenceSchema = z.object({
  chinese: z.string().min(1).optional(),
  pinyin: z.string().min(1).optional(),
  english: z.string().min(1).optional(),
  audioR2Key: z.string().optional(),
});

const reorderSentencesSchema = z.object({
  sentenceIds: z.array(z.string()),
});

const addVocabularySchema = z.object({
  vocabId: z.string().min(1),
  contextSentence: z.string().optional(),
});

const createQuestionSchema = z.object({
  question: z.string().min(1),
  questionEnglish: z.string().optional(),
  questionType: z.enum(['multiple_choice', 'true_false', 'short_answer']),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().min(1),
  explanation: z.string().optional(),
});

const searchSchema = z.object({
  hsk_level: z.coerce.number().int().min(1).max(9).optional(),
  difficulty: z.string().optional(),
  topic: z.string().optional(),
  query: z.string().optional(),
  published: z.coerce.boolean().optional(),
  access_tier: z.enum(['free', 'premium']).optional(),
  limit: z.coerce.number().int().max(100).optional(),
  offset: z.coerce.number().int().optional(),
});

// --- STORY CRUD ---

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

app.post('/', zValidator('json', createStorySchema), async (c) => {
  const data = c.req.valid('json');
  const user = c.get('user');
  const { stories } = getServices(c.env);
  const analytics = new AnalyticsService(c.env.DB);

  try {
    const story = await stories.createStory(data);

    await analytics.record({
      type: 'story.create',
      requestId: c.get('requestId'),
      userId: user?.id,
      metadata: { storyId: story.id, title: story.title },
    });

    return c.json({ story }, 201);
  } catch (err) {
    logWithContext('error', 'stories.create_failed', {
      requestId: c.get('requestId'),
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to create story' }, 500);
  }
});

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

// --- SENTENCES ---

app.post('/:id/sentences', zValidator('json', createSentenceSchema), async (c) => {
  const storyId = c.req.param('id');
  const data = c.req.valid('json');
  const { stories } = getServices(c.env);

  try {
    const sentence = await stories.addSentence(storyId, data);
    return c.json({ sentence }, 201);
  } catch (err) {
    logWithContext('error', 'stories.sentence.add_failed', {
      requestId: c.get('requestId'),
      meta: { storyId, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to add sentence' }, 500);
  }
});

app.put('/:id/sentences/:sentenceId', zValidator('json', updateSentenceSchema), async (c) => {
  const sentenceId = c.req.param('sentenceId');
  const data = c.req.valid('json');
  const { stories } = getServices(c.env);

  try {
    await stories.updateSentence(sentenceId, data);
    return c.json({ success: true });
  } catch (err) {
    logWithContext('error', 'stories.sentence.update_failed', {
      requestId: c.get('requestId'),
      meta: { sentenceId, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to update sentence' }, 500);
  }
});

app.delete('/:id/sentences/:sentenceId', async (c) => {
  const sentenceId = c.req.param('sentenceId');
  const { stories } = getServices(c.env);

  try {
    await stories.deleteSentence(sentenceId);
    return c.json({ success: true });
  } catch (err) {
    logWithContext('error', 'stories.sentence.delete_failed', {
      requestId: c.get('requestId'),
      meta: { sentenceId, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to delete sentence' }, 500);
  }
});

app.post('/:id/sentences/reorder', zValidator('json', reorderSentencesSchema), async (c) => {
  const storyId = c.req.param('id');
  const { sentenceIds } = c.req.valid('json');
  const { stories } = getServices(c.env);

  try {
    await stories.reorderSentences(storyId, sentenceIds);
    return c.json({ success: true });
  } catch (err) {
    logWithContext('error', 'stories.sentence.reorder_failed', {
      requestId: c.get('requestId'),
      meta: { storyId, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to reorder sentences' }, 500);
  }
});

// --- VOCABULARY ---

app.post('/:id/vocabulary', zValidator('json', addVocabularySchema), async (c) => {
  const storyId = c.req.param('id');
  const { vocabId, contextSentence } = c.req.valid('json');
  const { stories } = getServices(c.env);

  try {
    await stories.addVocabulary(storyId, vocabId, contextSentence);
    return c.json({ success: true }, 201);
  } catch (err) {
    logWithContext('error', 'stories.vocabulary.add_failed', {
      requestId: c.get('requestId'),
      meta: { storyId, vocabId, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to add vocabulary' }, 500);
  }
});

app.delete('/:id/vocabulary/:vocabId', async (c) => {
  const storyId = c.req.param('id');
  const vocabId = c.req.param('vocabId');
  const { stories } = getServices(c.env);

  try {
    await stories.removeVocabulary(storyId, vocabId);
    return c.json({ success: true });
  } catch (err) {
    logWithContext('error', 'stories.vocabulary.remove_failed', {
      requestId: c.get('requestId'),
      meta: { storyId, vocabId, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to remove vocabulary' }, 500);
  }
});

// --- QUESTIONS ---

app.post('/:id/questions', zValidator('json', createQuestionSchema), async (c) => {
  const storyId = c.req.param('id');
  const data = c.req.valid('json');
  const { stories } = getServices(c.env);

  try {
    const question = await stories.addQuestion(storyId, data);
    return c.json({ question }, 201);
  } catch (err) {
    logWithContext('error', 'stories.question.add_failed', {
      requestId: c.get('requestId'),
      meta: { storyId, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to add question' }, 500);
  }
});

app.put('/:id/questions/:questionId', zValidator('json', createQuestionSchema.partial()), async (c) => {
  const questionId = c.req.param('questionId');
  const data = c.req.valid('json');
  const { stories } = getServices(c.env);

  try {
    await stories.updateQuestion(questionId, data);
    return c.json({ success: true });
  } catch (err) {
    logWithContext('error', 'stories.question.update_failed', {
      requestId: c.get('requestId'),
      meta: { questionId, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to update question' }, 500);
  }
});

app.delete('/:id/questions/:questionId', async (c) => {
  const questionId = c.req.param('questionId');
  const { stories } = getServices(c.env);

  try {
    await stories.deleteQuestion(questionId);
    return c.json({ success: true });
  } catch (err) {
    logWithContext('error', 'stories.question.delete_failed', {
      requestId: c.get('requestId'),
      meta: { questionId, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to delete question' }, 500);
  }
});

// --- FILE UPLOADS ---

app.post('/:id/cover', async (c) => {
  const storyId = c.req.param('id');
  
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
      return c.json({ error: 'Invalid image type' }, 400);
    }

    // Upload to R2
    const ext = cover.name.split('.').pop() || 'jpg';
    const r2Key = `images/stories/${storyId}.${ext}`;
    
    await c.env.CONTENT_BUCKET.put(r2Key, await cover.arrayBuffer(), {
      httpMetadata: { contentType: cover.type },
    });

    // Update story
    const { stories } = getServices(c.env);
    await stories.uploadCoverImage(storyId, r2Key);

    return c.json({ success: true, r2Key });
  } catch (err) {
    logWithContext('error', 'stories.cover.upload_failed', {
      requestId: c.get('requestId'),
      meta: { storyId, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to upload cover' }, 500);
  }
});

app.post('/:id/sentences/:sentenceId/audio', async (c) => {
  const storyId = c.req.param('id');
  const sentenceId = c.req.param('sentenceId');
  
  try {
    const formData = await c.req.formData();
    const audio = formData.get('audio') as File | null;
    
    if (!audio) {
      return c.json({ error: 'No audio file provided' }, 400);
    }

    if (audio.size > 10 * 1024 * 1024) {
      return c.json({ error: 'Audio file too large (max 10MB)' }, 400);
    }

    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/x-m4a', 'audio/wav'];
    if (!allowedTypes.includes(audio.type)) {
      return c.json({ error: 'Invalid audio type' }, 400);
    }

    // Upload to R2
    const ext = audio.name.split('.').pop() || 'mp3';
    const r2Key = `stories/sentences/${storyId}/${sentenceId}.${ext}`;
    
    await c.env.CONTENT_BUCKET.put(r2Key, await audio.arrayBuffer(), {
      httpMetadata: { contentType: audio.type },
    });

    // Update sentence
    const { stories } = getServices(c.env);
    await stories.uploadSentenceAudio(sentenceId, r2Key);

    return c.json({ success: true, r2Key });
  } catch (err) {
    logWithContext('error', 'stories.audio.upload_failed', {
      requestId: c.get('requestId'),
      meta: { storyId, sentenceId, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to upload audio' }, 500);
  }
});

export default app;

