/**
 * Curriculum RAG Service
 * 
 * Retrieval-Augmented Generation using Cloudflare Vectorize
 * to provide curriculum context for lesson generation.
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and, sql } from 'drizzle-orm';
import { lessons, vocabulary, units } from '../schema';
import { generateEmbedding, generateEmbeddings } from './ai-models';
import type { Ai } from '@cloudflare/workers-types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CurriculumContext {
  lessons: LessonContext[];
  vocabulary: VocabContext[];
  patterns: PatternContext[];
  summary: string;
}

export interface LessonContext {
  id: string;
  title: string;
  hskLevel: number;
  lessonNumber: number;
  summary: string;
  vocabTaught: string[];
  patternsTaught: string[];
}

export interface VocabContext {
  id: string;
  hanzi: string;
  pinyin: string;
  english: string;
  hskLevel: number;
  introducedInLesson?: number;
}

export interface PatternContext {
  name: string;
  template: string;
  examples: string[];
  introducedInLesson: number;
}

export interface VectorizeMatch {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════
// CURRICULUM SYNC
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sync all curriculum data to Vectorize for RAG
 */
export async function syncCurriculumToVectorize(
  db: D1Database,
  vectorize: VectorizeIndex,
  ai: Ai
): Promise<{ lessonsIndexed: number; vocabIndexed: number; patternsIndexed: number }> {
  const drizzleDb = drizzle(db);
  
  // 1. Sync lessons
  const allLessons = await drizzleDb
    .select()
    .from(lessons)
    .where(eq(lessons.status, 'published'))
    .all();

  const lessonEmbeddings: { id: string; values: number[]; metadata: Record<string, unknown> }[] = [];
  
  for (const lesson of allLessons) {
    // Create a text summary for embedding
    const summary = createLessonSummary(lesson);
    const embedding = await generateEmbedding(summary, ai);
    
    lessonEmbeddings.push({
      id: `lesson-${lesson.id}`,
      values: embedding,
      metadata: {
        type: 'lesson',
        sourceId: lesson.id,
        title: lesson.title,
        hskLevel: lesson.hskLevel,
        lessonNumber: lesson.lessonNumber,
        summary: summary.substring(0, 500),
      },
    });
  }

  if (lessonEmbeddings.length > 0) {
    await vectorize.upsert(lessonEmbeddings);
  }

  // 2. Sync vocabulary
  const allVocab = await drizzleDb
    .select()
    .from(vocabulary)
    .all();

  const vocabEmbeddings: { id: string; values: number[]; metadata: Record<string, unknown> }[] = [];
  
  // Batch embed vocab (more efficient)
  const vocabTexts = allVocab.map(v => `${v.hanzi} (${v.pinyin}): ${v.english}`);
  const vocabVectors = await generateEmbeddings(vocabTexts, ai);
  
  for (let i = 0; i < allVocab.length; i++) {
    const v = allVocab[i];
    vocabEmbeddings.push({
      id: `vocab-${v.id}`,
      values: vocabVectors[i],
      metadata: {
        type: 'vocabulary',
        sourceId: v.id,
        hanzi: v.hanzi,
        pinyin: v.pinyin,
        english: v.english,
        hskLevel: v.hskLevel,
        category: v.category,
      },
    });
  }

  if (vocabEmbeddings.length > 0) {
    // Upsert in batches of 100
    for (let i = 0; i < vocabEmbeddings.length; i += 100) {
      const batch = vocabEmbeddings.slice(i, i + 100);
      await vectorize.upsert(batch);
    }
  }

  // 3. Extract and sync grammar patterns
  const patterns = await extractPatternsFromLessons(drizzleDb);
  const patternEmbeddings: { id: string; values: number[]; metadata: Record<string, unknown> }[] = [];
  
  for (const pattern of patterns) {
    const text = `${pattern.name}: ${pattern.template}. Examples: ${pattern.examples.join(', ')}`;
    const embedding = await generateEmbedding(text, ai);
    
    patternEmbeddings.push({
      id: `pattern-${pattern.name.replace(/\s+/g, '-').toLowerCase()}`,
      values: embedding,
      metadata: {
        type: 'pattern',
        name: pattern.name,
        template: pattern.template,
        examples: pattern.examples.slice(0, 3),
        hskLevel: pattern.hskLevel,
      },
    });
  }

  if (patternEmbeddings.length > 0) {
    await vectorize.upsert(patternEmbeddings);
  }

  return {
    lessonsIndexed: lessonEmbeddings.length,
    vocabIndexed: vocabEmbeddings.length,
    patternsIndexed: patternEmbeddings.length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT RETRIEVAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Retrieve relevant curriculum context for a generation prompt
 */
export async function getCurriculumContext(
  prompt: string,
  hskLevel: number,
  vectorize: VectorizeIndex,
  ai: Ai,
  options: { 
    maxLessons?: number; 
    maxVocab?: number; 
    maxPatterns?: number;
  } = {}
): Promise<CurriculumContext> {
  const { maxLessons = 5, maxVocab = 20, maxPatterns = 5 } = options;
  
  // Generate embedding for the prompt
  const promptEmbedding = await generateEmbedding(prompt, ai);
  
  // Query for relevant lessons
  const lessonResults = await vectorize.query(promptEmbedding, {
    topK: maxLessons,
    filter: { type: 'lesson', hskLevel: { $lte: hskLevel } },
    returnMetadata: true,
  });

  // Query for relevant vocabulary
  const vocabResults = await vectorize.query(promptEmbedding, {
    topK: maxVocab,
    filter: { type: 'vocabulary', hskLevel: { $lte: hskLevel } },
    returnMetadata: true,
  });

  // Query for relevant patterns
  const patternResults = await vectorize.query(promptEmbedding, {
    topK: maxPatterns,
    filter: { type: 'pattern' },
    returnMetadata: true,
  });

  // Format results
  const lessons: LessonContext[] = lessonResults.matches.map(m => ({
    id: m.metadata?.sourceId as string || '',
    title: m.metadata?.title as string || '',
    hskLevel: m.metadata?.hskLevel as number || 1,
    lessonNumber: m.metadata?.lessonNumber as number || 0,
    summary: m.metadata?.summary as string || '',
    vocabTaught: [],
    patternsTaught: [],
  }));

  const vocabularyContext: VocabContext[] = vocabResults.matches.map(m => ({
    id: m.metadata?.sourceId as string || '',
    hanzi: m.metadata?.hanzi as string || '',
    pinyin: m.metadata?.pinyin as string || '',
    english: m.metadata?.english as string || '',
    hskLevel: m.metadata?.hskLevel as number || 1,
  }));

  const patterns: PatternContext[] = patternResults.matches.map(m => ({
    name: m.metadata?.name as string || '',
    template: m.metadata?.template as string || '',
    examples: (m.metadata?.examples as string[]) || [],
    introducedInLesson: 0,
  }));

  // Generate a summary for the context
  const summary = generateContextSummary(lessons, vocabularyContext, patterns, hskLevel);

  return {
    lessons,
    vocabulary: vocabularyContext,
    patterns,
    summary,
  };
}

/**
 * Get all vocabulary already taught up to a certain lesson
 */
export async function getVocabularyUpToLesson(
  db: D1Database,
  hskLevel: number,
  lessonNumber: number
): Promise<VocabContext[]> {
  const drizzleDb = drizzle(db);
  
  // Get all vocabulary from lessons up to this point
  const allLessons = await drizzleDb
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.hskLevel, hskLevel),
        eq(lessons.status, 'published'),
        sql`${lessons.lessonNumber} <= ${lessonNumber}`
      )
    )
    .all();

  // Extract targetVocabulary IDs
  const vocabIds = new Set<string>();
  for (const lesson of allLessons) {
    const targetVocab = lesson.targetVocabulary as string[] | null;
    if (targetVocab) {
      targetVocab.forEach(id => vocabIds.add(id));
    }
  }

  if (vocabIds.size === 0) {
    return [];
  }

  // Fetch the vocabulary entries
  const vocabEntries = await drizzleDb
    .select()
    .from(vocabulary)
    .where(sql`${vocabulary.id} IN (${[...vocabIds].map(id => `'${id}'`).join(',')})`)
    .all();

  return vocabEntries.map(v => ({
    id: v.id,
    hanzi: v.hanzi,
    pinyin: v.pinyin,
    english: v.english,
    hskLevel: v.hskLevel,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function createLessonSummary(lesson: typeof lessons.$inferSelect): string {
  const parts = [
    `Lesson: ${lesson.title}`,
    lesson.subtitle ? `Subtitle: ${lesson.subtitle}` : '',
    `HSK Level: ${lesson.hskLevel}`,
    `Lesson Number: ${lesson.lessonNumber}`,
    lesson.grammarPoints ? `Grammar: ${(lesson.grammarPoints as string[]).join(', ')}` : '',
    lesson.tags ? `Tags: ${(lesson.tags as string[]).join(', ')}` : '',
  ];

  // Extract some content from blocks if available
  if (lesson.blocks && Array.isArray(lesson.blocks)) {
    const blocks = lesson.blocks as Array<{ type: string; content?: Record<string, unknown> }>;
    
    // Get hero hanzi words
    const heroWords = blocks
      .filter(b => b.type === 'hero_hanzi')
      .map(b => b.content?.hanzi as string)
      .filter(Boolean)
      .slice(0, 5);
    
    if (heroWords.length > 0) {
      parts.push(`Key vocabulary: ${heroWords.join(', ')}`);
    }

    // Get pattern names
    const patterns = blocks
      .filter(b => b.type === 'pattern')
      .map(b => b.content?.title as string)
      .filter(Boolean);
    
    if (patterns.length > 0) {
      parts.push(`Patterns taught: ${patterns.join(', ')}`);
    }
  }

  return parts.filter(Boolean).join('. ');
}

async function extractPatternsFromLessons(
  db: ReturnType<typeof drizzle>
): Promise<Array<{ name: string; template: string; examples: string[]; hskLevel: number }>> {
  const allLessons = await db
    .select()
    .from(lessons)
    .where(eq(lessons.status, 'published'))
    .all();

  const patterns: Array<{ name: string; template: string; examples: string[]; hskLevel: number }> = [];
  const seenPatterns = new Set<string>();

  for (const lesson of allLessons) {
    if (!lesson.blocks || !Array.isArray(lesson.blocks)) continue;

    const blocks = lesson.blocks as Array<{ 
      type: string; 
      content?: { 
        title?: string; 
        template?: string; 
        examples?: Array<{ hanzi: string }>;
      };
    }>;

    for (const block of blocks) {
      if (block.type === 'pattern' && block.content?.title) {
        const name = block.content.title;
        if (seenPatterns.has(name)) continue;
        seenPatterns.add(name);

        patterns.push({
          name,
          template: block.content.template || '',
          examples: block.content.examples?.map(e => e.hanzi) || [],
          hskLevel: lesson.hskLevel,
        });
      }
    }
  }

  return patterns;
}

function generateContextSummary(
  lessons: LessonContext[],
  vocab: VocabContext[],
  patterns: PatternContext[],
  targetHskLevel: number
): string {
  const parts = [
    `Target HSK Level: ${targetHskLevel}`,
    `Related lessons found: ${lessons.length}`,
    `Vocabulary in scope: ${vocab.length} words`,
    `Patterns available: ${patterns.length}`,
  ];

  if (vocab.length > 0) {
    const vocabSample = vocab.slice(0, 5).map(v => v.hanzi).join(', ');
    parts.push(`Sample vocabulary: ${vocabSample}...`);
  }

  if (patterns.length > 0) {
    const patternNames = patterns.slice(0, 3).map(p => p.name).join(', ');
    parts.push(`Key patterns: ${patternNames}`);
  }

  return parts.join('\n');
}

