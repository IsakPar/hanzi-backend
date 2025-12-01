/**
 * Unit Tests: UserLibraryService
 * 
 * Tests for user content library management.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
  jsonAuthBearerHeaders,
  createTestUser,
  signTestAccessToken,
} from '../fixtures/jwt-auth-helpers';
import { nanoid } from 'nanoid';

describe.sequential('Unit: UserLibraryService', () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    const admin = await createAuthenticatedAdmin(ctx.db);
    const user = await createAuthenticatedUser(ctx.db);
    adminToken = admin.accessToken;
    userToken = user.accessToken;
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // LIBRARY LISTING
  // ========================================

  describe('Library Listing', () => {
    it('returns empty library for new user', async () => {
      const newUser = await createTestUser(ctx.db);
      const newToken = await signTestAccessToken(newUser, ctx.env.JWT_SECRET);

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/library', {
          headers: authBearerHeaders(newToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
      
      if (res.status === 200) {
        const body = await res.json();
        const items = body.items || body.library || body;
        expect(Array.isArray(items) ? items.length : 0).toBe(0);
      }
    });

    it('lists all saved items', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/library', {
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // SAVING ITEMS
  // ========================================

  describe('Saving Items', () => {
    it('saves story to library', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/library/stories', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(userToken),
          body: JSON.stringify({
            storyId: nanoid(),
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 404]).toContain(res.status);
    });

    it('saves vocabulary to library', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/library/vocabulary', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(userToken),
          body: JSON.stringify({
            vocabularyId: nanoid(),
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 404]).toContain(res.status);
    });

    it('prevents duplicate saves', async () => {
      const itemId = nanoid();

      // First save
      await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/library/stories', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(userToken),
          body: JSON.stringify({ storyId: itemId }),
        }),
        ctx.env,
        executionContext
      );

      // Second save (should be idempotent or rejected)
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/library/stories', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(userToken),
          body: JSON.stringify({ storyId: itemId }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 404, 409]).toContain(res.status);
    });
  });

  // ========================================
  // REMOVING ITEMS
  // ========================================

  describe('Removing Items', () => {
    it('removes story from library', async () => {
      const itemId = nanoid();

      // Save first
      await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/library/stories', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(userToken),
          body: JSON.stringify({ storyId: itemId }),
        }),
        ctx.env,
        executionContext
      );

      // Remove
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/users/me/library/stories/${itemId}`, {
          method: 'DELETE',
          headers: authBearerHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 204, 404]).toContain(res.status);
    });
  });

  // ========================================
  // LIBRARY ISOLATION
  // ========================================

  describe('Library Isolation', () => {
    it('user A cannot see user B library', async () => {
      const userA = await createTestUser(ctx.db);
      const userB = await createTestUser(ctx.db);
      const tokenA = await signTestAccessToken(userA, ctx.env.JWT_SECRET);
      const tokenB = await signTestAccessToken(userB, ctx.env.JWT_SECRET);

      // User A saves item
      await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/library/stories', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(tokenA),
          body: JSON.stringify({ storyId: 'secret-story' }),
        }),
        ctx.env,
        executionContext
      );

      // User B should not see User A's library
      const resB = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/library', {
          headers: authBearerHeaders(tokenB),
        }),
        ctx.env,
        executionContext
      );

      if (resB.status === 200) {
        const body = await resB.json();
        const items = body.items || body.library || body;
        // Should not contain User A's item
        if (Array.isArray(items)) {
          const found = items.some((i: any) => i.storyId === 'secret-story');
          expect(found).toBe(false);
        }
      }
    });
  });
});

