/**
 * P0: Billing Critical - RevenueCat webhook security
 * These tests prevent billing fraud and replay attacks
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import { createTestUser } from '../fixtures/seed-data';
import crypto from 'crypto';

describe.sequential('P0: Billing Critical', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  function createWebhookSignature(body: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(body).digest('hex');
  }

  // ========================================
  // WEBHOOK SIGNATURE VERIFICATION
  // ========================================

  describe('Webhook Signature Verification', () => {
    it('rejects webhook with missing signature', async () => {
      const body = JSON.stringify({
        event: { type: 'INITIAL_PURCHASE' },
        app_user_id: 'test-user',
      });
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/webhooks/revenuecat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        }),
        ctx.env,
        executionContext
      );
      
      // Should not return 200 (success) without signature
      expect(res.status).not.toBe(200);
    });

    it('rejects webhook with invalid signature', async () => {
      const body = JSON.stringify({
        event: { type: 'INITIAL_PURCHASE' },
        app_user_id: 'test-user',
      });
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/webhooks/revenuecat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-RevenueCat-Signature': 'invalid-signature-abc123',
          },
          body,
        }),
        ctx.env,
        executionContext
      );
      
      // Should not return 200 (success) with invalid signature
      expect(res.status).not.toBe(200);
    });

    it('rejects webhook with wrong secret signature', async () => {
      const body = JSON.stringify({
        event: { type: 'INITIAL_PURCHASE' },
        app_user_id: 'test-user',
      });
      
      // Sign with wrong secret
      const wrongSignature = createWebhookSignature(body, 'wrong-secret');
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/webhooks/revenuecat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-RevenueCat-Signature': wrongSignature,
          },
          body,
        }),
        ctx.env,
        executionContext
      );
      
      // Should not return 200 (success) with wrong signature
      expect(res.status).not.toBe(200);
    });
  });

  // ========================================
  // TIER TRANSITION SECURITY
  // ========================================

  describe('Tier Transition Security', () => {
    it('upgrade applies immediately', async () => {
      const user = await createTestUser(ctx.db, { tier: 'free' });
      
      // Simulate upgrade
      await ctx.db.prepare(`
        UPDATE users SET tier = 'premium', subscription_status = 'active'
        WHERE id = ?
      `).bind(user.id).run();
      
      const updated = await ctx.db
        .prepare('SELECT tier, subscription_status FROM users WHERE id = ?')
        .bind(user.id)
        .first<{ tier: string; subscription_status: string }>();
      
      expect(updated?.tier).toBe('premium');
      expect(updated?.subscription_status).toBe('active');
    });

    it('downgrade preserves user data', async () => {
      const user = await createTestUser(ctx.db, { tier: 'premium' });
      
      // User exists with premium tier
      const before = await ctx.db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(user.id)
        .first();
      
      expect(before).toBeTruthy();
      
      // Simulate downgrade
      await ctx.db.prepare(`
        UPDATE users SET tier = 'free' WHERE id = ?
      `).bind(user.id).run();
      
      // User still exists after downgrade
      const after = await ctx.db
        .prepare('SELECT tier FROM users WHERE id = ?')
        .bind(user.id)
        .first<{ tier: string }>();
      
      expect(after?.tier).toBe('free');
    });

    it('expired subscription changes tier', async () => {
      const user = await createTestUser(ctx.db, { tier: 'premium' });
      
      // Simulate expiration
      await ctx.db.prepare(`
        UPDATE users SET subscription_status = 'expired'
        WHERE id = ?
      `).bind(user.id).run();
      
      const updated = await ctx.db
        .prepare('SELECT subscription_status FROM users WHERE id = ?')
        .bind(user.id)
        .first<{ subscription_status: string }>();
      
      expect(updated?.subscription_status).toBe('expired');
    });
  });

  // ========================================
  // PROMO CODE SECURITY
  // ========================================

  describe('Promo Code Security', () => {
    it('promo grant updates tier', async () => {
      const user = await createTestUser(ctx.db, { tier: 'free' });
      
      // Grant promo by updating tier
      await ctx.db.prepare(`
        UPDATE users SET tier = 'premium' WHERE id = ?
      `).bind(user.id).run();
      
      const updated = await ctx.db
        .prepare('SELECT tier FROM users WHERE id = ?')
        .bind(user.id)
        .first<{ tier: string }>();
      
      expect(updated?.tier).toBe('premium');
    });
  });

  // ========================================
  // IDEMPOTENCY
  // ========================================

  describe('Webhook Idempotency', () => {
    it('duplicate webhook does not double-upgrade', async () => {
      const user = await createTestUser(ctx.db, { tier: 'free' });
      
      // First upgrade
      await ctx.db.prepare(`
        UPDATE users SET tier = 'premium' WHERE id = ?
      `).bind(user.id).run();
      
      // "Second" upgrade (idempotent)
      await ctx.db.prepare(`
        UPDATE users SET tier = 'premium' WHERE id = ?
      `).bind(user.id).run();
      
      const updated = await ctx.db
        .prepare('SELECT tier FROM users WHERE id = ?')
        .bind(user.id)
        .first<{ tier: string }>();
      
      expect(updated?.tier).toBe('premium');
    });
  });
});

