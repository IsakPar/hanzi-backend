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
import { 
  lessons, 
  vocabulary, 
  curriculumVersion, 
  stories, 
  storySentences, 
  contentLibrary,
  lessonBlocks,
  lessonBlockSlots,
  slotAlternatives,
  blockConnectedWords,
} from '../schema';
import { drizzle } from 'drizzle-orm/d1';
import { createHash } from 'crypto';
import { ChineseTokenizer, type Token } from '../utils/tokenizer';
import { publicRateLimit } from '../middleware/rate-limit';

const app = new Hono<AppEnv>();

// Apply rate limiting (public curriculum endpoints)
app.use('/*', publicRateLimit);

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

/**
 * GET /v1/curriculum/vocab-export
 * Export ALL vocabulary for Python validator (not just lesson-assigned)
 * Use this when you don't have lessons yet but want health check to work
 * Returns: { version, words: { hanzi: "hskX", ... }, wordCount }
 */
app.get('/vocab-export', async (c) => {
  const db = drizzle(c.env.DB);

  // Get ALL vocabulary
  const allVocab = await db
    .select({
      id: vocabulary.id,
      hanzi: vocabulary.hanzi,
      hskLevel: vocabulary.hskLevel,
    })
    .from(vocabulary);

  // Create simple lookup: hanzi -> "hskX" (use HSK level as position)
  const words: Record<string, string> = {};
  for (const v of allVocab) {
    // Use format like "hsk1-l0" (lesson 0 = database vocab, not from lesson)
    words[v.hanzi] = `hsk${v.hskLevel}-l0`;
  }

  // Version hash based on vocab content
  const hash = createHash('md5')
    .update(JSON.stringify(words))
    .digest('hex');

  return c.json({
    version: hash,
    wordCount: allVocab.length,
    lessonCount: 0,
    words,
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

// ═══════════════════════════════════════════════════════════
// HSK LEVEL DOWNLOAD (for mobile app offline mode)
// ═══════════════════════════════════════════════════════════

interface VocabDownload {
  id: string;
  hanzi: string;
  pinyin: string;
  english: string;
  category: string;
  hskLevel: number;
  introLessonIndex: number;  // Derived: first lesson number where word appears
  wordAudioR2Key: string | null;
  exampleChinese: string | null;
  examplePinyin: string | null;
  exampleEnglish: string | null;
  exampleAudioR2Key: string | null;
}

// Practice data types for lesson alternatives
interface SlotDownload {
  wordId: string;
  hanzi: string;
  position: number;
  isFocus: boolean;
  alternatives: string[];  // Word IDs of approved alternatives
}

interface LessonPracticeData {
  slots: SlotDownload[];
  connectedWords: string[];  // Word IDs of approved connected words
}

interface LessonDownload {
  id: string;
  lessonNumber: number;
  title: string;
  description: string | null;
  targetVocabulary: string[];  // Word IDs introduced in this lesson
  practiceData?: LessonPracticeData;  // Slots with alternatives + connected words
}

interface HskLevelDownload {
  hskLevel: number;
  contentVersion: string;
  schemaVersion: number;
  downloadedAt: string;
  vocabulary: VocabDownload[];
  lessons: LessonDownload[];
  stats: {
    totalWords: number;
    totalLessons: number;
  };
}

/**
 * GET /v1/curriculum/hsk/:level/download
 * Download complete HSK level for offline use
 * Returns all vocabulary and lessons for that level
 */
app.get('/hsk/:level/download', async (c) => {
  const db = drizzle(c.env.DB);
  const level = parseInt(c.req.param('level'));

  if (isNaN(level) || level < 1 || level > 9) {
    return c.json({ error: 'Invalid HSK level. Must be 1-9.' }, 400);
  }

  // 1. Get all published lessons for this HSK level
  const levelLessons = await db
    .select({
      id: lessons.id,
      lessonNumber: lessons.lessonNumber,
      title: lessons.title,
      description: lessons.description,
      targetVocabulary: lessons.targetVocabulary,
    })
    .from(lessons)
    .where(and(
      eq(lessons.hskLevel, level),
      eq(lessons.isPublished, true)
    ))
    .orderBy(asc(lessons.lessonNumber));

  // 2. Build word -> introLessonIndex mapping from targetVocabulary
  const wordIntroLesson = new Map<string, number>();
  for (const lesson of levelLessons) {
    const targetVocab = (lesson.targetVocabulary as string[]) || [];
    for (const vocabId of targetVocab) {
      // Only record first appearance
      if (!wordIntroLesson.has(vocabId)) {
        wordIntroLesson.set(vocabId, lesson.lessonNumber);
      }
    }
  }

  // 3. Get all vocabulary for this HSK level
  const levelVocab = await db
    .select({
      id: vocabulary.id,
      hanzi: vocabulary.hanzi,
      pinyin: vocabulary.pinyin,
      english: vocabulary.english,
      category: vocabulary.category,
      hskLevel: vocabulary.hskLevel,
      wordAudioR2Key: vocabulary.wordAudioR2Key,
      exampleChinese: vocabulary.exampleChinese,
      examplePinyin: vocabulary.examplePinyin,
      exampleEnglish: vocabulary.exampleEnglish,
      exampleAudioR2Key: vocabulary.exampleAudioR2Key,
    })
    .from(vocabulary)
    .where(eq(vocabulary.hskLevel, level))
    .orderBy(asc(vocabulary.hanzi));

  // 4. Enrich vocabulary with introLessonIndex
  const vocabDownload: VocabDownload[] = levelVocab.map(v => ({
    id: v.id,
    hanzi: v.hanzi,
    pinyin: v.pinyin,
    english: v.english,
    category: v.category || 'general',
    hskLevel: v.hskLevel,
    introLessonIndex: wordIntroLesson.get(v.id) ?? 999,  // 999 = not in any lesson yet
    wordAudioR2Key: v.wordAudioR2Key,
    exampleChinese: v.exampleChinese,
    examplePinyin: v.examplePinyin,
    exampleEnglish: v.exampleEnglish,
    exampleAudioR2Key: v.exampleAudioR2Key,
  }));

  // 5. Fetch practice data (slots, alternatives, connected words) for each lesson
  const lessonsDownload: LessonDownload[] = [];
  
  for (const lesson of levelLessons) {
    // Get all blocks for this lesson
    const blocks = await db
      .select({ id: lessonBlocks.id })
      .from(lessonBlocks)
      .where(eq(lessonBlocks.lessonId, lesson.id));
    
    const blockIds = blocks.map(b => b.id);
    
    // Get slots for all blocks
    let allSlots: SlotDownload[] = [];
    let allConnectedWords: string[] = [];
    
    if (blockIds.length > 0) {
      // For each block, get slots with their alternatives
      for (const blockId of blockIds) {
        // Get slots for this block
        const slots = await db
          .select({
            id: lessonBlockSlots.id,
            wordId: lessonBlockSlots.wordId,
            hanzi: lessonBlockSlots.hanzi,
            position: lessonBlockSlots.position,
            isFocus: lessonBlockSlots.isFocus,
          })
          .from(lessonBlockSlots)
          .where(eq(lessonBlockSlots.blockId, blockId))
          .orderBy(asc(lessonBlockSlots.position));
        
        // For each slot, get approved alternatives
        for (const slot of slots) {
          const alternatives = await db
            .select({ wordId: slotAlternatives.wordId })
            .from(slotAlternatives)
            .where(and(
              eq(slotAlternatives.slotId, slot.id),
              eq(slotAlternatives.isApproved, true)
            ));
          
          allSlots.push({
            wordId: slot.wordId,
            hanzi: slot.hanzi,
            position: slot.position,
            isFocus: slot.isFocus || false,
            alternatives: alternatives.map(a => a.wordId),
          });
        }
        
        // Get connected words for this block
        const connected = await db
          .select({ wordId: blockConnectedWords.wordId })
          .from(blockConnectedWords)
          .where(and(
            eq(blockConnectedWords.blockId, blockId),
            eq(blockConnectedWords.isApproved, true)
          ));
        
        allConnectedWords.push(...connected.map(c => c.wordId));
      }
    }
    
    // Dedupe connected words
    const uniqueConnectedWords = [...new Set(allConnectedWords)];
    
    // Build lesson download object
    const lessonDownload: LessonDownload = {
      id: lesson.id,
      lessonNumber: lesson.lessonNumber,
      title: lesson.title,
      description: lesson.description,
      targetVocabulary: (lesson.targetVocabulary as string[]) || [],
    };
    
    // Only add practiceData if there's actual data
    if (allSlots.length > 0 || uniqueConnectedWords.length > 0) {
      lessonDownload.practiceData = {
        slots: allSlots,
        connectedWords: uniqueConnectedWords,
      };
    }
    
    lessonsDownload.push(lessonDownload);
  }

  // 6. Generate content version hash
  const hashInput = JSON.stringify({
    level,
    vocabCount: vocabDownload.length,
    lessonCount: lessonsDownload.length,
    vocabIds: vocabDownload.map(v => v.id).sort(),
    lessonIds: lessonsDownload.map(l => l.id).sort(),
  });
  const contentVersion = createHash('md5').update(hashInput).digest('hex').slice(0, 16);

  const download: HskLevelDownload = {
    hskLevel: level,
    contentVersion,
    schemaVersion: 1,
    downloadedAt: new Date().toISOString(),
    vocabulary: vocabDownload,
    lessons: lessonsDownload,
    stats: {
      totalWords: vocabDownload.length,
      totalLessons: lessonsDownload.length,
    },
  };

  return c.json(download);
});

/**
 * GET /v1/curriculum/hsk/:level/version
 * Quick version check for HSK level (avoids full download if unchanged)
 */
app.get('/hsk/:level/version', async (c) => {
  const db = drizzle(c.env.DB);
  const level = parseInt(c.req.param('level'));

  if (isNaN(level) || level < 1 || level > 9) {
    return c.json({ error: 'Invalid HSK level. Must be 1-9.' }, 400);
  }

  // Quick counts
  const vocabCount = await db
    .select({ id: vocabulary.id })
    .from(vocabulary)
    .where(eq(vocabulary.hskLevel, level));

  const lessonCount = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(and(
      eq(lessons.hskLevel, level),
      eq(lessons.isPublished, true)
    ));

  // Generate version hash
  const hashInput = JSON.stringify({
    level,
    vocabCount: vocabCount.length,
    lessonCount: lessonCount.length,
  });
  const contentVersion = createHash('md5').update(hashInput).digest('hex').slice(0, 16);

  return c.json({
    hskLevel: level,
    contentVersion,
    vocabCount: vocabCount.length,
    lessonCount: lessonCount.length,
  });
});

export default app;

