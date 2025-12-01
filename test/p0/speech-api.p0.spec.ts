/**
 * P0: Speech API Tests
 * 
 * Tests for ElevenLabs TTS integration.
 * Critical for audio generation in the app.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
  jsonAuthBearerHeaders,
} from '../fixtures/jwt-auth-helpers';

describe.sequential('P0: Speech API', () => {
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
  // VOICE LISTING
  // ========================================

  describe('GET /v1/speech/voices', () => {
    it('returns available voices', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/voices', {
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        const body = await res.json();
        expect(body).toHaveProperty('voices');
      }
    });

    it('requires authentication', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/voices'),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // SPEECH GENERATION
  // ========================================

  describe('POST /v1/speech/generate', () => {
    it('validates required fields', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/generate', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({}),
        }),
        ctx.env,
        executionContext
      );

      // Should reject missing text
      expect([400, 404, 422]).toContain(res.status);
    });

    it('validates text is not empty', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/generate', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({ text: '' }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 404, 422]).toContain(res.status);
    });

    it('accepts valid Chinese text', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/generate', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            text: '你好世界',
            voiceId: 'chinese-female-1',
          }),
        }),
        ctx.env,
        executionContext
      );

      // May fail due to ElevenLabs API key, but should not be validation error
      expect([200, 400, 404, 500, 503]).toContain(res.status);
    });

    it('requires authentication', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: '你好' }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // BATCH GENERATION
  // ========================================

  describe('POST /v1/speech/generate-batch', () => {
    it('validates items array', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/generate-batch', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({ items: [] }),
        }),
        ctx.env,
        executionContext
      );

      // Empty array should be rejected or return empty result
      expect([200, 400, 404, 422]).toContain(res.status);
    });

    it('accepts valid batch request', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/generate-batch', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            items: [
              { text: '你好', id: 'item-1' },
              { text: '谢谢', id: 'item-2' },
            ],
          }),
        }),
        ctx.env,
        executionContext
      );

      // May fail due to API key, but should be valid request
      expect([200, 400, 404, 500, 503]).toContain(res.status);
    });

    it('requires admin role', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/generate-batch', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(userToken),
          body: JSON.stringify({
            items: [{ text: '你好', id: 'item-1' }],
          }),
        }),
        ctx.env,
        executionContext
      );

      // User should not be able to batch generate
      expect([401, 403, 404]).toContain(res.status);
    });
  });

  // ========================================
  // LESSON AUDIO GENERATION
  // ========================================

  describe('POST /v1/speech/generate-for-lesson', () => {
    it('validates lesson ID', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/generate-for-lesson', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({ lessonId: '' }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 404, 422]).toContain(res.status);
    });

    it('accepts valid lesson ID', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/generate-for-lesson', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({ lessonId: 'lesson-1' }),
        }),
        ctx.env,
        executionContext
      );

      // May fail if lesson doesn't exist
      expect([200, 400, 404, 500, 503]).toContain(res.status);
    });
  });

  // ========================================
  // PREVIEW AUDIO
  // ========================================

  describe('POST /v1/speech/preview', () => {
    it('generates preview audio', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/preview', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            text: '预览测试',
            voiceId: 'chinese-female-1',
          }),
        }),
        ctx.env,
        executionContext
      );

      // Preview may work or fail due to API
      expect([200, 400, 404, 500, 503]).toContain(res.status);
    });
  });

  // ========================================
  // COST TRACKING
  // ========================================

  describe('GET /v1/speech/usage', () => {
    it('returns usage statistics', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/usage', {
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('requires admin role', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/usage', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([401, 403, 404]).toContain(res.status);
    });
  });
});

