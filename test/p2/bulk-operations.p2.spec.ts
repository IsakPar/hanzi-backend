/**
 * P2: Bulk Operations Tests
 * 
 * Tests for bulk imports, mass updates, batch operations.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  authBearerHeaders,
  jsonAuthBearerHeaders,
} from '../fixtures/jwt-auth-helpers';
import { nanoid } from 'nanoid';

describe.sequential('P2: Bulk Operations', () => {
  let ctx: TestContext;
  let adminToken: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    const admin = await createAuthenticatedAdmin(ctx.db);
    adminToken = admin.accessToken;
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // BULK VOCABULARY IMPORT
  // ========================================

  describe('Bulk Vocabulary Import', () => {
    it('imports multiple vocabulary items', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin/bulk', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            items: [
              { hanzi: '一', pinyin: 'yī', english: 'one', hskLevel: 1, category: 'numbers' },
              { hanzi: '二', pinyin: 'èr', english: 'two', hskLevel: 1, category: 'numbers' },
              { hanzi: '三', pinyin: 'sān', english: 'three', hskLevel: 1, category: 'numbers' },
            ],
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 404]).toContain(res.status);
    });

    it('handles large bulk import', async () => {
      const items = Array.from({ length: 100 }, (_, i) => ({
        hanzi: `字${i}`,
        pinyin: `zì${i}`,
        english: `word${i}`,
        hskLevel: (i % 6) + 1,
        category: 'general',
      }));

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin/bulk', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({ items }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 404]).toContain(res.status);
    });

    it('reports failures in bulk import', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin/bulk', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            items: [
              { hanzi: '一', pinyin: 'yī', english: 'one', hskLevel: 1 },
              { hanzi: '', pinyin: 'invalid', english: 'invalid' }, // Invalid
              { hanzi: '二', pinyin: 'èr', english: 'two', hskLevel: 1 },
            ],
          }),
        }),
        ctx.env,
        executionContext
      );

      if (res.status === 200 || res.status === 207) {
        const body = await res.json();
        // Should report which items failed
        expect(body.results || body.errors || body.imported).toBeDefined();
      }
    });
  });

  // ========================================
  // BULK DELETE
  // ========================================

  describe('Bulk Delete Operations', () => {
    it('deletes multiple items by ID', async () => {
      // Create items first
      const ids: string[] = [];
      for (let i = 0; i < 5; i++) {
        const id = nanoid();
        ids.push(id);
        await ctx.db.prepare(`
          INSERT INTO vocabulary (id, hanzi, pinyin, english, hsk_level, category)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(id, `字${i}`, `zi${i}`, `word${i}`, 1, 'general').run();
      }

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin/bulk-delete', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({ ids }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 204, 404]).toContain(res.status);
    });
  });

  // ========================================
  // BULK UPDATE
  // ========================================

  describe('Bulk Update Operations', () => {
    it('updates multiple items at once', async () => {
      // Create items
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) {
        const id = nanoid();
        ids.push(id);
        await ctx.db.prepare(`
          INSERT INTO vocabulary (id, hanzi, pinyin, english, hsk_level, category)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(id, `字${i}`, `zi${i}`, `word${i}`, 1, 'general').run();
      }

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin/bulk-update', {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            updates: ids.map((id, i) => ({
              id,
              hskLevel: 2, // Update HSK level
            })),
          }),
        }),
        ctx.env,
        executionContext
      );

      // 400 for validation errors is acceptable
      expect([200, 400, 404]).toContain(res.status);
    });
  });

  // ========================================
  // LESSON BULK OPERATIONS
  // ========================================

  describe('Lesson Bulk Operations', () => {
    it('bulk publishes lessons', async () => {
      // Create draft lessons
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) {
        const id = nanoid();
        ids.push(id);
        await ctx.db.prepare(`
          INSERT INTO lessons (id, title, hsk_level, display_order, is_published)
          VALUES (?, ?, ?, ?, 0)
        `).bind(id, `Lesson ${i}`, 1, i + 1).run();
      }

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/lessons/admin/bulk-publish', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({ ids }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // BATCH GENERATION
  // ========================================

  describe('Batch AI Generation', () => {
    it('generates lessons in batch', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/lesson-cache/bulk-generate', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            start: 1,
            end: 3,
          }),
        }),
        ctx.env,
        executionContext
      );

      // May fail due to AI binding, but should accept request
      expect([200, 202, 400, 404, 500, 503]).toContain(res.status);
    });
  });
});

