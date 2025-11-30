/**
 * P1: Story Sentences - Sentence CRUD, ordering
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  authCookieHeaders,
  jsonAuthCookieHeaders,
} from '../fixtures/better-auth-helpers';
import { createTestStory } from '../fixtures/seed-data';

describe.sequential('P1: Story Sentences', () => {
  let ctx: TestContext;
  let adminSession: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    const admin = await createAuthenticatedAdmin(ctx.db);
    adminSession = admin.sessionToken;
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

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

  describe('Sentence CRUD', () => {
    it('story starts with no sentences', async () => {
      const story = await createTestStory(ctx.db);
      const count = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM story_sentences WHERE story_id = ?')
        .bind(story.id)
        .first<{ count: number }>();
      expect(count?.count).toBe(0);
    });

    it('can add sentence to story', async () => {
      const story = await createTestStory(ctx.db);
      await createSentence(story.id, { chinese: '你好', pinyin: 'nǐhǎo', english: 'Hello', orderIndex: 0 });
      
      const count = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM story_sentences WHERE story_id = ?')
        .bind(story.id)
        .first<{ count: number }>();
      expect(count?.count).toBe(1);
    });

    it('can add multiple sentences', async () => {
      const story = await createTestStory(ctx.db);
      await createSentence(story.id, { chinese: '第一句', pinyin: 'dì yī jù', english: 'First sentence', orderIndex: 0 });
      await createSentence(story.id, { chinese: '第二句', pinyin: 'dì èr jù', english: 'Second sentence', orderIndex: 1 });
      await createSentence(story.id, { chinese: '第三句', pinyin: 'dì sān jù', english: 'Third sentence', orderIndex: 2 });
      
      const count = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM story_sentences WHERE story_id = ?')
        .bind(story.id)
        .first<{ count: number }>();
      expect(count?.count).toBe(3);
    });
  });

  describe('Sentence Ordering', () => {
    it('sentences ordered by order_index', async () => {
      const story = await createTestStory(ctx.db);
      await createSentence(story.id, { chinese: 'C', pinyin: 'c', english: 'Third', orderIndex: 2 });
      await createSentence(story.id, { chinese: 'A', pinyin: 'a', english: 'First', orderIndex: 0 });
      await createSentence(story.id, { chinese: 'B', pinyin: 'b', english: 'Second', orderIndex: 1 });
      
      const sentences = await ctx.db
        .prepare('SELECT chinese FROM story_sentences WHERE story_id = ? ORDER BY order_index')
        .bind(story.id)
        .all();
      
      expect(sentences.results[0].chinese).toBe('A');
      expect(sentences.results[1].chinese).toBe('B');
      expect(sentences.results[2].chinese).toBe('C');
    });
  });

  describe('Chinese Content', () => {
    it('stores Chinese characters correctly', async () => {
      const story = await createTestStory(ctx.db);
      const chinese = '我是一个学生，我喜欢学习中文。';
      await createSentence(story.id, { chinese, pinyin: 'wǒ shì yīgè xuéshēng', english: 'I am a student', orderIndex: 0 });
      
      const sentence = await ctx.db
        .prepare('SELECT chinese FROM story_sentences WHERE story_id = ?')
        .bind(story.id)
        .first<{ chinese: string }>();
      
      expect(sentence?.chinese).toBe(chinese);
    });

    it('stores pinyin with tones', async () => {
      const story = await createTestStory(ctx.db);
      const pinyin = 'nǐ hǎo ma?';
      await createSentence(story.id, { chinese: '你好吗？', pinyin, english: 'How are you?', orderIndex: 0 });
      
      const sentence = await ctx.db
        .prepare('SELECT pinyin FROM story_sentences WHERE story_id = ?')
        .bind(story.id)
        .first<{ pinyin: string }>();
      
      expect(sentence?.pinyin).toBe(pinyin);
    });
  });
});

