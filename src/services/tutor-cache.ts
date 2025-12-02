/**
 * AI Tutor Lesson Cache
 * 
 * Aggressive caching layer for AI-generated lessons.
 * Same input = same output, served from cache at $0 cost.
 * 
 * Cache Key Structure:
 * - hskLevel: 1-6
 * - positionBucket: lessons grouped by 10s (1-10, 11-20, etc.)
 * - focusWordHash: sorted, hashed focus words
 * 
 * @module services/tutor-cache
 */

import { D1Database } from '@cloudflare/workers-types';
import { TutorLesson } from './ai-tutor-generator';
import { logWithContext } from '../utils/logger';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export interface CacheKey {
  hskLevel: number;
  positionBucket: number;
  focusWordHash: string;
}

export interface CacheEntry {
  key: string;
  lesson: TutorLesson;
  createdAt: number;
  hitCount: number;
  lastHitAt: number;
}

export interface CacheLookupResult {
  hit: boolean;
  lesson?: TutorLesson;
  cacheKey: string;
  matchType?: 'exact' | 'fuzzy';
  savedCost?: number;
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  hitRate: number;
  estimatedSavings: number;
}

// ═══════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════

const CONFIG = {
  // Position bucket size (group lessons together)
  POSITION_BUCKET_SIZE: 10,
  
  // Cache TTL (30 days in seconds)
  TTL_SECONDS: 30 * 24 * 60 * 60,
  
  // Max cache entries per HSK level (prevent bloat)
  MAX_ENTRIES_PER_LEVEL: 1000,
  
  // Estimated cost per lesson (for savings calculation)
  ESTIMATED_COST_PER_LESSON: 0.00045,
  
  // Minimum focus word overlap for fuzzy match (80%)
  FUZZY_MATCH_THRESHOLD: 0.8,
};

// ═══════════════════════════════════════════════════════════
// Cache Key Utilities
// ═══════════════════════════════════════════════════════════

/**
 * Generate a simple hash from an array of strings
 */
function hashFocusWords(focusWords: string[]): string {
  const sorted = [...focusWords].sort();
  const combined = sorted.join('|');
  
  // Simple hash function (FNV-1a inspired)
  let hash = 2166136261;
  for (let i = 0; i < combined.length; i++) {
    hash ^= combined.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  
  // Convert to hex string
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Calculate position bucket from lesson position
 */
function getPositionBucket(position: number): number {
  return Math.floor((position - 1) / CONFIG.POSITION_BUCKET_SIZE) * CONFIG.POSITION_BUCKET_SIZE + 1;
}

/**
 * Build cache key from input parameters
 */
export function buildCacheKey(hskLevel: number, position: number, focusWords: string[]): CacheKey {
  return {
    hskLevel,
    positionBucket: getPositionBucket(position),
    focusWordHash: hashFocusWords(focusWords),
  };
}

/**
 * Serialize cache key to string
 */
export function serializeCacheKey(key: CacheKey): string {
  return `tutor_hsk${key.hskLevel}_b${key.positionBucket}_${key.focusWordHash}`;
}

/**
 * Calculate focus word overlap between two sets
 */
function calculateOverlap(words1: string[], words2: string[]): number {
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  let overlap = 0;
  for (const word of set1) {
    if (set2.has(word)) overlap++;
  }
  
  const total = Math.max(set1.size, set2.size);
  return total > 0 ? overlap / total : 0;
}

// ═══════════════════════════════════════════════════════════
// Cache Service
// ═══════════════════════════════════════════════════════════

export class TutorCache {
  private db: D1Database;
  
  constructor(db: D1Database) {
    this.db = db;
  }
  
  /**
   * Look up a cached lesson by exact match
   */
  async lookup(
    hskLevel: number,
    position: number,
    focusWords: string[]
  ): Promise<CacheLookupResult> {
    const key = buildCacheKey(hskLevel, position, focusWords);
    const cacheKey = serializeCacheKey(key);
    
    try {
      // Try exact match first
      const exact = await this.db.prepare(`
        SELECT lesson_json, hit_count FROM tutor_lesson_cache
        WHERE cache_key = ? AND created_at > ?
      `).bind(
        cacheKey,
        Math.floor(Date.now() / 1000) - CONFIG.TTL_SECONDS
      ).first();
      
      if (exact) {
        // Update hit count
        await this.db.prepare(`
          UPDATE tutor_lesson_cache 
          SET hit_count = hit_count + 1, last_hit_at = ?
          WHERE cache_key = ?
        `).bind(Math.floor(Date.now() / 1000), cacheKey).run();
        
        const lesson = JSON.parse(exact.lesson_json as string) as TutorLesson;
        
        logWithContext('info', 'tutor.cache.hit', {
          meta: { cacheKey, matchType: 'exact', hitCount: (exact.hit_count as number) + 1 }
        });
        
        return {
          hit: true,
          lesson,
          cacheKey,
          matchType: 'exact',
          savedCost: CONFIG.ESTIMATED_COST_PER_LESSON,
        };
      }
      
      // Try fuzzy match (same HSK, nearby position, similar focus words)
      const fuzzy = await this.db.prepare(`
        SELECT cache_key, lesson_json, focus_words_json FROM tutor_lesson_cache
        WHERE hsk_level = ? 
          AND position_bucket >= ? AND position_bucket <= ?
          AND created_at > ?
        ORDER BY hit_count DESC
        LIMIT 10
      `).bind(
        hskLevel,
        getPositionBucket(position) - CONFIG.POSITION_BUCKET_SIZE,
        getPositionBucket(position) + CONFIG.POSITION_BUCKET_SIZE,
        Math.floor(Date.now() / 1000) - CONFIG.TTL_SECONDS
      ).all();
      
      if (fuzzy.results && fuzzy.results.length > 0) {
        for (const row of fuzzy.results) {
          const cachedFocusWords = JSON.parse(row.focus_words_json as string) as string[];
          const overlap = calculateOverlap(focusWords, cachedFocusWords);
          
          if (overlap >= CONFIG.FUZZY_MATCH_THRESHOLD) {
            // Update hit count
            await this.db.prepare(`
              UPDATE tutor_lesson_cache 
              SET hit_count = hit_count + 1, last_hit_at = ?
              WHERE cache_key = ?
            `).bind(Math.floor(Date.now() / 1000), row.cache_key).run();
            
            const lesson = JSON.parse(row.lesson_json as string) as TutorLesson;
            
            logWithContext('info', 'tutor.cache.hit', {
              meta: { cacheKey: row.cache_key, matchType: 'fuzzy', overlap }
            });
            
            return {
              hit: true,
              lesson,
              cacheKey: row.cache_key as string,
              matchType: 'fuzzy',
              savedCost: CONFIG.ESTIMATED_COST_PER_LESSON,
            };
          }
        }
      }
      
      logWithContext('info', 'tutor.cache.miss', { meta: { cacheKey } });
      
      return {
        hit: false,
        cacheKey,
      };
      
    } catch (error) {
      logWithContext('error', 'tutor.cache.lookup_error', {
        meta: { error: (error as Error).message, cacheKey }
      });
      
      return {
        hit: false,
        cacheKey,
      };
    }
  }
  
  /**
   * Store a generated lesson in the cache
   */
  async store(
    hskLevel: number,
    position: number,
    focusWords: string[],
    lesson: TutorLesson
  ): Promise<void> {
    const key = buildCacheKey(hskLevel, position, focusWords);
    const cacheKey = serializeCacheKey(key);
    const now = Math.floor(Date.now() / 1000);
    
    try {
      // Check if we need to evict old entries
      await this.maybeEvict(hskLevel);
      
      // Insert or replace
      await this.db.prepare(`
        INSERT OR REPLACE INTO tutor_lesson_cache (
          cache_key, hsk_level, position_bucket, focus_words_hash,
          focus_words_json, lesson_json, created_at, hit_count, last_hit_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
      `).bind(
        cacheKey,
        hskLevel,
        key.positionBucket,
        key.focusWordHash,
        JSON.stringify(focusWords),
        JSON.stringify(lesson),
        now,
        now
      ).run();
      
      logWithContext('info', 'tutor.cache.store', { meta: { cacheKey } });
      
    } catch (error) {
      // Don't fail the request if caching fails
      logWithContext('error', 'tutor.cache.store_error', {
        meta: { error: (error as Error).message, cacheKey }
      });
    }
  }
  
  /**
   * Evict old entries if we're over the limit for this HSK level
   */
  private async maybeEvict(hskLevel: number): Promise<void> {
    try {
      const count = await this.db.prepare(`
        SELECT COUNT(*) as cnt FROM tutor_lesson_cache WHERE hsk_level = ?
      `).bind(hskLevel).first();
      
      const currentCount = (count?.cnt as number) || 0;
      
      if (currentCount >= CONFIG.MAX_ENTRIES_PER_LEVEL) {
        // Delete oldest, least-used entries (20% of max)
        const toDelete = Math.floor(CONFIG.MAX_ENTRIES_PER_LEVEL * 0.2);
        
        await this.db.prepare(`
          DELETE FROM tutor_lesson_cache 
          WHERE cache_key IN (
            SELECT cache_key FROM tutor_lesson_cache 
            WHERE hsk_level = ?
            ORDER BY last_hit_at ASC, hit_count ASC
            LIMIT ?
          )
        `).bind(hskLevel, toDelete).run();
        
        logWithContext('info', 'tutor.cache.evict', { 
          meta: { hskLevel, evicted: toDelete } 
        });
      }
    } catch (error) {
      logWithContext('error', 'tutor.cache.evict_error', {
        meta: { error: (error as Error).message }
      });
    }
  }
  
  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const stats = await this.db.prepare(`
        SELECT 
          COUNT(*) as total_entries,
          SUM(hit_count) as total_hits
        FROM tutor_lesson_cache
        WHERE created_at > ?
      `).bind(Math.floor(Date.now() / 1000) - CONFIG.TTL_SECONDS).first();
      
      const totalEntries = (stats?.total_entries as number) || 0;
      const totalHits = (stats?.total_hits as number) || 0;
      
      return {
        totalEntries,
        totalHits,
        hitRate: totalEntries > 0 ? totalHits / (totalHits + totalEntries) : 0,
        estimatedSavings: totalHits * CONFIG.ESTIMATED_COST_PER_LESSON,
      };
    } catch (error) {
      return {
        totalEntries: 0,
        totalHits: 0,
        hitRate: 0,
        estimatedSavings: 0,
      };
    }
  }
  
  /**
   * Warm up cache with pre-generated lessons (for common patterns)
   */
  async warmUp(lessons: Array<{
    hskLevel: number;
    position: number;
    focusWords: string[];
    lesson: TutorLesson;
  }>): Promise<number> {
    let stored = 0;
    
    for (const entry of lessons) {
      try {
        await this.store(entry.hskLevel, entry.position, entry.focusWords, entry.lesson);
        stored++;
      } catch {
        // Continue on error
      }
    }
    
    return stored;
  }
}

// ═══════════════════════════════════════════════════════════
// Database Migration SQL
// ═══════════════════════════════════════════════════════════

export const CACHE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS tutor_lesson_cache (
  cache_key TEXT PRIMARY KEY,
  hsk_level INTEGER NOT NULL,
  position_bucket INTEGER NOT NULL,
  focus_words_hash TEXT NOT NULL,
  focus_words_json TEXT NOT NULL,
  lesson_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  hit_count INTEGER DEFAULT 0,
  last_hit_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tutor_cache_hsk_bucket 
ON tutor_lesson_cache(hsk_level, position_bucket);

CREATE INDEX IF NOT EXISTS idx_tutor_cache_hits 
ON tutor_lesson_cache(hit_count DESC, last_hit_at DESC);
`;

