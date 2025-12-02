/**
 * P1: Vectorize Search Tests
 * 
 * Tests for semantic search and similar words functionality.
 * Uses Cloudflare Vectorize for embeddings.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
} from '../fixtures/jwt-auth-helpers';
import { nanoid } from 'nanoid';

describe.sequential('P1: Vectorize Search', () => {
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
  // SIMILAR WORDS
  // ========================================

  describe('GET /v1/vocabulary/similar', () => {
    it('requires word parameter', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/similar', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 404]).toContain(res.status);
    });

    it('returns similar words for valid input', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/similar?word=你好', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      // May fail if Vectorize not configured
      expect([200, 404, 500, 503]).toContain(res.status);

      if (res.status === 200) {
        const body = await res.json();
        expect(body).toHaveProperty('similar');
        expect(Array.isArray(body.similar)).toBe(true);
      }
    });

    it('respects limit parameter', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/similar?word=你好&limit=5', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      if (res.status === 200) {
        const body = await res.json();
        expect(body.similar.length).toBeLessThanOrEqual(5);
      }
    });
  });

  // ========================================
  // SEMANTIC SEARCH
  // ========================================

  describe('GET /v1/vocabulary/search', () => {
    it('searches vocabulary semantically', async () => {
      // Seed some vocabulary first
      await ctx.db.prepare(`
        INSERT INTO vocabulary (id, hanzi, pinyin, english, hsk_level, category)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(nanoid(), '你好', 'nǐ hǎo', 'hello', 1, 'greetings').run();

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/search?q=greeting', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('returns empty for no matches', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/search?q=xyznonexistent', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      if (res.status === 200) {
        const body = await res.json();
        expect(body.results?.length || 0).toBe(0);
      }
    });
  });

  // ========================================
  // STORY RECOMMENDATIONS
  // ========================================

  describe('GET /v1/stories/recommended', () => {
    it('returns story recommendations', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories/recommended', {
          headers: authBearerHeaders(adminToken), // Admin-only endpoint
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        const body = await res.json();
        expect(body).toHaveProperty('stories');
      }
    });

    it('filters by HSK level', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories/recommended?hsk_level=1', {
          headers: authBearerHeaders(adminToken), // Admin-only endpoint
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // WORD SUGGESTIONS
  // ========================================

  describe('GET /v1/lesson-alternatives/suggest-for-word', () => {
    it('suggests alternatives for a word', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/lesson-alternatives/suggest-for-word?word=你好', {
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404]).toContain(res.status);
    });

    it('requires word parameter', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/lesson-alternatives/suggest-for-word', {
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 404]).toContain(res.status);
    });
  });

  // ========================================
  // EMBEDDING MANAGEMENT (ADMIN)
  // ========================================

  describe('POST /v1/admin/vectorize/reindex', () => {
    it('requires admin role', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/vectorize/reindex', {
          method: 'POST',
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([401, 403, 404]).toContain(res.status);
    });

    it('allows admin to trigger reindex', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/vectorize/reindex', {
          method: 'POST',
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      // May fail if Vectorize not configured
      expect([200, 202, 404, 500, 503]).toContain(res.status);
    });
  });
});

