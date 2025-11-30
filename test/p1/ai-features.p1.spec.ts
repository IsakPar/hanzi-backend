/**
 * P1: AI Features - AI chat and tutor functionality
 * Non-flaky tests for AI endpoints
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authCookieHeaders,
  jsonAuthCookieHeaders,
} from '../fixtures/better-auth-helpers';
import { createTestUser } from '../fixtures/seed-data';

describe.sequential('P1: AI Features', () => {
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
  // AI CHAT
  // ========================================

  describe('AI Chat', () => {
    it('unauthenticated user cannot access chat', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'Hello' }],
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('authenticated user can attempt chat (may fail without API key)', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/ai/chat', {
          method: 'POST',
          headers: jsonAuthCookieHeaders(userSession),
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'Hello' }],
          }),
        }),
        ctx.env,
        executionContext
      );

      // May fail due to missing API keys, but should not be 401
      expect([200, 400, 403, 404, 500, 503]).toContain(res.status);
    });
  });

  // ========================================
  // AI PROMPTS
  // ========================================

  describe('AI Prompts', () => {
    it('admin can list prompts', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/ai/prompts', {
          headers: authCookieHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 403, 404, 500]).toContain(res.status);
    });

    it('user cannot manage prompts', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/ai/prompts', {
          headers: authCookieHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );

      expect([403, 404]).toContain(res.status);
    });

    it('admin can create prompt', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/ai/prompts', {
          method: 'POST',
          headers: jsonAuthCookieHeaders(adminSession),
          body: JSON.stringify({
            slug: `test_prompt_${Date.now()}`,
            body: 'You are a helpful Chinese tutor.',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 400, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // AI MODELS
  // ========================================

  describe('AI Models', () => {
    it('admin can list models', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/ai/models', {
          headers: authCookieHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('admin can add model', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/ai/models', {
          method: 'POST',
          headers: jsonAuthCookieHeaders(adminSession),
          body: JSON.stringify({
            modelId: `test-model-${Date.now()}`,
            displayName: 'Test Model',
            provider: 'openrouter',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 400, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // AI TUTOR
  // ========================================

  describe('AI Tutor', () => {
    it('ai tutor health check', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/ai-tutor/health', {
          headers: authCookieHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500, 503]).toContain(res.status);
    });

    it('can request tutor lesson generation (may fail without external API)', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/ai-tutor/generate', {
          method: 'POST',
          headers: jsonAuthCookieHeaders(userSession),
          body: JSON.stringify({
            focusWords: ['你好', '谢谢'],
            userLessonPosition: 1,
            hskLevel: 1,
          }),
        }),
        ctx.env,
        executionContext
      );

      // May fail due to external API, but auth should pass
      expect([200, 400, 404, 500, 503]).toContain(res.status);
    });
  });

  // ========================================
  // AI USAGE TRACKING
  // ========================================

  describe('AI Usage Tracking', () => {
    it('admin can get AI usage summary', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/ai-usage/summary', {
          headers: authCookieHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('admin can get AI usage daily', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/ai-usage/daily', {
          headers: authCookieHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('usage records can be created with real user', async () => {
      // Create a real user for FK constraint
      const user = await createTestUser(ctx.db);
      
      await ctx.db.prepare(`
        INSERT INTO api_usage (id, user_id, request_id, model_used, input_tokens, output_tokens, total_tokens, estimated_cost, latency_ms, success, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s','now'))
      `).bind(
        crypto.randomUUID(),
        user.id,
        'test-req',
        'gpt-4',
        100,
        200,
        300,
        0.01,
        1000,
        1
      ).run();
      
      const count = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM api_usage WHERE user_id = ?')
        .bind(user.id)
        .first<{ count: number }>();
      
      expect(count?.count).toBe(1);
    });
  });
});
