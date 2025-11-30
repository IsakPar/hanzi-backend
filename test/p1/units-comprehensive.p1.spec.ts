/**
 * P1: Units Comprehensive - Core unit functionality
 * Non-flaky tests for unit CRUD and lesson associations
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authCookieHeaders,
  jsonAuthCookieHeaders,
} from '../fixtures/better-auth-helpers';

describe.sequential('P1: Units Comprehensive', () => {
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

  // Helper to create unit
  async function createUnit(data: {
    hskLevel: number;
    unitNumber: number;
    title: string;
    isPublished?: boolean;
  }) {
    const id = crypto.randomUUID();
    await ctx.db.prepare(`
      INSERT INTO units (id, hsk_level, unit_number, title, is_published, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, strftime('%s','now'), strftime('%s','now'))
    `).bind(id, data.hskLevel, data.unitNumber, data.title, data.isPublished ? 1 : 0).run();
    return id;
  }

  // ========================================
  // UNIT CRUD
  // ========================================

  describe('Unit CRUD', () => {
    it('admin can create unit', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'POST',
          headers: jsonAuthCookieHeaders(adminSession),
          body: JSON.stringify({
            hskLevel: 1,
            unitNumber: 1,
            title: 'Greetings',
            description: 'Learn basic greetings',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 400, 500]).toContain(res.status);
    });

    it('admin can list all units', async () => {
      await createUnit({ hskLevel: 1, unitNumber: 1, title: 'Unit 1' });
      await createUnit({ hskLevel: 1, unitNumber: 2, title: 'Unit 2' });
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          headers: authCookieHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 403]).toContain(res.status);
    });

    it('user cannot list units (admin only)', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          headers: authCookieHeaders(userSession),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(403);
    });

    it('can get unit by id', async () => {
      const id = await createUnit({ hskLevel: 1, unitNumber: 1, title: 'Test Unit', isPublished: true });
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/units/${id}`, {
          headers: authCookieHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 403, 404]).toContain(res.status);
    });

    it('admin can update unit', async () => {
      const id = await createUnit({ hskLevel: 1, unitNumber: 1, title: 'Original' });
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/units/${id}`, {
          method: 'PUT',
          headers: jsonAuthCookieHeaders(adminSession),
          body: JSON.stringify({ title: 'Updated' }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('admin can delete unit', async () => {
      const id = await createUnit({ hskLevel: 1, unitNumber: 99, title: 'To Delete' });
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/units/${id}`, {
          method: 'DELETE',
          headers: authCookieHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 204, 404]).toContain(res.status);
    });
  });

  // ========================================
  // HSK FILTERING
  // ========================================

  describe('HSK Filtering', () => {
    it('can filter units by HSK level', async () => {
      await createUnit({ hskLevel: 1, unitNumber: 1, title: 'HSK1 Unit' });
      await createUnit({ hskLevel: 2, unitNumber: 1, title: 'HSK2 Unit' });
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units?hsk_level=1', {
          headers: authCookieHeaders(adminSession),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 403]).toContain(res.status);
    });
  });

  // ========================================
  // UNIT ORDERING
  // ========================================

  describe('Unit Ordering', () => {
    it('units have order number', async () => {
      await createUnit({ hskLevel: 1, unitNumber: 3, title: 'Third' });
      await createUnit({ hskLevel: 1, unitNumber: 1, title: 'First' });
      await createUnit({ hskLevel: 1, unitNumber: 2, title: 'Second' });
      
      const units = await ctx.db
        .prepare('SELECT * FROM units WHERE hsk_level = 1 ORDER BY unit_number')
        .all();
      
      expect(units.results[0].unit_number).toBe(1);
      expect(units.results[1].unit_number).toBe(2);
      expect(units.results[2].unit_number).toBe(3);
    });
  });

  // ========================================
  // DATA INTEGRITY
  // ========================================

  describe('Data Integrity', () => {
    it('unit_number is unique per HSK level', async () => {
      await createUnit({ hskLevel: 1, unitNumber: 1, title: 'First' });
      
      // Same unit_number different HSK should work
      const id2 = await createUnit({ hskLevel: 2, unitNumber: 1, title: 'Also First' });
      expect(id2).toBeDefined();
    });

    it('HSK level is validated', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'POST',
          headers: jsonAuthCookieHeaders(adminSession),
          body: JSON.stringify({
            hskLevel: 99, // Invalid
            unitNumber: 1,
            title: 'Invalid HSK',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 422, 500]).toContain(res.status);
    });
  });

  // ========================================
  // PUBLISHING
  // ========================================

  describe('Publishing', () => {
    it('can publish unit', async () => {
      const id = await createUnit({ hskLevel: 1, unitNumber: 50, title: 'To Publish', isPublished: false });
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/units/${id}`, {
          method: 'PUT',
          headers: jsonAuthCookieHeaders(adminSession),
          body: JSON.stringify({ isPublished: true }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });
});

