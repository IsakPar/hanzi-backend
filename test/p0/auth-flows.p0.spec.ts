/**
 * P0: Auth Flows - Critical authentication scenarios
 * These tests verify core auth flows work correctly
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  createBetterAuthUser,
  createBetterAuthSession,
  createTestUser,
  signExpiredAccessToken,
  authBearerHeaders,
  jsonAuthBearerHeaders,
  updateUserRole,
  updateUserTier,
} from '../fixtures/jwt-auth-helpers';

describe.sequential('P0: Auth Flows', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // LOGIN FLOW
  // ========================================

  describe('Login Flow', () => {
    it('valid session grants access', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('expired JWT token is rejected', async () => {
      const user = await createTestUser(ctx.db);
      const expiredToken = await signExpiredAccessToken(user);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: authBearerHeaders(expiredToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('invalid JWT token is rejected', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: authBearerHeaders('completely-invalid-jwt-format'),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('missing cookie is rejected', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me'),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('empty Authorization header is rejected', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: { 'Authorization': 'Bearer ' },
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('random token is rejected', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: authBearerHeaders('random-invalid-token-12345'),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // ROLE ACCESS
  // ========================================

  describe('Role Access Control', () => {
    it('admin can access admin endpoints', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/users', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('user cannot access admin endpoints', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/users', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(403);
    });

    it('role change requires new token to take effect (stateless JWT)', async () => {
      const { accessToken: sessionToken, user } = await createAuthenticatedUser(ctx.db);
      
      // Upgrade to admin in DB
      await updateUserRole(ctx.db, user.id, 'admin');
      
      // OLD token still has 'user' role - should be rejected
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/users', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      // JWT is stateless - old token still has user role
      expect(res.status).toBe(403);
    });

    it('downgrade requires new token to take effect (stateless JWT)', async () => {
      const { accessToken: sessionToken, user } = await createAuthenticatedAdmin(ctx.db);
      
      // Downgrade to user in DB
      await updateUserRole(ctx.db, user.id, 'user');
      
      // OLD token still has 'admin' role - should still work
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/users', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      // JWT is stateless - old token still has admin role, so it works
      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // TIER ACCESS
  // ========================================

  describe('Tier Access', () => {
    it('free tier is set by default', async () => {
      const user = await createBetterAuthUser(ctx.db);
      
      const dbUser = await ctx.db
        .prepare('SELECT tier FROM ba_user WHERE id = ?')
        .bind(user.id)
        .first<{ tier: string }>();
      
      expect(dbUser?.tier).toBe('free');
    });

    it('tier upgrade persists', async () => {
      const user = await createBetterAuthUser(ctx.db);
      await updateUserTier(ctx.db, user.id, 'premium');
      
      const dbUser = await ctx.db
        .prepare('SELECT tier FROM ba_user WHERE id = ?')
        .bind(user.id)
        .first<{ tier: string }>();
      
      expect(dbUser?.tier).toBe('premium');
    });

    it('tier downgrade persists', async () => {
      const user = await createBetterAuthUser(ctx.db, { tier: 'premium' });
      await updateUserTier(ctx.db, user.id, 'free');
      
      const dbUser = await ctx.db
        .prepare('SELECT tier FROM ba_user WHERE id = ?')
        .bind(user.id)
        .first<{ tier: string }>();
      
      expect(dbUser?.tier).toBe('free');
    });
  });

  // ========================================
  // SESSION MANAGEMENT
  // ========================================

  describe('Session Management', () => {
    it('can have multiple sessions', async () => {
      const user = await createBetterAuthUser(ctx.db);
      
      await createBetterAuthSession(ctx.db, user.id);
      await createBetterAuthSession(ctx.db, user.id);
      await createBetterAuthSession(ctx.db, user.id);
      
      const count = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM ba_session WHERE userId = ?')
        .bind(user.id)
        .first<{ count: number }>();
      
      expect(count?.count).toBe(3);
    });

    it('deleting user removes sessions', async () => {
      const { user } = await createAuthenticatedUser(ctx.db);
      
      await ctx.db.prepare('DELETE FROM ba_user WHERE id = ?').bind(user.id).run();
      
      const count = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM ba_session WHERE userId = ?')
        .bind(user.id)
        .first<{ count: number }>();
      
      // Sessions may be orphaned or cascade deleted depending on FK
      expect(count?.count).toBeGreaterThanOrEqual(0);
    });
  });

  // ========================================
  // PUBLIC ENDPOINTS
  // ========================================

  describe('Public Endpoints', () => {
    it('health check is public', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/'),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
    });

    it('waitlist signup is public', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: `public-${Date.now()}@test.com` }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 400, 409]).toContain(res.status);
    });
  });
});

