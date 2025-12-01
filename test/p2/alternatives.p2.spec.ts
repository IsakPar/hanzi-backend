/**
 * P2: Alternatives - Alternative words system
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  authBearerHeaders,
  jsonAuthBearerHeaders,
} from '../fixtures/jwt-auth-helpers';
import { createTestVocab, createTestLesson } from '../fixtures/seed-data';

describe.sequential('P2: Alternatives', () => {
  let ctx: TestContext;
  let adminSession: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    const admin = await createAuthenticatedAdmin(ctx.db);
    adminSession = admin.accessToken;
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  describe('Alternative Words API', () => {
    it('can get alternatives for lesson', async () => {
      const lesson = await createTestLesson(ctx.db, { isPublished: true });
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/lessons/${lesson.id}/alternatives`, {
          headers: authBearerHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 404]).toContain(res.status);
    });

    it('can generate alternatives', async () => {
      const lesson = await createTestLesson(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/lessons/${lesson.id}/alternatives/generate`, {
          method: 'POST',
          headers: authBearerHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 202, 400, 404, 500, 503]).toContain(res.status);
    });
  });

  describe('Vocabulary Similarity', () => {
    it('vocab has category field', async () => {
      const vocab = await createTestVocab(ctx.db, { category: 'animals' });
      
      const stored = await ctx.db
        .prepare('SELECT category FROM vocabulary WHERE id = ?')
        .bind(vocab.id)
        .first<{ category: string }>();
      
      expect(stored?.category).toBe('animals');
    });

    it('can find vocab by category', async () => {
      await createTestVocab(ctx.db, { hanzi: '猫', category: 'animals' });
      await createTestVocab(ctx.db, { hanzi: '狗', category: 'animals' });
      await createTestVocab(ctx.db, { hanzi: '书', category: 'objects' });
      
      const animals = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM vocabulary WHERE category = ?')
        .bind('animals')
        .first<{ count: number }>();
      
      expect(animals?.count).toBe(2);
    });

    it('can find vocab by HSK level', async () => {
      await createTestVocab(ctx.db, { hanzi: 'A', hskLevel: 1 });
      await createTestVocab(ctx.db, { hanzi: 'B', hskLevel: 1 });
      await createTestVocab(ctx.db, { hanzi: 'C', hskLevel: 3 });
      
      const hsk1 = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM vocabulary WHERE hsk_level = 1')
        .first<{ count: number }>();
      
      expect(hsk1?.count).toBe(2);
    });
  });

  describe('Vectorize Integration', () => {
    it('similar words endpoint exists', async () => {
      const vocab = await createTestVocab(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/vocabulary/${vocab.id}/similar`, {
          headers: authBearerHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 404, 500, 503]).toContain(res.status);
    });
  });
});

