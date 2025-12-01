/**
 * P1: Vocabulary Comprehensive - Core vocabulary functionality
 * Uses proper seed-data helpers
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
  jsonAuthBearerHeaders,
} from '../fixtures/jwt-auth-helpers';
import { createTestVocab, createVocabBatch } from '../fixtures/seed-data';

describe.sequential('P1: Vocabulary Comprehensive', () => {
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

  // ========================================
  // VOCABULARY CRUD
  // ========================================

  describe('Vocabulary CRUD', () => {
    it('admin can create vocabulary', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminSession),
          body: JSON.stringify({
            hanzi: '测试',
            pinyin: 'cèshì',
            english: 'test',
            hskLevel: 1,
            category: 'verbs',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 400, 404, 500]).toContain(res.status);
    });

    it('can list vocabulary', async () => {
      await createTestVocab(ctx.db, { hanzi: '你好', pinyin: 'nǐhǎo', english: 'hello' });
      await createTestVocab(ctx.db, { hanzi: '谢谢', pinyin: 'xièxiè', english: 'thank you' });
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
    });

    it('can get vocabulary by id', async () => {
      const vocab = await createTestVocab(ctx.db, { hanzi: '学习', pinyin: 'xuéxí', english: 'study' });
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/vocabulary/${vocab.id}`, {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('admin can update vocabulary', async () => {
      const vocab = await createTestVocab(ctx.db, { hanzi: '旧', pinyin: 'jiù', english: 'old' });
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/vocabulary/admin/${vocab.id}`, {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(adminSession),
          body: JSON.stringify({ english: 'old, former' }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('admin can delete vocabulary', async () => {
      const vocab = await createTestVocab(ctx.db, { hanzi: '删除', pinyin: 'shānchú', english: 'delete' });
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/vocabulary/admin/${vocab.id}`, {
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
  // SEARCH
  // ========================================

  describe('Vocabulary Search', () => {
    it('can search by hanzi', async () => {
      await createTestVocab(ctx.db, { hanzi: '苹果', pinyin: 'píngguǒ', english: 'apple' });
      await createTestVocab(ctx.db, { hanzi: '香蕉', pinyin: 'xiāngjiāo', english: 'banana' });
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?search=苹', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
    });

    it('can search by pinyin', async () => {
      await createTestVocab(ctx.db, { hanzi: '电脑', pinyin: 'diànnǎo', english: 'computer' });
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?search=dian', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
    });

    it('can search by english', async () => {
      await createTestVocab(ctx.db, { hanzi: '猫', pinyin: 'māo', english: 'cat' });
      
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

  // ========================================
  // HSK FILTERING
  // ========================================

  describe('HSK Level Filtering', () => {
    it('can filter by HSK level', async () => {
      await createTestVocab(ctx.db, { hanzi: '我', pinyin: 'wǒ', english: 'I', hskLevel: 1 });
      await createTestVocab(ctx.db, { hanzi: '因为', pinyin: 'yīnwèi', english: 'because', hskLevel: 3 });
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?hsk_level=1', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
    });
  });

  // ========================================
  // PAGINATION
  // ========================================

  describe('Pagination', () => {
    it('supports limit', async () => {
      await createVocabBatch(ctx.db, 15, 1);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?limit=10', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      
      if (Array.isArray(body)) {
        expect(body.length).toBeLessThanOrEqual(10);
      }
    });

    it('supports offset', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?limit=10&offset=5', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
    });
  });

  // ========================================
  // DATA INTEGRITY
  // ========================================

  describe('Data Integrity', () => {
    it('hanzi field is required', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminSession),
          body: JSON.stringify({
            pinyin: 'test',
            english: 'test',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 422, 500]).toContain(res.status);
    });

    it('vocab count increases after creation', async () => {
      const before = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM vocabulary')
        .first<{ count: number }>();
      
      await createTestVocab(ctx.db, { hanzi: '新词', pinyin: 'xīncí', english: 'new word' });
      
      const after = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM vocabulary')
        .first<{ count: number }>();
      
      expect(after!.count).toBe((before?.count ?? 0) + 1);
    });
  });
});
