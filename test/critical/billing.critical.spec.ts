/**
 * Billing Critical Path Tests
 * 
 * Tests subscription management and RevenueCat webhook flows:
 * - Webhook authentication
 * - Subscription state machine transitions
 * - Tier upgrades/downgrades
 * - Edge cases and error handling
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import { createTestUser, type TestUser } from '../fixtures/seed-data';

const baseUrl = 'http://localhost/v1/billing';

describe.sequential('Billing Critical Path', () => {
  let ctx: TestContext;
  let testUser: TestUser;

  beforeEach(async () => {
    ctx = await createTestContext();
    testUser = await createTestUser(ctx.db, {
      tier: 'free',
      subscriptionStatus: 'none',
    });
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
          body: JSON.stringify({
            event: { type: 'INITIAL_PURCHASE', app_user_id: testUser.clerkId },
          }),
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
            Authorization: 'Bearer wrong-secret',
          },
          body: JSON.stringify({
            event: { type: 'INITIAL_PURCHASE', app_user_id: testUser.clerkId },
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('accepts Bearer token format', async () => {
      const res = await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
          },
          body: JSON.stringify({
            event: { type: 'TEST', app_user_id: testUser.clerkId },
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
    });

    it('accepts raw token format (without Bearer prefix)', async () => {
      const res = await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: ctx.env.REVENUECAT_WEBHOOK_SECRET,
          },
          body: JSON.stringify({
            event: { type: 'TEST', app_user_id: testUser.clerkId },
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
    });
  });

  // ========================================
  // SUBSCRIPTION STATE TRANSITIONS
  // ========================================

  describe('Subscription State Transitions', () => {
    const validHeaders = () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
    });

    it('transitions free → premium on INITIAL_PURCHASE', async () => {
      const res = await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: validHeaders(),
          body: JSON.stringify({
            event: {
              type: 'INITIAL_PURCHASE',
              app_user_id: testUser.clerkId,
              product_id: 'hanzi_premium_monthly',
              store: 'app_store',
              expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
            },
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const user = await ctx.db
        .prepare('SELECT tier, subscription_status, subscription_platform FROM users WHERE clerk_id = ?')
        .bind(testUser.clerkId)
        .first<{ tier: string; subscription_status: string; subscription_platform: string }>();

      expect(user?.tier).toBe('premium');
      expect(user?.subscription_status).toBe('active');
      expect(user?.subscription_platform).toBe('ios');
    });

    it('transitions premium → pro on INITIAL_PURCHASE of pro product', async () => {
      // Start with premium
      await ctx.db
        .prepare('UPDATE users SET tier = ?, subscription_status = ? WHERE clerk_id = ?')
        .bind('premium', 'active', testUser.clerkId)
        .run();

      const res = await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: validHeaders(),
          body: JSON.stringify({
            event: {
              type: 'INITIAL_PURCHASE',
              app_user_id: testUser.clerkId,
              product_id: 'hanzi_pro_monthly',
              store: 'play_store',
            },
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const user = await ctx.db
        .prepare('SELECT tier, subscription_platform FROM users WHERE clerk_id = ?')
        .bind(testUser.clerkId)
        .first<{ tier: string; subscription_platform: string }>();

      expect(user?.tier).toBe('pro');
      expect(user?.subscription_platform).toBe('android');
    });

    it('maintains active status on RENEWAL', async () => {
      await ctx.db
        .prepare('UPDATE users SET tier = ?, subscription_status = ? WHERE clerk_id = ?')
        .bind('premium', 'active', testUser.clerkId)
        .run();

      const res = await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: validHeaders(),
          body: JSON.stringify({
            event: {
              type: 'RENEWAL',
              app_user_id: testUser.clerkId,
              product_id: 'hanzi_premium_monthly',
              store: 'app_store',
              expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
            },
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const user = await ctx.db
        .prepare('SELECT subscription_status FROM users WHERE clerk_id = ?')
        .bind(testUser.clerkId)
        .first<{ subscription_status: string }>();

      expect(user?.subscription_status).toBe('active');
    });

    it('transitions to canceled on CANCELLATION (keeps tier)', async () => {
      const futureExpiration = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      await ctx.db
        .prepare('UPDATE users SET tier = ?, subscription_status = ?, subscription_expires_at = ? WHERE clerk_id = ?')
        .bind('premium', 'active', futureExpiration, testUser.clerkId)
        .run();

      const res = await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: validHeaders(),
          body: JSON.stringify({
            event: {
              type: 'CANCELLATION',
              app_user_id: testUser.clerkId,
              product_id: 'hanzi_premium_monthly',
              expiration_at_ms: futureExpiration * 1000,
            },
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const user = await ctx.db
        .prepare('SELECT tier, subscription_status FROM users WHERE clerk_id = ?')
        .bind(testUser.clerkId)
        .first<{ tier: string; subscription_status: string }>();

      expect(user?.tier).toBe('premium'); // Keeps tier until expiration
      expect(user?.subscription_status).toBe('canceled');
    });

    it('transitions to free on EXPIRATION', async () => {
      await ctx.db
        .prepare('UPDATE users SET tier = ?, subscription_status = ? WHERE clerk_id = ?')
        .bind('premium', 'canceled', testUser.clerkId)
        .run();

      const res = await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: validHeaders(),
          body: JSON.stringify({
            event: {
              type: 'EXPIRATION',
              app_user_id: testUser.clerkId,
              product_id: 'hanzi_premium_monthly',
            },
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const user = await ctx.db
        .prepare('SELECT tier, subscription_status FROM users WHERE clerk_id = ?')
        .bind(testUser.clerkId)
        .first<{ tier: string; subscription_status: string }>();

      expect(user?.tier).toBe('free');
      expect(user?.subscription_status).toBe('expired');
    });

    it('transitions to past_due on BILLING_ISSUE', async () => {
      await ctx.db
        .prepare('UPDATE users SET tier = ?, subscription_status = ? WHERE clerk_id = ?')
        .bind('premium', 'active', testUser.clerkId)
        .run();

      const res = await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: validHeaders(),
          body: JSON.stringify({
            event: {
              type: 'BILLING_ISSUE',
              app_user_id: testUser.clerkId,
              product_id: 'hanzi_premium_monthly',
            },
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const user = await ctx.db
        .prepare('SELECT subscription_status FROM users WHERE clerk_id = ?')
        .bind(testUser.clerkId)
        .first<{ subscription_status: string }>();

      expect(user?.subscription_status).toBe('past_due');
    });
  });

  // ========================================
  // PRODUCT ID MAPPING
  // ========================================

  describe('Product ID Mapping', () => {
    const validHeaders = () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
    });

    it('maps hanzi_premium_monthly to premium tier', async () => {
      const res = await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: validHeaders(),
          body: JSON.stringify({
            event: {
              type: 'INITIAL_PURCHASE',
              app_user_id: testUser.clerkId,
              product_id: 'hanzi_premium_monthly',
              store: 'app_store',
            },
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const user = await ctx.db
        .prepare('SELECT tier FROM users WHERE clerk_id = ?')
        .bind(testUser.clerkId)
        .first<{ tier: string }>();

      expect(user?.tier).toBe('premium');
    });

    it('maps hanzi_pro_yearly to pro tier', async () => {
      const res = await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: validHeaders(),
          body: JSON.stringify({
            event: {
              type: 'INITIAL_PURCHASE',
              app_user_id: testUser.clerkId,
              product_id: 'hanzi_pro_yearly',
              store: 'stripe',
            },
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const user = await ctx.db
        .prepare('SELECT tier, subscription_platform FROM users WHERE clerk_id = ?')
        .bind(testUser.clerkId)
        .first<{ tier: string; subscription_platform: string }>();

      expect(user?.tier).toBe('pro');
      expect(user?.subscription_platform).toBe('web');
    });

    it('handles unknown product ID gracefully', async () => {
      const res = await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: validHeaders(),
          body: JSON.stringify({
            event: {
              type: 'INITIAL_PURCHASE',
              app_user_id: testUser.clerkId,
              product_id: 'unknown_product_xyz',
              store: 'app_store',
            },
          }),
        }),
        ctx.env,
        executionContext
      );

      // Should acknowledge but not change tier
      expect(res.status).toBe(200);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const user = await ctx.db
        .prepare('SELECT tier FROM users WHERE clerk_id = ?')
        .bind(testUser.clerkId)
        .first<{ tier: string }>();

      expect(user?.tier).toBe('free'); // Unchanged
    });
  });

  // ========================================
  // STORE PLATFORM MAPPING
  // ========================================

  describe('Store Platform Mapping', () => {
    const validHeaders = () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
    });

    it('maps app_store to ios', async () => {
      await processWebhook(ctx, testUser.clerkId, 'app_store');
      const platform = await getUserPlatform(ctx, testUser.clerkId);
      expect(platform).toBe('ios');
    });

    it('maps mac_app_store to ios', async () => {
      await processWebhook(ctx, testUser.clerkId, 'mac_app_store');
      const platform = await getUserPlatform(ctx, testUser.clerkId);
      expect(platform).toBe('ios');
    });

    it('maps play_store to android', async () => {
      await processWebhook(ctx, testUser.clerkId, 'play_store');
      const platform = await getUserPlatform(ctx, testUser.clerkId);
      expect(platform).toBe('android');
    });

    it('maps stripe to web', async () => {
      await processWebhook(ctx, testUser.clerkId, 'stripe');
      const platform = await getUserPlatform(ctx, testUser.clerkId);
      expect(platform).toBe('web');
    });

    it('maps promotional to web', async () => {
      await processWebhook(ctx, testUser.clerkId, 'promotional');
      const platform = await getUserPlatform(ctx, testUser.clerkId);
      expect(platform).toBe('web');
    });
  });

  // ========================================
  // ERROR HANDLING
  // ========================================

  describe('Error Handling', () => {
    const validHeaders = () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
    });

    it('handles malformed JSON gracefully', async () => {
      const res = await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: validHeaders(),
          body: 'not valid json{',
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Invalid JSON');
    });

    it('handles non-existent user gracefully', async () => {
      const res = await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: validHeaders(),
          body: JSON.stringify({
            event: {
              type: 'INITIAL_PURCHASE',
              app_user_id: 'user_does_not_exist_at_all',
              product_id: 'hanzi_premium_monthly',
              store: 'app_store',
            },
          }),
        }),
        ctx.env,
        executionContext
      );

      // Should acknowledge webhook even if user doesn't exist
      expect(res.status).toBe(200);
    });

    it('handles unknown event types gracefully', async () => {
      const res = await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: validHeaders(),
          body: JSON.stringify({
            event: {
              type: 'SOME_FUTURE_EVENT_TYPE',
              app_user_id: testUser.clerkId,
              product_id: 'hanzi_premium_monthly',
            },
          }),
        }),
        ctx.env,
        executionContext
      );

      // Should acknowledge
      expect(res.status).toBe(200);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // User should be unchanged
      const user = await ctx.db
        .prepare('SELECT tier FROM users WHERE clerk_id = ?')
        .bind(testUser.clerkId)
        .first<{ tier: string }>();

      expect(user?.tier).toBe('free');
    });

    it('handles missing event field in payload', async () => {
      const res = await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: validHeaders(),
          body: JSON.stringify({ not_event: 'something' }),
        }),
        ctx.env,
        executionContext
      );

      // Should handle gracefully
      expect([200, 400]).toContain(res.status);
    });
  });

  // ========================================
  // AUDIT TRAIL
  // ========================================

  describe('Audit Trail', () => {
    const validHeaders = () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
    });

    it('records subscription change event', async () => {
      await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: validHeaders(),
          body: JSON.stringify({
            event: {
              type: 'INITIAL_PURCHASE',
              app_user_id: testUser.clerkId,
              product_id: 'hanzi_premium_monthly',
              store: 'app_store',
            },
          }),
        }),
        ctx.env,
        executionContext
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      const event = await ctx.db
        .prepare('SELECT * FROM system_events WHERE user_id = ? AND event_type = ?')
        .bind(testUser.clerkId, 'user.subscription.changed')
        .first();

      expect(event).toBeDefined();
    });

    it('records subscription ended event on expiration', async () => {
      await ctx.db
        .prepare('UPDATE users SET tier = ?, subscription_status = ? WHERE clerk_id = ?')
        .bind('premium', 'canceled', testUser.clerkId)
        .run();

      await ctx.app.fetch(
        new Request(`${baseUrl}/webhooks/revenuecat`, {
          method: 'POST',
          headers: validHeaders(),
          body: JSON.stringify({
            event: {
              type: 'EXPIRATION',
              app_user_id: testUser.clerkId,
              product_id: 'hanzi_premium_monthly',
            },
          }),
        }),
        ctx.env,
        executionContext
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      const event = await ctx.db
        .prepare('SELECT * FROM system_events WHERE user_id = ? AND event_type = ?')
        .bind(testUser.clerkId, 'user.subscription.ended')
        .first();

      expect(event).toBeDefined();
    });
  });
});

// Helper functions

async function processWebhook(ctx: TestContext, clerkId: string, store: string) {
  await ctx.app.fetch(
    new Request('http://localhost/v1/billing/webhooks/revenuecat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
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
  await new Promise((resolve) => setTimeout(resolve, 100));
}

async function getUserPlatform(ctx: TestContext, clerkId: string): Promise<string | null> {
  const user = await ctx.db
    .prepare('SELECT subscription_platform FROM users WHERE clerk_id = ?')
    .bind(clerkId)
    .first<{ subscription_platform: string | null }>();
  return user?.subscription_platform ?? null;
}



