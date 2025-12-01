/**
 * Stories Content Routes
 * Sentences, vocabulary, and questions management
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../../types/app';
import { createStoriesDomain } from '../../domains/stories';
import { logWithContext } from '../../utils/logger';
import {
  createSentenceSchema,
  updateSentenceSchema,
  reorderSentencesSchema,
  bulkSegmentsSchema,
  addVocabularySchema,
  createQuestionSchema,
} from './schemas';

const app = new Hono<AppEnv>();

const getServices = (env: AppEnv['Bindings']) => createStoriesDomain(env);

// ═══════════════════════════════════════════════════════════
// SENTENCES
// ═══════════════════════════════════════════════════════════

/**
 * POST /stories/:id/sentences
 * Add a new sentence to story
 */
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

/**
 * PUT /stories/:id/sentences/:sentenceId
 * Update a sentence
 */
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

/**
 * DELETE /stories/:id/sentences/:sentenceId
 * Delete a sentence
 */
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

/**
 * POST /stories/:id/sentences/reorder
 * Reorder sentences
 */
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

/**
 * POST /stories/:id/segments/bulk
 * Bulk save segments - creates new, updates existing, deletes removed
 */
app.post('/:id/segments/bulk', zValidator('json', bulkSegmentsSchema), async (c) => {
  const storyId = c.req.param('id');
  const { segments } = c.req.valid('json');
  const { stories } = getServices(c.env);

  try {
    // Add orderIndex based on array position
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
// VOCABULARY
// ═══════════════════════════════════════════════════════════

/**
 * POST /stories/:id/vocabulary
 * Add vocabulary to story
 */
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

/**
 * DELETE /stories/:id/vocabulary/:vocabId
 * Remove vocabulary from story
 */
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

// ═══════════════════════════════════════════════════════════
// QUESTIONS
// ═══════════════════════════════════════════════════════════

/**
 * POST /stories/:id/questions
 * Add question to story
 */
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

/**
 * PUT /stories/:id/questions/:questionId
 * Update a question
 */
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

/**
 * DELETE /stories/:id/questions/:questionId
 * Delete a question
 */
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

export default app;

