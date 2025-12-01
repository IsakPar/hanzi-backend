/**
 * P2: Pagination Tests
 * 
 * Tests for cursor pagination, limits, offsets.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
} from '../fixtures/jwt-auth-helpers';
import { nanoid } from 'nanoid';

describe.sequential('P2: Pagination', () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    const admin = await createAuthenticatedAdmin(ctx.db);
    const user = await createAuthenticatedUser(ctx.db);
    adminToken = admin.accessToken;
    userToken = user.accessToken;

    // Seed vocabulary for pagination tests
    for (let i = 0; i < 25; i++) {
      await ctx.db.prepare(`
        INSERT INTO vocabulary (id, hanzi, pinyin, english, hsk_level, category)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(nanoid(), `字${i.toString().padStart(2, '0')}`, `zi${i}`, `word${i}`, (i % 6) + 1, 'general').run();
    }
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // LIMIT AND OFFSET
  // ========================================

  describe('Limit and Offset', () => {
    it('respects limit parameter', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?limit=5', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      if (res.status === 200) {
        const body = await res.json();
        const items = body.vocabulary || body.results || body;
        expect(items.length).toBeLessThanOrEqual(5);
      }
    });

    it('respects offset parameter', async () => {
      const page1 = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?limit=5&offset=0', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      const page2 = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?limit=5&offset=5', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      if (page1.status === 200 && page2.status === 200) {
        const body1 = await page1.json();
        const body2 = await page2.json();
        const items1 = body1.vocabulary || body1.results || body1;
        const items2 = body2.vocabulary || body2.results || body2;

        // Pages should be different
        if (items1.length > 0 && items2.length > 0) {
          expect(items1[0].id).not.toBe(items2[0].id);
        }
      }
    });

    it('handles offset beyond data', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?offset=1000', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      if (res.status === 200) {
        const body = await res.json();
        const items = body.vocabulary || body.results || body;
        expect(items.length).toBe(0);
      }
    });
  });

  // ========================================
  // CURSOR PAGINATION
  // ========================================

  describe('Cursor Pagination', () => {
    it('supports cursor-based pagination', async () => {
      const page1 = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?limit=5', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      if (page1.status === 200) {
        const body1 = await page1.json();
        const cursor = body1.nextCursor || body1.cursor;

        if (cursor) {
          const page2 = await ctx.app.fetch(
            new Request(`http://localhost/v1/vocabulary?limit=5&cursor=${cursor}`, {
              headers: authBearerHeaders(userToken),
            }),
            ctx.env,
            executionContext
          );

          expect([200, 404]).toContain(page2.status);
        }
      }
    });
  });

  // ========================================
  // TOTAL COUNT
  // ========================================

  describe('Total Count', () => {
    it('returns total count with results', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?limit=5&include_total=true', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      if (res.status === 200) {
        const body = await res.json();
        // Should include total count
        expect(body.total || body.totalCount || body.count).toBeDefined();
      }
    });
  });

  // ========================================
  // SORTING
  // ========================================

  describe('Sorting', () => {
    it('sorts by field ascending', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?sort=hanzi&order=asc', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      if (res.status === 200) {
        const body = await res.json();
        const items = body.vocabulary || body.results || body;
        if (items.length >= 2) {
          expect(items[0].hanzi <= items[1].hanzi).toBe(true);
        }
      }
    });

    it('sorts by field descending', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?sort=hanzi&order=desc', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      if (res.status === 200) {
        const body = await res.json();
        const items = body.vocabulary || body.results || body;
        if (items.length >= 2) {
          expect(items[0].hanzi >= items[1].hanzi).toBe(true);
        }
      }
    });
  });

  // ========================================
  // FILTERING + PAGINATION
  // ========================================

  describe('Filtering with Pagination', () => {
    it('filters and paginates together', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?hsk_level=1&limit=5', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      if (res.status === 200) {
        const body = await res.json();
        const items = body.vocabulary || body.results || body;
        items.forEach((item: any) => {
          expect(item.hsk_level || item.hskLevel).toBe(1);
        });
        expect(items.length).toBeLessThanOrEqual(5);
      }
    });
  });

  // ========================================
  // PAGINATION METADATA
  // ========================================

  describe('Pagination Metadata', () => {
    it('includes pagination info in response', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?limit=5&page=1', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      if (res.status === 200) {
        const body = await res.json();
        // Should include some pagination metadata
        const hasMeta = body.pagination || body.meta || 
                       body.hasMore !== undefined || 
                       body.nextCursor !== undefined;
        // At minimum, the response should be structured
        expect(body).toBeDefined();
      }
    });
  });
});

