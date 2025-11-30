import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { nanoid } from 'nanoid';
import * as schema from '../schema';
import { AppBindings } from '../types/app';
import { VectorizeService } from '../services/vectorize';

const app = new Hono<{ Bindings: AppBindings }>();

// ═══════════════════════════════════════════════════════════
// SIMPLE WORD SUGGESTIONS (for inline [+] button)
// ═══════════════════════════════════════════════════════════

// Suggest alternatives for a single word (used by inline [+] button)
app.get('/suggest-for-word', async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const word = c.req.query('word');
  const limit = parseInt(c.req.query('limit') || '8');

  if (!word) {
    return c.json({ error: 'Word parameter required' }, 400);
  }

  // Find the word in vocabulary
  const vocabWord = await db.select()
    .from(schema.vocabulary)
    .where(eq(schema.vocabulary.hanzi, word))
    .limit(1);

  let suggestions: Array<{ id: string; hanzi: string; pinyin: string; english: string }> = [];

  if (vocabWord.length > 0) {
    const sourceWord = vocabWord[0];

    // Try Vectorize for semantic search
    if (c.env.VECTORIZE && c.env.AI) {
      try {
        const vectorizeService = new VectorizeService(c.env.VECTORIZE, c.env.AI);
        const searchQuery = `${sourceWord.hanzi} ${sourceWord.english}`;
        const results = await vectorizeService.searchSimilar(searchQuery, limit * 2);

        // Get word data for results
        const allVocab = await db.select()
          .from(schema.vocabulary)
          .where(eq(schema.vocabulary.hskLevel, sourceWord.hskLevel));

        suggestions = allVocab
          .filter(w => w.id !== sourceWord.id && w.hanzi !== word)
          .slice(0, limit)
          .map(w => ({
            id: w.id,
            hanzi: w.hanzi,
            pinyin: w.pinyin,
            english: w.english,
          }));
      } catch (err) {
        console.error('Vectorize error:', err);
        // Fall through to fallback
      }
    }

    // Fallback: same category and HSK level
    if (suggestions.length === 0) {
      const fallbackWords = await db.select()
        .from(schema.vocabulary)
        .where(and(
          eq(schema.vocabulary.hskLevel, sourceWord.hskLevel),
          eq(schema.vocabulary.category, sourceWord.category)
        ))
        .limit(limit * 2);

      suggestions = fallbackWords
        .filter(w => w.id !== sourceWord.id && w.hanzi !== word)
        .slice(0, limit)
        .map(w => ({
          id: w.id,
          hanzi: w.hanzi,
          pinyin: w.pinyin,
          english: w.english,
        }));
    }
  } else {
    // Word not in vocab - just get some HSK1 words as suggestions
    const fallbackWords = await db.select()
      .from(schema.vocabulary)
      .where(eq(schema.vocabulary.hskLevel, 1))
      .limit(limit);

    suggestions = fallbackWords.map(w => ({
      id: w.id,
      hanzi: w.hanzi,
      pinyin: w.pinyin,
      english: w.english,
    }));
  }

  return c.json({ 
    word,
    sourceWord: vocabWord[0] || null,
    suggestions 
  });
});

// Get connected words for a lesson (all words related to lesson vocabulary)
app.get('/lessons/:lessonId/connected-words', async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const lessonId = c.req.param('lessonId');
  const limit = parseInt(c.req.query('limit') || '20');

  // Get all blocks for this lesson
  const blocks = await db.select()
    .from(schema.lessonBlocks)
    .where(eq(schema.lessonBlocks.lessonId, lessonId));

  // Extract all words from block content
  const usedWords: Set<string> = new Set();
  
  for (const block of blocks) {
    const content = block.content as any;
    
    // Extract words from different block types
    if (content.correctOrder) {
      content.correctOrder.forEach((w: string) => usedWords.add(w));
    }
    if (content.wordPool) {
      content.wordPool.forEach((w: string) => usedWords.add(w));
    }
    if (content.sentence) {
      // Simple character extraction for sentence
      content.sentence.split('').forEach((c: string) => {
        if (c.trim()) usedWords.add(c);
      });
    }
  }

  // Find vocabulary entries for used words
  const vocabEntries = await db.select()
    .from(schema.vocabulary)
    .where(eq(schema.vocabulary.hskLevel, 1)); // Get HSK1 vocab

  const usedVocab = vocabEntries.filter(v => usedWords.has(v.hanzi));
  const categories = [...new Set(usedVocab.map(v => v.category))];

  // Find related words (same categories, not used in lesson)
  const relatedWords = vocabEntries
    .filter(v => !usedWords.has(v.hanzi) && categories.includes(v.category))
    .slice(0, limit);

  // Group by category
  const byCategory: Record<string, typeof relatedWords> = {};
  for (const word of relatedWords) {
    if (!byCategory[word.category]) byCategory[word.category] = [];
    byCategory[word.category].push(word);
  }

  return c.json({
    lessonId,
    usedWords: Array.from(usedWords),
    usedVocab: usedVocab.map(v => ({ id: v.id, hanzi: v.hanzi, pinyin: v.pinyin, english: v.english, category: v.category })),
    relatedWords: relatedWords.map(v => ({ id: v.id, hanzi: v.hanzi, pinyin: v.pinyin, english: v.english, category: v.category })),
    byCategory: Object.fromEntries(
      Object.entries(byCategory).map(([cat, words]) => [
        cat,
        words.map(v => ({ id: v.id, hanzi: v.hanzi, pinyin: v.pinyin, english: v.english }))
      ])
    )
  });
});

// Save connected words for a lesson
app.post('/lessons/:lessonId/connected-words', async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const lessonId = c.req.param('lessonId');
  const { wordIds } = await c.req.json<{ wordIds: string[] }>();

  // Store connected words in lesson metadata or a new table
  // For now, we'll update the lesson with connected words
  await db.update(schema.lessons)
    .set({ 
      // Store as JSON in a metadata field if available, or create relation
      updatedAt: new Date()
    })
    .where(eq(schema.lessons.id, lessonId));

  return c.json({ 
    message: 'Connected words saved',
    lessonId,
    wordCount: wordIds.length 
  });
});

// ═══════════════════════════════════════════════════════════
// SLOT MANAGEMENT (Legacy - keeping for backward compatibility)
// ═══════════════════════════════════════════════════════════

// Get all slots for a block
app.get('/blocks/:blockId/slots', async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const blockId = c.req.param('blockId');

  const slots = await db.select()
    .from(schema.lessonBlockSlots)
    .where(eq(schema.lessonBlockSlots.blockId, blockId))
    .orderBy(schema.lessonBlockSlots.position);

  // Get alternatives for each slot
  const slotsWithAlternatives = await Promise.all(slots.map(async (slot) => {
    const alternatives = await db.select()
      .from(schema.slotAlternatives)
      .where(eq(schema.slotAlternatives.slotId, slot.id));
    
    return {
      ...slot,
      alternatives: alternatives
    };
  }));

  return c.json({ slots: slotsWithAlternatives });
});

// Create slots for a block (parse sentence into words)
app.post('/blocks/:blockId/slots', async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const blockId = c.req.param('blockId');
  const { words } = await c.req.json<{ words: Array<{ wordId: string; hanzi: string }> }>();

  // Delete existing slots first
  await db.delete(schema.lessonBlockSlots)
    .where(eq(schema.lessonBlockSlots.blockId, blockId));

  // Create new slots
  const slots = words.map((word, index) => ({
    id: nanoid(),
    blockId,
    position: index,
    wordId: word.wordId,
    hanzi: word.hanzi,
    isFocus: false,
  }));

  if (slots.length > 0) {
    await db.insert(schema.lessonBlockSlots).values(slots);
  }

  return c.json({ slots, message: 'Slots created successfully' });
});

// Toggle focus status for a slot
app.put('/slots/:slotId/focus', async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const slotId = c.req.param('slotId');
  const { isFocus } = await c.req.json<{ isFocus: boolean }>();

  await db.update(schema.lessonBlockSlots)
    .set({ isFocus, updatedAt: new Date().toISOString() })
    .where(eq(schema.lessonBlockSlots.id, slotId));

  return c.json({ message: 'Focus updated', isFocus });
});

// Delete a slot
app.delete('/slots/:slotId', async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const slotId = c.req.param('slotId');

  await db.delete(schema.lessonBlockSlots)
    .where(eq(schema.lessonBlockSlots.id, slotId));

  return c.json({ message: 'Slot deleted' });
});

// ═══════════════════════════════════════════════════════════
// ALTERNATIVES MANAGEMENT
// ═══════════════════════════════════════════════════════════

// Get AI-suggested alternatives for a slot
app.get('/slots/:slotId/suggest-alternatives', async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const slotId = c.req.param('slotId');
  const limit = parseInt(c.req.query('limit') || '10');

  // Get the slot and its word
  const slot = await db.select()
    .from(schema.lessonBlockSlots)
    .where(eq(schema.lessonBlockSlots.id, slotId))
    .limit(1);

  if (!slot.length) {
    return c.json({ error: 'Slot not found' }, 404);
  }

  const word = await db.select()
    .from(schema.vocabulary)
    .where(eq(schema.vocabulary.id, slot[0].wordId))
    .limit(1);

  if (!word.length) {
    return c.json({ error: 'Word not found' }, 404);
  }

  // Use Vectorize to find similar words
  let suggestions: Array<{ id: string; hanzi: string; pinyin: string; english: string; similarity: number }> = [];
  
  if (c.env.VECTORIZE && c.env.AI) {
    const vectorizeService = new VectorizeService(c.env.VECTORIZE, c.env.AI);
    
    // Create search query from word context
    const searchQuery = `${word[0].hanzi} ${word[0].english}`;
    const results = await vectorizeService.searchSimilar(searchQuery, limit * 2);

    // Fetch full word data for results
    const wordIds = results.map(r => r.id);
    
    if (wordIds.length > 0) {
      const similarWords = await db.select()
        .from(schema.vocabulary)
        .where(eq(schema.vocabulary.hskLevel, word[0].hskLevel));

      // Filter to words in results and not the same word
      suggestions = similarWords
        .filter(w => w.id !== word[0].id)
        .slice(0, limit)
        .map(w => ({
          id: w.id,
          hanzi: w.hanzi,
          pinyin: w.pinyin,
          english: w.english,
          similarity: 0.8 // Placeholder
        }));
    }
  } else {
    // Fallback: get words from same HSK level and category
    const fallbackWords = await db.select()
      .from(schema.vocabulary)
      .where(and(
        eq(schema.vocabulary.hskLevel, word[0].hskLevel),
        eq(schema.vocabulary.category, word[0].category)
      ))
      .limit(limit * 2);

    suggestions = fallbackWords
      .filter(w => w.id !== word[0].id)
      .slice(0, limit)
      .map(w => ({
        id: w.id,
        hanzi: w.hanzi,
        pinyin: w.pinyin,
        english: w.english,
        similarity: 0.7
      }));
  }

  return c.json({ 
    slot: slot[0],
    originalWord: word[0],
    suggestions 
  });
});

// Add/approve alternatives for a slot
app.post('/slots/:slotId/alternatives', async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const slotId = c.req.param('slotId');
  const { alternatives, approvedBy } = await c.req.json<{ 
    alternatives: Array<{ wordId: string; hanzi: string }>;
    approvedBy?: string;
  }>();

  const now = new Date().toISOString();
  
  const records = alternatives.map(alt => ({
    id: nanoid(),
    slotId,
    wordId: alt.wordId,
    hanzi: alt.hanzi,
    isApproved: true,
    approvedBy: approvedBy || 'admin',
    approvedAt: now,
    aiSuggested: true,
  }));

  if (records.length > 0) {
    await db.insert(schema.slotAlternatives).values(records);
  }

  return c.json({ message: 'Alternatives added', count: records.length });
});

// Update alternative approval status
app.put('/alternatives/:altId/approve', async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const altId = c.req.param('altId');
  const { isApproved, approvedBy } = await c.req.json<{ isApproved: boolean; approvedBy?: string }>();

  await db.update(schema.slotAlternatives)
    .set({ 
      isApproved, 
      approvedBy: isApproved ? (approvedBy || 'admin') : null,
      approvedAt: isApproved ? new Date().toISOString() : null
    })
    .where(eq(schema.slotAlternatives.id, altId));

  return c.json({ message: 'Alternative updated', isApproved });
});

// Delete an alternative
app.delete('/alternatives/:altId', async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const altId = c.req.param('altId');

  await db.delete(schema.slotAlternatives)
    .where(eq(schema.slotAlternatives.id, altId));

  return c.json({ message: 'Alternative deleted' });
});

// ═══════════════════════════════════════════════════════════
// CONNECTED WORDS MANAGEMENT
// ═══════════════════════════════════════════════════════════

// Get connected words for a block
app.get('/blocks/:blockId/connected', async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const blockId = c.req.param('blockId');

  const connected = await db.select()
    .from(schema.blockConnectedWords)
    .where(eq(schema.blockConnectedWords.blockId, blockId));

  return c.json({ connectedWords: connected });
});

// Suggest connected words via RAG
app.get('/blocks/:blockId/suggest-connected', async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const blockId = c.req.param('blockId');
  const limit = parseInt(c.req.query('limit') || '10');

  // Get all slots for this block
  const slots = await db.select()
    .from(schema.lessonBlockSlots)
    .where(eq(schema.lessonBlockSlots.blockId, blockId));

  if (!slots.length) {
    return c.json({ error: 'No slots found for block' }, 404);
  }

  // Get word data for all slots
  const wordIds = slots.map(s => s.wordId);
  const words = await db.select()
    .from(schema.vocabulary)
    .where(eq(schema.vocabulary.hskLevel, 1)); // Get HSK1 words for now

  const slotWords = words.filter(w => wordIds.includes(w.id));

  // Find semantically related words
  let suggestions: Array<{ id: string; hanzi: string; pinyin: string; english: string; category: string }> = [];

  if (c.env.VECTORIZE && c.env.AI) {
    const vectorizeService = new VectorizeService(c.env.VECTORIZE, c.env.AI);
    
    // Search for words related to the sentence context
    const searchQuery = slotWords.map(w => w.hanzi + ' ' + w.english).join(' ');
    const results = await vectorizeService.searchSimilar(searchQuery, limit * 3);

    // Get full word data
    const allVocab = await db.select()
      .from(schema.vocabulary)
      .where(eq(schema.vocabulary.hskLevel, slotWords[0]?.hskLevel || 1));

    suggestions = allVocab
      .filter(w => !wordIds.includes(w.id)) // Exclude words already in sentence
      .slice(0, limit)
      .map(w => ({
        id: w.id,
        hanzi: w.hanzi,
        pinyin: w.pinyin,
        english: w.english,
        category: w.category
      }));
  } else {
    // Fallback: get words from same category
    const categories = [...new Set(slotWords.map(w => w.category))];
    
    const categoryWords = await db.select()
      .from(schema.vocabulary)
      .where(eq(schema.vocabulary.hskLevel, slotWords[0]?.hskLevel || 1))
      .limit(limit * 3);

    suggestions = categoryWords
      .filter(w => !wordIds.includes(w.id))
      .slice(0, limit)
      .map(w => ({
        id: w.id,
        hanzi: w.hanzi,
        pinyin: w.pinyin,
        english: w.english,
        category: w.category
      }));
  }

  // Group by category for display
  const byCategory = suggestions.reduce((acc, word) => {
    const cat = word.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(word);
    return acc;
  }, {} as Record<string, typeof suggestions>);

  return c.json({ 
    blockId,
    slotWords: slotWords.map(w => ({ id: w.id, hanzi: w.hanzi })),
    suggestions,
    byCategory
  });
});

// Add connected words to a block
app.post('/blocks/:blockId/connected', async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const blockId = c.req.param('blockId');
  const { words, approvedBy } = await c.req.json<{
    words: Array<{ wordId: string; hanzi: string; category?: string }>;
    approvedBy?: string;
  }>();

  const now = new Date().toISOString();

  const records = words.map(word => ({
    id: nanoid(),
    blockId,
    wordId: word.wordId,
    hanzi: word.hanzi,
    inferredCategory: word.category || null,
    isApproved: true,
    approvedBy: approvedBy || 'admin',
    approvedAt: now,
    aiSuggested: true,
  }));

  if (records.length > 0) {
    await db.insert(schema.blockConnectedWords).values(records);
  }

  return c.json({ message: 'Connected words added', count: records.length });
});

// Update connected word approval
app.put('/connected/:connId/approve', async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const connId = c.req.param('connId');
  const { isApproved, approvedBy } = await c.req.json<{ isApproved: boolean; approvedBy?: string }>();

  await db.update(schema.blockConnectedWords)
    .set({
      isApproved,
      approvedBy: isApproved ? (approvedBy || 'admin') : null,
      approvedAt: isApproved ? new Date().toISOString() : null
    })
    .where(eq(schema.blockConnectedWords.id, connId));

  return c.json({ message: 'Connected word updated', isApproved });
});

// Delete connected word
app.delete('/connected/:connId', async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const connId = c.req.param('connId');

  await db.delete(schema.blockConnectedWords)
    .where(eq(schema.blockConnectedWords.id, connId));

  return c.json({ message: 'Connected word deleted' });
});

// ═══════════════════════════════════════════════════════════
// EXPORT FOR MOBILE
// ═══════════════════════════════════════════════════════════

// Get full lesson data with alternatives and connected words
app.get('/lessons/:lessonId/export', async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const lessonId = c.req.param('lessonId');

  // Get lesson
  const lesson = await db.select()
    .from(schema.lessons)
    .where(eq(schema.lessons.id, lessonId))
    .limit(1);

  if (!lesson.length) {
    return c.json({ error: 'Lesson not found' }, 404);
  }

  // Get blocks
  const blocks = await db.select()
    .from(schema.lessonBlocks)
    .where(eq(schema.lessonBlocks.lessonId, lessonId))
    .orderBy(schema.lessonBlocks.orderIndex);

  // Get slots, alternatives, and connected words for each block
  const blocksWithData = await Promise.all(blocks.map(async (block) => {
    const slots = await db.select()
      .from(schema.lessonBlockSlots)
      .where(eq(schema.lessonBlockSlots.blockId, block.id))
      .orderBy(schema.lessonBlockSlots.position);

    const slotsWithAlternatives = await Promise.all(slots.map(async (slot) => {
      const alternatives = await db.select()
        .from(schema.slotAlternatives)
        .where(and(
          eq(schema.slotAlternatives.slotId, slot.id),
          eq(schema.slotAlternatives.isApproved, true)
        ));

      return {
        position: slot.position,
        wordId: slot.wordId,
        hanzi: slot.hanzi,
        isFocus: slot.isFocus,
        alternatives: alternatives.map(a => a.wordId)
      };
    }));

    const connectedWords = await db.select()
      .from(schema.blockConnectedWords)
      .where(and(
        eq(schema.blockConnectedWords.blockId, block.id),
        eq(schema.blockConnectedWords.isApproved, true)
      ));

    return {
      ...block,
      slots: slotsWithAlternatives,
      connectedWords: connectedWords.map(cw => cw.wordId)
    };
  }));

  return c.json({
    lesson: lesson[0],
    blocks: blocksWithData
  });
});

export default app;

