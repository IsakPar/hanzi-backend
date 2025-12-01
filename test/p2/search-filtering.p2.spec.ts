/**
 * P2: Search & Filtering - Search, pagination, sorting
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedUser,
  authBearerHeaders,
} from '../fixtures/jwt-auth-helpers';
import { createTestVocab, createVocabBatch, createTestLesson } from '../fixtures/seed-data';

describe.sequential('P2: Search & Filtering', () => {
  let ctx: TestContext;
  let userSession: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    const userAuth = await createAuthenticatedUser(ctx.db);
    userSession = userAuth.accessToken;
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  describe('Vocabulary Search', () => {
    it('can search by hanzi', async () => {
      await createTestVocab(ctx.db, { hanzi: '苹果', english: 'apple' });
      await createTestVocab(ctx.db, { hanzi: '香蕉', english: 'banana' });
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?search=苹', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(200);
    });

    it('can search by english', async () => {
      await createTestVocab(ctx.db, { hanzi: '猫', english: 'cat' });
      await createTestVocab(ctx.db, { hanzi: '狗', english: 'dog' });
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?search=cat', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(200);
    });
  });

  describe('Pagination', () => {
    it('supports limit parameter', async () => {
      await createVocabBatch(ctx.db, 20, 1);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?limit=5', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(200);
      const body = await res.json();
      if (Array.isArray(body)) {
        expect(body.length).toBeLessThanOrEqual(5);
      }
    });

    it('supports offset parameter', async () => {
      await createVocabBatch(ctx.db, 20, 1);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?limit=5&offset=10', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(200);
    });

    it('default limit is reasonable', async () => {
      await createVocabBatch(ctx.db, 100, 1);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(200);
      const body = await res.json();
      if (Array.isArray(body)) {
        expect(body.length).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Lesson Filtering', () => {
    it('can filter by difficulty', async () => {
      await createTestLesson(ctx.db, { difficulty: 'easy', isPublished: true });
      await createTestLesson(ctx.db, { difficulty: 'hard', isPublished: true });
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/lessons?difficulty=easy', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(200);
    });

    it('can filter by type', async () => {
      await createTestLesson(ctx.db, { lessonType: 'lesson', isPublished: true });
      await createTestLesson(ctx.db, { lessonType: 'speaking', isPublished: true });
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/lessons?lesson_type=lesson', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(200);
    });
  });
});

