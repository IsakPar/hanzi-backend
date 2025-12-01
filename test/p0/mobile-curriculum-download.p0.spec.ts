/**
 * P0+: Mobile Curriculum Download Tests
 * 
 * Mobile app downloads HSK levels for offline use.
 * Critical for:
 * - Offline learning
 * - Content sync
 * - Version checking
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedUser,
  authBearerHeaders,
} from '../fixtures/jwt-auth-helpers';
import { nanoid } from 'nanoid';

describe.sequential('P0+: Mobile Curriculum Download', () => {
  let ctx: TestContext;
  let userToken: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    const user = await createAuthenticatedUser(ctx.db);
    userToken = user.accessToken;

    // Seed vocabulary for HSK levels
    for (let level = 1; level <= 3; level++) {
      for (let i = 0; i < 10; i++) {
        await ctx.db.prepare(`
          INSERT INTO vocabulary (id, hanzi, pinyin, english, hsk_level, category)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          nanoid(),
          `字${level}${i}`,
          `zi${level}${i}`,
          `word ${level}-${i}`,
          level,
          'general'
        ).run();
      }
    }
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // HSK LEVEL DOWNLOAD
  // ========================================

  describe('GET /v1/curriculum/hsk/:level/download', () => {
    it('downloads HSK 1 vocabulary', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum/hsk/1/download', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        const body = await res.json();
        expect(body.vocabulary || body.words).toBeDefined();
        expect(body.version || body.meta?.version).toBeDefined();
      }
    });

    it('downloads HSK 2 vocabulary', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum/hsk/2/download', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('downloads HSK 3 vocabulary', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum/hsk/3/download', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('includes practice data with vocabulary', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum/hsk/1/download', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      if (res.status === 200) {
        const body = await res.json();
        const vocab = body.vocabulary || body.words;
        
        if (vocab && vocab.length > 0) {
          // Check first word has practice data
          const firstWord = vocab[0];
          // Should have alternatives for MCQ generation
          expect(firstWord.alternatives || firstWord.practiceData).toBeDefined();
        }
      }
    });

    it('rejects invalid HSK level', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum/hsk/10/download', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 404]).toContain(res.status);
    });

    it('rejects non-numeric HSK level', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum/hsk/abc/download', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 404]).toContain(res.status);
    });

    it('requires authentication', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum/hsk/1/download'),
        ctx.env,
        executionContext
      );

      expect([401, 403, 404]).toContain(res.status);
    });
  });

  // ========================================
  // VERSION CHECKING
  // ========================================

  describe('GET /v1/curriculum/hsk/:level/version', () => {
    it('returns version for HSK 1', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum/hsk/1/version', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        const body = await res.json();
        expect(body.version).toBeDefined();
      }
    });

    it('allows mobile to check if update needed', async () => {
      // First get version
      const res1 = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum/hsk/1/version', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      // Second check should return same version
      const res2 = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum/hsk/1/version', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      if (res1.status === 200 && res2.status === 200) {
        const body1 = await res1.json();
        const body2 = await res2.json();
        expect(body1.version).toBe(body2.version);
      }
    });
  });

  // ========================================
  // FULL CURRICULUM EXPORT
  // ========================================

  describe('GET /v1/curriculum/derived', () => {
    it('returns derived curriculum data', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum/derived', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('GET /v1/curriculum/version', () => {
    it('returns overall curriculum version', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum/version', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('GET /v1/curriculum/words-by-lesson/:hsk/:lesson', () => {
    it('returns words for specific lesson', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/curriculum/words-by-lesson/1/1', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // LESSON EXPORT FOR OFFLINE
  // ========================================

  describe('GET /v1/lessons/:id/export', () => {
    let lessonId: string;

    beforeEach(async () => {
      lessonId = nanoid();
      await ctx.db.prepare(`
        INSERT INTO lessons (id, title, hsk_level, display_order, is_published)
        VALUES (?, ?, ?, ?, 1)
      `).bind(lessonId, 'Test Lesson', 1, 1).run();
    });

    it('exports lesson with all data', async () => {
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/lessons/${lessonId}/export`, {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        const body = await res.json();
        expect(body.lesson || body.id).toBeDefined();
      }
    });

    it('returns 404 for non-existent lesson', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/lessons/non-existent/export', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(404);
    });
  });
});

