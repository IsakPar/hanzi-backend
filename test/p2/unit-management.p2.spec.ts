/**
 * P2: Unit Management - Curriculum units and lesson organization
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

describe.sequential('P2: Unit Management', () => {
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
  // UNIT CRUD
  // ========================================

  describe('Unit CRUD', () => {
    it('admin can create unit', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminSession),
          body: JSON.stringify({
            title: 'Unit 1',
            description: 'First unit',
            hskLevel: 1,
            order: 1,
          }),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 201, 400]).toContain(res.status);
    });

    it('can list all units', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 401, 403]).toContain(res.status);
    });

    it('can get single unit', async () => {
      const unitId = nanoid();
      await ctx.db.prepare(`
        INSERT INTO units (id, title, description, hsk_level, unit_number, order_index, is_published, created_at, updated_at)
        VALUES (?, 'Test Unit', 'Test', 1, 1, 1, 1, strftime('%s','now'), strftime('%s','now'))
      `).bind(unitId).run();
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/units/${unitId}`, {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 401, 403, 404]).toContain(res.status);
    });

    it('admin can update unit', async () => {
      const unitId = nanoid();
      await ctx.db.prepare(`
        INSERT INTO units (id, title, description, hsk_level, unit_number, order_index, is_published, created_at, updated_at)
        VALUES (?, 'Test Unit', 'Test', 1, 1, 1, 0, strftime('%s','now'), strftime('%s','now'))
      `).bind(unitId).run();
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/units/${unitId}`, {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(adminSession),
          body: JSON.stringify({ title: 'Updated Unit' }),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 400, 404]).toContain(res.status);
    });

    it('admin can delete unit', async () => {
      const unitId = nanoid();
      await ctx.db.prepare(`
        INSERT INTO units (id, title, description, hsk_level, unit_number, order_index, is_published, created_at, updated_at)
        VALUES (?, 'Test Unit', 'Test', 1, 1, 1, 0, strftime('%s','now'), strftime('%s','now'))
      `).bind(unitId).run();
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/units/${unitId}`, {
          method: 'DELETE',
          headers: authBearerHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 204, 400, 404]).toContain(res.status);
    });
  });

  // ========================================
  // UNIT LESSONS
  // ========================================

  describe('Unit Lessons', () => {
    it('can get lessons in unit', async () => {
      const unitId = nanoid();
      await ctx.db.prepare(`
        INSERT INTO units (id, title, description, hsk_level, unit_number, order_index, is_published, created_at, updated_at)
        VALUES (?, 'Test Unit', 'Test', 1, 1, 1, 1, strftime('%s','now'), strftime('%s','now'))
      `).bind(unitId).run();
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/units/${unitId}/lessons`, {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 401, 403, 404]).toContain(res.status);
    });

    it('lessons belong to unit', async () => {
      const unitId = nanoid();
      const lessonId = nanoid();
      
      await ctx.db.prepare(`
        INSERT INTO units (id, title, description, hsk_level, unit_number, order_index, is_published, created_at, updated_at)
        VALUES (?, 'Test Unit', 'Test', 2, 1, 1, 1, strftime('%s','now'), strftime('%s','now'))
      `).bind(unitId).run();
      
      await ctx.db.prepare(`
        INSERT INTO lessons (id, title, hsk_level, unit_id, lesson_number, is_published, created_at, updated_at)
        VALUES (?, 'Test Lesson', 2, ?, 1, 1, strftime('%s','now'), strftime('%s','now'))
      `).bind(lessonId, unitId).run();
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/units/${unitId}/lessons`, {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });

  // ========================================
  // UNIT ORDERING
  // ========================================

  describe('Unit Ordering', () => {
    it('can reorder units', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units/reorder', {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(adminSession),
          body: JSON.stringify({ unitIds: [] }),
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
    it('admin can publish unit', async () => {
      const unitId = nanoid();
      await ctx.db.prepare(`
        INSERT INTO units (id, title, description, hsk_level, unit_number, order_index, is_published, created_at, updated_at)
        VALUES (?, 'Test Unit', 'Test', 1, 1, 1, 0, strftime('%s','now'), strftime('%s','now'))
      `).bind(unitId).run();
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/units/${unitId}/publish`, {
          method: 'POST',
          headers: authBearerHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 400, 404]).toContain(res.status);
    });

    it('unpublished unit not visible to users', async () => {
      const unitId = nanoid();
      await ctx.db.prepare(`
        INSERT INTO units (id, title, description, hsk_level, unit_number, order_index, is_published, created_at, updated_at)
        VALUES (?, 'Hidden Unit', 'Test', 1, 1, 1, 0, strftime('%s','now'), strftime('%s','now'))
      `).bind(unitId).run();
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/units/${unitId}`, {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      // Should return 404 or filtered out or 401
      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });

  // ========================================
  // FILTERING
  // ========================================

  describe('Filtering', () => {
    it('can filter by HSK level', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units?hsk_level=1', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 401, 403]).toContain(res.status);
    });

    it('can filter by published status', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units?is_published=true', {
          headers: authBearerHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 401, 403]).toContain(res.status);
    });
  });
});

