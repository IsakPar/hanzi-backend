import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';

const baseUrl = 'http://localhost/v1/billing';

describe.sequential('RevenueCat Webhook Routes', () => {
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
  // WEBHOOK SIGNATURE VERIFICATION
  // ========================================

  it('rejects webhook requests with missing Authorization header when secret is configured', async () => {
    const payload = {
      event: {
        type: 'INITIAL_PURCHASE',
        app_user_id: clerkId,
        product_id: 'hanzi_premium_monthly',
        store: 'app_store',
      },
    };

    const res = await ctx.app.fetch(
      new Request(`${baseUrl}/webhooks/revenuecat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }),
      ctx.env,
      executionContext
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('rejects webhook requests with invalid Authorization token', async () => {
    const payload = {
      event: {
        type: 'INITIAL_PURCHASE',
        app_user_id: clerkId,
        product_id: 'hanzi_premium_monthly',
        store: 'app_store',
      },
    };

    const res = await ctx.app.fetch(
      new Request(`${baseUrl}/webhooks/revenuecat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer wrong-secret',
        },
        body: JSON.stringify(payload),
      }),
      ctx.env,
      executionContext
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('accepts webhook requests with valid Authorization bearer token', async () => {
    const payload = {
      event: {
        type: 'INITIAL_PURCHASE',
        app_user_id: clerkId,
        product_id: 'hanzi_premium_monthly',
        store: 'app_store',
      },
    };

    const res = await ctx.app.fetch(
      new Request(`${baseUrl}/webhooks/revenuecat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
        },
        body: JSON.stringify(payload),
      }),
      ctx.env,
      executionContext
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(body.request_id).toBeDefined();
  });

  it('accepts webhook requests with Authorization token without Bearer prefix', async () => {
    const payload = {
      event: {
        type: 'INITIAL_PURCHASE',
        app_user_id: clerkId,
        product_id: 'hanzi_premium_monthly',
        store: 'app_store',
      },
    };

    const res = await ctx.app.fetch(
      new Request(`${baseUrl}/webhooks/revenuecat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': ctx.env.REVENUECAT_WEBHOOK_SECRET,
        },
        body: JSON.stringify(payload),
      }),
      ctx.env,
      executionContext
    );

    expect(res.status).toBe(200);
  });

  // ========================================
  // WEBHOOK EVENT PROCESSING
  // ========================================

  it('processes INITIAL_PURCHASE event and upgrades user to premium', async () => {
    const payload = {
      event: {
        type: 'INITIAL_PURCHASE',
        app_user_id: clerkId,
        product_id: 'hanzi_premium_monthly',
        store: 'app_store',
        expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    };

    const res = await ctx.app.fetch(
      new Request(`${baseUrl}/webhooks/revenuecat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
        },
        body: JSON.stringify(payload),
      }),
      ctx.env,
      executionContext
    );

    expect(res.status).toBe(200);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check user was upgraded
    const user = await ctx.db
      .prepare('SELECT tier, subscription_status, subscription_platform FROM users WHERE clerk_id = ?')
      .bind(clerkId)
      .first<{ tier: string; subscription_status: string; subscription_platform: string }>();

    expect(user?.tier).toBe('premium');
    expect(user?.subscription_status).toBe('active');
    expect(user?.subscription_platform).toBe('ios'); // app_store maps to ios

    // Check analytics event was recorded
    const event = await ctx.db
      .prepare('SELECT * FROM system_events WHERE user_id = ? AND event_type = ?')
      .bind(clerkId, 'user.subscription.changed')
      .first();

    expect(event).toBeDefined();
  });

  it('processes RENEWAL event and keeps user premium', async () => {
    // First upgrade user
    await ctx.db.prepare(`
      UPDATE users 
      SET tier = 'premium', subscription_status = 'active'
      WHERE clerk_id = ?
    `)
      .bind(clerkId)
      .run();

    const payload = {
      event: {
        type: 'RENEWAL',
        app_user_id: clerkId,
        product_id: 'hanzi_premium_monthly',
        store: 'app_store',
        expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
      },
    };

    const res = await ctx.app.fetch(
      new Request(`${baseUrl}/webhooks/revenuecat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
        },
        body: JSON.stringify(payload),
      }),
      ctx.env,
      executionContext
    );

    expect(res.status).toBe(200);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 100));

    const user = await ctx.db
      .prepare('SELECT tier, subscription_status FROM users WHERE clerk_id = ?')
      .bind(clerkId)
      .first<{ tier: string; subscription_status: string }>();

    expect(user?.tier).toBe('premium');
    expect(user?.subscription_status).toBe('active');
  });

  it('processes CANCELLATION event but keeps tier until expiration', async () => {
    // Set up active premium subscription
    const futureExpiration = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days from now
    
    await ctx.db.prepare(`
      UPDATE users 
      SET tier = 'premium', 
          subscription_status = 'active',
          subscription_expires_at = ?
      WHERE clerk_id = ?
    `)
      .bind(futureExpiration, clerkId)
      .run();

    const payload = {
      event: {
        type: 'CANCELLATION',
        app_user_id: clerkId,
        product_id: 'hanzi_premium_monthly',
        store: 'app_store',
        expiration_at_ms: futureExpiration * 1000,
      },
    };

    const res = await ctx.app.fetch(
      new Request(`${baseUrl}/webhooks/revenuecat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
        },
        body: JSON.stringify(payload),
      }),
      ctx.env,
      executionContext
    );

    expect(res.status).toBe(200);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check user keeps premium until expiration (not downgraded yet)
    const user = await ctx.db
      .prepare('SELECT tier, subscription_status FROM users WHERE clerk_id = ?')
      .bind(clerkId)
      .first<{ tier: string; subscription_status: string }>();

    // User's subscription is marked as canceled but tier is kept until expiration
    expect(user?.subscription_status).toBe('canceled');
    expect(user?.tier).toBe('premium'); // Still premium until expiration date
  });

  it('processes EXPIRATION event and downgrades user to free when no other subscriptions', async () => {
    // Set up expired premium subscription
    await ctx.db.prepare(`
      UPDATE users 
      SET tier = 'premium', 
          subscription_status = 'active',
          subscription_expires_at = strftime('%s', 'now') - 1
      WHERE clerk_id = ?
    `)
      .bind(clerkId)
      .run();

    const payload = {
      event: {
        type: 'EXPIRATION',
        app_user_id: clerkId,
        product_id: 'hanzi_premium_monthly',
        store: 'app_store',
      },
    };

    const res = await ctx.app.fetch(
      new Request(`${baseUrl}/webhooks/revenuecat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
        },
        body: JSON.stringify(payload),
      }),
      ctx.env,
      executionContext
    );

    expect(res.status).toBe(200);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 100));

    const user = await ctx.db
      .prepare('SELECT tier, subscription_status FROM users WHERE clerk_id = ?')
      .bind(clerkId)
      .first<{ tier: string; subscription_status: string }>();

    expect(user?.tier).toBe('free');
    expect(user?.subscription_status).toBe('expired');

    // Check downgrade event was recorded
    const event = await ctx.db
      .prepare('SELECT * FROM system_events WHERE user_id = ? AND event_type = ?')
      .bind(clerkId, 'user.subscription.ended')
      .first();

    expect(event).toBeDefined();
  });

  it('processes BILLING_ISSUE event and marks subscription as past_due', async () => {
    await ctx.db.prepare(`
      UPDATE users 
      SET tier = 'premium', subscription_status = 'active'
      WHERE clerk_id = ?
    `)
      .bind(clerkId)
      .run();

    const payload = {
      event: {
        type: 'BILLING_ISSUE',
        app_user_id: clerkId,
        product_id: 'hanzi_premium_monthly',
        store: 'app_store',
      },
    };

    const res = await ctx.app.fetch(
      new Request(`${baseUrl}/webhooks/revenuecat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
        },
        body: JSON.stringify(payload),
      }),
      ctx.env,
      executionContext
    );

    expect(res.status).toBe(200);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 100));

    const user = await ctx.db
      .prepare('SELECT subscription_status FROM users WHERE clerk_id = ?')
      .bind(clerkId)
      .first<{ subscription_status: string }>();

    expect(user?.subscription_status).toBe('past_due');
  });

  it('upgrades user from premium to pro when purchasing pro subscription', async () => {
    // Start with premium
    await ctx.db.prepare(`
      UPDATE users 
      SET tier = 'premium', subscription_status = 'active'
      WHERE clerk_id = ?
    `)
      .bind(clerkId)
      .run();

    const payload = {
      event: {
        type: 'INITIAL_PURCHASE',
        app_user_id: clerkId,
        product_id: 'hanzi_pro_monthly',
        store: 'app_store',
        expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
      },
    };

    const res = await ctx.app.fetch(
      new Request(`${baseUrl}/webhooks/revenuecat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
        },
        body: JSON.stringify(payload),
      }),
      ctx.env,
      executionContext
    );

    expect(res.status).toBe(200);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 100));

    const user = await ctx.db
      .prepare('SELECT tier FROM users WHERE clerk_id = ?')
      .bind(clerkId)
      .first<{ tier: string }>();

    expect(user?.tier).toBe('pro');
  });

  it('ignores unknown event types without errors', async () => {
    const payload = {
      event: {
        type: 'UNKNOWN_EVENT_TYPE',
        app_user_id: clerkId,
        product_id: 'hanzi_premium_monthly',
      },
    };

    const res = await ctx.app.fetch(
      new Request(`${baseUrl}/webhooks/revenuecat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
        },
        body: JSON.stringify(payload),
      }),
      ctx.env,
      executionContext
    );

    expect(res.status).toBe(200);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // User should remain unchanged
    const user = await ctx.db
      .prepare('SELECT tier, subscription_status FROM users WHERE clerk_id = ?')
      .bind(clerkId)
      .first<{ tier: string; subscription_status: string }>();

    expect(user?.tier).toBe('free');
    expect(user?.subscription_status).toBe('none');
  });

  it('handles webhook for non-existent user gracefully', async () => {
    const payload = {
      event: {
        type: 'INITIAL_PURCHASE',
        app_user_id: 'user_does_not_exist',
        product_id: 'hanzi_premium_monthly',
        store: 'app_store',
      },
    };

    const res = await ctx.app.fetch(
      new Request(`${baseUrl}/webhooks/revenuecat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
        },
        body: JSON.stringify(payload),
      }),
      ctx.env,
      executionContext
    );

    // Should still return 200 (acknowledged) even if user doesn't exist
    expect(res.status).toBe(200);
  });

  it('handles malformed JSON payload', async () => {
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
    const body = await res.json();
    expect(body.error).toBe('Invalid JSON');
  });

  // ========================================
  // WEBHOOK GET ENDPOINT (for portal validation)
  // ========================================

  it('responds to GET request for RevenueCat portal validation', async () => {
    const res = await ctx.app.fetch(
      new Request(`${baseUrl}/webhooks/revenuecat`, {
        method: 'GET',
      }),
      ctx.env,
      executionContext
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.message).toContain('webhook endpoint');
  });
});

