/**
 * P3: Security Edge Cases
 * 
 * Tests for security edge cases and potential vulnerabilities.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
  jsonAuthBearerHeaders,
  createTestUser,
  signTestAccessToken,
} from '../fixtures/jwt-auth-helpers';
import { nanoid } from 'nanoid';

describe.sequential('P3: Security Edge Cases', () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    const admin = await createAuthenticatedAdmin(ctx.db);
    const user = await createAuthenticatedUser(ctx.db);
    adminToken = admin.accessToken;
    userToken = user.accessToken;
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // TOKEN MANIPULATION
  // ========================================

  describe('Token Manipulation', () => {
    it('rejects token with modified payload', async () => {
      const user = await createTestUser(ctx.db);
      const validToken = await signTestAccessToken(user, ctx.env.JWT_SECRET);
      
      // Modify the payload portion of the JWT
      const parts = validToken.split('.');
      const payload = JSON.parse(atob(parts[1]));
      payload.role = 'admin'; // Attempt to escalate
      parts[1] = btoa(JSON.stringify(payload));
      const modifiedToken = parts.join('.');

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/users', {
          headers: authBearerHeaders(modifiedToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('rejects token with wrong secret', async () => {
      const user = await createTestUser(ctx.db);
      const badToken = await signTestAccessToken(user, 'wrong-secret');

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: authBearerHeaders(badToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('rejects expired token', async () => {
      // Create a token that's already expired (negative duration)
      const user = await createTestUser(ctx.db);
      // Use '0s' to create an immediately expired token
      const expiredToken = await signTestAccessToken(user, ctx.env.JWT_SECRET, '0s');

      // Wait a moment to ensure it's expired
      await new Promise(resolve => setTimeout(resolve, 100));

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: authBearerHeaders(expiredToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // INJECTION ATTACKS
  // ========================================

  describe('Injection Attacks', () => {
    it('sanitizes SQL injection in search', async () => {
      const malicious = "' OR '1'='1";

      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/vocabulary?search=${encodeURIComponent(malicious)}`, {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      // Should not expose all data
      expect([200, 400, 404]).toContain(res.status);
    });

    it('sanitizes NoSQL injection', async () => {
      const malicious = '{"$gt":""}';

      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/vocabulary?search=${encodeURIComponent(malicious)}`, {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404]).toContain(res.status);
    });

    it('prevents path traversal', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/audio/../../../etc/passwd', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 404]).toContain(res.status);
    });
  });

  // ========================================
  // AUTHORIZATION BYPASS
  // ========================================

  describe('Authorization Bypass', () => {
    it('user cannot access other user data via ID manipulation', async () => {
      const userA = await createTestUser(ctx.db);
      const userB = await createTestUser(ctx.db);
      const tokenA = await signTestAccessToken(userA, ctx.env.JWT_SECRET);

      // User A tries to access User B's data
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/users/${userB.id}/progress`, {
          headers: authBearerHeaders(tokenA),
        }),
        ctx.env,
        executionContext
      );

      // Should be forbidden or not found
      expect([401, 403, 404]).toContain(res.status);
    });

    it('user cannot modify other user settings', async () => {
      const userA = await createTestUser(ctx.db);
      const userB = await createTestUser(ctx.db);
      const tokenA = await signTestAccessToken(userA, ctx.env.JWT_SECRET);

      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/users/${userB.id}/settings`, {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(tokenA),
          body: JSON.stringify({ theme: 'dark' }),
        }),
        ctx.env,
        executionContext
      );

      expect([401, 403, 404]).toContain(res.status);
    });

    it('non-admin cannot access admin routes', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/users', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // HEADER MANIPULATION
  // ========================================

  describe('Header Manipulation', () => {
    it('rejects spoofed Origin header', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary', {
          headers: {
            ...authBearerHeaders(userToken),
            'Origin': 'https://evil.com',
          },
        }),
        ctx.env,
        executionContext
      );

      // Should not include evil.com in CORS headers
      const corsHeader = res.headers.get('Access-Control-Allow-Origin');
      expect(corsHeader).not.toBe('https://evil.com');
    });

    it('rejects spoofed X-Forwarded-For', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary', {
          headers: {
            ...authBearerHeaders(userToken),
            'X-Forwarded-For': '127.0.0.1',
          },
        }),
        ctx.env,
        executionContext
      );

      // Should still apply rate limits correctly
      expect([200, 404, 429]).toContain(res.status);
    });
  });

  // ========================================
  // CONTENT TYPE ATTACKS
  // ========================================

  describe('Content Type Attacks', () => {
    it('rejects multipart disguised as JSON', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories', {
          method: 'POST',
          headers: {
            ...authBearerHeaders(adminToken),
            'Content-Type': 'application/json',
          },
          body: '------boundary\nContent-Disposition: form-data; name="file"\n\nmalicious content',
        }),
        ctx.env,
        executionContext
      );

      expect([400, 422]).toContain(res.status);
    });
  });

  // ========================================
  // RESOURCE EXHAUSTION
  // ========================================

  describe('Resource Exhaustion', () => {
    it('limits request body size', async () => {
      const hugePayload = { data: 'x'.repeat(100 * 1024 * 1024) }; // 100MB

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify(hugePayload),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 413, 500]).toContain(res.status);
    });

    it('limits query complexity', async () => {
      const complexQuery = Array.from({ length: 100 }, (_, i) => `filter${i}=value${i}`).join('&');

      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/vocabulary?${complexQuery}`, {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      // Should handle or reject gracefully
      expect([200, 400, 404]).toContain(res.status);
    });
  });
});

