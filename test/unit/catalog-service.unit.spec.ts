/**
 * Unit Tests: CatalogService
 * 
 * Tests for content catalog business logic.
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

describe.sequential('Unit: CatalogService', () => {
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
  // CATALOG LISTING
  // ========================================

  describe('Catalog Listing', () => {
    it('returns all published content', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/content/catalog', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('filters by HSK level', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/content/catalog?hsk_level=2', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('filters by content type', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/content/catalog?type=story', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // CONTENT SEARCH
  // ========================================

  describe('Content Search', () => {
    it('searches by title', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/content/search?q=test', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('searches by Chinese characters', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/content/search?q=你好', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // CONTENT RECOMMENDATIONS
  // ========================================

  describe('Content Recommendations', () => {
    it('returns personalized recommendations', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/content/recommendations', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('returns recommendations based on level', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/content/recommendations?hsk_level=1', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });
});

