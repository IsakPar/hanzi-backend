/**
 * Auth Critical Path Tests
 * 
 * Tests authentication and authorization using Better Auth:
 * - Session-based authentication
 * - Role-based access control (admin vs user)
 * - Session expiration handling
 * - Security scenarios
 * 
 * These tests verify the ACTUAL auth system (Better Auth with cookies),
 * not legacy JWT auth.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createBetterAuthUser,
  createBetterAuthSession,
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  createExpiredSession,
  authCookieHeaders,
  jsonAuthCookieHeaders,
  deleteSession,
  updateUserRole,
} from '../fixtures/better-auth-helpers';

describe.sequential('Better Auth - Critical Path', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // SESSION AUTHENTICATION
  // ========================================

  describe('Session Authentication', () => {
    it('authenticates user with valid session cookie', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
    });

    it('rejects request without session cookie', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('rejects request with invalid session token', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authCookieHeaders('invalid-session-token-12345'),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('rejects request with expired session', async () => {
      const user = await createBetterAuthUser(ctx.db, { role: 'admin' });
      const { sessionToken } = await createExpiredSession(ctx.db, user.id);

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('rejects request after session deletion (logout)', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);

      // First request should work
      const res1 = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );
      expect(res1.status).toBe(200);

      // Delete session (simulate logout)
      await deleteSession(ctx.db, sessionToken);

      // Second request should fail
      const res2 = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );
      expect(res2.status).toBe(401);
    });
  });

  // ========================================
  // ROLE-BASED ACCESS CONTROL
  // ========================================

  describe('Role-Based Access Control', () => {
    it('allows admin to access admin-only endpoints', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
    });

    it('denies regular user access to admin-only endpoints', async () => {
      const { sessionToken } = await createAuthenticatedUser(ctx.db);

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(403);
    });

    it('allows admin to create resources', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'POST',
          headers: jsonAuthCookieHeaders(sessionToken),
          body: JSON.stringify({
            hskLevel: 1,
            unitNumber: 999,
            title: 'Test Unit',
            description: 'Created by admin',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(201);
    });

    it('denies regular user from creating admin resources', async () => {
      const { sessionToken } = await createAuthenticatedUser(ctx.db);

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'POST',
          headers: jsonAuthCookieHeaders(sessionToken),
          body: JSON.stringify({
            hskLevel: 1,
            unitNumber: 998,
            title: 'Test Unit',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(403);
    });

    it('respects role changes in real-time', async () => {
      // Create user as regular user
      const user = await createBetterAuthUser(ctx.db, { role: 'user' });
      const { sessionToken } = await createBetterAuthSession(ctx.db, user.id);

      // Should be denied initially
      const res1 = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );
      expect(res1.status).toBe(403);

      // Upgrade to admin
      await updateUserRole(ctx.db, user.id, 'admin');

      // Should be allowed after upgrade
      const res2 = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );
      expect(res2.status).toBe(200);
    });
  });

  // ========================================
  // PUBLIC ENDPOINTS
  // ========================================

  describe('Public Endpoints', () => {
    it('allows access to health endpoint without auth', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/', {
          method: 'GET',
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('ok');
    });

    it('allows access to waitlist signup without auth', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: `newuser-${Date.now()}@example.com` }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201]).toContain(res.status);
    });
  });

  // ========================================
  // SECURITY SCENARIOS
  // ========================================

  describe('Security Scenarios', () => {
    it('handles malformed cookie gracefully', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: {
            Cookie: 'better-auth.session_token=',
          },
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('handles missing cookie value gracefully', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: {
            Cookie: 'some-other-cookie=value',
          },
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('handles concurrent requests with same session', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);

      // Send 5 concurrent requests
      const requests = Array(5).fill(null).map(() =>
        ctx.app.fetch(
          new Request('http://localhost/v1/units', {
            method: 'GET',
            headers: authCookieHeaders(sessionToken),
          }),
          ctx.env,
          executionContext
        )
      );

      const responses = await Promise.all(requests);
      
      // All should succeed
      responses.forEach((res) => {
        expect(res.status).toBe(200);
      });
    });

    it('isolates sessions between users', async () => {
      const admin = await createAuthenticatedAdmin(ctx.db);
      const user = await createAuthenticatedUser(ctx.db);

      // Admin can access admin endpoint
      const adminRes = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authCookieHeaders(admin.sessionToken),
        }),
        ctx.env,
        executionContext
      );
      expect(adminRes.status).toBe(200);

      // User cannot access admin endpoint with their own session
      const userRes = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authCookieHeaders(user.sessionToken),
        }),
        ctx.env,
        executionContext
      );
      expect(userRes.status).toBe(403);
    });

    it('prevents session token from being used as bearer token', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);

      // Try to use session token as Bearer token (should fail)
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        }),
        ctx.env,
        executionContext
      );

      // Should be rejected - we only accept cookies
      expect(res.status).toBe(401);
    });
  });
});
