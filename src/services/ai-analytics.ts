/**
 * AI Analytics Service
 * Phase 4: Detailed AI usage analytics
 * 
 * Provides:
 * - Daily usage aggregations
 * - Model performance breakdown
 * - Prompt performance comparison
 * - Cost analysis
 * - Latency distribution
 */

import type { D1Database } from '@cloudflare/workers-types';

export interface AIOverview {
  totalRequests: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  successRate: number;
  avgLatencyMs: number;
  uniqueUsers: number;
}

export interface DailyAIUsage {
  date: string;
  requests: number;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  avgLatencyMs: number;
  successCount: number;
  errorCount: number;
}

export interface ModelBreakdown {
  model: string;
  requests: number;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  avgLatencyMs: number;
  successRate: number;
  costPer1kTokens: number;
}

export interface PromptPerformance {
  promptSlug: string;
  activeVersion: number | null;
  requests: number;
  tokens: number;
  avgLatencyMs: number;
  successRate: number;
  avgCost: number;
  lastUsed: string | null;
}

export interface LatencyDistribution {
  bucket: string; // e.g., "0-500ms", "500-1000ms"
  count: number;
  percentage: number;
}

export interface RecentError {
  id: string;
  timestamp: string;
  model: string;
  promptSlug: string | null;
  errorMessage: string;
  latencyMs: number | null;
}

export class AIAnalyticsService {
  constructor(private readonly db: D1Database) {}

  /**
   * Get AI usage overview for a date range
   */
  async getOverview(from?: string, to?: string): Promise<AIOverview> {
    const whereClause = this.buildDateWhere(from, to);
    
    const result = await this.db.prepare(`
      SELECT 
        COUNT(*) as total_requests,
        COALESCE(SUM(total_tokens), 0) as total_tokens,
        COALESCE(SUM(input_tokens), 0) as input_tokens,
        COALESCE(SUM(output_tokens), 0) as output_tokens,
        COALESCE(SUM(estimated_cost), 0) as total_cost,
        COALESCE(AVG(latency_ms), 0) as avg_latency,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count,
        COUNT(DISTINCT user_id) as unique_users
      FROM api_usage
      ${whereClause}
    `).first();

    const totalRequests = Number(result?.total_requests || 0);
    const successCount = Number(result?.success_count || 0);

    return {
      totalRequests,
      totalTokens: Number(result?.total_tokens || 0),
      inputTokens: Number(result?.input_tokens || 0),
      outputTokens: Number(result?.output_tokens || 0),
      totalCost: Number(result?.total_cost || 0),
      successRate: totalRequests > 0 ? (successCount / totalRequests) * 100 : 0,
      avgLatencyMs: Number(result?.avg_latency || 0),
      uniqueUsers: Number(result?.unique_users || 0),
    };
  }

  /**
   * Get daily usage for charts
   */
  async getDailyUsage(days: number = 30): Promise<DailyAIUsage[]> {
    const results = await this.db.prepare(`
      SELECT 
        date(created_at, 'unixepoch') as date,
        COUNT(*) as requests,
        COALESCE(SUM(total_tokens), 0) as tokens,
        COALESCE(SUM(input_tokens), 0) as input_tokens,
        COALESCE(SUM(output_tokens), 0) as output_tokens,
        COALESCE(SUM(estimated_cost), 0) as cost,
        COALESCE(AVG(latency_ms), 0) as avg_latency,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as error_count
      FROM api_usage
      WHERE created_at >= strftime('%s', 'now', '-${days} days')
      GROUP BY date(created_at, 'unixepoch')
      ORDER BY date ASC
    `).all();

    // Fill in missing dates with zeros
    const dailyMap = new Map<string, DailyAIUsage>();
    for (const row of results.results || []) {
      dailyMap.set(row.date as string, {
        date: row.date as string,
        requests: Number(row.requests),
        tokens: Number(row.tokens),
        inputTokens: Number(row.input_tokens),
        outputTokens: Number(row.output_tokens),
        cost: Number(row.cost),
        avgLatencyMs: Number(row.avg_latency),
        successCount: Number(row.success_count),
        errorCount: Number(row.error_count),
      });
    }

    // Generate all dates
    const allDates: DailyAIUsage[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      allDates.push(dailyMap.get(dateStr) || {
        date: dateStr,
        requests: 0,
        tokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        avgLatencyMs: 0,
        successCount: 0,
        errorCount: 0,
      });
    }

    return allDates;
  }

  /**
   * Get breakdown by model
   */
  async getModelBreakdown(from?: string, to?: string): Promise<ModelBreakdown[]> {
    const whereClause = this.buildDateWhere(from, to);
    
    const results = await this.db.prepare(`
      SELECT 
        model_used as model,
        COUNT(*) as requests,
        COALESCE(SUM(total_tokens), 0) as tokens,
        COALESCE(SUM(input_tokens), 0) as input_tokens,
        COALESCE(SUM(output_tokens), 0) as output_tokens,
        COALESCE(SUM(estimated_cost), 0) as cost,
        COALESCE(AVG(latency_ms), 0) as avg_latency,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count
      FROM api_usage
      ${whereClause}
      GROUP BY model_used
      ORDER BY requests DESC
    `).all();

    return (results.results || []).map(row => {
      const requests = Number(row.requests);
      const tokens = Number(row.tokens);
      const cost = Number(row.cost);
      const successCount = Number(row.success_count);

      return {
        model: (row.model as string) || 'unknown',
        requests,
        tokens,
        inputTokens: Number(row.input_tokens),
        outputTokens: Number(row.output_tokens),
        cost,
        avgLatencyMs: Number(row.avg_latency),
        successRate: requests > 0 ? (successCount / requests) * 100 : 0,
        costPer1kTokens: tokens > 0 ? (cost / tokens) * 1000 : 0,
      };
    });
  }

  /**
   * Get prompt performance comparison
   */
  async getPromptPerformance(from?: string, to?: string): Promise<PromptPerformance[]> {
    const whereClause = this.buildDateWhere(from, to);
    
    const results = await this.db.prepare(`
      SELECT 
        prompt_slug,
        COUNT(*) as requests,
        COALESCE(SUM(total_tokens), 0) as tokens,
        COALESCE(AVG(latency_ms), 0) as avg_latency,
        COALESCE(AVG(estimated_cost), 0) as avg_cost,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count,
        MAX(created_at) as last_used
      FROM api_usage
      ${whereClause}
      GROUP BY prompt_slug
      ORDER BY requests DESC
    `).all();

    // Get active versions for each prompt
    const promptVersions = await this.db.prepare(`
      SELECT slug, version
      FROM prompt_templates
      WHERE status = 'active'
    `).all();

    const versionMap = new Map<string, number>();
    for (const row of promptVersions.results || []) {
      versionMap.set(row.slug as string, Number(row.version));
    }

    return (results.results || []).map(row => {
      const requests = Number(row.requests);
      const successCount = Number(row.success_count);
      const slug = (row.prompt_slug as string) || 'unknown';

      return {
        promptSlug: slug,
        activeVersion: versionMap.get(slug) || null,
        requests,
        tokens: Number(row.tokens),
        avgLatencyMs: Number(row.avg_latency),
        successRate: requests > 0 ? (successCount / requests) * 100 : 0,
        avgCost: Number(row.avg_cost),
        lastUsed: row.last_used ? new Date(Number(row.last_used) * 1000).toISOString() : null,
      };
    });
  }

  /**
   * Get latency distribution
   */
  async getLatencyDistribution(from?: string, to?: string): Promise<LatencyDistribution[]> {
    const whereClause = this.buildDateWhere(from, to);
    
    const result = await this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN latency_ms < 500 THEN 1 ELSE 0 END) as under_500,
        SUM(CASE WHEN latency_ms >= 500 AND latency_ms < 1000 THEN 1 ELSE 0 END) as ms_500_1000,
        SUM(CASE WHEN latency_ms >= 1000 AND latency_ms < 2000 THEN 1 ELSE 0 END) as ms_1000_2000,
        SUM(CASE WHEN latency_ms >= 2000 AND latency_ms < 5000 THEN 1 ELSE 0 END) as ms_2000_5000,
        SUM(CASE WHEN latency_ms >= 5000 THEN 1 ELSE 0 END) as over_5000
      FROM api_usage
      ${whereClause}
      AND latency_ms IS NOT NULL
    `).first();

    const total = Number(result?.total || 1);

    const buckets: LatencyDistribution[] = [
      { bucket: '<500ms', count: Number(result?.under_500 || 0), percentage: 0 },
      { bucket: '500-1s', count: Number(result?.ms_500_1000 || 0), percentage: 0 },
      { bucket: '1-2s', count: Number(result?.ms_1000_2000 || 0), percentage: 0 },
      { bucket: '2-5s', count: Number(result?.ms_2000_5000 || 0), percentage: 0 },
      { bucket: '>5s', count: Number(result?.over_5000 || 0), percentage: 0 },
    ];

    // Calculate percentages
    for (const bucket of buckets) {
      bucket.percentage = total > 0 ? (bucket.count / total) * 100 : 0;
    }

    return buckets;
  }

  /**
   * Get percentile latencies
   */
  async getLatencyPercentiles(from?: string, to?: string): Promise<{ p50: number; p90: number; p99: number }> {
    const whereClause = this.buildDateWhere(from, to);
    
    // Get all latencies sorted
    const results = await this.db.prepare(`
      SELECT latency_ms
      FROM api_usage
      ${whereClause}
      AND latency_ms IS NOT NULL
      ORDER BY latency_ms ASC
    `).all();

    const latencies = (results.results || []).map(r => Number(r.latency_ms));
    
    if (latencies.length === 0) {
      return { p50: 0, p90: 0, p99: 0 };
    }

    const getPercentile = (arr: number[], p: number) => {
      const index = Math.ceil((p / 100) * arr.length) - 1;
      return arr[Math.max(0, index)];
    };

    return {
      p50: getPercentile(latencies, 50),
      p90: getPercentile(latencies, 90),
      p99: getPercentile(latencies, 99),
    };
  }

  /**
   * Get recent errors
   */
  async getRecentErrors(limit: number = 20): Promise<RecentError[]> {
    const results = await this.db.prepare(`
      SELECT 
        id,
        created_at,
        model_used,
        prompt_slug,
        error_message,
        latency_ms
      FROM api_usage
      WHERE success = 0 AND error_message IS NOT NULL
      ORDER BY created_at DESC
      LIMIT ${limit}
    `).all();

    return (results.results || []).map(row => ({
      id: row.id as string,
      timestamp: new Date(Number(row.created_at) * 1000).toISOString(),
      model: (row.model_used as string) || 'unknown',
      promptSlug: row.prompt_slug as string | null,
      errorMessage: (row.error_message as string) || 'Unknown error',
      latencyMs: row.latency_ms as number | null,
    }));
  }

  /**
   * Get hourly usage for today
   */
  async getHourlyUsageToday(): Promise<Array<{ hour: number; requests: number; tokens: number }>> {
    const results = await this.db.prepare(`
      SELECT 
        CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) as hour,
        COUNT(*) as requests,
        COALESCE(SUM(total_tokens), 0) as tokens
      FROM api_usage
      WHERE date(created_at, 'unixepoch') = date('now')
      GROUP BY hour
      ORDER BY hour ASC
    `).all();

    // Fill in all 24 hours
    const hourlyMap = new Map<number, { requests: number; tokens: number }>();
    for (const row of results.results || []) {
      hourlyMap.set(Number(row.hour), {
        requests: Number(row.requests),
        tokens: Number(row.tokens),
      });
    }

    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      requests: hourlyMap.get(hour)?.requests || 0,
      tokens: hourlyMap.get(hour)?.tokens || 0,
    }));
  }

  private buildDateWhere(from?: string, to?: string): string {
    const conditions: string[] = [];
    
    if (from) {
      const fromTs = Math.floor(new Date(from).getTime() / 1000);
      conditions.push(`created_at >= ${fromTs}`);
    }
    if (to) {
      const toTs = Math.floor(new Date(to).getTime() / 1000) + 86400; // Include full day
      conditions.push(`created_at < ${toTs}`);
    }

    return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  }
}

