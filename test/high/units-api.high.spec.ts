/**
 * Units API High Priority Tests
 * 
 * P1 Priority - Core curriculum structure
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
  jsonAuthBearerHeaders,
} from '../fixtures/jwt-auth-helpers';

describe.sequential('Units API - High Priority', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // UNIT CRUD
  // ========================================

  describe('Unit CRUD', () => {
    it('POST /units creates a unit', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({
            hskLevel: 1,
            title: 'Greetings',
            description: 'Basic greetings',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBeDefined();
    });

    it('GET /units lists units', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      // Create a unit first
      await ctx.db.prepare(`
        INSERT INTO units (id, hsk_level, unit_number, title, is_published, created_at)
        VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
      `).bind('unit-1', 1, 1, 'Test Unit', 1).run();

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.units.length).toBeGreaterThan(0);
    });

    it('GET /units/:id returns single unit', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      await ctx.db.prepare(`
        INSERT INTO units (id, hsk_level, unit_number, title, is_published, created_at)
        VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
      `).bind('unit-2', 1, 2, 'Specific Unit', 1).run();

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units/unit-2', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.unit.id).toBe('unit-2');
    });

    it('PUT /units/:id updates unit', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      await ctx.db.prepare(`
        INSERT INTO units (id, hsk_level, unit_number, title, is_published, created_at)
        VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
      `).bind('unit-3', 1, 3, 'Old Title', 0).run();

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units/unit-3', {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ title: 'New Title' }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
    });

    it('DELETE /units/:id removes unit', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      await ctx.db.prepare(`
        INSERT INTO units (id, hsk_level, unit_number, title, is_published, created_at)
        VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
      `).bind('unit-4', 1, 4, 'To Delete', 0).run();

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units/unit-4', {
          method: 'DELETE',
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
    });

    it('returns 404 for non-existent unit', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units/non-existent', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(404);
    });
  });

  // ========================================
  // HSK LEVEL FILTERING
  // ========================================

  describe('HSK Level Filtering', () => {
    beforeEach(async () => {
      await ctx.db.prepare(`
        INSERT INTO units (id, hsk_level, unit_number, title, is_published, created_at)
        VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
      `).bind('hsk1-unit', 1, 1, 'HSK1 Unit', 1).run();
      
      await ctx.db.prepare(`
        INSERT INTO units (id, hsk_level, unit_number, title, is_published, created_at)
        VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
      `).bind('hsk2-unit', 2, 1, 'HSK2 Unit', 1).run();
    });

    it('filters units by HSK level', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units?hsk_level=1', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      body.units.forEach((u: { hskLevel: number }) => {
        expect(u.hskLevel).toBe(1);
      });
    });

    it('supports multiple HSK levels', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res1 = await ctx.app.fetch(
        new Request('http://localhost/v1/units?hsk_level=1', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      const res2 = await ctx.app.fetch(
        new Request('http://localhost/v1/units?hsk_level=2', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      const body1 = await res1.json();
      const body2 = await res2.json();
      
      expect(body1.units.length).toBeGreaterThan(0);
      expect(body2.units.length).toBeGreaterThan(0);
    });
  });

  // ========================================
  // PUBLISHING WORKFLOW
  // ========================================

  describe('Publishing Workflow', () => {
    it('publishes a draft unit', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      await ctx.db.prepare(`
        INSERT INTO units (id, hsk_level, unit_number, title, is_published, created_at)
        VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
      `).bind('draft-unit', 1, 5, 'Draft', 0).run();

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units/draft-unit', {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ isPublished: true }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
    });

    it('unpublishes a unit', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      await ctx.db.prepare(`
        INSERT INTO units (id, hsk_level, unit_number, title, is_published, created_at)
        VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
      `).bind('pub-unit', 1, 6, 'Published', 1).run();

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units/pub-unit', {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ isPublished: false }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
    });
  });

  // ========================================
  // ACCESS CONTROL
  // ========================================

  describe('Access Control', () => {
    it('denies non-admin POST', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ hskLevel: 1, title: 'Test' }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(403);
    });

    it('denies non-admin PUT', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedUser(ctx.db);
      
      await ctx.db.prepare(`
        INSERT INTO units (id, hsk_level, unit_number, title, is_published, created_at)
        VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
      `).bind('test-unit', 1, 7, 'Test', 0).run();

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units/test-unit', {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ title: 'Hacked' }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(403);
    });

    it('denies non-admin DELETE', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units/any-unit', {
          method: 'DELETE',
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(403);
    });

    it('denies non-admin GET on units list', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // VALIDATION
  // ========================================

  describe('Validation', () => {
    it('rejects missing title', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ hskLevel: 1 }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(400);
    });

    it('rejects invalid HSK level', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ hskLevel: 999, title: 'Invalid' }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(400);
    });

    it('rejects negative HSK level', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ hskLevel: -1, title: 'Negative' }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // UNIT ORDERING
  // ========================================

  describe('Unit Ordering', () => {
    it('auto-assigns unit number', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      // Create first unit
      await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ hskLevel: 3, title: 'First' }),
        }),
        ctx.env,
        executionContext
      );

      // Create second unit
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ hskLevel: 3, title: 'Second' }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.unitNumber).toBe(2);
    });

    it('allows explicit unit number', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ hskLevel: 4, title: 'Explicit', unitNumber: 10 }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.unitNumber).toBe(10);
    });
  });
});

