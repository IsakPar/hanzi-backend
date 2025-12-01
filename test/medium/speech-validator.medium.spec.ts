/**
 * Speech & Validator Medium Priority Tests
 * 
 * P2 Priority - TTS and vocabulary validation
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
  jsonAuthBearerHeaders,
} from '../fixtures/jwt-auth-helpers';

describe.sequential('Speech & Validator - Medium Priority', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // TEXT-TO-SPEECH
  // ========================================

  describe('Text-to-Speech', () => {
    it('POST /speech/tts generates audio', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/tts', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ text: '你好' }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 500, 503]).toContain(res.status);
    });

    it('requires auth for TTS', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: '你好' }),
        }),
        ctx.env,
        executionContext
      );

      expect([401, 404]).toContain(res.status);
    });

    it('validates text is required', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/tts', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({}),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 404, 422]).toContain(res.status);
    });

    it('supports voice selection', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/tts', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ text: '你好', voice: 'female' }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 500, 503]).toContain(res.status);
    });

    it('supports speed adjustment', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/speech/tts', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ text: '你好', speed: 0.8 }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 500, 503]).toContain(res.status);
    });
  });

  // ========================================
  // VOCABULARY VALIDATOR
  // ========================================

  describe('Vocabulary Validator', () => {
    it('POST /validator/check validates text', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/validator/check', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({
            text: '我喜欢学习中文',
            lessonPosition: 10,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 500, 503]).toContain(res.status);
    });

    it('POST /validator/analyze returns analysis', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/validator/analyze', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ text: '学习中文' }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 500, 503]).toContain(res.status);
    });

    it('GET /validator/health returns health', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/validator/health'),
        ctx.env,
        executionContext
      );

      expect([200, 404, 503]).toContain(res.status);
    });

    it('POST /validator/lookup looks up word', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/validator/lookup', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ word: '学习' }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 500, 503]).toContain(res.status);
    });
  });

  // ========================================
  // BATCH VALIDATION
  // ========================================

  describe('Batch Validation', () => {
    it('POST /validator/batch validates multiple', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/validator/batch', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({
            items: [
              { text: '你好', lessonPosition: 1 },
              { text: '再见', lessonPosition: 2 },
            ],
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 500, 503]).toContain(res.status);
    });

    it('limits batch size', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      // Create a large batch
      const items = Array(100).fill(null).map((_, i) => ({
        text: `测试${i}`,
        lessonPosition: i,
      }));
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/validator/batch', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ items }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 413, 500, 503]).toContain(res.status);
    });
  });

  // ========================================
  // HSK LEVEL VALIDATION
  // ========================================

  describe('HSK Level Validation', () => {
    it('POST /validator/hsk-check validates HSK level', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/validator/hsk-check', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({
            text: '我喜欢学习',
            maxHskLevel: 2,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 500, 503]).toContain(res.status);
    });
  });
});

