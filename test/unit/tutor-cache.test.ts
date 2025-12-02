/**
 * AI Tutor Cache Unit Tests
 * 
 * Tests for cache key generation and utilities.
 * Integration tests for actual cache operations would require a D1 database mock.
 */

import { describe, it, expect } from 'vitest';
import { 
  buildCacheKey, 
  serializeCacheKey,
  CacheKey,
} from '../../src/services/tutor-cache';

// ═══════════════════════════════════════════════════════════
// Cache Key Tests
// ═══════════════════════════════════════════════════════════

describe('buildCacheKey', () => {
  it('creates cache key from inputs', () => {
    const key = buildCacheKey(1, 15, ['学习', '中文']);
    
    expect(key.hskLevel).toBe(1);
    expect(key.positionBucket).toBe(11); // 15 falls in bucket 11-20 -> bucket starts at 11
    expect(key.focusWordHash).toBeDefined();
    expect(key.focusWordHash.length).toBe(8); // 8 hex chars
  });

  it('buckets positions correctly', () => {
    // Positions 1-10 -> bucket 1
    expect(buildCacheKey(1, 1, []).positionBucket).toBe(1);
    expect(buildCacheKey(1, 5, []).positionBucket).toBe(1);
    expect(buildCacheKey(1, 10, []).positionBucket).toBe(1);
    
    // Positions 11-20 -> bucket 11
    expect(buildCacheKey(1, 11, []).positionBucket).toBe(11);
    expect(buildCacheKey(1, 15, []).positionBucket).toBe(11);
    expect(buildCacheKey(1, 20, []).positionBucket).toBe(11);
    
    // Positions 21-30 -> bucket 21
    expect(buildCacheKey(1, 21, []).positionBucket).toBe(21);
    expect(buildCacheKey(1, 30, []).positionBucket).toBe(21);
  });

  it('produces same hash for same focus words', () => {
    const key1 = buildCacheKey(1, 15, ['学习', '中文']);
    const key2 = buildCacheKey(1, 15, ['学习', '中文']);
    
    expect(key1.focusWordHash).toBe(key2.focusWordHash);
  });

  it('produces same hash regardless of word order', () => {
    const key1 = buildCacheKey(1, 15, ['学习', '中文']);
    const key2 = buildCacheKey(1, 15, ['中文', '学习']);
    
    expect(key1.focusWordHash).toBe(key2.focusWordHash);
  });

  it('produces different hash for different focus words', () => {
    const key1 = buildCacheKey(1, 15, ['学习', '中文']);
    const key2 = buildCacheKey(1, 15, ['工作', '英文']);
    
    expect(key1.focusWordHash).not.toBe(key2.focusWordHash);
  });

  it('handles empty focus words', () => {
    const key = buildCacheKey(1, 15, []);
    
    expect(key.focusWordHash).toBeDefined();
    expect(key.focusWordHash.length).toBe(8);
  });

  it('handles single focus word', () => {
    const key = buildCacheKey(1, 15, ['学习']);
    
    expect(key.focusWordHash).toBeDefined();
    expect(key.focusWordHash.length).toBe(8);
  });

  it('handles many focus words', () => {
    const key = buildCacheKey(1, 15, ['学习', '中文', '老师', '学生', '朋友', '喜欢']);
    
    expect(key.focusWordHash).toBeDefined();
    expect(key.focusWordHash.length).toBe(8);
  });
});

describe('serializeCacheKey', () => {
  it('serializes cache key to string', () => {
    const key: CacheKey = {
      hskLevel: 1,
      positionBucket: 11,
      focusWordHash: 'abc12345',
    };
    
    const serialized = serializeCacheKey(key);
    
    expect(serialized).toBe('tutor_hsk1_b11_abc12345');
  });

  it('produces consistent serialization', () => {
    const key = buildCacheKey(2, 25, ['老师', '学生']);
    const serialized1 = serializeCacheKey(key);
    const serialized2 = serializeCacheKey(key);
    
    expect(serialized1).toBe(serialized2);
  });

  it('produces unique keys for different inputs', () => {
    const key1 = serializeCacheKey(buildCacheKey(1, 15, ['学习']));
    const key2 = serializeCacheKey(buildCacheKey(2, 15, ['学习'])); // Different HSK
    const key3 = serializeCacheKey(buildCacheKey(1, 25, ['学习'])); // Different bucket
    const key4 = serializeCacheKey(buildCacheKey(1, 15, ['工作'])); // Different words
    
    const keys = [key1, key2, key3, key4];
    const uniqueKeys = new Set(keys);
    
    expect(uniqueKeys.size).toBe(4);
  });
});

// ═══════════════════════════════════════════════════════════
// Cache Strategy Tests
// ═══════════════════════════════════════════════════════════

describe('Cache Strategy', () => {
  it('same user at same position with same words gets same key', () => {
    // Simulate two requests with identical inputs
    const key1 = serializeCacheKey(buildCacheKey(1, 15, ['学习', '中文']));
    const key2 = serializeCacheKey(buildCacheKey(1, 15, ['学习', '中文']));
    
    expect(key1).toBe(key2);
  });

  it('nearby positions map to same bucket', () => {
    // User at position 12 and user at position 18 should share a bucket
    const key1 = buildCacheKey(1, 12, ['学习']);
    const key2 = buildCacheKey(1, 18, ['学习']);
    
    expect(key1.positionBucket).toBe(key2.positionBucket);
  });

  it('different HSK levels never share cache', () => {
    const key1 = serializeCacheKey(buildCacheKey(1, 15, ['学习']));
    const key2 = serializeCacheKey(buildCacheKey(2, 15, ['学习']));
    
    expect(key1).not.toBe(key2);
  });
});

// ═══════════════════════════════════════════════════════════
// Edge Cases
// ═══════════════════════════════════════════════════════════

describe('Edge Cases', () => {
  it('handles HSK level 6', () => {
    const key = buildCacheKey(6, 60, ['高级', '词汇']);
    
    expect(key.hskLevel).toBe(6);
    expect(key.positionBucket).toBe(51);
  });

  it('handles very high lesson positions', () => {
    const key = buildCacheKey(6, 300, ['词汇']);
    
    expect(key.positionBucket).toBe(291);
  });

  it('handles unicode in focus words', () => {
    const key = buildCacheKey(1, 15, ['你好', '世界', '中国']);
    
    expect(key.focusWordHash).toBeDefined();
    expect(key.focusWordHash.length).toBe(8);
  });

  it('handles focus words with special characters', () => {
    // Some words might have special formatting
    const key = buildCacheKey(1, 15, ['（一）', '「你好」']);
    
    expect(key.focusWordHash).toBeDefined();
  });
});

