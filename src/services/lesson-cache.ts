/**
 * Lesson Cache Service
 * Manages pre-generated lessons stored in R2
 */

import type { R2Bucket } from '@cloudflare/workers-types';
import { logWithContext } from '../utils/logger';
import {
  type CachedLesson,
  type LessonCacheSummary,
  type CreateCachedLessonInput,
  type UpdateCachedLessonInput,
  getCacheKey,
  parseCacheKey,
  MAX_CACHED_LESSON,
} from '../types/lesson-cache';

export class LessonCacheService {
  private bucket: R2Bucket;
  private requestId: string;

  constructor(bucket: R2Bucket, requestId?: string) {
    this.bucket = bucket;
    this.requestId = requestId || crypto.randomUUID();
  }

  /**
   * Get a cached lesson by lesson number and optional focus words
   */
  async get(lessonNumber: number, focusWords?: string[]): Promise<CachedLesson | null> {
    const key = getCacheKey(lessonNumber, focusWords);
    
    try {
      const object = await this.bucket.get(key);
      if (!object) {
        // Try default if specific focus words not found
        if (focusWords && focusWords.length > 0) {
          const defaultKey = getCacheKey(lessonNumber);
          const defaultObject = await this.bucket.get(defaultKey);
          if (defaultObject) {
            return JSON.parse(await defaultObject.text()) as CachedLesson;
          }
        }
        return null;
      }
      
      return JSON.parse(await object.text()) as CachedLesson;
    } catch (err) {
      logWithContext('error', 'lesson_cache.get_failed', {
        requestId: this.requestId,
        meta: { key, error: (err as Error).message },
      });
      return null;
    }
  }

  /**
   * Save a cached lesson
   */
  async set(lesson: CachedLesson): Promise<void> {
    const key = getCacheKey(lesson.lessonNumber, lesson.focusWords);
    
    try {
      await this.bucket.put(key, JSON.stringify(lesson, null, 2), {
        httpMetadata: { contentType: 'application/json' },
        customMetadata: {
          lessonNumber: String(lesson.lessonNumber),
          status: lesson.status,
          version: String(lesson.version),
        },
      });
      
      logWithContext('info', 'lesson_cache.saved', {
        requestId: this.requestId,
        meta: { key, lessonNumber: lesson.lessonNumber, status: lesson.status },
      });
    } catch (err) {
      logWithContext('error', 'lesson_cache.save_failed', {
        requestId: this.requestId,
        meta: { key, error: (err as Error).message },
      });
      throw err;
    }
  }

  /**
   * Create a new cached lesson
   */
  async create(input: CreateCachedLessonInput): Promise<CachedLesson> {
    const now = new Date().toISOString();
    const lesson: CachedLesson = {
      id: crypto.randomUUID(),
      lessonNumber: input.lessonNumber,
      hskLevel: input.hskLevel,
      focusWords: input.focusWords,
      chinese: input.chinese,
      pinyin: input.pinyin,
      english: input.english,
      practice: input.practice,
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy || 'manual',
      status: input.status || 'draft',
      version: 1,
    };
    
    await this.set(lesson);
    return lesson;
  }

  /**
   * Update an existing cached lesson
   */
  async update(
    lessonNumber: number,
    focusWords: string[] | undefined,
    updates: UpdateCachedLessonInput
  ): Promise<CachedLesson | null> {
    const existing = await this.get(lessonNumber, focusWords);
    if (!existing) return null;
    
    const updated: CachedLesson = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
      reviewedAt: updates.status === 'approved' ? new Date().toISOString() : existing.reviewedAt,
    };
    
    await this.set(updated);
    return updated;
  }

  /**
   * Delete a cached lesson
   */
  async delete(lessonNumber: number, focusWords?: string[]): Promise<boolean> {
    const key = getCacheKey(lessonNumber, focusWords);
    
    try {
      await this.bucket.delete(key);
      logWithContext('info', 'lesson_cache.deleted', {
        requestId: this.requestId,
        meta: { key, lessonNumber },
      });
      return true;
    } catch (err) {
      logWithContext('error', 'lesson_cache.delete_failed', {
        requestId: this.requestId,
        meta: { key, error: (err as Error).message },
      });
      return false;
    }
  }

  /**
   * List all variants for a specific lesson
   */
  async listByLesson(lessonNumber: number): Promise<CachedLesson[]> {
    const hskLevel = Math.floor((lessonNumber - 1) / 10) + 1;
    const lessonInHsk = ((lessonNumber - 1) % 10) + 1;
    const prefix = `lesson-cache/hsk${hskLevel}-l${String(lessonInHsk).padStart(2, '0')}/`;
    
    const lessons: CachedLesson[] = [];
    
    try {
      const listed = await this.bucket.list({ prefix });
      
      for (const object of listed.objects) {
        const obj = await this.bucket.get(object.key);
        if (obj) {
          const lesson = JSON.parse(await obj.text()) as CachedLesson;
          lessons.push(lesson);
        }
      }
    } catch (err) {
      logWithContext('error', 'lesson_cache.list_by_lesson_failed', {
        requestId: this.requestId,
        meta: { lessonNumber, error: (err as Error).message },
      });
    }
    
    return lessons;
  }

  /**
   * Get summary of all cached lessons
   */
  async listSummary(): Promise<LessonCacheSummary[]> {
    const summaries: Map<number, LessonCacheSummary> = new Map();
    
    try {
      const listed = await this.bucket.list({ prefix: 'lesson-cache/' });
      
      for (const object of listed.objects) {
        const parsed = parseCacheKey(object.key);
        if (!parsed) continue;
        
        const obj = await this.bucket.get(object.key);
        if (!obj) continue;
        
        const lesson = JSON.parse(await obj.text()) as CachedLesson;
        
        const existing = summaries.get(parsed.lessonNumber) || {
          lessonNumber: parsed.lessonNumber,
          hskLevel: lesson.hskLevel,
          variantCount: 0,
          approvedCount: 0,
          draftCount: 0,
        };
        
        existing.variantCount++;
        if (lesson.status === 'approved') existing.approvedCount++;
        if (lesson.status === 'draft') existing.draftCount++;
        
        summaries.set(parsed.lessonNumber, existing);
      }
    } catch (err) {
      logWithContext('error', 'lesson_cache.list_summary_failed', {
        requestId: this.requestId,
        meta: { error: (err as Error).message },
      });
    }
    
    // Fill in missing lessons 1-20
    const result: LessonCacheSummary[] = [];
    for (let i = 1; i <= MAX_CACHED_LESSON; i++) {
      const hskLevel = Math.floor((i - 1) / 10) + 1;
      result.push(summaries.get(i) || {
        lessonNumber: i,
        hskLevel,
        variantCount: 0,
        approvedCount: 0,
        draftCount: 0,
      });
    }
    
    return result;
  }

  /**
   * Approve a draft lesson
   */
  async approve(
    lessonNumber: number,
    focusWords: string[] | undefined,
    reviewedBy: string
  ): Promise<CachedLesson | null> {
    return this.update(lessonNumber, focusWords, {
      status: 'approved',
      reviewedBy,
    });
  }

  /**
   * Reject a lesson
   */
  async reject(
    lessonNumber: number,
    focusWords: string[] | undefined,
    reviewedBy: string
  ): Promise<CachedLesson | null> {
    return this.update(lessonNumber, focusWords, {
      status: 'rejected',
      reviewedBy,
    });
  }
}

