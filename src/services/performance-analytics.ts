/**
 * Performance Analytics Service
 * Provides metrics for API latency, errors, and system health
 */

import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { sql, desc, and, gte, eq, count } from 'drizzle-orm';
import { systemEvents, apiUsage } from '../schema';

export class PerformanceAnalyticsService {
  constructor(private db: D1Database) {}

  private getClient() {
    return drizzle(this.db);
  }

  /**
   * Get overview metrics for performance dashboard
   */
  async getOverview(days: number = 7) {
    const d1 = this.getClient();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get total requests and average latency from api_usage
    const usageStats = await d1
      .select({
        totalRequests: count(),
        avgLatency: sql<number>`avg(${apiUsage.latencyMs})`,
        totalErrors: sql<number>`sum(case when ${apiUsage.success} = 0 then 1 else 0 end)`,
      })
      .from(apiUsage)
      .where(gte(apiUsage.createdAt, since));

    const stats = usageStats[0] || { totalRequests: 0, avgLatency: 0, totalErrors: 0 };
    const errorRate = stats.totalRequests > 0 
      ? ((stats.totalErrors || 0) / stats.totalRequests * 100).toFixed(2)
      : '0';

    // Get system events count
    const eventsCount = await d1
      .select({ count: count() })
      .from(systemEvents)
      .where(gte(systemEvents.createdAt, since));

    return {
      totalRequests: stats.totalRequests || 0,
      avgLatencyMs: Math.round(stats.avgLatency || 0),
      errorRate: parseFloat(errorRate),
      totalErrors: stats.totalErrors || 0,
      systemEvents: eventsCount[0]?.count || 0,
      uptime: 99.95, // TODO: Calculate from actual downtime events
      period: `${days} days`,
    };
  }

  /**
   * Get latency percentiles over time (hourly buckets)
   */
  async getLatencyTrend(hours: number = 24) {
    const d1 = this.getClient();
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    // SQLite doesn't have great percentile support, so we'll approximate
    const hourlyData = await d1
      .select({
        hour: sql<string>`strftime('%Y-%m-%d %H:00', datetime(${apiUsage.createdAt}, 'unixepoch'))`,
        avgLatency: sql<number>`avg(${apiUsage.latencyMs})`,
        minLatency: sql<number>`min(${apiUsage.latencyMs})`,
        maxLatency: sql<number>`max(${apiUsage.latencyMs})`,
        count: count(),
      })
      .from(apiUsage)
      .where(gte(apiUsage.createdAt, since))
      .groupBy(sql`strftime('%Y-%m-%d %H:00', datetime(${apiUsage.createdAt}, 'unixepoch'))`)
      .orderBy(sql`hour`);

    // Estimate percentiles (rough approximation)
    return hourlyData.map(row => ({
      hour: row.hour,
      p50: Math.round(row.avgLatency || 0),
      p95: Math.round((row.avgLatency || 0) * 1.8), // Rough estimate
      p99: Math.round((row.maxLatency || 0) * 0.9), // Rough estimate
      requests: row.count,
    }));
  }

  /**
   * Get error breakdown by type/status
   */
  async getErrorBreakdown(days: number = 7) {
    const d1 = this.getClient();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get errors from api_usage (where success = false)
    const errors = await d1
      .select({
        errorMessage: apiUsage.errorMessage,
        count: count(),
      })
      .from(apiUsage)
      .where(and(
        gte(apiUsage.createdAt, since),
        eq(apiUsage.success, false)
      ))
      .groupBy(apiUsage.errorMessage)
      .orderBy(desc(count()));

    // Also get system events that are errors
    const systemErrors = await d1
      .select({
        eventType: systemEvents.eventType,
        count: count(),
      })
      .from(systemEvents)
      .where(and(
        gte(systemEvents.createdAt, since),
        sql`${systemEvents.eventType} LIKE '%error%' OR ${systemEvents.eventType} LIKE '%fail%'`
      ))
      .groupBy(systemEvents.eventType)
      .orderBy(desc(count()));

    // Parse error messages into status codes
    const errorCodes: Record<string, { count: number; description: string }> = {
      '400': { count: 0, description: 'Bad Request' },
      '401': { count: 0, description: 'Unauthorized' },
      '403': { count: 0, description: 'Forbidden' },
      '404': { count: 0, description: 'Not Found' },
      '429': { count: 0, description: 'Rate Limited' },
      '500': { count: 0, description: 'Server Error' },
    };

    for (const err of errors) {
      const msg = err.errorMessage || '';
      if (msg.includes('400') || msg.includes('Bad Request')) {
        errorCodes['400'].count += err.count;
      } else if (msg.includes('401') || msg.includes('Unauthorized')) {
        errorCodes['401'].count += err.count;
      } else if (msg.includes('403') || msg.includes('Forbidden')) {
        errorCodes['403'].count += err.count;
      } else if (msg.includes('404') || msg.includes('Not Found')) {
        errorCodes['404'].count += err.count;
      } else if (msg.includes('429') || msg.includes('Rate')) {
        errorCodes['429'].count += err.count;
      } else {
        errorCodes['500'].count += err.count;
      }
    }

    return {
      byStatusCode: Object.entries(errorCodes)
        .filter(([_, v]) => v.count > 0)
        .map(([code, v]) => ({ code, count: v.count, description: v.description })),
      byEventType: systemErrors.slice(0, 10),
    };
  }

  /**
   * Get top endpoints by request volume
   */
  async getTopEndpoints(days: number = 7, limit: number = 10) {
    const d1 = this.getClient();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Group by prompt slug (as proxy for endpoint)
    const byPrompt = await d1
      .select({
        endpoint: apiUsage.promptSlug,
        requests: count(),
        avgLatency: sql<number>`avg(${apiUsage.latencyMs})`,
        errorCount: sql<number>`sum(case when ${apiUsage.success} = 0 then 1 else 0 end)`,
      })
      .from(apiUsage)
      .where(gte(apiUsage.createdAt, since))
      .groupBy(apiUsage.promptSlug)
      .orderBy(desc(count()))
      .limit(limit);

    return byPrompt.map(row => ({
      endpoint: row.endpoint || '/v1/ai/generate',
      requests: row.requests,
      avgMs: Math.round(row.avgLatency || 0),
      errorRate: row.requests > 0 
        ? ((row.errorCount || 0) / row.requests * 100).toFixed(1)
        : '0',
    }));
  }

  /**
   * Get recent system events
   */
  async getRecentEvents(limit: number = 50) {
    const d1 = this.getClient();

    const events = await d1
      .select()
      .from(systemEvents)
      .orderBy(desc(systemEvents.createdAt))
      .limit(limit);

    return events.map(e => ({
      id: e.id,
      type: e.eventType,
      requestId: e.requestId,
      model: e.modelUsed,
      latencyMs: e.latencyMs,
      costUsd: e.costUsd,
      createdAt: e.createdAt,
    }));
  }

  /**
   * Get AI model performance breakdown
   */
  async getModelPerformance(days: number = 7) {
    const d1 = this.getClient();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const modelStats = await d1
      .select({
        model: apiUsage.modelUsed,
        requests: count(),
        avgLatency: sql<number>`avg(${apiUsage.latencyMs})`,
        totalTokens: sql<number>`sum(${apiUsage.totalTokens})`,
        totalCost: sql<number>`sum(${apiUsage.estimatedCost})`,
        errorCount: sql<number>`sum(case when ${apiUsage.success} = 0 then 1 else 0 end)`,
      })
      .from(apiUsage)
      .where(gte(apiUsage.createdAt, since))
      .groupBy(apiUsage.modelUsed)
      .orderBy(desc(count()));

    return modelStats.map(row => ({
      model: row.model,
      requests: row.requests,
      avgLatencyMs: Math.round(row.avgLatency || 0),
      totalTokens: row.totalTokens || 0,
      totalCost: (row.totalCost || 0).toFixed(4),
      errorRate: row.requests > 0 
        ? ((row.errorCount || 0) / row.requests * 100).toFixed(1)
        : '0',
    }));
  }
}

