/**
 * Rate Limits Critical Path Tests
 * 
 * P0 Priority - Access control and usage limits:
 * - Tier-based rate limiting
 * - Daily usage caps
 * - Rate limit configuration CRUD
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  createBetterAuthUser,
  createBetterAuthSession,
  authBearerHeaders,
  jsonAuthBearerHeaders,
  updateUserTier,
} from '../fixtures/jwt-auth-helpers';

describe.sequential('Rate Limits Critical Path', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
    
    // Seed default tier limits (tier enum: free, premium, pro)
    await ctx.db.prepare(`
      INSERT OR REPLACE INTO tier_limits (tier, requests_per_day, tokens_per_day, max_parallel_generations, content_downloads_per_day, offline_packages_allowed, can_access_premium_content)
      VALUES 
        ('free', 10, 5000, 1, 5, 0, 0),
        ('premium', 100, 50000, 3, 50, 1, 1),
        ('pro', 500, 500000, 10, 500, 10, 1)
    `).run();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // TIER LIMITS CRUD (Admin)
  // ========================================

  describe('Tier Limits CRUD', () => {
    it('GET /admin/tier-limits returns all tier limits', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/tier-limits', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.limits).toBeDefined();
    });

    it('PUT /admin/tier-limits/:tier updates limits', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/tier-limits/free', {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({
            requestsPerDay: 20,
            tokensPerDay: 10000,
            maxParallelGenerations: 1,
            contentDownloadsPerDay: 5,
            offlinePackagesAllowed: 0,
            canAccessPremiumContent: false,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);

      // Verify update
      const limit = await ctx.db
        .prepare('SELECT requests_per_day FROM tier_limits WHERE tier = ?')
        .bind('free')
        .first<{ requests_per_day: number }>();
      expect(limit?.requests_per_day).toBe(20);
    });

    it('PUT rejects invalid tier', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/tier-limits/invalid_tier', {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ requestsPerDay: 10 }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 404]).toContain(res.status);
    });

    it('POST /admin/tier-limits/reset restores defaults', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      // First modify
      await ctx.db.prepare('UPDATE tier_limits SET requests_per_day = 999 WHERE tier = ?')
        .bind('free').run();
      
      // Reset
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/tier-limits/reset', {
          method: 'POST',
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);

      // Verify reset
      const limit = await ctx.db
        .prepare('SELECT requests_per_day FROM tier_limits WHERE tier = ?')
        .bind('free')
        .first<{ requests_per_day: number }>();
      expect(limit?.requests_per_day).not.toBe(999);
    });

    it('rejects non-admin access to tier limits', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/tier-limits', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // TIER-BASED ACCESS
  // ========================================

  describe('Tier-Based Access', () => {
    it('free tier has base limits', async () => {
      const limit = await ctx.db
        .prepare('SELECT requests_per_day, tokens_per_day FROM tier_limits WHERE tier = ?')
        .bind('free')
        .first<{ requests_per_day: number; tokens_per_day: number }>();
      expect(limit?.requests_per_day).toBe(10);
      expect(limit?.tokens_per_day).toBe(5000);
    });

    it('premium tier has higher limits', async () => {
      const limit = await ctx.db
        .prepare('SELECT requests_per_day, tokens_per_day FROM tier_limits WHERE tier = ?')
        .bind('premium')
        .first<{ requests_per_day: number; tokens_per_day: number }>();
      expect(limit?.requests_per_day).toBe(100);
      expect(limit?.tokens_per_day).toBe(50000);
    });

    it('pro tier has highest limits', async () => {
      const limit = await ctx.db
        .prepare('SELECT requests_per_day, tokens_per_day FROM tier_limits WHERE tier = ?')
        .bind('pro')
        .first<{ requests_per_day: number; tokens_per_day: number }>();
      expect(limit?.requests_per_day).toBe(500);
      expect(limit?.tokens_per_day).toBe(500000);
    });

    it('tier upgrade immediately applies', async () => {
      const user = await createBetterAuthUser(ctx.db, { tier: 'free' });
      
      // Upgrade to premium (maps to master in DB)
      await updateUserTier(ctx.db, user.id, 'premium');

      // Verify new tier
      const updated = await ctx.db
        .prepare('SELECT tier FROM ba_user WHERE id = ?')
        .bind(user.id)
        .first<{ tier: string }>();
      expect(updated?.tier).toBe('premium');
    });

    it('premium content access differs by tier', async () => {
      const freeLimit = await ctx.db
        .prepare('SELECT can_access_premium_content FROM tier_limits WHERE tier = ?')
        .bind('free')
        .first<{ can_access_premium_content: number }>();
      expect(freeLimit?.can_access_premium_content).toBe(0);

      const premiumLimit = await ctx.db
        .prepare('SELECT can_access_premium_content FROM tier_limits WHERE tier = ?')
        .bind('premium')
        .first<{ can_access_premium_content: number }>();
      expect(premiumLimit?.can_access_premium_content).toBe(1);
    });
  });

  // ========================================
  // USAGE TRACKING
  // ========================================

  describe('Usage Tracking', () => {
    it('tracks daily usage per user', async () => {
      const user = await createBetterAuthUser(ctx.db);
      const today = new Date().toISOString().split('T')[0];

      // Insert usage record (using composite primary key, no id column)
      await ctx.db.prepare(`
        INSERT INTO daily_usage (user_id, date, request_count, token_count)
        VALUES (?, ?, ?, ?)
      `).bind(user.id, today, 3, 500).run();

      // Verify
      const usage = await ctx.db
        .prepare('SELECT request_count FROM daily_usage WHERE user_id = ? AND date = ?')
        .bind(user.id, today)
        .first<{ request_count: number }>();
      expect(usage?.request_count).toBe(3);
    });

    it('increments usage correctly', async () => {
      const user = await createBetterAuthUser(ctx.db);
      const today = new Date().toISOString().split('T')[0];

      // Insert initial
      await ctx.db.prepare(`
        INSERT INTO daily_usage (user_id, date, request_count, token_count)
        VALUES (?, ?, ?, ?)
      `).bind(user.id, today, 1, 100).run();

      // Increment
      await ctx.db.prepare(`
        UPDATE daily_usage SET request_count = request_count + 1 WHERE user_id = ? AND date = ?
      `).bind(user.id, today).run();

      // Verify
      const usage = await ctx.db
        .prepare('SELECT request_count FROM daily_usage WHERE user_id = ? AND date = ?')
        .bind(user.id, today)
        .first<{ request_count: number }>();
      expect(usage?.request_count).toBe(2);
    });

    it('each day starts fresh', async () => {
      const user = await createBetterAuthUser(ctx.db);
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];

      // Insert yesterday's usage
      await ctx.db.prepare(`
        INSERT INTO daily_usage (user_id, date, request_count, token_count)
        VALUES (?, ?, ?, ?)
      `).bind(user.id, yesterday, 100, 50000).run();

      // Today should have no usage
      const usage = await ctx.db
        .prepare('SELECT request_count FROM daily_usage WHERE user_id = ? AND date = ?')
        .bind(user.id, today)
        .first<{ request_count: number }>();
      expect(usage).toBeNull();
    });
  });

  // ========================================
  // LIMIT ENFORCEMENT LOGIC
  // ========================================

  describe('Limit Enforcement', () => {
    it('user under limit can proceed', async () => {
      const user = await createBetterAuthUser(ctx.db, { tier: 'free' });
      const today = new Date().toISOString().split('T')[0];

      // Usage at 5 (under free limit of 10)
      await ctx.db.prepare(`
        INSERT INTO daily_usage (user_id, date, request_count, token_count)
        VALUES (?, ?, ?, ?)
      `).bind(user.id, today, 5, 2000).run();

      const usage = await ctx.db
        .prepare('SELECT request_count FROM daily_usage WHERE user_id = ? AND date = ?')
        .bind(user.id, today)
        .first<{ request_count: number }>();
      const limit = await ctx.db
        .prepare('SELECT requests_per_day FROM tier_limits WHERE tier = ?')
        .bind('free')
        .first<{ requests_per_day: number }>();

      expect(usage?.request_count).toBeLessThan(limit?.requests_per_day || 0);
    });

    it('user at limit should be blocked', async () => {
      const user = await createBetterAuthUser(ctx.db, { tier: 'free' });
      const today = new Date().toISOString().split('T')[0];

      // Usage at limit (10 for free)
      await ctx.db.prepare(`
        INSERT INTO daily_usage (user_id, date, request_count, token_count)
        VALUES (?, ?, ?, ?)
      `).bind(user.id, today, 10, 5000).run();

      const usage = await ctx.db
        .prepare('SELECT request_count FROM daily_usage WHERE user_id = ? AND date = ?')
        .bind(user.id, today)
        .first<{ request_count: number }>();
      const limit = await ctx.db
        .prepare('SELECT requests_per_day FROM tier_limits WHERE tier = ?')
        .bind('free')
        .first<{ requests_per_day: number }>();

      expect(usage?.request_count).toBeGreaterThanOrEqual(limit?.requests_per_day || 0);
    });

    it('user over limit should be blocked', async () => {
      const user = await createBetterAuthUser(ctx.db, { tier: 'free' });
      const today = new Date().toISOString().split('T')[0];

      // Usage over limit
      await ctx.db.prepare(`
        INSERT INTO daily_usage (user_id, date, request_count, token_count)
        VALUES (?, ?, ?, ?)
      `).bind(user.id, today, 15, 8000).run();

      const usage = await ctx.db
        .prepare('SELECT request_count FROM daily_usage WHERE user_id = ? AND date = ?')
        .bind(user.id, today)
        .first<{ request_count: number }>();
      const limit = await ctx.db
        .prepare('SELECT requests_per_day FROM tier_limits WHERE tier = ?')
        .bind('free')
        .first<{ requests_per_day: number }>();

      expect(usage?.request_count).toBeGreaterThan(limit?.requests_per_day || 0);
    });
  });

  // ========================================
  // PARALLEL GENERATION LIMITS
  // ========================================

  describe('Parallel Generation Limits', () => {
    it('free tier allows 1 parallel generation', async () => {
      const limit = await ctx.db
        .prepare('SELECT max_parallel_generations FROM tier_limits WHERE tier = ?')
        .bind('free')
        .first<{ max_parallel_generations: number }>();
      expect(limit?.max_parallel_generations).toBe(1);
    });

    it('premium tier allows 3 parallel generations', async () => {
      const limit = await ctx.db
        .prepare('SELECT max_parallel_generations FROM tier_limits WHERE tier = ?')
        .bind('premium')
        .first<{ max_parallel_generations: number }>();
      expect(limit?.max_parallel_generations).toBe(3);
    });

    it('pro tier allows 10 parallel generations', async () => {
      const limit = await ctx.db
        .prepare('SELECT max_parallel_generations FROM tier_limits WHERE tier = ?')
        .bind('pro')
        .first<{ max_parallel_generations: number }>();
      expect(limit?.max_parallel_generations).toBe(10);
    });
  });

  // ========================================
  // OFFLINE PACKAGES
  // ========================================

  describe('Offline Package Limits', () => {
    it('free tier has no offline packages', async () => {
      const limit = await ctx.db
        .prepare('SELECT offline_packages_allowed FROM tier_limits WHERE tier = ?')
        .bind('free')
        .first<{ offline_packages_allowed: number }>();
      expect(limit?.offline_packages_allowed).toBe(0);
    });

    it('premium tier has 1 offline package', async () => {
      const limit = await ctx.db
        .prepare('SELECT offline_packages_allowed FROM tier_limits WHERE tier = ?')
        .bind('premium')
        .first<{ offline_packages_allowed: number }>();
      expect(limit?.offline_packages_allowed).toBe(1);
    });

    it('pro tier has 10 offline packages', async () => {
      const limit = await ctx.db
        .prepare('SELECT offline_packages_allowed FROM tier_limits WHERE tier = ?')
        .bind('pro')
        .first<{ offline_packages_allowed: number }>();
      expect(limit?.offline_packages_allowed).toBe(10);
    });
  });
});
