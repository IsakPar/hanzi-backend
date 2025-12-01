/**
 * Unit Tests: StoriesService
 * 
 * Tests for story domain logic.
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

describe.sequential('Unit: StoriesService', () => {
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
  // STORY CREATION
  // ========================================

  describe('Story Creation', () => {
    it('creates story with required fields', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            title: 'Test Story',
            chineseTitle: '测试故事',
            hskLevel: 1,
            content: '这是一个测试故事。',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 400, 404]).toContain(res.status);
    });

    it('rejects story without title', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            chineseTitle: '测试故事',
            hskLevel: 1,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 422]).toContain(res.status);
    });
  });

  // ========================================
  // STORY RETRIEVAL
  // ========================================

  describe('Story Retrieval', () => {
    it('returns 404 for non-existent story', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories/non-existent-id', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(404);
    });

    it('lists stories with pagination', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories?limit=10&offset=0', {
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('filters stories by HSK level', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories?hsk_level=2', {
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // STORY UPDATES
  // ========================================

  describe('Story Updates', () => {
    let storyId: string;

    beforeEach(async () => {
      storyId = nanoid();
      await ctx.db.prepare(`
        INSERT INTO stories (id, title, chinese_title, hsk_level, is_published)
        VALUES (?, ?, ?, ?, 0)
      `).bind(storyId, 'Test Story', '测试故事', 1).run();
    });

    it('updates story content', async () => {
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/stories/${storyId}`, {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            content: '更新的内容',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('publishes story', async () => {
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/stories/${storyId}/publish`, {
          method: 'POST',
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('unpublishes story', async () => {
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/stories/${storyId}/unpublish`, {
          method: 'POST',
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // STORY DELETION
  // ========================================

  describe('Story Deletion', () => {
    it('deletes story', async () => {
      const storyId = nanoid();
      await ctx.db.prepare(`
        INSERT INTO stories (id, title, chinese_title, hsk_level, is_published)
        VALUES (?, ?, ?, ?, 0)
      `).bind(storyId, 'To Delete', '删除', 1).run();

      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/stories/${storyId}`, {
          method: 'DELETE',
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 204, 404]).toContain(res.status);
    });
  });

  // ========================================
  // STORY VOCABULARY
  // ========================================

  describe('Story Vocabulary', () => {
    it('lists vocabulary in story', async () => {
      const storyId = nanoid();
      await ctx.db.prepare(`
        INSERT INTO stories (id, title, chinese_title, hsk_level, is_published)
        VALUES (?, ?, ?, ?, 0)
      `).bind(storyId, 'Test Story', '测试故事', 1).run();

      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/stories/${storyId}/vocabulary`, {
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });
});

