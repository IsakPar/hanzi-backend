/**
 * Stories Validation Schemas
 * All Zod schemas for story-related routes
 */

import { z } from 'zod';

// --- STORY SCHEMAS ---

export const createStorySchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  author: z.string().optional(),
  contentLibraryId: z.string().optional(),
  description: z.string().optional(),
  topic: z.string().optional(),
  hskLevel: z.number().int().min(1).max(9),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  estimatedMinutes: z.number().int().min(1).optional(),
  accessTier: z.enum(['free', 'premium']).optional(),
  pauseBetweenSegmentsMs: z.number().int().min(0).max(2000).optional(),
});

export const updateStorySchema = z.object({
  title: z.string().min(1).optional(),
  subtitle: z.string().optional(),
  author: z.string().optional(),
  contentLibraryId: z.string().optional(),
  description: z.string().optional(),
  topic: z.string().optional(),
  hskLevel: z.number().int().min(1).max(9).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  estimatedMinutes: z.number().int().min(1).optional(),
  isPublished: z.boolean().optional(),
  accessTier: z.enum(['free', 'premium']).optional(),
  pauseBetweenSegmentsMs: z.number().int().min(0).max(2000).optional(),
});

export const searchSchema = z.object({
  hsk_level: z.coerce.number().int().min(1).max(9).optional(),
  difficulty: z.string().optional(),
  topic: z.string().optional(),
  query: z.string().optional(),
  published: z.coerce.boolean().optional(),
  access_tier: z.enum(['free', 'premium']).optional(),
  limit: z.coerce.number().int().max(100).optional(),
  offset: z.coerce.number().int().optional(),
});

// --- SENTENCE SCHEMAS ---

export const createSentenceSchema = z.object({
  chinese: z.string().min(1),
  pinyin: z.string().min(1),
  english: z.string().min(1),
  audioR2Key: z.string().optional(),
});

export const updateSentenceSchema = z.object({
  chinese: z.string().min(1).optional(),
  pinyin: z.string().min(1).optional(),
  english: z.string().min(1).optional(),
  audioR2Key: z.string().optional(),
});

export const reorderSentencesSchema = z.object({
  sentenceIds: z.array(z.string()),
});

export const bulkSegmentsSchema = z.object({
  segments: z.array(z.object({
    id: z.string().optional(),
    chinese: z.string().min(1),
    pinyin: z.string(),
    english: z.string(),
    audioR2Key: z.string().optional(),
    audioDurationMs: z.number().int().optional(),
  })),
});

// --- VOCABULARY & QUESTION SCHEMAS ---

export const addVocabularySchema = z.object({
  vocabId: z.string().min(1),
  contextSentence: z.string().optional(),
});

export const createQuestionSchema = z.object({
  question: z.string().min(1),
  questionEnglish: z.string().optional(),
  questionType: z.enum(['multiple_choice', 'true_false', 'short_answer']),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().min(1),
  explanation: z.string().optional(),
});

// --- IMPORT/EXPORT SCHEMAS ---

export const storyImportSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(200).optional(),
  author: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  topic: z.string().max(100).optional(),
  hskLevel: z.number().int().min(1).max(9),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  pauseBetweenSegmentsMs: z.number().int().min(0).max(2000).default(500),
  estimatedMinutes: z.number().int().min(1).max(120).optional(),
  segments: z.array(z.object({
    chinese: z.string().min(1).max(500),
    pinyin: z.string().max(1000).default(''),
    english: z.string().max(1000).default(''),
  })).min(1, 'At least one segment required'),
  practiceBlocks: z.array(z.any()).default([]),
});

// --- AI SCHEMAS ---

export const generatePracticeSchema = z.object({
  blockTypes: z.array(z.enum([
    'exercise_multiple_choice',
    'exercise_drag_sentence',
    'exercise_spot_error',
    'exercise_build_sentence',
    'reading_comprehension',
  ])).min(1).max(5),
  model: z.enum(['gpt-5-nano', 'gpt-4o-mini']).default('gpt-5-nano'),
  count: z.number().int().min(1).max(10).default(4),
});

