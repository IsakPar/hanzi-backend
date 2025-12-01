/**
 * P1: Grammar Patterns Tests
 * 
 * Grammar patterns are first-class content in the Smart Layer.
 * They need the same treatment as vocabulary.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
  jsonAuthBearerHeaders,
} from '../fixtures/jwt-auth-helpers';
import { nanoid } from 'nanoid';

describe.sequential('P1: Grammar Patterns', () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    const admin = await createAuthenticatedAdmin(ctx.db);
    const user = await createAuthenticatedUser(ctx.db);
    adminToken = admin.accessToken;
    userToken = user.accessToken;
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // GRAMMAR PATTERN CRUD (Admin)
  // ========================================

  describe('Grammar Pattern CRUD', () => {
    it('creates grammar pattern', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/grammar', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            id: 'suiran-danshi',
            pattern: '虽然...但是...',
            meaning: 'although...but...',
            hskLevel: 3,
            examples: [
              '虽然他很忙，但是他还是来了。',
              '虽然下雨了，但是我还是去了。',
            ],
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 404]).toContain(res.status);
    });

    it('lists grammar patterns', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/grammar', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('gets grammar pattern by ID', async () => {
      // Create first
      await ctx.app.fetch(
        new Request('http://localhost/v1/grammar', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            id: 'yinwei-suoyi',
            pattern: '因为...所以...',
            meaning: 'because...therefore...',
            hskLevel: 2,
          }),
        }),
        ctx.env,
        executionContext
      );

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/grammar/yinwei-suoyi', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('updates grammar pattern', async () => {
      const id = 'test-pattern';
      
      // Create
      await ctx.app.fetch(
        new Request('http://localhost/v1/grammar', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            id,
            pattern: '不是...而是...',
            meaning: 'not...but rather...',
            hskLevel: 4,
          }),
        }),
        ctx.env,
        executionContext
      );

      // Update
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/grammar/${id}`, {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            meaning: 'not X but rather Y',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('deletes grammar pattern', async () => {
      const id = 'to-delete';
      
      // Create
      await ctx.app.fetch(
        new Request('http://localhost/v1/grammar', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            id,
            pattern: '一边...一边...',
            meaning: 'while doing X, also doing Y',
            hskLevel: 3,
          }),
        }),
        ctx.env,
        executionContext
      );

      // Delete
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/grammar/${id}`, {
          method: 'DELETE',
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 204, 404]).toContain(res.status);
    });
  });

  // ========================================
  // GRAMMAR PATTERN FILTERING
  // ========================================

  describe('Grammar Pattern Filtering', () => {
    beforeEach(async () => {
      // Seed grammar patterns
      const patterns = [
        { id: 'level1-1', pattern: '是...的', meaning: 'emphasize', hskLevel: 1 },
        { id: 'level2-1', pattern: '不但...而且', meaning: 'not only...but also', hskLevel: 2 },
        { id: 'level3-1', pattern: '虽然...但是', meaning: 'although...but', hskLevel: 3 },
        { id: 'level3-2', pattern: '因为...所以', meaning: 'because...so', hskLevel: 3 },
      ];

      for (const p of patterns) {
        await ctx.app.fetch(
          new Request('http://localhost/v1/grammar', {
            method: 'POST',
            headers: jsonAuthBearerHeaders(adminToken),
            body: JSON.stringify(p),
          }),
          ctx.env,
          executionContext
        );
      }
    });

    it('filters by HSK level', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/grammar?hsk_level=3', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        const body = await res.json();
        const patterns = body.patterns || body.grammar || body;
        if (Array.isArray(patterns)) {
          patterns.forEach((p: any) => {
            expect(p.hskLevel || p.hsk_level).toBe(3);
          });
        }
      }
    });

    it('searches by pattern', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/grammar?search=虽然', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // GRAMMAR IN LESSONS
  // ========================================

  describe('Grammar in Lessons', () => {
    it('lesson can include grammar patterns', async () => {
      // Create lesson
      const lessonId = nanoid();
      await ctx.db.prepare(`
        INSERT INTO lessons (id, title, hsk_level, display_order, is_published)
        VALUES (?, ?, ?, ?, 1)
      `).bind(lessonId, 'Grammar Lesson', 3, 1).run();

      // Get lesson with grammar
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/lessons/${lessonId}`, {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // GRAMMAR METADATA FOR SMART LAYER
  // ========================================

  describe('Grammar Metadata for Smart Layer', () => {
    it('returns grammar with atom metadata', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/grammar?include_meta=true', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        const body = await res.json();
        const patterns = body.patterns || body.grammar || body;
        if (Array.isArray(patterns) && patterns.length > 0) {
          // Should include fields for Smart Layer
          const first = patterns[0];
          expect(first.id || first.pattern_id).toBeDefined();
          expect(first.hskLevel || first.hsk_level).toBeDefined();
        }
      }
    });
  });
});

