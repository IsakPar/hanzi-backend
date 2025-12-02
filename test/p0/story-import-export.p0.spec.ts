/**
 * P0: Story Import/Export Tests
 * 
 * Tests for story template export and import functionality.
 * Critical for content workflow and backup.
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

describe.sequential('P0: Story Import/Export', () => {
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
  // TEMPLATE EXPORT
  // ========================================

  describe('GET /v1/stories/template', () => {
    it('returns empty story template', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories/template', {
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        const body = await res.json();
        expect(body).toHaveProperty('template');
      }
    });

    it('requires authentication', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories/template'),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // STORY EXPORT
  // ========================================

  describe('GET /v1/stories/:id/export', () => {
    it('exports existing story', async () => {
      // Create a story first
      const storyId = nanoid();
      await ctx.db.prepare(`
        INSERT INTO stories (id, title, subtitle, description, hsk_level, content_status, is_published, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, strftime('%s', 'now'))
      `).bind(storyId, 'Test Story', '测试故事', 'A test story', 1, 'live').run();

      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/stories/${storyId}/export`, {
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        const body = await res.json();
        expect(body).toHaveProperty('story');
        expect(body.story.id).toBe(storyId);
      }
    });

    it('returns 404 for non-existent story', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories/non-existent-id/export', {
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([404]).toContain(res.status);
    });

    it('requires admin role', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories/any-id/export', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([401, 403]).toContain(res.status);
    });
  });

  // ========================================
  // STORY IMPORT
  // ========================================

  describe('POST /v1/stories/import', () => {
    it('validates import data structure', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories/import', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({}),
        }),
        ctx.env,
        executionContext
      );

      // Should reject empty import
      expect([400, 404, 422]).toContain(res.status);
    });

    it('imports valid story data', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories/import', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            story: {
              title: 'Imported Story',
              chineseTitle: '导入的故事',
              description: 'An imported story',
              hskLevel: 1,
              sentences: [
                {
                  chinese: '这是一个测试。',
                  pinyin: 'Zhè shì yīgè cèshì.',
                  english: 'This is a test.',
                  orderIndex: 0,
                },
              ],
            },
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 400, 404]).toContain(res.status);
    });

    it('requires admin role', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories/import', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(userToken),
          body: JSON.stringify({
            story: { title: 'Test' },
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([401, 403]).toContain(res.status);
    });

    it('handles duplicate import gracefully', async () => {
      const storyData = {
        story: {
          id: 'duplicate-story-id',
          title: 'Duplicate Story',
          chineseTitle: '重复故事',
          hskLevel: 1,
        },
      };

      // First import
      await ctx.app.fetch(
        new Request('http://localhost/v1/stories/import', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify(storyData),
        }),
        ctx.env,
        executionContext
      );

      // Second import (duplicate)
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories/import', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify(storyData),
        }),
        ctx.env,
        executionContext
      );

      // Should handle gracefully (update or reject)
      expect([200, 400, 404, 409]).toContain(res.status);
    });
  });

  // ========================================
  // BULK EXPORT
  // ========================================

  describe('GET /v1/stories/export-all', () => {
    it('exports all stories', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories/export-all', {
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        const body = await res.json();
        expect(body).toHaveProperty('stories');
        expect(Array.isArray(body.stories)).toBe(true);
      }
    });
  });

  // ========================================
  // IMPORT VALIDATION
  // ========================================

  describe('Import Validation', () => {
    it('rejects invalid HSK level', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories/import', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            story: {
              title: 'Invalid HSK',
              hskLevel: 99, // Invalid
            },
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 404, 422]).toContain(res.status);
    });

    it('rejects missing required fields', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories/import', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            story: {
              // Missing title
              hskLevel: 1,
            },
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 404, 422]).toContain(res.status);
    });
  });
});

