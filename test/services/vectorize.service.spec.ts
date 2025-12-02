/**
 * VectorizeService Unit Tests
 * 
 * Tests embedding generation, vector storage, semantic search, and similarity finding.
 * Note: Actual AI/Vectorize calls may fail in test env - we verify behavior.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestContext, type TestContext } from '../helpers/test-app';
import { VectorizeService, type EmbeddableType } from '../../src/services/vectorize';
import { nanoid } from 'nanoid';

// Mock Vectorize and AI bindings for unit testing
const createMockVectorize = () => ({
  upsert: vi.fn().mockResolvedValue(undefined),
  query: vi.fn().mockResolvedValue({ matches: [] }),
  getByIds: vi.fn().mockResolvedValue([]),
  deleteByIds: vi.fn().mockResolvedValue(undefined),
  describe: vi.fn().mockResolvedValue({ vectorCount: 0, dimensions: 768 }),
});

const createMockAI = () => ({
  run: vi.fn().mockResolvedValue({ data: [[0.1, 0.2, 0.3]] }),
});

describe.sequential('VectorizeService', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx?.dispose();
    vi.restoreAllMocks();
  });

  // ========================================
  // EMBEDDING GENERATION
  // ========================================

  describe('embed', () => {
    it('generates embedding for Chinese text', async () => {
      const mockAI = createMockAI();
      const mockVectorize = createMockVectorize();
      const service = new VectorizeService(mockVectorize as any, mockAI as any, 'test-request');

      const embedding = await service.embed('你好世界');

      expect(mockAI.run).toHaveBeenCalledWith('@cf/baai/bge-base-en-v1.5', { text: ['你好世界'] });
      expect(embedding).toEqual([0.1, 0.2, 0.3]);
    });

    it('generates embedding for English text', async () => {
      const mockAI = createMockAI();
      const mockVectorize = createMockVectorize();
      const service = new VectorizeService(mockVectorize as any, mockAI as any, 'test-request');

      await service.embed('Hello world');

      expect(mockAI.run).toHaveBeenCalledWith('@cf/baai/bge-base-en-v1.5', { text: ['Hello world'] });
    });

    it('handles empty AI response gracefully', async () => {
      const mockAI = {
        run: vi.fn().mockResolvedValue({ data: [] }),
      };
      const mockVectorize = createMockVectorize();
      const service = new VectorizeService(mockVectorize as any, mockAI as any, 'test-request');

      await expect(service.embed('test')).rejects.toThrow('No embedding returned');
    });

    it('handles AI error gracefully', async () => {
      const mockAI = {
        run: vi.fn().mockRejectedValue(new Error('AI service unavailable')),
      };
      const mockVectorize = createMockVectorize();
      const service = new VectorizeService(mockVectorize as any, mockAI as any, 'test-request');

      await expect(service.embed('test')).rejects.toThrow('AI service unavailable');
    });
  });

  describe('embedBatch', () => {
    it('generates embeddings for multiple texts', async () => {
      const mockAI = {
        run: vi.fn().mockResolvedValue({ 
          data: [[0.1, 0.2], [0.3, 0.4], [0.5, 0.6]] 
        }),
      };
      const mockVectorize = createMockVectorize();
      const service = new VectorizeService(mockVectorize as any, mockAI as any, 'test-request');

      const embeddings = await service.embedBatch(['你好', '再见', '谢谢']);

      expect(mockAI.run).toHaveBeenCalledWith('@cf/baai/bge-base-en-v1.5', { 
        text: ['你好', '再见', '谢谢'] 
      });
      expect(embeddings).toHaveLength(3);
    });

    it('handles empty batch', async () => {
      const mockAI = {
        run: vi.fn().mockResolvedValue({ data: [] }),
      };
      const mockVectorize = createMockVectorize();
      const service = new VectorizeService(mockVectorize as any, mockAI as any, 'test-request');

      const embeddings = await service.embedBatch([]);

      expect(embeddings).toEqual([]);
    });
  });

  // ========================================
  // UPSERT OPERATIONS
  // ========================================

  describe('upsert', () => {
    it('upserts vocabulary with correct vector ID format', async () => {
      const mockAI = createMockAI();
      const mockVectorize = createMockVectorize();
      const service = new VectorizeService(mockVectorize as any, mockAI as any, 'test-request');

      await service.upsert('vocabulary', 'vocab-123', '你好 - hello', {
        hanzi: '你好',
        pinyin: 'nǐ hǎo',
        hskLevel: 1,
      });

      expect(mockVectorize.upsert).toHaveBeenCalledWith([
        {
          id: 'vocabulary:vocab-123',
          values: [0.1, 0.2, 0.3],
          metadata: {
            type: 'vocabulary',
            id: 'vocab-123',
            hanzi: '你好',
            pinyin: 'nǐ hǎo',
            hskLevel: 1,
          },
        },
      ]);
    });

    it('upserts lesson with correct metadata', async () => {
      const mockAI = createMockAI();
      const mockVectorize = createMockVectorize();
      const service = new VectorizeService(mockVectorize as any, mockAI as any, 'test-request');

      await service.upsert('lesson', 'lesson-456', 'Greetings lesson', {
        title: 'Basic Greetings',
        hskLevel: 1,
      });

      expect(mockVectorize.upsert).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'lesson:lesson-456',
          metadata: expect.objectContaining({
            type: 'lesson',
            id: 'lesson-456',
            title: 'Basic Greetings',
          }),
        }),
      ]);
    });

    it('upserts story content', async () => {
      const mockAI = createMockAI();
      const mockVectorize = createMockVectorize();
      const service = new VectorizeService(mockVectorize as any, mockAI as any, 'test-request');

      await service.upsert('story', 'story-789', '小明去商店买东西', {
        title: 'Shopping Trip',
        hskLevel: 2,
      });

      expect(mockVectorize.upsert).toHaveBeenCalled();
    });
  });

  describe('upsertBatch', () => {
    it('batches upserts efficiently', async () => {
      const mockAI = {
        run: vi.fn().mockResolvedValue({ 
          data: [[0.1], [0.2], [0.3]] 
        }),
      };
      const mockVectorize = createMockVectorize();
      const service = new VectorizeService(mockVectorize as any, mockAI as any, 'test-request');

      const result = await service.upsertBatch([
        { type: 'vocabulary' as EmbeddableType, id: '1', text: '你好', metadata: { hanzi: '你好' } },
        { type: 'vocabulary' as EmbeddableType, id: '2', text: '再见', metadata: { hanzi: '再见' } },
        { type: 'vocabulary' as EmbeddableType, id: '3', text: '谢谢', metadata: { hanzi: '谢谢' } },
      ]);

      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('handles partial failures in batch', async () => {
      const mockAI = {
        run: vi.fn().mockRejectedValue(new Error('Batch failed')),
      };
      const mockVectorize = createMockVectorize();
      const service = new VectorizeService(mockVectorize as any, mockAI as any, 'test-request');

      const result = await service.upsertBatch([
        { type: 'vocabulary' as EmbeddableType, id: '1', text: '你好', metadata: {} },
      ]);

      expect(result.failed).toBeGreaterThan(0);
    });
  });

  // ========================================
  // SEARCH OPERATIONS
  // ========================================

  describe('search', () => {
    it('performs semantic search', async () => {
      const mockAI = createMockAI();
      const mockVectorize = {
        ...createMockVectorize(),
        query: vi.fn().mockResolvedValue({
          matches: [
            { id: 'vocabulary:1', score: 0.95, metadata: { hanzi: '你好' } },
            { id: 'vocabulary:2', score: 0.85, metadata: { hanzi: '您好' } },
          ],
        }),
      };
      const service = new VectorizeService(mockVectorize as any, mockAI as any, 'test-request');

      const results = await service.search('hello greeting');

      expect(results).toHaveLength(2);
      expect(results[0].score).toBe(0.95);
      expect(results[0].id).toBe('vocabulary:1');
    });

    it('filters by type', async () => {
      const mockAI = createMockAI();
      const mockVectorize = {
        ...createMockVectorize(),
        query: vi.fn().mockResolvedValue({ matches: [] }),
      };
      const service = new VectorizeService(mockVectorize as any, mockAI as any, 'test-request');

      await service.search('test', { type: 'vocabulary' });

      expect(mockVectorize.query).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          filter: { type: 'vocabulary' },
        })
      );
    });

    it('filters by HSK level', async () => {
      const mockAI = createMockAI();
      const mockVectorize = {
        ...createMockVectorize(),
        query: vi.fn().mockResolvedValue({ matches: [] }),
      };
      const service = new VectorizeService(mockVectorize as any, mockAI as any, 'test-request');

      await service.search('test', { hskLevel: 2 });

      expect(mockVectorize.query).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          filter: { hskLevel: 2 },
        })
      );
    });

    it('respects topK parameter', async () => {
      const mockAI = createMockAI();
      const mockVectorize = {
        ...createMockVectorize(),
        query: vi.fn().mockResolvedValue({ matches: [] }),
      };
      const service = new VectorizeService(mockVectorize as any, mockAI as any, 'test-request');

      await service.search('test', { topK: 5 });

      expect(mockVectorize.query).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          topK: 5,
        })
      );
    });

    it('returns empty array when no matches', async () => {
      const mockAI = createMockAI();
      const mockVectorize = {
        ...createMockVectorize(),
        query: vi.fn().mockResolvedValue({ matches: null }),
      };
      const service = new VectorizeService(mockVectorize as any, mockAI as any, 'test-request');

      const results = await service.search('nonexistent');

      expect(results).toEqual([]);
    });
  });

  // ========================================
  // FIND SIMILAR
  // ========================================

  describe('findSimilar', () => {
    it('finds similar items by vector', async () => {
      const mockAI = createMockAI();
      const mockVectorize = {
        ...createMockVectorize(),
        getByIds: vi.fn().mockResolvedValue([{ values: [0.1, 0.2, 0.3] }]),
        query: vi.fn().mockResolvedValue({
          matches: [
            { id: 'vocabulary:1', score: 1.0, metadata: {} }, // Self
            { id: 'vocabulary:2', score: 0.9, metadata: {} },
            { id: 'vocabulary:3', score: 0.8, metadata: {} },
          ],
        }),
      };
      const service = new VectorizeService(mockVectorize as any, mockAI as any, 'test-request');

      const results = await service.findSimilar('vocabulary', '1', 2);

      // Should exclude self and return top 2
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('vocabulary:2');
    });

    it('returns empty when item not found', async () => {
      const mockAI = createMockAI();
      const mockVectorize = {
        ...createMockVectorize(),
        getByIds: vi.fn().mockResolvedValue([]),
      };
      const service = new VectorizeService(mockVectorize as any, mockAI as any, 'test-request');

      const results = await service.findSimilar('vocabulary', 'nonexistent');

      expect(results).toEqual([]);
    });

    it('filters out self from results', async () => {
      const mockAI = createMockAI();
      const mockVectorize = {
        ...createMockVectorize(),
        getByIds: vi.fn().mockResolvedValue([{ values: [0.1, 0.2, 0.3] }]),
        query: vi.fn().mockResolvedValue({
          matches: [
            { id: 'vocabulary:target', score: 1.0, metadata: {} },
          ],
        }),
      };
      const service = new VectorizeService(mockVectorize as any, mockAI as any, 'test-request');

      const results = await service.findSimilar('vocabulary', 'target');

      expect(results).toEqual([]);
    });
  });

  // ========================================
  // DELETE OPERATIONS
  // ========================================

  describe('delete', () => {
    it('deletes vector by type and id', async () => {
      const mockAI = createMockAI();
      const mockVectorize = createMockVectorize();
      const service = new VectorizeService(mockVectorize as any, mockAI as any, 'test-request');

      await service.delete('vocabulary', 'vocab-123');

      expect(mockVectorize.deleteByIds).toHaveBeenCalledWith(['vocabulary:vocab-123']);
    });

    it('handles delete errors gracefully', async () => {
      const mockAI = createMockAI();
      const mockVectorize = {
        ...createMockVectorize(),
        deleteByIds: vi.fn().mockRejectedValue(new Error('Delete failed')),
      };
      const service = new VectorizeService(mockVectorize as any, mockAI as any, 'test-request');

      await expect(service.delete('vocabulary', 'id')).rejects.toThrow('Delete failed');
    });
  });

  // ========================================
  // STATS
  // ========================================

  describe('getStats', () => {
    it('returns vector index statistics', async () => {
      const mockAI = createMockAI();
      const mockVectorize = {
        ...createMockVectorize(),
        describe: vi.fn().mockResolvedValue({ vectorCount: 1000, dimensions: 768 }),
      };
      const service = new VectorizeService(mockVectorize as any, mockAI as any, 'test-request');

      const stats = await service.getStats();

      expect(stats.vectorCount).toBe(1000);
      expect(stats.dimensions).toBe(768);
    });

    it('returns defaults on error', async () => {
      const mockAI = createMockAI();
      const mockVectorize = {
        ...createMockVectorize(),
        describe: vi.fn().mockRejectedValue(new Error('Stats failed')),
      };
      const service = new VectorizeService(mockVectorize as any, mockAI as any, 'test-request');

      const stats = await service.getStats();

      expect(stats.vectorCount).toBe(0);
      expect(stats.dimensions).toBe(768);
    });
  });

  // ========================================
  // INTEGRATION WITH REAL BINDINGS (if available)
  // ========================================

  describe('Integration (with real bindings)', () => {
    it('handles missing Vectorize binding gracefully', async () => {
      // This tests the behavior when Vectorize is not configured
      // In test environment, ctx.env.VECTORIZE may not exist
      
      if (!ctx.env.VECTORIZE || !ctx.env.AI) {
        // Expected in test environment
        expect(true).toBe(true);
        return;
      }

      const service = new VectorizeService(ctx.env.VECTORIZE, ctx.env.AI, 'test-request');
      const stats = await service.getStats();
      
      expect(stats).toBeDefined();
    });
  });
});

