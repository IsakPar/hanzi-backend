/**
 * Distractor Generation Routes
 * 
 * Provides pedagogically-correct MCQ distractors using a multi-strategy approach:
 * 1. Same category (best) - 妈妈 → 爸爸, 姐姐
 * 2. Same POS (good) - noun → other nouns
 * 3. Same tone pattern (hard) - 1-1 → other 1-1 words
 * 4. Similar length (visual) - 2 chars → 2 char words
 * 5. Semantic fallback (creative) - vector similarity
 * 
 * Also provides AI-powered metadata tagging for vocabulary enrichment.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { drizzle } from 'drizzle-orm/d1';
import { eq, ne, and, lte, sql, notInArray } from 'drizzle-orm';
import { vocabulary } from '../schema';
import { jwtAuthMiddleware } from '../middleware/jwt-auth';
import { bulkTaggingRateLimit } from '../middleware/rate-limit';
import { VectorizeService } from '../services/vectorize';
import { AIUsageLogger } from '../services/ai-usage-logger';
import { OPENROUTER_PRICING } from '../services/openrouter-client';
import { logWithContext } from '../utils/logger';
import type { AppEnv } from '../types/app';

const app = new Hono<AppEnv>();

// Protect all routes with auth
app.use('/*', jwtAuthMiddleware({ allowRoles: ['admin'] }));

// Apply higher rate limit for tagging endpoints
app.use('/tag', bulkTaggingRateLimit);
app.use('/tag-bulk', bulkTaggingRateLimit);

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface VocabWord {
  id: string;
  hanzi: string;
  pinyin: string;
  english: string;
  category: string;
  hskLevel: number;
  pos?: string | null;
  tonePattern?: string | null;
}

interface DistractorResponse {
  source: {
    id: string;
    word: string;
    pinyin: string;
    english: string;
    category: string;
    pos?: string | null;
    tonePattern?: string | null;
    hskLevel: number;
  };
  distractors: {
    sameCategory: VocabWord[];
    samePos: VocabWord[];
    sameTone: VocabWord[];
    similarLength: VocabWord[];
    semantic: VocabWord[];
  };
  total: number;
}

// ═══════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════

const distractorSchema = z.object({
  wordId: z.string().optional(),
  word: z.string().optional(),
  maxHskLevel: z.number().int().min(1).max(9).default(9),
  count: z.number().int().min(5).max(30).default(15),
  strategies: z.array(z.enum([
    'same-category',
    'same-pos',
    'same-tone',
    'similar-length',
    'semantic'
  ])).default(['same-category', 'same-pos', 'same-tone', 'similar-length', 'semantic']),
});

const tagSchema = z.object({
  wordId: z.string(),
  field: z.enum(['pos', 'tonePattern', 'category']),
});

const bulkTagSchema = z.object({
  wordIds: z.array(z.string()).min(1).max(50),
  field: z.enum(['pos', 'tonePattern']),
});

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Push unique items to a bucket, tracking seen IDs
 */
function pushUnique(bucket: VocabWord[], rows: VocabWord[], seen: Set<string>, limit: number) {
  for (const row of rows) {
    if (bucket.length >= limit) break;
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    bucket.push(row);
  }
}

/**
 * Extract tone pattern from pinyin
 * e.g., "māmā" → "1-1", "nǐ hǎo" → "3-3"
 */
function extractTonePattern(pinyin: string): string {
  const toneMap: Record<string, string> = {
    'ā': '1', 'á': '2', 'ǎ': '3', 'à': '4',
    'ē': '1', 'é': '2', 'ě': '3', 'è': '4',
    'ī': '1', 'í': '2', 'ǐ': '3', 'ì': '4',
    'ō': '1', 'ó': '2', 'ǒ': '3', 'ò': '4',
    'ū': '1', 'ú': '2', 'ǔ': '3', 'ù': '4',
    'ǖ': '1', 'ǘ': '2', 'ǚ': '3', 'ǜ': '4',
  };
  
  const tones: string[] = [];
  const syllables = pinyin.toLowerCase().split(/\s+/);
  
  for (const syllable of syllables) {
    let foundTone = '5'; // neutral tone default
    for (const char of syllable) {
      if (toneMap[char]) {
        foundTone = toneMap[char];
        break;
      }
    }
    tones.push(foundTone);
  }
  
  return tones.join('-');
}

// ═══════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════

/**
 * GET /distractors - Get pedagogically-correct distractors for a word
 */
app.get('/', zValidator('query', distractorSchema), async (c) => {
  const params = c.req.valid('query');
  const requestId = c.get('requestId');
  const db = drizzle(c.env.DB);
  
  logWithContext('info', 'distractors.get_start', {
    requestId,
    meta: { wordId: params.wordId, word: params.word, maxHskLevel: params.maxHskLevel },
  });

  // 1. Get source word
  let sourceWord: VocabWord | undefined;
  
  if (params.wordId) {
    const result = await db.select().from(vocabulary).where(eq(vocabulary.id, params.wordId)).get();
    if (result) {
      sourceWord = {
        id: result.id,
        hanzi: result.hanzi,
        pinyin: result.pinyin,
        english: result.english,
        category: result.category,
        hskLevel: result.hskLevel,
        pos: result.pos,
        tonePattern: result.tonePattern,
      };
    }
  } else if (params.word) {
    // Search by hanzi, prefer lower HSK level
    const result = await db.select()
      .from(vocabulary)
      .where(eq(vocabulary.hanzi, params.word))
      .orderBy(vocabulary.hskLevel)
      .get();
    if (result) {
      sourceWord = {
        id: result.id,
        hanzi: result.hanzi,
        pinyin: result.pinyin,
        english: result.english,
        category: result.category,
        hskLevel: result.hskLevel,
        pos: result.pos,
        tonePattern: result.tonePattern,
      };
    }
  }

  if (!sourceWord) {
    return c.json({ error: 'Word not found' }, 404);
  }

  // Derive tone pattern if not set
  const effectiveTonePattern = sourceWord.tonePattern || extractTonePattern(sourceWord.pinyin);

  // Initialize response
  const response: DistractorResponse = {
    source: {
      id: sourceWord.id,
      word: sourceWord.hanzi,
      pinyin: sourceWord.pinyin,
      english: sourceWord.english,
      category: sourceWord.category,
      pos: sourceWord.pos,
      tonePattern: effectiveTonePattern,
      hskLevel: sourceWord.hskLevel,
    },
    distractors: {
      sameCategory: [],
      samePos: [],
      sameTone: [],
      similarLength: [],
      semantic: [],
    },
    total: 0,
  };

  const seen = new Set<string>([sourceWord.id]);

  // 2. Same category (best distractors)
  if (params.strategies.includes('same-category') && sourceWord.category) {
    const rows = await db.select()
      .from(vocabulary)
      .where(and(
        eq(vocabulary.category, sourceWord.category),
        ne(vocabulary.id, sourceWord.id),
        lte(vocabulary.hskLevel, params.maxHskLevel)
      ))
      .limit(10);
    
    pushUnique(response.distractors.sameCategory, rows.map(r => ({
      id: r.id,
      hanzi: r.hanzi,
      pinyin: r.pinyin,
      english: r.english,
      category: r.category,
      hskLevel: r.hskLevel,
      pos: r.pos,
      tonePattern: r.tonePattern,
    })), seen, 8);
  }

  // 3. Same POS (good distractors)
  if (params.strategies.includes('same-pos') && sourceWord.pos) {
    const rows = await db.select()
      .from(vocabulary)
      .where(and(
        eq(vocabulary.pos, sourceWord.pos),
        ne(vocabulary.id, sourceWord.id),
        lte(vocabulary.hskLevel, params.maxHskLevel)
      ))
      .limit(10);
    
    pushUnique(response.distractors.samePos, rows.map(r => ({
      id: r.id,
      hanzi: r.hanzi,
      pinyin: r.pinyin,
      english: r.english,
      category: r.category,
      hskLevel: r.hskLevel,
      pos: r.pos,
      tonePattern: r.tonePattern,
    })), seen, 5);
  }

  // 4. Same tone pattern (hard distractors)
  if (params.strategies.includes('same-tone') && effectiveTonePattern) {
    const rows = await db.select()
      .from(vocabulary)
      .where(and(
        eq(vocabulary.tonePattern, effectiveTonePattern),
        ne(vocabulary.id, sourceWord.id),
        lte(vocabulary.hskLevel, params.maxHskLevel)
      ))
      .limit(8);
    
    pushUnique(response.distractors.sameTone, rows.map(r => ({
      id: r.id,
      hanzi: r.hanzi,
      pinyin: r.pinyin,
      english: r.english,
      category: r.category,
      hskLevel: r.hskLevel,
      pos: r.pos,
      tonePattern: r.tonePattern,
    })), seen, 4);
  }

  // 5. Similar length
  if (params.strategies.includes('similar-length')) {
    const wordLength = sourceWord.hanzi.length;
    const rows = await db.select()
      .from(vocabulary)
      .where(and(
        sql`LENGTH(${vocabulary.hanzi}) = ${wordLength}`,
        ne(vocabulary.id, sourceWord.id),
        lte(vocabulary.hskLevel, params.maxHskLevel)
      ))
      .limit(8);
    
    pushUnique(response.distractors.similarLength, rows.map(r => ({
      id: r.id,
      hanzi: r.hanzi,
      pinyin: r.pinyin,
      english: r.english,
      category: r.category,
      hskLevel: r.hskLevel,
      pos: r.pos,
      tonePattern: r.tonePattern,
    })), seen, 4);
  }

  // 6. Vector fallback (only if we need more)
  const totalSoFar = seen.size - 1; // -1 for source word
  if (params.strategies.includes('semantic') && totalSoFar < params.count) {
    try {
      if (c.env.VECTORIZE && c.env.AI) {
        const vectorize = new VectorizeService(c.env.VECTORIZE, c.env.AI, requestId);
        const needed = params.count - totalSoFar + 5;
        
        const vectorResults = await vectorize.search(sourceWord.hanzi, {
          type: 'vocabulary',
          hskLevel: params.maxHskLevel,
          topK: needed,
        });

        // Fetch full vocab data for vector results
        const vectorIds = vectorResults
          .filter(r => !seen.has(r.metadata?.id || ''))
          .map(r => r.metadata?.id)
          .filter(Boolean) as string[];

        if (vectorIds.length > 0) {
          const rows = await db.select()
            .from(vocabulary)
            .where(and(
              sql`${vocabulary.id} IN (${sql.join(vectorIds.map(id => sql`${id}`), sql`, `)})`,
              lte(vocabulary.hskLevel, params.maxHskLevel)
            ))
            .limit(6);

          pushUnique(response.distractors.semantic, rows.map(r => ({
            id: r.id,
            hanzi: r.hanzi,
            pinyin: r.pinyin,
            english: r.english,
            category: r.category,
            hskLevel: r.hskLevel,
            pos: r.pos,
            tonePattern: r.tonePattern,
          })), seen, 6);
        }
      }
    } catch (err) {
      logWithContext('warn', 'distractors.vector_fallback_failed', {
        requestId,
        meta: { error: (err as Error).message },
      });
    }
  }

  // Calculate total
  response.total = 
    response.distractors.sameCategory.length +
    response.distractors.samePos.length +
    response.distractors.sameTone.length +
    response.distractors.similarLength.length +
    response.distractors.semantic.length;

  logWithContext('info', 'distractors.get_complete', {
    requestId,
    meta: { 
      sourceWord: sourceWord.hanzi, 
      total: response.total,
      byStrategy: {
        sameCategory: response.distractors.sameCategory.length,
        samePos: response.distractors.samePos.length,
        sameTone: response.distractors.sameTone.length,
        similarLength: response.distractors.similarLength.length,
        semantic: response.distractors.semantic.length,
      }
    },
  });

  return c.json(response);
});

/**
 * POST /distractors/tag - AI-powered metadata tagging for a single word
 */
app.post('/tag', zValidator('json', tagSchema), async (c) => {
  const { wordId, field } = c.req.valid('json');
  const requestId = c.get('requestId');
  const db = drizzle(c.env.DB);
  const config = c.get('config');

  // Get the word
  const word = await db.select().from(vocabulary).where(eq(vocabulary.id, wordId)).get();
  if (!word) {
    return c.json({ error: 'Word not found' }, 404);
  }

  // Build AI prompt based on field
  let prompt: string;
  let validValues: string[];

  if (field === 'pos') {
    validValues = ['noun', 'verb', 'adj', 'adv', 'pronoun', 'particle', 'num', 'measure', 'conjunction', 'preposition'];
    prompt = `What is the part of speech for the Chinese word "${word.hanzi}" (${word.pinyin}, meaning: ${word.english})?
Reply with ONLY one of: ${validValues.join(', ')}`;
  } else if (field === 'tonePattern') {
    // For tone pattern, we can compute it from pinyin
    const tonePattern = extractTonePattern(word.pinyin);
    
    // Update directly without AI
    await db.update(vocabulary)
      .set({ tonePattern })
      .where(eq(vocabulary.id, wordId));

    return c.json({ 
      success: true, 
      wordId, 
      field, 
      value: tonePattern,
      computed: true,
    });
  } else if (field === 'category') {
    validValues = ['family', 'food', 'animals', 'numbers', 'time', 'places', 'body', 'colors', 'actions', 'adjectives', 'pronouns', 'greetings', 'transport', 'nature', 'occupation', 'objects', 'weather', 'emotions', 'education', 'other'];
    prompt = `What category best describes the Chinese word "${word.hanzi}" (${word.pinyin}, meaning: ${word.english})?
Reply with ONLY one of: ${validValues.join(', ')}`;
  } else {
    return c.json({ error: 'Invalid field' }, 400);
  }

  // Call AI
  try {
    const apiKey = config.secrets.openRouterApiKey || config.secrets.openAIApiKey;
    if (!apiKey) {
      return c.json({ error: 'AI not configured' }, 500);
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a Chinese language expert. Answer with ONLY the requested value, no explanation.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 20,
        temperature: 0,
      }),
    });

    const result = await response.json() as any;
    const aiValue = result.choices?.[0]?.message?.content?.trim()?.toLowerCase();
    const inputTokens = result.usage?.prompt_tokens || 0;
    const outputTokens = result.usage?.completion_tokens || 0;

    // Log AI usage for cost tracking
    const aiLogger = new AIUsageLogger(c.env.DB);
    const pricing = OPENROUTER_PRICING['deepseek/deepseek-chat'];
    const cost = pricing 
      ? (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output
      : 0;
    
    await aiLogger.log({
      sessionId: requestId,
      model: 'deepseek/deepseek-chat',
      endpoint: 'distractors-tag',
      inputTokens,
      outputTokens,
      cost,
      success: !!aiValue && validValues.includes(aiValue),
      requestType: `tag_${field}`,
      metadata: { wordId, hanzi: word.hanzi },
    });

    if (!aiValue || !validValues.includes(aiValue)) {
      logWithContext('warn', 'distractors.tag_invalid_response', {
        requestId,
        meta: { wordId, field, aiValue, validValues },
      });
      return c.json({ 
        error: 'AI returned invalid value', 
        aiValue,
        validValues,
      }, 400);
    }

    // Update the word
    if (field === 'pos') {
      await db.update(vocabulary).set({ pos: aiValue }).where(eq(vocabulary.id, wordId));
    } else if (field === 'category') {
      await db.update(vocabulary).set({ category: aiValue }).where(eq(vocabulary.id, wordId));
    }

    logWithContext('info', 'distractors.tag_success', {
      requestId,
      meta: { wordId, field, value: aiValue },
    });

    return c.json({ 
      success: true, 
      wordId, 
      field, 
      value: aiValue,
    });
  } catch (err) {
    logWithContext('error', 'distractors.tag_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'AI tagging failed' }, 500);
  }
});

/**
 * POST /distractors/tag-bulk - Bulk AI-powered metadata tagging
 */
app.post('/tag-bulk', zValidator('json', bulkTagSchema), async (c) => {
  const { wordIds, field } = c.req.valid('json');
  const requestId = c.get('requestId');
  const db = drizzle(c.env.DB);

  const results: { wordId: string; value: string; success: boolean; error?: string }[] = [];

  // For tone pattern, we can compute without AI
  if (field === 'tonePattern') {
    for (const wordId of wordIds) {
      const word = await db.select().from(vocabulary).where(eq(vocabulary.id, wordId)).get();
      if (!word) {
        results.push({ wordId, value: '', success: false, error: 'Not found' });
        continue;
      }

      const tonePattern = extractTonePattern(word.pinyin);
      await db.update(vocabulary)
        .set({ tonePattern })
        .where(eq(vocabulary.id, wordId));
      
      results.push({ wordId, value: tonePattern, success: true });
    }

    return c.json({ results, computed: true });
  }

  // For POS, we need AI - process one by one (could batch later)
  // Note: For now, redirect to single tag endpoint
  return c.json({ 
    error: 'Bulk POS tagging not yet implemented. Use /tag for individual words.',
    hint: 'Tone pattern bulk tagging is available.',
  }, 501);
});

/**
 * GET /distractors/stats - Get vocabulary metadata coverage stats
 */
app.get('/stats', async (c) => {
  const db = drizzle(c.env.DB);

  const total = await db.select({ count: sql<number>`COUNT(*)` }).from(vocabulary).get();
  const withPos = await db.select({ count: sql<number>`COUNT(*)` }).from(vocabulary).where(sql`pos IS NOT NULL`).get();
  const withTone = await db.select({ count: sql<number>`COUNT(*)` }).from(vocabulary).where(sql`tone_pattern IS NOT NULL`).get();

  const categories = await db.select({
    category: vocabulary.category,
    count: sql<number>`COUNT(*)`,
  }).from(vocabulary).groupBy(vocabulary.category);

  const posTypes = await db.select({
    pos: vocabulary.pos,
    count: sql<number>`COUNT(*)`,
  }).from(vocabulary).where(sql`pos IS NOT NULL`).groupBy(vocabulary.pos);

  return c.json({
    total: total?.count || 0,
    coverage: {
      pos: {
        count: withPos?.count || 0,
        percent: total?.count ? Math.round((withPos?.count || 0) / total.count * 100) : 0,
      },
      tonePattern: {
        count: withTone?.count || 0,
        percent: total?.count ? Math.round((withTone?.count || 0) / total.count * 100) : 0,
      },
    },
    byCategory: categories,
    byPos: posTypes,
  });
});

export default app;

