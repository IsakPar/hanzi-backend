/**
 * Vocabulary API High Priority Tests
 * 
 * P1 Priority - Core vocabulary functionality
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authCookieHeaders,
  jsonAuthCookieHeaders,
} from '../fixtures/better-auth-helpers';

describe.sequential('Vocabulary API - High Priority', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
    
    // Seed test vocabulary (no created_at column)
    await ctx.db.prepare(`
      INSERT INTO vocabulary (id, hanzi, pinyin, english, hsk_level, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind('vocab-1', '你好', 'nǐhǎo', 'hello', 1, 'greetings').run();
    
    await ctx.db.prepare(`
      INSERT INTO vocabulary (id, hanzi, pinyin, english, hsk_level, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind('vocab-2', '再见', 'zàijiàn', 'goodbye', 1, 'greetings').run();
    
    await ctx.db.prepare(`
      INSERT INTO vocabulary (id, hanzi, pinyin, english, hsk_level, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind('vocab-3', '学习', 'xuéxí', 'to study', 2, 'verbs').run();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // PUBLIC VOCABULARY
  // ========================================

  describe('Public Vocabulary API', () => {
    it('GET /vocabulary returns vocabulary list', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary'),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.results).toBeDefined();
      expect(body.results.length).toBeGreaterThan(0);
    });

    it('GET /vocabulary supports pagination', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?limit=2&offset=0'),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.results.length).toBeLessThanOrEqual(2);
    });

    it('GET /vocabulary filters by HSK level', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?hsk_level=1'),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      body.results.forEach((v: { hskLevel: number }) => {
        expect(v.hskLevel).toBe(1);
      });
    });

    it('GET /vocabulary filters by category', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?category=greetings'),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      body.results.forEach((v: { category: string }) => {
        expect(v.category).toBe('greetings');
      });
    });

    it('GET /vocabulary searches by query', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?query=hello'),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.results.length).toBeGreaterThan(0);
      expect(body.results[0].english).toContain('hello');
    });

    it('GET /vocabulary/:id returns single entry', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/vocab-1'),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.hanzi).toBe('你好');
    });

    it('GET /vocabulary/:id returns 404 for non-existent', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/non-existent'),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(404);
    });
  });

  // ========================================
  // ADMIN VOCABULARY
  // ========================================

  describe('Admin Vocabulary API', () => {
    it('POST /vocabulary/admin creates vocabulary', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin', {
          method: 'POST',
          headers: jsonAuthCookieHeaders(sessionToken),
          body: JSON.stringify({
            hanzi: '谢谢',
            pinyin: 'xièxiè',
            english: 'thank you',
            hskLevel: 1,
            category: 'greetings',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(201);
    });

    it('PUT /vocabulary/admin/:id updates vocabulary', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin/vocab-1', {
          method: 'PUT',
          headers: jsonAuthCookieHeaders(sessionToken),
          body: JSON.stringify({
            english: 'hello; hi',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);

      // Verify
      const vocab = await ctx.db
        .prepare('SELECT english FROM vocabulary WHERE id = ?')
        .bind('vocab-1')
        .first();
      expect(vocab?.english).toBe('hello; hi');
    });

    it('DELETE /vocabulary/admin/:id removes vocabulary', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin/vocab-3', {
          method: 'DELETE',
          headers: authCookieHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);

      // Verify deletion
      const vocab = await ctx.db
        .prepare('SELECT * FROM vocabulary WHERE id = ?')
        .bind('vocab-3')
        .first();
      expect(vocab).toBeNull();
    });

    it('denies non-admin access to admin endpoints', async () => {
      const { sessionToken } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin', {
          method: 'POST',
          headers: jsonAuthCookieHeaders(sessionToken),
          body: JSON.stringify({
            hanzi: '不',
            pinyin: 'bù',
            english: 'no',
            hskLevel: 1,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // VOCABULARY VALIDATION
  // ========================================

  describe('Vocabulary Validation', () => {
    it('rejects empty hanzi', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin', {
          method: 'POST',
          headers: jsonAuthCookieHeaders(sessionToken),
          body: JSON.stringify({
            hanzi: '',
            pinyin: 'test',
            english: 'test',
            hskLevel: 1,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(400);
    });

    it('rejects invalid HSK level', async () => {
      const { sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin', {
          method: 'POST',
          headers: jsonAuthCookieHeaders(sessionToken),
          body: JSON.stringify({
            hanzi: '测试',
            pinyin: 'cèshì',
            english: 'test',
            hskLevel: 99,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // VOCABULARY SEARCH
  // ========================================

  describe('Vocabulary Search', () => {
    it('searches by hanzi', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?query=你好'),
        ctx.env,
        executionContext
      );

      const body = await res.json();
      expect(body.results.some((v: { hanzi: string }) => v.hanzi === '你好')).toBe(true);
    });

    it('searches by pinyin', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?query=nihao'),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
    });

    it('searches by english', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?query=study'),
        ctx.env,
        executionContext
      );

      const body = await res.json();
      expect(body.results.some((v: { english: string }) => v.english.includes('study'))).toBe(true);
    });

    it('returns empty array for no matches', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?query=xyznonexistent'),
        ctx.env,
        executionContext
      );

      const body = await res.json();
      expect(body.results.length).toBe(0);
    });
  });
});

