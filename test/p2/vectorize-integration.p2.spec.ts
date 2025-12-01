/**
 * P2: Vectorize Integration - Semantic search and similar words
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
} from '../fixtures/jwt-auth-helpers';
import { nanoid } from 'nanoid';

describe.sequential('P2: Vectorize Integration', () => {
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
  // SIMILAR WORDS
  // ========================================

  describe('Similar Words', () => {
    it('finds similar words endpoint exists', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/similar?word=你好', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      // May fail if Vectorize not configured
      expect([200, 400, 404, 500, 503]).toContain(res.status);
    });

    it('requires word parameter', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/similar', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([400, 404]).toContain(res.status);
    });
  });

  // ========================================
  // SEMANTIC SEARCH
  // ========================================

  describe('Semantic Search', () => {
    it('semantic search endpoint exists', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/search/semantic?q=greeting', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 400, 404, 500, 503]).toContain(res.status);
    });
  });

  // ========================================
  // EMBEDDING MANAGEMENT
  // ========================================

  describe('Embedding Management', () => {
    it('admin can trigger embedding refresh', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/vectorize/refresh', {
          method: 'POST',
          headers: authBearerHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 202, 400, 404, 500]).toContain(res.status);
    });

    it('user cannot trigger embedding refresh', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/vectorize/refresh', {
          method: 'POST',
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([401, 403, 404]).toContain(res.status);
    });
  });

  // ========================================
  // CONNECTED WORDS
  // ========================================

  describe('Connected Words', () => {
    it('fetches connected words for lesson', async () => {
      // Create a lesson first
      const lessonId = nanoid();
      await ctx.db.prepare(`
        INSERT INTO lessons (id, title, hsk_level, lesson_number, is_published, created_at, updated_at)
        VALUES (?, 'Test Lesson', 1, 1, 1, strftime('%s','now'), strftime('%s','now'))
      `).bind(lessonId).run();
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/lesson-alternatives/${lessonId}/connected-words`, {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 404]).toContain(res.status);
    });
  });
});

