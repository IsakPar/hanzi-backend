/**
 * P1: Story Questions - Question types, answers, scoring
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  authCookieHeaders,
  jsonAuthCookieHeaders,
} from '../fixtures/better-auth-helpers';
import { createTestStory } from '../fixtures/seed-data';

describe.sequential('P1: Story Questions', () => {
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

  async function createQuestion(storyId: string, data: {
    question: string;
    options: string[];
    correctAnswer: number;
    orderIndex: number;
  }) {
    const id = crypto.randomUUID();
    await ctx.db.prepare(`
      INSERT INTO story_questions (id, story_id, question, options, correct_answer, order_index)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, storyId, data.question, JSON.stringify(data.options), data.correctAnswer, data.orderIndex).run();
    return id;
  }

  describe('Question CRUD', () => {
    it('story starts with no questions', async () => {
      const story = await createTestStory(ctx.db);
      const count = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM story_questions WHERE story_id = ?')
        .bind(story.id)
        .first<{ count: number }>();
      expect(count?.count).toBe(0);
    });

    it('can add question to story', async () => {
      const story = await createTestStory(ctx.db);
      await createQuestion(story.id, {
        question: 'What does 你好 mean?',
        options: ['Hello', 'Goodbye', 'Thank you', 'Sorry'],
        correctAnswer: 0,
        orderIndex: 0,
      });
      
      const count = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM story_questions WHERE story_id = ?')
        .bind(story.id)
        .first<{ count: number }>();
      expect(count?.count).toBe(1);
    });

    it('can add multiple questions', async () => {
      const story = await createTestStory(ctx.db);
      await createQuestion(story.id, { question: 'Q1', options: ['A', 'B'], correctAnswer: 0, orderIndex: 0 });
      await createQuestion(story.id, { question: 'Q2', options: ['A', 'B'], correctAnswer: 1, orderIndex: 1 });
      await createQuestion(story.id, { question: 'Q3', options: ['A', 'B'], correctAnswer: 0, orderIndex: 2 });
      
      const count = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM story_questions WHERE story_id = ?')
        .bind(story.id)
        .first<{ count: number }>();
      expect(count?.count).toBe(3);
    });
  });

  describe('Question Content', () => {
    it('stores options as JSON', async () => {
      const story = await createTestStory(ctx.db);
      const options = ['Option A', 'Option B', 'Option C', 'Option D'];
      await createQuestion(story.id, {
        question: 'Test question',
        options,
        correctAnswer: 2,
        orderIndex: 0,
      });
      
      const question = await ctx.db
        .prepare('SELECT options FROM story_questions WHERE story_id = ?')
        .bind(story.id)
        .first<{ options: string }>();
      
      const parsed = JSON.parse(question!.options);
      expect(parsed).toEqual(options);
    });

    it('stores correct answer index', async () => {
      const story = await createTestStory(ctx.db);
      await createQuestion(story.id, {
        question: 'Test',
        options: ['A', 'B', 'C'],
        correctAnswer: 1,
        orderIndex: 0,
      });
      
      const question = await ctx.db
        .prepare('SELECT * FROM story_questions WHERE story_id = ?')
        .bind(story.id)
        .first();
      
      // Column might be correct_answer or correctAnswer, and SQLite may return as string
      const answer = question?.correct_answer ?? question?.correctAnswer;
      expect(Number(answer)).toBe(1);
    });

    it('questions can include Chinese', async () => {
      const story = await createTestStory(ctx.db);
      await createQuestion(story.id, {
        question: '这个故事讲了什么？',
        options: ['一只猫', '一条狗', '一个人', '一棵树'],
        correctAnswer: 0,
        orderIndex: 0,
      });
      
      const question = await ctx.db
        .prepare('SELECT question FROM story_questions WHERE story_id = ?')
        .bind(story.id)
        .first<{ question: string }>();
      
      expect(question?.question).toBe('这个故事讲了什么？');
    });
  });

  describe('Question Ordering', () => {
    it('questions ordered by order_index', async () => {
      const story = await createTestStory(ctx.db);
      await createQuestion(story.id, { question: 'Third', options: ['A'], correctAnswer: 0, orderIndex: 2 });
      await createQuestion(story.id, { question: 'First', options: ['A'], correctAnswer: 0, orderIndex: 0 });
      await createQuestion(story.id, { question: 'Second', options: ['A'], correctAnswer: 0, orderIndex: 1 });
      
      const questions = await ctx.db
        .prepare('SELECT question FROM story_questions WHERE story_id = ? ORDER BY order_index')
        .bind(story.id)
        .all();
      
      expect(questions.results[0].question).toBe('First');
      expect(questions.results[1].question).toBe('Second');
      expect(questions.results[2].question).toBe('Third');
    });
  });
});

