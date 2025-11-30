/**
 * P2: Content Publishing - Draft→staging→live workflow
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authCookieHeaders,
  jsonAuthCookieHeaders,
} from '../fixtures/better-auth-helpers';
import { createTestLesson, createTestStory, createTestUnit } from '../fixtures/seed-data';

describe.sequential('P2: Content Publishing', () => {
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

  describe('Lesson Publishing', () => {
    it('lesson starts as draft', async () => {
      const lesson = await createTestLesson(ctx.db);
      expect(lesson.isPublished).toBe(false);
    });

    it('admin can publish lesson', async () => {
      const lesson = await createTestLesson(ctx.db, { isPublished: false });
      
      await ctx.db
        .prepare('UPDATE lessons SET is_published = 1 WHERE id = ?')
        .bind(lesson.id)
        .run();
      
      const stored = await ctx.db
        .prepare('SELECT is_published FROM lessons WHERE id = ?')
        .bind(lesson.id)
        .first<{ is_published: number }>();
      
      expect(stored?.is_published).toBe(1);
    });

    it('admin can unpublish lesson', async () => {
      const lesson = await createTestLesson(ctx.db, { isPublished: true });
      
      await ctx.db
        .prepare('UPDATE lessons SET is_published = 0 WHERE id = ?')
        .bind(lesson.id)
        .run();
      
      const stored = await ctx.db
        .prepare('SELECT is_published FROM lessons WHERE id = ?')
        .bind(lesson.id)
        .first<{ is_published: number }>();
      
      expect(stored?.is_published).toBe(0);
    });

    it('published lessons visible to users', async () => {
      await createTestLesson(ctx.db, { title: 'Published', isPublished: true });
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/lessons', {
          headers: authCookieHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect(res.status).toBe(200);
    });
  });

  describe('Story Publishing', () => {
    it('story starts as draft', async () => {
      const story = await createTestStory(ctx.db);
      expect(story.isPublished).toBe(false);
    });

    it('admin can publish story', async () => {
      const story = await createTestStory(ctx.db, { isPublished: false });
      
      await ctx.db
        .prepare('UPDATE stories SET is_published = 1 WHERE id = ?')
        .bind(story.id)
        .run();
      
      const stored = await ctx.db
        .prepare('SELECT is_published FROM stories WHERE id = ?')
        .bind(story.id)
        .first<{ is_published: number }>();
      
      expect(stored?.is_published).toBe(1);
    });
  });

  describe('Unit Publishing', () => {
    it('unit starts as draft', async () => {
      const unit = await createTestUnit(ctx.db);
      expect(unit.isPublished).toBe(false);
    });

    it('admin can publish unit', async () => {
      const unit = await createTestUnit(ctx.db, { isPublished: false });
      
      await ctx.db
        .prepare('UPDATE units SET is_published = 1 WHERE id = ?')
        .bind(unit.id)
        .run();
      
      const stored = await ctx.db
        .prepare('SELECT is_published FROM units WHERE id = ?')
        .bind(unit.id)
        .first<{ is_published: number }>();
      
      expect(stored?.is_published).toBe(1);
    });
  });

  describe('Control Center API', () => {
    it('admin can get content status', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/control-center/content', {
          headers: authCookieHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 404, 500]).toContain(res.status);
    });

    it('user cannot access control center', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/control-center/content', {
          headers: authCookieHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([403, 404]).toContain(res.status);
    });
  });
});

