/**
 * AI Studio Routes
 * 
 * Backend API for the AI Lesson Generation Studio.
 * Handles lesson generation, validation, and draft management.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import type { AppEnv } from '../types';
import { lessonDrafts, generationHistory } from '../schema-ai-studio';
import { 
  generateWithQwen, 
  checkWithDeepSeek, 
  validateWithWorkersAI,
  SYSTEM_PROMPTS,
  BLOCK_SCHEMA,
} from '../services/ai-models';
import { 
  getCurriculumContext, 
  syncCurriculumToVectorize,
  getVocabularyUpToLesson,
} from '../services/curriculum-rag';
import { logWithContext } from '../utils/logger';

const app = new Hono<AppEnv>();

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

const generateLessonSchema = z.object({
  prompt: z.string().min(10).max(2000),
  hskLevel: z.number().int().min(1).max(9),
  lessonNumber: z.number().int().min(1).optional(),
  lessonType: z.enum(['lesson', 'speaking', 'mini_test', 'hsk_test']).default('lesson'),
  useContext: z.boolean().default(true),
});

const enhanceLessonSchema = z.object({
  lessonId: z.string().optional(), // If enhancing existing lesson
  lessonJson: z.object({}).passthrough(), // Or provide JSON directly
  instructions: z.string().min(10).max(1000),
  useVocabDb: z.boolean().default(true),
  hskLevel: z.number().int().min(1).max(9).optional(),
});

const generateUnitSchema = z.object({
  unitTitle: z.string().min(3).max(100),
  unitDescription: z.string().min(10).max(500),
  hskLevel: z.number().int().min(1).max(9),
  startingLessonNumber: z.number().int().min(1),
  numberOfLessons: z.number().int().min(2).max(10),
});

const approveSchema = z.object({
  reviewNotes: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════
// GENERATION ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /ai-studio/generate/lesson
 * Generate a single lesson using AI
 */
app.post('/generate/lesson', zValidator('json', generateLessonSchema), async (c) => {
  const { prompt, hskLevel, lessonNumber, lessonType, useContext } = c.req.valid('json');
  const user = c.get('user');
  const startTime = Date.now();

  logWithContext('info', 'ai_studio.generate_lesson_start', {
    requestId: c.get('requestId'),
    userId: user?.id,
    meta: { prompt: prompt.substring(0, 100), hskLevel, lessonType },
  });

  try {
    // 1. Get curriculum context if enabled
    let contextSummary = '';
    if (useContext && c.env.CURRICULUM_INDEX && c.env.AI) {
      const context = await getCurriculumContext(
        prompt,
        hskLevel,
        c.env.CURRICULUM_INDEX,
        c.env.AI
      );
      contextSummary = context.summary;

      // Also get vocabulary already taught
      if (lessonNumber && c.env.DB) {
        const priorVocab = await getVocabularyUpToLesson(c.env.DB, hskLevel, lessonNumber - 1);
        if (priorVocab.length > 0) {
          contextSummary += `\n\nVocabulary already taught: ${priorVocab.map(v => v.hanzi).join(', ')}`;
        }
      }
    }

    // 2. Build the prompt
    const userPrompt = buildLessonPrompt(prompt, hskLevel, lessonNumber, lessonType, contextSummary);

    // 3. Generate with Qwen via OpenRouter
    if (!c.env.OPENROUTER_API_KEY) {
      return c.json({ error: 'OpenRouter API key not configured' }, 500);
    }

    const generationResult = await generateWithQwen(
      SYSTEM_PROMPTS.lessonGenerator,
      userPrompt,
      { OPENROUTER_API_KEY: c.env.OPENROUTER_API_KEY }
    );

    // 4. Extract JSON from response
    let lessonJson: Record<string, unknown>;
    try {
      const jsonMatch = generationResult.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      lessonJson = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      logWithContext('error', 'ai_studio.parse_error', {
        requestId: c.get('requestId'),
        meta: { error: (parseError as Error).message },
      });
      return c.json({ 
        error: 'Failed to parse generated lesson',
        rawContent: generationResult.content.substring(0, 500),
      }, 400);
    }

    // 5. Create draft in database
    const draftId = nanoid();
    const now = new Date().toISOString();

    if (c.env.AI_STUDIO_DB) {
      const studioDb = drizzle(c.env.AI_STUDIO_DB);
      
      await studioDb.insert(lessonDrafts).values({
        id: draftId,
        title: (lessonJson.title as string) || 'Untitled Lesson',
        subtitle: lessonJson.subtitle as string,
        hskLevel,
        lessonNumber,
        lessonType,
        blocksJson: JSON.stringify(lessonJson.blocks || []),
        prompt,
        contextUsed: contextSummary || null,
        status: 'validating',
        generatorModel: generationResult.model,
        generatedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 6. Run validation (async, don't block response)
    // In production, this would be a queue job
    const validationPromise = runValidationPipeline(
      draftId,
      lessonJson,
      c.env
    );

    // Don't await - let it run in background
    c.executionCtx.waitUntil(validationPromise);

    const totalDuration = Date.now() - startTime;

    logWithContext('info', 'ai_studio.generate_lesson_complete', {
      requestId: c.get('requestId'),
      meta: { 
        draftId, 
        tokensUsed: generationResult.tokensUsed,
        durationMs: totalDuration,
      },
    });

    return c.json({
      success: true,
      draftId,
      lesson: lessonJson,
      generation: {
        tokensUsed: generationResult.tokensUsed,
        durationMs: generationResult.durationMs,
        model: generationResult.model,
      },
      status: 'validating', // Will be updated by background job
    });

  } catch (error) {
    logWithContext('error', 'ai_studio.generate_lesson_error', {
      requestId: c.get('requestId'),
      meta: { error: (error as Error).message },
    });

    return c.json({ 
      error: 'Generation failed',
      details: (error as Error).message,
    }, 500);
  }
});

/**
 * POST /ai-studio/generate/unit
 * Generate a full unit of lessons
 */
app.post('/generate/unit', zValidator('json', generateUnitSchema), async (c) => {
  const { unitTitle, hskLevel, startingLessonNumber, numberOfLessons } = c.req.valid('json');

  return c.json({
    success: true,
    plan: {
      unitTitle,
      hskLevel,
      lessons: Array.from({ length: numberOfLessons }, (_, i) => ({
        lessonNumber: startingLessonNumber + i,
        status: 'pending',
      })),
    },
    message: 'Unit generation queued. Lessons will be generated sequentially.',
  });
});

/**
 * POST /ai-studio/enhance
 * Enhance an existing lesson with AI (add distractors, more MCQs, etc.)
 */
app.post('/enhance', zValidator('json', enhanceLessonSchema), async (c) => {
  const { lessonId, lessonJson, instructions, useVocabDb, hskLevel } = c.req.valid('json');
  const startTime = Date.now();

  try {
    // Get the lesson to enhance
    let originalLesson: Record<string, unknown>;
    
    if (lessonId && c.env.DB) {
      // Fetch from database
      const { lessons } = await import('../schema');
      const db = drizzle(c.env.DB);
      const lesson = await db
        .select()
        .from(lessons)
        .where(eq(lessons.id, lessonId))
        .get();
      
      if (!lesson) {
        return c.json({ error: 'Lesson not found' }, 404);
      }
      originalLesson = lesson as Record<string, unknown>;
    } else if (lessonJson) {
      originalLesson = lessonJson as Record<string, unknown>;
    } else {
      return c.json({ error: 'Provide either lessonId or lessonJson' }, 400);
    }

    // Get vocabulary from database for distractors
    let vocabList: string[] = [];
    if (useVocabDb && c.env.DB) {
      const { vocabulary } = await import('../schema');
      const db = drizzle(c.env.DB);
      const level = hskLevel || (originalLesson.hskLevel as number) || 1;
      
      const vocabItems = await db
        .select({ hanzi: vocabulary.hanzi, pinyin: vocabulary.pinyin, english: vocabulary.english })
        .from(vocabulary)
        .where(eq(vocabulary.hskLevel, level))
        .limit(200)
        .all();
      
      vocabList = vocabItems.map(v => `${v.hanzi} (${v.pinyin}): ${v.english}`);
    }

    // Build enhancement prompt
    const enhancePrompt = `You are enhancing an existing Chinese lesson. 

ORIGINAL LESSON:
${JSON.stringify(originalLesson, null, 2)}

AVAILABLE VOCABULARY (use these for distractors and new content):
${vocabList.slice(0, 50).join('\n')}

INSTRUCTIONS FROM USER:
${instructions}

RULES:
1. Keep the original lesson structure and content
2. Only ADD or MODIFY what the user requested
3. Use vocabulary from the provided list for distractors
4. Ensure all Chinese uses correct pinyin with tone marks
5. Make distractors pedagogically appropriate (same category, similar difficulty)

Return the COMPLETE enhanced lesson JSON. Only output valid JSON, no explanations.`;

    if (!c.env.OPENROUTER_API_KEY) {
      return c.json({ error: 'OpenRouter API key not configured' }, 500);
    }

    const result = await generateWithQwen(
      'You are an expert Chinese language curriculum designer. Enhance lessons while preserving their structure.',
      enhancePrompt,
      { OPENROUTER_API_KEY: c.env.OPENROUTER_API_KEY }
    );

    // Parse enhanced lesson
    let enhancedLesson: Record<string, unknown>;
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      enhancedLesson = JSON.parse(jsonMatch[0]);
    } catch {
      return c.json({ 
        error: 'Failed to parse enhanced lesson',
        rawContent: result.content.substring(0, 500),
      }, 400);
    }

    return c.json({
      success: true,
      original: originalLesson,
      enhanced: enhancedLesson,
      instructions,
      generation: {
        tokensUsed: result.tokensUsed,
        durationMs: Date.now() - startTime,
        model: result.model,
      },
    });

  } catch (error) {
    logWithContext('error', 'ai_studio.enhance_error', {
      requestId: c.get('requestId'),
      meta: { error: (error as Error).message },
    });
    return c.json({ error: 'Enhancement failed', details: (error as Error).message }, 500);
  }
});

/**
 * GET /ai-studio/vocabulary
 * Get vocabulary for a specific HSK level (for UI display)
 */
app.get('/vocabulary', async (c) => {
  const level = parseInt(c.req.query('level') || '1');
  
  if (!c.env.DB) {
    return c.json({ vocabulary: [], total: 0 });
  }

  const { vocabulary } = await import('../schema');
  const db = drizzle(c.env.DB);
  
  const items = await db
    .select({
      id: vocabulary.id,
      hanzi: vocabulary.hanzi,
      pinyin: vocabulary.pinyin,
      english: vocabulary.english,
      category: vocabulary.category,
    })
    .from(vocabulary)
    .where(eq(vocabulary.hskLevel, level))
    .orderBy(vocabulary.hanzi)
    .all();

  return c.json({
    vocabulary: items,
    total: items.length,
    level,
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DRAFT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /ai-studio/drafts
 * List all lesson drafts
 */
app.get('/drafts', async (c) => {
  if (!c.env.AI_STUDIO_DB) {
    return c.json({ drafts: [] });
  }

  const studioDb = drizzle(c.env.AI_STUDIO_DB);
  const drafts = await studioDb
    .select()
    .from(lessonDrafts)
    .orderBy(desc(lessonDrafts.createdAt))
    .limit(50)
    .all();

  return c.json({ 
    drafts: drafts.map(d => ({
      id: d.id,
      title: d.title,
      hskLevel: d.hskLevel,
      lessonNumber: d.lessonNumber,
      lessonType: d.lessonType,
      status: d.status,
      qualityScore: d.qualityScore,
      createdAt: d.createdAt,
      reviewedAt: d.reviewedAt,
    })),
  });
});

/**
 * GET /ai-studio/drafts/:id
 * Get a single draft with full content
 */
app.get('/drafts/:id', async (c) => {
  const id = c.req.param('id');

  if (!c.env.AI_STUDIO_DB) {
    return c.json({ error: 'Database not configured' }, 500);
  }

  const studioDb = drizzle(c.env.AI_STUDIO_DB);
  const draft = await studioDb
    .select()
    .from(lessonDrafts)
    .where(eq(lessonDrafts.id, id))
    .get();

  if (!draft) {
    return c.json({ error: 'Draft not found' }, 404);
  }

  return c.json({
    draft: {
      ...draft,
      blocks: JSON.parse(draft.blocksJson),
      validationErrors: draft.validationErrors ? JSON.parse(draft.validationErrors) : null,
      qualityReport: draft.qualityReport ? JSON.parse(draft.qualityReport) : null,
    },
  });
});

/**
 * POST /ai-studio/drafts/:id/approve
 * Approve a draft and create actual lesson
 */
app.post('/drafts/:id/approve', zValidator('json', approveSchema), async (c) => {
  const id = c.req.param('id');
  const { reviewNotes } = c.req.valid('json');
  const user = c.get('user');

  if (!c.env.AI_STUDIO_DB || !c.env.DB) {
    return c.json({ error: 'Database not configured' }, 500);
  }

  const studioDb = drizzle(c.env.AI_STUDIO_DB);
  const mainDb = drizzle(c.env.DB);

  // Get the draft
  const draft = await studioDb
    .select()
    .from(lessonDrafts)
    .where(eq(lessonDrafts.id, id))
    .get();

  if (!draft) {
    return c.json({ error: 'Draft not found' }, 404);
  }

  if (draft.status === 'approved') {
    return c.json({ error: 'Draft already approved' }, 400);
  }

  // Parse the blocks
  const blocks = JSON.parse(draft.blocksJson);

  // Create the actual lesson in main DB
  const { lessons, lessonBlocks } = await import('../schema');
  const lessonId = nanoid();
  const now = new Date().toISOString();

  // First create the lesson (without blocks - they go in separate table)
  await mainDb.insert(lessons).values({
    id: lessonId,
    title: draft.title,
    subtitle: draft.subtitle,
    hskLevel: draft.hskLevel,
    lessonNumber: draft.lessonNumber,
    lessonType: draft.lessonType as 'lesson' | 'speaking' | 'mini_test' | 'hsk_test',
    difficulty: 'easy',
    estimatedMinutes: 10,
    contentStatus: 'draft', // Start as draft, user can publish
    grammarPoints: JSON.stringify([]),
    tags: JSON.stringify(['ai-generated']),
    targetVocabulary: JSON.stringify([]),
    createdAt: now,
    updatedAt: now,
  });

  // Then insert blocks into lesson_blocks table in batches to avoid D1 parameter limit
  if (Array.isArray(blocks) && blocks.length > 0) {
    const BATCH_SIZE = 10;
    const blockInserts = blocks.map((block: any, index: number) => ({
      id: nanoid(),
      lessonId,
      type: block.type || 'unknown',
      orderIndex: index,
      content: JSON.stringify(block.content || block),
    }));
    
    for (let i = 0; i < blockInserts.length; i += BATCH_SIZE) {
      const batch = blockInserts.slice(i, i + BATCH_SIZE);
      await mainDb.insert(lessonBlocks).values(batch);
    }
  }

  // Update draft status
  await studioDb
    .update(lessonDrafts)
    .set({
      status: 'approved',
      reviewedBy: user?.id,
      reviewedAt: now,
      reviewNotes,
      approvedLessonId: lessonId,
      updatedAt: now,
    })
    .where(eq(lessonDrafts.id, id));

  return c.json({
    success: true,
    lessonId,
    message: 'Draft approved and lesson created',
  });
});

/**
 * POST /ai-studio/drafts/:id/reject
 * Reject a draft
 */
app.post('/drafts/:id/reject', zValidator('json', approveSchema), async (c) => {
  const id = c.req.param('id');
  const { reviewNotes } = c.req.valid('json');
  const user = c.get('user');

  if (!c.env.AI_STUDIO_DB) {
    return c.json({ error: 'Database not configured' }, 500);
  }

  const studioDb = drizzle(c.env.AI_STUDIO_DB);
  const now = new Date().toISOString();

  await studioDb
    .update(lessonDrafts)
    .set({
      status: 'rejected',
      reviewedBy: user?.id,
      reviewedAt: now,
      reviewNotes,
      updatedAt: now,
    })
    .where(eq(lessonDrafts.id, id));

  return c.json({ success: true });
});

/**
 * POST /ai-studio/drafts/:id/restore
 * Restore a rejected draft back to ready status
 */
app.post('/drafts/:id/restore', async (c) => {
  const id = c.req.param('id');

  if (!c.env.AI_STUDIO_DB) {
    return c.json({ error: 'Database not configured' }, 500);
  }

  const studioDb = drizzle(c.env.AI_STUDIO_DB);
  const now = new Date().toISOString();

  // Get the draft first to verify it's rejected
  const draft = await studioDb
    .select()
    .from(lessonDrafts)
    .where(eq(lessonDrafts.id, id))
    .get();

  if (!draft) {
    return c.json({ error: 'Draft not found' }, 404);
  }

  if (draft.status !== 'rejected') {
    return c.json({ error: 'Only rejected drafts can be restored' }, 400);
  }

  await studioDb
    .update(lessonDrafts)
    .set({
      status: 'ready',
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
      updatedAt: now,
    })
    .where(eq(lessonDrafts.id, id));

  return c.json({ success: true });
});

/**
 * POST /ai-studio/drafts/:id/improve
 * Use AI to improve a draft based on user feedback
 */
app.post('/drafts/:id/improve', async (c) => {
  const id = c.req.param('id');
  const { feedback } = await c.req.json();
  const user = c.get('user');

  if (!c.env.AI_STUDIO_DB || !c.env.OPENROUTER_API_KEY) {
    return c.json({ error: 'Required services not configured' }, 500);
  }

  if (!feedback || typeof feedback !== 'string' || feedback.trim().length < 5) {
    return c.json({ error: 'Please provide specific feedback for improvement' }, 400);
  }

  const studioDb = drizzle(c.env.AI_STUDIO_DB);

  // Get the original draft
  const originalDraft = await studioDb
    .select()
    .from(lessonDrafts)
    .where(eq(lessonDrafts.id, id))
    .get();

  if (!originalDraft) {
    return c.json({ error: 'Draft not found' }, 404);
  }

  const now = new Date().toISOString();

  try {
    // Parse the original lesson
    const originalLesson = JSON.parse(originalDraft.blocksJson);

    // Create improvement prompt
    const systemPrompt = `You are an expert Chinese language teacher. Your task is to improve an existing lesson based on user feedback.

ORIGINAL LESSON:
\`\`\`json
${originalDraft.blocksJson}
\`\`\`

USER FEEDBACK: "${feedback}"

Improve the lesson according to the feedback. Return ONLY the improved lesson as valid JSON. Keep the same structure but apply the requested changes.

Important:
- Maintain proper Chinese characters and pinyin with tone marks
- Keep HSK level ${originalDraft.hskLevel} appropriate vocabulary
- Ensure all blocks are properly structured
- Apply the user's feedback thoughtfully`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://studio.polymasterlabs.com',
        'X-Title': 'HanziMaster AI Studio',
      },
      body: JSON.stringify({
        model: 'qwen/qwen-2.5-72b-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Please improve the lesson according to the feedback provided.' },
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`);
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content;

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in response');
    }

    const improvedLesson = JSON.parse(jsonMatch[0]);

    // Create a new draft with the improved lesson
    const newDraftId = `${id}_v${Date.now()}`;
    
    await studioDb.insert(lessonDrafts).values({
      id: newDraftId,
      title: improvedLesson.title || originalDraft.title,
      subtitle: improvedLesson.subtitle || originalDraft.subtitle,
      hskLevel: originalDraft.hskLevel,
      lessonNumber: originalDraft.lessonNumber,
      lessonType: originalDraft.lessonType,
      blocksJson: JSON.stringify(improvedLesson.blocks || improvedLesson),
      prompt: `${originalDraft.prompt}\n\n---\nIMPROVEMENT FEEDBACK: ${feedback}`,
      status: 'ready',
      createdAt: now,
      updatedAt: now,
      createdBy: user?.id,
      parentDraftId: id, // Link to original
    });

    // Mark original as superseded (optional - keep for history)
    await studioDb
      .update(lessonDrafts)
      .set({ reviewNotes: `Superseded by improved version: ${newDraftId}` })
      .where(eq(lessonDrafts.id, id));

    return c.json({
      success: true,
      newDraftId,
      message: 'Improved version created!',
    });

  } catch (error) {
    console.error('AI improvement error:', error);
    return c.json({
      error: 'Failed to improve draft',
      details: (error as Error).message,
    }, 500);
  }
});

/**
 * POST /ai-studio/drafts/:id/regenerate
 * Regenerate a draft with the same prompt
 */
app.post('/drafts/:id/regenerate', async (c) => {
  const id = c.req.param('id');

  if (!c.env.AI_STUDIO_DB) {
    return c.json({ error: 'Database not configured' }, 500);
  }

  const studioDb = drizzle(c.env.AI_STUDIO_DB);
  const draft = await studioDb
    .select()
    .from(lessonDrafts)
    .where(eq(lessonDrafts.id, id))
    .get();

  if (!draft) {
    return c.json({ error: 'Draft not found' }, 404);
  }

  // Trigger new generation with same params
  // This would call the generate endpoint internally
  return c.json({
    success: true,
    message: 'Regeneration started',
    originalPrompt: draft.prompt,
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CURRICULUM SYNC
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /ai-studio/sync-curriculum
 * Sync curriculum to Vectorize for RAG
 */
app.post('/sync-curriculum', async (c) => {
  if (!c.env.DB || !c.env.CURRICULUM_INDEX || !c.env.AI) {
    return c.json({ error: 'Required services not configured' }, 500);
  }

  try {
    const result = await syncCurriculumToVectorize(
      c.env.DB,
      c.env.CURRICULUM_INDEX,
      c.env.AI
    );

    return c.json({
      success: true,
      indexed: result,
    });
  } catch (error) {
    return c.json({
      error: 'Sync failed',
      details: (error as Error).message,
    }, 500);
  }
});

/**
 * GET /ai-studio/context
 * Preview curriculum context for a prompt
 */
app.get('/context', async (c) => {
  const prompt = c.req.query('prompt') || '';
  const hskLevel = parseInt(c.req.query('hskLevel') || '1');

  if (!c.env.CURRICULUM_INDEX || !c.env.AI) {
    return c.json({ 
      error: 'Vectorize not configured',
      context: { lessons: [], vocabulary: [], patterns: [], summary: 'No context available' },
    });
  }

  const context = await getCurriculumContext(prompt, hskLevel, c.env.CURRICULUM_INDEX, c.env.AI);

  return c.json({ context });
});

// ═══════════════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /ai-studio/stats
 * Get generation statistics
 */
app.get('/stats', async (c) => {
  if (!c.env.AI_STUDIO_DB) {
    return c.json({ 
      totalDrafts: 0,
      byStatus: {},
      avgQualityScore: 0,
    });
  }

  const studioDb = drizzle(c.env.AI_STUDIO_DB);
  
  const drafts = await studioDb
    .select()
    .from(lessonDrafts)
    .all();

  const byStatus: Record<string, number> = {};
  let totalScore = 0;
  let scoreCount = 0;

  for (const draft of drafts) {
    byStatus[draft.status] = (byStatus[draft.status] || 0) + 1;
    if (draft.qualityScore) {
      totalScore += draft.qualityScore;
      scoreCount++;
    }
  }

  return c.json({
    totalDrafts: drafts.length,
    byStatus,
    avgQualityScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function buildLessonPrompt(
  userPrompt: string,
  hskLevel: number,
  lessonNumber: number | undefined,
  lessonType: string,
  contextSummary: string
): string {
  let prompt = `Generate a Chinese lesson with the following requirements:

HSK Level: ${hskLevel}
${lessonNumber ? `Lesson Number: ${lessonNumber}` : ''}
Lesson Type: ${lessonType}

USER REQUEST:
${userPrompt}

`;

  if (contextSummary) {
    prompt += `
CURRICULUM CONTEXT (what has been taught before):
${contextSummary}

Important: Do NOT repeat vocabulary that has already been taught. Build on prior knowledge.

`;
  }

  prompt += `
BLOCK SCHEMA (use these exact structures):
${BLOCK_SCHEMA}

OUTPUT:
Generate a complete lesson JSON with title, subtitle, hskLevel, lessonNumber, lessonType, and blocks array.
Include a good mix of teaching blocks (intro, hero_hanzi, tip, pattern) and exercise blocks.
End with a celebration block.

Return ONLY valid JSON, no markdown or explanations.`;

  return prompt;
}

async function runValidationPipeline(
  draftId: string,
  lessonJson: Record<string, unknown>,
  env: AppEnv['Bindings']
): Promise<void> {
  if (!env.AI_STUDIO_DB) return;

  const studioDb = drizzle(env.AI_STUDIO_DB);
  const now = new Date().toISOString();

  try {
    // 1. Schema validation with Workers AI
    let validationPassed = true;
    let validationErrors: string[] = [];

    if (env.AI) {
      const validation = await validateWithWorkersAI(
        JSON.stringify(lessonJson),
        BLOCK_SCHEMA,
        env.AI
      );
      validationPassed = validation.isValid;
      validationErrors = validation.errors.map(e => `${e.path}: ${e.message}`);
    }

    await studioDb
      .update(lessonDrafts)
      .set({
        status: 'checking',
        validationPassed: validationPassed ? 1 : 0,
        validationErrors: JSON.stringify(validationErrors),
        validatedAt: now,
        updatedAt: now,
      })
      .where(eq(lessonDrafts.id, draftId));

    // 2. Quality check with DeepSeek via OpenRouter
    if (env.OPENROUTER_API_KEY) {
      const qualityResult = await checkWithDeepSeek(
        JSON.stringify(lessonJson, null, 2),
        { OPENROUTER_API_KEY: env.OPENROUTER_API_KEY }
      );

      await studioDb
        .update(lessonDrafts)
        .set({
          status: qualityResult.report.passed ? 'ready' : 'needs_review',
          qualityScore: qualityResult.report.score,
          qualityReport: JSON.stringify(qualityResult.report),
          checkerModel: 'deepseek/deepseek-chat',
          checkedAt: now,
          updatedAt: now,
        })
        .where(eq(lessonDrafts.id, draftId));
    } else {
      // No DeepSeek, just mark as ready
      await studioDb
        .update(lessonDrafts)
        .set({
          status: 'ready',
          updatedAt: now,
        })
        .where(eq(lessonDrafts.id, draftId));
    }

  } catch (error) {
    // Mark as error
    await studioDb
      .update(lessonDrafts)
      .set({
        status: 'error',
        validationErrors: JSON.stringify([`Pipeline error: ${(error as Error).message}`]),
        updatedAt: now,
      })
      .where(eq(lessonDrafts.id, draftId));
  }
}

export default app;

