import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import type { AppEnv } from '../types/app';
import { authMiddleware } from '../middleware/auth';
import { logWithContext } from '../utils/logger';
import { tierLimits } from '../schema';

const usersRouter = new Hono<AppEnv>();

// Validation schema for profile updates
const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
});

// Default tier limits (fallback when database has no records)
const DEFAULT_TIER_LIMITS = {
  free: {
    requests_per_day: 10,
    tokens_per_day: 5000,
    max_parallel_generations: 1,
    content_downloads_per_day: 5,
    offline_packages_allowed: 0,
    can_access_premium_content: false,
  },
  premium: {
    requests_per_day: 100,
    tokens_per_day: 50000,
    max_parallel_generations: 3,
    content_downloads_per_day: 50,
    offline_packages_allowed: 3,
    can_access_premium_content: true,
  },
  pro: {
    requests_per_day: 1000,
    tokens_per_day: 500000,
    max_parallel_generations: 10,
    content_downloads_per_day: 999999,
    offline_packages_allowed: 999999,
    can_access_premium_content: true,
  },
};

/**
 * Get current user profile
 * Returns user information including tier and subscription status
 */
usersRouter.get('/me', authMiddleware(), async (c) => {
  const user = c.get('user');
  const requestId = c.get('requestId');
  
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    // Fetch full user details from database
    const userDetails = await c.env.DB
      .prepare(`
        SELECT 
          id, clerk_id, email, name, role, tier,
          subscription_status, subscription_platform, subscription_expires_at,
          created_at, last_login_at
        FROM users
        WHERE id = ?
      `)
      .bind(user.id)
      .first();

    if (!userDetails) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get tier limits for this user from database or defaults
    const db = drizzle(c.env.DB);
    const userTier = (userDetails.tier || 'free') as 'free' | 'premium' | 'pro';
    
    const dbLimits = await db
      .select()
      .from(tierLimits)
      .where(eq(tierLimits.tier, userTier))
      .get();
    
    // Use database values or fall back to defaults
    const limits = dbLimits ? {
      requests_per_day: dbLimits.requestsPerDay,
      tokens_per_day: dbLimits.tokensPerDay,
      max_parallel_generations: dbLimits.maxParallelGenerations,
      content_downloads_per_day: dbLimits.contentDownloadsPerDay,
      offline_packages_allowed: dbLimits.offlinePackagesAllowed,
      can_access_premium_content: dbLimits.canAccessPremiumContent,
    } : DEFAULT_TIER_LIMITS[userTier];

    // Get today's usage
    const today = new Date().toISOString().split('T')[0];
    const usage = await c.env.DB
      .prepare('SELECT request_count, token_count FROM daily_usage WHERE user_id = ? AND date = ?')
      .bind(user.id, today)
      .first();

    return c.json({
      id: userDetails.id,
      clerk_id: userDetails.clerk_id,
      email: userDetails.email,
      name: userDetails.name,
      role: userDetails.role,
      tier: userDetails.tier || 'free',
      subscription: {
        status: userDetails.subscription_status || 'none',
        platform: userDetails.subscription_platform,
        expires_at: userDetails.subscription_expires_at && typeof userDetails.subscription_expires_at === 'number'
          ? new Date(userDetails.subscription_expires_at * 1000).toISOString()
          : null,
      },
      limits: {
        requests_per_day: limits.requests_per_day,
        tokens_per_day: limits.tokens_per_day,
        max_parallel_generations: limits.max_parallel_generations,
        content_downloads_per_day: limits.content_downloads_per_day,
        offline_packages_allowed: limits.offline_packages_allowed,
        can_access_premium_content: limits.can_access_premium_content,
      },
      usage: {
        requests_today: usage?.request_count || 0,
        tokens_today: usage?.token_count || 0,
      },
      timestamps: {
        created_at: userDetails.created_at && typeof userDetails.created_at === 'number'
          ? new Date(userDetails.created_at * 1000).toISOString()
          : null,
        last_login_at: userDetails.last_login_at && typeof userDetails.last_login_at === 'number'
          ? new Date(userDetails.last_login_at * 1000).toISOString()
          : null,
      },
    });
  } catch (err) {
    logWithContext('error', 'users.get_me_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch user profile' }, 500);
  }
});

/**
 * Update user profile (name only for now)
 */
usersRouter.patch('/me', authMiddleware(), zValidator('json', updateProfileSchema), async (c) => {
  const user = c.get('user');
  const requestId = c.get('requestId');
  
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const { name } = c.req.valid('json');

    await c.env.DB
      .prepare('UPDATE users SET name = ?, updated_at = strftime("%s", "now") WHERE id = ?')
      .bind(name, user.id)
      .run();

    logWithContext('info', 'users.profile_updated', {
      requestId,
      meta: { user_id: user.id },
    });

    return c.json({ success: true, name });
  } catch (err) {
    logWithContext('error', 'users.update_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to update profile' }, 500);
  }
});

/**
 * Get usage statistics for current user
 */
usersRouter.get('/me/usage', authMiddleware(), async (c) => {
  const user = c.get('user');
  const requestId = c.get('requestId');
  
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    // Get last 7 days of usage
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startDate = sevenDaysAgo.toISOString().split('T')[0];

    const usageHistory = await c.env.DB
      .prepare(`
        SELECT date, request_count, token_count
        FROM daily_usage
        WHERE user_id = ? AND date >= ?
        ORDER BY date DESC
      `)
      .bind(user.id, startDate)
      .all();

    return c.json({
      user_id: user.id,
      tier: user.tier || 'free',
      history: usageHistory.results || [],
    });
  } catch (err) {
    logWithContext('error', 'users.usage_fetch_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch usage' }, 500);
  }
});

export default usersRouter;

