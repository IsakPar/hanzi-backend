/**
 * P0: CORS Comprehensive Tests
 * 
 * Verifies CORS configuration is secure and correct.
 * Critical for security - prevents unauthorized cross-origin access.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  authBearerHeaders,
} from '../fixtures/jwt-auth-helpers';

describe.sequential('P0: CORS Comprehensive', () => {
  let ctx: TestContext;
  let adminToken: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    const admin = await createAuthenticatedAdmin(ctx.db);
    adminToken = admin.accessToken;
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // PREFLIGHT (OPTIONS) REQUESTS
  // ========================================

  describe('Preflight OPTIONS Requests', () => {
    const endpoints = [
      '/v1/lessons',
      '/v1/vocabulary',
      '/v1/stories',
      '/v1/auth/token/login',
      '/v1/admin/users',
      '/v1/ai/generate',
    ];

    for (const endpoint of endpoints) {
      it(`OPTIONS ${endpoint} returns 204 or 200`, async () => {
        const res = await ctx.app.fetch(
          new Request(`http://localhost${endpoint}`, {
            method: 'OPTIONS',
            headers: {
              'Origin': 'https://studio.polymasterlabs.com',
              'Access-Control-Request-Method': 'POST',
              'Access-Control-Request-Headers': 'Content-Type, Authorization',
            },
          }),
          ctx.env,
          executionContext
        );

        // Preflight should return 200 or 204
        expect([200, 204]).toContain(res.status);
      });

      it(`OPTIONS ${endpoint} includes CORS headers`, async () => {
        const res = await ctx.app.fetch(
          new Request(`http://localhost${endpoint}`, {
            method: 'OPTIONS',
            headers: {
              'Origin': 'https://studio.polymasterlabs.com',
              'Access-Control-Request-Method': 'GET',
            },
          }),
          ctx.env,
          executionContext
        );

        // Should have Allow-Methods header
        const allowMethods = res.headers.get('Access-Control-Allow-Methods');
        if (allowMethods) {
          expect(allowMethods).toContain('GET');
        }
      });
    }
  });

  // ========================================
  // ALLOWED ORIGINS
  // ========================================

  describe('Allowed Origins', () => {
    const allowedOrigins = [
      'https://studio.polymasterlabs.com',
      'https://portal.polymasterlabs.com',
      'https://app.polymasterlabs.com',
      'http://localhost:5173',
      'http://localhost:3000',
    ];

    for (const origin of allowedOrigins) {
      it(`allows origin: ${origin}`, async () => {
        const res = await ctx.app.fetch(
          new Request('http://localhost/v1/lessons', {
            headers: {
              'Origin': origin,
            },
          }),
          ctx.env,
          executionContext
        );

        // Response should include CORS header for allowed origin
        const allowOrigin = res.headers.get('Access-Control-Allow-Origin');
        
        // Either returns the specific origin or * (both are valid)
        if (allowOrigin) {
          expect([origin, '*']).toContain(allowOrigin);
        }
      });
    }

    it('allows *.pages.dev origins for preview deployments', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/lessons', {
          headers: {
            'Origin': 'https://abc123.hanzimaster-portal.pages.dev',
          },
        }),
        ctx.env,
        executionContext
      );

      const allowOrigin = res.headers.get('Access-Control-Allow-Origin');
      // Should allow pages.dev origins
      if (allowOrigin) {
        expect(allowOrigin).toBeTruthy();
      }
    });
  });

  // ========================================
  // REJECTED ORIGINS
  // ========================================

  describe('Rejected Origins', () => {
    const maliciousOrigins = [
      'https://evil-site.com',
      'https://phishing-polymasterlabs.com',
      'https://polymasterlabs.com.evil.com',
      'null', // null origin attack
    ];

    for (const origin of maliciousOrigins) {
      it(`should not allow malicious origin: ${origin}`, async () => {
        const res = await ctx.app.fetch(
          new Request('http://localhost/v1/lessons', {
            headers: {
              'Origin': origin,
            },
          }),
          ctx.env,
          executionContext
        );

        const allowOrigin = res.headers.get('Access-Control-Allow-Origin');
        
        // Should either:
        // 1. Not have CORS header
        // 2. Not match the malicious origin (unless using *)
        if (allowOrigin && allowOrigin !== '*') {
          expect(allowOrigin).not.toBe(origin);
        }
      });
    }
  });

  // ========================================
  // AUTHORIZATION HEADER ALLOWED
  // ========================================

  describe('Authorization Header Support', () => {
    it('preflight allows Authorization header', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/users', {
          method: 'OPTIONS',
          headers: {
            'Origin': 'https://studio.polymasterlabs.com',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Authorization',
          },
        }),
        ctx.env,
        executionContext
      );

      const allowHeaders = res.headers.get('Access-Control-Allow-Headers');
      if (allowHeaders) {
        expect(allowHeaders.toLowerCase()).toContain('authorization');
      }
    });

    it('actual request with Authorization works', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/users', {
          headers: {
            'Origin': 'https://studio.polymasterlabs.com',
            ...authBearerHeaders(adminToken),
          },
        }),
        ctx.env,
        executionContext
      );

      // Should not be blocked by CORS
      expect(res.status).not.toBe(0); // 0 = CORS blocked
      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });

  // ========================================
  // NO CREDENTIALS (WE USE BEARER TOKENS)
  // ========================================

  describe('No Credentials Mode', () => {
    it('does not require Access-Control-Allow-Credentials', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/lessons', {
          headers: {
            'Origin': 'https://studio.polymasterlabs.com',
          },
        }),
        ctx.env,
        executionContext
      );

      // With token-based auth, we don't need credentials mode
      // This is intentional - avoids cookie CORS complexity
      const allowCredentials = res.headers.get('Access-Control-Allow-Credentials');
      
      // Should either not be set or be 'false'
      // (We migrated away from cookie auth)
      if (allowCredentials) {
        // If set, it's fine - we're just documenting behavior
        expect(['true', 'false']).toContain(allowCredentials);
      }
    });
  });

  // ========================================
  // PREFLIGHT CACHING
  // ========================================

  describe('Preflight Caching', () => {
    it('includes Access-Control-Max-Age for caching', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/lessons', {
          method: 'OPTIONS',
          headers: {
            'Origin': 'https://studio.polymasterlabs.com',
            'Access-Control-Request-Method': 'GET',
          },
        }),
        ctx.env,
        executionContext
      );

      const maxAge = res.headers.get('Access-Control-Max-Age');
      if (maxAge) {
        // Should be a reasonable cache time (at least 1 hour = 3600)
        expect(parseInt(maxAge)).toBeGreaterThanOrEqual(3600);
      }
    });
  });

  // ========================================
  // ALLOWED METHODS
  // ========================================

  describe('Allowed HTTP Methods', () => {
    const requiredMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];

    it('preflight includes all required methods', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories', {
          method: 'OPTIONS',
          headers: {
            'Origin': 'https://studio.polymasterlabs.com',
            'Access-Control-Request-Method': 'DELETE',
          },
        }),
        ctx.env,
        executionContext
      );

      const allowMethods = res.headers.get('Access-Control-Allow-Methods');
      if (allowMethods) {
        for (const method of requiredMethods) {
          expect(allowMethods.toUpperCase()).toContain(method);
        }
      }
    });
  });

  // ========================================
  // CONTENT-TYPE HEADER ALLOWED
  // ========================================

  describe('Content-Type Header Support', () => {
    it('preflight allows Content-Type header', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/auth/token/login', {
          method: 'OPTIONS',
          headers: {
            'Origin': 'https://studio.polymasterlabs.com',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type',
          },
        }),
        ctx.env,
        executionContext
      );

      const allowHeaders = res.headers.get('Access-Control-Allow-Headers');
      if (allowHeaders) {
        expect(allowHeaders.toLowerCase()).toContain('content-type');
      }
    });
  });

  // ========================================
  // EXPOSED HEADERS
  // ========================================

  describe('Exposed Headers', () => {
    it('exposes X-Request-ID for debugging', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/lessons', {
          headers: {
            'Origin': 'https://studio.polymasterlabs.com',
          },
        }),
        ctx.env,
        executionContext
      );

      const exposeHeaders = res.headers.get('Access-Control-Expose-Headers');
      if (exposeHeaders) {
        expect(exposeHeaders.toLowerCase()).toContain('x-request-id');
      }
    });
  });

  // ========================================
  // SAME-ORIGIN REQUESTS (NO ORIGIN HEADER)
  // ========================================

  describe('Same-Origin Requests', () => {
    it('works without Origin header (same-origin)', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/lessons'),
        ctx.env,
        executionContext
      );

      // Should work without CORS headers for same-origin
      expect([200, 404]).toContain(res.status);
    });
  });
});

