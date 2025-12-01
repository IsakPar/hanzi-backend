import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { jwtAuthMiddleware } from '../middleware/jwt-auth';
import { AnalyticsService } from '../services/analytics';
import { UserAnalyticsService } from '../services/user-analytics';
import type { AppEnv } from '../types/app';
import { logWithContext } from '../utils/logger';
import { apiRateLimit } from '../middleware/rate-limit';

const dateRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

const aiUsageSchema = dateRangeSchema.extend({
  model: z.string().optional(),
  prompt_slug: z.string().optional(),
  success: z.coerce.boolean().optional(),
});

const contentUsageSchema = dateRangeSchema.extend({
  slug: z.string().optional(),
  user_id: z.string().optional(),
});

const daysSchema = z.object({
  days: z.coerce.number().min(1).max(365).default(30),
});

const app = new Hono<AppEnv>();

// Apply rate limiting
app.use('/*', apiRateLimit);

app.use('/*', jwtAuthMiddleware({ allowRoles: ['admin'] }));

/**
 * Get user statistics (legacy endpoint - kept for backwards compatibility)
 * Returns total user count, breakdown by tier, and recent signups
 */
app.get('/users', async (c) => {
  const requestId = c.get('requestId');
  
  try {
    // Get total user count and tier breakdown
    const tierStats = await c.env.DB.prepare(`
      SELECT 
        tier,
        COUNT(*) as count
      FROM users
      GROUP BY tier
    `).all();

    // Get total count
    const totalResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM users
    `).first();

    // Get recent signups (last 30 days)
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    const recentSignups = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE created_at >= ?
    `).bind(thirtyDaysAgo).first();

    // Get signups by day for last 7 days
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
    const dailySignups = await c.env.DB.prepare(`
      SELECT 
        date(created_at, 'unixepoch') as date,
        COUNT(*) as count
      FROM users
      WHERE created_at >= ?
      GROUP BY date(created_at, 'unixepoch')
      ORDER BY date DESC
    `).bind(sevenDaysAgo).all();

    // Build tier breakdown
    const tierBreakdown: Record<string, number> = {
      free: 0,
      premium: 0,
      pro: 0,
    };
    
    for (const row of (tierStats.results || [])) {
      const tier = (row.tier as string) || 'free';
      tierBreakdown[tier] = row.count as number;
    }

    return c.json({
      total: (totalResult?.total as number) || 0,
      tierBreakdown,
      recentSignups: {
        last30Days: (recentSignups?.count as number) || 0,
      },
      dailySignups: dailySignups.results || [],
    });
  } catch (err) {
    logWithContext('error', 'analytics.users_fetch_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch user statistics' }, 500);
  }
});

/**
 * Get comprehensive user analytics overview
 * Returns DAU/WAU/MAU, signups, tier breakdown, and session stats
 */
app.get('/users/overview', async (c) => {
  const requestId = c.get('requestId');
  
  try {
    const userAnalytics = new UserAnalyticsService(c.env.DB);
    const overview = await userAnalytics.getOverview();
    return c.json(overview);
  } catch (err) {
    logWithContext('error', 'analytics.users_overview_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch user overview' }, 500);
  }
});

/**
 * Get user growth data for charts
 * Returns daily totals, signups, and active users
 */
app.get('/users/growth', zValidator('query', daysSchema), async (c) => {
  const requestId = c.get('requestId');
  const { days } = c.req.valid('query');
  
  try {
    const userAnalytics = new UserAnalyticsService(c.env.DB);
    const growthData = await userAnalytics.getGrowthData(days);
    return c.json({ data: growthData });
  } catch (err) {
    logWithContext('error', 'analytics.users_growth_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch growth data' }, 500);
  }
});

/**
 * Get retention cohort data
 * Returns weekly cohorts with retention rates
 */
app.get('/users/retention', zValidator('query', z.object({
  weeks: z.coerce.number().min(1).max(52).default(8),
})), async (c) => {
  const requestId = c.get('requestId');
  const { weeks } = c.req.valid('query');
  
  try {
    const userAnalytics = new UserAnalyticsService(c.env.DB);
    const cohorts = await userAnalytics.getRetentionCohorts(weeks);
    return c.json({ cohorts });
  } catch (err) {
    logWithContext('error', 'analytics.users_retention_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch retention data' }, 500);
  }
});

/**
 * Get tier breakdown history over time
 */
app.get('/users/tiers', zValidator('query', daysSchema), async (c) => {
  const requestId = c.get('requestId');
  const { days } = c.req.valid('query');
  
  try {
    const userAnalytics = new UserAnalyticsService(c.env.DB);
    const tierHistory = await userAnalytics.getTierHistory(days);
    return c.json({ data: tierHistory });
  } catch (err) {
    logWithContext('error', 'analytics.users_tiers_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch tier history' }, 500);
  }
});

app.get('/ai', zValidator('query', aiUsageSchema), async (c) => {
  const query = c.req.valid('query');
  const analytics = new AnalyticsService(c.env.DB);
  const stats = await analytics.getAiUsageStats(query);
  return c.json(stats);
});

// ═══════════════════════════════════════════════════════════
// AI ANALYTICS ENDPOINTS (Phase 4)
// ═══════════════════════════════════════════════════════════

import { AIAnalyticsService } from '../services/ai-analytics';

/**
 * Get AI usage overview
 */
app.get('/ai/overview', zValidator('query', dateRangeSchema), async (c) => {
  const requestId = c.get('requestId');
  const { from, to } = c.req.valid('query');
  
  try {
    const aiAnalytics = new AIAnalyticsService(c.env.DB);
    const overview = await aiAnalytics.getOverview(from, to);
    return c.json(overview);
  } catch (err) {
    logWithContext('error', 'analytics.ai_overview_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch AI overview' }, 500);
  }
});

/**
 * Get daily AI usage for charts
 */
app.get('/ai/daily', zValidator('query', daysSchema), async (c) => {
  const requestId = c.get('requestId');
  const { days } = c.req.valid('query');
  
  try {
    const aiAnalytics = new AIAnalyticsService(c.env.DB);
    const data = await aiAnalytics.getDailyUsage(days);
    return c.json({ data });
  } catch (err) {
    logWithContext('error', 'analytics.ai_daily_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch daily AI usage' }, 500);
  }
});

/**
 * Get AI usage by model
 */
app.get('/ai/models', zValidator('query', dateRangeSchema), async (c) => {
  const requestId = c.get('requestId');
  const { from, to } = c.req.valid('query');
  
  try {
    const aiAnalytics = new AIAnalyticsService(c.env.DB);
    const models = await aiAnalytics.getModelBreakdown(from, to);
    return c.json({ models });
  } catch (err) {
    logWithContext('error', 'analytics.ai_models_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch model breakdown' }, 500);
  }
});

/**
 * Get prompt performance
 */
app.get('/ai/prompts', zValidator('query', dateRangeSchema), async (c) => {
  const requestId = c.get('requestId');
  const { from, to } = c.req.valid('query');
  
  try {
    const aiAnalytics = new AIAnalyticsService(c.env.DB);
    const prompts = await aiAnalytics.getPromptPerformance(from, to);
    return c.json({ prompts });
  } catch (err) {
    logWithContext('error', 'analytics.ai_prompts_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch prompt performance' }, 500);
  }
});

/**
 * Get latency distribution
 */
app.get('/ai/latency', zValidator('query', dateRangeSchema), async (c) => {
  const requestId = c.get('requestId');
  const { from, to } = c.req.valid('query');
  
  try {
    const aiAnalytics = new AIAnalyticsService(c.env.DB);
    const [distribution, percentiles] = await Promise.all([
      aiAnalytics.getLatencyDistribution(from, to),
      aiAnalytics.getLatencyPercentiles(from, to),
    ]);
    return c.json({ distribution, percentiles });
  } catch (err) {
    logWithContext('error', 'analytics.ai_latency_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch latency data' }, 500);
  }
});

/**
 * Get recent AI errors
 */
app.get('/ai/errors', zValidator('query', z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
})), async (c) => {
  const requestId = c.get('requestId');
  const { limit } = c.req.valid('query');
  
  try {
    const aiAnalytics = new AIAnalyticsService(c.env.DB);
    const errors = await aiAnalytics.getRecentErrors(limit);
    return c.json({ errors });
  } catch (err) {
    logWithContext('error', 'analytics.ai_errors_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch errors' }, 500);
  }
});

/**
 * Get hourly usage for today
 */
app.get('/ai/hourly', async (c) => {
  const requestId = c.get('requestId');
  
  try {
    const aiAnalytics = new AIAnalyticsService(c.env.DB);
    const hourly = await aiAnalytics.getHourlyUsageToday();
    return c.json({ hourly });
  } catch (err) {
    logWithContext('error', 'analytics.ai_hourly_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch hourly data' }, 500);
  }
});

app.get('/content', zValidator('query', contentUsageSchema), async (c) => {
  const query = c.req.valid('query');
  const analytics = new AnalyticsService(c.env.DB);
  const stats = await analytics.getContentEvents(query);
  return c.json(stats);
});

app.get('/system', zValidator('query', dateRangeSchema), async (c) => {
  const query = c.req.valid('query');
  const analytics = new AnalyticsService(c.env.DB);
  const stats = await analytics.getSystemEvents(query);
  return c.json(stats);
});

// ═══════════════════════════════════════════════════════════
// CONTENT ANALYTICS ENDPOINTS (Phase 3)
// ═══════════════════════════════════════════════════════════

import { ContentAnalyticsService } from '../services/content-analytics';

/**
 * Get content analytics overview
 * Returns totals for lessons, stories, vocabulary with engagement stats
 */
app.get('/content/overview', async (c) => {
  const requestId = c.get('requestId');
  
  try {
    const contentAnalytics = new ContentAnalyticsService(c.env.DB);
    const overview = await contentAnalytics.getOverview();
    return c.json(overview);
  } catch (err) {
    logWithContext('error', 'analytics.content_overview_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch content overview' }, 500);
  }
});

/**
 * Get content engagement data for charts
 */
app.get('/content/engagement', zValidator('query', daysSchema), async (c) => {
  const requestId = c.get('requestId');
  const { days } = c.req.valid('query');
  
  try {
    const contentAnalytics = new ContentAnalyticsService(c.env.DB);
    const data = await contentAnalytics.getEngagementData(days);
    return c.json({ data });
  } catch (err) {
    logWithContext('error', 'analytics.content_engagement_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch engagement data' }, 500);
  }
});

/**
 * Get most popular lessons
 */
app.get('/content/popular/lessons', zValidator('query', z.object({
  limit: z.coerce.number().min(1).max(50).default(10),
})), async (c) => {
  const requestId = c.get('requestId');
  const { limit } = c.req.valid('query');
  
  try {
    const contentAnalytics = new ContentAnalyticsService(c.env.DB);
    const lessons = await contentAnalytics.getPopularLessons(limit);
    return c.json({ lessons });
  } catch (err) {
    logWithContext('error', 'analytics.popular_lessons_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch popular lessons' }, 500);
  }
});

/**
 * Get most popular stories
 */
app.get('/content/popular/stories', zValidator('query', z.object({
  limit: z.coerce.number().min(1).max(50).default(10),
})), async (c) => {
  const requestId = c.get('requestId');
  const { limit } = c.req.valid('query');
  
  try {
    const contentAnalytics = new ContentAnalyticsService(c.env.DB);
    const stories = await contentAnalytics.getPopularStories(limit);
    return c.json({ stories });
  } catch (err) {
    logWithContext('error', 'analytics.popular_stories_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch popular stories' }, 500);
  }
});

/**
 * Get HSK level breakdown
 */
app.get('/content/hsk-breakdown', async (c) => {
  const requestId = c.get('requestId');
  
  try {
    const contentAnalytics = new ContentAnalyticsService(c.env.DB);
    const breakdown = await contentAnalytics.getHskBreakdown();
    return c.json({ breakdown });
  } catch (err) {
    logWithContext('error', 'analytics.hsk_breakdown_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch HSK breakdown' }, 500);
  }
});

/**
 * Get vocabulary learning progress
 */
app.get('/content/vocab-progress', async (c) => {
  const requestId = c.get('requestId');
  
  try {
    const contentAnalytics = new ContentAnalyticsService(c.env.DB);
    const progress = await contentAnalytics.getVocabProgress();
    return c.json(progress);
  } catch (err) {
    logWithContext('error', 'analytics.vocab_progress_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch vocabulary progress' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// ENGAGEMENT TRACKING ENDPOINTS (Phase 3b - Anonymous)
// ═══════════════════════════════════════════════════════════

import { drizzle } from 'drizzle-orm/d1';
import * as EngagementService from '../services/engagement-tracking';

const engagementEventSchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    'lesson.started', 'lesson.progress', 'lesson.completed', 'lesson.abandoned',
    'story.started', 'story.progress', 'story.completed', 'story.abandoned',
    'vocab.reviewed', 'practice.completed'
  ]),
  timestamp: z.string().datetime(),
  payload: z.object({
    lessonId: z.string().optional(),
    storyId: z.string().optional(),
    vocabId: z.string().optional(),
    hskLevel: z.number().int().min(1).max(6).optional(),
    score: z.number().min(0).max(100).optional(),
    blocksCompleted: z.number().int().optional(),
    totalBlocks: z.number().int().optional(),
    blockTimings: z.array(z.object({
      index: z.number().int(),
      type: z.string(),
      seconds: z.number().int(),
    })).optional(),
    sentencesRead: z.number().int().optional(),
    totalSentences: z.number().int().optional(),
    sentenceIndex: z.number().int().optional(),
    correct: z.boolean().optional(),
    responseTimeMs: z.number().int().optional(),
    practiceType: z.enum(['lesson', 'story', 'vocab']).optional(),
    itemsCompleted: z.number().int().optional(),
    totalItems: z.number().int().optional(),
  }),
});

const batchIngestSchema = z.object({
  events: z.array(engagementEventSchema).min(1).max(100),
  appVersion: z.string().optional(),
  platform: z.enum(['ios', 'android']).optional(),
});

/**
 * Batch ingest engagement events from mobile app
 * This endpoint is PUBLIC (no auth) - events are completely anonymous
 */
const publicApp = new Hono<AppEnv>();

publicApp.post('/events/batch', zValidator('json', batchIngestSchema), async (c) => {
  const requestId = c.get('requestId');
  const body = c.req.valid('json');
  
  try {
    const db = drizzle(c.env.DB);
    const result = await EngagementService.ingestEventsBatch(db, body as EngagementService.BatchIngestRequest);
    
    logWithContext('info', 'engagement.batch_ingested', {
      requestId,
      meta: { 
        accepted: result.accepted, 
        rejected: result.rejected,
        platform: body.platform,
      },
    });
    
    return c.json(result);
  } catch (err) {
    logWithContext('error', 'engagement.batch_ingest_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to ingest events' }, 500);
  }
});

// Export public routes separately - these don't require auth
export const publicAnalyticsRoutes = publicApp;

/**
 * Get engagement overview (admin only)
 */
app.get('/engagement/overview', zValidator('query', dateRangeSchema), async (c) => {
  const requestId = c.get('requestId');
  const { from, to } = c.req.valid('query');
  
  const startDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = to || new Date().toISOString().split('T')[0];
  
  try {
    const db = drizzle(c.env.DB);
    const overview = await EngagementService.getEngagementOverview(db, startDate, endDate);
    return c.json(overview);
  } catch (err) {
    logWithContext('error', 'engagement.overview_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch engagement overview' }, 500);
  }
});

/**
 * Get stats for a specific lesson (admin only)
 */
app.get('/engagement/lessons/:lessonId', async (c) => {
  const requestId = c.get('requestId');
  const lessonId = c.req.param('lessonId');
  
  try {
    const db = drizzle(c.env.DB);
    const stats = await EngagementService.getLessonStats(db, lessonId);
    
    if (!stats) {
      return c.json({ error: 'No stats found for this lesson' }, 404);
    }
    
    return c.json(stats);
  } catch (err) {
    logWithContext('error', 'engagement.lesson_stats_failed', {
      requestId,
      meta: { error: (err as Error).message, lessonId },
    });
    return c.json({ error: 'Failed to fetch lesson stats' }, 500);
  }
});

/**
 * Get all lesson stats (admin only)
 */
app.get('/engagement/lessons', zValidator('query', z.object({
  hskLevel: z.coerce.number().int().min(1).max(6).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  orderBy: z.enum(['completions', 'time', 'rate']).default('completions'),
})), async (c) => {
  const requestId = c.get('requestId');
  const { hskLevel, limit, orderBy } = c.req.valid('query');
  
  try {
    const db = drizzle(c.env.DB);
    const stats = await EngagementService.getAllLessonStats(db, { hskLevel, limit, orderBy });
    return c.json({ lessons: stats });
  } catch (err) {
    logWithContext('error', 'engagement.all_lessons_stats_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch lesson stats' }, 500);
  }
});

/**
 * Get stats for a specific story (admin only)
 */
app.get('/engagement/stories/:storyId', async (c) => {
  const requestId = c.get('requestId');
  const storyId = c.req.param('storyId');
  
  try {
    const db = drizzle(c.env.DB);
    const stats = await EngagementService.getStoryStats(db, storyId);
    
    if (!stats) {
      return c.json({ error: 'No stats found for this story' }, 404);
    }
    
    return c.json(stats);
  } catch (err) {
    logWithContext('error', 'engagement.story_stats_failed', {
      requestId,
      meta: { error: (err as Error).message, storyId },
    });
    return c.json({ error: 'Failed to fetch story stats' }, 500);
  }
});

/**
 * Get all story stats (admin only)
 */
app.get('/engagement/stories', zValidator('query', z.object({
  hskLevel: z.coerce.number().int().min(1).max(6).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  orderBy: z.enum(['completions', 'time', 'rate']).default('completions'),
})), async (c) => {
  const requestId = c.get('requestId');
  const { hskLevel, limit, orderBy } = c.req.valid('query');
  
  try {
    const db = drizzle(c.env.DB);
    const stats = await EngagementService.getAllStoryStats(db, { hskLevel, limit, orderBy });
    return c.json({ stories: stats });
  } catch (err) {
    logWithContext('error', 'engagement.all_stories_stats_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch story stats' }, 500);
  }
});

/**
 * Get stats for a specific vocabulary item (admin only)
 */
app.get('/engagement/vocab/:vocabId', async (c) => {
  const requestId = c.get('requestId');
  const vocabId = c.req.param('vocabId');
  
  try {
    const db = drizzle(c.env.DB);
    const stats = await EngagementService.getVocabStats(db, vocabId);
    
    if (!stats) {
      return c.json({ error: 'No stats found for this vocabulary' }, 404);
    }
    
    return c.json(stats);
  } catch (err) {
    logWithContext('error', 'engagement.vocab_stats_failed', {
      requestId,
      meta: { error: (err as Error).message, vocabId },
    });
    return c.json({ error: 'Failed to fetch vocabulary stats' }, 500);
  }
});

// ============================================
// REVENUE ANALYTICS ROUTES
// ============================================

import { RevenueAnalyticsService } from '../services/revenue-analytics';
import { PerformanceAnalyticsService } from '../services/performance-analytics';

/**
 * GET /revenue/overview - Get revenue overview metrics
 */
app.get('/revenue/overview', async (c) => {
  const requestId = c.get('requestId');
  
  try {
    const revenueService = new RevenueAnalyticsService(c.env.DB);
    const overview = await revenueService.getOverview();
    return c.json(overview);
  } catch (err) {
    logWithContext('error', 'revenue.overview_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch revenue overview' }, 500);
  }
});

/**
 * GET /revenue/tiers - Get breakdown by subscription tier
 */
app.get('/revenue/tiers', async (c) => {
  const requestId = c.get('requestId');
  
  try {
    const revenueService = new RevenueAnalyticsService(c.env.DB);
    const tiers = await revenueService.getTierBreakdown();
    return c.json({ tiers });
  } catch (err) {
    logWithContext('error', 'revenue.tiers_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch tier breakdown' }, 500);
  }
});

/**
 * GET /revenue/platforms - Get breakdown by platform (iOS/Android/Web)
 */
app.get('/revenue/platforms', async (c) => {
  const requestId = c.get('requestId');
  
  try {
    const revenueService = new RevenueAnalyticsService(c.env.DB);
    const platforms = await revenueService.getPlatformBreakdown();
    return c.json({ platforms });
  } catch (err) {
    logWithContext('error', 'revenue.platforms_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch platform breakdown' }, 500);
  }
});

/**
 * GET /revenue/trends - Get subscription trends over time
 */
app.get('/revenue/trends', async (c) => {
  const requestId = c.get('requestId');
  const days = parseInt(c.req.query('days') || '30', 10);
  
  try {
    const revenueService = new RevenueAnalyticsService(c.env.DB);
    const trends = await revenueService.getSubscriptionTrends(days);
    return c.json({ trends });
  } catch (err) {
    logWithContext('error', 'revenue.trends_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch subscription trends' }, 500);
  }
});

/**
 * GET /revenue/mrr-history - Get MRR history over time
 */
app.get('/revenue/mrr-history', async (c) => {
  const requestId = c.get('requestId');
  const days = parseInt(c.req.query('days') || '90', 10);
  
  try {
    const revenueService = new RevenueAnalyticsService(c.env.DB);
    const history = await revenueService.getMRRHistory(days);
    return c.json({ history });
  } catch (err) {
    logWithContext('error', 'revenue.mrr_history_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch MRR history' }, 500);
  }
});

/**
 * GET /revenue/events - Get recent subscription events
 */
app.get('/revenue/events', async (c) => {
  const requestId = c.get('requestId');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  
  try {
    const revenueService = new RevenueAnalyticsService(c.env.DB);
    const events = await revenueService.getRecentEvents(limit);
    return c.json({ events });
  } catch (err) {
    logWithContext('error', 'revenue.events_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch subscription events' }, 500);
  }
});

/**
 * GET /revenue/status - Get subscriber counts by status
 */
app.get('/revenue/status', async (c) => {
  const requestId = c.get('requestId');
  
  try {
    const revenueService = new RevenueAnalyticsService(c.env.DB);
    const statusCounts = await revenueService.getSubscribersByStatus();
    return c.json({ status: statusCounts });
  } catch (err) {
    logWithContext('error', 'revenue.status_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch status breakdown' }, 500);
  }
});

/**
 * GET /revenue/expiring - Get count of subscriptions expiring soon
 */
app.get('/revenue/expiring', async (c) => {
  const requestId = c.get('requestId');
  const days = parseInt(c.req.query('days') || '7', 10);
  
  try {
    const revenueService = new RevenueAnalyticsService(c.env.DB);
    const count = await revenueService.getExpiringSubscriptions(days);
    return c.json({ expiring_count: count, days_ahead: days });
  } catch (err) {
    logWithContext('error', 'revenue.expiring_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch expiring subscriptions' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PERFORMANCE ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /performance/overview - Get performance overview metrics
 */
app.get('/performance/overview', async (c) => {
  const requestId = c.get('requestId');
  const days = parseInt(c.req.query('days') || '7', 10);
  
  try {
    const perfService = new PerformanceAnalyticsService(c.env.DB);
    const overview = await perfService.getOverview(days);
    return c.json(overview);
  } catch (err) {
    logWithContext('error', 'performance.overview_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch performance overview' }, 500);
  }
});

/**
 * GET /performance/latency - Get latency trend (hourly)
 */
app.get('/performance/latency', async (c) => {
  const requestId = c.get('requestId');
  const hours = parseInt(c.req.query('hours') || '24', 10);
  
  try {
    const perfService = new PerformanceAnalyticsService(c.env.DB);
    const latency = await perfService.getLatencyTrend(hours);
    return c.json({ latency });
  } catch (err) {
    logWithContext('error', 'performance.latency_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch latency data' }, 500);
  }
});

/**
 * GET /performance/errors - Get error breakdown
 */
app.get('/performance/errors', async (c) => {
  const requestId = c.get('requestId');
  const days = parseInt(c.req.query('days') || '7', 10);
  
  try {
    const perfService = new PerformanceAnalyticsService(c.env.DB);
    const errors = await perfService.getErrorBreakdown(days);
    return c.json(errors);
  } catch (err) {
    logWithContext('error', 'performance.errors_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch error data' }, 500);
  }
});

/**
 * GET /performance/endpoints - Get top endpoints by traffic
 */
app.get('/performance/endpoints', async (c) => {
  const requestId = c.get('requestId');
  const days = parseInt(c.req.query('days') || '7', 10);
  const limit = parseInt(c.req.query('limit') || '10', 10);
  
  try {
    const perfService = new PerformanceAnalyticsService(c.env.DB);
    const endpoints = await perfService.getTopEndpoints(days, limit);
    return c.json({ endpoints });
  } catch (err) {
    logWithContext('error', 'performance.endpoints_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch endpoint data' }, 500);
  }
});

/**
 * GET /performance/events - Get recent system events
 */
app.get('/performance/events', async (c) => {
  const requestId = c.get('requestId');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  
  try {
    const perfService = new PerformanceAnalyticsService(c.env.DB);
    const events = await perfService.getRecentEvents(limit);
    return c.json({ events });
  } catch (err) {
    logWithContext('error', 'performance.events_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch system events' }, 500);
  }
});

/**
 * GET /performance/models - Get AI model performance breakdown
 */
app.get('/performance/models', async (c) => {
  const requestId = c.get('requestId');
  const days = parseInt(c.req.query('days') || '7', 10);
  
  try {
    const perfService = new PerformanceAnalyticsService(c.env.DB);
    const models = await perfService.getModelPerformance(days);
    return c.json({ models });
  } catch (err) {
    logWithContext('error', 'performance.models_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch model performance' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// PHASE 1: AI TUTOR ANALYTICS
// ═══════════════════════════════════════════════════════════

/**
 * GET /ai-tutor/overview - AI Tutor session overview
 */
app.get('/ai-tutor/overview', zValidator('query', dateRangeSchema), async (c) => {
  const requestId = c.get('requestId');
  const { from, to } = c.req.valid('query');
  
  try {
    const startTs = from ? new Date(from).getTime() / 1000 : (Date.now() / 1000) - 30 * 24 * 60 * 60;
    const endTs = to ? new Date(to).getTime() / 1000 : Date.now() / 1000;
    
    // Get session stats
    const sessionStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(message_count) as total_messages,
        AVG(message_count) as avg_messages_per_session,
        SUM(total_tokens_used) as total_tokens,
        SUM(estimated_cost_usd) as total_cost,
        AVG(estimated_cost_usd) as avg_cost_per_session,
        COUNT(DISTINCT user_id) as unique_users,
        AVG(corrections_made) as avg_corrections
      FROM ai_tutor_sessions
      WHERE session_started_at >= ? AND session_started_at <= ?
    `).bind(startTs, endTs).first();
    
    // Get rating distribution
    const ratings = await c.env.DB.prepare(`
      SELECT 
        user_rating,
        COUNT(*) as count
      FROM ai_tutor_sessions
      WHERE user_rating IS NOT NULL
        AND session_started_at >= ? AND session_started_at <= ?
      GROUP BY user_rating
      ORDER BY user_rating
    `).bind(startTs, endTs).all();
    
    return c.json({
      sessions: {
        total: (sessionStats?.total_sessions as number) || 0,
        uniqueUsers: (sessionStats?.unique_users as number) || 0,
      },
      messages: {
        total: (sessionStats?.total_messages as number) || 0,
        avgPerSession: Math.round((sessionStats?.avg_messages_per_session as number) || 0),
      },
      cost: {
        total: Number(((sessionStats?.total_cost as number) || 0).toFixed(4)),
        avgPerSession: Number(((sessionStats?.avg_cost_per_session as number) || 0).toFixed(4)),
        totalTokens: (sessionStats?.total_tokens as number) || 0,
      },
      corrections: {
        avgPerSession: Math.round((sessionStats?.avg_corrections as number) || 0),
      },
      ratings: (ratings.results || []).map(r => ({
        rating: r.user_rating,
        count: r.count,
      })),
    });
  } catch (err) {
    logWithContext('error', 'analytics.ai_tutor_overview_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch AI tutor overview' }, 500);
  }
});

/**
 * GET /ai-tutor/daily - Daily AI tutor usage
 */
app.get('/ai-tutor/daily', zValidator('query', daysSchema), async (c) => {
  const requestId = c.get('requestId');
  const { days } = c.req.valid('query');
  
  try {
    const startTs = (Date.now() / 1000) - days * 24 * 60 * 60;
    
    const daily = await c.env.DB.prepare(`
      SELECT 
        date(session_started_at, 'unixepoch') as date,
        COUNT(*) as sessions,
        SUM(message_count) as messages,
        SUM(estimated_cost_usd) as cost,
        COUNT(DISTINCT user_id) as unique_users
      FROM ai_tutor_sessions
      WHERE session_started_at >= ?
      GROUP BY date(session_started_at, 'unixepoch')
      ORDER BY date ASC
    `).bind(startTs).all();
    
    return c.json({ data: daily.results || [] });
  } catch (err) {
    logWithContext('error', 'analytics.ai_tutor_daily_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch daily AI tutor data' }, 500);
  }
});

/**
 * GET /ai-tutor/topics - Most discussed topics
 */
app.get('/ai-tutor/topics', zValidator('query', z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
})), async (c) => {
  const requestId = c.get('requestId');
  const { limit } = c.req.valid('query');
  
  try {
    // Get all topics discussed
    const sessions = await c.env.DB.prepare(`
      SELECT topics_discussed
      FROM ai_tutor_sessions
      WHERE topics_discussed IS NOT NULL
    `).all();
    
    // Count topic frequency
    const topicCounts: Record<string, number> = {};
    for (const session of sessions.results || []) {
      const topics = JSON.parse(session.topics_discussed as string || '[]');
      for (const topic of topics) {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      }
    }
    
    // Sort and limit
    const sorted = Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([topic, count]) => ({ topic, count }));
    
    return c.json({ topics: sorted });
  } catch (err) {
    logWithContext('error', 'analytics.ai_tutor_topics_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch topics' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// PHASE 2: EXERCISE SUCCESS TRACKING
// ═══════════════════════════════════════════════════════════

/**
 * GET /exercises/overview - Exercise success overview
 */
app.get('/exercises/overview', zValidator('query', dateRangeSchema), async (c) => {
  const requestId = c.get('requestId');
  const { from, to } = c.req.valid('query');
  
  try {
    const startTs = from ? new Date(from).getTime() / 1000 : (Date.now() / 1000) - 30 * 24 * 60 * 60;
    const endTs = to ? new Date(to).getTime() / 1000 : Date.now() / 1000;
    
    // Overall stats
    const overall = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_attempts,
        SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct_attempts,
        AVG(time_spent_ms) as avg_time_ms,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT lesson_id) as lessons_practiced
      FROM exercise_attempts
      WHERE created_at >= ? AND created_at <= ?
    `).bind(startTs, endTs).first();
    
    // By exercise type
    const byType = await c.env.DB.prepare(`
      SELECT 
        exercise_type,
        COUNT(*) as attempts,
        SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct,
        ROUND(100.0 * SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) / COUNT(*), 1) as success_rate,
        AVG(time_spent_ms) as avg_time_ms
      FROM exercise_attempts
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY exercise_type
      ORDER BY attempts DESC
    `).bind(startTs, endTs).all();
    
    const totalAttempts = (overall?.total_attempts as number) || 0;
    const correctAttempts = (overall?.correct_attempts as number) || 0;
    
    return c.json({
      overall: {
        totalAttempts,
        correctAttempts,
        successRate: totalAttempts > 0 ? Math.round(100 * correctAttempts / totalAttempts) : 0,
        avgTimeMs: Math.round((overall?.avg_time_ms as number) || 0),
        uniqueUsers: (overall?.unique_users as number) || 0,
        lessonsPracticed: (overall?.lessons_practiced as number) || 0,
      },
      byType: byType.results || [],
    });
  } catch (err) {
    logWithContext('error', 'analytics.exercises_overview_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch exercise overview' }, 500);
  }
});

/**
 * GET /exercises/daily - Daily exercise stats
 */
app.get('/exercises/daily', zValidator('query', daysSchema), async (c) => {
  const requestId = c.get('requestId');
  const { days } = c.req.valid('query');
  
  try {
    const startTs = (Date.now() / 1000) - days * 24 * 60 * 60;
    
    const daily = await c.env.DB.prepare(`
      SELECT 
        date(created_at, 'unixepoch') as date,
        COUNT(*) as attempts,
        SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct,
        ROUND(100.0 * SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) / COUNT(*), 1) as success_rate,
        COUNT(DISTINCT user_id) as unique_users
      FROM exercise_attempts
      WHERE created_at >= ?
      GROUP BY date(created_at, 'unixepoch')
      ORDER BY date ASC
    `).bind(startTs).all();
    
    return c.json({ data: daily.results || [] });
  } catch (err) {
    logWithContext('error', 'analytics.exercises_daily_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch daily exercise data' }, 500);
  }
});

/**
 * GET /exercises/hardest - Most difficult exercises
 */
app.get('/exercises/hardest', zValidator('query', z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
})), async (c) => {
  const requestId = c.get('requestId');
  const { limit } = c.req.valid('query');
  
  try {
    const hardest = await c.env.DB.prepare(`
      SELECT 
        ea.block_id,
        ea.exercise_type,
        ea.lesson_id,
        l.title as lesson_title,
        COUNT(*) as attempts,
        SUM(CASE WHEN ea.is_correct = 1 THEN 1 ELSE 0 END) as correct,
        ROUND(100.0 * SUM(CASE WHEN ea.is_correct = 1 THEN 1 ELSE 0 END) / COUNT(*), 1) as success_rate
      FROM exercise_attempts ea
      LEFT JOIN lessons l ON ea.lesson_id = l.id
      GROUP BY ea.block_id
      HAVING COUNT(*) >= 5
      ORDER BY success_rate ASC
      LIMIT ?
    `).bind(limit).all();
    
    return c.json({ hardest: hardest.results || [] });
  } catch (err) {
    logWithContext('error', 'analytics.exercises_hardest_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch hardest exercises' }, 500);
  }
});

// Mobile endpoint to track exercise attempts (public)
publicApp.post('/exercises/attempt', zValidator('json', z.object({
  userId: z.string().optional(),
  lessonId: z.string().optional(),
  storyId: z.string().optional(),
  blockId: z.string(),
  exerciseType: z.string(),
  isCorrect: z.boolean(),
  attemptNumber: z.number().int().min(1).default(1),
  timeSpentMs: z.number().int().optional(),
  hintsUsed: z.number().int().default(0),
})), async (c) => {
  const requestId = c.get('requestId');
  const body = c.req.valid('json');
  
  try {
    const id = crypto.randomUUID();
    await c.env.DB.prepare(`
      INSERT INTO exercise_attempts (id, user_id, lesson_id, story_id, block_id, exercise_type, is_correct, attempt_number, time_spent_ms, hints_used)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      body.userId || 'anonymous',
      body.lessonId || null,
      body.storyId || null,
      body.blockId,
      body.exerciseType,
      body.isCorrect ? 1 : 0,
      body.attemptNumber,
      body.timeSpentMs || null,
      body.hintsUsed
    ).run();
    
    return c.json({ success: true, id });
  } catch (err) {
    logWithContext('error', 'analytics.exercise_attempt_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to record attempt' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// PHASE 3: EXECUTIVE DASHBOARD
// ═══════════════════════════════════════════════════════════

/**
 * GET /executive/overview - High-level business metrics
 */
app.get('/executive/overview', async (c) => {
  const requestId = c.get('requestId');
  
  try {
    const now = Date.now() / 1000;
    const oneDayAgo = now - 24 * 60 * 60;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60;
    const sixtyDaysAgo = now - 60 * 24 * 60 * 60;
    
    // Total users
    const totalUsers = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM users
    `).first();
    
    // New users last 30 days
    const newUsers30d = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM users WHERE created_at >= ?
    `).bind(thirtyDaysAgo).first();
    
    // Previous 30 days (for growth comparison)
    const newUsersPrev30d = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM users WHERE created_at >= ? AND created_at < ?
    `).bind(sixtyDaysAgo, thirtyDaysAgo).first();
    
    // Active users (DAU/WAU/MAU)
    const dau = await c.env.DB.prepare(`
      SELECT COUNT(DISTINCT user_id) as count FROM user_activity_log WHERE activity_date = date('now')
    `).first();
    
    const wau = await c.env.DB.prepare(`
      SELECT COUNT(DISTINCT user_id) as count FROM user_activity_log WHERE activity_date >= date('now', '-7 days')
    `).first();
    
    const mau = await c.env.DB.prepare(`
      SELECT COUNT(DISTINCT user_id) as count FROM user_activity_log WHERE activity_date >= date('now', '-30 days')
    `).first();
    
    // Lessons completed last 30 days
    const lessonsCompleted = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM lesson_engagement_stats WHERE completed_at >= ?
    `).bind(thirtyDaysAgo).first();
    
    // Stories completed last 30 days
    const storiesCompleted = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM story_engagement_stats WHERE completed_at >= ?
    `).bind(thirtyDaysAgo).first();
    
    // AI cost last 30 days
    const aiCost = await c.env.DB.prepare(`
      SELECT SUM(cost_usd) as total FROM ai_usage_log WHERE created_at >= ?
    `).bind(thirtyDaysAgo).first();
    
    // Words learned (vocabulary reviews with first correct)
    const wordsLearned = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM vocab_engagement_stats WHERE first_correct_at >= ?
    `).bind(thirtyDaysAgo).first();
    
    // Calculate MoM growth
    const currentMonthUsers = (newUsers30d?.count as number) || 0;
    const prevMonthUsers = (newUsersPrev30d?.count as number) || 1; // Avoid div by 0
    const momGrowth = Math.round(100 * (currentMonthUsers - prevMonthUsers) / prevMonthUsers);
    
    return c.json({
      users: {
        total: (totalUsers?.count as number) || 0,
        new30d: currentMonthUsers,
        momGrowthPct: momGrowth,
      },
      activeUsers: {
        dau: (dau?.count as number) || 0,
        wau: (wau?.count as number) || 0,
        mau: (mau?.count as number) || 0,
      },
      learning: {
        lessonsCompleted30d: (lessonsCompleted?.count as number) || 0,
        storiesCompleted30d: (storiesCompleted?.count as number) || 0,
        wordsLearned30d: (wordsLearned?.count as number) || 0,
      },
      cost: {
        aiTotal30d: Number(((aiCost?.total as number) || 0).toFixed(2)),
      },
    });
  } catch (err) {
    logWithContext('error', 'analytics.executive_overview_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch executive overview' }, 500);
  }
});

/**
 * GET /executive/retention - Retention curve data
 */
app.get('/executive/retention', async (c) => {
  const requestId = c.get('requestId');
  
  try {
    // Get users by signup cohort and their activity
    const cohortData = await c.env.DB.prepare(`
      WITH user_cohorts AS (
        SELECT 
          id as user_id,
          date(created_at, 'unixepoch') as signup_date
        FROM users
        WHERE created_at >= strftime('%s', 'now', '-90 days')
      ),
      user_activity AS (
        SELECT 
          user_id,
          activity_date
        FROM user_activity_log
      )
      SELECT 
        uc.signup_date,
        COUNT(DISTINCT uc.user_id) as cohort_size,
        COUNT(DISTINCT CASE WHEN ua.activity_date = date(uc.signup_date, '+1 day') THEN uc.user_id END) as day1,
        COUNT(DISTINCT CASE WHEN ua.activity_date = date(uc.signup_date, '+7 days') THEN uc.user_id END) as day7,
        COUNT(DISTINCT CASE WHEN ua.activity_date = date(uc.signup_date, '+30 days') THEN uc.user_id END) as day30
      FROM user_cohorts uc
      LEFT JOIN user_activity ua ON uc.user_id = ua.user_id
      GROUP BY uc.signup_date
      ORDER BY uc.signup_date DESC
      LIMIT 30
    `).all();
    
    // Calculate aggregate retention rates
    let totalUsers = 0;
    let day1Retained = 0;
    let day7Retained = 0;
    let day30Retained = 0;
    
    for (const row of cohortData.results || []) {
      const cohortSize = (row.cohort_size as number) || 0;
      totalUsers += cohortSize;
      day1Retained += (row.day1 as number) || 0;
      day7Retained += (row.day7 as number) || 0;
      day30Retained += (row.day30 as number) || 0;
    }
    
    return c.json({
      curve: {
        day1: totalUsers > 0 ? Math.round(100 * day1Retained / totalUsers) : 0,
        day7: totalUsers > 0 ? Math.round(100 * day7Retained / totalUsers) : 0,
        day30: totalUsers > 0 ? Math.round(100 * day30Retained / totalUsers) : 0,
      },
      cohorts: cohortData.results || [],
    });
  } catch (err) {
    logWithContext('error', 'analytics.executive_retention_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch retention data' }, 500);
  }
});

/**
 * GET /executive/trends - Learning velocity and engagement trends
 */
app.get('/executive/trends', zValidator('query', daysSchema), async (c) => {
  const requestId = c.get('requestId');
  const { days } = c.req.valid('query');
  
  try {
    // Daily learning metrics
    const trends = await c.env.DB.prepare(`
      SELECT 
        dm.date,
        dm.active_users,
        dm.new_users,
        dm.lessons_completed,
        dm.stories_completed,
        dm.words_learned,
        dm.ai_cost_usd as ai_cost
      FROM daily_metrics dm
      WHERE dm.date >= date('now', '-' || ? || ' days')
      ORDER BY dm.date ASC
    `).bind(days).all();
    
    // If no data in daily_metrics, compute on the fly
    if (!trends.results?.length) {
      const computed = await c.env.DB.prepare(`
        WITH dates AS (
          SELECT date('now', '-' || (? - n) || ' days') as date
          FROM (SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
                UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
                UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14
                UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19
                UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24
                UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29)
          WHERE n < ?
        )
        SELECT 
          d.date,
          COALESCE(COUNT(DISTINCT ual.user_id), 0) as active_users,
          COALESCE((SELECT COUNT(*) FROM users WHERE date(created_at, 'unixepoch') = d.date), 0) as new_users
        FROM dates d
        LEFT JOIN user_activity_log ual ON ual.activity_date = d.date
        GROUP BY d.date
        ORDER BY d.date ASC
      `).bind(days, days).all();
      
      return c.json({ data: computed.results || [] });
    }
    
    return c.json({ data: trends.results || [] });
  } catch (err) {
    logWithContext('error', 'analytics.executive_trends_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch trends' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// PHASE 4: STORY DEEP DIVE
// ═══════════════════════════════════════════════════════════

/**
 * GET /stories/reading/overview - Story reading analytics
 */
app.get('/stories/reading/overview', zValidator('query', dateRangeSchema), async (c) => {
  const requestId = c.get('requestId');
  const { from, to } = c.req.valid('query');
  
  try {
    const startTs = from ? new Date(from).getTime() / 1000 : (Date.now() / 1000) - 30 * 24 * 60 * 60;
    const endTs = to ? new Date(to).getTime() / 1000 : Date.now() / 1000;
    
    const overview = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_reads,
        COUNT(DISTINCT user_id) as unique_readers,
        COUNT(DISTINCT story_id) as stories_read,
        AVG(read_completion_pct) as avg_completion_pct,
        SUM(words_tapped) as total_words_tapped,
        SUM(audio_plays) as total_audio_plays,
        AVG(time_spent_seconds) as avg_time_seconds,
        SUM(CASE WHEN finished = 1 THEN 1 ELSE 0 END) as fully_completed
      FROM story_reading_events
      WHERE created_at >= ? AND created_at <= ?
    `).bind(startTs, endTs).first();
    
    const totalReads = (overview?.total_reads as number) || 0;
    const fullyCompleted = (overview?.fully_completed as number) || 0;
    
    return c.json({
      totalReads,
      uniqueReaders: (overview?.unique_readers as number) || 0,
      storiesRead: (overview?.stories_read as number) || 0,
      avgCompletionPct: Math.round((overview?.avg_completion_pct as number) || 0),
      completionRate: totalReads > 0 ? Math.round(100 * fullyCompleted / totalReads) : 0,
      engagement: {
        wordsTapped: (overview?.total_words_tapped as number) || 0,
        audioPlays: (overview?.total_audio_plays as number) || 0,
        avgTimeSeconds: Math.round((overview?.avg_time_seconds as number) || 0),
      },
    });
  } catch (err) {
    logWithContext('error', 'analytics.stories_reading_overview_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch story reading overview' }, 500);
  }
});

/**
 * GET /stories/reading/:storyId - Detailed story analytics
 */
app.get('/stories/reading/:storyId', async (c) => {
  const requestId = c.get('requestId');
  const storyId = c.req.param('storyId');
  
  try {
    // Get story metadata
    const story = await c.env.DB.prepare(`
      SELECT id, title, hsk_level FROM stories WHERE id = ?
    `).bind(storyId).first();
    
    if (!story) {
      return c.json({ error: 'Story not found' }, 404);
    }
    
    // Get reading stats
    const stats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_reads,
        COUNT(DISTINCT user_id) as unique_readers,
        AVG(read_completion_pct) as avg_completion_pct,
        AVG(time_spent_seconds) as avg_time_seconds,
        SUM(words_tapped) as total_words_tapped,
        SUM(audio_plays) as total_audio_plays,
        SUM(CASE WHEN finished = 1 THEN 1 ELSE 0 END) as completed_count
      FROM story_reading_events
      WHERE story_id = ?
    `).bind(storyId).first();
    
    // Get sentence-level stats
    const sentenceStats = await c.env.DB.prepare(`
      SELECT 
        sentence_index,
        times_displayed,
        times_audio_played,
        words_tapped,
        avg_time_on_sentence_ms
      FROM story_sentence_stats
      WHERE story_id = ?
      ORDER BY sentence_index
    `).bind(storyId).all();
    
    // Get completion distribution
    const completionDist = await c.env.DB.prepare(`
      SELECT 
        CASE 
          WHEN read_completion_pct < 25 THEN '0-25%'
          WHEN read_completion_pct < 50 THEN '25-50%'
          WHEN read_completion_pct < 75 THEN '50-75%'
          ELSE '75-100%'
        END as range,
        COUNT(*) as count
      FROM story_reading_events
      WHERE story_id = ?
      GROUP BY range
    `).bind(storyId).all();
    
    return c.json({
      story: {
        id: story.id,
        title: story.title,
        hskLevel: story.hsk_level,
      },
      stats: {
        totalReads: (stats?.total_reads as number) || 0,
        uniqueReaders: (stats?.unique_readers as number) || 0,
        avgCompletionPct: Math.round((stats?.avg_completion_pct as number) || 0),
        avgTimeSeconds: Math.round((stats?.avg_time_seconds as number) || 0),
        wordsTapped: (stats?.total_words_tapped as number) || 0,
        audioPlays: (stats?.total_audio_plays as number) || 0,
        completedCount: (stats?.completed_count as number) || 0,
      },
      sentences: sentenceStats.results || [],
      completionDistribution: completionDist.results || [],
    });
  } catch (err) {
    logWithContext('error', 'analytics.story_detail_failed', {
      requestId,
      meta: { error: (err as Error).message, storyId },
    });
    return c.json({ error: 'Failed to fetch story analytics' }, 500);
  }
});

/**
 * GET /stories/reading/confusing-words - Most tapped words across stories
 */
app.get('/stories/reading/confusing-words', zValidator('query', z.object({
  limit: z.coerce.number().min(1).max(100).default(30),
})), async (c) => {
  const requestId = c.get('requestId');
  const { limit } = c.req.valid('query');
  
  try {
    // Note: This requires tracking individual word taps
    // For now, return sentence-level data with high tap counts
    const confusing = await c.env.DB.prepare(`
      SELECT 
        sss.story_id,
        s.title as story_title,
        sss.sentence_index,
        sss.words_tapped,
        sss.times_displayed,
        ROUND(100.0 * sss.words_tapped / NULLIF(sss.times_displayed, 0), 1) as tap_rate
      FROM story_sentence_stats sss
      JOIN stories s ON sss.story_id = s.id
      WHERE sss.times_displayed >= 5
      ORDER BY tap_rate DESC
      LIMIT ?
    `).bind(limit).all();
    
    return c.json({ confusingParts: confusing.results || [] });
  } catch (err) {
    logWithContext('error', 'analytics.confusing_words_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to fetch confusing words' }, 500);
  }
});

// Mobile endpoint to track story reading (public)
publicApp.post('/stories/reading', zValidator('json', z.object({
  userId: z.string().optional(),
  storyId: z.string(),
  sentencesRead: z.number().int().default(0),
  totalSentences: z.number().int().optional(),
  wordsTapped: z.number().int().default(0),
  audioPlays: z.number().int().default(0),
  timeSpentSeconds: z.number().int().default(0),
  scrollDepthPct: z.number().min(0).max(100).default(0),
  finished: z.boolean().default(false),
})), async (c) => {
  const requestId = c.get('requestId');
  const body = c.req.valid('json');
  
  try {
    const id = crypto.randomUUID();
    const completionPct = body.totalSentences && body.totalSentences > 0
      ? Math.round(100 * body.sentencesRead / body.totalSentences)
      : body.scrollDepthPct;
    
    await c.env.DB.prepare(`
      INSERT INTO story_reading_events 
      (id, user_id, story_id, sentences_read, total_sentences, read_completion_pct, words_tapped, audio_plays, time_spent_seconds, scroll_depth_pct, finished)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      body.userId || 'anonymous',
      body.storyId,
      body.sentencesRead,
      body.totalSentences || null,
      completionPct,
      body.wordsTapped,
      body.audioPlays,
      body.timeSpentSeconds,
      body.scrollDepthPct,
      body.finished ? 1 : 0
    ).run();
    
    return c.json({ success: true, id });
  } catch (err) {
    logWithContext('error', 'analytics.story_reading_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to record reading event' }, 500);
  }
});

// Mobile endpoint to track AI tutor session (public)
publicApp.post('/ai-tutor/session', zValidator('json', z.object({
  userId: z.string().optional(),
  sessionId: z.string(),
  messageCount: z.number().int().default(0),
  userMessageCount: z.number().int().default(0),
  aiMessageCount: z.number().int().default(0),
  topicsDiscussed: z.array(z.string()).optional(),
  vocabularyUsed: z.array(z.string()).optional(),
  grammarPointsCovered: z.array(z.string()).optional(),
  correctionsMade: z.number().int().default(0),
  userRating: z.number().int().min(1).max(5).optional(),
  totalTokensUsed: z.number().int().default(0),
  estimatedCostUsd: z.number().default(0),
  endSession: z.boolean().default(false),
})), async (c) => {
  const requestId = c.get('requestId');
  const body = c.req.valid('json');
  
  try {
    // Upsert session
    await c.env.DB.prepare(`
      INSERT INTO ai_tutor_sessions 
      (id, user_id, message_count, user_message_count, ai_message_count, topics_discussed, vocabulary_used, grammar_points_covered, corrections_made, user_rating, total_tokens_used, estimated_cost_usd, session_ended_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        message_count = excluded.message_count,
        user_message_count = excluded.user_message_count,
        ai_message_count = excluded.ai_message_count,
        topics_discussed = excluded.topics_discussed,
        vocabulary_used = excluded.vocabulary_used,
        grammar_points_covered = excluded.grammar_points_covered,
        corrections_made = excluded.corrections_made,
        user_rating = COALESCE(excluded.user_rating, user_rating),
        total_tokens_used = excluded.total_tokens_used,
        estimated_cost_usd = excluded.estimated_cost_usd,
        session_ended_at = excluded.session_ended_at
    `).bind(
      body.sessionId,
      body.userId || 'anonymous',
      body.messageCount,
      body.userMessageCount,
      body.aiMessageCount,
      body.topicsDiscussed ? JSON.stringify(body.topicsDiscussed) : null,
      body.vocabularyUsed ? JSON.stringify(body.vocabularyUsed) : null,
      body.grammarPointsCovered ? JSON.stringify(body.grammarPointsCovered) : null,
      body.correctionsMade,
      body.userRating || null,
      body.totalTokensUsed,
      body.estimatedCostUsd,
      body.endSession ? Math.floor(Date.now() / 1000) : null
    ).run();
    
    return c.json({ success: true });
  } catch (err) {
    logWithContext('error', 'analytics.ai_tutor_session_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to record session' }, 500);
  }
});

// Activity logging endpoint for retention tracking (public)
publicApp.post('/activity', zValidator('json', z.object({
  userId: z.string(),
  activityType: z.enum(['lesson', 'story', 'vocab', 'ai_chat']),
})), async (c) => {
  const requestId = c.get('requestId');
  const body = c.req.valid('json');
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const id = `${body.userId}-${today}-${body.activityType}`;
    
    await c.env.DB.prepare(`
      INSERT INTO user_activity_log (id, user_id, activity_date, activity_type, activity_count)
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(id) DO UPDATE SET activity_count = activity_count + 1
    `).bind(id, body.userId, today, body.activityType).run();
    
    return c.json({ success: true });
  } catch (err) {
    logWithContext('error', 'analytics.activity_log_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    return c.json({ error: 'Failed to log activity' }, 500);
  }
});

export default app;

