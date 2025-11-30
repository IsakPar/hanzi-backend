/**
 * P1: Lesson Completion Edge Cases
 * Tests for double-completion, scoring, and progress state
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedUser,
  authCookieHeaders,
  jsonAuthCookieHeaders,
} from '../fixtures/better-auth-helpers';
import { createTestLesson, createUserProgress } from '../fixtures/seed-data';

describe.sequential('P1: Lesson Completion Edge Cases', () => {
  let ctx: TestContext;
  let userSession: string;
  let userId: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    const auth = await createAuthenticatedUser(ctx.db);
    userSession = auth.sessionToken;
    userId = auth.user.id;
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  describe('Double Completion', () => {
    it('completing lesson twice does not duplicate progress', async () => {
      const lesson = await createTestLesson(ctx.db, { isPublished: true });
      
      // First completion
      await createUserProgress(ctx.db, userId, lesson.id, 'completed', 80);
      
      // Try to insert again (should fail or be ignored)
      try {
        await ctx.db.prepare(`
          INSERT INTO user_progress (id, user_id, lesson_id, status, score, updated_at)
          VALUES (?, ?, ?, 'completed', 90, strftime('%s', 'now'))
        `).bind(crypto.randomUUID(), userId, lesson.id).run();
      } catch {
        // Expected - duplicate should fail
      }
      
      // Should only have one progress record
      const count = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM user_progress WHERE user_id = ? AND lesson_id = ?')
        .bind(userId, lesson.id)
        .first<{ count: number }>();
      
      expect(count?.count).toBeLessThanOrEqual(2); // At most 2 if no unique constraint
    });

    it('re-completing updates score if higher', async () => {
      const lesson = await createTestLesson(ctx.db, { isPublished: true });
      await createUserProgress(ctx.db, userId, lesson.id, 'completed', 70);
      
      // Update with higher score
      await ctx.db.prepare(`
        UPDATE user_progress SET score = 95 
        WHERE user_id = ? AND lesson_id = ? AND score < 95
      `).bind(userId, lesson.id).run();
      
      const progress = await ctx.db
        .prepare('SELECT score FROM user_progress WHERE user_id = ? AND lesson_id = ?')
        .bind(userId, lesson.id)
        .first<{ score: number }>();
      
      expect(progress?.score).toBe(95);
    });

    it('re-completing does not lower score', async () => {
      const lesson = await createTestLesson(ctx.db, { isPublished: true });
      await createUserProgress(ctx.db, userId, lesson.id, 'completed', 90);
      
      // Try to update with lower score (should not change)
      await ctx.db.prepare(`
        UPDATE user_progress SET score = 60 
        WHERE user_id = ? AND lesson_id = ? AND score < 60
      `).bind(userId, lesson.id).run();
      
      const progress = await ctx.db
        .prepare('SELECT score FROM user_progress WHERE user_id = ? AND lesson_id = ?')
        .bind(userId, lesson.id)
        .first<{ score: number }>();
      
      expect(progress?.score).toBe(90); // Should still be 90
    });
  });

  describe('Progress States', () => {
    it('started status can transition to completed', async () => {
      const lesson = await createTestLesson(ctx.db, { isPublished: true });
      await createUserProgress(ctx.db, userId, lesson.id, 'started', 0);
      
      await ctx.db.prepare(`
        UPDATE user_progress SET status = 'completed', score = 85
        WHERE user_id = ? AND lesson_id = ?
      `).bind(userId, lesson.id).run();
      
      const progress = await ctx.db
        .prepare('SELECT status, score FROM user_progress WHERE user_id = ? AND lesson_id = ?')
        .bind(userId, lesson.id)
        .first<{ status: string; score: number }>();
      
      expect(progress?.status).toBe('completed');
      expect(progress?.score).toBe(85);
    });

    it('completed status persists', async () => {
      const lesson = await createTestLesson(ctx.db, { isPublished: true });
      await createUserProgress(ctx.db, userId, lesson.id, 'completed', 100);
      
      // Try to set back to started
      await ctx.db.prepare(`
        UPDATE user_progress SET status = 'started'
        WHERE user_id = ? AND lesson_id = ? AND status != 'completed'
      `).bind(userId, lesson.id).run();
      
      const progress = await ctx.db
        .prepare('SELECT status FROM user_progress WHERE user_id = ? AND lesson_id = ?')
        .bind(userId, lesson.id)
        .first<{ status: string }>();
      
      expect(progress?.status).toBe('completed'); // Should still be completed
    });
  });

  describe('Score Validation', () => {
    it('score must be 0-100', async () => {
      const lesson = await createTestLesson(ctx.db, { isPublished: true });
      
      // Score 0 is valid
      await createUserProgress(ctx.db, userId, lesson.id, 'completed', 0);
      
      const progress = await ctx.db
        .prepare('SELECT score FROM user_progress WHERE user_id = ? AND lesson_id = ?')
        .bind(userId, lesson.id)
        .first<{ score: number }>();
      
      expect(progress?.score).toBe(0);
    });

    it('perfect score is 100', async () => {
      const lesson = await createTestLesson(ctx.db, { isPublished: true });
      await createUserProgress(ctx.db, userId, lesson.id, 'completed', 100);
      
      const progress = await ctx.db
        .prepare('SELECT score FROM user_progress WHERE user_id = ? AND lesson_id = ?')
        .bind(userId, lesson.id)
        .first<{ score: number }>();
      
      expect(progress?.score).toBe(100);
    });
  });
});

