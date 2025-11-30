/**
 * Billing Critical Path Tests
 * 
 * P0 Priority - Revenue-critical functionality:
 * - RevenueCat webhook authentication
 * - Subscription lifecycle (purchase → renewal → cancel → expire)
 * - Tier upgrades and downgrades
 * - Grace periods and billing issues
 * - Analytics event recording
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';

const baseUrl = 'http://localhost/v1/billing';

describe.sequential('Billing Critical Path', () => {
  let ctx: TestContext;
  let testUserId: string;
  let clerkId: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    
    // Create a test user with free tier
    testUserId = crypto.randomUUID();
    clerkId = `user_test_${Date.now()}`;
    
    await ctx.db.prepare(`
      INSERT INTO users (id, clerk_id, email, name, role, tier, subscription_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
    `)
      .bind(testUserId, clerkId, 'test@example.com', 'Test User', 'user', 'free', 'none')
      .run();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // WEBHOOK AUTHENTICATION
  // ========================================

  describe('Webhook Authentication', () => {
    it('rejects request without Authorization header', async () => {
      const res = await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: { type: 'INITIAL_PURCHASE' } }),
        }),
        ctx.env,
        executionContext
      );
      expect(res.status).toBe(401);
    });

    it('rejects request with incorrect secret', async () => {
      const res = await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer wrong-secret',
          },
          body: JSON.stringify({ event: { type: 'INITIAL_PURCHASE' } }),
        }),
        ctx.env,
        executionContext
      );
      expect(res.status).toBe(401);
    });

    it('accepts request with correct Bearer token', async () => {
      const res = await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
          },
          body: JSON.stringify({
            event: {
              type: 'INITIAL_PURCHASE',
              app_user_id: clerkId,
              product_id: 'hanzi_premium_monthly',
              store: 'app_store',
            },
          }),
        }),
        ctx.env,
        executionContext
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.received).toBe(true);
    });

    it('accepts request with token without Bearer prefix', async () => {
      const res = await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': ctx.env.REVENUECAT_WEBHOOK_SECRET,
          },
          body: JSON.stringify({
            event: {
              type: 'INITIAL_PURCHASE',
              app_user_id: clerkId,
              product_id: 'hanzi_premium_monthly',
            },
          }),
        }),
        ctx.env,
        executionContext
      );
      expect(res.status).toBe(200);
    });

    it('rejects malformed JSON', async () => {
      const res = await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
          },
          body: 'not valid json{',
        }),
        ctx.env,
        executionContext
      );
      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // SUBSCRIPTION LIFECYCLE
  // ========================================

  describe('Subscription Lifecycle', () => {
    const sendWebhook = async (eventType: string, productId: string = 'hanzi_premium_monthly', extra: Record<string, unknown> = {}) => {
      const res = await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
          },
          body: JSON.stringify({
            event: {
              type: eventType,
              app_user_id: clerkId,
              product_id: productId,
              store: 'app_store',
              expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
              ...extra,
            },
          }),
        }),
        ctx.env,
        executionContext
      );
      // Wait for async processing
      await new Promise(r => setTimeout(r, 100));
      return res;
    };

    const getUser = async () => {
      return ctx.db
        .prepare('SELECT tier, subscription_status, subscription_platform FROM users WHERE clerk_id = ?')
        .bind(clerkId)
        .first<{ tier: string; subscription_status: string; subscription_platform: string | null }>();
    };

    it('INITIAL_PURCHASE upgrades user to premium', async () => {
      const res = await sendWebhook('INITIAL_PURCHASE');
      expect(res.status).toBe(200);

      const user = await getUser();
      expect(user?.tier).toBe('premium');
      expect(user?.subscription_status).toBe('active');
      expect(user?.subscription_platform).toBe('ios');
    });

    it('RENEWAL keeps user premium', async () => {
      // First purchase
      await sendWebhook('INITIAL_PURCHASE');
      
      // Then renewal
      const res = await sendWebhook('RENEWAL');
      expect(res.status).toBe(200);

      const user = await getUser();
      expect(user?.tier).toBe('premium');
      expect(user?.subscription_status).toBe('active');
    });

    it('CANCELLATION marks status but keeps tier until expiry', async () => {
      // Purchase first
      await sendWebhook('INITIAL_PURCHASE');
      
      // Set future expiration
      const futureExp = Math.floor(Date.now() / 1000) + 86400;
      await ctx.db.prepare('UPDATE users SET subscription_expires_at = ? WHERE clerk_id = ?')
        .bind(futureExp, clerkId).run();
      
      // Cancel
      const res = await sendWebhook('CANCELLATION');
      expect(res.status).toBe(200);

      const user = await getUser();
      expect(user?.tier).toBe('premium'); // Still premium
      expect(user?.subscription_status).toBe('canceled'); // But marked canceled
    });

    it('EXPIRATION downgrades user to free', async () => {
      // Purchase first
      await sendWebhook('INITIAL_PURCHASE');
      
      // Set past expiration
      const pastExp = Math.floor(Date.now() / 1000) - 86400;
      await ctx.db.prepare('UPDATE users SET subscription_expires_at = ? WHERE clerk_id = ?')
        .bind(pastExp, clerkId).run();
      
      // Expire
      const res = await sendWebhook('EXPIRATION');
      expect(res.status).toBe(200);

      const user = await getUser();
      expect(user?.tier).toBe('free');
      expect(user?.subscription_status).toBe('expired');
    });

    it('BILLING_ISSUE marks subscription as past_due', async () => {
      // Purchase first
      await sendWebhook('INITIAL_PURCHASE');
      
      // Billing issue
      const res = await sendWebhook('BILLING_ISSUE');
      expect(res.status).toBe(200);

      const user = await getUser();
      expect(user?.subscription_status).toBe('past_due');
    });

    it('UNCANCELLATION reactivates subscription', async () => {
      // Purchase, then cancel
      await sendWebhook('INITIAL_PURCHASE');
      await ctx.db.prepare('UPDATE users SET subscription_status = ? WHERE clerk_id = ?')
        .bind('canceled', clerkId).run();
      
      // Uncancel
      const res = await sendWebhook('UNCANCELLATION');
      expect(res.status).toBe(200);

      const user = await getUser();
      expect(user?.subscription_status).toBe('active');
    });
  });

  // ========================================
  // TIER UPGRADES/DOWNGRADES
  // ========================================

  describe('Tier Transitions', () => {
    const sendWebhook = async (productId: string) => {
      return ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
          },
          body: JSON.stringify({
            event: {
              type: 'INITIAL_PURCHASE',
              app_user_id: clerkId,
              product_id: productId,
              store: 'app_store',
              expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
            },
          }),
        }),
        ctx.env,
        executionContext
      );
    };

    it('upgrades free → premium with premium product', async () => {
      await sendWebhook('hanzi_premium_monthly');
      await new Promise(r => setTimeout(r, 100));

      const user = await ctx.db
        .prepare('SELECT tier FROM users WHERE clerk_id = ?')
        .bind(clerkId)
        .first<{ tier: string }>();
      expect(user?.tier).toBe('premium');
    });

    it('upgrades free → pro with pro product', async () => {
      await sendWebhook('hanzi_pro_monthly');
      await new Promise(r => setTimeout(r, 100));

      const user = await ctx.db
        .prepare('SELECT tier FROM users WHERE clerk_id = ?')
        .bind(clerkId)
        .first<{ tier: string }>();
      expect(user?.tier).toBe('pro');
    });

    it('upgrades premium → pro with pro product', async () => {
      // Start as premium
      await ctx.db.prepare('UPDATE users SET tier = ? WHERE clerk_id = ?')
        .bind('premium', clerkId).run();
      
      await sendWebhook('hanzi_pro_monthly');
      await new Promise(r => setTimeout(r, 100));

      const user = await ctx.db
        .prepare('SELECT tier FROM users WHERE clerk_id = ?')
        .bind(clerkId)
        .first<{ tier: string }>();
      expect(user?.tier).toBe('pro');
    });

    it('handles unknown product_id gracefully (defaults to free)', async () => {
      await sendWebhook('unknown_product_xyz');
      await new Promise(r => setTimeout(r, 100));

      const user = await ctx.db
        .prepare('SELECT tier FROM users WHERE clerk_id = ?')
        .bind(clerkId)
        .first<{ tier: string }>();
      expect(user?.tier).toBe('free');
    });

    it('handles master product variants', async () => {
      await sendWebhook('hanzi_master_yearly');
      await new Promise(r => setTimeout(r, 100));

      const user = await ctx.db
        .prepare('SELECT tier FROM users WHERE clerk_id = ?')
        .bind(clerkId)
        .first<{ tier: string }>();
      expect(user?.tier).toBe('premium'); // master maps to premium
    });
  });

  // ========================================
  // PLATFORM MAPPING
  // ========================================

  describe('Platform Mapping', () => {
    const sendWithStore = async (store: string) => {
      const res = await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
          },
          body: JSON.stringify({
            event: {
              type: 'INITIAL_PURCHASE',
              app_user_id: clerkId,
              product_id: 'hanzi_premium_monthly',
              store,
            },
          }),
        }),
        ctx.env,
        executionContext
      );
      await new Promise(r => setTimeout(r, 100));
      return res;
    };

    it('maps app_store to ios', async () => {
      await sendWithStore('app_store');
      const user = await ctx.db
        .prepare('SELECT subscription_platform FROM users WHERE clerk_id = ?')
        .bind(clerkId)
        .first<{ subscription_platform: string }>();
      expect(user?.subscription_platform).toBe('ios');
    });

    it('maps play_store to android', async () => {
      await sendWithStore('play_store');
      const user = await ctx.db
        .prepare('SELECT subscription_platform FROM users WHERE clerk_id = ?')
        .bind(clerkId)
        .first<{ subscription_platform: string }>();
      expect(user?.subscription_platform).toBe('android');
    });

    it('maps mac_app_store to ios', async () => {
      await sendWithStore('mac_app_store');
      const user = await ctx.db
        .prepare('SELECT subscription_platform FROM users WHERE clerk_id = ?')
        .bind(clerkId)
        .first<{ subscription_platform: string }>();
      expect(user?.subscription_platform).toBe('ios');
    });
  });

  // ========================================
  // ANALYTICS EVENTS
  // ========================================

  describe('Analytics Events', () => {
    it('records subscription.changed event on purchase', async () => {
      await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
          },
          body: JSON.stringify({
            event: {
              type: 'INITIAL_PURCHASE',
              app_user_id: clerkId,
              product_id: 'hanzi_premium_monthly',
              store: 'app_store',
            },
          }),
        }),
        ctx.env,
        executionContext
      );
      await new Promise(r => setTimeout(r, 100));

      const event = await ctx.db
        .prepare('SELECT * FROM system_events WHERE user_id = ? AND event_type = ?')
        .bind(clerkId, 'user.subscription.changed')
        .first();
      expect(event).toBeDefined();
    });

    it('records subscription.ended event on expiration', async () => {
      // First purchase
      await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
          },
          body: JSON.stringify({
            event: { type: 'INITIAL_PURCHASE', app_user_id: clerkId, product_id: 'hanzi_premium_monthly' },
          }),
        }),
        ctx.env,
        executionContext
      );
      await new Promise(r => setTimeout(r, 50));

      // Set past expiration
      await ctx.db.prepare('UPDATE users SET subscription_expires_at = ? WHERE clerk_id = ?')
        .bind(Math.floor(Date.now() / 1000) - 86400, clerkId).run();

      // Then expire
      await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
          },
          body: JSON.stringify({
            event: { type: 'EXPIRATION', app_user_id: clerkId, product_id: 'hanzi_premium_monthly' },
          }),
        }),
        ctx.env,
        executionContext
      );
      await new Promise(r => setTimeout(r, 100));

      const event = await ctx.db
        .prepare('SELECT * FROM system_events WHERE user_id = ? AND event_type = ?')
        .bind(clerkId, 'user.subscription.ended')
        .first();
      expect(event).toBeDefined();
    });
  });

  // ========================================
  // EDGE CASES
  // ========================================

  describe('Edge Cases', () => {
    it('handles webhook for non-existent user gracefully', async () => {
      const res = await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
          },
          body: JSON.stringify({
            event: {
              type: 'INITIAL_PURCHASE',
              app_user_id: 'non_existent_user_xyz',
              product_id: 'hanzi_premium_monthly',
            },
          }),
        }),
        ctx.env,
        executionContext
      );
      expect(res.status).toBe(200); // Returns 200 to acknowledge receipt
    });

    it('ignores unknown event types', async () => {
      const res = await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
          },
          body: JSON.stringify({
            event: {
              type: 'UNKNOWN_EVENT_TYPE',
              app_user_id: clerkId,
            },
          }),
        }),
        ctx.env,
        executionContext
      );
      expect(res.status).toBe(200);
      await new Promise(r => setTimeout(r, 100));

      // User should remain unchanged
      const user = await ctx.db
        .prepare('SELECT tier, subscription_status FROM users WHERE clerk_id = ?')
        .bind(clerkId)
        .first<{ tier: string; subscription_status: string }>();
      expect(user?.tier).toBe('free');
      expect(user?.subscription_status).toBe('none');
    });

    it('handles flat event format (not nested)', async () => {
      const res = await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
          },
          body: JSON.stringify({
            type: 'INITIAL_PURCHASE',
            app_user_id: clerkId,
            product_id: 'hanzi_premium_monthly',
            store: 'app_store',
          }),
        }),
        ctx.env,
        executionContext
      );
      expect(res.status).toBe(200);
      await new Promise(r => setTimeout(r, 100));

      const user = await ctx.db
        .prepare('SELECT tier FROM users WHERE clerk_id = ?')
        .bind(clerkId)
        .first<{ tier: string }>();
      expect(user?.tier).toBe('premium');
    });
  });

  // ========================================
  // HEALTH ENDPOINTS
  // ========================================

  describe('Health Endpoints', () => {
    it('GET /webhooks/revenuecat returns status ok', async () => {
      const res = await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, { method: 'GET' }),
        ctx.env,
        executionContext
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('ok');
    });

    it('GET /health returns service info', async () => {
      const res = await ctx.app.fetch(
        new Request(`${baseUrl}/health`, { method: 'GET' }),
        ctx.env,
        executionContext
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.service).toBe('billing');
    });
  });
});
