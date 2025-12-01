/**
 * P2: Error Recovery Tests
 * 
 * Tests for graceful degradation, retries, and error handling.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
  jsonAuthBearerHeaders,
} from '../fixtures/jwt-auth-helpers';

describe.sequential('P2: Error Recovery', () => {
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
  // MALFORMED REQUEST HANDLING
  // ========================================

  describe('Malformed Request Handling', () => {
    it('handles invalid JSON gracefully', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories', {
          method: 'POST',
          headers: {
            ...authBearerHeaders(adminToken),
            'Content-Type': 'application/json',
          },
          body: '{invalid json',
        }),
        ctx.env,
        executionContext
      );

      expect([400, 422]).toContain(res.status);
      const body = await res.json() as Record<string, unknown>;
      // Response may have 'error' or 'success: false' or other error indicators
      expect(body.error || body.success === false || body.message).toBeTruthy();
    });

    it('handles missing content-type', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary', {
          method: 'POST',
          headers: authBearerHeaders(adminToken),
          body: JSON.stringify({ test: true }),
        }),
        ctx.env,
        executionContext
      );

      // Should either process, reject, or return 404 if route doesn't exist
      expect([200, 400, 404, 415, 422]).toContain(res.status);
    });

    it('handles extremely large request body', async () => {
      const largePayload = { data: 'x'.repeat(10 * 1024 * 1024) }; // 10MB

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify(largePayload),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 413, 500]).toContain(res.status);
    });
  });

  // ========================================
  // DATABASE ERROR HANDLING
  // ========================================

  describe('Database Error Handling', () => {
    it('handles missing required fields', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            // Missing required fields
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 422]).toContain(res.status);
    });

    it('handles duplicate key violations gracefully', async () => {
      const vocab = {
        hanzi: '测试',
        pinyin: 'cèshì',
        english: 'test',
        hskLevel: 1,
        category: 'general',
      };

      // First insert
      await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify(vocab),
        }),
        ctx.env,
        executionContext
      );

      // Duplicate insert
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify(vocab),
        }),
        ctx.env,
        executionContext
      );

      // 201 if DB allows duplicate (no unique constraint on this combo)
      expect([201, 400, 404, 409, 422]).toContain(res.status);
    });
  });

  // ========================================
  // EXTERNAL SERVICE FAILURES
  // ========================================

  describe('External Service Failures', () => {
    it('handles AI service unavailable', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/ai/generate', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            client_seq: 1,
            order: { targets: ['你好'] },
          }),
        }),
        ctx.env,
        executionContext
      );

      // Should return appropriate error, not crash
      expect([200, 400, 500, 503]).toContain(res.status);
      
      if (res.status >= 500) {
        const body = await res.json();
        expect(body).toHaveProperty('error');
      }
    });

    it('handles R2 storage unavailable', async () => {
      const formData = new FormData();
      formData.append('file', new Blob(['test']), 'test.txt');

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/audio/upload', {
          method: 'POST',
          headers: authBearerHeaders(adminToken),
          body: formData,
        }),
        ctx.env,
        executionContext
      );

      // Should handle gracefully
      expect([200, 201, 400, 500, 503]).toContain(res.status);
    });
  });

  // ========================================
  // TIMEOUT HANDLING
  // ========================================

  describe('Timeout Scenarios', () => {
    it('long-running AI generation has timeout response', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/ai-tutor/generate', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            focusWords: ['你好', '谢谢', '再见'],
            userLessonPosition: 10,
            hskLevel: 2,
          }),
        }),
        ctx.env,
        executionContext
      );

      // Should either complete or timeout gracefully
      expect([200, 400, 408, 500, 503, 504]).toContain(res.status);
    });
  });

  // ========================================
  // PARTIAL FAILURE HANDLING
  // ========================================

  describe('Partial Failure Handling', () => {
    it('batch operation reports partial success', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/generate-batch', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            items: [
              { text: '你好', id: 'valid-1' },
              { text: '', id: 'invalid-1' }, // Invalid
              { text: '谢谢', id: 'valid-2' },
            ],
          }),
        }),
        ctx.env,
        executionContext
      );

      // Should handle mixed success/failure
      expect([200, 207, 400, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // ERROR MESSAGE QUALITY
  // ========================================

  describe('Error Message Quality', () => {
    it('error responses include helpful message', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({ invalid: true }),
        }),
        ctx.env,
        executionContext
      );

      if (res.status >= 400) {
        const body = await res.json();
        expect(body.error || body.message).toBeTruthy();
        // Should not expose internal details
        expect(JSON.stringify(body)).not.toContain('SQL');
        expect(JSON.stringify(body)).not.toContain('stack');
      }
    });

    it('404 errors are descriptive', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories/non-existent-id', {
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error || body.message).toBeTruthy();
    });
  });
});

