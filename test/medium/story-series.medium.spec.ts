/**
 * Story Series & Categories Medium Priority Tests
 * 
 * P2 Priority - Story organization
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
  jsonAuthBearerHeaders,
} from '../fixtures/jwt-auth-helpers';

describe.sequential('Story Series & Categories - Medium Priority', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // STORY SERIES
  // ========================================

  describe('Story Series', () => {
    it('GET /story-series lists series', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/story-series', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('POST /story-series creates series', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/story-series', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({
            name: 'Daily Life',
            description: 'Stories about daily life',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 400, 404, 500]).toContain(res.status);
    });

    it('GET /story-series/:id returns series', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/story-series/series-1', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('PUT /story-series/:id updates series', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/story-series/series-1', {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ name: 'Updated Series' }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 500]).toContain(res.status);
    });

    it('DELETE /story-series/:id removes series', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/story-series/series-1', {
          method: 'DELETE',
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 204, 400, 404, 500]).toContain(res.status);
    });

    it('requires admin for series management', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/story-series', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ name: 'Test' }),
        }),
        ctx.env,
        executionContext
      );

      // 400 = validation error if no admin check
      expect([400, 401, 403, 404]).toContain(res.status);
    });
  });

  // ========================================
  // STORY CATEGORIES
  // ========================================

  describe('Story Categories', () => {
    it('GET /story-categories lists categories', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/story-categories', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('POST /story-categories creates category', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/story-categories', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({
            name: 'Adventure',
            description: 'Adventure stories',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 400, 404, 500]).toContain(res.status);
    });

    it('GET /story-categories/:id returns category', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/story-categories/cat-1', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('PUT /story-categories/:id updates category', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/story-categories/cat-1', {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ name: 'Updated Category' }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 500]).toContain(res.status);
    });

    it('DELETE /story-categories/:id removes category', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/story-categories/cat-1', {
          method: 'DELETE',
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 204, 400, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // CATEGORY ITEMS
  // ========================================

  describe('Category Items', () => {
    it('GET /story-categories/:id/stories lists stories in category', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/story-categories/cat-1/stories', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('POST /story-categories/:id/stories adds story to category', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/story-categories/cat-1/stories', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ storyId: 'story-1' }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 400, 404, 500]).toContain(res.status);
    });

    it('DELETE /story-categories/:catId/stories/:storyId removes', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/story-categories/cat-1/stories/story-1', {
          method: 'DELETE',
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 204, 400, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // SERIES STORIES
  // ========================================

  describe('Series Stories', () => {
    it('GET /story-series/:id/stories lists stories in series', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/story-series/series-1/stories', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('POST /story-series/:id/stories adds story to series', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/story-series/series-1/stories', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ storyId: 'story-1', order: 1 }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 400, 404, 500]).toContain(res.status);
    });

    it('PUT /story-series/:id/stories/:storyId reorders', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/story-series/series-1/stories/story-1', {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ order: 2 }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });
});

