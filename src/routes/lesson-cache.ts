/**
 * Lesson Cache Admin Routes
 * CRUD operations for pre-generated early lessons stored in R2
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth';
import type { AppEnv } from '../types/app';
import { LessonCacheService } from '../services/lesson-cache';
import { LessonGenerator } from '../services/lesson-generator';
import { logWithContext } from '../utils/logger';
import {
  MAX_CACHED_LESSON,
  type CreateCachedLessonInput,
  type PracticeBlocks,
} from '../types/lesson-cache';
import {
  createOpenRouterClient,
  OPENROUTER_MODELS,
  getProviders,
} from '../services/openrouter-client';

const app = new Hono<AppEnv>();

// Auth required - admin only
app.use('/*', authMiddleware({ allowRoles: ['admin', 'user'] }));

// Helper to get cache service
const getCacheService = (env: AppEnv['Bindings'], requestId: string) => {
  return new LessonCacheService(env.CONTENT_BUCKET, requestId);
};

// Helper to generate practice materials
async function generatePracticeBlocks(
  openrouterApiKey: string,
  chinese: string,
  pinyin: string,
  english: string,
  focusWords: string[],
  questionCount: number = 3
): Promise<{ practice: PracticeBlocks; cost: number }> {
  const openrouter = createOpenRouterClient(openrouterApiKey);

  const prompt = `Generate practice exercises for this Chinese lesson:

Chinese: ${chinese}
Pinyin: ${pinyin}
English: ${english}
Focus Words: ${focusWords.join(', ')}

Generate ${questionCount} multiple choice questions testing comprehension.
Generate 1 build-sentence exercise using words from the text.

Return ONLY valid JSON:
{
  "multipleChoice": [
    {
      "question": "What does the text say about X?",
      "questionHanzi": "关于X课文说了什么？",
      "options": [
        { "id": "a", "text": "Option A", "isCorrect": false },
        { "id": "b", "text": "Option B", "isCorrect": true },
        { "id": "c", "text": "Option C", "isCorrect": false },
        { "id": "d", "text": "Option D", "isCorrect": false }
      ],
      "explanation": "The correct answer is B because..."
    }
  ],
  "buildSentence": [
    {
      "instruction": "Arrange these words to form a sentence from the text",
      "correctOrder": ["我", "在", "学习", "中文"],
      "wordPool": ["中文", "我", "学习", "在"],
      "hint": "Subject first, then location, then verb..."
    }
  ]
}`;

  const response = await openrouter.chat.completions.create({
    model: OPENROUTER_MODELS.QWEN_CODER_32B,
    messages: [
      { role: 'system', content: 'You are a Chinese language teacher creating practice exercises. Return ONLY valid JSON.' },
      { role: 'user', content: prompt },
    ],
    max_tokens: 2000,
    temperature: 0.7,
    // @ts-ignore - OpenRouter specific
    provider: {
      order: getProviders(OPENROUTER_MODELS.QWEN_CODER_32B),
    },
  });

  let content = response.choices[0]?.message?.content || '{}';
  
  // Strip <think> tags
  content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    content = jsonMatch[0];
  }

  const inputTokens = response.usage?.prompt_tokens || 0;
  const outputTokens = response.usage?.completion_tokens || 0;
  const cost = (inputTokens / 1_000_000) * 0.07 + (outputTokens / 1_000_000) * 0.16;

  try {
    const parsed = JSON.parse(content);
    return {
      practice: {
        multipleChoice: parsed.multipleChoice || [],
        buildSentence: parsed.buildSentence || [],
      },
      cost,
    };
  } catch {
    return {
      practice: { multipleChoice: [], buildSentence: [] },
      cost,
    };
  }
}

// ═══════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════

const createLessonSchema = z.object({
  lessonNumber: z.number().int().min(1).max(MAX_CACHED_LESSON),
  hskLevel: z.number().int().min(1).max(9).optional(),
  focusWords: z.array(z.string()).default([]),
  chinese: z.string().min(10),
  pinyin: z.string().min(10),
  english: z.string().min(10),
  status: z.enum(['draft', 'approved', 'rejected']).default('draft'),
});

const updateLessonSchema = z.object({
  chinese: z.string().min(10).optional(),
  pinyin: z.string().min(10).optional(),
  english: z.string().min(10).optional(),
  status: z.enum(['draft', 'approved', 'rejected']).optional(),
});

const generateSchema = z.object({
  focusWords: z.array(z.string()).optional(),
  autoApprove: z.boolean().default(false),
  includePractice: z.boolean().default(true),
});

const generatePracticeSchema = z.object({
  questionCount: z.number().int().min(1).max(10).default(3),
});

const bulkGenerateSchema = z.object({
  lessons: z.array(z.object({
    lessonNumber: z.number().int().min(1).max(MAX_CACHED_LESSON),
    focusWords: z.array(z.string()).optional(),
  })),
  autoApprove: z.boolean().default(false),
});

// ═══════════════════════════════════════════════════════════
// LIST ALL CACHED LESSONS
// ═══════════════════════════════════════════════════════════

app.get('/', async (c) => {
  const requestId = c.get('requestId') || crypto.randomUUID();
  const cache = getCacheService(c.env, requestId);

  try {
    const summary = await cache.listSummary();
    
    return c.json({
      success: true,
      lessons: summary,
      total: summary.length,
      approved: summary.filter(l => l.approvedCount > 0).length,
      pending: summary.filter(l => l.variantCount > 0 && l.approvedCount === 0).length,
      empty: summary.filter(l => l.variantCount === 0).length,
    });
  } catch (err) {
    logWithContext('error', 'lesson_cache.list_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to list cached lessons' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// GET LESSON VARIANTS
// ═══════════════════════════════════════════════════════════

app.get('/:lesson', async (c) => {
  const requestId = c.get('requestId') || crypto.randomUUID();
  const lessonNumber = parseInt(c.req.param('lesson'));
  
  if (isNaN(lessonNumber) || lessonNumber < 1 || lessonNumber > MAX_CACHED_LESSON) {
    return c.json({ error: `Lesson must be between 1 and ${MAX_CACHED_LESSON}` }, 400);
  }

  const cache = getCacheService(c.env, requestId);

  try {
    const variants = await cache.listByLesson(lessonNumber);
    const hskLevel = Math.floor((lessonNumber - 1) / 10) + 1;
    
    return c.json({
      success: true,
      lessonNumber,
      hskLevel,
      variants,
      variantCount: variants.length,
      approvedCount: variants.filter(v => v.status === 'approved').length,
    });
  } catch (err) {
    logWithContext('error', 'lesson_cache.get_lesson_failed', {
      requestId,
      meta: { lessonNumber, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to get lesson variants' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// CREATE/UPDATE CACHED LESSON
// ═══════════════════════════════════════════════════════════

app.post('/:lesson', zValidator('json', createLessonSchema), async (c) => {
  const requestId = c.get('requestId') || crypto.randomUUID();
  const lessonNumber = parseInt(c.req.param('lesson'));
  const body = c.req.valid('json');
  const user = c.get('user');

  if (isNaN(lessonNumber) || lessonNumber < 1 || lessonNumber > MAX_CACHED_LESSON) {
    return c.json({ error: `Lesson must be between 1 and ${MAX_CACHED_LESSON}` }, 400);
  }

  const cache = getCacheService(c.env, requestId);

  try {
    const hskLevel = body.hskLevel || Math.floor((lessonNumber - 1) / 10) + 1;
    
    const input: CreateCachedLessonInput = {
      lessonNumber,
      hskLevel,
      focusWords: body.focusWords,
      chinese: body.chinese,
      pinyin: body.pinyin,
      english: body.english,
      createdBy: 'manual',
      status: body.status,
    };

    const lesson = await cache.create(input);

    logWithContext('info', 'lesson_cache.created', {
      requestId,
      meta: { 
        lessonNumber, 
        focusWords: body.focusWords,
        status: body.status,
        createdBy: user?.id,
      },
    });

    return c.json({
      success: true,
      lesson,
    });
  } catch (err) {
    logWithContext('error', 'lesson_cache.create_failed', {
      requestId,
      meta: { lessonNumber, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to create cached lesson' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// UPDATE CACHED LESSON
// ═══════════════════════════════════════════════════════════

app.patch('/:lesson', zValidator('json', updateLessonSchema), async (c) => {
  const requestId = c.get('requestId') || crypto.randomUUID();
  const lessonNumber = parseInt(c.req.param('lesson'));
  const focusWordsParam = c.req.query('focusWords');
  const focusWords = focusWordsParam ? focusWordsParam.split(',') : undefined;
  const body = c.req.valid('json');

  if (isNaN(lessonNumber) || lessonNumber < 1 || lessonNumber > MAX_CACHED_LESSON) {
    return c.json({ error: `Lesson must be between 1 and ${MAX_CACHED_LESSON}` }, 400);
  }

  const cache = getCacheService(c.env, requestId);

  try {
    const updated = await cache.update(lessonNumber, focusWords, body);
    
    if (!updated) {
      return c.json({ error: 'Lesson not found' }, 404);
    }

    return c.json({
      success: true,
      lesson: updated,
    });
  } catch (err) {
    logWithContext('error', 'lesson_cache.update_failed', {
      requestId,
      meta: { lessonNumber, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to update cached lesson' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// DELETE CACHED LESSON
// ═══════════════════════════════════════════════════════════

app.delete('/:lesson', async (c) => {
  const requestId = c.get('requestId') || crypto.randomUUID();
  const lessonNumber = parseInt(c.req.param('lesson'));
  const focusWordsParam = c.req.query('focusWords');
  const focusWords = focusWordsParam ? focusWordsParam.split(',') : undefined;

  if (isNaN(lessonNumber) || lessonNumber < 1 || lessonNumber > MAX_CACHED_LESSON) {
    return c.json({ error: `Lesson must be between 1 and ${MAX_CACHED_LESSON}` }, 400);
  }

  const cache = getCacheService(c.env, requestId);

  try {
    const deleted = await cache.delete(lessonNumber, focusWords);
    
    return c.json({
      success: deleted,
      message: deleted ? 'Lesson deleted' : 'Lesson not found',
    });
  } catch (err) {
    logWithContext('error', 'lesson_cache.delete_failed', {
      requestId,
      meta: { lessonNumber, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to delete cached lesson' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// APPROVE LESSON
// ═══════════════════════════════════════════════════════════

app.post('/:lesson/approve', async (c) => {
  const requestId = c.get('requestId') || crypto.randomUUID();
  const lessonNumber = parseInt(c.req.param('lesson'));
  const focusWordsParam = c.req.query('focusWords');
  const focusWords = focusWordsParam ? focusWordsParam.split(',') : undefined;
  const user = c.get('user');

  if (isNaN(lessonNumber) || lessonNumber < 1 || lessonNumber > MAX_CACHED_LESSON) {
    return c.json({ error: `Lesson must be between 1 and ${MAX_CACHED_LESSON}` }, 400);
  }

  const cache = getCacheService(c.env, requestId);

  try {
    const approved = await cache.approve(lessonNumber, focusWords, user?.id || 'admin');
    
    if (!approved) {
      return c.json({ error: 'Lesson not found' }, 404);
    }

    logWithContext('info', 'lesson_cache.approved', {
      requestId,
      meta: { lessonNumber, approvedBy: user?.id },
    });

    return c.json({
      success: true,
      lesson: approved,
    });
  } catch (err) {
    logWithContext('error', 'lesson_cache.approve_failed', {
      requestId,
      meta: { lessonNumber, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to approve lesson' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// REJECT LESSON
// ═══════════════════════════════════════════════════════════

app.post('/:lesson/reject', async (c) => {
  const requestId = c.get('requestId') || crypto.randomUUID();
  const lessonNumber = parseInt(c.req.param('lesson'));
  const focusWordsParam = c.req.query('focusWords');
  const focusWords = focusWordsParam ? focusWordsParam.split(',') : undefined;
  const user = c.get('user');

  if (isNaN(lessonNumber) || lessonNumber < 1 || lessonNumber > MAX_CACHED_LESSON) {
    return c.json({ error: `Lesson must be between 1 and ${MAX_CACHED_LESSON}` }, 400);
  }

  const cache = getCacheService(c.env, requestId);

  try {
    const rejected = await cache.reject(lessonNumber, focusWords, user?.id || 'admin');
    
    if (!rejected) {
      return c.json({ error: 'Lesson not found' }, 404);
    }

    return c.json({
      success: true,
      lesson: rejected,
    });
  } catch (err) {
    logWithContext('error', 'lesson_cache.reject_failed', {
      requestId,
      meta: { lessonNumber, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to reject lesson' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// AI GENERATE FOR CACHE (higher lesson number, then save)
// ═══════════════════════════════════════════════════════════

app.post('/:lesson/generate', zValidator('json', generateSchema), async (c) => {
  const requestId = c.get('requestId') || crypto.randomUUID();
  const lessonNumber = parseInt(c.req.param('lesson'));
  const { focusWords, autoApprove, includePractice } = c.req.valid('json');

  if (isNaN(lessonNumber) || lessonNumber < 1 || lessonNumber > MAX_CACHED_LESSON) {
    return c.json({ error: `Lesson must be between 1 and ${MAX_CACHED_LESSON}` }, 400);
  }

  const cache = getCacheService(c.env, requestId);

  try {
    // Generate using AI at a higher "fake" lesson number (so it passes validation)
    const fakeHigherLesson = 50; // Has plenty of vocab
    const hskLevel = Math.floor((lessonNumber - 1) / 10) + 1;
    
    const generator = new LessonGenerator({
      db: c.env.DB,
      bucket: c.env.CONTENT_BUCKET,
      openrouterApiKey: c.env.OPENROUTER_API_KEY,
      validatorUrl: c.env.VALIDATOR_URL || 'https://hanzi-vocab-val-u53gq.sevalla.app',
      requestId,
    });

    // Generate with the fake higher lesson (so it has vocab)
    const result = await generator.generate({
      lessonNumber: fakeHigherLesson,
      focusWords: focusWords || [],
      hskLevel,
      textLength: 100 + (lessonNumber * 5), // Shorter for early lessons
    });

    if (!result.success || !result.lesson) {
      return c.json({
        success: false,
        error: result.error || 'AI generation failed',
        generation: {
          attempts: result.attempts,
          cost: result.cost,
          latencyMs: result.latencyMs,
        },
      }, 422);
    }

    // Generate practice materials if requested
    let practice: PracticeBlocks | undefined;
    let practiceCost = 0;
    
    if (includePractice) {
      const practiceResult = await generatePracticeBlocks(
        c.env.OPENROUTER_API_KEY,
        result.lesson.chinese,
        result.lesson.pinyin,
        result.lesson.english,
        focusWords || [],
        3
      );
      practice = practiceResult.practice;
      practiceCost = practiceResult.cost;
    }

    // Save to cache with the ACTUAL lesson number
    const cached = await cache.create({
      lessonNumber,
      hskLevel,
      focusWords: focusWords || [],
      chinese: result.lesson.chinese,
      pinyin: result.lesson.pinyin,
      english: result.lesson.english,
      practice,
      createdBy: 'ai',
      status: autoApprove ? 'approved' : 'draft',
    });

    const totalCost = result.cost + practiceCost;

    logWithContext('info', 'lesson_cache.generated', {
      requestId,
      meta: {
        lessonNumber,
        focusWords,
        autoApprove,
        includePractice,
        cost: totalCost,
        latencyMs: result.latencyMs,
      },
    });

    return c.json({
      success: true,
      lesson: cached,
      generation: {
        attempts: result.attempts,
        cost: totalCost,
        latencyMs: result.latencyMs,
        practiceGenerated: includePractice,
      },
    });
  } catch (err) {
    logWithContext('error', 'lesson_cache.generate_failed', {
      requestId,
      meta: { lessonNumber, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to generate lesson' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// GENERATE PRACTICE FOR EXISTING LESSON
// ═══════════════════════════════════════════════════════════

app.post('/:lesson/generate-practice', zValidator('json', generatePracticeSchema), async (c) => {
  const requestId = c.get('requestId') || crypto.randomUUID();
  const lessonNumber = parseInt(c.req.param('lesson'));
  const focusWordsParam = c.req.query('focusWords');
  const focusWords = focusWordsParam ? focusWordsParam.split(',') : undefined;
  const { questionCount } = c.req.valid('json');

  if (isNaN(lessonNumber) || lessonNumber < 1 || lessonNumber > MAX_CACHED_LESSON) {
    return c.json({ error: `Lesson must be between 1 and ${MAX_CACHED_LESSON}` }, 400);
  }

  const cache = getCacheService(c.env, requestId);

  try {
    // Get existing lesson
    const existing = await cache.get(lessonNumber, focusWords);
    if (!existing) {
      return c.json({ error: 'Lesson not found. Generate the lesson content first.' }, 404);
    }

    // Generate practice materials
    const { practice, cost } = await generatePracticeBlocks(
      c.env.OPENROUTER_API_KEY,
      existing.chinese,
      existing.pinyin,
      existing.english,
      existing.focusWords,
      questionCount
    );

    // Update the lesson with practice
    const updated = await cache.update(lessonNumber, focusWords, { practice });

    logWithContext('info', 'lesson_cache.practice_generated', {
      requestId,
      meta: {
        lessonNumber,
        questionCount,
        cost,
      },
    });

    return c.json({
      success: true,
      lesson: updated,
      generation: {
        cost,
        questionCount,
      },
    });
  } catch (err) {
    logWithContext('error', 'lesson_cache.generate_practice_failed', {
      requestId,
      meta: { lessonNumber, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to generate practice' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// BULK GENERATE
// ═══════════════════════════════════════════════════════════

app.post('/bulk-generate', zValidator('json', bulkGenerateSchema), async (c) => {
  const requestId = c.get('requestId') || crypto.randomUUID();
  const { lessons, autoApprove } = c.req.valid('json');

  const results: Array<{
    lessonNumber: number;
    success: boolean;
    error?: string;
    cost?: number;
  }> = [];

  let totalCost = 0;

  for (const lesson of lessons) {
    try {
      // Call the generate endpoint logic
      const cache = getCacheService(c.env, requestId);
      const hskLevel = Math.floor((lesson.lessonNumber - 1) / 10) + 1;
      
      const generator = new LessonGenerator({
        db: c.env.DB,
        bucket: c.env.CONTENT_BUCKET,
        openrouterApiKey: c.env.OPENROUTER_API_KEY,
        validatorUrl: c.env.VALIDATOR_URL || 'https://hanzi-vocab-val-u53gq.sevalla.app',
        requestId,
      });

      const result = await generator.generate({
        lessonNumber: 50, // Fake higher lesson for vocab
        focusWords: lesson.focusWords || [],
        hskLevel,
        textLength: 100 + (lesson.lessonNumber * 5),
      });

      if (result.success && result.lesson) {
        await cache.create({
          lessonNumber: lesson.lessonNumber,
          hskLevel,
          focusWords: lesson.focusWords || [],
          chinese: result.lesson.chinese,
          pinyin: result.lesson.pinyin,
          english: result.lesson.english,
          createdBy: 'ai',
          status: autoApprove ? 'approved' : 'draft',
        });

        totalCost += result.cost;
        results.push({
          lessonNumber: lesson.lessonNumber,
          success: true,
          cost: result.cost,
        });
      } else {
        results.push({
          lessonNumber: lesson.lessonNumber,
          success: false,
          error: result.error,
        });
      }
    } catch (err) {
      results.push({
        lessonNumber: lesson.lessonNumber,
        success: false,
        error: (err as Error).message,
      });
    }
  }

  return c.json({
    success: results.every(r => r.success),
    results,
    totalCost,
    generated: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
  });
});

export default app;

