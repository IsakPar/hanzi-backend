/// <reference types="@cloudflare/workers-types" />
/**
 * Vectorize Population Script
 * 
 * Indexes existing vocabulary, lessons, and stories into the Vectorize index.
 * Run via: npx wrangler dev scripts/populate-vectors.ts (local)
 * Or deploy and call the endpoint.
 * 
 * This script is designed to be run once initially, then the auto-indexing
 * in content routes will keep things up to date.
 */

import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../src/schema';
import { VectorizeService } from '../src/services/vectorize';

interface Env {
  DB: D1Database;
  VECTORIZE: VectorizeIndex;
  AI: Ai;
}

const app = new Hono<{ Bindings: Env }>();

/**
 * POST /populate - Populate Vectorize with existing content
 * Returns progress and stats
 */
app.post('/populate', async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const vectorize = new VectorizeService(c.env.VECTORIZE, c.env.AI as any, 'populate-script');
  
  const results = {
    vocabulary: { success: 0, failed: 0 },
    lessons: { success: 0, failed: 0 },
    stories: { success: 0, failed: 0 },
    totalTime: 0,
  };
  
  const startTime = Date.now();

  try {
    // 1. Index vocabulary
    console.log('📚 Indexing vocabulary...');
    const vocab = await db.select().from(schema.vocabulary);
    
    const vocabItems = vocab.map(v => ({
      type: 'vocabulary' as const,
      id: v.id,
      text: `${v.hanzi} ${v.pinyin} ${v.english} ${v.category || ''} ${v.exampleChinese || ''}`,
      metadata: {
        title: v.hanzi,
        hanzi: v.hanzi,
        pinyin: v.pinyin,
        hskLevel: v.hskLevel,
      },
    }));
    
    const vocabResult = await vectorize.upsertBatch(vocabItems);
    results.vocabulary = vocabResult;
    console.log(`✅ Vocabulary: ${vocabResult.success} indexed, ${vocabResult.failed} failed`);

    // 2. Index lessons
    console.log('📖 Indexing lessons...');
    const lessons = await db.select().from(schema.lessons);
    
    const lessonItems = lessons.map(l => ({
      type: 'lesson' as const,
      id: l.id,
      text: `${l.title} ${l.subtitle || ''} ${l.description || ''} HSK ${l.hskLevel} ${l.lessonType}`,
      metadata: {
        title: l.title,
        hskLevel: l.hskLevel,
      },
    }));
    
    const lessonResult = await vectorize.upsertBatch(lessonItems);
    results.lessons = lessonResult;
    console.log(`✅ Lessons: ${lessonResult.success} indexed, ${lessonResult.failed} failed`);

    // 3. Index stories
    console.log('📕 Indexing stories...');
    const stories = await db.select().from(schema.stories);
    
    const storyItems = stories.map(s => ({
      type: 'story' as const,
      id: s.id,
      text: `${s.title} ${s.subtitle || ''} ${s.description || ''} ${s.topic || ''} HSK ${s.hskLevel}`,
      metadata: {
        title: s.title,
        hskLevel: s.hskLevel,
      },
    }));
    
    const storyResult = await vectorize.upsertBatch(storyItems);
    results.stories = storyResult;
    console.log(`✅ Stories: ${storyResult.success} indexed, ${storyResult.failed} failed`);

    results.totalTime = Date.now() - startTime;
    
    // Get final stats
    const stats = await vectorize.getStats();
    
    return c.json({
      success: true,
      results,
      vectorCount: stats.vectorCount,
      message: `Indexed ${results.vocabulary.success + results.lessons.success + results.stories.success} items in ${results.totalTime}ms`,
    });

  } catch (err) {
    return c.json({
      success: false,
      error: (err as Error).message,
      results,
      totalTime: Date.now() - startTime,
    }, 500);
  }
});

/**
 * GET /stats - Get Vectorize index stats
 */
app.get('/stats', async (c) => {
  const vectorize = new VectorizeService(c.env.VECTORIZE, c.env.AI as any, 'stats');
  
  try {
    const stats = await vectorize.getStats();
    return c.json(stats);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

/**
 * POST /test-search - Test semantic search
 */
app.post('/test-search', async (c) => {
  const { query, type, hskLevel, limit } = await c.req.json();
  
  if (!query) {
    return c.json({ error: 'Query required' }, 400);
  }
  
  const vectorize = new VectorizeService(c.env.VECTORIZE, c.env.AI as any, 'test-search');
  
  try {
    const results = await vectorize.search(query, {
      type,
      hskLevel,
      topK: limit || 10,
    });
    
    return c.json({
      query,
      results,
      count: results.length,
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

export default app;

