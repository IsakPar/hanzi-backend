import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { lessons, lessonBlocks, vocabulary } from '../schema';
import { eq, asc, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../types/app';
import { apiRateLimit } from '../middleware/rate-limit';

const app = new Hono<AppEnv>();

// Apply rate limiting
app.use('/*', apiRateLimit);

// Helper: Get vocab stats for a list of vocab IDs
async function getVocabStats(db: ReturnType<typeof drizzle>, vocabIds: string[]) {
  if (vocabIds.length === 0) {
    return { total: 0, withAudio: 0, withSecondary: 0, untagged: 0 };
  }

  const vocabRows = await db
    .select({
      id: vocabulary.id,
      wordAudioR2Key: vocabulary.wordAudioR2Key,
      secondaryCategories: vocabulary.secondaryCategories,
    })
    .from(vocabulary)
    .where(inArray(vocabulary.id, vocabIds));

  const total = vocabRows.length;
  const withAudio = vocabRows.filter(v => v.wordAudioR2Key).length;
  const withSecondary = vocabRows.filter(v => {
    const cats = v.secondaryCategories as string[] | null;
    return cats && cats.length > 0;
  }).length;

  return {
    total,
    withAudio,
    withSecondary,
    untagged: total - withSecondary,
  };
}

// GET /lessons/summary - Get all lessons with vocab stats (for dropdown)
app.get('/summary', async (c) => {
  const db = drizzle(c.env.DB);
  
  // Get all lessons (including drafts for the portal)
  const allLessons = await db
    .select({
      id: lessons.id,
      title: lessons.title,
      hskLevel: lessons.hskLevel,
      lessonNumber: lessons.lessonNumber,
      contentStatus: lessons.contentStatus,
      targetVocabulary: lessons.targetVocabulary,
    })
    .from(lessons)
    .orderBy(asc(lessons.hskLevel), asc(lessons.lessonNumber));

  // Calculate stats for each lesson
  const summaries = await Promise.all(
    allLessons.map(async (lesson) => {
      const vocabIds = (lesson.targetVocabulary as string[]) || [];
      const stats = await getVocabStats(db, vocabIds);
      
      return {
        id: lesson.id,
        title: lesson.title,
        hskLevel: lesson.hskLevel,
        lessonNumber: lesson.lessonNumber,
        contentStatus: lesson.contentStatus,
        vocabCount: stats.total,
        withAudio: stats.withAudio,
        withSecondary: stats.withSecondary,
        untaggedCount: stats.untagged,
      };
    })
  );

  return c.json({ lessons: summaries });
});

// 1. GET /lessons - List all published lessons
// NOTE: Returns array directly (not wrapped) for backwards compatibility
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const allLessons = await db.select().from(lessons).where(eq(lessons.isPublished, true));
  return c.json(allLessons);
});

// GET /lessons/:id/checklist - Get lesson completion checklist
app.get('/:id/checklist', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  try {
    // Fetch lesson
    const lessonResult = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
    const lesson = lessonResult[0];

    if (!lesson) {
      return c.json({ error: 'Lesson not found' }, 404);
    }

    // Get vocabulary stats
    const vocabIds = (lesson.targetVocabulary as string[]) || [];
    const vocabStats = await getVocabStats(db, vocabIds);

    // Get blocks and check for audio
    const blocks = await db.select()
      .from(lessonBlocks)
      .where(eq(lessonBlocks.lessonId, id))
      .orderBy(asc(lessonBlocks.orderIndex));

    // Count blocks and blocks with audio
    const blockStats = {
      total: blocks.length,
      withAudio: blocks.filter(b => {
        const content = b.content as { audioR2Key?: string };
        return !!content?.audioR2Key;
      }).length,
    };

    // Build checklist
    const checklist = {
      vocabulary: {
        total: vocabStats.total,
        withAudio: vocabStats.withAudio,
        withSecondary: vocabStats.withSecondary,
        complete: vocabStats.total > 0 && vocabStats.untagged === 0,
      },
      blocks: {
        total: blockStats.total,
        withAudio: blockStats.withAudio,
        complete: blockStats.total > 0 && blockStats.withAudio === blockStats.total,
      },
      overallComplete: 
        vocabStats.total > 0 && 
        vocabStats.untagged === 0 && 
        blockStats.total > 0,
    };

    return c.json({
      lessonId: id,
      title: lesson.title,
      checklist,
    });
  } catch (err) {
    return c.json({ error: 'Failed to get checklist' }, 500);
  }
});

// 2. GET /lessons/:id - Get full lesson with blocks
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  // Fetch lesson metadata
  const lessonResult = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  const lesson = lessonResult[0];

  if (!lesson) {
    return c.json({ error: 'Lesson not found' }, 404);
  }

  // Fetch blocks
  const blocks = await db.select()
    .from(lessonBlocks)
    .where(eq(lessonBlocks.lessonId, id))
    .orderBy(asc(lessonBlocks.orderIndex));

  // Combine into the JSON structure the frontend expects
  return c.json({
    ...lesson,
    blocks: blocks.map(b => ({
      id: b.id,
      type: b.type,
      ...b.content as object // Spread the JSON content
    }))
  });
});

export default app;


