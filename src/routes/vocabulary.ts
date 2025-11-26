import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth';
import { drizzle } from 'drizzle-orm/d1';
import { vocabulary } from '../schema';
import { eq, like, and, or, desc, asc, sql } from 'drizzle-orm';
import type { AppEnv } from '../types/app';
import { logWithContext } from '../utils/logger';

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

const app = new Hono<AppEnv>();

// Protect admin routes
app.use('/admin/*', authMiddleware({ allowRoles: ['admin'] }));

// === VALIDATION SCHEMAS ===

const searchSchema = z.object({
  query: z.string().optional(),
  hsk_level: z.coerce.number().int().min(1).max(9).optional(),
  category: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  sort: z.enum(['hanzi', 'pinyin', 'hsk_level', 'category']).optional().default('hanzi'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});

const createVocabSchema = z.object({
  hanzi: z.string().min(1),
  pinyin: z.string().min(1),
  english: z.string().min(1),
  category: z.string().min(1),
  hskLevel: z.number().int().min(1).max(9),
  tags: z.array(z.string()).optional(),
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

    // Text search across hanzi, pinyin, and english
    // Escape special LIKE characters to prevent injection
    if (filters.query) {
      const escapedQuery = escapeLikePattern(filters.query);
      const searchTerm = `%${escapedQuery}%`;
      conditions.push(
        or(
          like(vocabulary.hanzi, searchTerm),
          like(vocabulary.pinyin, searchTerm),
          like(vocabulary.english, searchTerm)
        )
      );
    }

    // HSK level filter
    if (filters.hsk_level) {
      conditions.push(eq(vocabulary.hskLevel, filters.hsk_level));
    }

    // Category filter
    if (filters.category) {
      conditions.push(eq(vocabulary.category, filters.category));
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

    return c.json({
      results,
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

export default app;

