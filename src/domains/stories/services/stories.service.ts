import { eq, and, desc, asc, like, sql } from 'drizzle-orm';
import { DrizzleD1Database } from 'drizzle-orm/d1';
import { nanoid } from 'nanoid';
import { 
  stories, 
  storySentences, 
  storyVocabulary, 
  storyQuestions,
  vocabulary 
} from '../../../schema';
import type { 
  Story,
  StorySentence,
  StoryVocabulary,
  StoryQuestion,
  CreateStoryParams,
  UpdateStoryParams,
  CreateSentenceParams,
  UpdateSentenceParams,
  CreateQuestionParams,
  SearchStoriesParams,
  StoryWithDetails
} from '../types';

/**
 * Escape special characters for SQL LIKE queries to prevent injection
 */
function escapeLikePattern(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

export class StoriesService {
  constructor(private db: DrizzleD1Database) {}

  // --- STORY CRUD ---

  async createStory(params: CreateStoryParams): Promise<Story> {
    const id = nanoid();
    const now = new Date();

    await this.db.insert(stories).values({
      id,
      title: params.title,
      subtitle: params.subtitle,
      author: params.author,
      contentLibraryId: params.contentLibraryId,
      description: params.description,
      topic: params.topic,
      hskLevel: params.hskLevel,
      difficulty: params.difficulty || 'medium',
      estimatedMinutes: params.estimatedMinutes,
      accessTier: params.accessTier || 'free',
      seriesId: params.seriesId,
      seriesOrder: params.seriesOrder,
      storyType: params.storyType || 'text',
      practiceBlocks: params.practiceBlocks ? JSON.stringify(params.practiceBlocks) : null,
      isPublished: false,
      createdAt: now,
      updatedAt: now,
    });

    const story = await this.getStory(id);
    if (!story) throw new Error('Failed to create story');
    return story;
  }

  async getStory(id: string): Promise<Story | null> {
    const results = await this.db
      .select()
      .from(stories)
      .where(eq(stories.id, id))
      .limit(1);

    return results[0] || null;
  }

  async getStoryWithDetails(id: string): Promise<StoryWithDetails | null> {
    const story = await this.getStory(id);
    if (!story) return null;

    const [sentences, vocab, questions] = await Promise.all([
      this.getSentences(id),
      this.getVocabulary(id),
      this.getQuestions(id),
    ]);

    return {
      ...story,
      sentences,
      vocabulary: vocab,
      questions,
    };
  }

  async updateStory(id: string, params: UpdateStoryParams): Promise<void> {
    const updates: Partial<typeof stories.$inferInsert> = {
      updatedAt: new Date(),
    };

    // Copy over provided fields
    if (params.title !== undefined) updates.title = params.title;
    if (params.subtitle !== undefined) updates.subtitle = params.subtitle;
    if (params.author !== undefined) updates.author = params.author;
    if (params.contentLibraryId !== undefined) updates.contentLibraryId = params.contentLibraryId;
    if (params.description !== undefined) updates.description = params.description;
    if (params.topic !== undefined) updates.topic = params.topic;
    if (params.hskLevel !== undefined) updates.hskLevel = params.hskLevel;
    if (params.difficulty !== undefined) updates.difficulty = params.difficulty;
    if (params.estimatedMinutes !== undefined) updates.estimatedMinutes = params.estimatedMinutes;
    if (params.storyType !== undefined) updates.storyType = params.storyType;

    // Handle JSON serialization for practiceBlocks
    if (params.practiceBlocks !== undefined) {
      updates.practiceBlocks = params.practiceBlocks ? JSON.stringify(params.practiceBlocks) : null;
    }

    // Handle publishing logic
    if (params.isPublished === false) {
      updates.isPublished = false;
      updates.publishedAt = null;
    } else if (params.isPublished === true) {
      updates.isPublished = true;
      const current = await this.getStory(id);
      if (current && !current.isPublished) {
        updates.publishedAt = new Date();
      }
    }

    await this.db
      .update(stories)
      .set(updates)
      .where(eq(stories.id, id));
  }

  async deleteStory(id: string): Promise<void> {
    await this.db.delete(stories).where(eq(stories.id, id));
  }

  async searchStories(params: SearchStoriesParams): Promise<Story[]> {
    const conditions = [];

    if (params.hskLevel) {
      conditions.push(eq(stories.hskLevel, params.hskLevel));
    }

    if (params.difficulty) {
      conditions.push(eq(stories.difficulty, params.difficulty as 'easy' | 'medium' | 'hard'));
    }

    // SECURITY: Escape special LIKE characters to prevent SQL injection
    if (params.topic) {
      const escapedTopic = escapeLikePattern(params.topic);
      conditions.push(like(stories.topic, `%${escapedTopic}%`));
    }

    if (params.query) {
      const escapedQuery = escapeLikePattern(params.query);
      const searchTerm = `%${escapedQuery}%`;
      conditions.push(
        sql`(${stories.title} LIKE ${searchTerm} OR ${stories.description} LIKE ${searchTerm})`
      );
    }

    if (params.published !== undefined) {
      conditions.push(eq(stories.isPublished, params.published));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await this.db
      .select()
      .from(stories)
      .where(whereClause)
      .orderBy(desc(stories.createdAt))
      .limit(params.limit ?? 50)
      .offset(params.offset ?? 0);

    return results;
  }

  // --- SENTENCES ---

  async getSentences(storyId: string): Promise<StorySentence[]> {
    return await this.db
      .select()
      .from(storySentences)
      .where(eq(storySentences.storyId, storyId))
      .orderBy(asc(storySentences.orderIndex));
  }

  async addSentence(storyId: string, params: CreateSentenceParams): Promise<StorySentence> {
    const id = nanoid();
    
    // Get max order index
    const maxOrder = await this.db
      .select({ max: sql<number>`MAX(${storySentences.orderIndex})` })
      .from(storySentences)
      .where(eq(storySentences.storyId, storyId));

    const orderIndex = (maxOrder[0]?.max ?? -1) + 1;

    await this.db.insert(storySentences).values({
      id,
      storyId,
      orderIndex,
      chinese: params.chinese,
      pinyin: params.pinyin,
      english: params.english,
      speaker: params.speaker || null,
      audioR2Key: params.audioR2Key,
      createdAt: new Date(),
    });

    const result = await this.db
      .select()
      .from(storySentences)
      .where(eq(storySentences.id, id))
      .limit(1);

    return result[0];
  }

  async updateSentence(sentenceId: string, params: UpdateSentenceParams): Promise<void> {
    await this.db
      .update(storySentences)
      .set(params)
      .where(eq(storySentences.id, sentenceId));
  }

  async deleteSentence(sentenceId: string): Promise<void> {
    await this.db.delete(storySentences).where(eq(storySentences.id, sentenceId));
  }

  async reorderSentences(storyId: string, sentenceIds: string[]): Promise<void> {
    // Update order indices for all sentences
    for (let i = 0; i < sentenceIds.length; i++) {
      await this.db
        .update(storySentences)
        .set({ orderIndex: i })
        .where(
          and(
            eq(storySentences.id, sentenceIds[i]),
            eq(storySentences.storyId, storyId)
          )
        );
    }
  }
  
  /**
   * Bulk save segments (sentences) - creates new, updates existing, deletes removed
   * "Segments" is an alias for sentences used in the content editor
   */
  async bulkSaveSegments(
    storyId: string,
    segments: Array<{
      id?: string;
      chinese: string;
      pinyin: string;
      english: string;
      speaker?: string | null;
      orderIndex: number;
      audioR2Key?: string;
    }>
  ): Promise<{ created: number; updated: number; deleted: number }> {
    // Get existing sentences
    const existing = await this.getSentences(storyId);
    const existingIds = new Set(existing.map(s => s.id));
    const incomingIds = new Set(segments.filter(s => s.id).map(s => s.id!));
    
    let created = 0;
    let updated = 0;
    let deleted = 0;
    
    // Delete sentences that are no longer in the list
    for (const sentence of existing) {
      if (!incomingIds.has(sentence.id)) {
        await this.deleteSentence(sentence.id);
        deleted++;
      }
    }
    
    // Create or update segments
    for (const segment of segments) {
      if (segment.id && existingIds.has(segment.id)) {
        // Update existing
        await this.updateSentence(segment.id, {
          chinese: segment.chinese,
          pinyin: segment.pinyin,
          english: segment.english,
          orderIndex: segment.orderIndex,
          audioR2Key: segment.audioR2Key,
        });
        // Update speaker separately if provided
        if (segment.speaker !== undefined) {
          await this.db.update(storySentences)
            .set({ speaker: segment.speaker })
            .where(eq(storySentences.id, segment.id));
        }
        updated++;
      } else {
        // Create new
        const id = segment.id || nanoid();
        await this.db.insert(storySentences).values({
          id,
          storyId,
          orderIndex: segment.orderIndex,
          chinese: segment.chinese,
          pinyin: segment.pinyin,
          english: segment.english,
          speaker: segment.speaker || null,
          audioR2Key: segment.audioR2Key,
          createdAt: new Date(),
        });
        created++;
      }
    }
    
    return { created, updated, deleted };
  }

  // --- VOCABULARY ---

  async getVocabulary(storyId: string): Promise<StoryVocabulary[]> {
    const results = await this.db
      .select({
        storyId: storyVocabulary.storyId,
        vocabId: storyVocabulary.vocabId,
        contextSentence: storyVocabulary.contextSentence,
        hanzi: vocabulary.hanzi,
        pinyin: vocabulary.pinyin,
        english: vocabulary.english,
        hskLevel: vocabulary.hskLevel,
      })
      .from(storyVocabulary)
      .leftJoin(vocabulary, eq(storyVocabulary.vocabId, vocabulary.id))
      .where(eq(storyVocabulary.storyId, storyId));

    return results as StoryVocabulary[];
  }

  async addVocabulary(storyId: string, vocabId: string, contextSentence?: string): Promise<void> {
    await this.db.insert(storyVocabulary).values({
      storyId,
      vocabId,
      contextSentence,
    });
  }

  async removeVocabulary(storyId: string, vocabId: string): Promise<void> {
    await this.db
      .delete(storyVocabulary)
      .where(
        and(
          eq(storyVocabulary.storyId, storyId),
          eq(storyVocabulary.vocabId, vocabId)
        )
      );
  }

  // --- QUESTIONS ---

  async getQuestions(storyId: string): Promise<StoryQuestion[]> {
    return await this.db
      .select()
      .from(storyQuestions)
      .where(eq(storyQuestions.storyId, storyId))
      .orderBy(asc(storyQuestions.orderIndex));
  }

  async addQuestion(storyId: string, params: CreateQuestionParams): Promise<StoryQuestion> {
    const id = nanoid();
    
    // Get max order index
    const maxOrder = await this.db
      .select({ max: sql<number>`MAX(${storyQuestions.orderIndex})` })
      .from(storyQuestions)
      .where(eq(storyQuestions.storyId, storyId));

    const orderIndex = (maxOrder[0]?.max ?? -1) + 1;

    await this.db.insert(storyQuestions).values({
      id,
      storyId,
      orderIndex,
      question: params.question,
      questionEnglish: params.questionEnglish,
      questionType: params.questionType,
      options: params.options ? JSON.stringify(params.options) : null,
      correctAnswer: params.correctAnswer,
      explanation: params.explanation,
      createdAt: new Date(),
    });

    const result = await this.db
      .select()
      .from(storyQuestions)
      .where(eq(storyQuestions.id, id))
      .limit(1);

    return result[0];
  }

  async updateQuestion(questionId: string, params: Partial<CreateQuestionParams>): Promise<void> {
    const updates: Partial<typeof storyQuestions.$inferInsert> = {};
    
    if (params.question !== undefined) updates.question = params.question;
    if (params.questionEnglish !== undefined) updates.questionEnglish = params.questionEnglish;
    if (params.questionType !== undefined) updates.questionType = params.questionType;
    if (params.correctAnswer !== undefined) updates.correctAnswer = params.correctAnswer;
    if (params.explanation !== undefined) updates.explanation = params.explanation;
    if (params.options !== undefined) {
      updates.options = JSON.stringify(params.options);
    }

    await this.db
      .update(storyQuestions)
      .set(updates)
      .where(eq(storyQuestions.id, questionId));
  }

  async deleteQuestion(questionId: string): Promise<void> {
    await this.db.delete(storyQuestions).where(eq(storyQuestions.id, questionId));
  }

  async uploadCoverImage(storyId: string, r2Key: string): Promise<void> {
    await this.db
      .update(stories)
      .set({ coverImageR2Key: r2Key, updatedAt: new Date() })
      .where(eq(stories.id, storyId));
  }

  async uploadSentenceAudio(sentenceId: string, r2Key: string): Promise<void> {
    await this.db
      .update(storySentences)
      .set({ audioR2Key: r2Key })
      .where(eq(storySentences.id, sentenceId));
  }

  async getSentence(sentenceId: string): Promise<StorySentence | null> {
    const result = await this.db
      .select()
      .from(storySentences)
      .where(eq(storySentences.id, sentenceId))
      .get();
    return result || null;
  }

  async clearSentenceAudio(sentenceId: string): Promise<void> {
    await this.db
      .update(storySentences)
      .set({ audioR2Key: null, audioDurationMs: null })
      .where(eq(storySentences.id, sentenceId));
  }
}

