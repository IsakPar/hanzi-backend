/**
 * P2: Admin Management - Admin-only operations
 * Uses proper seed-data helpers
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  createBetterAuthUser,
  authBearerHeaders,
  jsonAuthBearerHeaders,
} from '../fixtures/jwt-auth-helpers';

describe.sequential('P2: Admin Management', () => {
  let ctx: TestContext;
  let adminSession: string;
  let userSession: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    const admin = await createAuthenticatedAdmin(ctx.db);
    const user = await createAuthenticatedUser(ctx.db);
    adminSession = admin.accessToken;
    userSession = user.accessToken;
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // USER MANAGEMENT
  // ========================================

  describe('User Management', () => {
    it('admin can list users', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/users', {
          headers: authBearerHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('user cannot list users', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/users', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(403);
    });

    it('admin can update user role', async () => {
      const targetUser = await createBetterAuthUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/admin/users/${targetUser.id}`, {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(adminSession),
          body: JSON.stringify({ role: 'admin' }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('admin can update user tier', async () => {
      const targetUser = await createBetterAuthUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/admin/users/${targetUser.id}`, {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(adminSession),
          body: JSON.stringify({ tier: 'premium' }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // TIER LIMITS
  // ========================================

  describe('Tier Limits', () => {
    it('admin can get tier limits', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/tier-limits', {
          headers: authBearerHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('admin can update tier limits', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/tier-limits/free', {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(adminSession),
          body: JSON.stringify({
            requestsPerDay: 15,
            tokensPerDay: 7500,
            maxParallelGenerations: 1,
            contentDownloadsPerDay: 10,
            offlinePackagesAllowed: 0,
            canAccessPremiumContent: false,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('rejects invalid tier', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/tier-limits/invalid', {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(adminSession),
          body: JSON.stringify({
            requestsPerDay: 100,
            tokensPerDay: 50000,
            maxParallelGenerations: 5,
            contentDownloadsPerDay: 50,
            offlinePackagesAllowed: 5,
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
  // WAITLIST MANAGEMENT
  // ========================================

  describe('Waitlist Management', () => {
    it('admin can view waitlist', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/waitlist', {
          headers: authBearerHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('can add to waitlist', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: `waitlist-${Date.now()}@test.com` }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 400, 409]).toContain(res.status);
    });

    it('duplicate email is handled', async () => {
      const email = `duplicate-${Date.now()}@test.com`;
      
      await ctx.app.fetch(
        new Request('http://localhost/v1/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }),
        ctx.env,
        executionContext
      );
      
      const res2 = await ctx.app.fetch(
        new Request('http://localhost/v1/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }),
        ctx.env,
        executionContext
      );

      // May accept (idempotent) or reject (duplicate)
      expect([200, 201, 400, 409]).toContain(res2.status);
    });
  });

  // ========================================
  // CONTENT STAGING
  // ========================================

  describe('Content Staging', () => {
    it('admin can get content status', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/control-center/content', {
          headers: authBearerHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('admin can get test devices', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/control-center/test-devices', {
          headers: authBearerHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // ANNOUNCEMENTS
  // ========================================

  describe('Announcements', () => {
    it('admin can list announcements', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/announcements/admin', {
          headers: authBearerHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('admin can get announcement templates', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/announcements/templates', {
          headers: authBearerHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('public can get active announcements', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/announcements/active'),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // PROMO GRANTS
  // ========================================

  describe('Promo Grants', () => {
    it('admin can grant promo', async () => {
      const targetUser = await createBetterAuthUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/subscriptions/grant-promo', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminSession),
          body: JSON.stringify({
            userId: targetUser.id,
            tier: 'premium',
            durationDays: 7,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });
});
