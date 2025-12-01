/**
 * P0: JWT Refresh Flow Tests - Token lifecycle management
 * 
 * Tests refresh token rotation, expiry, and revocation
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createTestUser,
  createTestRefreshToken,
  signTestAccessToken,
  signExpiredAccessToken,
  authBearerHeaders,
} from '../fixtures/jwt-auth-helpers';

describe.sequential('P0: JWT Refresh Flow', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // REFRESH TOKEN ENDPOINT
  // ========================================

  describe('POST /v1/auth/token/refresh', () => {
    it('issues new access token with valid refresh token', async () => {
      const user = await createTestUser(ctx.db);
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
    });

    it('rotates refresh token on each refresh', async () => {
      const user = await createTestUser(ctx.db);
      const originalRefreshToken = await createTestRefreshToken(ctx.db, user.id);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/auth/token/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: originalRefreshToken }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      
      // New refresh token should be different
      expect(body.refreshToken).not.toBe(originalRefreshToken);
    });

    it('invalidates old refresh token after rotation', async () => {
      const user = await createTestUser(ctx.db);
      const originalRefreshToken = await createTestRefreshToken(ctx.db, user.id);
      
      // First refresh succeeds
      const res1 = await ctx.app.fetch(
        new Request('http://localhost/v1/auth/token/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: originalRefreshToken }),
        }),
        ctx.env,
        executionContext
      );
      expect(res1.status).toBe(200);
      
      // Second refresh with same token fails
      const res2 = await ctx.app.fetch(
        new Request('http://localhost/v1/auth/token/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: originalRefreshToken }),
        }),
        ctx.env,
        executionContext
      );
      expect(res2.status).toBe(401);
    });

    it('rejects invalid refresh token', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/auth/token/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: 'invalid-token-12345' }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('rejects expired refresh token', async () => {
      const user = await createTestUser(ctx.db);
      
      // Create already-expired token
      const expiredAt = Math.floor(Date.now() / 1000) - 3600;
      await ctx.db.prepare(`
        INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind('expired-id', user.id, 'expired-hash', expiredAt, expiredAt - 86400).run();
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/auth/token/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: 'expired-token' }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('rejects missing refresh token', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/auth/token/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // LOGOUT ENDPOINT
  // ========================================

  describe('POST /v1/auth/token/logout', () => {
    it('revokes refresh token on logout', async () => {
      const user = await createTestUser(ctx.db);
      const refreshToken = await createTestRefreshToken(ctx.db, user.id);
      
      // Verify token exists
      const before = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM refresh_tokens WHERE user_id = ?')
        .bind(user.id)
        .first<{ count: number }>();
      expect(before?.count).toBe(1);
      
      // Logout
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
      
      // Verify token was deleted
      const after = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM refresh_tokens WHERE user_id = ?')
        .bind(user.id)
        .first<{ count: number }>();
      expect(after?.count).toBe(0);
    });

    it('handles logout with invalid token gracefully', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/auth/token/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: 'non-existent-token' }),
        }),
        ctx.env,
        executionContext
      );

      // Should succeed (idempotent)
      expect(res.status).toBe(200);
    });
  });

  // ========================================
  // /ME ENDPOINT
  // ========================================

  describe('GET /v1/auth/token/me', () => {
    it('returns user info with valid access token', async () => {
      const user = await createTestUser(ctx.db);
      const accessToken = await signTestAccessToken(user);
      
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
    });

    it('rejects expired access token', async () => {
      const user = await createTestUser(ctx.db);
      const expiredToken = await signExpiredAccessToken(user);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/auth/token/me', {
          method: 'GET',
          headers: authBearerHeaders(expiredToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('rejects missing authorization header', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/auth/token/me', {
          method: 'GET',
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // ACCESS TOKEN EXPIRY HANDLING
  // ========================================

  describe('Access Token Expiry', () => {
    it('new access token has fresh expiry', async () => {
      const user = await createTestUser(ctx.db);
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
      const { accessToken } = await res.json();
      
      // New token should work immediately
      const meRes = await ctx.app.fetch(
        new Request('http://localhost/v1/auth/token/me', {
          method: 'GET',
          headers: authBearerHeaders(accessToken),
        }),
        ctx.env,
        executionContext
      );

      expect(meRes.status).toBe(200);
    });
  });
});

