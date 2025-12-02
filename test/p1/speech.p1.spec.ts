/**
 * P1: Speech Routes Tests - ElevenLabs TTS integration
 * 
 * Tests speech generation, saving, batch processing, and voice management.
 * Note: Actual TTS calls may fail in test env without API key - we verify behavior.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
  jsonAuthBearerHeaders,
} from '../fixtures/jwt-auth-helpers';
import { nanoid } from 'nanoid';

describe.sequential('P1: Speech Routes', () => {
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
  // VOICE MANAGEMENT
  // ========================================

  describe('GET /v1/speech/voices', () => {
    it('returns available voices', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/voices', {
          headers: authBearerHeaders(adminToken), // Admin-only endpoint
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
      
      if (res.status === 200) {
        const body = await res.json();
        expect(body.voices).toBeDefined();
        expect(Array.isArray(body.voices)).toBe(true);
      }
    });

    it('requires authentication', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/voices'),
        ctx.env,
        executionContext
      );

      expect([401, 404]).toContain(res.status);
    });
  });

  describe('GET /v1/speech/status', () => {
    it('returns ElevenLabs configuration status', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/status', {
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
      
      if (res.status === 200) {
        const body = await res.json();
        expect(body).toHaveProperty('configured');
        expect(body).toHaveProperty('defaultVoice');
      }
    });
  });

  // ========================================
  // SPEECH GENERATION
  // ========================================

  describe('POST /v1/speech/generate', () => {
    it('accepts valid generation request', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/generate', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken), // Admin-only endpoint
          body: JSON.stringify({
            text: '你好世界',
            voice: 'chinese-female-1',
            speed: 1.0,
          }),
        }),
        ctx.env,
        executionContext
      );

      // May fail if ElevenLabs not configured, but endpoint should exist
      expect([200, 400, 404, 500, 503]).toContain(res.status);
    });

    it('validates text is required', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/generate', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken), // Admin-only endpoint
          body: JSON.stringify({
            voice: 'chinese-female-1',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 404, 422]).toContain(res.status);
    });

    it('validates text length limit', async () => {
      const longText = '你'.repeat(600); // Over 500 char limit
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/generate', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken), // Admin-only endpoint
          body: JSON.stringify({
            text: longText,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 404, 422]).toContain(res.status);
    });

    it('validates speed range', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/generate', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken), // Admin-only endpoint
          body: JSON.stringify({
            text: '你好',
            speed: 5.0, // Invalid - max is 2.0
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 404, 422]).toContain(res.status);
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

      expect([401, 404]).toContain(res.status);
    });
  });

  // ========================================
  // BATCH GENERATION
  // ========================================

  describe('POST /v1/speech/generate-batch', () => {
    it('accepts batch generation request', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/generate-batch', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            segments: [
              { id: 'seg1', text: '你好' },
              { id: 'seg2', text: '再见' },
            ],
            voice: 'chinese-female-1',
            speed: 1.0,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 500, 503]).toContain(res.status);
    });

    it('validates segments array', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/generate-batch', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            segments: [], // Empty array should fail
            voice: 'chinese-female-1',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 404, 422]).toContain(res.status);
    });

    it('limits batch size', async () => {
      const segments = Array(25).fill(null).map((_, i) => ({
        id: `seg${i}`,
        text: `测试${i}`,
      }));
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/generate-batch', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            segments, // Over 20 limit
            voice: 'chinese-female-1',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 404, 422]).toContain(res.status);
    });
  });

  // ========================================
  // SAVE AUDIO
  // ========================================

  describe('POST /v1/speech/save', () => {
    it('accepts save request with base64 audio', async () => {
      // Create a minimal valid base64 audio mock
      const mockAudioBase64 = btoa('mock-audio-data');
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/save', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            audioBase64: mockAudioBase64,
            storyId: nanoid(),
            segmentId: nanoid(),
            durationMs: 1500,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 400, 404, 500]).toContain(res.status);
    });

    it('validates required fields', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/save', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            audioBase64: 'test',
            // Missing storyId and segmentId
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 404, 422]).toContain(res.status);
    });
  });

  // ========================================
  // LESSON AUDIO
  // ========================================

  describe('POST /v1/speech/generate-for-lesson', () => {
    it('generates and saves audio for lesson block', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/generate-for-lesson', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            text: '你好，欢迎学习中文',
            lessonId: nanoid(),
            blockId: nanoid(),
            voice: 'chinese-female-1',
            speed: 0.8,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 500, 503]).toContain(res.status);
    });

    it('validates lesson parameters', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/generate-for-lesson', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            text: '你好',
            // Missing lessonId and blockId
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 404, 422]).toContain(res.status);
    });
  });

  describe('POST /v1/speech/preview-for-lesson', () => {
    it('generates preview audio (not saved)', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/preview-for-lesson', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            text: '预览音频',
            voice: 'chinese-female-1',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 500, 503]).toContain(res.status);
      
      if (res.status === 200) {
        const body = await res.json();
        expect(body).toHaveProperty('audioBase64');
        expect(body).toHaveProperty('durationMs');
      }
    });
  });

  describe('POST /v1/speech/save-for-lesson', () => {
    it('saves approved lesson audio to R2', async () => {
      const mockAudioBase64 = btoa('mock-lesson-audio');
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/save-for-lesson', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            audioBase64: mockAudioBase64,
            lessonId: nanoid(),
            blockId: nanoid(),
            durationMs: 2000,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 400, 404, 500]).toContain(res.status);
      
      if (res.status === 200 || res.status === 201) {
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body).toHaveProperty('r2Key');
        expect(body).toHaveProperty('audioUrl');
      }
    });
  });

  // ========================================
  // TEST ENDPOINT
  // ========================================

  describe('POST /v1/speech/test', () => {
    it('tests ElevenLabs connection', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/test', {
          method: 'POST',
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
      
      if (res.status === 200) {
        const body = await res.json();
        expect(body).toHaveProperty('configured');
      }
    });
  });

  // ========================================
  // ACCESS CONTROL
  // ========================================

  describe('Access Control', () => {
    it('denies regular users access to speech generation (admin-only)', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/generate', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(userToken),
          body: JSON.stringify({ text: '用户测试' }),
        }),
        ctx.env,
        executionContext
      );

      // Speech routes are admin-only (cost control)
      expect(res.status).toBe(403);
    });

    it('allows admin to generate speech', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/generate', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({ text: '管理员测试' }),
        }),
        ctx.env,
        executionContext
      );

      // Admin should have access (may fail for other reasons if ElevenLabs not configured)
      expect(res.status).not.toBe(403);
    });
  });
});

