// Types for Stories domain

// Import ContentBlock from lesson types (already exists in your portal)
export type ContentBlock = any; // Will be imported from lesson types in actual usage

export interface Story {
  id: string;
  title: string;
  subtitle: string | null;
  author: string | null;
  contentLibraryId: string | null;
  description: string | null;
  topic: string | null;
  hskLevel: number;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  estimatedMinutes: number | null;
  coverImageR2Key: string | null;
  accessTier: 'free' | 'premium' | null;
  storyType: 'text' | 'dialogue' | null;
  practiceBlocks: unknown; // Post-story practice exercises (JSON from database)
  isPublished: boolean | null;
  publishedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface StorySentence {
  id: string;
  storyId: string;
  orderIndex: number;
  chinese: string;
  pinyin: string;
  english: string;
  speaker: string | null;
  audioR2Key: string | null;
  createdAt: Date | null;
}

export interface StoryVocabulary {
  storyId: string;
  vocabId: string;
  contextSentence?: string;
  // Populated fields from vocabulary table
  hanzi?: string;
  pinyin?: string;
  english?: string;
  hskLevel?: number;
}

export interface StoryQuestion {
  id: string;
  storyId: string;
  orderIndex: number;
  question: string;
  questionEnglish: string | null;
  questionType: 'multiple_choice' | 'true_false' | 'short_answer' | null;
  options: unknown; // JSON array for multiple choice
  correctAnswer: string;
  explanation: string | null;
  createdAt: Date | null;
}

export interface CreateStoryParams {
  title: string;
  subtitle?: string;
  author?: string;
  contentLibraryId?: string;
  description?: string;
  topic?: string;
  hskLevel: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  estimatedMinutes?: number;
  accessTier?: 'free' | 'premium';
  seriesId?: string;
  seriesOrder?: number;
  storyType?: 'text' | 'dialogue';
  practiceBlocks?: ContentBlock[];
}

export interface UpdateStoryParams {
  title?: string;
  subtitle?: string;
  author?: string;
  contentLibraryId?: string;
  description?: string;
  topic?: string;
  hskLevel?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  estimatedMinutes?: number;
  coverImageR2Key?: string;
  storyType?: 'text' | 'dialogue';
  isPublished?: boolean;
  practiceBlocks?: ContentBlock[];
}

export interface CreateSentenceParams {
  chinese: string;
  pinyin: string;
  english: string;
  speaker?: string;
  audioR2Key?: string;
}

export interface UpdateSentenceParams {
  chinese?: string;
  pinyin?: string;
  english?: string;
  orderIndex?: number;
  audioR2Key?: string;
}

export interface CreateQuestionParams {
  question: string;
  questionEnglish?: string;
  questionType: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correctAnswer: string;
  explanation?: string;
}

export interface SearchStoriesParams {
  hskLevel?: number;
  difficulty?: string;
  topic?: string;
  query?: string;
  published?: boolean;
  limit?: number;
  offset?: number;
}

export interface StoryWithDetails extends Story {
  sentences: StorySentence[];
  vocabulary: StoryVocabulary[];
  questions: StoryQuestion[];
}

