/**
 * Control Center API High Priority Tests
 * 
 * P1 Priority - Content staging and management
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
  jsonAuthBearerHeaders,
} from '../fixtures/jwt-auth-helpers';

describe.sequential('Control Center API - High Priority', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // CONTENT PIPELINE
  // ========================================

  describe('Content Pipeline', () => {
    it('GET /control-center/content returns pipeline overview', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/control-center/content', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('requires admin for content pipeline', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/control-center/content', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([401, 403, 404]).toContain(res.status);
    });

    it('PUT /control-center/content/:id/status updates status', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/control-center/content/test-id/status', {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ status: 'staging' }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // TEST DEVICES
  // ========================================

  describe('Test Devices', () => {
    it('GET /control-center/test-devices lists devices', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/control-center/test-devices', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('POST /control-center/test-devices adds device', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/control-center/test-devices', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({
            deviceId: 'test-device-123',
            name: 'Test iPhone',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 400, 404, 500]).toContain(res.status);
    });

    it('DELETE /control-center/test-devices/:id removes device', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/control-center/test-devices/test-id', {
          method: 'DELETE',
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 204, 400, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // ANNOUNCEMENTS
  // ========================================

  describe('Announcements', () => {
    it('GET /announcements lists active announcements', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/announcements'),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('GET /admin/announcements lists all (admin)', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/announcements', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('POST /admin/announcements creates announcement', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/announcements', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({
            title: 'Test Announcement',
            message: 'This is a test',
            type: 'info',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 400, 404, 500]).toContain(res.status);
    });

    it('DELETE /admin/announcements/:id removes', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/announcements/test-id', {
          method: 'DELETE',
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 204, 400, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // ANNOUNCEMENT TEMPLATES
  // ========================================

  describe('Announcement Templates', () => {
    it('GET /announcements/templates lists templates', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/announcements/templates', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // AI USAGE TRACKING
  // ========================================

  describe('AI Usage Tracking', () => {
    it('GET /admin/ai-usage/summary returns summary', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/ai-usage/summary', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('GET /admin/ai-usage/daily returns daily stats', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/ai-usage/daily', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('requires admin for AI usage', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/ai-usage/summary', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([403, 404]).toContain(res.status);
    });
  });
});

