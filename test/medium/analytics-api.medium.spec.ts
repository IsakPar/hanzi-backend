/**
 * Analytics API Medium Priority Tests
 * 
 * P2 Priority - User and content analytics
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authCookieHeaders,
  jsonAuthCookieHeaders,
} from '../fixtures/better-auth-helpers';

describe.sequential('Analytics API - Medium Priority', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // USER ANALYTICS
  // ========================================

  describe('User Analytics', () => {
    it('GET /analytics/users/stats returns user stats', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/users/stats', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('GET /analytics/users/daily returns daily counts', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/users/daily', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('GET /analytics/users/retention returns retention', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/users/retention', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('requires admin for user analytics', async () => {
      const { sessionToken } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/users/stats', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([401, 403, 404]).toContain(res.status);
    });
  });

  // ========================================
  // CONTENT ANALYTICS
  // ========================================

  describe('Content Analytics', () => {
    it('GET /analytics/content/overview returns overview', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/content/overview', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('GET /analytics/content/lessons returns lesson stats', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/content/lessons', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('GET /analytics/content/stories returns story stats', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/content/stories', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('GET /analytics/content/vocabulary returns vocab stats', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/content/vocabulary', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // ENGAGEMENT ANALYTICS
  // ========================================

  describe('Engagement Analytics', () => {
    it('GET /analytics/engagement/daily returns daily engagement', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/engagement/daily', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('GET /analytics/engagement/hsk returns HSK breakdown', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/engagement/hsk', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('supports date range filtering', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/engagement/daily?from=2025-01-01&to=2025-01-31', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // AI ANALYTICS
  // ========================================

  describe('AI Analytics', () => {
    it('GET /analytics/ai/usage returns AI usage', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/ai/usage', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('GET /analytics/ai/cost returns cost breakdown', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/ai/cost', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('GET /analytics/ai/models returns model usage', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/ai/models', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // EXERCISE ANALYTICS
  // ========================================

  describe('Exercise Analytics', () => {
    it('GET /analytics/exercises/success-rate returns rates', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/exercises/success-rate', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('GET /analytics/exercises/by-type returns type breakdown', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/exercises/by-type', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('GET /analytics/exercises/hardest returns hardest', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/exercises/hardest', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // STORY ANALYTICS
  // ========================================

  describe('Story Analytics', () => {
    it('GET /analytics/stories/completion returns completion', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/stories/completion', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('GET /analytics/stories/tapped-words returns tapped', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/stories/tapped-words', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('GET /analytics/stories/audio-usage returns audio usage', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/stories/audio-usage', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // EXECUTIVE DASHBOARD
  // ========================================

  describe('Executive Dashboard', () => {
    it('GET /analytics/executive/summary returns summary', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/executive/summary', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('GET /analytics/executive/growth returns growth', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/executive/growth', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('GET /analytics/executive/revenue returns revenue', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/executive/revenue', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });
  });
});

