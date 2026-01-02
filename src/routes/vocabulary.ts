import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { jwtAuthMiddleware } from '../middleware/jwt-auth';
import { drizzle } from 'drizzle-orm/d1';
import { vocabulary, lessons } from '../schema';
import { eq, like, and, or, desc, asc, sql, inArray } from 'drizzle-orm';
import type { AppEnv } from '../types/app';
import { logWithContext } from '../utils/logger';
import { apiRateLimit } from '../middleware/rate-limit';
import { generateExampleSentence as generateExampleSentenceAI, translateWord as translateWordAI } from '../services/vocab-enhancer';
import { AIUsageLogger } from '../services/ai-usage-logger';

// ═══════════════════════════════════════════════════════════
// CDN CONFIGURATION
// ═══════════════════════════════════════════════════════════

function getCdnBaseUrl(env: AppEnv['Bindings']): string {
  return (env as Record<string, unknown>).CDN_BASE_URL as string || 'https://content.polymasterlabs.com';
}

// TTS API removed - using manual audio upload instead (see /v1/audio/upload)

/**
 * Escape special characters for LIKE queries to prevent injection
 * Escapes: % (wildcard), _ (single char), \ (escape char)
 */
function escapeLikePattern(value: string): string {
  return value
    .replace(/\\/g, '\\\\')  // Escape backslash first
    .replace(/%/g, '\\%')    // Escape percent
    .replace(/_/g, '\\_');   // Escape underscore
}

/**
 * Strip tone marks from pinyin for tone-agnostic search
 * Converts: nǐ hǎo → ni hao, māmā → mama, xuéxí → xuexi
 */
function stripToneMarks(text: string): string {
  const toneMap: Record<string, string> = {
    // a tones
    'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
    // e tones
    'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e',
    // i tones
    'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
    // o tones
    'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
    // u tones
    'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
    // ü tones (often written as v in simplified pinyin)
    'ǖ': 'v', 'ǘ': 'v', 'ǚ': 'v', 'ǜ': 'v', 'ü': 'v',
  };
  
  return text
    .split('')
    .map(char => toneMap[char] || char)
    .join('')
    .toLowerCase();
}

/**
 * Check if a string is likely pinyin (ASCII letters, spaces, and common punctuation only)
 */
function isProbablyPinyin(text: string): boolean {
  // If it contains Chinese characters, it's not pinyin
  if (/[\u4e00-\u9fff]/.test(text)) return false;
  // If it's mostly ASCII letters and spaces, it's probably pinyin
  return /^[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü\s]+$/.test(text);
}

/**
 * Build SQL expression to normalize pinyin in SQLite
 * This creates a chain of REPLACE calls to strip tone marks
 */
function buildPinyinNormalizeSQL(column: string): string {
  const replacements = [
    // a tones
    ['ā', 'a'], ['á', 'a'], ['ǎ', 'a'], ['à', 'a'],
    // e tones
    ['ē', 'e'], ['é', 'e'], ['ě', 'e'], ['è', 'e'],
    // i tones
    ['ī', 'i'], ['í', 'i'], ['ǐ', 'i'], ['ì', 'i'],
    // o tones
    ['ō', 'o'], ['ó', 'o'], ['ǒ', 'o'], ['ò', 'o'],
    // u tones
    ['ū', 'u'], ['ú', 'u'], ['ǔ', 'u'], ['ù', 'u'],
    // ü tones
    ['ǖ', 'v'], ['ǘ', 'v'], ['ǚ', 'v'], ['ǜ', 'v'], ['ü', 'v'],
  ];
  
  let expr = `LOWER(${column})`;
  for (const [from, to] of replacements) {
    expr = `REPLACE(${expr}, '${from}', '${to}')`;
  }
  return expr;
}

const app = new Hono<AppEnv>();

// Apply rate limiting
app.use('/*', apiRateLimit);

// Protect admin routes
app.use('/admin/*', jwtAuthMiddleware({ allowRoles: ['admin'] }));

// === VALIDATION SCHEMAS ===

const searchSchema = z.object({
  query: z.string().optional(),
  hsk_level: z.coerce.number().int().min(1).max(10).optional(),
  category: z.string().optional(),
  lesson_id: z.string().optional(), // Filter by lesson's targetVocabulary
  // Audio/completeness filters (server-side for proper pagination)
  has_audio: z.enum(['true', 'false']).optional(),
  has_example: z.enum(['true', 'false']).optional(),
  incomplete: z.enum(['true', 'false']).optional(),
  missing_secondary: z.enum(['true', 'false']).optional(),
  in_lesson: z.enum(['true', 'false']).optional(), // Filter by whether word is used in any lesson
  limit: z.coerce.number().int().min(1).max(1000).optional().default(50),  // Increased for bulk operations
  offset: z.coerce.number().int().min(0).optional().default(0),
  sort: z.enum(['hanzi', 'pinyin', 'hsk_level', 'category']).optional().default('hanzi'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});

const createVocabSchema = z.object({
  hanzi: z.string().min(1),
  pinyin: z.string().min(1),
  english: z.string().min(1),
  category: z.string().min(1),
  hskLevel: z.number().int().min(1).max(10),
  tags: z.array(z.string()).optional(),
  // Pedagogic metadata
  pos: z.string().optional(),
  tonePattern: z.string().optional(),
  secondaryCategories: z.array(z.string()).optional(),
  // Audio and examples
  wordAudioR2Key: z.string().optional(),
  exampleChinese: z.string().optional(),
  examplePinyin: z.string().optional(),
  exampleEnglish: z.string().optional(),
  exampleAudioR2Key: z.string().optional(),
});

const updateVocabSchema = createVocabSchema.partial();

const bulkImportSchema = z.object({
  entries: z.array(createVocabSchema).min(1).max(1000),
});

// === PUBLIC ROUTES ===

/**
 * GET /vocabulary - Search and filter vocabulary
 * Public endpoint for users to browse vocabulary
 */
app.get('/', zValidator('query', searchSchema), async (c) => {
  const filters = c.req.valid('query');
  const db = drizzle(c.env.DB);

  try {
    const conditions = [];

    // Build vocab → lesson count map for in_lesson filter and enrichment
    // Load all lessons' targetVocabulary arrays
    const allLessons = await db
      .select({
        id: lessons.id,
        targetVocabulary: lessons.targetVocabulary,
      })
      .from(lessons)
      .all();

    // Build map: vocabId → count of lessons it appears in
    const vocabLessonCount = new Map<string, number>();
    for (const lesson of allLessons) {
      const vocabIds = (lesson.targetVocabulary as string[]) || [];
      for (const vocabId of vocabIds) {
        vocabLessonCount.set(vocabId, (vocabLessonCount.get(vocabId) || 0) + 1);
      }
    }

    // Lesson filter - get vocabulary IDs from lesson's targetVocabulary
    let lessonVocabIds: string[] | null = null;
    if (filters.lesson_id) {
      const lesson = await db
        .select({ targetVocabulary: lessons.targetVocabulary })
        .from(lessons)
        .where(eq(lessons.id, filters.lesson_id))
        .get();
      
      if (lesson && lesson.targetVocabulary) {
        lessonVocabIds = lesson.targetVocabulary as string[];
        if (lessonVocabIds.length > 0) {
          conditions.push(inArray(vocabulary.id, lessonVocabIds));
        } else {
          // Empty targetVocabulary means no results
          return c.json({ results: [], total: 0, limit: filters.limit, offset: filters.offset });
        }
      } else {
        // Lesson not found or no targetVocabulary
        return c.json({ results: [], total: 0, limit: filters.limit, offset: filters.offset });
      }
    }

    // Text search across hanzi, pinyin, and english
    // Escape special LIKE characters to prevent injection
    if (filters.query) {
      const escapedQuery = escapeLikePattern(filters.query);
      const searchTerm = `%${escapedQuery}%`;
      
      // Check if query might be pinyin (for tone-agnostic search)
      if (isProbablyPinyin(filters.query)) {
        // Normalize the query (strip tones, lowercase)
        const normalizedQuery = stripToneMarks(escapedQuery);
        const normalizedSearchTerm = `%${normalizedQuery}%`;
        
        // Build SQL expression for normalized pinyin comparison
        const pinyinNormalizeExpr = buildPinyinNormalizeSQL('pinyin');
        
        // Search hanzi and normalized pinyin ONLY (skip English to avoid noise like "work" matching "wo")
        conditions.push(
          or(
            like(vocabulary.hanzi, searchTerm),
            sql`${sql.raw(pinyinNormalizeExpr)} LIKE ${normalizedSearchTerm}`
          )
        );
      } else {
        // Regular search (for hanzi or mixed queries)
        conditions.push(
          or(
            like(vocabulary.hanzi, searchTerm),
            like(vocabulary.pinyin, searchTerm),
            sql`LOWER(english) LIKE ${`%${escapedQuery.toLowerCase()}%`}`
          )
        );
      }
    }

    // HSK level filter
    if (filters.hsk_level) {
      conditions.push(eq(vocabulary.hskLevel, filters.hsk_level));
    }

    // Category filter
    if (filters.category) {
      conditions.push(eq(vocabulary.category, filters.category));
    }

    // Audio filter (server-side for proper pagination)
    if (filters.has_audio === 'true') {
      conditions.push(sql`word_audio_r2_key IS NOT NULL AND word_audio_r2_key != ''`);
    } else if (filters.has_audio === 'false') {
      conditions.push(sql`(word_audio_r2_key IS NULL OR word_audio_r2_key = '')`);
    }

    // Example filter
    if (filters.has_example === 'true') {
      conditions.push(sql`example_chinese IS NOT NULL AND example_chinese != ''`);
    } else if (filters.has_example === 'false') {
      conditions.push(sql`(example_chinese IS NULL OR example_chinese = '')`);
    }

    // Incomplete filter (missing audio OR missing example)
    if (filters.incomplete === 'true') {
      conditions.push(sql`(word_audio_r2_key IS NULL OR word_audio_r2_key = '' OR example_chinese IS NULL OR example_chinese = '')`);
    }

    // Missing secondary categories filter
    if (filters.missing_secondary === 'true') {
      conditions.push(sql`(secondary_categories IS NULL OR secondary_categories = '[]' OR secondary_categories = '')`);
    }

    // In lesson filter - only include vocab that is/isn't used in any lesson
    // We need to get all vocab IDs that are in lessons
    const vocabIdsInLessons = Array.from(vocabLessonCount.keys());
    if (filters.in_lesson === 'true') {
      if (vocabIdsInLessons.length > 0) {
        conditions.push(inArray(vocabulary.id, vocabIdsInLessons));
      } else {
        // No vocab is in any lesson, return empty
        return c.json({ results: [], total: 0, limit: filters.limit, offset: filters.offset });
      }
    } else if (filters.in_lesson === 'false') {
      if (vocabIdsInLessons.length > 0) {
        // NOT IN is tricky with drizzle, use raw SQL
        conditions.push(sql`id NOT IN (${sql.join(vocabIdsInLessons.map(id => sql`${id}`), sql`, `)})`);
      }
      // If no vocab is in lessons, all vocab qualifies - no condition needed
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Determine sort order
    const sortField = {
      hanzi: vocabulary.hanzi,
      pinyin: vocabulary.pinyin,
      hsk_level: vocabulary.hskLevel,
      category: vocabulary.category,
    }[filters.sort || 'hanzi'];

    const orderFn = filters.order === 'desc' ? desc : asc;

    // Get total count using proper SQL COUNT(*)
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(vocabulary)
      .where(whereClause)
      .get();

    // Get paginated results
    const results = await db
      .select()
      .from(vocabulary)
      .where(whereClause)
      .orderBy(orderFn(sortField))
      .limit(filters.limit)
      .offset(filters.offset)
      .all();

    // Add row numbers and lesson count based on pagination offset
    const resultsWithRowNum = results.map((item, index) => ({
      ...item,
      rowNum: filters.offset + index + 1,
      inLessonCount: vocabLessonCount.get(item.id) || 0,
    }));

    return c.json({
      results: resultsWithRowNum,
      total: countResult?.count ?? 0,
      limit: filters.limit,
      offset: filters.offset,
    });
  } catch (err) {
    logWithContext('error', 'vocabulary.search_failed', {
      requestId: c.get('requestId'),
      meta: { error: (err as Error).message },
    });
    // Don't expose internal error details to client
    return c.json({ error: 'Search failed' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// SIMPLE WORD SUGGESTIONS (NO AI - PURE DB)
// ═══════════════════════════════════════════════════════════

const suggestSchema = z.object({
  hskLevel: z.coerce.number().int().min(1).max(10),
  category: z.string().optional(),
  pos: z.string().optional(),
  exclude: z.string().optional(), // Comma-separated list of hanzi to exclude
  count: z.coerce.number().int().min(1).max(20).optional().default(5),
});

/**
 * GET /vocabulary/suggest - Get random vocabulary suggestions by HSK level + metadata
 * NO AI - just simple database queries!
 * 
 * Priority:
 * 1. Same HSK + Same category + Same POS → score 3
 * 2. Same HSK + Same category → score 2  
 * 3. Same HSK + Same POS → score 1
 * 4. Same HSK only → score 0
 */
app.get('/suggest', zValidator('query', suggestSchema), async (c) => {
  const { hskLevel, category, pos, exclude, count } = c.req.valid('query');
  const db = drizzle(c.env.DB);
  const requestId = c.get('requestId');

  // Parse excluded words (comma-separated)
  const excludeList = exclude ? exclude.split(',').map(s => s.trim()).filter(Boolean) : [];

  logWithContext('info', 'vocabulary.suggest', {
    requestId,
    meta: { hskLevel, category, pos, excludeCount: excludeList.length, count },
  });

  try {
    // Build base condition: must match HSK level
    const conditions = [eq(vocabulary.hskLevel, hskLevel)];

    // Exclude specific hanzi if provided
    if (excludeList.length > 0) {
      conditions.push(sql`${vocabulary.hanzi} NOT IN (${sql.join(excludeList.map(h => sql`${h}`), sql`, `)})`);
    }

    const whereClause = and(...conditions);

    // Get all matching words with their metadata
    const allWords = await db
      .select({
        id: vocabulary.id,
        hanzi: vocabulary.hanzi,
        pinyin: vocabulary.pinyin,
        english: vocabulary.english,
        category: vocabulary.category,
        pos: vocabulary.pos,
        tonePattern: vocabulary.tonePattern,
      })
      .from(vocabulary)
      .where(whereClause)
      .limit(200); // Get a pool to rank from

    if (allWords.length === 0) {
      return c.json({
        suggestions: [],
        message: `No words found for HSK ${hskLevel}`,
      });
    }

    // Score each word based on category/pos match
    const scoredWords = allWords.map(word => {
      let score = 0;
      if (category && word.category === category) score += 2;
      if (pos && word.pos === pos) score += 1;
      return { ...word, score };
    });

    // Sort by score (desc), then shuffle within same score for variety
    scoredWords.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return Math.random() - 0.5; // Random within same score
    });

    // Take top N
    const suggestions = scoredWords.slice(0, count).map(w => ({
      id: w.id,
      hanzi: w.hanzi,
      pinyin: w.pinyin,
      english: w.english,
      category: w.category,
      pos: w.pos,
    }));

    return c.json({
      suggestions,
      hskLevel,
      requestedCategory: category || null,
      requestedPos: pos || null,
      totalPool: allWords.length,
    });
  } catch (err) {
    logWithContext('error', 'vocabulary.suggest_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to get suggestions' }, 500);
  }
});

/**
 * GET /vocabulary/:id/lessons - Get lessons that contain this vocabulary word
 */
app.get('/:id/lessons', async (c) => {
  const vocabId = c.req.param('id');
  const db = drizzle(c.env.DB);

  try {
    // Get all lessons
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

    // Filter to lessons that contain this vocab ID
    const containingLessons = allLessons
      .filter(lesson => {
        const targetVocab = (lesson.targetVocabulary as string[]) || [];
        return targetVocab.includes(vocabId);
      })
      .map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        hskLevel: lesson.hskLevel,
        lessonNumber: lesson.lessonNumber,
        contentStatus: lesson.contentStatus,
      }));

    // Determine which is the "first" lesson (lowest HSK + lesson number)
    const firstLessonId = containingLessons.length > 0 ? containingLessons[0].id : null;

    return c.json({
      vocabId,
      lessons: containingLessons,
      firstLessonId,
      totalLessons: containingLessons.length,
    });
  } catch (err) {
    return c.json({ error: 'Failed to fetch lessons for vocabulary' }, 500);
  }
});

/**
 * GET /vocabulary/:id - Get single vocabulary entry
 */
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  try {
    const result = await db
      .select()
      .from(vocabulary)
      .where(eq(vocabulary.id, id))
      .get();

    if (!result) {
      return c.json({ error: 'Vocabulary not found' }, 404);
    }

    return c.json(result);
  } catch (err) {
    return c.json({ error: 'Failed to fetch vocabulary' }, 500);
  }
});

/**
 * GET /vocabulary/categories - Get all unique categories
 */
app.get('/admin/categories', async (c) => {
  const db = drizzle(c.env.DB);

  try {
    const results = await db
      .selectDistinct({ category: vocabulary.category })
      .from(vocabulary)
      .all();

    return c.json({
      categories: results.map((r) => r.category).filter(Boolean),
    });
  } catch (err) {
    return c.json({ error: 'Failed to fetch categories' }, 500);
  }
});

// === ADMIN ROUTES ===

/**
 * POST /vocabulary/admin - Create new vocabulary entry
 */
app.post('/admin', zValidator('json', createVocabSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const user = c.get('user');

  try {
    const id = crypto.randomUUID();

    await db.insert(vocabulary).values({
      id,
      hanzi: data.hanzi,
      pinyin: data.pinyin,
      english: data.english,
      category: data.category,
      hskLevel: data.hskLevel,
      tags: data.tags || null,
      wordAudioR2Key: data.wordAudioR2Key || null,
      exampleChinese: data.exampleChinese || null,
      examplePinyin: data.examplePinyin || null,
      exampleEnglish: data.exampleEnglish || null,
      exampleAudioR2Key: data.exampleAudioR2Key || null,
    });

    logWithContext('info', 'vocabulary.created', {
      requestId: c.get('requestId'),
      meta: { id, hanzi: data.hanzi, createdBy: user?.id },
    });

    return c.json({ id, success: true }, 201);
  } catch (err) {
    logWithContext('error', 'vocabulary.create_failed', {
      requestId: c.get('requestId'),
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to create vocabulary' }, 500);
  }
});

/**
 * PUT /vocabulary/admin/:id - Update vocabulary entry
 */
app.put('/admin/:id', zValidator('json', updateVocabSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const user = c.get('user');

  try {
    const updateData: Record<string, unknown> = {};
    if (data.hanzi) updateData.hanzi = data.hanzi;
    if (data.pinyin) updateData.pinyin = data.pinyin;
    if (data.english) updateData.english = data.english;
    if (data.category) updateData.category = data.category;
    if (data.hskLevel) updateData.hskLevel = data.hskLevel;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.wordAudioR2Key !== undefined) updateData.wordAudioR2Key = data.wordAudioR2Key;
    if (data.exampleChinese !== undefined) updateData.exampleChinese = data.exampleChinese;
    if (data.examplePinyin !== undefined) updateData.examplePinyin = data.examplePinyin;
    if (data.exampleEnglish !== undefined) updateData.exampleEnglish = data.exampleEnglish;
    if (data.exampleAudioR2Key !== undefined) updateData.exampleAudioR2Key = data.exampleAudioR2Key;
    // Pedagogic metadata
    if (data.pos !== undefined) updateData.pos = data.pos;
    if (data.tonePattern !== undefined) updateData.tonePattern = data.tonePattern;
    if (data.secondaryCategories !== undefined) updateData.secondaryCategories = data.secondaryCategories;

    if (Object.keys(updateData).length === 0) {
      return c.json({ error: 'No fields to update' }, 400);
    }

    await db
      .update(vocabulary)
      .set(updateData)
      .where(eq(vocabulary.id, id));

    logWithContext('info', 'vocabulary.updated', {
      requestId: c.get('requestId'),
      meta: { id, updatedBy: user?.id },
    });

    return c.json({ success: true });
  } catch (err) {
    logWithContext('error', 'vocabulary.update_failed', {
      requestId: c.get('requestId'),
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to update vocabulary' }, 500);
  }
});

/**
 * DELETE /vocabulary/admin/:id - Delete vocabulary entry
 */
app.delete('/admin/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  const user = c.get('user');

  try {
    await db.delete(vocabulary).where(eq(vocabulary.id, id));

    logWithContext('info', 'vocabulary.deleted', {
      requestId: c.get('requestId'),
      meta: { id, deletedBy: user?.id },
    });

    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: 'Failed to delete vocabulary' }, 500);
  }
});

/**
 * POST /vocabulary/admin/bulk-import - Bulk import vocabulary entries
 */
app.post('/admin/bulk-import', zValidator('json', bulkImportSchema), async (c) => {
  const { entries } = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const user = c.get('user');
  const requestId = c.get('requestId');

  logWithContext('info', 'vocabulary.bulk_import_start', {
    requestId,
    meta: { entryCount: entries.length, sample: entries[0] },
  });

  try {
    const values = entries.map((entry) => ({
      id: crypto.randomUUID(),
      hanzi: entry.hanzi,
      pinyin: entry.pinyin,
      english: entry.english,
      category: entry.category,
      hskLevel: entry.hskLevel,
      tags: entry.tags || null,
    }));

    logWithContext('info', 'vocabulary.bulk_import_values_prepared', {
      requestId,
      meta: { valueCount: values.length, sampleValue: values[0] },
    });

    // Insert in batches of 10 (D1 has ~100 variable limit, 10 rows × 7 cols = 70 vars)
    const batchSize = 10;
    let imported = 0;

    for (let i = 0; i < values.length; i += batchSize) {
      const batch = values.slice(i, i + batchSize);
      
      try {
        await db.insert(vocabulary).values(batch);
        imported += batch.length;
        logWithContext('info', 'vocabulary.bulk_import_batch_success', {
          requestId,
          meta: { batchNum: Math.floor(i / batchSize) + 1, batchSize: batch.length, totalImported: imported },
        });
      } catch (batchErr) {
        logWithContext('error', 'vocabulary.bulk_import_batch_failed', {
          requestId,
          meta: { 
            batchNum: Math.floor(i / batchSize) + 1,
            error: (batchErr as Error).message,
            stack: (batchErr as Error).stack,
            sampleEntry: batch[0],
          },
        });
        throw batchErr;
      }
    }

    logWithContext('info', 'vocabulary.bulk_imported', {
      requestId,
      meta: { count: imported, importedBy: user?.id },
    });

    return c.json({ success: true, imported }, 201);
  } catch (err) {
    const errorMessage = (err as Error).message;
    const errorStack = (err as Error).stack;
    
    logWithContext('error', 'vocabulary.bulk_import_failed', {
      requestId,
      meta: { 
        error: errorMessage,
        stack: errorStack,
      },
    });
    
    return c.json({ 
      error: 'Bulk import failed', 
      details: errorMessage,
      requestId,
    }, 500);
  }
});

/**
 * GET /vocabulary/admin/export - Export all vocabulary as JSON
 */
app.get('/admin/export', async (c) => {
  const db = drizzle(c.env.DB);

  try {
    const results = await db
      .select()
      .from(vocabulary)
      .orderBy(asc(vocabulary.hskLevel), asc(vocabulary.hanzi))
      .all();

    return c.json({
      exported_at: new Date().toISOString(),
      count: results.length,
      entries: results,
    });
  } catch (err) {
    return c.json({ error: 'Export failed' }, 500);
  }
});

// === FILE UPLOAD ENDPOINTS ===

/**
 * POST /vocabulary/admin/:id/word-audio - Upload audio for the word
 */
app.post('/admin/:id/word-audio', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  
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
    const r2Key = `audio/vocabulary/words/${id}.${ext}`;
    
    await c.env.CONTENT_BUCKET.put(r2Key, await audio.arrayBuffer(), {
      httpMetadata: { contentType: audio.type },
    });

    // Update vocabulary entry
    await db
      .update(vocabulary)
      .set({ wordAudioR2Key: r2Key })
      .where(eq(vocabulary.id, id));

    return c.json({ success: true, r2Key });
  } catch (err) {
    logWithContext('error', 'vocabulary.word_audio_upload_failed', {
      requestId: c.get('requestId'),
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to upload audio' }, 500);
  }
});

/**
 * POST /vocabulary/admin/:id/example-audio - Upload audio for the example sentence
 */
app.post('/admin/:id/example-audio', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  
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
    const r2Key = `audio/vocabulary/examples/${id}.${ext}`;
    
    await c.env.CONTENT_BUCKET.put(r2Key, await audio.arrayBuffer(), {
      httpMetadata: { contentType: audio.type },
    });

    // Update vocabulary entry
    await db
      .update(vocabulary)
      .set({ exampleAudioR2Key: r2Key })
      .where(eq(vocabulary.id, id));

    return c.json({ success: true, r2Key });
  } catch (err) {
    logWithContext('error', 'vocabulary.example_audio_upload_failed', {
      requestId: c.get('requestId'),
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to upload audio' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// VOCABULARY AUDIO SAVE ENDPOINTS (Manual upload flow)
// TTS preview endpoints removed - using manual audio upload instead
// ═══════════════════════════════════════════════════════════

const saveAudioSchema = z.object({
  audioBase64: z.string().min(1),
  durationMs: z.number().optional(),
});

/**
 * POST /vocabulary/admin/:id/save-word-audio - Save word audio to R2
 * Used after manual upload/drag-and-drop
 */
app.post('/admin/:id/save-word-audio', zValidator('json', saveAudioSchema), async (c) => {
  const id = c.req.param('id');
  const { audioBase64, durationMs } = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const cdnBaseUrl = getCdnBaseUrl(c.env);

  // DEBUG: Log received audio info
  logWithContext('info', 'vocabulary.save_word_audio_debug', {
    requestId: c.get('requestId'),
    meta: { 
      id, 
      audioBase64Length: audioBase64.length,
      audioBase64First50: audioBase64.substring(0, 50),
      durationMs,
    },
  });

  try {
    // Decode base64 to buffer
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const audioBuffer = bytes.buffer;

    // DEBUG: Log buffer info
    logWithContext('info', 'vocabulary.save_word_audio_buffer', {
      requestId: c.get('requestId'),
      meta: { 
        id, 
        bufferByteLength: audioBuffer.byteLength,
      },
    });

    // Upload to R2
    // Note: Audio can be MP3 (original from ElevenLabs) or WAV (if trim/speed processed)
    // We detect format from the magic bytes and save with correct extension
    const isWav = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46; // "RIFF"
    const isMp3 = bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0; // MP3 sync
    const isMp3Id3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33; // "ID3" tag
    
    const ext = isWav ? 'wav' : 'mp3';
    const contentType = isWav ? 'audio/wav' : 'audio/mpeg';
    
    console.log('[vocabulary] Audio format detected:', { isWav, isMp3, isMp3Id3, ext });
    
    const r2Key = `audio/vocabulary/words/${id}.${ext}`;
    await c.env.CONTENT_BUCKET.put(r2Key, audioBuffer, {
      httpMetadata: { contentType },
    });

    // Update vocabulary entry with timestamp for cache busting
    const audioUpdatedAt = Date.now();
    await db
      .update(vocabulary)
      .set({ 
        wordAudioR2Key: r2Key,
        wordAudioUpdatedAt: audioUpdatedAt,
      })
      .where(eq(vocabulary.id, id));

    logWithContext('info', 'vocabulary.word_audio_saved', {
      requestId: c.get('requestId'),
      meta: { id, r2Key, audioUpdatedAt },
    });

    return c.json({ 
      success: true,
      audioUpdatedAt, // Return for frontend to use in cache busting 
      r2Key,
      audioUrl: `${cdnBaseUrl}/${r2Key}`,
    });
  } catch (err) {
    logWithContext('error', 'vocabulary.save_word_audio_failed', {
      requestId: c.get('requestId'),
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to save audio' }, 500);
  }
});

/**
 * POST /vocabulary/admin/:id/save-example-audio - Save approved example audio to R2
 */
app.post('/admin/:id/save-example-audio', zValidator('json', saveAudioSchema), async (c) => {
  const id = c.req.param('id');
  const { audioBase64, durationMs } = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const cdnBaseUrl = getCdnBaseUrl(c.env);

  try {
    // Decode base64 to buffer
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const audioBuffer = bytes.buffer;

    // Upload to R2
    // Note: Audio can be MP3 (original from ElevenLabs) or WAV (if trim/speed processed)
    const isWav = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46; // "RIFF"
    
    const ext = isWav ? 'wav' : 'mp3';
    const contentType = isWav ? 'audio/wav' : 'audio/mpeg';
    
    const r2Key = `audio/vocabulary/examples/${id}.${ext}`;
    await c.env.CONTENT_BUCKET.put(r2Key, audioBuffer, {
      httpMetadata: { contentType },
    });

    // Update vocabulary entry with timestamp for cache busting
    const audioUpdatedAt = Date.now();
    await db
      .update(vocabulary)
      .set({ 
        exampleAudioR2Key: r2Key,
        exampleAudioUpdatedAt: audioUpdatedAt,
      })
      .where(eq(vocabulary.id, id));

    logWithContext('info', 'vocabulary.example_audio_saved', {
      requestId: c.get('requestId'),
      meta: { id, r2Key, audioUpdatedAt },
    });

    return c.json({ 
      success: true, 
      r2Key,
      audioUrl: `${cdnBaseUrl}/${r2Key}`,
      audioUpdatedAt, // Return for frontend to use in cache busting
    });
  } catch (err) {
    logWithContext('error', 'vocabulary.save_example_audio_failed', {
      requestId: c.get('requestId'),
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to save audio' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// SECONDARY CATEGORIES BULK TAGGING
// ═══════════════════════════════════════════════════════════

// Available secondary categories for AI to choose from
const SECONDARY_CATEGORY_OPTIONS = [
  'people', 'relationships', 'emotions', 'actions', 'descriptive',
  'time', 'location', 'quantity', 'question', 'polite',
  'formal', 'informal', 'spoken', 'written', 'idiom',
  'measure', 'direction', 'color', 'size', 'state',
  'weather', 'nature', 'body', 'health', 'education',
  'work', 'travel', 'communication', 'daily-life', 'culture',
];

const bulkTagSecondaryCategoriesSchema = z.object({
  wordIds: z.array(z.string()).min(1).max(50),
});

/**
 * POST /vocabulary/admin/bulk-tag-secondary-categories - AI-tag secondary categories in bulk
 */
app.post('/admin/bulk-tag-secondary-categories', zValidator('json', bulkTagSecondaryCategoriesSchema), async (c) => {
  const { wordIds } = c.req.valid('json');
  const requestId = c.get('requestId');
  const db = drizzle(c.env.DB);
  const config = c.get('config');

  const apiKey = config?.secrets?.openRouterApiKey;
  if (!apiKey) {
    return c.json({ error: 'AI service not configured' }, 500);
  }

  const results: { wordId: string; hanzi: string; secondaryCategories: string[] | null; success: boolean; error?: string }[] = [];
  let aiCallsMade = 0;

  // Get all words at once for efficiency
  let words;
  try {
    words = await db.select()
      .from(vocabulary)
      .where(sql`${vocabulary.id} IN (${sql.join(wordIds.map(id => sql`${id}`), sql`, `)})`)
      .all();
  } catch (err) {
    // If secondary_categories column doesn't exist, return helpful error
    const errorMsg = (err as Error).message;
    if (errorMsg.includes('secondary_categories') || errorMsg.includes('no such column')) {
      return c.json({ 
        error: 'Migration required', 
        details: 'The secondary_categories column does not exist. Please run the migration: npx wrangler d1 execute hanzimaster-db --remote --file=drizzle/0043_secondary_categories.sql'
      }, 400);
    }
    throw err;
  }

  const wordMap = new Map(words.map(w => [w.id, w]));

  for (const wordId of wordIds) {
    const word = wordMap.get(wordId);
    
    if (!word) {
      results.push({ wordId, hanzi: '', secondaryCategories: null, success: false, error: 'Word not found' });
      continue;
    }

    // Skip if already has secondary categories
    if (word.secondaryCategories && (word.secondaryCategories as string[]).length > 0) {
      results.push({ 
        wordId, 
        hanzi: word.hanzi, 
        secondaryCategories: word.secondaryCategories as string[], 
        success: true, 
        error: 'Already tagged' 
      });
      continue;
    }

    try {
      // Call AI to determine secondary categories
      const prompt = `For the Chinese word "${word.hanzi}" (${word.pinyin}, meaning: ${word.english}, primary category: ${word.category}), 
select 1-3 secondary semantic categories from this list that also apply:
${SECONDARY_CATEGORY_OPTIONS.join(', ')}

Return ONLY a JSON array of category names, e.g.: ["people", "relationships"]
If none apply, return: []`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-chat',
          messages: [
            { role: 'system', content: 'You are a Chinese language expert. Return only valid JSON arrays.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 50,
          temperature: 0,
        }),
      });

      aiCallsMade++;
      const result = await response.json() as any;
      const aiResponse = result.choices?.[0]?.message?.content?.trim() || '[]';
      
      // Parse the JSON response
      let categories: string[] = [];
      try {
        categories = JSON.parse(aiResponse);
        // Validate categories are from our list
        categories = categories.filter(cat => SECONDARY_CATEGORY_OPTIONS.includes(cat));
      } catch {
        // If parsing fails, try to extract categories from the text
        categories = SECONDARY_CATEGORY_OPTIONS.filter(cat => aiResponse.toLowerCase().includes(cat));
      }

      // Update the word
      await db.update(vocabulary)
        .set({ secondaryCategories: categories })
        .where(eq(vocabulary.id, wordId));

      results.push({ wordId, hanzi: word.hanzi, secondaryCategories: categories, success: true });

    } catch (err) {
      logWithContext('error', 'vocabulary.bulk_tag_secondary.failed', {
        requestId,
        meta: { wordId, error: (err as Error).message },
      });
      results.push({ wordId, hanzi: word.hanzi, secondaryCategories: null, success: false, error: (err as Error).message });
    }
  }

  logWithContext('info', 'vocabulary.bulk_tag_secondary.complete', {
    requestId,
    meta: { total: wordIds.length, successful: results.filter(r => r.success).length, aiCalls: aiCallsMade },
  });

  return c.json({
    results,
    summary: {
      total: wordIds.length,
      successful: results.filter(r => r.success && !r.error?.includes('Already')).length,
      alreadyTagged: results.filter(r => r.error?.includes('Already')).length,
      failed: results.filter(r => !r.success).length,
      aiCallsMade,
    },
    availableCategories: SECONDARY_CATEGORY_OPTIONS,
  });
});

/**
 * GET /vocabulary/admin/secondary-categories - Get list of available secondary categories
 */
app.get('/admin/secondary-categories', async (c) => {
  return c.json({ categories: SECONDARY_CATEGORY_OPTIONS });
});

/**
 * GET /vocabulary/admin/secondary-category-stats - Get coverage stats for secondary categories
 */
app.get('/admin/secondary-category-stats', async (c) => {
  const db = drizzle(c.env.DB);

  try {
    const total = await db.select({ count: sql<number>`count(*)` }).from(vocabulary).get();
    const withSecondary = await db.select({ count: sql<number>`count(*)` })
      .from(vocabulary)
      .where(sql`secondary_categories IS NOT NULL AND secondary_categories != '[]'`)
      .get();

    return c.json({
      total: total?.count || 0,
      withSecondaryCategories: withSecondary?.count || 0,
      percent: total?.count ? Math.round((withSecondary?.count || 0) / total.count * 100) : 0,
      availableCategories: SECONDARY_CATEGORY_OPTIONS,
    });
  } catch (err) {
    // Column might not exist yet
    const errorMsg = (err as Error).message;
    if (errorMsg.includes('secondary_categories') || errorMsg.includes('no such column')) {
      const total = await db.select({ count: sql<number>`count(*)` }).from(vocabulary).get();
      return c.json({
        total: total?.count || 0,
        withSecondaryCategories: 0,
        percent: 0,
        availableCategories: SECONDARY_CATEGORY_OPTIONS,
        migrationRequired: true,
      });
    }
    throw err;
  }
});

// ═══════════════════════════════════════════════════════════
// AI EXAMPLE SENTENCE GENERATION
// ═══════════════════════════════════════════════════════════

const generateExampleSchema = z.object({
  regenerate: z.boolean().optional().default(false),
});

/**
 * POST /vocabulary/admin/:id/generate-example - Generate example sentence using AI
 */
app.post('/admin/:id/generate-example', zValidator('json', generateExampleSchema), async (c) => {
  const id = c.req.param('id');
  const { regenerate } = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const requestId = c.get('requestId');
  const config = c.get('config');

  try {
    // Get the vocabulary entry
    const entry = await db.select().from(vocabulary).where(eq(vocabulary.id, id)).get();
    
    if (!entry) {
      return c.json({ error: 'Vocabulary not found' }, 404);
    }

    // Check if already has example and not regenerating
    if (entry.exampleChinese && !regenerate) {
      return c.json({
        success: true,
        sentence: {
          chinese: entry.exampleChinese,
          pinyin: entry.examplePinyin || '',
          english: entry.exampleEnglish || '',
        },
        cached: true,
      });
    }

    // Get OpenRouter API key
    const apiKey = config?.secrets?.openRouterApiKey;
    if (!apiKey) {
      logWithContext('error', 'vocabulary.generate_example.no_api_key', { requestId });
      return c.json({ error: 'AI service not configured' }, 500);
    }

    // Generate example sentence using AI
    const result = await generateExampleSentenceAI(
      entry.hanzi,
      entry.english,
      entry.hskLevel,
      apiKey,
      requestId,
      c.env.DB  // Pass DB for cost tracking
    );

    // Save the generated example to the vocabulary entry
    await db
      .update(vocabulary)
      .set({
        exampleChinese: result.sentence.chinese,
        examplePinyin: result.sentence.pinyin,
        exampleEnglish: result.sentence.english,
      })
      .where(eq(vocabulary.id, id));

    logWithContext('info', 'vocabulary.generate_example.success', {
      requestId,
      meta: { id, hanzi: entry.hanzi, tokensUsed: result.tokensUsed },
    });

    return c.json({
      success: true,
      sentence: result.sentence,
      tokensUsed: result.tokensUsed,
      cached: false,
    });
  } catch (err) {
    logWithContext('error', 'vocabulary.generate_example.failed', {
      requestId,
      meta: { id, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to generate example sentence', details: (err as Error).message }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// AI TRANSLATION (suggest English + Pinyin)
// ═══════════════════════════════════════════════════════════

const translateSchema = z.object({
  hanzi: z.string().min(1).max(50),
});

/**
 * POST /vocabulary/admin/translate - Translate Chinese to English + Pinyin using AI
 * This endpoint doesn't require a saved vocabulary entry - works with just hanzi text
 */
app.post('/admin/translate', zValidator('json', translateSchema), async (c) => {
  const { hanzi } = c.req.valid('json');
  const requestId = c.get('requestId');
  const config = c.get('config');

  try {
    // Get OpenRouter API key - try both sources
    const apiKey = config?.secrets?.openRouterApiKey || c.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      logWithContext('error', 'vocabulary.translate.no_api_key', { 
        requestId,
        meta: { 
          hasConfig: !!config,
          hasSecrets: !!config?.secrets,
          envKeyExists: !!c.env.OPENROUTER_API_KEY,
        }
      });
      return c.json({ error: 'AI service not configured - OPENROUTER_API_KEY not set' }, 500);
    }

    logWithContext('info', 'vocabulary.translate.starting', {
      requestId,
      meta: { hanzi, keyLength: apiKey.length },
    });

    // Translate using AI
    const result = await translateWordAI(
      hanzi,
      apiKey,
      requestId,
      c.env.DB
    );

    logWithContext('info', 'vocabulary.translate.success', {
      requestId,
      meta: { hanzi, english: result.english, tokensUsed: result.tokensUsed },
    });

    return c.json({
      success: true,
      english: result.english,
      pinyin: result.pinyin,
      tokensUsed: result.tokensUsed,
    });
  } catch (err) {
    const errorMessage = (err as Error).message;
    logWithContext('error', 'vocabulary.translate.failed', {
      requestId,
      meta: { hanzi, error: errorMessage, stack: (err as Error).stack?.substring(0, 500) },
    });
    return c.json({ 
      error: 'Failed to translate', 
      details: errorMessage,
      hint: errorMessage.includes('API') ? 'Check OPENROUTER_API_KEY configuration' : undefined
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// VOCABULARY HEALTH CHECK (for lesson editor)
// ═══════════════════════════════════════════════════════════

const healthCheckSchema = z.object({
  words: z.array(z.string()).min(1).max(200),
});

interface WordHealth {
  hanzi: string;
  exists: boolean;
  id?: string;
  pinyin?: string;
  english?: string;
  category?: string;
  hasAudio: boolean;
  hasCategory: boolean;
  hasExample: boolean;
  hasTags: boolean;
  hasSecondaryCategories: boolean;
}

/**
 * POST /vocabulary/admin/health-check
 * Check vocabulary health for a list of words (used by lesson editor)
 */
app.post('/admin/health-check', zValidator('json', healthCheckSchema), async (c) => {
  const { words } = c.req.valid('json');
  const requestId = c.get('requestId');
  const db = drizzle(c.env.DB);

  logWithContext('info', 'vocabulary.health_check.start', {
    requestId,
    meta: { wordCount: words.length },
  });

  try {
    // Get all vocabulary entries for the requested words
    const entries = await db.select()
      .from(vocabulary)
      .where(inArray(vocabulary.hanzi, words));

    // Create a map for quick lookup
    const vocabMap = new Map(entries.map(e => [e.hanzi, e]));

    // Build health report for each word
    const results: WordHealth[] = words.map(word => {
      const entry = vocabMap.get(word);
      
      if (!entry) {
        return {
          hanzi: word,
          exists: false,
          hasAudio: false,
          hasCategory: false,
          hasExample: false,
          hasTags: false,
          hasSecondaryCategories: false,
        };
      }

      return {
        hanzi: word,
        exists: true,
        id: entry.id,
        pinyin: entry.pinyin,
        english: entry.english,
        category: entry.category,
        hasAudio: !!entry.wordAudioR2Key,
        hasCategory: !!entry.category && entry.category !== 'other',
        hasExample: !!entry.exampleChinese,
        hasTags: !!entry.pos || !!entry.tonePattern,
        hasSecondaryCategories: Array.isArray(entry.secondaryCategories) && entry.secondaryCategories.length > 0,
      };
    });

    // Calculate summary stats
    const summary = {
      total: results.length,
      existing: results.filter(r => r.exists).length,
      missing: results.filter(r => !r.exists).length,
      missingAudio: results.filter(r => r.exists && !r.hasAudio).length,
      missingCategory: results.filter(r => r.exists && !r.hasCategory).length,
      missingExample: results.filter(r => r.exists && !r.hasExample).length,
      missingTags: results.filter(r => r.exists && !r.hasTags).length,
      missingSecondaryCategories: results.filter(r => r.exists && !r.hasSecondaryCategories).length,
    };

    const totalIssues = summary.missing + summary.missingAudio + summary.missingCategory + 
                        summary.missingExample + summary.missingTags;

    logWithContext('info', 'vocabulary.health_check.complete', {
      requestId,
      meta: { ...summary, totalIssues },
    });

    return c.json({
      results,
      summary,
      totalIssues,
    });
  } catch (err) {
    logWithContext('error', 'vocabulary.health_check.failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Health check failed' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// VOCAB MIGRATION TOOLS (HSK Level 1 → 10 Migration)
// ═══════════════════════════════════════════════════════════

/**
 * GET /v1/vocabulary/admin/migration/compare
 * Compare HSK level 1 (old) with level 10 (new v3.0) vocabulary
 * Finds matches by hanzi and shows transfer candidates
 */
app.get('/admin/migration/compare', async (c) => {
  const db = drizzle(c.env.DB);
  const requestId = c.get('requestId');

  try {
    // Get old vocab (level 1)
    const oldVocab = await db
      .select()
      .from(vocabulary)
      .where(eq(vocabulary.hskLevel, 1));

    // Get new vocab (level 10)
    const newVocab = await db
      .select()
      .from(vocabulary)
      .where(eq(vocabulary.hskLevel, 10));

    // Create lookup map for old vocab by hanzi
    const oldByHanzi = new Map(oldVocab.map(v => [v.hanzi, v]));

    // Compare
    const matches: Array<{
      newId: string;
      oldId: string | null;
      hanzi: string;
      pinyin: string;
      english: string;
      hasMatch: boolean;
      oldHasAudio: boolean;
      oldHasExample: boolean;
      oldHasTags: boolean;
      canTransfer: boolean;
    }> = [];

    for (const newWord of newVocab) {
      const oldWord = oldByHanzi.get(newWord.hanzi);
      
      matches.push({
        newId: newWord.id,
        oldId: oldWord?.id || null,
        hanzi: newWord.hanzi,
        pinyin: newWord.pinyin,
        english: newWord.english,
        hasMatch: !!oldWord,
        oldHasAudio: !!oldWord?.wordAudioR2Key,
        oldHasExample: !!oldWord?.exampleChinese,
        oldHasTags: !!oldWord?.pos || !!oldWord?.tonePattern,
        canTransfer: !!oldWord && (!!oldWord.wordAudioR2Key || !!oldWord.exampleChinese),
      });
    }

    // Find words in old that don't exist in new
    const newHanziSet = new Set(newVocab.map(v => v.hanzi));
    const onlyInOld = oldVocab.filter(v => !newHanziSet.has(v.hanzi)).map(v => ({
      id: v.id,
      hanzi: v.hanzi,
      pinyin: v.pinyin,
      english: v.english,
      hasAudio: !!v.wordAudioR2Key,
      hasExample: !!v.exampleChinese,
    }));

    const summary = {
      oldCount: oldVocab.length,
      newCount: newVocab.length,
      matchedCount: matches.filter(m => m.hasMatch).length,
      transferableCount: matches.filter(m => m.canTransfer).length,
      onlyInOldCount: onlyInOld.length,
      onlyInNewCount: matches.filter(m => !m.hasMatch).length,
    };

    logWithContext('info', 'vocabulary.migration.compare', {
      requestId,
      meta: summary,
    });

    return c.json({
      summary,
      matches,
      onlyInOld,
    });
  } catch (err) {
    logWithContext('error', 'vocabulary.migration.compare.failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Migration compare failed' }, 500);
  }
});

/**
 * POST /v1/vocabulary/admin/migration/transfer
 * Transfer audio, examples, and tags from matched old vocab to new vocab
 */
app.post('/admin/migration/transfer', async (c) => {
  const db = drizzle(c.env.DB);
  const requestId = c.get('requestId');
  const { pairs } = await c.req.json<{ pairs: Array<{ oldId: string; newId: string }> }>();

  if (!pairs || !Array.isArray(pairs) || pairs.length === 0) {
    return c.json({ error: 'pairs array is required' }, 400);
  }

  try {
    let transferred = 0;

    for (const { oldId, newId } of pairs) {
      // Get old vocab entry
      const [oldEntry] = await db
        .select()
        .from(vocabulary)
        .where(eq(vocabulary.id, oldId))
        .limit(1);

      if (!oldEntry) continue;

      // Transfer fields to new entry
      const updateData: Partial<typeof vocabulary.$inferInsert> = {};
      
      if (oldEntry.wordAudioR2Key) updateData.wordAudioR2Key = oldEntry.wordAudioR2Key;
      if (oldEntry.exampleChinese) updateData.exampleChinese = oldEntry.exampleChinese;
      if (oldEntry.examplePinyin) updateData.examplePinyin = oldEntry.examplePinyin;
      if (oldEntry.exampleEnglish) updateData.exampleEnglish = oldEntry.exampleEnglish;
      if (oldEntry.exampleAudioR2Key) updateData.exampleAudioR2Key = oldEntry.exampleAudioR2Key;
      if (oldEntry.tags) updateData.tags = oldEntry.tags;
      if (oldEntry.secondaryCategories) updateData.secondaryCategories = oldEntry.secondaryCategories;

      if (Object.keys(updateData).length > 0) {
        await db
          .update(vocabulary)
          .set(updateData)
          .where(eq(vocabulary.id, newId));
        transferred++;
      }
    }

    logWithContext('info', 'vocabulary.migration.transfer', {
      requestId,
      meta: { requested: pairs.length, transferred },
    });

    return c.json({
      success: true,
      transferred,
      requested: pairs.length,
    });
  } catch (err) {
    logWithContext('error', 'vocabulary.migration.transfer.failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Transfer failed' }, 500);
  }
});

/**
 * POST /v1/vocabulary/admin/migration/finalize
 * Finalize migration: swap level 10 → 1, optionally delete old level 1
 */
app.post('/admin/migration/finalize', async (c) => {
  const db = drizzle(c.env.DB);
  const requestId = c.get('requestId');
  const { deleteOld } = await c.req.json<{ deleteOld?: boolean }>();

  try {
    // Get counts before
    const [oldVocab] = await db
      .select({ count: sql<number>`count(*)` })
      .from(vocabulary)
      .where(eq(vocabulary.hskLevel, 1));
    
    const [newVocab] = await db
      .select({ count: sql<number>`count(*)` })
      .from(vocabulary)
      .where(eq(vocabulary.hskLevel, 10));

    if (deleteOld) {
      // Delete old level 1
      await db.delete(vocabulary).where(eq(vocabulary.hskLevel, 1));
      
      logWithContext('info', 'vocabulary.migration.deleted_old', {
        requestId,
        meta: { deleted: oldVocab.count },
      });
    }

    // Update level 10 → 1
    await db
      .update(vocabulary)
      .set({ hskLevel: 1 })
      .where(eq(vocabulary.hskLevel, 10));

    logWithContext('info', 'vocabulary.migration.finalize', {
      requestId,
      meta: { 
        oldCount: oldVocab.count, 
        newCount: newVocab.count,
        deletedOld: !!deleteOld,
      },
    });

    return c.json({
      success: true,
      oldCount: oldVocab.count,
      newCount: newVocab.count,
      deletedOld: !!deleteOld,
      message: deleteOld 
        ? `Deleted ${oldVocab.count} old words, promoted ${newVocab.count} new words to HSK 1`
        : `Promoted ${newVocab.count} new words to HSK 1 (old words still exist at level 1)`,
    });
  } catch (err) {
    logWithContext('error', 'vocabulary.migration.finalize.failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Finalize failed' }, 500);
  }
});

export default app;

