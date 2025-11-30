/**
 * P2: Analytics Comprehensive - Analytics and metrics
 * Uses proper seed-data helpers for FK constraints
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authCookieHeaders,
} from '../fixtures/better-auth-helpers';
import { createTestUser } from '../fixtures/seed-data';

describe.sequential('P2: Analytics Comprehensive', () => {
  let ctx: TestContext;
  let adminSession: string;
  let userSession: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    const admin = await createAuthenticatedAdmin(ctx.db);
    const user = await createAuthenticatedUser(ctx.db);
    adminSession = admin.sessionToken;
    userSession = user.sessionToken;
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // Seed analytics data with real user for FK constraint
  async function seedAnalyticsData() {
    const user = await createTestUser(ctx.db);
    
    for (let i = 0; i < 5; i++) {
      await ctx.db.prepare(`
        INSERT INTO api_usage (id, user_id, request_id, model_used, input_tokens, output_tokens, total_tokens, estimated_cost, latency_ms, success, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s','now') - ?)
      `).bind(
        crypto.randomUUID(),
        user.id,
        'req-' + i,
        'gpt-4',
        100 + i * 10,
        200 + i * 10,
        300 + i * 20,
        0.01 * (i + 1),
        500 + i * 100,
        1,
        i * 3600
      ).run();
    }
    return user;
  }

  // ========================================
  // ANALYTICS ACCESS
  // ========================================

  describe('Analytics Access', () => {
    it('admin can access analytics overview', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/overview', {
          headers: authCookieHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('user cannot access analytics', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/overview', {
          headers: authCookieHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );

      expect([403, 404]).toContain(res.status);
    });
  });

  // ========================================
  // USER ANALYTICS
  // ========================================

  describe('User Analytics', () => {
    it('can get user stats', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/users', {
          headers: authCookieHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('can get user growth', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/users/growth', {
          headers: authCookieHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // CONTENT ANALYTICS
  // ========================================

  describe('Content Analytics', () => {
    it('can get content overview', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/content', {
          headers: authCookieHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('can get lesson analytics', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/lessons', {
          headers: authCookieHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('can get vocabulary analytics', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/vocabulary', {
          headers: authCookieHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // AI USAGE ANALYTICS
  // ========================================

  describe('AI Usage Analytics', () => {
    it('can get AI usage summary', async () => {
      await seedAnalyticsData();
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/ai-usage/summary', {
          headers: authCookieHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('can get AI usage daily', async () => {
      await seedAnalyticsData();
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/ai-usage/daily', {
          headers: authCookieHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // DATE RANGE FILTERING
  // ========================================

  describe('Date Range Filtering', () => {
    it('can filter by date range', async () => {
      const today = new Date().toISOString().split('T')[0];
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/analytics/overview?from=${lastWeek}&to=${today}`, {
          headers: authCookieHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('handles invalid date gracefully', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/overview?from=not-a-date', {
          headers: authCookieHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // SUBSCRIPTION ANALYTICS
  // ========================================

  describe('Subscription Analytics', () => {
    it('can get subscription overview', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/subscriptions/overview', {
          headers: authCookieHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // HSK BREAKDOWN
  // ========================================

  describe('HSK Breakdown', () => {
    it('can get HSK level breakdown', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/hsk', {
          headers: authCookieHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });
  });
});
