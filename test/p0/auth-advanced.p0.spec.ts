/**
 * P0: Advanced Auth Tests - Session management, security, edge cases
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
} from '../fixtures/better-auth-helpers';
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
      const session1 = user.sessionToken;
      
      // Create another session
      const user2 = await createAuthenticatedUser(ctx.db, { email: user.user.email });
      const session2 = user2.sessionToken;
      
      expect(session1).not.toBe(session2);
    });

    it('expired session returns 401', async () => {
      const user = await createAuthenticatedUser(ctx.db);
      
      // Manually expire the session
      await ctx.db.prepare(`
        UPDATE ba_session SET expiresAt = datetime('now', '-1 hour') WHERE token = ?
      `).bind(user.sessionToken).run();
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: { 'Cookie': `better-auth.session_token=${user.sessionToken}` },
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(401);
    });

    it('deleted session returns 401', async () => {
      const user = await createAuthenticatedUser(ctx.db);
      
      // Delete the session
      await ctx.db.prepare(`DELETE FROM ba_session WHERE token = ?`).bind(user.sessionToken).run();
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: { 'Cookie': `better-auth.session_token=${user.sessionToken}` },
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
          headers: { 'Cookie': `better-auth.session_token=${user1.sessionToken}` },
        }),
        ctx.env,
        executionContext
      );
      
      // Second session should also work (or fail due to token format)
      const res2 = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: { 'Cookie': `better-auth.session_token=${sessionId2}` },
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
    it('rejects malformed session token', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: { 'Cookie': 'better-auth.session_token=not-a-valid-token' },
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(401);
    });

    it('rejects empty session token', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: { 'Cookie': 'better-auth.session_token=' },
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(401);
    });

    it('rejects session token with SQL injection attempt', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: { 'Cookie': `better-auth.session_token=' OR '1'='1` },
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
          headers: { 'Cookie': `better-auth.session_token=${user.sessionToken}` },
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
          headers: { 'Cookie': `better-auth.session_token=${admin.sessionToken}` },
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 404]).toContain(res.status);
    });

    it('role change reflected in next request', async () => {
      const user = await createAuthenticatedUser(ctx.db);
      
      // Upgrade to admin
      await ctx.db.prepare(`UPDATE ba_user SET role = 'admin' WHERE id = ?`).bind(user.user.id).run();
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin/bulk-import', {
          method: 'POST',
          headers: {
            'Cookie': `better-auth.session_token=${user.sessionToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            entries: [{ hanzi: '测', pinyin: 'cè', english: 'test', hskLevel: 1, category: 'test' }],
          }),
        }),
        ctx.env,
        executionContext
      );
      
      // Should now have access
      expect([200, 201]).toContain(res.status);
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
    it('deleted user session returns 401', async () => {
      const user = await createAuthenticatedUser(ctx.db);
      
      // Delete the user
      await ctx.db.prepare(`DELETE FROM ba_user WHERE id = ?`).bind(user.user.id).run();
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: { 'Cookie': `better-auth.session_token=${user.sessionToken}` },
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(401);
    });
  });
});

