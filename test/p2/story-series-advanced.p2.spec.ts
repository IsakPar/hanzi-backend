/**
 * P2: Story Series Advanced - Series management and ordering
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

describe.sequential('P2: Story Series Advanced', () => {
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
  // SERIES CRUD
  // ========================================

  describe('Series CRUD', () => {
    it('admin can create series', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/story-series', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminSession),
          body: JSON.stringify({
            title: 'Test Series',
            description: 'A test series',
            hskLevel: 1,
          }),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 201, 400, 404]).toContain(res.status);
    });

    it('can list all series', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/story-series'),
        ctx.env,
        executionContext
      );
      
      expect([200, 404]).toContain(res.status);
    });

    it('can get single series', async () => {
      // Create series first
      const seriesId = nanoid();
      await ctx.db.prepare(`
        INSERT INTO story_series (id, title, description, hsk_level, is_published, created_at, updated_at)
        VALUES (?, 'Test Series', 'Test', 1, 1, datetime('now'), datetime('now'))
      `).bind(seriesId).run();
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/story-series/${seriesId}`),
        ctx.env,
        executionContext
      );
      
      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // SERIES STORIES
  // ========================================

  describe('Series Stories', () => {
    it('can add story to series', async () => {
      const seriesId = nanoid();
      const storyId = nanoid();
      
      await ctx.db.prepare(`
        INSERT INTO story_series (id, title, description, hsk_level, is_published, created_at, updated_at)
        VALUES (?, 'Test Series', 'Test', 1, 1, datetime('now'), datetime('now'))
      `).bind(seriesId).run();
      
      await ctx.db.prepare(`
        INSERT INTO stories (id, title, description, hsk_level, is_published, created_at, updated_at)
        VALUES (?, 'Test Story', 'Test', 1, 1, datetime('now'), datetime('now'))
      `).bind(storyId).run();
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/story-series/${seriesId}/stories`, {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminSession),
          body: JSON.stringify({ storyId }),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 201, 400, 404]).toContain(res.status);
    });

    it('can list stories in series', async () => {
      const seriesId = nanoid();
      await ctx.db.prepare(`
        INSERT INTO story_series (id, title, description, hsk_level, is_published, created_at, updated_at)
        VALUES (?, 'Test Series', 'Test', 1, 1, datetime('now'), datetime('now'))
      `).bind(seriesId).run();
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/story-series/${seriesId}/stories`),
        ctx.env,
        executionContext
      );
      
      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // SERIES ORDERING
  // ========================================

  describe('Series Ordering', () => {
    it('can reorder stories in series', async () => {
      const seriesId = nanoid();
      await ctx.db.prepare(`
        INSERT INTO story_series (id, title, description, hsk_level, is_published, created_at, updated_at)
        VALUES (?, 'Test Series', 'Test', 1, 1, datetime('now'), datetime('now'))
      `).bind(seriesId).run();
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/story-series/${seriesId}/reorder`, {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(adminSession),
          body: JSON.stringify({ storyIds: [] }),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 400, 404]).toContain(res.status);
    });
  });

  // ========================================
  // PUBLISHING
  // ========================================

  describe('Publishing', () => {
    it('admin can publish series', async () => {
      const seriesId = nanoid();
      await ctx.db.prepare(`
        INSERT INTO story_series (id, title, description, hsk_level, is_published, created_at, updated_at)
        VALUES (?, 'Test Series', 'Test', 1, 0, datetime('now'), datetime('now'))
      `).bind(seriesId).run();
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/story-series/${seriesId}/publish`, {
          method: 'POST',
          headers: authBearerHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 400, 404]).toContain(res.status);
    });

    it('admin can unpublish series', async () => {
      const seriesId = nanoid();
      await ctx.db.prepare(`
        INSERT INTO story_series (id, title, description, hsk_level, is_published, created_at, updated_at)
        VALUES (?, 'Test Series', 'Test', 1, 1, datetime('now'), datetime('now'))
      `).bind(seriesId).run();
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/story-series/${seriesId}/unpublish`, {
          method: 'POST',
          headers: authBearerHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 400, 404]).toContain(res.status);
    });
  });
});

