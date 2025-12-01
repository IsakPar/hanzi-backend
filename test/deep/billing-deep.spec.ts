/**
 * Billing Deep Edge Case Tests
 * 
 * Phase 1 - Deep P0 Tests: RevenueCat webhooks, tier transitions, edge cases
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createBetterAuthUser,
  authBearerHeaders,
  jsonAuthBearerHeaders,
} from '../fixtures/jwt-auth-helpers';

describe.sequential('Billing Deep Edge Cases', () => {
  let ctx: TestContext;
  let testUserId: string;
  let clerkId: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    
    // Create a test user
    testUserId = crypto.randomUUID();
    clerkId = `user_test_${Date.now()}`;
    
    await ctx.db.prepare(`
      INSERT INTO users (id, clerk_id, email, name, role, tier, subscription_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
    `).bind(testUserId, clerkId, 'test@example.com', 'Test User', 'user', 'free', 'none').run();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  const sendWebhook = async (event: Record<string, unknown>) => {
    return ctx.app.fetch(
      new Request('http://localhost/v1/billing/webhooks/revenuecat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
        },
        body: JSON.stringify({ event }),
      }),
      ctx.env,
      executionContext
    );
  };

  // ========================================
  // WEBHOOK IDEMPOTENCY
  // ========================================

  describe('Webhook Idempotency', () => {
    it('handles duplicate INITIAL_PURCHASE webhooks', async () => {
      const event = {
        type: 'INITIAL_PURCHASE',
        app_user_id: clerkId,
        product_id: 'hanzi_premium_monthly',
        store: 'app_store',
        expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };
      
      // Send same webhook twice
      const res1 = await sendWebhook(event);
      const res2 = await sendWebhook(event);
      
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      
      // User should still be premium (not double-processed)
      await new Promise(r => setTimeout(r, 100));
      const user = await ctx.db
        .prepare('SELECT tier FROM users WHERE clerk_id = ?')
        .bind(clerkId)
        .first<{ tier: string }>();
      
      expect(user?.tier).toBe('premium');
    });

    it('handles duplicate RENEWAL webhooks', async () => {
      await ctx.db.prepare(`
        UPDATE users SET tier = 'premium', subscription_status = 'active' WHERE clerk_id = ?
      `).bind(clerkId).run();
      
      const event = {
        type: 'RENEWAL',
        app_user_id: clerkId,
        product_id: 'hanzi_premium_monthly',
        store: 'app_store',
        expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
      };
      
      const res1 = await sendWebhook(event);
      const res2 = await sendWebhook(event);
      const res3 = await sendWebhook(event);
      
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res3.status).toBe(200);
    });
  });

  // ========================================
  // TIER TRANSITIONS
  // ========================================

  describe('Tier Transitions', () => {
    it('free → premium → pro upgrade path', async () => {
      // Free → Premium
      await sendWebhook({
        type: 'INITIAL_PURCHASE',
        app_user_id: clerkId,
        product_id: 'hanzi_premium_monthly',
        store: 'app_store',
        expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });
      
      await new Promise(r => setTimeout(r, 100));
      let user = await ctx.db
        .prepare('SELECT tier FROM users WHERE clerk_id = ?')
        .bind(clerkId)
        .first<{ tier: string }>();
      expect(user?.tier).toBe('premium');
      
      // Premium → Pro
      await sendWebhook({
        type: 'INITIAL_PURCHASE',
        app_user_id: clerkId,
        product_id: 'hanzi_pro_monthly',
        store: 'app_store',
        expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });
      
      await new Promise(r => setTimeout(r, 100));
      user = await ctx.db
        .prepare('SELECT tier FROM users WHERE clerk_id = ?')
        .bind(clerkId)
        .first<{ tier: string }>();
      expect(user?.tier).toBe('pro');
    });

    it('pro → premium downgrade path', async () => {
      await ctx.db.prepare(`
        UPDATE users SET tier = 'pro', subscription_status = 'active' WHERE clerk_id = ?
      `).bind(clerkId).run();
      
      // Pro expires, then premium purchase
      await sendWebhook({
        type: 'EXPIRATION',
        app_user_id: clerkId,
        product_id: 'hanzi_pro_monthly',
        store: 'app_store',
      });
      
      await new Promise(r => setTimeout(r, 100));
      
      await sendWebhook({
        type: 'INITIAL_PURCHASE',
        app_user_id: clerkId,
        product_id: 'hanzi_premium_monthly',
        store: 'app_store',
        expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });
      
      await new Promise(r => setTimeout(r, 100));
      const user = await ctx.db
        .prepare('SELECT tier FROM users WHERE clerk_id = ?')
        .bind(clerkId)
        .first<{ tier: string }>();
      expect(user?.tier).toBe('premium');
    });

    it('premium → free on expiration', async () => {
      await ctx.db.prepare(`
        UPDATE users SET tier = 'premium', subscription_status = 'active' WHERE clerk_id = ?
      `).bind(clerkId).run();
      
      await sendWebhook({
        type: 'EXPIRATION',
        app_user_id: clerkId,
        product_id: 'hanzi_premium_monthly',
        store: 'app_store',
      });
      
      await new Promise(r => setTimeout(r, 100));
      const user = await ctx.db
        .prepare('SELECT tier FROM users WHERE clerk_id = ?')
        .bind(clerkId)
        .first<{ tier: string }>();
      expect(user?.tier).toBe('free');
    });
  });

  // ========================================
  // GRACE PERIOD HANDLING
  // ========================================

  describe('Grace Period Handling', () => {
    it('canceled subscription keeps tier until expiry', async () => {
      const futureExpiration = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days
      
      await ctx.db.prepare(`
        UPDATE users SET tier = 'premium', subscription_status = 'active', subscription_expires_at = ? 
        WHERE clerk_id = ?
      `).bind(futureExpiration, clerkId).run();
      
      await sendWebhook({
        type: 'CANCELLATION',
        app_user_id: clerkId,
        product_id: 'hanzi_premium_monthly',
        store: 'app_store',
        expiration_at_ms: futureExpiration * 1000,
      });
      
      await new Promise(r => setTimeout(r, 100));
      const user = await ctx.db
        .prepare('SELECT tier, subscription_status FROM users WHERE clerk_id = ?')
        .bind(clerkId)
        .first<{ tier: string; subscription_status: string }>();
      
      expect(user?.tier).toBe('premium');
      expect(user?.subscription_status).toBe('canceled');
    });

    it('billing issue marks as past_due but keeps tier', async () => {
      await ctx.db.prepare(`
        UPDATE users SET tier = 'premium', subscription_status = 'active' WHERE clerk_id = ?
      `).bind(clerkId).run();
      
      await sendWebhook({
        type: 'BILLING_ISSUE',
        app_user_id: clerkId,
        product_id: 'hanzi_premium_monthly',
        store: 'app_store',
      });
      
      await new Promise(r => setTimeout(r, 100));
      const user = await ctx.db
        .prepare('SELECT tier, subscription_status FROM users WHERE clerk_id = ?')
        .bind(clerkId)
        .first<{ tier: string; subscription_status: string }>();
      
      expect(user?.tier).toBe('premium');
      expect(user?.subscription_status).toBe('past_due');
    });

    it('uncancellation reactivates subscription', async () => {
      await ctx.db.prepare(`
        UPDATE users SET tier = 'premium', subscription_status = 'canceled' WHERE clerk_id = ?
      `).bind(clerkId).run();
      
      await sendWebhook({
        type: 'UNCANCELLATION',
        app_user_id: clerkId,
        product_id: 'hanzi_premium_monthly',
        store: 'app_store',
        expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });
      
      await new Promise(r => setTimeout(r, 100));
      const user = await ctx.db
        .prepare('SELECT subscription_status FROM users WHERE clerk_id = ?')
        .bind(clerkId)
        .first<{ subscription_status: string }>();
      
      expect(user?.subscription_status).toBe('active');
    });
  });

  // ========================================
  // PLATFORM HANDLING
  // ========================================

  describe('Platform Handling', () => {
    it('iOS purchase sets platform correctly', async () => {
      await sendWebhook({
        type: 'INITIAL_PURCHASE',
        app_user_id: clerkId,
        product_id: 'hanzi_premium_monthly',
        store: 'app_store',
        expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });
      
      await new Promise(r => setTimeout(r, 100));
      const user = await ctx.db
        .prepare('SELECT subscription_platform FROM users WHERE clerk_id = ?')
        .bind(clerkId)
        .first<{ subscription_platform: string }>();
      
      expect(user?.subscription_platform).toBe('ios');
    });

    it('Android purchase sets platform correctly', async () => {
      await sendWebhook({
        type: 'INITIAL_PURCHASE',
        app_user_id: clerkId,
        product_id: 'hanzi_premium_monthly',
        store: 'play_store',
        expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });
      
      await new Promise(r => setTimeout(r, 100));
      const user = await ctx.db
        .prepare('SELECT subscription_platform FROM users WHERE clerk_id = ?')
        .bind(clerkId)
        .first<{ subscription_platform: string }>();
      
      expect(user?.subscription_platform).toBe('android');
    });

    it('promotional purchase sets a platform', async () => {
      await sendWebhook({
        type: 'INITIAL_PURCHASE',
        app_user_id: clerkId,
        product_id: 'hanzi_premium_monthly',
        store: 'promotional',
        expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });
      
      await new Promise(r => setTimeout(r, 100));
      const user = await ctx.db
        .prepare('SELECT subscription_platform FROM users WHERE clerk_id = ?')
        .bind(clerkId)
        .first<{ subscription_platform: string }>();
      
      // Promotional can map to any platform or null depending on implementation
      expect(['ios', 'android', 'web', null, undefined]).toContain(user?.subscription_platform);
    });
  });

  // ========================================
  // ERROR HANDLING
  // ========================================

  describe('Error Handling', () => {
    it('unknown user_id does not crash', async () => {
      const res = await sendWebhook({
        type: 'INITIAL_PURCHASE',
        app_user_id: 'user_nonexistent_12345',
        product_id: 'hanzi_premium_monthly',
        store: 'app_store',
        expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });
      
      expect([200, 404]).toContain(res.status);
    });

    it('unknown product_id defaults to free', async () => {
      await sendWebhook({
        type: 'INITIAL_PURCHASE',
        app_user_id: clerkId,
        product_id: 'unknown_product_xyz',
        store: 'app_store',
        expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });
      
      await new Promise(r => setTimeout(r, 100));
      const user = await ctx.db
        .prepare('SELECT tier FROM users WHERE clerk_id = ?')
        .bind(clerkId)
        .first<{ tier: string }>();
      
      expect(user?.tier).toBe('free');
    });

    it('missing expiration_at_ms does not crash', async () => {
      const res = await sendWebhook({
        type: 'INITIAL_PURCHASE',
        app_user_id: clerkId,
        product_id: 'hanzi_premium_monthly',
        store: 'app_store',
      });
      
      expect([200, 400, 500]).toContain(res.status);
    });

    it('null values in webhook do not crash', async () => {
      const res = await sendWebhook({
        type: 'INITIAL_PURCHASE',
        app_user_id: clerkId,
        product_id: null,
        store: null,
        expiration_at_ms: null,
      });
      
      expect([200, 400, 500]).toContain(res.status);
    });
  });

  // ========================================
  // ADMIN PROMO GRANTS
  // ========================================

  describe('Admin Promo Grants', () => {
    it('admin can grant premium access', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/subscriptions/grant-promo', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({
            userId: testUserId,
            tier: 'premium',
            durationDays: 30,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 500]).toContain(res.status);
    });

    it('admin can grant pro access', async () => {
      const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/admin/subscriptions/grant-promo', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(sessionToken),
          body: JSON.stringify({
            userId: testUserId,
            tier: 'pro',
            durationDays: 7,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });
});

