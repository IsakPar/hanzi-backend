/**
 * P0: Vocabulary Bulk Import - JSON-based vocabulary import
 * Using actual endpoint: POST /v1/vocabulary/admin/bulk-import
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
} from '../fixtures/better-auth-helpers';

describe.sequential('P0: Vocabulary Bulk Import', () => {
  let ctx: TestContext;
  let adminSession: string;
  let userSession: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    const admin = await createAuthenticatedAdmin(ctx.db);
    const user = await createAuthenticatedUser(ctx.db);
    adminSession = admin.sessionToken;
    userSession = user.sessionToken;
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // VALID IMPORTS
  // ========================================

  describe('Valid Imports', () => {
    it('imports single vocabulary entry', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin/bulk-import', {
          method: 'POST',
          headers: {
            'Cookie': `better-auth.session_token=${adminSession}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            entries: [
              {
                hanzi: '你好',
                pinyin: 'nǐ hǎo',
                english: 'hello',
                hskLevel: 1,
                category: 'greetings',
              },
            ],
          }),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 201]).toContain(res.status);
      const body = await res.json();
      expect(body.imported).toBe(1);
    });

    it('imports multiple vocabulary entries', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin/bulk-import', {
          method: 'POST',
          headers: {
            'Cookie': `better-auth.session_token=${adminSession}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            entries: [
              { hanzi: '谢谢', pinyin: 'xiè xiè', english: 'thank you', hskLevel: 1, category: 'greetings' },
              { hanzi: '再见', pinyin: 'zài jiàn', english: 'goodbye', hskLevel: 1, category: 'greetings' },
              { hanzi: '朋友', pinyin: 'péng you', english: 'friend', hskLevel: 1, category: 'people' },
            ],
          }),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 201]).toContain(res.status);
      const body = await res.json();
      expect(body.imported).toBe(3);
    });

    it('handles entries with all optional fields', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin/bulk-import', {
          method: 'POST',
          headers: {
            'Cookie': `better-auth.session_token=${adminSession}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            entries: [
              {
                hanzi: '水',
                pinyin: 'shuǐ',
                english: 'water',
                hskLevel: 1,
                category: 'nature',
                exampleChinese: '我喝水',
                examplePinyin: 'wǒ hē shuǐ',
                exampleEnglish: 'I drink water',
              },
            ],
          }),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 201]).toContain(res.status);
    });
  });

  // ========================================
  // ENCODING
  // ========================================

  describe('Encoding', () => {
    it('handles UTF-8 Chinese characters', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin/bulk-import', {
          method: 'POST',
          headers: {
            'Cookie': `better-auth.session_token=${adminSession}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: JSON.stringify({
            entries: [
              { hanzi: '龙', pinyin: 'lóng', english: 'dragon', hskLevel: 2, category: 'animals' },
              { hanzi: '凤', pinyin: 'fèng', english: 'phoenix', hskLevel: 3, category: 'animals' },
            ],
          }),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 201]).toContain(res.status);
    });

    it('handles pinyin tone marks', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin/bulk-import', {
          method: 'POST',
          headers: {
            'Cookie': `better-auth.session_token=${adminSession}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            entries: [
              { hanzi: '妈', pinyin: 'mā', english: 'mother', hskLevel: 1, category: 'family' },
              { hanzi: '麻', pinyin: 'má', english: 'hemp', hskLevel: 4, category: 'nouns' },
              { hanzi: '马', pinyin: 'mǎ', english: 'horse', hskLevel: 1, category: 'animals' },
              { hanzi: '骂', pinyin: 'mà', english: 'scold', hskLevel: 4, category: 'verbs' },
            ],
          }),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 201]).toContain(res.status);
      const body = await res.json();
      expect(body.imported).toBe(4);
    });
  });

  // ========================================
  // VALIDATION
  // ========================================

  describe('Validation', () => {
    it('rejects empty entries array', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin/bulk-import', {
          method: 'POST',
          headers: {
            'Cookie': `better-auth.session_token=${adminSession}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ entries: [] }),
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(400);
    });

    it('rejects missing required fields', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin/bulk-import', {
          method: 'POST',
          headers: {
            'Cookie': `better-auth.session_token=${adminSession}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            entries: [{ hanzi: '你好' }], // Missing pinyin, english, hskLevel
          }),
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(400);
    });

    it('validates HSK level range', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin/bulk-import', {
          method: 'POST',
          headers: {
            'Cookie': `better-auth.session_token=${adminSession}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            entries: [
              { hanzi: '测', pinyin: 'cè', english: 'test', hskLevel: 99, category: 'test' },
            ],
          }),
        }),
        ctx.env,
        executionContext
      );
      
      // Should reject - HSK max is 9
      expect(res.status).toBe(400);
    });

    it('rejects invalid JSON', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin/bulk-import', {
          method: 'POST',
          headers: {
            'Cookie': `better-auth.session_token=${adminSession}`,
            'Content-Type': 'application/json',
          },
          body: 'not valid json',
        }),
        ctx.env,
        executionContext
      );
      
      expect([400, 500]).toContain(res.status);
    });
  });

  // ========================================
  // AUTHENTICATION
  // ========================================

  describe('Authentication', () => {
    it('requires authentication', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin/bulk-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entries: [
              { hanzi: '好', pinyin: 'hǎo', english: 'good', hskLevel: 1, category: 'adjectives' },
            ],
          }),
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(401);
    });

    it('requires admin role', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin/bulk-import', {
          method: 'POST',
          headers: {
            'Cookie': `better-auth.session_token=${userSession}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            entries: [
              { hanzi: '好', pinyin: 'hǎo', english: 'good', hskLevel: 1, category: 'adjectives' },
            ],
          }),
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // BULK OPERATIONS
  // ========================================

  describe('Bulk Operations', () => {
    it('handles 100 entries', async () => {
      const entries = [];
      for (let i = 0; i < 100; i++) {
        entries.push({
          hanzi: `字${i}`,
          pinyin: `zi${i}`,
          english: `word${i}`,
          hskLevel: (i % 6) + 1,
          category: 'test',
        });
      }
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin/bulk-import', {
          method: 'POST',
          headers: {
            'Cookie': `better-auth.session_token=${adminSession}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ entries }),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 201]).toContain(res.status);
      const body = await res.json();
      expect(body.imported).toBe(100);
    });
  });

  // ========================================
  // RESPONSE FORMAT
  // ========================================

  describe('Response Format', () => {
    it('returns structured response', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin/bulk-import', {
          method: 'POST',
          headers: {
            'Cookie': `better-auth.session_token=${adminSession}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            entries: [
              { hanzi: '新', pinyin: 'xīn', english: 'new', hskLevel: 1, category: 'adjectives' },
            ],
          }),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 201]).toContain(res.status);
      const body = await res.json();
      expect(body).toHaveProperty('imported');
    });
  });
});

