/**
 * Lesson Cache Types
 * For pre-generated lessons stored in R2
 */

export type LessonStatus = 'draft' | 'approved' | 'rejected';
export type LessonCreator = 'ai' | 'manual';

// Practice block types
export interface PracticeQuestion {
  question: string;
  questionHanzi?: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  explanation?: string;
}

export interface PracticeBuildSentence {
  instruction: string;
  correctOrder: string[];
  wordPool: string[];
  hint?: string;
}

export interface PracticeBlocks {
  multipleChoice?: PracticeQuestion[];
  buildSentence?: PracticeBuildSentence[];
  quiz?: PracticeQuestion[];
}

export interface CachedLesson {
  id: string;
  lessonNumber: number;
  hskLevel: number;
  focusWords: string[];
  chinese: string;
  pinyin: string;
  english: string;
  // Practice material
  practice?: PracticeBlocks;
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: LessonCreator;
  reviewedBy?: string;
  reviewedAt?: string;
  status: LessonStatus;
  version: number;
}

export interface LessonCacheSummary {
  lessonNumber: number;
  hskLevel: number;
  variantCount: number;
  approvedCount: number;
  draftCount: number;
}

export interface CreateCachedLessonInput {
  lessonNumber: number;
  hskLevel: number;
  focusWords: string[];
  chinese: string;
  pinyin: string;
  english: string;
  practice?: PracticeBlocks;
  createdBy?: LessonCreator;
  status?: LessonStatus;
}

export interface UpdateCachedLessonInput {
  chinese?: string;
  pinyin?: string;
  english?: string;
  practice?: PracticeBlocks;
  status?: LessonStatus;
  reviewedBy?: string;
}

export interface GenerateCacheInput {
  lessonNumber: number;
  focusWords?: string[];
  autoApprove?: boolean;
}

export interface BulkGenerateInput {
  lessons: {
    lessonNumber: number;
    focusWords?: string[];
  }[];
  autoApprove?: boolean;
}

// Cache key format: lesson-cache/hsk{X}-l{YY}/focus_{word1}_{word2}.json
// Or: lesson-cache/hsk{X}-l{YY}/default.json
export function getCacheKey(lessonNumber: number, focusWords?: string[]): string {
  const hskLevel = Math.floor((lessonNumber - 1) / 10) + 1;
  const lessonInHsk = ((lessonNumber - 1) % 10) + 1;
  const prefix = `lesson-cache/hsk${hskLevel}-l${String(lessonInHsk).padStart(2, '0')}`;
  
  if (focusWords && focusWords.length > 0) {
    const sortedWords = [...focusWords].sort().join('_');
    return `${prefix}/focus_${sortedWords}.json`;
  }
  
  return `${prefix}/default.json`;
}

export function parseCacheKey(key: string): { lessonNumber: number; focusWords: string[] } | null {
  const match = key.match(/lesson-cache\/hsk(\d+)-l(\d+)\/(default|focus_(.+))\.json/);
  if (!match) return null;
  
  const hskLevel = parseInt(match[1]);
  const lessonInHsk = parseInt(match[2]);
  const lessonNumber = (hskLevel - 1) * 10 + lessonInHsk;
  
  const focusWords = match[4] ? match[4].split('_') : [];
  
  return { lessonNumber, focusWords };
}

// Minimum lesson for AI generation (below this, use cache only)
export const MIN_LESSON_FOR_AI = 20;

// Maximum lesson to cache (above this, always AI generate)
export const MAX_CACHED_LESSON = 20;

