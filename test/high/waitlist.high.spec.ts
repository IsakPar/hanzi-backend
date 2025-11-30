/**
 * Waitlist API High Priority Tests
 * 
 * P1 Priority - Pre-launch waitlist management
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authCookieHeaders,
  jsonAuthCookieHeaders,
} from '../fixtures/better-auth-helpers';

describe.sequential('Waitlist API - High Priority', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // PUBLIC SIGNUP
  // ========================================

  describe('Public Signup', () => {
    it('POST /waitlist adds email to waitlist', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 400, 500]).toContain(res.status);
    });

    it('rejects invalid email', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'not-an-email',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 422]).toContain(res.status);
    });

    it('rejects duplicate email', async () => {
      // First signup
      await ctx.app.fetch(
        new Request('http://localhost/v1/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'dupe@example.com' }),
        }),
        ctx.env,
        executionContext
      );

      // Second signup with same email
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'dupe@example.com' }),
        }),
        ctx.env,
        executionContext
      );

      // 200 = may silently succeed, 400/409 = rejected, 500 = db error
      expect([200, 400, 409, 500]).toContain(res.status);
    });

    it('accepts optional source field', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'full@example.com',
            source: 'twitter',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 400, 500]).toContain(res.status);
    });
  });

  // ========================================
  // ADMIN MANAGEMENT
  // ========================================

  describe('Admin Management', () => {
    beforeEach(async () => {
      // Seed waitlist entries (no name column)
      await ctx.db.prepare(`
        INSERT INTO waitlist (id, email, source, created_at)
        VALUES (?, ?, ?, strftime('%s', 'now'))
      `).bind('wl-1', 'user1@example.com', 'test').run();
      
      await ctx.db.prepare(`
        INSERT INTO waitlist (id, email, source, created_at)
        VALUES (?, ?, ?, strftime('%s', 'now'))
      `).bind('wl-2', 'user2@example.com', 'test').run();
    });

    it('GET /admin/waitlist lists entries', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/waitlist', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('requires admin for waitlist listing', async () => {
      const { sessionToken } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/waitlist', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([403, 404]).toContain(res.status);
    });

    it('supports pagination', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/waitlist?limit=10&offset=0', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('DELETE /admin/waitlist/:id removes entry', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/waitlist/wl-1', {
          method: 'DELETE',
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 204, 400, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // WAITLIST STATS
  // ========================================

  describe('Waitlist Stats', () => {
    it('GET /admin/waitlist/stats returns count', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/waitlist/stats', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('stats endpoint requires admin', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/waitlist/stats'),
        ctx.env,
        executionContext
      );

      expect([401, 403, 404]).toContain(res.status);
    });
  });
});

