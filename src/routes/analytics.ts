import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth';
import { AnalyticsService } from '../services/analytics';
import { UserAnalyticsService } from '../services/user-analytics';
import type { AppEnv } from '../types/app';
import { logWithContext } from '../utils/logger';

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

app.use('/*', authMiddleware({ allowRoles: ['admin'] }));

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

export default app;

