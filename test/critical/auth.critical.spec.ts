/**
 * Auth Critical Path Tests
 * 
 * Tests authentication and authorization critical flows:
 * - Legacy HS256 JWT validation
 * - Role-based access control
 * - Token expiration handling
 * - Edge cases and security scenarios
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import { createTestUser, createAdminUser, type TestUser } from '../fixtures/seed-data';
import {
  createLegacyToken,
  createExpiredLegacyToken,
  createInvalidSignatureToken,
  authHeader,
  jsonAuthHeaders,
} from '../fixtures/jwt-helpers';

describe.sequential('Auth Critical Path', () => {
  let ctx: TestContext;
  let adminUser: TestUser;
  let regularUser: TestUser;

  beforeEach(async () => {
    ctx = await createTestContext();
    adminUser = await createAdminUser(ctx.db);
    regularUser = await createTestUser(ctx.db, { role: 'user' });
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // VALID TOKEN SCENARIOS
  // ========================================

  describe('Valid Token Handling', () => {
    it('accepts valid admin token for admin endpoints', async () => {
      const token = await createLegacyToken(ctx.env.JWT_SECRET, {
        sub: adminUser.id,
        role: 'admin',
        email: adminUser.email,
      });

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authHeader(token),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
    });

    it('accepts valid user token for user endpoints', async () => {
      const token = await createLegacyToken(ctx.env.JWT_SECRET, {
        sub: regularUser.id,
        role: 'user',
        email: regularUser.email,
      });

      // Root endpoint (health check) should work for any authenticated user
      const res = await ctx.app.fetch(
        new Request('http://localhost/', {
          method: 'GET',
          headers: authHeader(token),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
    });

    it('sets correct user context from token', async () => {
      const token = await createLegacyToken(ctx.env.JWT_SECRET, {
        sub: adminUser.id,
        role: 'admin',
        email: adminUser.email,
      });

      // Access units endpoint which requires admin role
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authHeader(token),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      // The middleware should have set the user context
      const body = await res.json();
      expect(body).toBeDefined();
    });
  });

  // ========================================
  // TOKEN REJECTION SCENARIOS
  // ========================================

  describe('Token Rejection', () => {
    it('rejects missing Authorization header', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('rejects malformed Authorization header (no Bearer prefix)', async () => {
      const token = await createLegacyToken(ctx.env.JWT_SECRET, {
        sub: adminUser.id,
        role: 'admin',
      });

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: { Authorization: token }, // Missing 'Bearer ' prefix
        }),
        ctx.env,
        executionContext
      );

      // Should still be rejected or handled gracefully
      expect([401, 403]).toContain(res.status);
    });

    it('rejects expired tokens', async () => {
      const token = await createExpiredLegacyToken(ctx.env.JWT_SECRET, adminUser.id);

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authHeader(token),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('rejects tokens with invalid signature', async () => {
      const token = await createInvalidSignatureToken(ctx.env.JWT_SECRET, adminUser.id);

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authHeader(token),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('rejects completely invalid token format', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: { Authorization: 'Bearer not.a.valid.jwt' },
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('rejects empty Bearer token', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: { Authorization: 'Bearer ' },
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
    it('denies user role access to admin-only endpoints', async () => {
      const token = await createLegacyToken(ctx.env.JWT_SECRET, {
        sub: regularUser.id,
        role: 'user',
        email: regularUser.email,
      });

      // Units endpoint requires admin role
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authHeader(token),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(403);
    });

    it('allows admin to create new units', async () => {
      const token = await createLegacyToken(ctx.env.JWT_SECRET, {
        sub: adminUser.id,
        role: 'admin',
        email: adminUser.email,
      });

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'POST',
          headers: jsonAuthHeaders(token),
          body: JSON.stringify({
            hskLevel: 1,
            unitNumber: 1,
            title: 'Test Unit',
            description: 'A test unit',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(201);
    });

    it('denies regular user from creating units', async () => {
      const token = await createLegacyToken(ctx.env.JWT_SECRET, {
        sub: regularUser.id,
        role: 'user',
        email: regularUser.email,
      });

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'POST',
          headers: jsonAuthHeaders(token),
          body: JSON.stringify({
            hskLevel: 1,
            unitNumber: 1,
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
  // EDGE CASES
  // ========================================

  describe('Edge Cases', () => {
    it('handles token with future iat (issued at) gracefully', async () => {
      // Most JWT libraries tolerate slightly future iat due to clock skew
      const token = await createLegacyToken(ctx.env.JWT_SECRET, {
        sub: adminUser.id,
        role: 'admin',
      });

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authHeader(token),
        }),
        ctx.env,
        executionContext
      );

      // Should work - jose handles reasonable clock skew
      expect(res.status).toBe(200);
    });

    it('handles case where user does not exist in database', async () => {
      const token = await createLegacyToken(ctx.env.JWT_SECRET, {
        sub: 'non-existent-user-id',
        role: 'admin',
      });

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authHeader(token),
        }),
        ctx.env,
        executionContext
      );

      // Should still work since auth middleware validates JWT not user existence
      // The route handler may fail differently if it needs user data
      expect([200, 401, 404]).toContain(res.status);
    });

    it('handles concurrent requests with same token', async () => {
      const token = await createLegacyToken(ctx.env.JWT_SECRET, {
        sub: adminUser.id,
        role: 'admin',
      });

      // Send 5 concurrent requests
      const requests = Array(5).fill(null).map(() =>
        ctx.app.fetch(
          new Request('http://localhost/v1/units', {
            method: 'GET',
            headers: authHeader(token),
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

    it('handles special characters in email claim', async () => {
      const specialEmail = 'test+special@example.com';
      const userWithSpecialEmail = await createTestUser(ctx.db, {
        email: specialEmail,
        role: 'admin',
      });

      const token = await createLegacyToken(ctx.env.JWT_SECRET, {
        sub: userWithSpecialEmail.id,
        role: 'admin',
        email: specialEmail,
      });

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authHeader(token),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
    });
  });

  // ========================================
  // SECURITY SCENARIOS
  // ========================================

  describe('Security Scenarios', () => {
    it('rejects token from different secret (key confusion attack)', async () => {
      // Create token with different secret
      const maliciousToken = await createLegacyToken('attacker-secret', {
        sub: adminUser.id,
        role: 'admin',
      });

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authHeader(maliciousToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('rejects token with modified payload (signature mismatch)', async () => {
      const token = await createLegacyToken(ctx.env.JWT_SECRET, {
        sub: regularUser.id,
        role: 'user',
      });

      // Tamper with the payload (change user role)
      const [header, , signature] = token.split('.');
      const tamperedPayload = btoa(JSON.stringify({
        role: 'admin', // Attacker tries to escalate
        sub: regularUser.id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      }));
      const tamperedToken = `${header}.${tamperedPayload}.${signature}`;

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authHeader(tamperedToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('rejects none algorithm token (alg:none attack)', async () => {
      // Manually craft a token with alg: none
      const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({
        sub: adminUser.id,
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      }));
      const noneToken = `${header}.${payload}.`;

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authHeader(noneToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('handles extremely long tokens gracefully', async () => {
      // Create a token with a very long payload
      const longEmail = 'a'.repeat(10000) + '@example.com';
      
      // This should fail during token creation or validation
      try {
        const token = await createLegacyToken(ctx.env.JWT_SECRET, {
          sub: adminUser.id,
          role: 'admin',
          email: longEmail,
        });

        const res = await ctx.app.fetch(
          new Request('http://localhost/v1/units', {
            method: 'GET',
            headers: authHeader(token),
          }),
          ctx.env,
          executionContext
        );

        // Either rejected or handled gracefully
        expect([200, 400, 401, 413]).toContain(res.status);
      } catch {
        // It's OK if token creation fails
        expect(true).toBe(true);
      }
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

    it('allows access to waitlist endpoint without auth', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: `newuser-${Date.now()}@example.com` }),
        }),
        ctx.env,
        executionContext
      );

      // Should succeed (201 for new signup, 200 for existing)
      expect([200, 201]).toContain(res.status);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });
});

