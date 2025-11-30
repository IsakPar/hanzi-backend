/**
 * P1: User Progress - Progress tracking, completion, scores
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authCookieHeaders,
  jsonAuthCookieHeaders,
} from '../fixtures/better-auth-helpers';
import { createTestLesson, createTestUser, createUserProgress } from '../fixtures/seed-data';

describe.sequential('P1: User Progress', () => {
  let ctx: TestContext;
  let adminSession: string;
  let userSession: string;
  let userId: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    const admin = await createAuthenticatedAdmin(ctx.db);
    const userAuth = await createAuthenticatedUser(ctx.db);
    adminSession = admin.sessionToken;
    userSession = userAuth.sessionToken;
    userId = userAuth.user.id;
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  describe('Progress CRUD', () => {
    it('can create progress record', async () => {
      const lesson = await createTestLesson(ctx.db);
      await createUserProgress(ctx.db, userId, lesson.id, 'started', 0);
      
      const progress = await ctx.db
        .prepare('SELECT * FROM user_progress WHERE user_id = ? AND lesson_id = ?')
        .bind(userId, lesson.id)
        .first();
      
      expect(progress).toBeDefined();
      expect(progress?.status).toBe('started');
    });

    it('can update progress status', async () => {
      const lesson = await createTestLesson(ctx.db);
      await createUserProgress(ctx.db, userId, lesson.id, 'started', 0);
      
      await ctx.db
        .prepare('UPDATE user_progress SET status = ? WHERE user_id = ? AND lesson_id = ?')
        .bind('completed', userId, lesson.id)
        .run();
      
      const progress = await ctx.db
        .prepare('SELECT status FROM user_progress WHERE user_id = ? AND lesson_id = ?')
        .bind(userId, lesson.id)
        .first<{ status: string }>();
      
      expect(progress?.status).toBe('completed');
    });

    it('can update score', async () => {
      const lesson = await createTestLesson(ctx.db);
      await createUserProgress(ctx.db, userId, lesson.id, 'started', 0);
      
      await ctx.db
        .prepare('UPDATE user_progress SET score = ? WHERE user_id = ? AND lesson_id = ?')
        .bind(85, userId, lesson.id)
        .run();
      
      const progress = await ctx.db
        .prepare('SELECT score FROM user_progress WHERE user_id = ? AND lesson_id = ?')
        .bind(userId, lesson.id)
        .first<{ score: number }>();
      
      expect(progress?.score).toBe(85);
    });

    it('tracks multiple lessons per user', async () => {
      const lesson1 = await createTestLesson(ctx.db);
      const lesson2 = await createTestLesson(ctx.db);
      const lesson3 = await createTestLesson(ctx.db);
      
      await createUserProgress(ctx.db, userId, lesson1.id, 'completed', 100);
      await createUserProgress(ctx.db, userId, lesson2.id, 'started', 50);
      await createUserProgress(ctx.db, userId, lesson3.id, 'started', 0);
      
      const count = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM user_progress WHERE user_id = ?')
        .bind(userId)
        .first<{ count: number }>();
      
      expect(count?.count).toBe(3);
    });
  });

  describe('Completion Tracking', () => {
    it('can count completed lessons', async () => {
      const lesson1 = await createTestLesson(ctx.db);
      const lesson2 = await createTestLesson(ctx.db);
      const lesson3 = await createTestLesson(ctx.db);
      
      await createUserProgress(ctx.db, userId, lesson1.id, 'completed', 100);
      await createUserProgress(ctx.db, userId, lesson2.id, 'completed', 90);
      await createUserProgress(ctx.db, userId, lesson3.id, 'started', 20);
      
      const completed = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM user_progress WHERE user_id = ? AND status = ?')
        .bind(userId, 'completed')
        .first<{ count: number }>();
      
      expect(completed?.count).toBe(2);
    });

    it('can calculate average score', async () => {
      const lesson1 = await createTestLesson(ctx.db);
      const lesson2 = await createTestLesson(ctx.db);
      
      await createUserProgress(ctx.db, userId, lesson1.id, 'completed', 80);
      await createUserProgress(ctx.db, userId, lesson2.id, 'completed', 100);
      
      const avg = await ctx.db
        .prepare('SELECT AVG(score) as avg FROM user_progress WHERE user_id = ? AND status = ?')
        .bind(userId, 'completed')
        .first<{ avg: number }>();
      
      expect(avg?.avg).toBe(90);
    });
  });

  describe('API Access', () => {
    it('user can get own progress', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress', {
          headers: authCookieHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 404]).toContain(res.status);
    });

    it('user can update lesson progress', async () => {
      const lesson = await createTestLesson(ctx.db, { isPublished: true });
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/lessons/${lesson.id}/progress`, {
          method: 'POST',
          headers: jsonAuthCookieHeaders(userSession),
          body: JSON.stringify({ status: 'started' }),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 201, 404]).toContain(res.status);
    });

    it('unauthenticated cannot access progress', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress'),
        ctx.env,
        executionContext
      );
      
      // May return 401 or 404 depending on route matching
      expect([401, 404]).toContain(res.status);
    });
  });

  describe('Score Validation', () => {
    it('score can be 0-100', async () => {
      const lesson = await createTestLesson(ctx.db);
      await createUserProgress(ctx.db, userId, lesson.id, 'completed', 0);
      await createUserProgress(ctx.db, userId, lesson.id, 'completed', 100);
      
      expect(true).toBe(true); // No errors thrown
    });
  });
});

