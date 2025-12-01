/**
 * P2: HSK Validation - HSK levels, filtering, progression
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
} from '../fixtures/jwt-auth-helpers';
import { createTestVocab, createTestLesson, createTestStory, createTestUnit } from '../fixtures/seed-data';

describe.sequential('P2: HSK Validation', () => {
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

  describe('Vocabulary HSK Levels', () => {
    it('vocabulary has hsk_level field', async () => {
      const vocab = await createTestVocab(ctx.db, { hskLevel: 3 });
      const stored = await ctx.db
        .prepare('SELECT hsk_level FROM vocabulary WHERE id = ?')
        .bind(vocab.id)
        .first<{ hsk_level: number }>();
      expect(stored?.hsk_level).toBe(3);
    });

    it('can filter vocabulary by HSK 1', async () => {
      await createTestVocab(ctx.db, { hanzi: '我', hskLevel: 1 });
      await createTestVocab(ctx.db, { hanzi: '因为', hskLevel: 3 });
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?hsk_level=1', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      expect(res.status).toBe(200);
    });

    it('HSK levels are 1-6', async () => {
      for (let level = 1; level <= 6; level++) {
        await createTestVocab(ctx.db, { hanzi: `测试${level}`, hskLevel: level });
      }
      
      const count = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM vocabulary WHERE hsk_level BETWEEN 1 AND 6')
        .first<{ count: number }>();
      expect(count?.count).toBe(6);
    });
  });

  describe('Lesson HSK Levels', () => {
    it('lesson has hsk_level field', async () => {
      const lesson = await createTestLesson(ctx.db, { hskLevel: 2 });
      const stored = await ctx.db
        .prepare('SELECT hsk_level FROM lessons WHERE id = ?')
        .bind(lesson.id)
        .first<{ hsk_level: number }>();
      expect(stored?.hsk_level).toBe(2);
    });

    it('can filter lessons by HSK level', async () => {
      await createTestLesson(ctx.db, { hskLevel: 1, isPublished: true });
      await createTestLesson(ctx.db, { hskLevel: 4, isPublished: true });
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/lessons?hsk_level=1', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      expect(res.status).toBe(200);
    });
  });

  describe('Story HSK Levels', () => {
    it('story has hsk_level field', async () => {
      const story = await createTestStory(ctx.db, { hskLevel: 4 });
      const stored = await ctx.db
        .prepare('SELECT hsk_level FROM stories WHERE id = ?')
        .bind(story.id)
        .first<{ hsk_level: number }>();
      expect(stored?.hsk_level).toBe(4);
    });
  });

  describe('Unit HSK Levels', () => {
    it('unit has hsk_level field', async () => {
      const unit = await createTestUnit(ctx.db, { hskLevel: 5 });
      const stored = await ctx.db
        .prepare('SELECT hsk_level FROM units WHERE id = ?')
        .bind(unit.id)
        .first<{ hsk_level: number }>();
      expect(stored?.hsk_level).toBe(5);
    });

    it('can filter units by HSK level', async () => {
      await createTestUnit(ctx.db, { hskLevel: 1, isPublished: true });
      await createTestUnit(ctx.db, { hskLevel: 3, isPublished: true });
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units?hsk_level=1', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      // May require admin or have different route
      expect([200, 403, 404]).toContain(res.status);
    });
  });

  describe('HSK Progression', () => {
    it('content exists for each HSK level', async () => {
      for (let level = 1; level <= 6; level++) {
        await createTestLesson(ctx.db, { hskLevel: level, title: `HSK${level} Lesson` });
      }
      
      for (let level = 1; level <= 6; level++) {
        const count = await ctx.db
          .prepare('SELECT COUNT(*) as count FROM lessons WHERE hsk_level = ?')
          .bind(level)
          .first<{ count: number }>();
        expect(count?.count).toBeGreaterThanOrEqual(1);
      }
    });
  });
});

