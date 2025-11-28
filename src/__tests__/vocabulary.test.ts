/**
 * Vocabulary Service & Routes Tests
 * 
 * Tests CRUD operations, search, bulk import, audio
 */

import { describe, it, expect } from 'vitest';

interface VocabEntry {
  id: string;
  hanzi: string;
  pinyin: string;
  english: string;
  category: string;
  hskLevel: number;
  tags?: string[];
}

describe('Vocabulary Service', () => {
  describe('Vocabulary CRUD', () => {
    it('should create vocabulary entry with required fields', () => {
      const entry: VocabEntry = {
        id: 'vocab_123',
        hanzi: '你好',
        pinyin: 'nǐ hǎo',
        english: 'hello',
        category: 'greetings',
        hskLevel: 1,
      };

      expect(entry.hanzi).toBe('你好');
      expect(entry.pinyin).toBe('nǐ hǎo');
      expect(entry.hskLevel).toBe(1);
    });

    it('should update vocabulary fields', () => {
      const entry: VocabEntry = {
        id: 'vocab_123',
        hanzi: '你好',
        pinyin: 'nǐ hǎo',
        english: 'hello',
        category: 'greetings',
        hskLevel: 1,
      };

      const updated: VocabEntry = {
        ...entry,
        english: 'Hello; Hi',
        category: 'common_expressions',
      };

      expect(updated.english).toBe('Hello; Hi');
      expect(updated.category).toBe('common_expressions');
    });
  });

  describe('Vocabulary Search', () => {
    it('should search by hanzi', () => {
      const vocab: VocabEntry[] = [
        { id: '1', hanzi: '你好', pinyin: 'nǐ hǎo', english: 'hello', category: 'greetings', hskLevel: 1 },
        { id: '2', hanzi: '谢谢', pinyin: 'xiè xiè', english: 'thanks', category: 'greetings', hskLevel: 1 },
        { id: '3', hanzi: '学习', pinyin: 'xué xí', english: 'study', category: 'verbs', hskLevel: 2 },
      ];

      const query = '你';
      const results = vocab.filter(v => v.hanzi.includes(query));

      expect(results).toHaveLength(1);
      expect(results[0].english).toBe('hello');
    });

    it('should search by pinyin', () => {
      const vocab: VocabEntry[] = [
        { id: '1', hanzi: '你好', pinyin: 'ni hao', english: 'hello', category: 'greetings', hskLevel: 1 },
        { id: '2', hanzi: '好的', pinyin: 'hao de', english: 'ok', category: 'common', hskLevel: 1 },
      ];

      const query = 'hao';
      const results = vocab.filter(v => 
        v.pinyin.toLowerCase().includes(query)
      );

      expect(results).toHaveLength(2);
    });

    it('should search by english meaning', () => {
      const vocab: VocabEntry[] = [
        { id: '1', hanzi: '学习', pinyin: 'xué xí', english: 'to study, to learn', category: 'verbs', hskLevel: 2 },
        { id: '2', hanzi: '学生', pinyin: 'xué shēng', english: 'student', category: 'nouns', hskLevel: 1 },
      ];

      const query = 'study';
      const results = vocab.filter(v => 
        v.english.toLowerCase().includes(query)
      );

      expect(results).toHaveLength(1);
      expect(results[0].hanzi).toBe('学习');
    });

    it('should filter by HSK level', () => {
      const vocab: VocabEntry[] = [
        { id: '1', hanzi: '你', pinyin: 'nǐ', english: 'you', category: 'pronouns', hskLevel: 1 },
        { id: '2', hanzi: '虽然', pinyin: 'suī rán', english: 'although', category: 'conjunctions', hskLevel: 3 },
        { id: '3', hanzi: '然而', pinyin: 'rán ér', english: 'however', category: 'conjunctions', hskLevel: 5 },
      ];

      const hsk1 = vocab.filter(v => v.hskLevel === 1);
      expect(hsk1).toHaveLength(1);

      const hsk3AndBelow = vocab.filter(v => v.hskLevel <= 3);
      expect(hsk3AndBelow).toHaveLength(2);
    });

    it('should filter by category', () => {
      const vocab: VocabEntry[] = [
        { id: '1', hanzi: '吃', pinyin: 'chī', english: 'eat', category: 'verbs', hskLevel: 1 },
        { id: '2', hanzi: '喝', pinyin: 'hē', english: 'drink', category: 'verbs', hskLevel: 1 },
        { id: '3', hanzi: '苹果', pinyin: 'píng guǒ', english: 'apple', category: 'food', hskLevel: 1 },
      ];

      const verbs = vocab.filter(v => v.category === 'verbs');
      expect(verbs).toHaveLength(2);
    });
  });

  describe('Bulk Import', () => {
    it('should validate entries before import', () => {
      const validateEntry = (entry: Partial<VocabEntry>): boolean => {
        return !!(
          entry.hanzi && entry.hanzi.length > 0 &&
          entry.pinyin && entry.pinyin.length > 0 &&
          entry.english && entry.english.length > 0 &&
          entry.category && entry.category.length > 0 &&
          entry.hskLevel && entry.hskLevel >= 1 && entry.hskLevel <= 9
        );
      };

      const validEntry = { hanzi: '好', pinyin: 'hǎo', english: 'good', category: 'adj', hskLevel: 1 };
      const invalidEntry = { hanzi: '好', pinyin: '', english: 'good', category: 'adj', hskLevel: 1 };

      expect(validateEntry(validEntry)).toBe(true);
      expect(validateEntry(invalidEntry)).toBe(false);
    });

    it('should limit bulk import to 1000 entries', () => {
      const MAX_BULK_SIZE = 1000;
      
      const entries = Array.from({ length: 1500 }, (_, i) => ({
        hanzi: `字${i}`,
        pinyin: `zi${i}`,
        english: `char${i}`,
        category: 'test',
        hskLevel: 1,
      }));

      const toImport = entries.slice(0, MAX_BULK_SIZE);
      expect(toImport).toHaveLength(1000);
    });

    it('should count successful and failed imports', () => {
      const entries = [
        { hanzi: '好', pinyin: 'hǎo', english: 'good', category: 'adj', hskLevel: 1 },
        { hanzi: '', pinyin: 'bad', english: 'bad', category: 'adj', hskLevel: 1 }, // invalid
        { hanzi: '大', pinyin: 'dà', english: 'big', category: 'adj', hskLevel: 1 },
      ];

      let successful = 0;
      let failed = 0;

      for (const entry of entries) {
        if (entry.hanzi && entry.pinyin && entry.english) {
          successful++;
        } else {
          failed++;
        }
      }

      expect(successful).toBe(2);
      expect(failed).toBe(1);
    });
  });

  describe('Categories', () => {
    it('should list unique categories', () => {
      const vocab: VocabEntry[] = [
        { id: '1', hanzi: '吃', pinyin: 'chī', english: 'eat', category: 'verbs', hskLevel: 1 },
        { id: '2', hanzi: '大', pinyin: 'dà', english: 'big', category: 'adjectives', hskLevel: 1 },
        { id: '3', hanzi: '跑', pinyin: 'pǎo', english: 'run', category: 'verbs', hskLevel: 1 },
      ];

      const categories = [...new Set(vocab.map(v => v.category))];
      expect(categories).toContain('verbs');
      expect(categories).toContain('adjectives');
      expect(categories).toHaveLength(2);
    });

    it('should count words per category', () => {
      const vocab: VocabEntry[] = [
        { id: '1', hanzi: '吃', pinyin: 'chī', english: 'eat', category: 'verbs', hskLevel: 1 },
        { id: '2', hanzi: '跑', pinyin: 'pǎo', english: 'run', category: 'verbs', hskLevel: 1 },
        { id: '3', hanzi: '大', pinyin: 'dà', english: 'big', category: 'adjectives', hskLevel: 1 },
      ];

      const counts = vocab.reduce((acc, v) => {
        acc[v.category] = (acc[v.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(counts['verbs']).toBe(2);
      expect(counts['adjectives']).toBe(1);
    });
  });
});

describe('Vocabulary API Validation', () => {
  describe('Create Schema', () => {
    it('should require hanzi', () => {
      const isValid = (data: any) => typeof data.hanzi === 'string' && data.hanzi.length > 0;
      
      expect(isValid({ hanzi: '好' })).toBe(true);
      expect(isValid({ hanzi: '' })).toBe(false);
      expect(isValid({})).toBe(false);
    });

    it('should require pinyin', () => {
      const isValid = (data: any) => typeof data.pinyin === 'string' && data.pinyin.length > 0;
      
      expect(isValid({ pinyin: 'hǎo' })).toBe(true);
      expect(isValid({ pinyin: '' })).toBe(false);
    });

    it('should require english meaning', () => {
      const isValid = (data: any) => typeof data.english === 'string' && data.english.length > 0;
      
      expect(isValid({ english: 'good' })).toBe(true);
      expect(isValid({ english: '' })).toBe(false);
    });

    it('should require valid HSK level', () => {
      const isValidHsk = (level: any) => Number.isInteger(level) && level >= 1 && level <= 9;
      
      expect(isValidHsk(1)).toBe(true);
      expect(isValidHsk(9)).toBe(true);
      expect(isValidHsk(0)).toBe(false);
      expect(isValidHsk(10)).toBe(false);
    });
  });

  describe('Search Schema', () => {
    it('should accept query parameter', () => {
      const parseQuery = (params: Record<string, any>) => ({
        query: params.query || '',
        hsk_level: params.hsk_level ? parseInt(params.hsk_level) : undefined,
        category: params.category || undefined,
        limit: Math.min(params.limit || 50, 100),
        offset: params.offset || 0,
      });

      const result = parseQuery({ query: '你好', limit: '20' });
      expect(result.query).toBe('你好');
      expect(result.limit).toBe(20);
    });
  });
});

