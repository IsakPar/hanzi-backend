import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { lessons, lessonBlocks, waitlist, tierLimits } from '../schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth';
import type { AppEnv } from '../types/app';
import { logWithContext } from '../utils/logger';
import { createRevenueCatClient } from '../services/revenuecat-client';

// Default tier limits (used when database has no records)
const DEFAULT_TIER_LIMITS = {
  free: {
    tier: 'free' as const,
    requestsPerDay: 10,
    tokensPerDay: 5000,
    maxParallelGenerations: 1,
    contentDownloadsPerDay: 5,
    offlinePackagesAllowed: 0,
    canAccessPremiumContent: false,
    updatedAt: null as Date | null,
  },
  premium: {
    tier: 'premium' as const,
    requestsPerDay: 100,
    tokensPerDay: 50000,
    maxParallelGenerations: 3,
    contentDownloadsPerDay: 50,
    offlinePackagesAllowed: 3,
    canAccessPremiumContent: true,
    updatedAt: null as Date | null,
  },
  pro: {
    tier: 'pro' as const,
    requestsPerDay: 1000,
    tokensPerDay: 500000,
    maxParallelGenerations: 10,
    contentDownloadsPerDay: 999999,
    offlinePackagesAllowed: 999999,
    canAccessPremiumContent: true,
    updatedAt: null as Date | null,
  },
};

const app = new Hono<AppEnv>();

// Protect all routes in this file
app.use('/*', authMiddleware({ allowRoles: ['admin'] }));

// Get Waitlist
app.get('/waitlist', async (c) => {
  const db = drizzle(c.env.DB);
  try {
    const results = await db
      .select()
      .from(waitlist)
      .orderBy(desc(waitlist.createdAt));
    return c.json({ waitlist: results });
  } catch (error) {
    logWithContext('error', 'admin.waitlist_fetch_failed', {
      requestId: c.get('requestId'),
      meta: { error: (error as Error).message },
    });
    return c.json({ error: 'Failed to fetch waitlist' }, 500);
  }
});

// Zod Schema for Lesson Creation
const createLessonSchema = z.object({
  title: z.string().min(3),
  subtitle: z.string().optional(),
  hskLevel: z.number().min(1).max(9),
  lessonNumber: z.number().int().min(1).optional(), // Auto-increment if not provided
  lessonType: z.enum(['lesson', 'speaking', 'mini_test', 'hsk_test']).default('lesson'),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  description: z.string().optional(),
  estimatedMinutes: z.number().int().min(1).max(120).optional(),
  grammarPoints: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  targetVocabulary: z.array(z.string()).optional(), // Array of vocab IDs
  blocks: z.array(z.object({
    type: z.string(), // e.g. 'hero_hanzi', 'explain'
    content: z.record(z.any()) // The specific block data
  })).min(1)
});

app.post('/lessons', zValidator('json', createLessonSchema), async (c) => {
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const lessonId = crypto.randomUUID();

  try {
    // Auto-increment lesson number if not provided
    let lessonNumber = data.lessonNumber;
    if (!lessonNumber) {
      // Get the highest lesson number for this HSK level and type
      const maxNumberResult = await db
        .select({ maxNumber: lessons.lessonNumber })
        .from(lessons)
        .where(
          and(
            eq(lessons.hskLevel, data.hskLevel),
            eq(lessons.lessonType, data.lessonType || 'lesson')
          )
        )
        .orderBy(desc(lessons.lessonNumber))
        .limit(1);
      
      lessonNumber = maxNumberResult[0]?.maxNumber ? maxNumberResult[0].maxNumber + 1 : 1;
    }

    // Transaction-safe: Use batch operations
    // D1 batch operations are atomic - all succeed or all fail
    const lessonInsert = db.insert(lessons).values({
      id: lessonId,
      title: data.title,
      subtitle: data.subtitle || null,
      hskLevel: data.hskLevel,
      lessonNumber,
      lessonType: data.lessonType || 'lesson',
      difficulty: data.difficulty || 'medium',
      description: data.description || null,
      estimatedMinutes: data.estimatedMinutes || 15,
      grammarPoints: data.grammarPoints || null,
      tags: data.tags || null,
      targetVocabulary: data.targetVocabulary || null,
      isPublished: false, // Draft by default
    });

    const blockInserts = data.blocks.length > 0
      ? db.insert(lessonBlocks).values(
          data.blocks.map((block, index) => ({
            id: crypto.randomUUID(),
            lessonId: lessonId,
            type: block.type,
            orderIndex: index,
            content: block.content,
          }))
        )
      : null;

    // Execute in batch (atomic operation)
    if (blockInserts) {
      await db.batch([lessonInsert, blockInserts]);
    } else {
      await lessonInsert;
    }

    return c.json({ success: true, id: lessonId, lessonNumber });
  } catch (error) {
    logWithContext('error', 'admin.lesson_creation_failed', {
      requestId: c.get('requestId'),
      meta: {
        message: (error as Error).message,
      },
    });
    return c.json({ error: 'Failed to create lesson' }, 500);
  }
});

// ========================================
// REVENUECAT ADMIN ENDPOINTS
// ========================================

/**
 * Get subscription info for a user by their Clerk ID
 * Queries RevenueCat REST API to get current subscription status
 */
app.get('/subscriptions/:clerkId', async (c) => {
  const { clerkId } = c.req.param();
  const requestId = c.get('requestId');
  
  const rcClient = createRevenueCatClient(c.env);
  if (!rcClient) {
    return c.json({ error: 'RevenueCat not configured' }, 503);
  }

  try {
    const subscriber = await rcClient.getSubscriber(clerkId);
    
    if (!subscriber) {
      return c.json({ 
        clerk_id: clerkId,
        tier: 'free',
        has_subscription: false,
      });
    }

    const tier = await rcClient.getUserTier(clerkId);
    const activeSubscriptions = await rcClient.getActiveSubscriptions(clerkId);

    return c.json({
      clerk_id: clerkId,
      tier,
      has_subscription: activeSubscriptions.length > 0,
      active_products: activeSubscriptions,
      entitlements: subscriber.subscriber.entitlements,
      first_seen: subscriber.subscriber.first_seen,
      last_seen: subscriber.subscriber.last_seen,
    });
  } catch (err) {
    logWithContext('error', 'admin.revenuecat.query_failed', {
      requestId,
      meta: { clerkId, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to query subscription' }, 500);
  }
});

/**
 * Grant promotional access to a user
 * Useful for giving free trials, comps, or customer support
 */
const grantPromoSchema = z.object({
  clerk_id: z.string(),
  entitlement: z.enum(['premium', 'pro']),
  duration_days: z.number().int().min(1).max(365),
  reason: z.string().optional(),
});

app.post('/subscriptions/grant-promo', zValidator('json', grantPromoSchema), async (c) => {
  const data = c.req.valid('json');
  const requestId = c.get('requestId');
  const adminUser = c.get('user');
  
  if (!adminUser) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const rcClient = createRevenueCatClient(c.env);
  if (!rcClient) {
    return c.json({ error: 'RevenueCat not configured' }, 503);
  }

  try {
    const success = await rcClient.grantPromotionalEntitlement(
      data.clerk_id,
      data.entitlement,
      data.duration_days
    );

    if (!success) {
      return c.json({ error: 'Failed to grant promotional access' }, 500);
    }

    // Log the action for audit trail
    await c.env.DB.prepare(`
      INSERT INTO system_events (id, event_type, user_id, metadata, created_at)
      VALUES (?, ?, ?, ?, strftime('%s', 'now'))
    `)
      .bind(
        crypto.randomUUID(),
        'admin.promo_granted',
        data.clerk_id,
        JSON.stringify({
          granted_by: adminUser.id,
          entitlement: data.entitlement,
          duration_days: data.duration_days,
          reason: data.reason,
        })
      )
      .run();

    logWithContext('info', 'admin.promo_granted', {
      requestId,
      meta: {
        clerk_id: data.clerk_id,
        entitlement: data.entitlement,
        duration_days: data.duration_days,
        granted_by: adminUser.id,
      },
    });

    return c.json({ 
      success: true,
      clerk_id: data.clerk_id,
      entitlement: data.entitlement,
      expires_in_days: data.duration_days,
    });
  } catch (err) {
    logWithContext('error', 'admin.promo_grant_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to grant promotional access' }, 500);
  }
});

/**
 * Revoke promotional access from a user
 */
const revokePromoSchema = z.object({
  clerk_id: z.string(),
  entitlement: z.enum(['premium', 'pro']),
  reason: z.string().optional(),
});

app.post('/subscriptions/revoke-promo', zValidator('json', revokePromoSchema), async (c) => {
  const data = c.req.valid('json');
  const requestId = c.get('requestId');
  const adminUser = c.get('user');
  
  if (!adminUser) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const rcClient = createRevenueCatClient(c.env);
  if (!rcClient) {
    return c.json({ error: 'RevenueCat not configured' }, 503);
  }

  try {
    const success = await rcClient.revokePromotionalEntitlement(
      data.clerk_id,
      data.entitlement
    );

    if (!success) {
      return c.json({ error: 'Failed to revoke promotional access' }, 500);
    }

    // Log the action
    await c.env.DB.prepare(`
      INSERT INTO system_events (id, event_type, user_id, metadata, created_at)
      VALUES (?, ?, ?, ?, strftime('%s', 'now'))
    `)
      .bind(
        crypto.randomUUID(),
        'admin.promo_revoked',
        data.clerk_id,
        JSON.stringify({
          revoked_by: adminUser.id,
          entitlement: data.entitlement,
          reason: data.reason,
        })
      )
      .run();

    logWithContext('info', 'admin.promo_revoked', {
      requestId,
      meta: {
        clerk_id: data.clerk_id,
        entitlement: data.entitlement,
        revoked_by: adminUser.id,
      },
    });

    return c.json({ 
      success: true,
      clerk_id: data.clerk_id,
      entitlement: data.entitlement,
    });
  } catch (err) {
    logWithContext('error', 'admin.promo_revoke_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to revoke promotional access' }, 500);
  }
});

/**
 * Manually sync a user's subscription status from RevenueCat to our DB
 * Useful if webhook was missed or for debugging
 */
app.post('/subscriptions/:clerkId/sync', async (c) => {
  const { clerkId } = c.req.param();
  const requestId = c.get('requestId');

  const rcClient = createRevenueCatClient(c.env);
  if (!rcClient) {
    return c.json({ error: 'RevenueCat not configured' }, 503);
  }

  try {
    const tier = await rcClient.getUserTier(clerkId);
    const subscriber = await rcClient.getSubscriber(clerkId);

    // Update local database
    const result = await c.env.DB.prepare(`
      UPDATE users 
      SET tier = ?, updated_at = strftime('%s', 'now')
      WHERE clerk_id = ?
    `)
      .bind(tier, clerkId)
      .run();

    if (!result.success || (result.meta?.changes ?? 0) === 0) {
      return c.json({ error: 'User not found in local database' }, 404);
    }

    logWithContext('info', 'admin.subscription_synced', {
      requestId,
      meta: { clerk_id: clerkId, tier },
    });

    return c.json({
      success: true,
      clerk_id: clerkId,
      tier,
      synced_at: new Date().toISOString(),
    });
  } catch (err) {
    logWithContext('error', 'admin.subscription_sync_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to sync subscription' }, 500);
  }
});

// ========================================
// TIER LIMITS MANAGEMENT
// ========================================

/**
 * Get all tier limits
 * Returns current limits from database, or defaults if not set
 */
app.get('/tier-limits', async (c) => {
  const db = drizzle(c.env.DB);
  const requestId = c.get('requestId');

  try {
    const results = await db.select().from(tierLimits);
    
    // Build response with database values or defaults
    const tiers = ['free', 'premium', 'pro'] as const;
    const limitsMap: Record<string, typeof results[0] | typeof DEFAULT_TIER_LIMITS.free> = {};
    
    for (const tier of tiers) {
      const dbRecord = results.find(r => r.tier === tier);
      limitsMap[tier] = dbRecord || DEFAULT_TIER_LIMITS[tier];
    }

    return c.json({ 
      limits: limitsMap,
      source: results.length > 0 ? 'database' : 'defaults',
    });
  } catch (err) {
    logWithContext('error', 'admin.tier_limits.fetch_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch tier limits' }, 500);
  }
});

/**
 * Update tier limits for a specific tier
 */
const updateTierLimitsSchema = z.object({
  requestsPerDay: z.number().int().min(0).max(1000000),
  tokensPerDay: z.number().int().min(0).max(10000000),
  maxParallelGenerations: z.number().int().min(1).max(100),
  contentDownloadsPerDay: z.number().int().min(0).max(1000000),
  offlinePackagesAllowed: z.number().int().min(0).max(1000000),
  canAccessPremiumContent: z.boolean(),
});

app.put('/tier-limits/:tier', zValidator('json', updateTierLimitsSchema), async (c) => {
  const tier = c.req.param('tier');
  const data = c.req.valid('json');
  const db = drizzle(c.env.DB);
  const requestId = c.get('requestId');
  const adminUser = c.get('user');

  // Validate tier
  if (!['free', 'premium', 'pro'].includes(tier)) {
    return c.json({ error: 'Invalid tier. Must be free, premium, or pro.' }, 400);
  }

  try {
    // Upsert: Insert or update on conflict
    await db
      .insert(tierLimits)
      .values({
        tier: tier as 'free' | 'premium' | 'pro',
        requestsPerDay: data.requestsPerDay,
        tokensPerDay: data.tokensPerDay,
        maxParallelGenerations: data.maxParallelGenerations,
        contentDownloadsPerDay: data.contentDownloadsPerDay,
        offlinePackagesAllowed: data.offlinePackagesAllowed,
        canAccessPremiumContent: data.canAccessPremiumContent,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: tierLimits.tier,
        set: {
          requestsPerDay: data.requestsPerDay,
          tokensPerDay: data.tokensPerDay,
          maxParallelGenerations: data.maxParallelGenerations,
          contentDownloadsPerDay: data.contentDownloadsPerDay,
          offlinePackagesAllowed: data.offlinePackagesAllowed,
          canAccessPremiumContent: data.canAccessPremiumContent,
          updatedAt: new Date(),
        },
      });

    // Log the change for audit
    await c.env.DB.prepare(`
      INSERT INTO system_events (id, event_type, user_id, metadata, created_at)
      VALUES (?, ?, ?, ?, strftime('%s', 'now'))
    `)
      .bind(
        crypto.randomUUID(),
        'admin.tier_limits_updated',
        adminUser?.id || 'unknown',
        JSON.stringify({
          tier,
          updated_by: adminUser?.id,
          new_values: data,
        })
      )
      .run();

    logWithContext('info', 'admin.tier_limits.updated', {
      requestId,
      meta: { tier, updated_by: adminUser?.id },
    });

    return c.json({ 
      success: true, 
      tier,
      limits: data,
    });
  } catch (err) {
    logWithContext('error', 'admin.tier_limits.update_failed', {
      requestId,
      meta: { tier, error: (err as Error).message },
    });
    return c.json({ error: 'Failed to update tier limits' }, 500);
  }
});

/**
 * Reset tier limits to defaults
 */
app.post('/tier-limits/reset', async (c) => {
  const db = drizzle(c.env.DB);
  const requestId = c.get('requestId');
  const adminUser = c.get('user');

  try {
    // Delete all existing tier limits (will fall back to defaults)
    await db.delete(tierLimits);

    // Log the reset
    await c.env.DB.prepare(`
      INSERT INTO system_events (id, event_type, user_id, metadata, created_at)
      VALUES (?, ?, ?, ?, strftime('%s', 'now'))
    `)
      .bind(
        crypto.randomUUID(),
        'admin.tier_limits_reset',
        adminUser?.id || 'unknown',
        JSON.stringify({ reset_by: adminUser?.id })
      )
      .run();

    logWithContext('info', 'admin.tier_limits.reset', {
      requestId,
      meta: { reset_by: adminUser?.id },
    });

    return c.json({ 
      success: true, 
      message: 'Tier limits reset to defaults',
      limits: DEFAULT_TIER_LIMITS,
    });
  } catch (err) {
    logWithContext('error', 'admin.tier_limits.reset_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to reset tier limits' }, 500);
  }
});

export default app;
