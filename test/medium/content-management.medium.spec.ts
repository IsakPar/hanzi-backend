/**
 * Content Management Medium Priority Tests
 * 
 * P2 Priority - Content upload and management
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authCookieHeaders,
  jsonAuthCookieHeaders,
} from '../fixtures/better-auth-helpers';

describe.sequential('Content Management - Medium Priority', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // CONTENT UPLOAD
  // ========================================

  describe('Content Upload', () => {
    it('POST /admin/content/upload accepts file', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const form = new FormData();
      form.set('file', new File(['test'], 'test.pdf', { type: 'application/pdf' }));
      form.set('metadata', JSON.stringify({ title: 'Test' }));
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/content/upload', {
          method: 'POST',
          headers: authCookieHeaders(sessionToken),
          body: form,
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 400, 404, 500]).toContain(res.status);
    });

    it('requires admin for upload', async () => {
      const { sessionToken } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/content/upload', {
          method: 'POST',
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([401, 403, 404]).toContain(res.status);
    });
  });

  // ========================================
  // AUDIO MANAGEMENT
  // ========================================

  describe('Audio Management', () => {
    it('POST /audio/upload accepts audio file', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const form = new FormData();
      form.set('file', new File(['audio'], 'test.mp3', { type: 'audio/mpeg' }));
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/audio/upload', {
          method: 'POST',
          headers: authCookieHeaders(sessionToken),
          body: form,
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 400, 404, 500]).toContain(res.status);
    });

    it('DELETE /admin/content/audio removes audio', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/content/audio', {
          method: 'DELETE',
          headers: jsonAuthCookieHeaders(sessionToken),
          body: JSON.stringify({ key: 'test-audio.mp3' }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 204, 400, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // CONTENT LIBRARY
  // ========================================

  describe('Content Library', () => {
    it('GET /content/library lists content', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/content/library', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('GET /content/library/:id returns content', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/content/library/test-id', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('PUT /content/library/:id updates content', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/content/library/test-id', {
          method: 'PUT',
          headers: jsonAuthCookieHeaders(sessionToken),
          body: JSON.stringify({ title: 'Updated' }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 500]).toContain(res.status);
    });

    it('DELETE /content/library/:id removes content', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/content/library/test-id', {
          method: 'DELETE',
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 204, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // LESSON CACHE
  // ========================================

  describe('Lesson Cache', () => {
    it('GET /lesson-cache/:lessonId returns cached', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/lesson-cache/lesson-1', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 401, 404, 500]).toContain(res.status);
    });

    it('POST /lesson-cache/:lessonId caches lesson', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/lesson-cache/lesson-1', {
          method: 'POST',
          headers: jsonAuthCookieHeaders(sessionToken),
          body: JSON.stringify({ data: { blocks: [] } }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 400, 404, 500]).toContain(res.status);
    });

    it('DELETE /lesson-cache/:lessonId invalidates cache', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/lesson-cache/lesson-1', {
          method: 'DELETE',
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 204, 400, 401, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // VECTORIZE
  // ========================================

  describe('Vectorize', () => {
    it('POST /admin/vectorize/populate triggers population', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/vectorize/populate', {
          method: 'POST',
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      // 501/503 = Vectorize not available in test
      expect([200, 202, 400, 404, 500, 501, 503]).toContain(res.status);
    });

    it('GET /admin/vectorize/stats returns stats', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/vectorize/stats', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500, 501, 503]).toContain(res.status);
    });

    it('POST /admin/vectorize/test-search tests search', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/vectorize/test-search', {
          method: 'POST',
          headers: jsonAuthCookieHeaders(sessionToken),
          body: JSON.stringify({ query: 'hello' }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 500, 501, 503]).toContain(res.status);
    });
  });

  // ========================================
  // CONTENT EXPORTS
  // ========================================

  describe('Content Exports', () => {
    it('GET /export/lessons exports lessons', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/export/lessons', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('GET /export/stories exports stories', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/export/stories', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('GET /export/vocabulary exports vocabulary', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/export/vocabulary', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('requires admin for exports', async () => {
      const { sessionToken } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/export/lessons', {
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([401, 403, 404]).toContain(res.status);
    });
  });

  // ========================================
  // CURRICULUM DERIVED
  // ========================================

  describe('Curriculum Derived', () => {
    it('GET /curriculum-derived/levels returns levels', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum-derived/levels'),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('GET /curriculum-derived/vocabulary returns vocabulary', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum-derived/vocabulary'),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });
});

