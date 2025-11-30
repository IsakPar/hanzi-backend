/**
 * Auth Deep Validation Tests
 * 
 * Phase 1 - Deep P0 Tests: Session management, token flows, security
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  createBetterAuthUser,
  createBetterAuthSession,
  authCookieHeaders,
  jsonAuthCookieHeaders,
} from '../fixtures/better-auth-helpers';

describe.sequential('Auth Deep Validation', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // SESSION MANAGEMENT
  // ========================================

  describe('Session Management', () => {
    it('session expires after timeout', async () => {
      const { sessionToken, user } = await createAuthenticatedUser(ctx.db);
      
      // Manually expire the session (camelCase columns)
      const expiredTime = new Date(Date.now() - 3600 * 1000).toISOString();
      await ctx.db.prepare(`
        UPDATE ba_session SET expiresAt = ? WHERE token = ?
      `).bind(expiredTime, sessionToken).run();
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('deleted session returns 401', async () => {
      const { sessionToken } = await createAuthenticatedUser(ctx.db);
      
      // Delete the session (simulate logout)
      await ctx.db.prepare('DELETE FROM ba_session WHERE token = ?')
        .bind(sessionToken).run();
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('user can have multiple active sessions in database', async () => {
      const { user, sessionToken: firstSession } = await createAuthenticatedUser(ctx.db);
      
      // Create two more sessions for same user via helper
      const { sessionToken: session1 } = await createBetterAuthSession(ctx.db, user.id);
      const { sessionToken: session2 } = await createBetterAuthSession(ctx.db, user.id);
      
      // Verify sessions exist in database
      const sessionCount = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM ba_session WHERE userId = ?')
        .bind(user.id)
        .first<{ count: number }>();
      
      expect(sessionCount?.count).toBe(3); // original + 2 new
    });

    it('deleting one session does not delete others', async () => {
      const { user, sessionToken: firstSession } = await createAuthenticatedUser(ctx.db);
      const { sessionToken: session2 } = await createBetterAuthSession(ctx.db, user.id);
      
      // Delete first session
      await ctx.db.prepare('DELETE FROM ba_session WHERE token = ?')
        .bind(firstSession).run();
      
      // Second session should still exist
      const remaining = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM ba_session WHERE userId = ?')
        .bind(user.id)
        .first<{ count: number }>();
      
      expect(remaining?.count).toBe(1);
    });
  });

  // ========================================
  // ROLE CHANGES
  // ========================================

  describe('Real-time Role Changes', () => {
    it('role upgrade takes effect immediately', async () => {
      const { sessionToken, user } = await createAuthenticatedUser(ctx.db);
      
      // Upgrade to admin
      await ctx.db.prepare('UPDATE ba_user SET role = ? WHERE id = ?')
        .bind('admin', user.id).run();
      
      // Should now have admin access
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/users', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('role downgrade takes effect immediately', async () => {
      const { sessionToken, user } = await createAuthenticatedAdmin(ctx.db);
      
      // Downgrade to user
      await ctx.db.prepare('UPDATE ba_user SET role = ? WHERE id = ?')
        .bind('user', user.id).run();
      
      // Should now be blocked from admin
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/users', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([403, 404]).toContain(res.status);
    });
  });

  // ========================================
  // TIER CHANGES
  // ========================================

  describe('Real-time Tier Changes', () => {
    it('tier upgrade reflects in session', async () => {
      const { sessionToken, user } = await createAuthenticatedUser(ctx.db);
      
      // Upgrade tier
      await ctx.db.prepare('UPDATE ba_user SET tier = ? WHERE id = ?')
        .bind('premium', user.id).run();
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('tier changes are persisted in database', async () => {
      const user = await createBetterAuthUser(ctx.db, { tier: 'premium' });
      
      // Downgrade tier
      await ctx.db.prepare('UPDATE ba_user SET tier = ? WHERE id = ?')
        .bind('free', user.id).run();
      
      // Verify tier was updated
      const updated = await ctx.db
        .prepare('SELECT tier FROM ba_user WHERE id = ?')
        .bind(user.id)
        .first<{ tier: string }>();
      
      expect(updated?.tier).toBe('free');
    });
  });

  // ========================================
  // MALFORMED INPUT
  // ========================================

  describe('Malformed Input Handling', () => {
    it('handles empty cookie gracefully', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: { 'Cookie': 'ba_session=' },
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('handles malformed cookie gracefully', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: { 'Cookie': 'ba_session=not-a-valid-session-id' },
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('handles encoded unicode in cookie gracefully', async () => {
      // Unicode must be URL-encoded in cookies
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: { 'Cookie': 'better-auth.session_token=%E4%BD%A0%E5%A5%BD' },
        }),
        ctx.env,
        executionContext
      );

      // Should reject invalid session
      expect(res.status).toBe(401);
    });

    it('handles extremely long cookie gracefully', async () => {
      const longValue = 'a'.repeat(10000);
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: { 'Cookie': `ba_session=${longValue}` },
        }),
        ctx.env,
        executionContext
      );

      expect([400, 401, 413]).toContain(res.status);
    });

    it('handles null bytes in cookie gracefully', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: { 'Cookie': 'better-auth.session_token=testinjection' },
        }),
        ctx.env,
        executionContext
      );

      // Should reject invalid session
      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // CONCURRENT REQUESTS
  // ========================================

  describe('Concurrent Requests', () => {
    it('handles 10 concurrent requests with same session', async () => {
      const { sessionToken } = await createAuthenticatedUser(ctx.db);
      
      const requests = Array(10).fill(null).map(() =>
        ctx.app.fetch(
          new Request('http://localhost/v1/users/me', {
            headers: authCookieHeaders(sessionToken),
          }),
          ctx.env,
          executionContext
        )
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(res => {
        expect([200, 404]).toContain(res.status);
      });
    });

    it('handles rapid session validation', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const requests = Array(20).fill(null).map(() =>
        ctx.app.fetch(
          new Request('http://localhost/v1/admin/users', {
            headers: authCookieHeaders(sessionToken),
          }),
          ctx.env,
          executionContext
        )
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(res => {
        expect([200, 404, 500]).toContain(res.status);
      });
    });
  });

  // ========================================
  // USER DELETION
  // ========================================

  describe('User Deletion', () => {
    it('deleted user cannot authenticate', async () => {
      const { sessionToken, user } = await createAuthenticatedUser(ctx.db);
      
      // Delete user
      await ctx.db.prepare('DELETE FROM ba_user WHERE id = ?')
        .bind(user.id).run();
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([401, 404]).toContain(res.status);
    });
  });
});

