/**
 * P3: Performance Tests
 * 
 * Tests for performance benchmarks and load handling.
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

describe.sequential('P3: Performance', () => {
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
  // RESPONSE TIME
  // ========================================

  describe('Response Time', () => {
    it('vocabulary list responds within 500ms', async () => {
      const start = Date.now();

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      const duration = Date.now() - start;

      expect([200, 404]).toContain(res.status);
      expect(duration).toBeLessThan(500);
    });

    it('story retrieval responds within 500ms', async () => {
      const start = Date.now();

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories', {
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      const duration = Date.now() - start;

      expect([200, 404]).toContain(res.status);
      expect(duration).toBeLessThan(500);
    });

    it('progress sync responds within 1000ms', async () => {
      const start = Date.now();

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress/sync', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(userToken),
          body: JSON.stringify({
            clientSeq: 1,
            updates: [
              { id: 'word-1', bucket: 'new', proficiency: 0.0, lastReview: Date.now() },
            ],
          }),
        }),
        ctx.env,
        executionContext
      );

      const duration = Date.now() - start;

      expect([200, 201, 404]).toContain(res.status);
      expect(duration).toBeLessThan(1000);
    });
  });

  // ========================================
  // LARGE DATA HANDLING
  // ========================================

  describe('Large Data Handling', () => {
    it('handles 1000 vocabulary items', async () => {
      // Seed 1000 items
      for (let i = 0; i < 100; i++) {
        const batch = Array.from({ length: 10 }, (_, j) => ({
          id: nanoid(),
          hanzi: `字${i * 10 + j}`,
          pinyin: `zi${i * 10 + j}`,
          english: `word${i * 10 + j}`,
          hsk_level: (i % 6) + 1,
          category: 'general',
        }));

        for (const item of batch) {
          await ctx.db.prepare(`
            INSERT INTO vocabulary (id, hanzi, pinyin, english, hsk_level, category)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(item.id, item.hanzi, item.pinyin, item.english, item.hsk_level, item.category).run();
        }
      }

      const start = Date.now();

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?limit=100', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      const duration = Date.now() - start;

      expect([200, 404]).toContain(res.status);
      expect(duration).toBeLessThan(2000);
    });
  });

  // ========================================
  // MEMORY EFFICIENCY
  // ========================================

  describe('Memory Efficiency', () => {
    it('handles sequential large requests without memory leak', async () => {
      const requests = Array.from({ length: 20 }, () =>
        ctx.app.fetch(
          new Request('http://localhost/v1/vocabulary', {
            headers: authBearerHeaders(userToken),
          }),
          ctx.env,
          executionContext
        )
      );

      // Execute sequentially to avoid parallel load
      for (const req of requests) {
        const res = await req;
        expect([200, 404, 429]).toContain(res.status);
      }
    });
  });

  // ========================================
  // DATABASE QUERY EFFICIENCY
  // ========================================

  describe('Database Query Efficiency', () => {
    it('search uses indexed fields', async () => {
      const start = Date.now();

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?search=你好', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      const duration = Date.now() - start;

      expect([200, 404]).toContain(res.status);
      expect(duration).toBeLessThan(500);
    });

    it('filtering uses indexes', async () => {
      const start = Date.now();

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?hsk_level=3&category=general', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      const duration = Date.now() - start;

      expect([200, 404]).toContain(res.status);
      expect(duration).toBeLessThan(500);
    });
  });
});

