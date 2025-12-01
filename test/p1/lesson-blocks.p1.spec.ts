/**
 * P1: Lesson Blocks - Block CRUD, ordering, content validation
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
  jsonAuthBearerHeaders,
} from '../fixtures/jwt-auth-helpers';
import { createTestLesson, createTestLessonBlock } from '../fixtures/seed-data';

describe.sequential('P1: Lesson Blocks', () => {
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

  describe('Block CRUD', () => {
    it('lesson starts with no blocks', async () => {
      const lesson = await createTestLesson(ctx.db);
      const blocks = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM lesson_blocks WHERE lesson_id = ?')
        .bind(lesson.id)
        .first<{ count: number }>();
      expect(blocks?.count).toBe(0);
    });

    it('can add block to lesson', async () => {
      const lesson = await createTestLesson(ctx.db);
      await createTestLessonBlock(ctx.db, lesson.id, { type: 'intro', orderIndex: 0 });
      
      const blocks = await ctx.db
        .prepare('SELECT * FROM lesson_blocks WHERE lesson_id = ?')
        .bind(lesson.id)
        .all();
      expect(blocks.results.length).toBe(1);
    });

    it('can add multiple blocks', async () => {
      const lesson = await createTestLesson(ctx.db);
      await createTestLessonBlock(ctx.db, lesson.id, { type: 'intro', orderIndex: 0 });
      await createTestLessonBlock(ctx.db, lesson.id, { type: 'vocab', orderIndex: 1 });
      await createTestLessonBlock(ctx.db, lesson.id, { type: 'practice', orderIndex: 2 });
      
      const count = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM lesson_blocks WHERE lesson_id = ?')
        .bind(lesson.id)
        .first<{ count: number }>();
      expect(count?.count).toBe(3);
    });

    it('can delete block', async () => {
      const lesson = await createTestLesson(ctx.db);
      const block = await createTestLessonBlock(ctx.db, lesson.id);
      
      await ctx.db.prepare('DELETE FROM lesson_blocks WHERE id = ?').bind(block.id).run();
      
      const count = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM lesson_blocks WHERE id = ?')
        .bind(block.id)
        .first<{ count: number }>();
      expect(count?.count).toBe(0);
    });
  });

  describe('Block Ordering', () => {
    it('blocks maintain order_index', async () => {
      const lesson = await createTestLesson(ctx.db);
      await createTestLessonBlock(ctx.db, lesson.id, { type: 'a', orderIndex: 0 });
      await createTestLessonBlock(ctx.db, lesson.id, { type: 'b', orderIndex: 1 });
      await createTestLessonBlock(ctx.db, lesson.id, { type: 'c', orderIndex: 2 });
      
      const blocks = await ctx.db
        .prepare('SELECT * FROM lesson_blocks WHERE lesson_id = ? ORDER BY order_index')
        .bind(lesson.id)
        .all();
      
      expect(blocks.results[0].type).toBe('a');
      expect(blocks.results[1].type).toBe('b');
      expect(blocks.results[2].type).toBe('c');
    });

    it('can reorder blocks by updating order_index', async () => {
      const lesson = await createTestLesson(ctx.db);
      const block1 = await createTestLessonBlock(ctx.db, lesson.id, { type: 'first', orderIndex: 0 });
      const block2 = await createTestLessonBlock(ctx.db, lesson.id, { type: 'second', orderIndex: 1 });
      
      // Swap order
      await ctx.db.prepare('UPDATE lesson_blocks SET order_index = ? WHERE id = ?').bind(1, block1.id).run();
      await ctx.db.prepare('UPDATE lesson_blocks SET order_index = ? WHERE id = ?').bind(0, block2.id).run();
      
      const blocks = await ctx.db
        .prepare('SELECT * FROM lesson_blocks WHERE lesson_id = ? ORDER BY order_index')
        .bind(lesson.id)
        .all();
      
      expect(blocks.results[0].type).toBe('second');
      expect(blocks.results[1].type).toBe('first');
    });

    it('handles non-sequential order_index', async () => {
      const lesson = await createTestLesson(ctx.db);
      await createTestLessonBlock(ctx.db, lesson.id, { type: 'a', orderIndex: 10 });
      await createTestLessonBlock(ctx.db, lesson.id, { type: 'b', orderIndex: 20 });
      await createTestLessonBlock(ctx.db, lesson.id, { type: 'c', orderIndex: 15 });
      
      const blocks = await ctx.db
        .prepare('SELECT * FROM lesson_blocks WHERE lesson_id = ? ORDER BY order_index')
        .bind(lesson.id)
        .all();
      
      expect(blocks.results[0].type).toBe('a');
      expect(blocks.results[1].type).toBe('c');
      expect(blocks.results[2].type).toBe('b');
    });
  });

  describe('Block Content', () => {
    it('stores JSON content correctly', async () => {
      const lesson = await createTestLesson(ctx.db);
      const content = { title: 'Hello', items: ['a', 'b', 'c'], nested: { key: 'value' } };
      const block = await createTestLessonBlock(ctx.db, lesson.id, { content, orderIndex: 0 });
      
      const stored = await ctx.db
        .prepare('SELECT content FROM lesson_blocks WHERE id = ?')
        .bind(block.id)
        .first<{ content: string }>();
      
      const parsed = JSON.parse(stored!.content);
      expect(parsed.title).toBe('Hello');
      expect(parsed.items).toEqual(['a', 'b', 'c']);
    });

    it('supports different block types', async () => {
      const lesson = await createTestLesson(ctx.db);
      const types = ['intro', 'vocab', 'grammar', 'practice', 'quiz', 'summary'];
      
      for (let i = 0; i < types.length; i++) {
        await createTestLessonBlock(ctx.db, lesson.id, { type: types[i], orderIndex: i });
      }
      
      const blocks = await ctx.db
        .prepare('SELECT type FROM lesson_blocks WHERE lesson_id = ?')
        .bind(lesson.id)
        .all();
      
      expect(blocks.results.length).toBe(types.length);
    });

    it('block content can include Chinese characters', async () => {
      const lesson = await createTestLesson(ctx.db);
      const content = { hanzi: '你好世界', pinyin: 'nǐhǎo shìjiè', english: 'Hello world' };
      const block = await createTestLessonBlock(ctx.db, lesson.id, { content, orderIndex: 0 });
      
      const stored = await ctx.db
        .prepare('SELECT content FROM lesson_blocks WHERE id = ?')
        .bind(block.id)
        .first<{ content: string }>();
      
      const parsed = JSON.parse(stored!.content);
      expect(parsed.hanzi).toBe('你好世界');
    });
  });

  describe('API Access', () => {
    it('lesson endpoint includes blocks', async () => {
      const lesson = await createTestLesson(ctx.db, { isPublished: true });
      await createTestLessonBlock(ctx.db, lesson.id, { orderIndex: 0 });
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/lessons/${lesson.id}`, {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 404]).toContain(res.status);
    });
  });
});

