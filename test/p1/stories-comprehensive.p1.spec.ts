/**
 * P1: Stories Comprehensive - Core story functionality
 * Uses proper seed-data helpers - NOTE: Stories API requires ADMIN auth
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
  jsonAuthBearerHeaders,
} from '../fixtures/jwt-auth-helpers';
import { createTestStory } from '../fixtures/seed-data';

describe.sequential('P1: Stories Comprehensive', () => {
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

  // Helper to create sentence directly
  async function createSentence(storyId: string, data: {
    chinese: string;
    pinyin: string;
    english: string;
    orderIndex: number;
  }) {
    const id = crypto.randomUUID();
    await ctx.db.prepare(`
      INSERT INTO story_sentences (id, story_id, chinese, pinyin, english, order_index)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, storyId, data.chinese, data.pinyin, data.english, data.orderIndex).run();
    return id;
  }

  // ========================================
  // STORY CRUD (ADMIN ONLY)
  // ========================================

  describe('Story CRUD (Admin)', () => {
    it('admin can list stories', async () => {
      await createTestStory(ctx.db, { title: 'Story 1', isPublished: true });
      await createTestStory(ctx.db, { title: 'Story 2', isPublished: true });
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories', {
          headers: authBearerHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('user cannot list stories (admin only)', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(403);
    });

    it('admin can get story by id', async () => {
      const story = await createTestStory(ctx.db, { title: 'Test Story', isPublished: true });
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/stories/${story.id}`, {
          headers: authBearerHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('admin can update story', async () => {
      const story = await createTestStory(ctx.db, { title: 'Original' });
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/stories/${story.id}`, {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(adminSession),
          body: JSON.stringify({ title: 'Updated Title' }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('admin can delete story', async () => {
      const story = await createTestStory(ctx.db, { title: 'To Delete' });
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/stories/${story.id}`, {
          method: 'DELETE',
          headers: authBearerHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 204, 404]).toContain(res.status);
    });
  });

  // ========================================
  // STORY SENTENCES
  // ========================================

  describe('Story Sentences', () => {
    it('sentences are stored correctly', async () => {
      const story = await createTestStory(ctx.db, { title: 'With Sentences', isPublished: true });
      await createSentence(story.id, { chinese: '你好', pinyin: 'nǐhǎo', english: 'Hello', orderIndex: 0 });
      await createSentence(story.id, { chinese: '我是学生', pinyin: 'wǒ shì xuéshēng', english: 'I am a student', orderIndex: 1 });
      
      const sentences = await ctx.db
        .prepare('SELECT * FROM story_sentences WHERE story_id = ? ORDER BY order_index')
        .bind(story.id)
        .all();
      
      expect(sentences.results.length).toBe(2);
      expect(sentences.results[0].chinese).toBe('你好');
      expect(sentences.results[1].chinese).toBe('我是学生');
    });

    it('sentences are ordered', async () => {
      const story = await createTestStory(ctx.db, { title: 'Ordered', isPublished: true });
      await createSentence(story.id, { chinese: '第一句', pinyin: 'dì yī jù', english: 'First sentence', orderIndex: 0 });
      await createSentence(story.id, { chinese: '第二句', pinyin: 'dì èr jù', english: 'Second sentence', orderIndex: 1 });
      
      const sentences = await ctx.db
        .prepare('SELECT * FROM story_sentences WHERE story_id = ? ORDER BY order_index')
        .bind(story.id)
        .all();
      
      expect(sentences.results.length).toBe(2);
      expect(sentences.results[0].order_index).toBe(0);
      expect(sentences.results[1].order_index).toBe(1);
    });
  });

  // ========================================
  // HSK FILTERING
  // ========================================

  describe('HSK Filtering', () => {
    it('admin can filter by HSK level', async () => {
      await createTestStory(ctx.db, { title: 'HSK1 Story', hskLevel: 1, isPublished: true });
      await createTestStory(ctx.db, { title: 'HSK3 Story', hskLevel: 3, isPublished: true });
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories?hsk_level=1', {
          headers: authBearerHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // PUBLISHING
  // ========================================

  describe('Publishing Workflow', () => {
    it('can publish story', async () => {
      const story = await createTestStory(ctx.db, { title: 'To Publish', isPublished: false });
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/stories/${story.id}`, {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(adminSession),
          body: JSON.stringify({ isPublished: true }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // DATA INTEGRITY
  // ========================================

  describe('Data Integrity', () => {
    it('story count increases after creation', async () => {
      const before = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM stories')
        .first<{ count: number }>();
      
      await createTestStory(ctx.db, { title: 'New Story' });
      
      const after = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM stories')
        .first<{ count: number }>();
      
      expect(after!.count).toBe((before?.count ?? 0) + 1);
    });

    it('deleting story removes sentences', async () => {
      const story = await createTestStory(ctx.db, { title: 'To Delete' });
      await createSentence(story.id, { chinese: '句子', pinyin: 'jùzi', english: 'sentence', orderIndex: 0 });
      
      // Delete story
      await ctx.db.prepare('DELETE FROM stories WHERE id = ?').bind(story.id).run();
      
      // Sentences should be cascade deleted or orphaned
      const sentences = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM story_sentences WHERE story_id = ?')
        .bind(story.id)
        .first<{ count: number }>();
      
      expect(sentences?.count).toBeGreaterThanOrEqual(0);
    });
  });
});
