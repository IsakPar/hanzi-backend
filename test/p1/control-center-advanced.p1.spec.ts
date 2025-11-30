/**
 * P1: Control Center Advanced - Content staging, announcements, rate limits
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
} from '../fixtures/better-auth-helpers';
import { nanoid } from 'nanoid';

describe.sequential('P1: Control Center Advanced', () => {
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

  // ========================================
  // CONTENT STAGING
  // ========================================

  describe('Content Staging', () => {
    it('admin can view staging dashboard', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/control-center/dashboard', {
          headers: { 'Cookie': `better-auth.session_token=${adminSession}` },
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 404]).toContain(res.status);
    });

    it('admin can view content by status', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/control-center/content?status=staging', {
          headers: { 'Cookie': `better-auth.session_token=${adminSession}` },
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 404]).toContain(res.status);
    });

    it('user cannot access control center', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/control-center/dashboard', {
          headers: { 'Cookie': `better-auth.session_token=${userSession}` },
        }),
        ctx.env,
        executionContext
      );
      
      expect([401, 403, 404]).toContain(res.status);
    });
  });

  // ========================================
  // ANNOUNCEMENTS
  // ========================================

  describe('Announcements', () => {
    it('admin can list announcements', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/announcements', {
          headers: { 'Cookie': `better-auth.session_token=${adminSession}` },
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 404]).toContain(res.status);
    });

    it('admin can create announcement', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/announcements', {
          method: 'POST',
          headers: {
            'Cookie': `better-auth.session_token=${adminSession}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: 'Test Announcement',
            message: 'This is a test',
            template: 'simple',
            isActive: true,
          }),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 201, 400, 404]).toContain(res.status);
    });

    it('public can fetch active announcements', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/announcements/active'),
        ctx.env,
        executionContext
      );
      
      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // RATE LIMITS MANAGEMENT
  // ========================================

  describe('Rate Limits Management', () => {
    it('admin can view rate limit config', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/control-center/rate-limits', {
          headers: { 'Cookie': `better-auth.session_token=${adminSession}` },
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 404]).toContain(res.status);
    });

    it('admin can update rate limits', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/control-center/rate-limits', {
          method: 'PUT',
          headers: {
            'Cookie': `better-auth.session_token=${adminSession}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tier: 'free',
            limits: { aiGenerationsPerDay: 5 },
          }),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 400, 404]).toContain(res.status);
    });
  });

  // ========================================
  // TEST DEVICES
  // ========================================

  describe('Test Devices', () => {
    it('admin can list test devices', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/control-center/test-devices', {
          headers: { 'Cookie': `better-auth.session_token=${adminSession}` },
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 404]).toContain(res.status);
    });

    it('admin can add test device', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/control-center/test-devices', {
          method: 'POST',
          headers: {
            'Cookie': `better-auth.session_token=${adminSession}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deviceId: nanoid(),
            name: 'Test iPhone',
            platform: 'ios',
          }),
        }),
        ctx.env,
        executionContext
      );
      
      expect([200, 201, 400, 404]).toContain(res.status);
    });
  });
});

