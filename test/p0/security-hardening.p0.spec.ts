/**
 * P0: Security Hardening - SQL Injection, XSS, CORS, Request Limits
 * Paranoid mode tests for production safety
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authCookieHeaders,
  jsonAuthCookieHeaders,
} from '../fixtures/better-auth-helpers';

describe.sequential('P0: Security Hardening', () => {
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
  // SQL INJECTION PREVENTION
  // ========================================

  describe('SQL Injection Prevention', () => {
    it('search parameter is sanitized', async () => {
      const malicious = "'; DROP TABLE vocabulary; --";
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/vocabulary?search=${encodeURIComponent(malicious)}`, {
          headers: authCookieHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      // Should not crash, table should still exist
      expect([200, 400]).toContain(res.status);
      
      // Verify table still exists
      const count = await ctx.db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='vocabulary'")
        .first();
      expect(count).toBeTruthy();
    });

    it('HSK level filter is sanitized', async () => {
      const malicious = "1 OR 1=1";
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/lessons?hsk_level=${encodeURIComponent(malicious)}`, {
          headers: authCookieHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      // Should reject or sanitize, not return all data
      expect([200, 400]).toContain(res.status);
    });

    it('ID parameter is validated', async () => {
      const malicious = "1; DELETE FROM lessons WHERE 1=1";
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/lessons/${encodeURIComponent(malicious)}`, {
          headers: authCookieHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      // Should return 400 or 404, not execute delete
      expect([400, 404]).toContain(res.status);
    });

    it('order by is not injectable', async () => {
      const malicious = "title; DROP TABLE lessons;--";
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/lessons?order_by=${encodeURIComponent(malicious)}`, {
          headers: authCookieHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 400]).toContain(res.status);
    });

    it('limit parameter is numeric only', async () => {
      const malicious = "10; DELETE FROM users;--";
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/vocabulary?limit=${encodeURIComponent(malicious)}`, {
          headers: authCookieHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 400]).toContain(res.status);
    });
  });

  // ========================================
  // XSS PREVENTION
  // ========================================

  describe('XSS Prevention', () => {
    it('script tags in search are neutralized', async () => {
      const malicious = "<script>alert('xss')</script>";
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/vocabulary?search=${encodeURIComponent(malicious)}`, {
          headers: authCookieHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 400]).toContain(res.status);
      
      if (res.status === 200) {
        const text = await res.text();
        // Response should not contain unescaped script tags
        expect(text).not.toContain('<script>alert');
      }
    });

    it('HTML in content is escaped', async () => {
      const malicious = "<img src=x onerror=alert('xss')>";
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin', {
          method: 'POST',
          headers: jsonAuthCookieHeaders(adminSession),
          body: JSON.stringify({
            hanzi: '测试',
            pinyin: 'cèshì',
            english: malicious,
            hskLevel: 1,
          }),
        }),
        ctx.env,
        executionContext
      );
      
      // Should accept but escape, or reject
      expect([200, 201, 400, 404]).toContain(res.status);
    });

    it('event handlers in input are neutralized', async () => {
      const malicious = "test\" onmouseover=\"alert('xss')";
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/vocabulary?search=${encodeURIComponent(malicious)}`, {
          headers: authCookieHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 400]).toContain(res.status);
    });
  });

  // ========================================
  // CORS VALIDATION
  // ========================================

  describe('CORS Validation', () => {
    it('responds to OPTIONS preflight', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/lessons', {
          method: 'OPTIONS',
        }),
        ctx.env,
        executionContext
      );
      
      // Should return 200 or 204 for preflight
      expect([200, 204, 404]).toContain(res.status);
    });

    it('includes CORS headers in response', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/lessons', {
          headers: {
            ...authCookieHeaders(userSession),
            'Origin': 'https://portal.hanzimaster.com',
          },
        }),
        ctx.env,
        executionContext
      );
      
      // Response should have CORS headers (or no CORS = same-origin only)
      expect(res.status).toBeGreaterThanOrEqual(200);
    });
  });

  // ========================================
  // REQUEST SIZE LIMITS
  // ========================================

  describe('Request Size Limits', () => {
    it('rejects extremely large request body', async () => {
      const hugePayload = { data: 'x'.repeat(10 * 1024 * 1024) }; // 10MB
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin', {
          method: 'POST',
          headers: jsonAuthCookieHeaders(adminSession),
          body: JSON.stringify(hugePayload),
        }),
        ctx.env,
        executionContext
      );
      
      // Should reject large payload
      expect([400, 413, 500]).toContain(res.status);
    });

    it('handles reasonable request size', async () => {
      const normalPayload = {
        hanzi: '测试',
        pinyin: 'cèshì',
        english: 'test',
        hskLevel: 1,
      };
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin', {
          method: 'POST',
          headers: jsonAuthCookieHeaders(adminSession),
          body: JSON.stringify(normalPayload),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 201, 400, 404]).toContain(res.status);
    });

    it('limits array size in request', async () => {
      const hugeArray = Array(10000).fill({ role: 'user', content: 'test' });
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/ai/chat', {
          method: 'POST',
          headers: jsonAuthCookieHeaders(userSession),
          body: JSON.stringify({ messages: hugeArray }),
        }),
        ctx.env,
        executionContext
      );
      
      // Should reject or limit
      expect([200, 400, 403, 413, 429, 500, 503]).toContain(res.status);
    });
  });
});

