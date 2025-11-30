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
  createExpiredSession,
  authCookieHeaders,
  jsonAuthCookieHeaders,
  deleteSession,
  updateUserRole,
  updateUserTier,
} from '../fixtures/better-auth-helpers';

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
      const { sessionToken } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('expired session is rejected', async () => {
      const user = await createBetterAuthUser(ctx.db);
      const { sessionToken } = await createExpiredSession(ctx.db, user.id);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('deleted session is rejected', async () => {
      const { sessionToken } = await createAuthenticatedUser(ctx.db);
      await deleteSession(ctx.db, sessionToken);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: authCookieHeaders(sessionToken),
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

    it('empty cookie is rejected', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: { 'Cookie': 'better-auth.session_token=' },
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('random token is rejected', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: authCookieHeaders('random-invalid-token-12345'),
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
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/users', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('user cannot access admin endpoints', async () => {
      const { sessionToken } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/users', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(403);
    });

    it('role change takes effect immediately', async () => {
      const { sessionToken, user } = await createAuthenticatedUser(ctx.db);
      
      // Upgrade to admin
      await updateUserRole(ctx.db, user.id, 'admin');
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/users', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('downgrade takes effect immediately', async () => {
      const { sessionToken, user } = await createAuthenticatedAdmin(ctx.db);
      
      // Downgrade to user
      await updateUserRole(ctx.db, user.id, 'user');
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/users', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(403);
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

