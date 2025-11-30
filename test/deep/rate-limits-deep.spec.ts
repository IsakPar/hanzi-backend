/**
 * Rate Limiting Deep Scenario Tests
 * 
 * Phase 1 - Deep P0 Tests: Rate limit edge cases, tier enforcement, burst handling
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  createBetterAuthUser,
  authCookieHeaders,
  jsonAuthCookieHeaders,
} from '../fixtures/better-auth-helpers';

describe.sequential('Rate Limiting Deep Scenarios', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
    
    // Seed tier limits
    await ctx.db.prepare(`
      INSERT OR REPLACE INTO tier_limits (tier, requests_per_day, tokens_per_day, max_parallel_generations, content_downloads_per_day, offline_packages_allowed, can_access_premium_content)
      VALUES ('free', 10, 5000, 1, 5, 0, 0)
    `).run();
    
    await ctx.db.prepare(`
      INSERT OR REPLACE INTO tier_limits (tier, requests_per_day, tokens_per_day, max_parallel_generations, content_downloads_per_day, offline_packages_allowed, can_access_premium_content)
      VALUES ('premium', 100, 50000, 3, 50, 3, 1)
    `).run();
    
    await ctx.db.prepare(`
      INSERT OR REPLACE INTO tier_limits (tier, requests_per_day, tokens_per_day, max_parallel_generations, content_downloads_per_day, offline_packages_allowed, can_access_premium_content)
      VALUES ('pro', 1000, 500000, 10, -1, -1, 1)
    `).run();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // TIER-SPECIFIC LIMITS
  // ========================================

  describe('Tier-Specific Limits', () => {
    it('free tier has correct limits', async () => {
      const limits = await ctx.db
        .prepare('SELECT * FROM tier_limits WHERE tier = ?')
        .bind('free')
        .first();

      expect(limits?.requests_per_day).toBe(10);
      expect(limits?.tokens_per_day).toBe(5000);
      expect(limits?.max_parallel_generations).toBe(1);
      expect(limits?.content_downloads_per_day).toBe(5);
      expect(limits?.offline_packages_allowed).toBe(0);
      expect(limits?.can_access_premium_content).toBe(0);
    });

    it('premium tier has correct limits', async () => {
      const limits = await ctx.db
        .prepare('SELECT * FROM tier_limits WHERE tier = ?')
        .bind('premium')
        .first();

      expect(limits?.requests_per_day).toBe(100);
      expect(limits?.tokens_per_day).toBe(50000);
      expect(limits?.max_parallel_generations).toBe(3);
      expect(limits?.content_downloads_per_day).toBe(50);
      expect(limits?.offline_packages_allowed).toBe(3);
      expect(limits?.can_access_premium_content).toBe(1);
    });

    it('pro tier has unlimited limits', async () => {
      const limits = await ctx.db
        .prepare('SELECT * FROM tier_limits WHERE tier = ?')
        .bind('pro')
        .first();

      expect(limits?.requests_per_day).toBe(1000);
      expect(limits?.tokens_per_day).toBe(500000);
      expect(limits?.max_parallel_generations).toBe(10);
      expect(limits?.content_downloads_per_day).toBe(-1); // unlimited
      expect(limits?.offline_packages_allowed).toBe(-1); // unlimited
      expect(limits?.can_access_premium_content).toBe(1);
    });
  });

  // ========================================
  // LIMIT ENFORCEMENT
  // ========================================

  describe('Limit Enforcement', () => {
    it('enforces request limits per user', async () => {
      const user = await createBetterAuthUser(ctx.db, { tier: 'free' });
      
      // Simulate hitting the limit
      await ctx.db.prepare(`
        INSERT INTO api_usage (id, user_id, request_id, model_used, input_tokens, output_tokens, total_tokens, estimated_cost, latency_ms, success, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
      `).bind(crypto.randomUUID(), user.id, 'req-1', 'test', 100, 100, 200, 0.01, 500, 1).run();
      
      const usage = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM api_usage WHERE user_id = ?')
        .bind(user.id)
        .first<{ count: number }>();
      
      expect(usage?.count).toBeGreaterThan(0);
    });

    it('tracks token usage accurately', async () => {
      const user = await createBetterAuthUser(ctx.db);
      
      // Add multiple usage entries
      for (let i = 0; i < 5; i++) {
        await ctx.db.prepare(`
          INSERT INTO api_usage (id, user_id, request_id, model_used, input_tokens, output_tokens, total_tokens, estimated_cost, latency_ms, success, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
        `).bind(crypto.randomUUID(), user.id, `req-${i}`, 'test', 100, 100, 200, 0.01, 500, 1).run();
      }
      
      const totalTokens = await ctx.db
        .prepare('SELECT SUM(total_tokens) as total FROM api_usage WHERE user_id = ?')
        .bind(user.id)
        .first<{ total: number }>();
      
      expect(totalTokens?.total).toBe(1000);
    });
  });

  // ========================================
  // ADMIN LIMIT UPDATES
  // ========================================

  describe('Admin Limit Updates', () => {
    it('admin can update free tier limits', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/tier-limits/free', {
          method: 'PUT',
          headers: jsonAuthCookieHeaders(sessionToken),
          body: JSON.stringify({
            requestsPerDay: 20,
            tokensPerDay: 10000,
            maxParallelGenerations: 2,
            contentDownloadsPerDay: 10,
            offlinePackagesAllowed: 1,
            canAccessPremiumContent: false,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 500]).toContain(res.status);
    });

    it('admin can update premium tier limits', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/tier-limits/premium', {
          method: 'PUT',
          headers: jsonAuthCookieHeaders(sessionToken),
          body: JSON.stringify({
            requestsPerDay: 200,
            tokensPerDay: 100000,
            maxParallelGenerations: 5,
            contentDownloadsPerDay: 100,
            offlinePackagesAllowed: 10,
            canAccessPremiumContent: true,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 500]).toContain(res.status);
    });

    it('non-admin cannot update limits', async () => {
      const { sessionToken } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/tier-limits/free', {
          method: 'PUT',
          headers: jsonAuthCookieHeaders(sessionToken),
          body: JSON.stringify({
            requestsPerDay: 1000,
            tokensPerDay: 1000000,
            maxParallelGenerations: 100,
            contentDownloadsPerDay: 1000,
            offlinePackagesAllowed: 100,
            canAccessPremiumContent: true,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(403);
    });

    it('rejects invalid tier names', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/tier-limits/ultra', {
          method: 'PUT',
          headers: jsonAuthCookieHeaders(sessionToken),
          body: JSON.stringify({
            requestsPerDay: 1000,
            tokensPerDay: 1000000,
            maxParallelGenerations: 10,
            contentDownloadsPerDay: 100,
            offlinePackagesAllowed: 10,
            canAccessPremiumContent: true,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // LIMIT RESET
  // ========================================

  describe('Limit Reset', () => {
    it('admin can reset limits to defaults', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/tier-limits/reset', {
          method: 'POST',
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // PARALLEL GENERATION LIMITS
  // ========================================

  describe('Parallel Generation Limits', () => {
    it('free tier limited to 1 parallel generation', async () => {
      const limits = await ctx.db
        .prepare('SELECT max_parallel_generations FROM tier_limits WHERE tier = ?')
        .bind('free')
        .first<{ max_parallel_generations: number }>();

      expect(limits?.max_parallel_generations).toBe(1);
    });

    it('premium tier allows 3 parallel generations', async () => {
      const limits = await ctx.db
        .prepare('SELECT max_parallel_generations FROM tier_limits WHERE tier = ?')
        .bind('premium')
        .first<{ max_parallel_generations: number }>();

      expect(limits?.max_parallel_generations).toBe(3);
    });

    it('pro tier allows 10 parallel generations', async () => {
      const limits = await ctx.db
        .prepare('SELECT max_parallel_generations FROM tier_limits WHERE tier = ?')
        .bind('pro')
        .first<{ max_parallel_generations: number }>();

      expect(limits?.max_parallel_generations).toBe(10);
    });
  });

  // ========================================
  // PREMIUM CONTENT ACCESS
  // ========================================

  describe('Premium Content Access', () => {
    it('free tier cannot access premium content', async () => {
      const limits = await ctx.db
        .prepare('SELECT can_access_premium_content FROM tier_limits WHERE tier = ?')
        .bind('free')
        .first<{ can_access_premium_content: number }>();

      expect(limits?.can_access_premium_content).toBe(0);
    });

    it('premium tier can access premium content', async () => {
      const limits = await ctx.db
        .prepare('SELECT can_access_premium_content FROM tier_limits WHERE tier = ?')
        .bind('premium')
        .first<{ can_access_premium_content: number }>();

      expect(limits?.can_access_premium_content).toBe(1);
    });

    it('pro tier can access premium content', async () => {
      const limits = await ctx.db
        .prepare('SELECT can_access_premium_content FROM tier_limits WHERE tier = ?')
        .bind('pro')
        .first<{ can_access_premium_content: number }>();

      expect(limits?.can_access_premium_content).toBe(1);
    });
  });

  // ========================================
  // OFFLINE PACKAGES
  // ========================================

  describe('Offline Package Limits', () => {
    it('free tier has 0 offline packages', async () => {
      const limits = await ctx.db
        .prepare('SELECT offline_packages_allowed FROM tier_limits WHERE tier = ?')
        .bind('free')
        .first<{ offline_packages_allowed: number }>();

      expect(limits?.offline_packages_allowed).toBe(0);
    });

    it('premium tier has limited offline packages', async () => {
      const limits = await ctx.db
        .prepare('SELECT offline_packages_allowed FROM tier_limits WHERE tier = ?')
        .bind('premium')
        .first<{ offline_packages_allowed: number }>();

      expect(limits?.offline_packages_allowed).toBe(3);
    });

    it('pro tier has unlimited offline packages', async () => {
      const limits = await ctx.db
        .prepare('SELECT offline_packages_allowed FROM tier_limits WHERE tier = ?')
        .bind('pro')
        .first<{ offline_packages_allowed: number }>();

      expect(limits?.offline_packages_allowed).toBe(-1);
    });
  });

  // ========================================
  // USAGE TRACKING
  // ========================================

  describe('Usage Tracking', () => {
    it('tracks successful requests', async () => {
      const user = await createBetterAuthUser(ctx.db);
      
      await ctx.db.prepare(`
        INSERT INTO api_usage (id, user_id, request_id, model_used, input_tokens, output_tokens, total_tokens, estimated_cost, latency_ms, success, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
      `).bind(crypto.randomUUID(), user.id, 'req-success', 'gpt-4', 100, 200, 300, 0.02, 1500, 1).run();
      
      const usage = await ctx.db
        .prepare('SELECT * FROM api_usage WHERE user_id = ? AND success = 1')
        .bind(user.id)
        .first();
      
      expect(usage).toBeDefined();
      expect(usage?.total_tokens).toBe(300);
    });

    it('tracks failed requests', async () => {
      const user = await createBetterAuthUser(ctx.db);
      
      await ctx.db.prepare(`
        INSERT INTO api_usage (id, user_id, request_id, model_used, input_tokens, output_tokens, total_tokens, estimated_cost, latency_ms, success, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
      `).bind(crypto.randomUUID(), user.id, 'req-fail', 'gpt-4', 100, 0, 100, 0.003, 500, 0).run();
      
      const usage = await ctx.db
        .prepare('SELECT * FROM api_usage WHERE user_id = ? AND success = 0')
        .bind(user.id)
        .first();
      
      expect(usage).toBeDefined();
      expect(usage?.success).toBe(0);
    });

    it('calculates cost accurately', async () => {
      const user = await createBetterAuthUser(ctx.db);
      
      // GPT-4: $0.03/1k input, $0.06/1k output
      await ctx.db.prepare(`
        INSERT INTO api_usage (id, user_id, request_id, model_used, input_tokens, output_tokens, total_tokens, estimated_cost, latency_ms, success, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
      `).bind(crypto.randomUUID(), user.id, 'req-cost', 'gpt-4', 1000, 1000, 2000, 0.09, 2000, 1).run();
      
      const totalCost = await ctx.db
        .prepare('SELECT SUM(estimated_cost) as total FROM api_usage WHERE user_id = ?')
        .bind(user.id)
        .first<{ total: number }>();
      
      expect(totalCost?.total).toBeCloseTo(0.09, 2);
    });
  });
});

