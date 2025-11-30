/**
 * Derived Curriculum Service
 * 
 * Word positions are DERIVED from lessons:
 * - First appearance of a word in a lesson = its teaching position
 * - Python validator syncs this mapping for validation
 * - Full export includes stories for recommendation engine
 */

import { Hono } from 'hono';
import { eq, asc, and } from 'drizzle-orm';
import type { AppEnv } from '../types/app';
import { jwtAuthMiddleware } from '../middleware/jwt-auth';
import { lessons, vocabulary, curriculumVersion, stories, storySentences, contentLibrary } from '../schema';
import { drizzle } from 'drizzle-orm/d1';
import { createHash } from 'crypto';
import { ChineseTokenizer, type Token } from '../utils/tokenizer';

const app = new Hono<AppEnv>();

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface WordPosition {
  hanzi: string;
  vocabId: string;
  hsk: number;
  lesson: number;
  firstLesson: string; // e.g., "hsk1-l3"
}

interface DerivedCurriculum {
  version: string;
  wordCount: number;
  lessonCount: number;
  updatedAt: string;
  words: Record<string, WordPosition>; // hanzi -> position info
}

// ═══════════════════════════════════════════════════════════
// HELPER: Derive curriculum from lessons
// ═══════════════════════════════════════════════════════════

async function deriveCurriculum(db: ReturnType<typeof drizzle>): Promise<DerivedCurriculum> {
  // 1. Get all published lessons ordered by HSK level, then lesson number
  const allLessons = await db
    .select({
      id: lessons.id,
      hskLevel: lessons.hskLevel,
      lessonNumber: lessons.lessonNumber,
      targetVocabulary: lessons.targetVocabulary,
    })
    .from(lessons)
    .where(eq(lessons.isPublished, true))
    .orderBy(asc(lessons.hskLevel), asc(lessons.lessonNumber));

  // 2. Get vocabulary lookup (id -> hanzi)
  const allVocab = await db
    .select({
      id: vocabulary.id,
      hanzi: vocabulary.hanzi,
    })
    .from(vocabulary);

  const vocabLookup = new Map<string, string>();
  for (const v of allVocab) {
    vocabLookup.set(v.id, v.hanzi);
  }

  // 3. Build word -> first lesson mapping
  const wordPositions: Record<string, WordPosition> = {};
  let lessonCount = 0;

  for (const lesson of allLessons) {
    lessonCount++;
    const targetVocab = (lesson.targetVocabulary as string[]) || [];

    for (const vocabId of targetVocab) {
      const hanzi = vocabLookup.get(vocabId);
      if (!hanzi) continue; // Skip if vocab not found

      // Only record FIRST appearance
      if (!wordPositions[hanzi]) {
        wordPositions[hanzi] = {
          hanzi,
          vocabId,
          hsk: lesson.hskLevel,
          lesson: lesson.lessonNumber,
          firstLesson: `hsk${lesson.hskLevel}-l${lesson.lessonNumber}`,
        };
      }
    }
  }

  // 4. Create version hash
  const sortedWords = Object.keys(wordPositions).sort();
  const hashInput = sortedWords.map(w => `${w}:${wordPositions[w].firstLesson}`).join('|');
  const versionHash = createHash('md5').update(hashInput).digest('hex');

  return {
    version: versionHash,
    wordCount: Object.keys(wordPositions).length,
    lessonCount,
    updatedAt: new Date().toISOString(),
    words: wordPositions,
  };
}

// ═══════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS (for Python validator sync)
// ═══════════════════════════════════════════════════════════

/**
 * GET /v1/curriculum/version
 * Check if curriculum has changed (for efficient sync)
 */
app.get('/version', async (c) => {
  const db = drizzle(c.env.DB);
  const localVersion = c.req.header('X-Local-Version');

  // Get stored version
  const stored = await db
    .select()
    .from(curriculumVersion)
    .where(eq(curriculumVersion.id, 1))
    .limit(1);

  if (!stored[0]) {
    // No version stored yet - need to derive
    const derived = await deriveCurriculum(db);
    
    // Store it
    await db
      .insert(curriculumVersion)
      .values({
        id: 1,
        versionHash: derived.version,
        wordCount: derived.wordCount,
        lessonCount: derived.lessonCount,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: curriculumVersion.id,
        set: {
          versionHash: derived.version,
          wordCount: derived.wordCount,
          lessonCount: derived.lessonCount,
          updatedAt: new Date(),
        },
      });

    return c.json({
      version: derived.version,
      wordCount: derived.wordCount,
      lessonCount: derived.lessonCount,
      changed: localVersion !== derived.version,
    });
  }

  return c.json({
    version: stored[0].versionHash,
    wordCount: stored[0].wordCount,
    lessonCount: stored[0].lessonCount,
    changed: localVersion !== stored[0].versionHash,
  });
});

/**
 * GET /v1/curriculum/derived
 * Get full derived curriculum (word -> first lesson mapping)
 * Used by Python validator for sync
 */
app.get('/derived', async (c) => {
  const db = drizzle(c.env.DB);

  const derived = await deriveCurriculum(db);

  // Update stored version
  await db
    .insert(curriculumVersion)
    .values({
      id: 1,
      versionHash: derived.version,
      wordCount: derived.wordCount,
      lessonCount: derived.lessonCount,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: curriculumVersion.id,
      set: {
        versionHash: derived.version,
        wordCount: derived.wordCount,
        lessonCount: derived.lessonCount,
        updatedAt: new Date(),
      },
    });

  return c.json(derived);
});

/**
 * GET /v1/curriculum/export
 * Export simplified format for Python validator
 * Returns: { version, words: { hanzi: "hsk1-l3", ... } }
 */
app.get('/export', async (c) => {
  const db = drizzle(c.env.DB);

  const derived = await deriveCurriculum(db);

  // Simplified format: just hanzi -> firstLesson
  const simpleWords: Record<string, string> = {};
  for (const [hanzi, pos] of Object.entries(derived.words)) {
    simpleWords[hanzi] = pos.firstLesson;
  }

  return c.json({
    version: derived.version,
    wordCount: derived.wordCount,
    lessonCount: derived.lessonCount,
    words: simpleWords,
  });
});

// ═══════════════════════════════════════════════════════════
// ADMIN ENDPOINTS (for portal)
// ═══════════════════════════════════════════════════════════

/**
 * POST /v1/curriculum/refresh
 * Force recalculate and update version (admin only)
 */
app.post('/refresh', jwtAuthMiddleware({ allowRoles: ['admin'] }), async (c) => {
  const db = drizzle(c.env.DB);

  const derived = await deriveCurriculum(db);

  // Update stored version
  await db
    .insert(curriculumVersion)
    .values({
      id: 1,
      versionHash: derived.version,
      wordCount: derived.wordCount,
      lessonCount: derived.lessonCount,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: curriculumVersion.id,
      set: {
        versionHash: derived.version,
        wordCount: derived.wordCount,
        lessonCount: derived.lessonCount,
        updatedAt: new Date(),
      },
    });

  return c.json({
    success: true,
    version: derived.version,
    wordCount: derived.wordCount,
    lessonCount: derived.lessonCount,
  });
});

/**
 * GET /v1/curriculum/words-by-lesson/:hsk/:lesson
 * Get words that are safe/known at a specific lesson
 * Useful for AI prompt construction
 */
app.get('/words-by-lesson/:hsk/:lesson', async (c) => {
  const db = drizzle(c.env.DB);
  const hsk = parseInt(c.req.param('hsk'));
  const lesson = parseInt(c.req.param('lesson'));

  if (isNaN(hsk) || isNaN(lesson)) {
    return c.json({ error: 'Invalid HSK or lesson number' }, 400);
  }

  const derived = await deriveCurriculum(db);

  // Filter words that are "safe" at this position
  const safeWords: string[] = [];
  const targetWords: string[] = [];

  for (const [hanzi, pos] of Object.entries(derived.words)) {
    if (pos.hsk < hsk || (pos.hsk === hsk && pos.lesson < lesson)) {
      // Learned in previous lessons
      safeWords.push(hanzi);
    } else if (pos.hsk === hsk && pos.lesson === lesson) {
      // Currently learning
      targetWords.push(hanzi);
    }
    // Otherwise: future word, not safe
  }

  return c.json({
    position: `hsk${hsk}-l${lesson}`,
    safeWordsCount: safeWords.length,
    targetWordsCount: targetWords.length,
    safeWords,
    targetWords,
  });
});

// ═══════════════════════════════════════════════════════════
// FULL EXPORT (for Sevalla recommender + validator)
// ═══════════════════════════════════════════════════════════

interface VocabExport {
  id: string;
  hanzi: string;
  pinyin: string;
  hskLevel: number;
}

interface LessonExport {
  id: string;
  hskLevel: number;
  lessonNumber: number;
  title: string;
  targetVocabulary: string[]; // vocab IDs
}

interface StoryExport {
  id: string;
  title: string;
  hskLevel: number;
  difficulty: string;
  // Pre-tokenized by backend (Sevalla just does math on IDs)
  tokens: Token[];
  totalTokens: number;
  sentenceCount: number;
}

interface AudiobookExport {
  id: string;
  title: string;
  hskLevel: number;
  description: string | null;
  // Pre-tokenized by backend (Sevalla just does math on IDs)
  tokens: Token[];
  totalTokens: number;
}

interface FullExport {
  version: string;
  exportedAt: string;
  // Vocabulary (id -> hanzi for jieba seeding + lookups)
  vocabulary: VocabExport[];
  // Lessons in order (for cumulative word sets)
  lessons: LessonExport[];
  lessonOrder: string[]; // Lesson IDs in teaching order
  // Lesson -> words mapping (precomputed for Sevalla)
  lessonWordMap: Record<string, string[]>; // lessonId -> vocab IDs
  // Stories for recommendation
  stories: StoryExport[];
  // Audiobooks for recommendation  
  audiobooks: AudiobookExport[];
}

/**
 * GET /v1/curriculum/full-export
 * Full export for Sevalla service:
 * - All vocabulary with IDs
 * - All lessons in order with target vocabulary
 * - All stories with full text (for tokenization)
 * - All audiobooks with full text
 */
app.get('/full-export', async (c) => {
  const db = drizzle(c.env.DB);

  // 1. Get all vocabulary
  const allVocab = await db
    .select({
      id: vocabulary.id,
      hanzi: vocabulary.hanzi,
      pinyin: vocabulary.pinyin,
      hskLevel: vocabulary.hskLevel,
    })
    .from(vocabulary)
    .orderBy(asc(vocabulary.hskLevel), asc(vocabulary.hanzi));

  // 2. Get all published lessons in order
  const allLessons = await db
    .select({
      id: lessons.id,
      hskLevel: lessons.hskLevel,
      lessonNumber: lessons.lessonNumber,
      title: lessons.title,
      targetVocabulary: lessons.targetVocabulary,
    })
    .from(lessons)
    .where(eq(lessons.isPublished, true))
    .orderBy(asc(lessons.hskLevel), asc(lessons.lessonNumber));

  // 3. Build lesson order and lessonWordMap
  const lessonOrder: string[] = [];
  const lessonWordMap: Record<string, string[]> = {};
  const lessonsExport: LessonExport[] = [];

  for (const lesson of allLessons) {
    lessonOrder.push(lesson.id);
    const targetVocab = (lesson.targetVocabulary as string[]) || [];
    lessonWordMap[lesson.id] = targetVocab;
    lessonsExport.push({
      id: lesson.id,
      hskLevel: lesson.hskLevel,
      lessonNumber: lesson.lessonNumber,
      title: lesson.title,
      targetVocabulary: targetVocab,
    });
  }

  // 4. Initialize tokenizer with vocabulary
  const tokenizer = new ChineseTokenizer();
  tokenizer.loadVocabulary(allVocab.map(v => ({ id: v.id, hanzi: v.hanzi })));

  // 5. Get all published stories with their sentences and pre-tokenize
  const allStories = await db
    .select({
      id: stories.id,
      title: stories.title,
      hskLevel: stories.hskLevel,
      difficulty: stories.difficulty,
    })
    .from(stories)
    .where(eq(stories.isPublished, true))
    .orderBy(asc(stories.hskLevel));

  // Get sentences for each story and tokenize
  const storiesExport: StoryExport[] = [];
  for (const story of allStories) {
    const sentences = await db
      .select({
        chinese: storySentences.chinese,
      })
      .from(storySentences)
      .where(eq(storySentences.storyId, story.id))
      .orderBy(asc(storySentences.orderIndex));

    // Concatenate all sentences and tokenize
    const fullText = sentences.map(s => s.chinese).join('');
    const tokens = tokenizer.tokenize(fullText);

    storiesExport.push({
      id: story.id,
      title: story.title,
      hskLevel: story.hskLevel,
      difficulty: story.difficulty || 'medium',
      tokens,
      totalTokens: tokens.length,
      sentenceCount: sentences.length,
    });
  }

  // 6. Get audiobooks from content library
  const allAudiobooks = await db
    .select({
      id: contentLibrary.id,
      title: contentLibrary.title,
      hskLevel: contentLibrary.hskLevel,
      description: contentLibrary.description,
    })
    .from(contentLibrary)
    .where(and(
      eq(contentLibrary.contentType, 'audiobook'),
      eq(contentLibrary.isPublished, true)
    ))
    .orderBy(asc(contentLibrary.hskLevel));

  // For now, audiobooks don't have transcript - just metadata
  // TODO: Add transcript support when available
  const audiobooksExport: AudiobookExport[] = allAudiobooks.map(ab => ({
    id: ab.id,
    title: ab.title,
    hskLevel: ab.hskLevel || 1,
    description: ab.description,
    tokens: [], // No transcript yet
    totalTokens: 0,
  }));

  // 6. Create version hash
  const hashInput = JSON.stringify({
    vocabCount: allVocab.length,
    lessonCount: lessonsExport.length,
    storyCount: storiesExport.length,
    audiobookCount: audiobooksExport.length,
    lessonOrder,
  });
  const versionHash = createHash('md5').update(hashInput).digest('hex').slice(0, 12);

  const fullExport: FullExport = {
    version: versionHash,
    exportedAt: new Date().toISOString(),
    vocabulary: allVocab,
    lessons: lessonsExport,
    lessonOrder,
    lessonWordMap,
    stories: storiesExport,
    audiobooks: audiobooksExport,
  };

  return c.json(fullExport);
});

/**
 * GET /v1/curriculum/full-export/version
 * Quick version check for Sevalla (avoids full export if unchanged)
 */
app.get('/full-export/version', async (c) => {
  const db = drizzle(c.env.DB);

  // Quick counts for version hash
  const vocabCount = await db.select({ count: vocabulary.id }).from(vocabulary);
  const lessonCount = await db
    .select({ count: lessons.id })
    .from(lessons)
    .where(eq(lessons.isPublished, true));
  const storyCount = await db
    .select({ count: stories.id })
    .from(stories)
    .where(eq(stories.isPublished, true));

  const hashInput = JSON.stringify({
    vocabCount: vocabCount.length,
    lessonCount: lessonCount.length,
    storyCount: storyCount.length,
  });
  const versionHash = createHash('md5').update(hashInput).digest('hex').slice(0, 12);

  return c.json({
    version: versionHash,
    vocabCount: vocabCount.length,
    lessonCount: lessonCount.length,
    storyCount: storyCount.length,
  });
});

export default app;

