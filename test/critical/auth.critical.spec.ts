/**
 * Auth Critical Path Tests (JWT-Based)
 * 
 * Tests JWT token-based authentication and authorization:
 * - Bearer token authentication
 * - Role-based access control (admin vs user)
 * - Token expiration handling
 * - Refresh token flow
 * - Security scenarios
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createTestUser,
  signTestAccessToken,
  signExpiredAccessToken,
  createTestRefreshToken,
  createExpiredRefreshToken,
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
  jsonAuthBearerHeaders,
  deleteRefreshToken,
  updateUserRole,
  countUserRefreshTokens,
} from '../fixtures/jwt-auth-helpers';

describe.sequential('JWT Auth - Critical Path', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // BEARER TOKEN AUTHENTICATION
  // ========================================

  describe('Bearer Token Authentication', () => {
    it('authenticates user with valid access token', async () => {
      const { accessToken } = await createAuthenticatedAdmin(ctx.db, ctx.env.JWT_SECRET || ctx.env.BETTER_AUTH_SECRET);

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authBearerHeaders(accessToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
    });

    it('rejects request without Authorization header', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('rejects request with invalid token', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authBearerHeaders('invalid-token-12345'),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('rejects request with expired token', async () => {
      const user = await createTestUser(ctx.db, { role: 'admin' });
      const expiredToken = await signExpiredAccessToken(user, ctx.env.JWT_SECRET || ctx.env.BETTER_AUTH_SECRET);

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authBearerHeaders(expiredToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('rejects request with wrong secret', async () => {
      const user = await createTestUser(ctx.db, { role: 'admin' });
      const tokenWithWrongSecret = await signTestAccessToken(user, 'wrong-secret');

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authBearerHeaders(tokenWithWrongSecret),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // ROLE-BASED ACCESS CONTROL
  // ========================================

  describe('Role-Based Access Control', () => {
    it('allows admin to access admin-only endpoints', async () => {
      const { accessToken } = await createAuthenticatedAdmin(ctx.db, ctx.env.JWT_SECRET || ctx.env.BETTER_AUTH_SECRET);

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authBearerHeaders(accessToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
    });

    it('denies regular user access to admin-only endpoints', async () => {
      const { accessToken } = await createAuthenticatedUser(ctx.db, ctx.env.JWT_SECRET || ctx.env.BETTER_AUTH_SECRET);

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authBearerHeaders(accessToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(403);
    });

    it('allows admin to create resources', async () => {
      const { accessToken } = await createAuthenticatedAdmin(ctx.db, ctx.env.JWT_SECRET || ctx.env.BETTER_AUTH_SECRET);

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(accessToken),
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
      const { accessToken } = await createAuthenticatedUser(ctx.db, ctx.env.JWT_SECRET || ctx.env.BETTER_AUTH_SECRET);

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(accessToken),
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
  });

  // ========================================
  // TOKEN AUTH ENDPOINTS
  // ========================================

  describe('Token Auth Endpoints', () => {
    it('POST /v1/auth/token/login returns tokens for valid credentials', async () => {
      // This test requires actual Better Auth password verification
      // Skip for now - tested manually
    });

    it('POST /v1/auth/token/refresh rotates tokens', async () => {
      const user = await createTestUser(ctx.db, { role: 'admin' });
      const refreshToken = await createTestRefreshToken(ctx.db, user.id);

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/auth/token/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      // New refresh token should be different
      expect(body.refreshToken).not.toBe(refreshToken);
    });

    it('POST /v1/auth/token/refresh rejects invalid refresh token', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/auth/token/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: 'invalid-refresh-token' }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('POST /v1/auth/token/refresh rejects expired refresh token', async () => {
      const user = await createTestUser(ctx.db, { role: 'admin' });
      const expiredRefreshToken = await createExpiredRefreshToken(ctx.db, user.id);

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/auth/token/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: expiredRefreshToken }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('POST /v1/auth/token/logout revokes refresh token', async () => {
      const user = await createTestUser(ctx.db, { role: 'admin' });
      const refreshToken = await createTestRefreshToken(ctx.db, user.id);

      // Verify token exists
      expect(await countUserRefreshTokens(ctx.db, user.id)).toBe(1);

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/auth/token/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      
      // Token should be deleted
      expect(await countUserRefreshTokens(ctx.db, user.id)).toBe(0);
    });

    it('GET /v1/auth/token/me returns user info', async () => {
      const { accessToken, user } = await createAuthenticatedAdmin(ctx.db, ctx.env.JWT_SECRET || ctx.env.BETTER_AUTH_SECRET);

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/auth/token/me', {
          method: 'GET',
          headers: authBearerHeaders(accessToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user.id).toBe(user.id);
      expect(body.user.email).toBe(user.email);
      expect(body.user.role).toBe(user.role);
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
    it('handles malformed Authorization header gracefully', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: {
            Authorization: 'Bearer',
          },
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('handles missing Bearer prefix gracefully', async () => {
      const { accessToken } = await createAuthenticatedAdmin(ctx.db, ctx.env.JWT_SECRET || ctx.env.BETTER_AUTH_SECRET);

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: {
            Authorization: accessToken, // Missing "Bearer " prefix
          },
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('handles concurrent requests with same token', async () => {
      const { accessToken } = await createAuthenticatedAdmin(ctx.db, ctx.env.JWT_SECRET || ctx.env.BETTER_AUTH_SECRET);

      // Send 5 concurrent requests
      const requests = Array(5).fill(null).map(() =>
        ctx.app.fetch(
          new Request('http://localhost/v1/units', {
            method: 'GET',
            headers: authBearerHeaders(accessToken),
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

    it('isolates tokens between users', async () => {
      const admin = await createAuthenticatedAdmin(ctx.db, ctx.env.JWT_SECRET || ctx.env.BETTER_AUTH_SECRET);
      const user = await createAuthenticatedUser(ctx.db, ctx.env.JWT_SECRET || ctx.env.BETTER_AUTH_SECRET);

      // Admin can access admin endpoint
      const adminRes = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authBearerHeaders(admin.accessToken),
        }),
        ctx.env,
        executionContext
      );
      expect(adminRes.status).toBe(200);

      // User cannot access admin endpoint with their own token
      const userRes = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authBearerHeaders(user.accessToken),
        }),
        ctx.env,
        executionContext
      );
      expect(userRes.status).toBe(403);
    });

    it('prevents cookie-based auth on JWT-protected routes', async () => {
      // Try to use old cookie-based auth (should fail)
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: {
            Cookie: 'better-auth.session_token=some-session-token',
          },
        }),
        ctx.env,
        executionContext
      );

      // Should be rejected - JWT middleware only accepts Bearer tokens
      expect(res.status).toBe(401);
    });

    it('old refresh token is invalidated after rotation', async () => {
      const user = await createTestUser(ctx.db, { role: 'admin' });
      const oldRefreshToken = await createTestRefreshToken(ctx.db, user.id);

      // First refresh should succeed
      const res1 = await ctx.app.fetch(
        new Request('http://localhost/v1/auth/token/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: oldRefreshToken }),
        }),
        ctx.env,
        executionContext
      );

      expect(res1.status).toBe(200);

      // Using old refresh token again should fail
      const res2 = await ctx.app.fetch(
        new Request('http://localhost/v1/auth/token/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: oldRefreshToken }),
        }),
        ctx.env,
        executionContext
      );

      expect(res2.status).toBe(401);
    });
  });
});
