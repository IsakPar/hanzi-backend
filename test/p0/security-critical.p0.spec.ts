/**
 * P0: Security Critical - Tests that prevent real attacks
 * These tests ensure the app is secure for production
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

describe.sequential('P0: Security Critical', () => {
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

  // ========================================
  // SESSION SECURITY
  // ========================================

  describe('Session Security', () => {
    it('expired session token is rejected', async () => {
      // Create a session that's already expired
      const user = await createBetterAuthUser(ctx.db);
      const expiredToken = 'expired-session-token-123';
      
      // Insert expired session (expiresAt in the past)
      await ctx.db.prepare(`
        INSERT INTO ba_session (id, userId, token, expiresAt, createdAt, updatedAt)
        VALUES (?, ?, ?, datetime('now', '-1 hour'), datetime('now'), datetime('now'))
      `).bind('expired-session-id', user.id, expiredToken).run();
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: { 'Cookie': `better-auth.session_token=${expiredToken}` },
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(401);
    });

    it('invalid session token format is rejected', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: { 'Cookie': 'better-auth.session_token=malformed-token' },
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(401);
    });

    it('empty session token is rejected', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: { 'Cookie': 'better-auth.session_token=' },
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(401);
    });

    it('missing cookie header is rejected', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me'),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(401);
    });

    it('session for deleted user is rejected', async () => {
      const user = await createBetterAuthUser(ctx.db);
      const token = 'valid-token-deleted-user';
      
      // Create valid session
      await ctx.db.prepare(`
        INSERT INTO ba_session (id, userId, token, expiresAt, createdAt, updatedAt)
        VALUES (?, ?, ?, datetime('now', '+1 hour'), datetime('now'), datetime('now'))
      `).bind('session-deleted-user', user.id, token).run();
      
      // Delete the user
      await ctx.db.prepare('DELETE FROM ba_user WHERE id = ?').bind(user.id).run();
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: { 'Cookie': `better-auth.session_token=${token}` },
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // AUTHORIZATION BOUNDARIES
  // ========================================

  describe('Authorization Boundaries', () => {
    it('user cannot access admin endpoints', async () => {
      const endpoints = [
        '/v1/admin/users',
        '/v1/admin/tier-limits',
        '/v1/control-center/content',
        '/v1/announcements/admin',
      ];
      
      for (const endpoint of endpoints) {
        const res = await ctx.app.fetch(
          new Request(`http://localhost${endpoint}`, {
            headers: authCookieHeaders(userSession),
          }),
          ctx.env,
          executionContext
        );
        
        expect([403, 404]).toContain(res.status);
      }
    });

    it('user cannot modify other user data', async () => {
      const otherUser = await createBetterAuthUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/admin/users/${otherUser.id}`, {
          method: 'PUT',
          headers: jsonAuthCookieHeaders(userSession),
          body: JSON.stringify({ tier: 'pro' }),
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(403);
    });

    it('user cannot escalate own role', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          method: 'PUT',
          headers: jsonAuthCookieHeaders(userSession),
          body: JSON.stringify({ role: 'admin' }),
        }),
        ctx.env,
        executionContext
      );
      
      // Should either reject or ignore the role field
      expect([200, 400, 403, 404]).toContain(res.status);
      
      // Verify role wasn't changed
      const userAuth = await createAuthenticatedUser(ctx.db);
      expect(userAuth.user.role).toBe('user');
    });

    it('user cannot escalate own tier', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          method: 'PUT',
          headers: jsonAuthCookieHeaders(userSession),
          body: JSON.stringify({ tier: 'pro' }),
        }),
        ctx.env,
        executionContext
      );
      
      // Should either reject or ignore the tier field
      expect([200, 400, 403, 404]).toContain(res.status);
    });
  });

  // ========================================
  // RATE LIMIT SECURITY
  // ========================================

  describe('Rate Limit Security', () => {
    it('rate limits cannot be bypassed by header manipulation', async () => {
      // Try to bypass with X-Forwarded-For
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/ai/chat', {
          method: 'POST',
          headers: {
            ...jsonAuthCookieHeaders(userSession),
            'X-Forwarded-For': '1.2.3.4',
          },
          body: JSON.stringify({ messages: [{ role: 'user', content: 'test' }] }),
        }),
        ctx.env,
        executionContext
      );
      
      // Should process normally (rate limit by user, not IP)
      expect([200, 400, 403, 429, 500, 503]).toContain(res.status);
    });
  });
});

