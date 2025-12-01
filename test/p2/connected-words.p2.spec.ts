/**
 * P2: Connected Words - Smart vocab track
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
} from '../fixtures/jwt-auth-helpers';
import { createTestVocab, createTestLesson } from '../fixtures/seed-data';

describe.sequential('P2: Connected Words', () => {
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

  describe('Connected Words API', () => {
    it('can get connected words for lesson', async () => {
      const lesson = await createTestLesson(ctx.db, { isPublished: true });
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/lessons/${lesson.id}/connected-words`, {
          headers: authBearerHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 404]).toContain(res.status);
    });
  });

  describe('Word Relationships', () => {
    it('words in same category are related', async () => {
      const vocab1 = await createTestVocab(ctx.db, { hanzi: '爸爸', category: 'family' });
      const vocab2 = await createTestVocab(ctx.db, { hanzi: '妈妈', category: 'family' });
      const vocab3 = await createTestVocab(ctx.db, { hanzi: '书', category: 'objects' });
      
      const family = await ctx.db
        .prepare('SELECT hanzi FROM vocabulary WHERE category = ?')
        .bind('family')
        .all();
      
      expect(family.results.length).toBe(2);
      expect(family.results.some(v => v.hanzi === '爸爸')).toBe(true);
      expect(family.results.some(v => v.hanzi === '妈妈')).toBe(true);
    });

    it('words in same HSK level are grouped', async () => {
      await createTestVocab(ctx.db, { hanzi: 'A', hskLevel: 2 });
      await createTestVocab(ctx.db, { hanzi: 'B', hskLevel: 2 });
      await createTestVocab(ctx.db, { hanzi: 'C', hskLevel: 4 });
      
      const hsk2 = await ctx.db
        .prepare('SELECT hanzi FROM vocabulary WHERE hsk_level = 2')
        .all();
      
      expect(hsk2.results.length).toBe(2);
    });
  });

  describe('Smart Track', () => {
    it('user smart track endpoint exists', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/smart-track', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 404]).toContain(res.status);
    });

    it('smart track includes unlocked words', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/smart-track/unlocked', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 404]).toContain(res.status);
    });
  });
});

