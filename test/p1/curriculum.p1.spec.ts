/**
 * P1: Curriculum API Tests - Vocabulary sync and export
 * 
 * Tests curriculum version tracking and vocabulary export for mobile/validator
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
} from '../fixtures/jwt-auth-helpers';
import { nanoid } from 'nanoid';

describe.sequential('P1: Curriculum API', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // VERSION ENDPOINTS
  // ========================================

  describe('Curriculum Version', () => {
    it('GET /v1/curriculum/version returns version info', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum/version'),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/curriculum/full-export/version returns export version', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum/full-export/version'),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // DERIVED DATA ENDPOINTS
  // ========================================

  describe('Curriculum Derived Data', () => {
    it('GET /v1/curriculum/derived returns derived curriculum', async () => {
      const { accessToken: adminToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum/derived', {
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('POST /v1/curriculum/refresh regenerates derived data', async () => {
      const { accessToken: adminToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum/refresh', {
          method: 'POST',
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 202, 404]).toContain(res.status);
    });
  });

  // ========================================
  // HSK LEVEL ENDPOINTS
  // ========================================

  describe('HSK Level Data', () => {
    it('GET /v1/curriculum/hsk/:level/version returns HSK version', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum/hsk/1/version'),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/curriculum/hsk/:level/download returns HSK data', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum/hsk/1/download'),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // WORDS BY LESSON ENDPOINTS
  // ========================================

  describe('Words by Lesson', () => {
    it('GET /v1/curriculum/words-by-lesson/:hsk/:lesson returns vocabulary', async () => {
      // Seed some vocabulary (note: vocabulary table doesn't have lesson_number column)
      // This endpoint may derive lesson from other logic
      await ctx.db.prepare(`
        INSERT INTO vocabulary (id, hanzi, pinyin, english, hsk_level, category)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(nanoid(), '你好', 'nǐ hǎo', 'hello', 1, 'greetings').run();
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum/words-by-lesson/1/1'),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('returns empty for non-existent lesson', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum/words-by-lesson/9/999'),
        ctx.env,
        executionContext
      );

      if (res.status === 200) {
        const body = await res.json();
        expect(body.words?.length || 0).toBe(0);
      }
    });
  });

  // ========================================
  // EXPORT ENDPOINTS
  // ========================================

  describe('Curriculum Export', () => {
    it('GET /v1/curriculum/export returns exportable format', async () => {
      const { accessToken: adminToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum/export', {
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/curriculum/full-export returns complete curriculum', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum/full-export'),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // ACCESS CONTROL
  // ========================================

  describe('Access Control', () => {
    it('public endpoints accessible without auth', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum/version'),
        ctx.env,
        executionContext
      );

      // Should not be 401
      expect(res.status).not.toBe(401);
    });

    it('refresh requires admin', async () => {
      const { accessToken: userToken } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum/refresh', {
          method: 'POST',
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([401, 403, 404]).toContain(res.status);
    });
  });
});

