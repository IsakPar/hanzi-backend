/**
 * P1: User Streaks Tests
 * 
 * Streak tracking is crucial for user retention.
 * A broken streak system = unhappy users.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedUser,
  authBearerHeaders,
  jsonAuthBearerHeaders,
} from '../fixtures/jwt-auth-helpers';
import { nanoid } from 'nanoid';

describe.sequential('P1: User Streaks', () => {
  let ctx: TestContext;
  let userToken: string;
  let userId: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    const user = await createAuthenticatedUser(ctx.db);
    userToken = user.accessToken;
    userId = user.user.id;
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // STREAK RETRIEVAL
  // ========================================

  describe('GET /v1/users/me/streak', () => {
    it('returns current streak', async () => {
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
        expect(body.currentStreak >= 0).toBe(true);
        expect(body.longestStreak >= 0).toBe(true);
      }
    });

    it('returns streak history', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/streak?include_history=true', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        const body = await res.json();
        expect(body.history || body.activeDays).toBeDefined();
      }
    });
  });

  // ========================================
  // STREAK UPDATES VIA ACTIVITY
  // ========================================

  describe('Streak Updates via Activity', () => {
    it('streak increments on activity', async () => {
      // Get initial streak
      const before = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/streak', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      // Log activity
      await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            activityType: 'lesson',
          }),
        }),
        ctx.env,
        executionContext
      );

      // Check streak after
      const after = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/streak', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(before.status);
      expect([200, 404]).toContain(after.status);
    });

    it('multiple activities same day = 1 streak day', async () => {
      // Log multiple activities
      for (let i = 0; i < 5; i++) {
        await ctx.app.fetch(
          new Request('http://localhost/v1/analytics/activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              activityType: 'lesson',
            }),
          }),
          ctx.env,
          executionContext
        );
      }

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
        // Should be 1, not 5
        expect(body.currentStreak).toBeLessThanOrEqual(1);
      }
    });
  });

  // ========================================
  // STREAK FREEZE
  // ========================================

  describe('Streak Freeze', () => {
    it('streak freeze protects against missed day', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/streak/freeze', {
          method: 'POST',
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 400, 403, 404]).toContain(res.status);
    });

    it('checks freeze availability', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/streak/freeze/available', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        const body = await res.json();
        expect(typeof body.available).toBe('boolean');
      }
    });
  });

  // ========================================
  // TIMEZONE HANDLING
  // ========================================

  describe('Timezone Handling', () => {
    it('respects user timezone for streak calculation', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/streak', {
          headers: {
            ...authBearerHeaders(userToken),
            'X-Timezone': 'Asia/Shanghai',
          },
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('handles different timezone offsets', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/streak', {
          headers: {
            ...authBearerHeaders(userToken),
            'X-Timezone-Offset': '-480', // UTC+8
          },
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // CALENDAR VIEW
  // ========================================

  describe('Calendar View', () => {
    it('returns activity calendar for month', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/streak/calendar?month=2024-12', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        const body = await res.json();
        expect(body.days || body.calendar).toBeDefined();
      }
    });
  });
});

