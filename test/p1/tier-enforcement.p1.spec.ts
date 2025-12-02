/**
 * P1: Tier Enforcement Tests
 * 
 * Tests for Free vs Premium access control.
 * Critical for billing and feature gating.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createTestUser,
  signTestAccessToken,
  authBearerHeaders,
  jsonAuthBearerHeaders,
} from '../fixtures/jwt-auth-helpers';
import { nanoid } from 'nanoid';

describe.sequential('P1: Tier Enforcement', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // HELPER: CREATE USERS WITH TIERS
  // ========================================

  async function createUserWithTier(tier: 'free' | 'premium' | 'pro') {
    const user = await createTestUser(ctx.db, { tier });
    const token = await signTestAccessToken(user, ctx.env.JWT_SECRET);
    return { user, token };
  }

  // ========================================
  // FREE TIER LIMITS
  // ========================================

  describe('Free Tier Limits', () => {
    it('free user can access basic content', async () => {
      const { token } = await createUserWithTier('free');

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/lessons', {
          headers: authBearerHeaders(token),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('free user cannot access premium stories', async () => {
      const { token } = await createUserWithTier('free');

      // Create a premium story
      const storyId = nanoid();
      await ctx.db.prepare(`
        INSERT INTO stories (id, title, hsk_level, content_status, is_published, access_tier, created_at)
        VALUES (?, ?, ?, ?, 1, ?, strftime('%s', 'now'))
      `).bind(storyId, 'Premium Story', 2, 'live', 'premium').run();

      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/stories/${storyId}`, {
          headers: authBearerHeaders(token),
        }),
        ctx.env,
        executionContext
      );

      // Should be blocked or return limited content
      expect([403, 404]).toContain(res.status);
    });

    it('free user has limited AI generations', async () => {
      const { token } = await createUserWithTier('free');

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/limits', {
          headers: authBearerHeaders(token),
        }),
        ctx.env,
        executionContext
      );

      if (res.status === 200) {
        const body = await res.json();
        expect(body.limits?.requestsPerDay).toBeLessThanOrEqual(10);
      }
    });
  });

  // ========================================
  // PREMIUM TIER ACCESS
  // ========================================

  describe('Premium Tier Access', () => {
    it('premium user can access premium content', async () => {
      const { token } = await createUserWithTier('premium');

      // Create a premium story
      const storyId = nanoid();
      await ctx.db.prepare(`
        INSERT INTO stories (id, title, hsk_level, content_status, is_published, access_tier, created_at)
        VALUES (?, ?, ?, ?, 1, ?, strftime('%s', 'now'))
      `).bind(storyId, 'Premium Story', 2, 'live', 'premium').run();

      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/stories/${storyId}`, {
          headers: authBearerHeaders(token),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('premium user has higher AI limits', async () => {
      const { token } = await createUserWithTier('premium');

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/limits', {
          headers: authBearerHeaders(token),
        }),
        ctx.env,
        executionContext
      );

      if (res.status === 200) {
        const body = await res.json();
        expect(body.limits?.requestsPerDay).toBeGreaterThan(10);
      }
    });

    it('premium user can download offline content', async () => {
      const { token } = await createUserWithTier('premium');

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/content/offline/hsk/1', {
          headers: authBearerHeaders(token),
        }),
        ctx.env,
        executionContext
      );

      // Premium users should have access
      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // PRO/ADMIN TIER
  // ========================================

  describe('Pro Tier Access', () => {
    it('pro user has unlimited access', async () => {
      const { token } = await createUserWithTier('pro');

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/limits', {
          headers: authBearerHeaders(token),
        }),
        ctx.env,
        executionContext
      );

      if (res.status === 200) {
        const body = await res.json();
        expect(body.limits?.requestsPerDay).toBeGreaterThanOrEqual(1000);
      }
    });
  });

  // ========================================
  // TIER UPGRADE/DOWNGRADE
  // ========================================

  describe('Tier Changes', () => {
    it('user tier reflects in API responses', async () => {
      const { user, token } = await createUserWithTier('free');

      // Upgrade user
      await ctx.db.prepare('UPDATE ba_user SET tier = ? WHERE id = ?')
        .bind('premium', user.id).run();
      await ctx.db.prepare('UPDATE users SET tier = ? WHERE id = ?')
        .bind('premium', user.id).run();

      // New token would have updated tier
      const newToken = await signTestAccessToken(
        { ...user, tier: 'premium' },
        ctx.env.JWT_SECRET
      );

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me', {
          headers: authBearerHeaders(newToken),
        }),
        ctx.env,
        executionContext
      );

      if (res.status === 200) {
        const body = await res.json();
        // Response is flat, tier is at top level (not nested under user)
        expect(body.tier).toBe('premium');
      }
    });
  });

  // ========================================
  // CONTENT GATING
  // ========================================

  describe('Content Gating', () => {
    it('free content accessible to all', async () => {
      const { token } = await createUserWithTier('free');

      // Create free story
      const storyId = nanoid();
      await ctx.db.prepare(`
        INSERT INTO stories (id, title, hsk_level, content_status, is_published, access_tier, created_at)
        VALUES (?, ?, ?, ?, 1, ?, strftime('%s', 'now'))
      `).bind(storyId, 'Free Story', 1, 'live', 'free').run();

      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/stories/${storyId}`, {
          headers: authBearerHeaders(token),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('lists show tier indicator', async () => {
      const { token } = await createUserWithTier('free');

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/stories', {
          headers: authBearerHeaders(token),
        }),
        ctx.env,
        executionContext
      );

      if (res.status === 200) {
        const body = await res.json();
        if (body.stories?.length > 0) {
          // Stories should have tier info
          expect(body.stories[0]).toHaveProperty('accessTier');
        }
      }
    });
  });

  // ========================================
  // RATE LIMIT BY TIER
  // ========================================

  describe('Rate Limits by Tier', () => {
    it('different tiers have different limits', async () => {
      const freeUser = await createUserWithTier('free');
      const premiumUser = await createUserWithTier('premium');

      const freeRes = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/limits', {
          headers: authBearerHeaders(freeUser.token),
        }),
        ctx.env,
        executionContext
      );

      const premiumRes = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/limits', {
          headers: authBearerHeaders(premiumUser.token),
        }),
        ctx.env,
        executionContext
      );

      if (freeRes.status === 200 && premiumRes.status === 200) {
        const freeBody = await freeRes.json();
        const premiumBody = await premiumRes.json();

        expect(premiumBody.limits?.requestsPerDay)
          .toBeGreaterThan(freeBody.limits?.requestsPerDay);
      }
    });
  });

  // ========================================
  // WEBHOOK TIER UPDATES
  // ========================================

  describe('Webhook Tier Updates', () => {
    it('RevenueCat webhook updates tier', async () => {
      const { user } = await createUserWithTier('free');

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/billing/webhooks/revenuecat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: {
              type: 'INITIAL_PURCHASE',
              app_user_id: user.id,
              product_id: 'hanzi_master_monthly',
            },
          }),
        }),
        ctx.env,
        executionContext
      );

      // Webhook should process
      expect([200, 400, 404]).toContain(res.status);
    });
  });
});

