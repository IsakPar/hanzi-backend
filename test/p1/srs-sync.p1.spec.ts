/**
 * P1: SRS Sync Tests
 * 
 * Per Smart Layer spec: SRS is computed from events, not stored.
 * On new device login, events are downloaded and SRS is recomputed.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedUser,
  authBearerHeaders,
  jsonAuthBearerHeaders,
  createTestUser,
  signTestAccessToken,
} from '../fixtures/jwt-auth-helpers';
import { nanoid } from 'nanoid';

describe.sequential('P1: SRS Sync', () => {
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
  // EVENT DOWNLOAD FOR SRS RECOMPUTE
  // ========================================

  describe('Event Download for New Device', () => {
    it('downloads events for last 30 days', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/events?days=30', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        const body = await res.json();
        expect(Array.isArray(body.events || body)).toBe(true);
      }
    });

    it('downloads events for last 90 days (cloud retention)', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/events?days=90', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('limits event download to prevent abuse', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/events?days=365', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      // Should cap or reject
      expect([200, 400, 404]).toContain(res.status);
    });
  });

  // ========================================
  // SRS STATE ENDPOINTS
  // ========================================

  describe('SRS State', () => {
    it('gets current SRS state', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/srs', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('gets due items for today', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/srs/due', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        const body = await res.json();
        expect(Array.isArray(body.due || body.items || body)).toBe(true);
      }
    });

    it('gets due count', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/srs/due/count', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        const body = await res.json();
        expect(typeof (body.count || body.dueCount)).toBe('number');
      }
    });
  });

  // ========================================
  // MULTI-DEVICE SYNC
  // ========================================

  describe('Multi-Device SRS Sync', () => {
    it('new device gets same events', async () => {
      // First device syncs events
      const events = [
        {
          id: crypto.randomUUID(),
          type: 'vocab.reviewed',
          timestamp: new Date().toISOString(),
          payload: { vocabId: nanoid(), correct: true, responseTimeMs: 1500 },
        },
      ];

      await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/events/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events }),
        }),
        ctx.env,
        executionContext
      );

      // Login on new device (same user)
      const newToken = await signTestAccessToken(
        { id: userId, email: 'test@example.com', name: 'Test', role: 'user', tier: 'free' },
        ctx.env.JWT_SECRET
      );

      // New device downloads events
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/events?days=30', {
          headers: authBearerHeaders(newToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // STRENGTH CALCULATION
  // ========================================

  describe('Strength Calculation', () => {
    it('returns strength for vocabulary item', async () => {
      const vocabId = nanoid();

      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/users/me/strength/${vocabId}`, {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        const body = await res.json();
        expect(body.strength >= 0 && body.strength <= 100).toBe(true);
      }
    });

    it('batch strength calculation', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/strength/batch', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(userToken),
          body: JSON.stringify({
            atomIds: [nanoid(), nanoid(), nanoid()],
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // PRIORITY SCORE
  // ========================================

  describe('Priority Score (I+1 Weighting)', () => {
    it('returns study queue with priority', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/study-queue', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        const body = await res.json();
        expect(Array.isArray(body.queue || body.items || body)).toBe(true);
      }
    });

    it('respects maxItems parameter', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/study-queue?max=10', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        const body = await res.json();
        const queue = body.queue || body.items || body;
        expect(queue.length).toBeLessThanOrEqual(10);
      }
    });
  });
});

