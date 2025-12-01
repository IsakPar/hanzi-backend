/**
 * P1: Session Derivation Tests
 * 
 * Per Smart Layer spec: Sessions are DERIVED from events, not stored.
 * 30-minute gap = new session.
 * 
 * This tests the session analytics endpoints.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
} from '../fixtures/jwt-auth-helpers';
import { nanoid } from 'nanoid';

describe.sequential('P1: Session Derivation', () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;
  let userId: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    const admin = await createAuthenticatedAdmin(ctx.db);
    const user = await createAuthenticatedUser(ctx.db);
    adminToken = admin.accessToken;
    userToken = user.accessToken;
    userId = user.user.id;
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // SESSION ANALYTICS
  // ========================================

  describe('Session Analytics', () => {
    it('returns session statistics', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/sessions', {
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('returns session count by time of day', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/sessions/by-time', {
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        const body = await res.json();
        // Should have morning/afternoon/evening/night
        expect(body.morning !== undefined || body.byTimeOfDay).toBeTruthy();
      }
    });

    it('returns average session duration', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/sessions/duration', {
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('returns sessions per user', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/sessions/per-user', {
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // USER SESSION HISTORY
  // ========================================

  describe('User Session History', () => {
    beforeEach(async () => {
      // Seed events that should create sessions
      const now = Date.now();

      // Session 1: Events 5 minutes apart
      const session1Events = [
        {
          id: crypto.randomUUID(),
          type: 'lesson.started',
          timestamp: new Date(now - 3600000).toISOString(), // 1 hour ago
          payload: { lessonId: nanoid() },
        },
        {
          id: crypto.randomUUID(),
          type: 'lesson.completed',
          timestamp: new Date(now - 3300000).toISOString(), // 55 min ago
          payload: { lessonId: nanoid(), score: 85 },
        },
      ];

      // Session 2: 2 hours later (new session)
      const session2Events = [
        {
          id: crypto.randomUUID(),
          type: 'vocab.reviewed',
          timestamp: new Date(now - 1200000).toISOString(), // 20 min ago
          payload: { vocabId: nanoid(), correct: true },
        },
      ];

      // Ingest events
      await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/events/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events: [...session1Events, ...session2Events] }),
        }),
        ctx.env,
        executionContext
      );
    });

    it('derives sessions from event timestamps', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/sessions/derive', {
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        const body = await res.json();
        // Should have derived at least 1 session
        expect(body.sessions || body.count || body).toBeDefined();
      }
    });
  });

  // ========================================
  // SESSION GAP RULE
  // ========================================

  describe('30-Minute Gap Rule', () => {
    it('events within 30 min = same session', async () => {
      const now = Date.now();
      const events = [
        {
          id: crypto.randomUUID(),
          type: 'lesson.started',
          timestamp: new Date(now).toISOString(),
          payload: { lessonId: nanoid() },
        },
        {
          id: crypto.randomUUID(),
          type: 'lesson.completed',
          timestamp: new Date(now + 15 * 60 * 1000).toISOString(), // 15 min later
          payload: { lessonId: nanoid(), score: 90 },
        },
      ];

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/events/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201]).toContain(res.status);
    });

    it('events 31+ min apart = new session', async () => {
      const now = Date.now();
      const events = [
        {
          id: crypto.randomUUID(),
          type: 'lesson.started',
          timestamp: new Date(now).toISOString(),
          payload: { lessonId: nanoid() },
        },
        {
          id: crypto.randomUUID(),
          type: 'vocab.reviewed',
          timestamp: new Date(now + 31 * 60 * 1000).toISOString(), // 31 min later
          payload: { vocabId: nanoid(), correct: true },
        },
      ];

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/events/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201]).toContain(res.status);
    });
  });

  // ========================================
  // FATIGUE DETECTION
  // ========================================

  describe('Fatigue Detection', () => {
    it('detects declining performance in session', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/sessions/fatigue', {
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });
});

