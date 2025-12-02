/**
 * AI Tutor Lesson Cache
 * 
 * Aggressive caching layer for AI-generated lessons.
 * Same input = same output, served from cache at $0 cost.
 * 
 * Architecture:
 * - D1: Cache metadata (key, timestamps, hit counts) - fast lookup
 * - R2: Lesson JSON storage - cheap blob storage (50x cheaper than D1!)
 * 
 * Cache Key Structure:
 * - hskLevel: 1-6
 * - positionBucket: lessons grouped by 10s (1-10, 11-20, etc.)
 * - focusWordHash: sorted, hashed focus words
 * 
 * UX Design:
 * We add artificial delay for cache hits so users don't notice
 * the difference between cached (~0.5s) and generated (~20s) lessons.
 * The mobile app shows a "generating lesson" animation during this time.
 * This maintains the perception of personalization.
 * 
 * @module services/tutor-cache
 */

import { D1Database, R2Bucket } from '@cloudflare/workers-types';
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
  /** If cached, how long to delay delivery (ms) to mask cache hit */
  artificialDelayMs?: number;
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
  
  // R2 bucket prefix for tutor lessons
  R2_PREFIX: 'tutor-lessons/',
  
  // Artificial delay range for cache hits (ms)
  // Random delay between MIN and MAX to feel natural
  ARTIFICIAL_DELAY_MIN_MS: 8000,  // 8 seconds minimum
  ARTIFICIAL_DELAY_MAX_MS: 15000, // 15 seconds maximum
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
 * Get R2 object key from cache key
 */
function getR2Key(cacheKey: string): string {
  return `${CONFIG.R2_PREFIX}${cacheKey}.json`;
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

/**
 * Generate artificial delay to mask cache hits
 * Random value between MIN and MAX for natural feeling
 */
function generateArtificialDelay(): number {
  const range = CONFIG.ARTIFICIAL_DELAY_MAX_MS - CONFIG.ARTIFICIAL_DELAY_MIN_MS;
  return CONFIG.ARTIFICIAL_DELAY_MIN_MS + Math.floor(Math.random() * range);
}

// ═══════════════════════════════════════════════════════════
// Cache Service
// ═══════════════════════════════════════════════════════════

export class TutorCache {
  private db: D1Database;
  private r2: R2Bucket;
  
  constructor(db: D1Database, r2: R2Bucket) {
    this.db = db;
    this.r2 = r2;
  }
  
  /**
   * Look up a cached lesson by exact match
   * Returns with artificial delay suggestion to mask cache hits
   */
  async lookup(
    hskLevel: number,
    position: number,
    focusWords: string[]
  ): Promise<CacheLookupResult> {
    const key = buildCacheKey(hskLevel, position, focusWords);
    const cacheKey = serializeCacheKey(key);
    
    try {
      // Try exact match first (D1 metadata lookup)
      const exact = await this.db.prepare(`
        SELECT cache_key, hit_count FROM tutor_lesson_cache
        WHERE cache_key = ? AND created_at > ?
      `).bind(
        cacheKey,
        Math.floor(Date.now() / 1000) - CONFIG.TTL_SECONDS
      ).first();
      
      if (exact) {
        // Fetch lesson from R2
        const r2Key = getR2Key(cacheKey);
        const r2Object = await this.r2.get(r2Key);
        
        if (r2Object) {
          const lessonJson = await r2Object.text();
          const lesson = JSON.parse(lessonJson) as TutorLesson;
          
          // Update hit count in D1
          await this.db.prepare(`
            UPDATE tutor_lesson_cache 
            SET hit_count = hit_count + 1, last_hit_at = ?
            WHERE cache_key = ?
          `).bind(Math.floor(Date.now() / 1000), cacheKey).run();
          
          const artificialDelayMs = generateArtificialDelay();
          
          logWithContext('info', 'tutor.cache.hit', {
            meta: { 
              cacheKey, 
              matchType: 'exact', 
              hitCount: (exact.hit_count as number) + 1,
              artificialDelayMs,
            }
          });
          
          return {
            hit: true,
            lesson,
            cacheKey,
            matchType: 'exact',
            savedCost: CONFIG.ESTIMATED_COST_PER_LESSON,
            artificialDelayMs,
          };
        } else {
          // D1 has metadata but R2 missing - orphaned entry, clean up
          logWithContext('warn', 'tutor.cache.orphaned', { meta: { cacheKey } });
          await this.db.prepare(`DELETE FROM tutor_lesson_cache WHERE cache_key = ?`)
            .bind(cacheKey).run();
        }
      }
      
      // Try fuzzy match (same HSK, nearby position, similar focus words)
      const fuzzy = await this.db.prepare(`
        SELECT cache_key, focus_words_json FROM tutor_lesson_cache
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
            // Fetch lesson from R2
            const r2Key = getR2Key(row.cache_key as string);
            const r2Object = await this.r2.get(r2Key);
            
            if (r2Object) {
              const lessonJson = await r2Object.text();
              const lesson = JSON.parse(lessonJson) as TutorLesson;
              
              // Update hit count
              await this.db.prepare(`
                UPDATE tutor_lesson_cache 
                SET hit_count = hit_count + 1, last_hit_at = ?
                WHERE cache_key = ?
              `).bind(Math.floor(Date.now() / 1000), row.cache_key).run();
              
              const artificialDelayMs = generateArtificialDelay();
              
              logWithContext('info', 'tutor.cache.hit', {
                meta: { 
                  cacheKey: row.cache_key, 
                  matchType: 'fuzzy', 
                  overlap,
                  artificialDelayMs,
                }
              });
              
              return {
                hit: true,
                lesson,
                cacheKey: row.cache_key as string,
                matchType: 'fuzzy',
                savedCost: CONFIG.ESTIMATED_COST_PER_LESSON,
                artificialDelayMs,
              };
            }
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
   * - Lesson JSON goes to R2 (cheap)
   * - Metadata goes to D1 (fast lookup)
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
      
      // Store lesson JSON in R2
      const r2Key = getR2Key(cacheKey);
      await this.r2.put(r2Key, JSON.stringify(lesson), {
        httpMetadata: {
          contentType: 'application/json',
        },
        customMetadata: {
          hskLevel: String(hskLevel),
          positionBucket: String(key.positionBucket),
          createdAt: String(now),
        },
      });
      
      // Store metadata in D1
      await this.db.prepare(`
        INSERT OR REPLACE INTO tutor_lesson_cache (
          cache_key, hsk_level, position_bucket, focus_words_hash,
          focus_words_json, created_at, hit_count, last_hit_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)
      `).bind(
        cacheKey,
        hskLevel,
        key.positionBucket,
        key.focusWordHash,
        JSON.stringify(focusWords),
        now,
        now
      ).run();
      
      logWithContext('info', 'tutor.cache.store', { 
        meta: { cacheKey, r2Key } 
      });
      
    } catch (error) {
      // Don't fail the request if caching fails
      logWithContext('error', 'tutor.cache.store_error', {
        meta: { error: (error as Error).message, cacheKey }
      });
    }
  }
  
  /**
   * Evict old entries if we're over the limit for this HSK level
   * Cleans up both D1 metadata and R2 objects
   */
  private async maybeEvict(hskLevel: number): Promise<void> {
    try {
      const count = await this.db.prepare(`
        SELECT COUNT(*) as cnt FROM tutor_lesson_cache WHERE hsk_level = ?
      `).bind(hskLevel).first();
      
      const currentCount = (count?.cnt as number) || 0;
      
      if (currentCount >= CONFIG.MAX_ENTRIES_PER_LEVEL) {
        // Get oldest, least-used entries (20% of max)
        const toDelete = Math.floor(CONFIG.MAX_ENTRIES_PER_LEVEL * 0.2);
        
        const entries = await this.db.prepare(`
          SELECT cache_key FROM tutor_lesson_cache 
          WHERE hsk_level = ?
          ORDER BY last_hit_at ASC, hit_count ASC
          LIMIT ?
        `).bind(hskLevel, toDelete).all();
        
        if (entries.results && entries.results.length > 0) {
          // Delete from R2 first
          for (const entry of entries.results) {
            const r2Key = getR2Key(entry.cache_key as string);
            await this.r2.delete(r2Key);
          }
          
          // Then delete from D1
          const cacheKeys = entries.results.map(e => e.cache_key as string);
          const placeholders = cacheKeys.map(() => '?').join(',');
          await this.db.prepare(`
            DELETE FROM tutor_lesson_cache 
            WHERE cache_key IN (${placeholders})
          `).bind(...cacheKeys).run();
          
          logWithContext('info', 'tutor.cache.evict', { 
            meta: { hskLevel, evicted: cacheKeys.length } 
          });
        }
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
// Database Migration SQL (D1 metadata only - no lesson_json!)
// ═══════════════════════════════════════════════════════════

export const CACHE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS tutor_lesson_cache (
  cache_key TEXT PRIMARY KEY,
  hsk_level INTEGER NOT NULL,
  position_bucket INTEGER NOT NULL,
  focus_words_hash TEXT NOT NULL,
  focus_words_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  hit_count INTEGER DEFAULT 0,
  last_hit_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tutor_cache_hsk_bucket 
ON tutor_lesson_cache(hsk_level, position_bucket);

CREATE INDEX IF NOT EXISTS idx_tutor_cache_hits 
ON tutor_lesson_cache(hit_count DESC, last_hit_at DESC);
`;
