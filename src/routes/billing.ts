import { Hono } from 'hono';
import type { AppEnv } from '../types/app';
import type { D1Database } from '@cloudflare/workers-types';
import { logWithContext } from '../utils/logger';
import { webhookRateLimit } from '../middleware/rate-limit';

const billingRouter = new Hono<AppEnv>();

// Apply rate limiting to webhook endpoints
billingRouter.use('/*', webhookRateLimit);

// --- TYPE DEFINITIONS ---

interface RevenueCatWebhookEvent {
  event?: {
    type?: string;
    app_user_id?: string;
    product_id?: string;
    expiration_at_ms?: number;
    store?: string;
    presented_offering_id?: string;
  };
  type?: string;
  app_user_id?: string;
  product_id?: string;
  expiration_at_ms?: number;
  store?: string;
  presented_offering_id?: string;
}

type UserTier = 'free' | 'premium' | 'pro';
type SubscriptionStatus = 'none' | 'active' | 'past_due' | 'canceled' | 'expired';
type SubscriptionPlatform = 'ios' | 'android' | 'web';

// Product ID to tier mapping - configured here for easy maintenance
// Premium tier = $9.99/month (displayed as "Master" in UI)
const PRODUCT_TIER_MAP: Record<string, UserTier> = {
  'hanzi_master_monthly': 'premium',  // RevenueCat product -> DB tier
  'hanzi_master_yearly': 'premium',
  'hanzi_premium_monthly': 'premium',
  'hanzi_premium_yearly': 'premium',
  'hanzi_pro_monthly': 'pro',
  'hanzi_pro_yearly': 'pro',
};

// RevenueCat store to platform mapping
const STORE_PLATFORM_MAP: Record<string, SubscriptionPlatform> = {
  'app_store': 'ios',
  'mac_app_store': 'ios',
  'play_store': 'android',
  'stripe': 'web',
  'promotional': 'web',
};

// Simple test endpoint for RevenueCat validation
billingRouter.get('/webhooks/revenuecat', async (c) => {
  return c.json({ 
    status: 'ok',
    message: 'RevenueCat webhook endpoint is ready',
    timestamp: Date.now(),
  });
});

/**
 * Debug endpoint - echoes back exactly what RevenueCat sends
 * Use this to verify what RevenueCat is actually sending
 * 
 * Configure this URL in RevenueCat dashboard for debugging:
 * https://your-api.com/v1/billing/webhooks/debug
 */
billingRouter.post('/webhooks/debug', async (c) => {
  const requestId = c.get('requestId');
  
  // Capture all headers
  const headers: Record<string, string> = {};
  c.req.raw.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // Capture body
  let body: unknown;
  let rawBody: string = '';
  try {
    rawBody = await c.req.text();
    body = JSON.parse(rawBody);
  } catch {
    body = { parseError: 'Could not parse as JSON', raw: rawBody.substring(0, 500) };
  }

  // Log everything for debugging
  logWithContext('info', 'webhook.debug.received', {
    requestId,
    meta: {
      method: c.req.method,
      url: c.req.url,
      headers,
      body,
      contentType: headers['content-type'],
      authorization: headers['authorization'] ? 'present' : 'missing',
      userAgent: headers['user-agent'],
    },
  });

  // Return what we received
  return c.json({
    received: true,
    request_id: requestId,
    echo: {
      method: c.req.method,
      headers,
      body,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * RevenueCat Webhook Handler
 * 
 * Receives subscription events from RevenueCat and updates user tier accordingly.
 * 
 * Events handled:
 * - INITIAL_PURCHASE: User subscribes for the first time
 * - RENEWAL: Subscription renews
 * - CANCELLATION: User cancels subscription
 * - EXPIRATION: Subscription expires
 * - BILLING_ISSUE: Payment failed
 * 
 * @see https://www.revenuecat.com/docs/webhooks
 */
billingRouter.post('/webhooks/revenuecat', async (c) => {
  const requestId = c.get('requestId');
  const config = c.get('config');

  // Log incoming request for debugging
  const allHeaders: Record<string, string> = {};
  c.req.raw.headers.forEach((value, key) => {
    // Mask sensitive headers
    allHeaders[key] = key.toLowerCase() === 'authorization' ? '[PRESENT]' : value;
  });
  
  logWithContext('info', 'revenuecat.webhook.incoming', {
    requestId,
    meta: {
      method: c.req.method,
      url: c.req.url,
      headers: allHeaders,
      contentType: c.req.header('Content-Type'),
      userAgent: c.req.header('User-Agent'),
    },
  });

  // RevenueCat sends Authorization header as: "Bearer <YOUR_WEBHOOK_SECRET>"
  // https://www.revenuecat.com/docs/webhooks#authentication
  const authHeader = c.req.header('Authorization');
  const expectedSecret = config.secrets.revenuecatWebhookSecret;

  // SECURITY: Webhook secret is REQUIRED in production
  // Reject all webhooks if secret is not configured
  if (!expectedSecret) {
    logWithContext('error', 'revenuecat.webhook.secret_not_configured', {
      requestId,
      meta: { message: 'REVENUECAT_WEBHOOK_SECRET must be set' },
    });
    return c.json({ error: 'Webhook authentication not configured' }, 503);
  }

  // Validate the secret
  const token = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : authHeader;

  if (!token || token !== expectedSecret) {
    logWithContext('warn', 'revenuecat.webhook.unauthorized', {
      requestId,
      meta: { 
        hasAuth: !!authHeader,
        format: authHeader?.split(' ')[0]
      },
    });
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Parse webhook payload
  let event: RevenueCatWebhookEvent;
  try {
    event = await c.req.json();
  } catch (err) {
    logWithContext('error', 'revenuecat.webhook.invalid_json', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  // Respond immediately to RevenueCat (they have tight timeouts)
  const responsePromise = c.json({ 
    received: true,
    request_id: requestId,
  });

  // Process webhook in background (don't await)
  c.executionCtx.waitUntil(
    processWebhookAsync(c.env.DB, event, requestId).catch(err => {
      logWithContext('error', 'revenuecat.webhook.async_error', {
        requestId,
        meta: { error: err.message },
      });
    })
  );

  return responsePromise;
});

// Async webhook processor with proper types
async function processWebhookAsync(
  db: D1Database, 
  event: RevenueCatWebhookEvent, 
  requestId: string
): Promise<void> {
  // Extract fields from RevenueCat webhook format (supports both nested and flat)
  const event_type = event.event?.type || event.type;
  const app_user_id = event.event?.app_user_id || event.app_user_id;
  const product_id = event.event?.product_id || event.product_id;
  const expiration_at_ms = event.event?.expiration_at_ms || event.expiration_at_ms;
  const store = event.event?.store || event.store;
  const presented_offering_id = event.event?.presented_offering_id || event.presented_offering_id;
  
  logWithContext('info', 'revenuecat.webhook.processing', {
    requestId,
    meta: {
      event_type,
      app_user_id,
      product_id,
      store,
    },
  });

  // Map product_id to tier using configurable mapping
  const newTier: UserTier = product_id ? (PRODUCT_TIER_MAP[product_id] || 'free') : 'free';

  // Map event type to subscription status
  let subscriptionStatus: SubscriptionStatus = 'none';
  
  switch (event_type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
      subscriptionStatus = 'active';
      break;
    case 'CANCELLATION':
      subscriptionStatus = 'canceled';
      break;
    case 'EXPIRATION':
      subscriptionStatus = 'expired';
      break;
    case 'BILLING_ISSUE':
      subscriptionStatus = 'past_due';
      break;
    default:
      logWithContext('warn', 'revenuecat.webhook.unknown_event', {
        requestId,
        meta: { event_type },
      });
      // Just return, don't process unknown events
      return;
  }

  // If subscription ends, check for other active subscriptions before downgrading
  if (subscriptionStatus === 'expired' || subscriptionStatus === 'canceled') {
    // Check if this specific user/subscription combination has other active subscriptions
    // Note: We're checking against the current clerk_id if they have other active products
    const activeSubsCheck = await db.prepare(`
      SELECT subscription_status, subscription_expires_at
      FROM users
      WHERE clerk_id = ?
    `)
      .bind(app_user_id)
      .first() as { subscription_status: string; subscription_expires_at: number | null } | null;

    // If user has an active status and expiration is in the future, don't downgrade yet
    if (activeSubsCheck?.subscription_status === 'active' && 
        activeSubsCheck.subscription_expires_at && 
        activeSubsCheck.subscription_expires_at > Math.floor(Date.now() / 1000)) {
      // Update status to canceled but keep tier until expiration
      await db.prepare(`
        UPDATE users 
        SET 
          subscription_status = ?,
          updated_at = strftime('%s', 'now')
        WHERE clerk_id = ?
      `)
        .bind(subscriptionStatus, app_user_id)
        .run();

      logWithContext('info', 'revenuecat.webhook.marked_canceled', {
        requestId,
        meta: { 
          app_user_id,
          reason: 'Subscription canceled but still valid until expiration',
        },
      });
      return;
    }

    // Downgrade to free since no other subscriptions or already expired
    await db.prepare(`
      UPDATE users 
      SET 
        tier = 'free',
        subscription_status = ?,
        subscription_platform = NULL,
        subscription_expires_at = NULL,
        updated_at = strftime('%s', 'now')
      WHERE clerk_id = ?
    `)
      .bind(subscriptionStatus, app_user_id)
      .run();

    logWithContext('info', 'revenuecat.webhook.downgraded_to_free', {
      requestId,
      meta: { app_user_id, reason: event_type },
    });

    // Record analytics
    await db.prepare(`
      INSERT INTO system_events (id, event_type, user_id, metadata, created_at)
      VALUES (?, ?, ?, ?, strftime('%s', 'now'))
    `)
      .bind(
        crypto.randomUUID(),
        'user.subscription.ended',
        app_user_id,
        JSON.stringify({
          previous_tier: newTier,
          event_type,
          product_id,
        })
      )
      .run();

    return;
  }

  try {
    // Update user tier and subscription info
    const expiresAt = expiration_at_ms ? Math.floor(expiration_at_ms / 1000) : null;
    
    // Map RevenueCat store to our platform enum using configurable mapping
    const platform: SubscriptionPlatform | null = store 
      ? (STORE_PLATFORM_MAP[store.toLowerCase()] || 'web') 
      : null;
    
    const result = await db.prepare(`
      UPDATE users 
      SET 
        tier = ?,
        subscription_status = ?,
        subscription_platform = ?,
        subscription_expires_at = ?,
        updated_at = strftime('%s', 'now')
      WHERE clerk_id = ?
    `)
      .bind(
        newTier,
        subscriptionStatus,
        platform,
        expiresAt,
        app_user_id
      )
      .run();

    if (!result.success || (result.meta?.changes ?? 0) === 0) {
      logWithContext('warn', 'revenuecat.webhook.user_not_found', {
        requestId,
        meta: { app_user_id, clerk_id: app_user_id },
      });
      return;
    }

    // Record analytics event
    await db.prepare(`
      INSERT INTO system_events (id, event_type, user_id, metadata, created_at)
      VALUES (?, ?, ?, ?, strftime('%s', 'now'))
    `)
      .bind(
        crypto.randomUUID(),
        'user.subscription.changed',
        app_user_id,
        JSON.stringify({
          tier: newTier,
          status: subscriptionStatus,
          platform: store,
          product_id,
          event_type,
          offering_id: presented_offering_id,
        })
      )
      .run();

    logWithContext('info', 'revenuecat.webhook.processed', {
      requestId,
      meta: {
        app_user_id,
        new_tier: newTier,
        new_status: subscriptionStatus,
      },
    });

  } catch (err) {
    logWithContext('error', 'revenuecat.webhook.db_error', {
      requestId,
      meta: { error: (err as Error).message },
    });
    throw err;
  }
}

// Health check endpoint for testing
billingRouter.get('/health', (c) => {
  return c.json({ 
    status: 'ok',
    service: 'billing',
    webhook_url: '/v1/billing/webhooks/revenuecat',
  });
});

export default billingRouter;

