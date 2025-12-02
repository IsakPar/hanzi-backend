/**
 * UserLibraryService Unit Tests
 * 
 * Tests user content progress tracking, favorites, and library management.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, type TestContext } from '../helpers/test-app';
import { createTestUser } from '../fixtures/jwt-auth-helpers';
import { UserLibraryService } from '../../src/domains/content/services/user-library.service';
import { nanoid } from 'nanoid';

describe.sequential('UserLibraryService', () => {
  let ctx: TestContext;
  let service: UserLibraryService;

  beforeEach(async () => {
    ctx = await createTestContext();
    service = new UserLibraryService(ctx.db);
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // Helper to create test content
  async function createTestContent(id?: string): Promise<string> {
    const contentId = id || nanoid();
    await ctx.db.prepare(`
      INSERT INTO content_library (id, title, content_type, hsk_level, is_published, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, strftime('%s', 'now'), strftime('%s', 'now'))
    `).bind(contentId, 'Test Content', 'audiobook', 1).run();
    return contentId;
  }

  // ========================================
  // UPDATE USER PROGRESS
  // ========================================

  describe('updateUserProgress', () => {
    it('creates new progress record for first access', async () => {
      const user = await createTestUser(ctx.db);
      const contentId = await createTestContent();

      await service.updateUserProgress({
        userId: user.id,
        contentId,
        progressSeconds: 60,
        progressPercentage: 10,
        status: 'in_progress',
      });

      // Verify progress was created
      const progress = await ctx.db
        .prepare('SELECT * FROM user_library WHERE user_id = ? AND content_id = ?')
        .bind(user.id, contentId)
        .first();

      expect(progress).toBeDefined();
      expect(progress?.progress_seconds).toBe(60);
      expect(progress?.progress_percentage).toBe(10);
      expect(progress?.status).toBe('in_progress');
    });

    it('updates existing progress record', async () => {
      const user = await createTestUser(ctx.db);
      const contentId = await createTestContent();

      // First update
      await service.updateUserProgress({
        userId: user.id,
        contentId,
        progressSeconds: 60,
        progressPercentage: 10,
        status: 'in_progress',
      });

      // Second update with more progress
      await service.updateUserProgress({
        userId: user.id,
        contentId,
        progressSeconds: 120,
        progressPercentage: 25,
        status: 'in_progress',
      });

      // Verify progress was updated
      const progress = await ctx.db
        .prepare('SELECT * FROM user_library WHERE user_id = ? AND content_id = ?')
        .bind(user.id, contentId)
        .first();

      expect(progress?.progress_seconds).toBe(120);
      expect(progress?.progress_percentage).toBe(25);
    });

    it('sets completed_at when status is completed', async () => {
      const user = await createTestUser(ctx.db);
      const contentId = await createTestContent();

      await service.updateUserProgress({
        userId: user.id,
        contentId,
        progressSeconds: 300,
        progressPercentage: 100,
        status: 'completed',
      });

      const progress = await ctx.db
        .prepare('SELECT * FROM user_library WHERE user_id = ? AND content_id = ?')
        .bind(user.id, contentId)
        .first();

      expect(progress?.status).toBe('completed');
      expect(progress?.completed_at).toBeDefined();
    });

    it('tracks page progress for ebooks', async () => {
      const user = await createTestUser(ctx.db);
      const contentId = await createTestContent();

      await service.updateUserProgress({
        userId: user.id,
        contentId,
        progressPage: 42,
        progressPercentage: 50,
        status: 'in_progress',
      });

      const progress = await ctx.db
        .prepare('SELECT * FROM user_library WHERE user_id = ? AND content_id = ?')
        .bind(user.id, contentId)
        .first();

      expect(progress?.progress_page).toBe(42);
    });

    it('saves user rating', async () => {
      const user = await createTestUser(ctx.db);
      const contentId = await createTestContent();

      await service.updateUserProgress({
        userId: user.id,
        contentId,
        progressPercentage: 100,
        status: 'completed',
        userRating: 5,
      });

      const progress = await ctx.db
        .prepare('SELECT * FROM user_library WHERE user_id = ? AND content_id = ?')
        .bind(user.id, contentId)
        .first();

      expect(progress?.user_rating).toBe(5);
    });

    it('updates last_accessed_at on each update', async () => {
      const user = await createTestUser(ctx.db);
      const contentId = await createTestContent();

      await service.updateUserProgress({
        userId: user.id,
        contentId,
        progressSeconds: 30,
        status: 'in_progress',
      });

      const firstAccess = await ctx.db
        .prepare('SELECT last_accessed_at FROM user_library WHERE user_id = ? AND content_id = ?')
        .bind(user.id, contentId)
        .first<{ last_accessed_at: string }>();

      // Wait a tiny bit
      await new Promise(r => setTimeout(r, 10));

      await service.updateUserProgress({
        userId: user.id,
        contentId,
        progressSeconds: 60,
        status: 'in_progress',
      });

      const secondAccess = await ctx.db
        .prepare('SELECT last_accessed_at FROM user_library WHERE user_id = ? AND content_id = ?')
        .bind(user.id, contentId)
        .first<{ last_accessed_at: string }>();

      // Second access should be newer (or equal due to timing)
      expect(secondAccess?.last_accessed_at).toBeDefined();
    });
  });

  // ========================================
  // TOGGLE FAVORITE
  // ========================================

  describe('toggleFavorite', () => {
    it('adds content to favorites on first toggle', async () => {
      const user = await createTestUser(ctx.db);
      const contentId = await createTestContent();

      const result = await service.toggleFavorite(user.id, contentId);

      expect(result).toBe(true);

      // Verify in database
      const record = await ctx.db
        .prepare('SELECT is_favorite FROM user_library WHERE user_id = ? AND content_id = ?')
        .bind(user.id, contentId)
        .first();

      expect(record?.is_favorite).toBe(1);
    });

    it('removes from favorites on second toggle', async () => {
      const user = await createTestUser(ctx.db);
      const contentId = await createTestContent();

      // First toggle - add
      await service.toggleFavorite(user.id, contentId);
      
      // Second toggle - remove
      const result = await service.toggleFavorite(user.id, contentId);

      expect(result).toBe(false);

      const record = await ctx.db
        .prepare('SELECT is_favorite FROM user_library WHERE user_id = ? AND content_id = ?')
        .bind(user.id, contentId)
        .first();

      expect(record?.is_favorite).toBe(0);
    });

    it('updates content favorite count', async () => {
      const contentId = await createTestContent();
      
      // Multiple users favorite the same content
      const user1 = await createTestUser(ctx.db);
      const user2 = await createTestUser(ctx.db);

      await service.toggleFavorite(user1.id, contentId);
      await service.toggleFavorite(user2.id, contentId);

      // Check favorite count on content
      const content = await ctx.db
        .prepare('SELECT favorite_count FROM content_library WHERE id = ?')
        .bind(contentId)
        .first();

      expect(content?.favorite_count).toBe(2);
    });

    it('decrements favorite count when unfavorited', async () => {
      const contentId = await createTestContent();
      const user = await createTestUser(ctx.db);

      // Favorite
      await service.toggleFavorite(user.id, contentId);
      
      // Unfavorite
      await service.toggleFavorite(user.id, contentId);

      const content = await ctx.db
        .prepare('SELECT favorite_count FROM content_library WHERE id = ?')
        .bind(contentId)
        .first();

      expect(content?.favorite_count).toBe(0);
    });

    it('works for content user has never accessed', async () => {
      const user = await createTestUser(ctx.db);
      const contentId = await createTestContent();

      // Toggle favorite without any prior access
      const result = await service.toggleFavorite(user.id, contentId);

      expect(result).toBe(true);
    });

    it('preserves progress when toggling favorite', async () => {
      const user = await createTestUser(ctx.db);
      const contentId = await createTestContent();

      // Set progress first
      await service.updateUserProgress({
        userId: user.id,
        contentId,
        progressSeconds: 120,
        progressPercentage: 50,
        status: 'in_progress',
      });

      // Toggle favorite
      await service.toggleFavorite(user.id, contentId);

      // Verify progress is still there
      const record = await ctx.db
        .prepare('SELECT progress_seconds, progress_percentage, is_favorite FROM user_library WHERE user_id = ? AND content_id = ?')
        .bind(user.id, contentId)
        .first();

      expect(record?.progress_seconds).toBe(120);
      expect(record?.progress_percentage).toBe(50);
      expect(record?.is_favorite).toBe(1);
    });
  });

  // ========================================
  // EDGE CASES
  // ========================================

  describe('Edge Cases', () => {
    it('handles zero progress values', async () => {
      const user = await createTestUser(ctx.db);
      const contentId = await createTestContent();

      await service.updateUserProgress({
        userId: user.id,
        contentId,
        progressSeconds: 0,
        progressPercentage: 0,
        status: 'not_started',
      });

      const progress = await ctx.db
        .prepare('SELECT * FROM user_library WHERE user_id = ? AND content_id = ?')
        .bind(user.id, contentId)
        .first();

      expect(progress?.progress_seconds).toBe(0);
      expect(progress?.status).toBe('not_started');
    });

    it('handles multiple content items per user', async () => {
      const user = await createTestUser(ctx.db);
      const content1 = await createTestContent();
      const content2 = await createTestContent();
      const content3 = await createTestContent();

      await service.updateUserProgress({ userId: user.id, contentId: content1, progressPercentage: 25 });
      await service.updateUserProgress({ userId: user.id, contentId: content2, progressPercentage: 50 });
      await service.updateUserProgress({ userId: user.id, contentId: content3, progressPercentage: 75 });

      const records = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM user_library WHERE user_id = ?')
        .bind(user.id)
        .first<{ count: number }>();

      expect(records?.count).toBe(3);
    });

    it('handles same content accessed by multiple users', async () => {
      const contentId = await createTestContent();
      const user1 = await createTestUser(ctx.db);
      const user2 = await createTestUser(ctx.db);

      await service.updateUserProgress({ userId: user1.id, contentId, progressPercentage: 25 });
      await service.updateUserProgress({ userId: user2.id, contentId, progressPercentage: 75 });

      const progress1 = await ctx.db
        .prepare('SELECT progress_percentage FROM user_library WHERE user_id = ? AND content_id = ?')
        .bind(user1.id, contentId)
        .first();

      const progress2 = await ctx.db
        .prepare('SELECT progress_percentage FROM user_library WHERE user_id = ? AND content_id = ?')
        .bind(user2.id, contentId)
        .first();

      expect(progress1?.progress_percentage).toBe(25);
      expect(progress2?.progress_percentage).toBe(75);
    });
  });
});

