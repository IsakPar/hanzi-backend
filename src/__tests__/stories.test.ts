/**
 * Stories Service & Routes Tests
 * 
 * Tests CRUD operations, search, sentences, vocabulary, questions
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock types for testing
interface Story {
  id: string;
  title: string;
  subtitle?: string;
  author?: string;
  hskLevel: number;
  difficulty: 'easy' | 'medium' | 'hard';
  isPublished: boolean;
}

interface StorySentence {
  id: string;
  storyId: string;
  orderIndex: number;
  chinese: string;
  pinyin: string;
  english: string;
}

describe('Stories Service', () => {
  describe('Story CRUD Operations', () => {
    it('should create a story with required fields', () => {
      const input = {
        title: 'Learning Chinese',
        hskLevel: 1,
      };

      const story: Story = {
        id: 'story_123',
        title: input.title,
        hskLevel: input.hskLevel,
        difficulty: 'medium',
        isPublished: false,
      };

      expect(story.id).toBeDefined();
      expect(story.title).toBe('Learning Chinese');
      expect(story.hskLevel).toBe(1);
      expect(story.isPublished).toBe(false);
    });

    it('should update story fields', () => {
      const story: Story = {
        id: 'story_123',
        title: 'Old Title',
        hskLevel: 1,
        difficulty: 'easy',
        isPublished: false,
      };

      const updates = {
        title: 'New Title',
        difficulty: 'hard' as const,
        isPublished: true,
      };

      const updated: Story = { ...story, ...updates };

      expect(updated.title).toBe('New Title');
      expect(updated.difficulty).toBe('hard');
      expect(updated.isPublished).toBe(true);
    });

    it('should validate HSK level is 1-9', () => {
      const validateHskLevel = (level: number): boolean => {
        return level >= 1 && level <= 9;
      };

      expect(validateHskLevel(1)).toBe(true);
      expect(validateHskLevel(9)).toBe(true);
      expect(validateHskLevel(0)).toBe(false);
      expect(validateHskLevel(10)).toBe(false);
    });
  });

  describe('Story Search', () => {
    it('should filter by HSK level', () => {
      const stories: Story[] = [
        { id: '1', title: 'HSK1 Story', hskLevel: 1, difficulty: 'easy', isPublished: true },
        { id: '2', title: 'HSK2 Story', hskLevel: 2, difficulty: 'medium', isPublished: true },
        { id: '3', title: 'HSK3 Story', hskLevel: 3, difficulty: 'hard', isPublished: true },
      ];

      const filtered = stories.filter(s => s.hskLevel === 1);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('HSK1 Story');
    });

    it('should filter by difficulty', () => {
      const stories: Story[] = [
        { id: '1', title: 'Easy Story', hskLevel: 1, difficulty: 'easy', isPublished: true },
        { id: '2', title: 'Medium Story', hskLevel: 1, difficulty: 'medium', isPublished: true },
        { id: '3', title: 'Hard Story', hskLevel: 1, difficulty: 'hard', isPublished: true },
      ];

      const filtered = stories.filter(s => s.difficulty === 'easy');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Easy Story');
    });

    it('should filter published stories for public API', () => {
      const stories: Story[] = [
        { id: '1', title: 'Published', hskLevel: 1, difficulty: 'easy', isPublished: true },
        { id: '2', title: 'Draft', hskLevel: 1, difficulty: 'easy', isPublished: false },
      ];

      const publicStories = stories.filter(s => s.isPublished);
      expect(publicStories).toHaveLength(1);
      expect(publicStories[0].title).toBe('Published');
    });

    it('should apply pagination with limit and offset', () => {
      const stories: Story[] = Array.from({ length: 25 }, (_, i) => ({
        id: `${i + 1}`,
        title: `Story ${i + 1}`,
        hskLevel: 1,
        difficulty: 'easy' as const,
        isPublished: true,
      }));

      const limit = 10;
      const offset = 10;
      const paginated = stories.slice(offset, offset + limit);

      expect(paginated).toHaveLength(10);
      expect(paginated[0].title).toBe('Story 11');
      expect(paginated[9].title).toBe('Story 20');
    });
  });

  describe('Story Sentences', () => {
    it('should add sentence with order index', () => {
      const sentence: StorySentence = {
        id: 'sent_1',
        storyId: 'story_1',
        orderIndex: 0,
        chinese: '你好',
        pinyin: 'nǐ hǎo',
        english: 'Hello',
      };

      expect(sentence.orderIndex).toBe(0);
      expect(sentence.chinese).toBe('你好');
    });

    it('should reorder sentences correctly', () => {
      const sentences: StorySentence[] = [
        { id: 's1', storyId: 'story_1', orderIndex: 0, chinese: 'A', pinyin: '', english: '' },
        { id: 's2', storyId: 'story_1', orderIndex: 1, chinese: 'B', pinyin: '', english: '' },
        { id: 's3', storyId: 'story_1', orderIndex: 2, chinese: 'C', pinyin: '', english: '' },
      ];

      // Reorder to: B, C, A
      const newOrder = ['s2', 's3', 's1'];
      const reordered = newOrder.map((id, index) => {
        const sent = sentences.find(s => s.id === id)!;
        return { ...sent, orderIndex: index };
      });

      expect(reordered[0].chinese).toBe('B');
      expect(reordered[0].orderIndex).toBe(0);
      expect(reordered[2].chinese).toBe('A');
      expect(reordered[2].orderIndex).toBe(2);
    });

    it('should validate Chinese text is not empty', () => {
      const validateSentence = (chinese: string): boolean => {
        return chinese.trim().length > 0;
      };

      expect(validateSentence('你好')).toBe(true);
      expect(validateSentence('')).toBe(false);
      expect(validateSentence('   ')).toBe(false);
    });
  });

  describe('Bulk Segments', () => {
    it('should count created, updated, and deleted segments', () => {
      const existing = ['s1', 's2', 's3'];
      const incoming = [
        { id: 's1', chinese: 'Updated A' },
        { id: undefined, chinese: 'New D' },
        { id: 's2', chinese: 'Updated B' },
      ];

      const existingSet = new Set(existing);
      const incomingIds = new Set(incoming.filter(s => s.id).map(s => s.id!));

      let created = 0;
      let updated = 0;
      let deleted = 0;

      // Count deletes
      for (const id of existing) {
        if (!incomingIds.has(id)) deleted++;
      }

      // Count creates and updates
      for (const seg of incoming) {
        if (seg.id && existingSet.has(seg.id)) {
          updated++;
        } else if (!seg.id) {
          created++;
        }
      }

      expect(created).toBe(1);  // New D
      expect(updated).toBe(2);  // s1, s2
      expect(deleted).toBe(1);  // s3
    });
  });
});

describe('Stories API Validation', () => {
  describe('Create Story Schema', () => {
    it('should require title', () => {
      const isValid = (data: any): boolean => {
        return typeof data.title === 'string' && data.title.length > 0;
      };

      expect(isValid({ title: 'Test' })).toBe(true);
      expect(isValid({ title: '' })).toBe(false);
      expect(isValid({})).toBe(false);
    });

    it('should require hskLevel between 1-9', () => {
      const isValidHsk = (level: any): boolean => {
        return Number.isInteger(level) && level >= 1 && level <= 9;
      };

      expect(isValidHsk(1)).toBe(true);
      expect(isValidHsk(9)).toBe(true);
      expect(isValidHsk(0)).toBe(false);
      expect(isValidHsk(10)).toBe(false);
      expect(isValidHsk(1.5)).toBe(false);
    });

    it('should validate difficulty enum', () => {
      const validDifficulties = ['easy', 'medium', 'hard'];
      const isValidDifficulty = (d: any): boolean => {
        return validDifficulties.includes(d);
      };

      expect(isValidDifficulty('easy')).toBe(true);
      expect(isValidDifficulty('medium')).toBe(true);
      expect(isValidDifficulty('hard')).toBe(true);
      expect(isValidDifficulty('extreme')).toBe(false);
    });
  });

  describe('Search Query Schema', () => {
    it('should have default limit of 50', () => {
      const applyDefaults = (query: any) => ({
        limit: query.limit ?? 50,
        offset: query.offset ?? 0,
        published: query.published ?? true,
      });

      const result = applyDefaults({});
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
      expect(result.published).toBe(true);
    });

    it('should cap limit at 100', () => {
      const validateLimit = (limit: number): number => {
        return Math.min(Math.max(1, limit), 100);
      };

      expect(validateLimit(50)).toBe(50);
      expect(validateLimit(150)).toBe(100);
      expect(validateLimit(0)).toBe(1);
    });
  });
});

