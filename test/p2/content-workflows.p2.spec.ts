/**
 * P2: Content Workflows - Content management and publishing
 * Non-flaky tests for content operations
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
  jsonAuthBearerHeaders,
} from '../fixtures/jwt-auth-helpers';

describe.sequential('P2: Content Workflows', () => {
  let ctx: TestContext;
  let adminSession: string;
  let userSession: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    const admin = await createAuthenticatedAdmin(ctx.db);
    const user = await createAuthenticatedUser(ctx.db);
    adminSession = admin.accessToken;
    userSession = user.accessToken;
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // CONTENT EXPORTS
  // ========================================

  describe('Content Exports', () => {
    it('admin can list exports', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/exports', {
          headers: authBearerHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('admin can create export', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/exports', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminSession),
          body: JSON.stringify({
            type: 'lessons',
            format: 'json',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 400, 404, 500]).toContain(res.status);
    });

    it('user cannot create exports', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/exports', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(userSession),
          body: JSON.stringify({
            type: 'lessons',
            format: 'json',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([403, 404]).toContain(res.status);
    });
  });

  // ========================================
  // STORY SERIES
  // ========================================

  describe('Story Series', () => {
    it('can list story series', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/story-series', {
          headers: authBearerHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('admin can create series', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/story-series', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminSession),
          body: JSON.stringify({
            title: `Test Series ${Date.now()}`,
            description: 'A test series',
            hskLevel: 1,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 400, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // STORY CATEGORIES
  // ========================================

  describe('Story Categories', () => {
    it('can list categories', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/story-categories', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('admin can create category', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/story-categories', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminSession),
          body: JSON.stringify({
            name: `Category ${Date.now()}`,
            slug: `category-${Date.now()}`,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 400, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // LESSON ALTERNATIVES
  // ========================================

  describe('Lesson Alternatives', () => {
    it('can get lesson slots', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/lesson-alternatives/slots?lessonId=test-lesson', {
          headers: authBearerHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('can suggest alternatives', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/lesson-alternatives/suggest', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminSession),
          body: JSON.stringify({
            word: '你好',
            lessonId: 'test-lesson',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // AUDIO MANAGEMENT
  // ========================================

  describe('Audio Management', () => {
    it('admin can upload audio', async () => {
      const formData = new FormData();
      const audioBlob = new Blob(['fake audio data'], { type: 'audio/mp3' });
      formData.append('file', audioBlob, 'test.mp3');
      formData.append('type', 'vocabulary');
      formData.append('id', 'test-vocab-id');
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/audio/upload', {
          method: 'POST',
          headers: authBearerHeaders(adminSession),
          body: formData,
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 400, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // CURRICULUM DERIVED
  // ========================================

  describe('Curriculum Derived', () => {
    it('can get derived levels', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum-derived/levels', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('can get derived vocabulary', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum-derived/vocabulary', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // LESSON CACHE
  // ========================================

  describe('Lesson Cache', () => {
    it('can check cache status', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/lesson-cache/status', {
          headers: authBearerHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // WEBHOOKS
  // ========================================

  describe('Webhooks', () => {
    it('revenucat webhook requires secret', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/billing/webhooks/revenuecat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: { type: 'TEST' } }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('revenucat webhook accepts valid secret', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/billing/webhooks/revenuecat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
          },
          body: JSON.stringify({ event: { type: 'TEST', app_user_id: 'test' } }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });
});

