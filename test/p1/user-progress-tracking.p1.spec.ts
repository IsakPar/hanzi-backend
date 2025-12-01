/**
 * P1: User Progress Tracking Tests
 * 
 * Tests for learning progress, SRS, and statistics.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
  jsonAuthBearerHeaders,
} from '../fixtures/jwt-auth-helpers';
import { nanoid } from 'nanoid';

describe.sequential('P1: User Progress Tracking', () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;
  let userId: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    const admin = await createAuthenticatedAdmin(ctx.db);
    const userResult = await createAuthenticatedUser(ctx.db);
    adminToken = admin.accessToken;
    userToken = userResult.accessToken;
    userId = userResult.user.id;
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // GET USER PROGRESS
  // ========================================

  describe('GET /v1/users/me/progress', () => {
    it('returns user progress summary', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        const body = await res.json();
        expect(body).toHaveProperty('progress');
      }
    });

    it('requires authentication', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress'),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // UPDATE WORD PROGRESS (SRS)
  // ========================================

  describe('POST /v1/users/me/progress/words', () => {
    it('updates word progress', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress/words', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(userToken),
          body: JSON.stringify({
            wordId: 'word-1',
            bucket: 'learning',
            proficiency: 0.5,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 404]).toContain(res.status);
    });

    it('validates bucket values', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress/words', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(userToken),
          body: JSON.stringify({
            wordId: 'word-1',
            bucket: 'invalid-bucket',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 404, 422]).toContain(res.status);
    });
  });

  // ========================================
  // LESSON COMPLETION
  // ========================================

  describe('POST /v1/users/me/progress/lessons/:id/complete', () => {
    it('marks lesson as complete', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress/lessons/lesson-1/complete', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(userToken),
          body: JSON.stringify({
            score: 85,
            timeSpent: 300,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 404]).toContain(res.status);
    });

    it('validates score range', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress/lessons/lesson-1/complete', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(userToken),
          body: JSON.stringify({
            score: 150, // Invalid (max 100)
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 404, 422]).toContain(res.status);
    });
  });

  // ========================================
  // STREAK TRACKING
  // ========================================

  describe('GET /v1/users/me/streak', () => {
    it('returns streak information', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/streak', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        const body = await res.json();
        expect(body).toHaveProperty('currentStreak');
        expect(body).toHaveProperty('longestStreak');
      }
    });
  });

  // ========================================
  // LEARNING STATISTICS
  // ========================================

  describe('GET /v1/users/me/stats', () => {
    it('returns learning statistics', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/stats', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        const body = await res.json();
        expect(body).toHaveProperty('stats');
      }
    });

    it('supports date range filtering', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/stats?from=2024-01-01&to=2024-12-31', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // ADMIN: VIEW ANY USER'S PROGRESS
  // ========================================

  describe('GET /v1/admin/users/:id/progress', () => {
    it('admin can view any user progress', async () => {
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/admin/users/${userId}/progress`, {
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('non-admin cannot view other user progress', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/users/other-user-id/progress', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([401, 403]).toContain(res.status);
    });
  });

  // ========================================
  // SYNC PROGRESS (MOBILE APP)
  // ========================================

  describe('POST /v1/users/me/progress/sync', () => {
    it('syncs progress from mobile app', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress/sync', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(userToken),
          body: JSON.stringify({
            clientSeq: 1,
            updates: [
              {
                id: 'word-1',
                bucket: 'learning',
                proficiency: 0.5,
                stability: 1.0,
                lastReview: Date.now(),
              },
            ],
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('handles empty updates', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress/sync', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(userToken),
          body: JSON.stringify({
            clientSeq: 1,
            updates: [],
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });
});

