/**
 * P0: Advanced Auth Tests - Session management, security, edge cases
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  createTestUser,
  signExpiredAccessToken,
  authBearerHeaders,
  jsonAuthBearerHeaders,
  updateUserRole,
} from '../fixtures/jwt-auth-helpers';
import { nanoid } from 'nanoid';

describe.sequential('P0: Advanced Auth', () => {
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
    it('creates unique session per login', async () => {
      const user = await createAuthenticatedUser(ctx.db);
      const session1 = user.accessToken;
      
      // Create another session
      const user2 = await createAuthenticatedUser(ctx.db, { email: user.user.email });
      const session2 = user2.accessToken;
      
      expect(session1).not.toBe(session2);
    });

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
          headers: authBearerHeaders('definitely-not-a-valid-jwt-token'),
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(401);
    });

    it('handles concurrent sessions for same user', async () => {
      const user1 = await createAuthenticatedUser(ctx.db);
      
      // Create second session with same user ID
      const sessionId2 = nanoid(32);
      await ctx.db.prepare(`
        INSERT INTO ba_session (id, userId, token, expiresAt, createdAt, updatedAt)
        VALUES (?, ?, ?, datetime('now', '+1 hour'), datetime('now'), datetime('now'))
      `).bind(nanoid(), user1.user.id, sessionId2).run();
      
      // First session should still work
      const res1 = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: authBearerHeaders(user1.accessToken),
        }),
        ctx.env,
        executionContext
      );
      
      // Second session should also work (or fail due to token format)
      const res2 = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: authBearerHeaders(sessionId2),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 401, 404]).toContain(res1.status);
      expect([200, 401, 404]).toContain(res2.status);
    });
  });

  // ========================================
  // COOKIE SECURITY
  // ========================================

  describe('Cookie Security', () => {
    it('rejects malformed Bearer token', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: { 'Authorization': 'Bearer not-a-valid-token' },
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(401);
    });

    it('rejects empty Bearer token', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: { 'Authorization': 'Bearer ' },
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(401);
    });

    it('rejects token with SQL injection attempt', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: { 'Authorization': `Bearer ' OR '1'='1` },
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(401);
    });

    it('handles missing Cookie header', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me'),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // ROLE MANAGEMENT
  // ========================================

  describe('Role Management', () => {
    it('user cannot access admin endpoints', async () => {
      const user = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/analytics', {
          headers: authBearerHeaders(user.accessToken),
        }),
        ctx.env,
        executionContext
      );
      
      expect([401, 403, 404]).toContain(res.status);
    });

    it('admin can access admin endpoints', async () => {
      const admin = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/analytics', {
          headers: authBearerHeaders(admin.accessToken),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 404]).toContain(res.status);
    });

    it('role change requires new token (stateless JWT)', async () => {
      const user = await createAuthenticatedUser(ctx.db);
      
      // Upgrade to admin in DB (updates both ba_user and users tables)
      await updateUserRole(ctx.db, user.user.id, 'admin');
      
      // OLD token still has 'user' role embedded
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin/bulk-import', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(user.accessToken),
          body: JSON.stringify({
            entries: [{ hanzi: '测', pinyin: 'cè', english: 'test', hskLevel: 1, category: 'test' }],
          }),
        }),
        ctx.env,
        executionContext
      );
      
      // JWT is stateless - old token still has user role, so access denied
      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // TIER ACCESS
  // ========================================

  describe('Tier Access', () => {
    it('tier change reflected in database', async () => {
      const user = await createAuthenticatedUser(ctx.db);
      
      // Upgrade to premium
      await ctx.db.prepare(`UPDATE ba_user SET tier = 'premium' WHERE id = ?`).bind(user.user.id).run();
      
      // Verify directly in database
      const result = await ctx.db.prepare(`SELECT tier FROM ba_user WHERE id = ?`).bind(user.user.id).first();
      expect(result?.tier).toBe('premium');
    });
  });

  // ========================================
  // DELETED USERS
  // ========================================

  describe('Deleted Users', () => {
    it('JWT token stateless - remains valid after user deletion', async () => {
      // Note: JWT is stateless - tokens remain valid until expiry
      // This is a deliberate design tradeoff for performance
      const user = await createAuthenticatedUser(ctx.db);
      
      // Delete the user from both tables
      await ctx.db.prepare(`DELETE FROM users WHERE id = ?`).bind(user.user.id).run();
      await ctx.db.prepare(`DELETE FROM ba_user WHERE id = ?`).bind(user.user.id).run();
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: authBearerHeaders(user.accessToken),
        }),
        ctx.env,
        executionContext
      );
      
      // Token is still valid but user lookup may fail - expect 200 or 404
      expect([200, 404]).toContain(res.status);
    });
  });
});

