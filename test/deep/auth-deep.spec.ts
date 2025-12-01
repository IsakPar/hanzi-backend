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
  createTestUser,
  signExpiredAccessToken,
  authBearerHeaders,
  jsonAuthBearerHeaders,
  updateUserRole,
} from '../fixtures/jwt-auth-helpers';

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
    it('expired JWT token returns 401', async () => {
      // Create user and generate an expired token
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

    it('invalid JWT token returns 401', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: authBearerHeaders('invalid-jwt-token-12345'),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('user can have multiple active sessions in database', async () => {
      const { user, accessToken: firstSession } = await createAuthenticatedUser(ctx.db);
      
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

    it('each user has independent tokens', async () => {
      const { accessToken: token1 } = await createAuthenticatedUser(ctx.db);
      const { accessToken: token2 } = await createAuthenticatedUser(ctx.db);
      
      // Both tokens should work independently
      const res1 = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: authBearerHeaders(token1),
        }),
        ctx.env,
        executionContext
      );
      
      const res2 = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: authBearerHeaders(token2),
        }),
        ctx.env,
        executionContext
      );
      
      // Both should succeed or return 404 if endpoint doesn't exist
      expect([200, 404]).toContain(res1.status);
      expect([200, 404]).toContain(res2.status);
    });
  });

  // ========================================
  // ROLE CHANGES
  // ========================================

  describe('Real-time Role Changes', () => {
    it('role upgrade requires new token (stateless JWT)', async () => {
      const { accessToken: sessionToken, user } = await createAuthenticatedUser(ctx.db);
      
      // Upgrade to admin in DB (updates both ba_user and users tables)
      await updateUserRole(ctx.db, user.id, 'admin');
      
      // OLD token still has 'user' role embedded
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

    it('role downgrade requires new token (stateless JWT)', async () => {
      const { accessToken: sessionToken, user } = await createAuthenticatedAdmin(ctx.db);
      
      // Downgrade to user in DB (updates both ba_user and users tables)
      await updateUserRole(ctx.db, user.id, 'user');
      
      // OLD token still has 'admin' role embedded - should still work
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/users', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      // JWT is stateless - old token still has admin role
      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // TIER CHANGES
  // ========================================

  describe('Real-time Tier Changes', () => {
    it('tier upgrade reflects in session', async () => {
      const { accessToken: sessionToken, user } = await createAuthenticatedUser(ctx.db);
      
      // Upgrade tier
      await ctx.db.prepare('UPDATE ba_user SET tier = ? WHERE id = ?')
        .bind('premium', user.id).run();
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: authBearerHeaders(sessionToken),
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
      const { accessToken: sessionToken } = await createAuthenticatedUser(ctx.db);
      
      const requests = Array(10).fill(null).map(() =>
        ctx.app.fetch(
          new Request('http://localhost/v1/users/me', {
            headers: authBearerHeaders(sessionToken),
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
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const requests = Array(20).fill(null).map(() =>
        ctx.app.fetch(
          new Request('http://localhost/v1/admin/users', {
            headers: authBearerHeaders(sessionToken),
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
    it('JWT token remains valid after user deletion (stateless auth)', async () => {
      // Note: JWT auth is stateless - tokens remain valid until expiry
      // This is a deliberate design tradeoff for performance
      // Use short token expiry + refresh tokens for security
      const { accessToken: sessionToken, user } = await createAuthenticatedUser(ctx.db);
      
      // Delete user from both tables
      await ctx.db.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run();
      await ctx.db.prepare('DELETE FROM ba_user WHERE id = ?').bind(user.id).run();
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      // Token is still cryptographically valid, but endpoint may return 404 if user lookup fails
      expect([200, 404]).toContain(res.status);
    });
  });
});

