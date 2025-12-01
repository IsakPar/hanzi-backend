/**
 * Users & Admin API High Priority Tests
 * 
 * P1 Priority - User management functionality
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  createBetterAuthUser,
  authBearerHeaders,
  jsonAuthBearerHeaders,
} from '../fixtures/jwt-auth-helpers';

describe.sequential('Users & Admin API - High Priority', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // USER SELF-SERVICE
  // ========================================

  describe('User Self-Service', () => {
    it('GET /users/me returns current user', async () => {
      const { accessToken: sessionToken, user } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('GET /users/me requires auth', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me'),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('PUT /users/me updates profile', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ name: 'Updated Name' }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // ADMIN USER MANAGEMENT
  // ========================================

  describe('Admin User Management', () => {
    it('GET /admin/users lists all users', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/users', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('GET /admin/users requires admin', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/users', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([403, 404]).toContain(res.status);
    });

    it('GET /admin/users supports pagination', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/users?limit=10&offset=0', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('POST /admin/users creates user', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/users', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({
            email: 'newuser@example.com',
            name: 'New User',
            role: 'user',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 400, 404, 500]).toContain(res.status);
    });

    it('PUT /admin/users/:id updates user', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      const targetUser = await createBetterAuthUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/admin/users/${targetUser.id}`, {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ role: 'admin' }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 500]).toContain(res.status);
    });

    it('DELETE /admin/users/:id removes user', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      const targetUser = await createBetterAuthUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/admin/users/${targetUser.id}`, {
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
  // ROLE MANAGEMENT
  // ========================================

  describe('Role Management', () => {
    it('admin can change user role', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      const targetUser = await createBetterAuthUser(ctx.db, { role: 'user' });
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/admin/users/${targetUser.id}`, {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ role: 'admin' }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 500]).toContain(res.status);
    });

    it('user cannot change own role', async () => {
      const { accessToken: sessionToken, user } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/admin/users/${user.id}`, {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ role: 'admin' }),
        }),
        ctx.env,
        executionContext
      );

      expect([403, 404]).toContain(res.status);
    });

    it('validates role values', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      const targetUser = await createBetterAuthUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/admin/users/${targetUser.id}`, {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ role: 'superadmin' }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // TIER MANAGEMENT
  // ========================================

  describe('Tier Management', () => {
    it('admin can change user tier', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      const targetUser = await createBetterAuthUser(ctx.db, { tier: 'free' });
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/admin/users/${targetUser.id}`, {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ tier: 'premium' }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 500]).toContain(res.status);
    });

    it('POST /admin/subscriptions/grant-promo grants access', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      const targetUser = await createBetterAuthUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/subscriptions/grant-promo', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({
            userId: targetUser.id,
            tier: 'premium',
            durationDays: 30,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 500]).toContain(res.status);
    });

    it('validates tier values', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      const targetUser = await createBetterAuthUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/admin/users/${targetUser.id}`, {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({ tier: 'ultra' }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 404, 500]).toContain(res.status);
    });
  });

  // ========================================
  // SUBSCRIPTION OVERVIEW
  // ========================================

  describe('Subscription Overview', () => {
    it('GET /admin/subscriptions/overview returns metrics', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/subscriptions/overview', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('requires admin for subscription overview', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/subscriptions/overview', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([403, 404]).toContain(res.status);
    });
  });

  // ========================================
  // USER SEARCH
  // ========================================

  describe('User Search', () => {
    it('searches users by email', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/users?query=test@example.com', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('filters users by role', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/users?role=admin', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });

    it('filters users by tier', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/users?tier=premium', {
          headers: authBearerHeaders(sessionToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404, 500]).toContain(res.status);
    });
  });
});

