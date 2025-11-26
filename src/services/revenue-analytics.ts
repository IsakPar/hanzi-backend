/**
 * Revenue Analytics Service
 * 
 * Queries subscription and revenue data for analytics dashboard.
 * Data sources:
 * - users table (tier, subscription_status, subscription_platform, subscription_expires_at)
 * - system_events table (subscription.changed, subscription.ended events)
 */

import type { D1Database } from '@cloudflare/workers-types';

// ============================================
// TYPES
// ============================================

export interface RevenueOverview {
  totalSubscribers: number;
  activeSubscribers: number;
  mrr: number; // Monthly Recurring Revenue in cents
  arr: number; // Annual Recurring Revenue in cents
  churnRate: number; // Percentage
  avgRevenuePerUser: number; // In cents
}

export interface TierBreakdown {
  tier: string;
  count: number;
  percentage: number;
  mrr: number; // In cents
}

export interface PlatformBreakdown {
  platform: string;
  count: number;
  percentage: number;
  mrr: number;
}

export interface SubscriptionTrend {
  date: string;
  newSubscriptions: number;
  cancellations: number;
  expirations: number;
  netChange: number;
}

export interface RevenueEvent {
  id: string;
  eventType: string;
  userId: string;
  tier: string;
  platform: string;
  productId: string;
  timestamp: number;
}

// Pricing configuration (in cents per month)
const TIER_PRICING: Record<string, number> = {
  free: 0,
  premium: 999,      // $9.99/month
  pro: 1999,         // $19.99/month
};

// ============================================
// SERVICE
// ============================================

export class RevenueAnalyticsService {
  constructor(private readonly db: D1Database) {}

  /**
   * Get revenue overview metrics
   */
  async getOverview(): Promise<RevenueOverview> {
    // Get subscriber counts
    const subscriberCounts = await this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN subscription_status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN tier = 'premium' AND subscription_status = 'active' THEN 1 ELSE 0 END) as premium,
        SUM(CASE WHEN tier = 'pro' AND subscription_status = 'active' THEN 1 ELSE 0 END) as pro
      FROM users
      WHERE tier != 'free' OR subscription_status IS NOT NULL
    `).first<{ total: number; active: number; premium: number; pro: number }>();

    const total = subscriberCounts?.total || 0;
    const active = subscriberCounts?.active || 0;
    const premium = subscriberCounts?.premium || 0;
    const pro = subscriberCounts?.pro || 0;

    // Calculate MRR
    const mrr = (premium * TIER_PRICING.premium) + (pro * TIER_PRICING.pro);
    const arr = mrr * 12;

    // Calculate churn rate (last 30 days)
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    const churnData = await this.db.prepare(`
      SELECT 
        COUNT(*) as churned
      FROM system_events
      WHERE event_type = 'user.subscription.ended'
        AND created_at > ?
    `).bind(thirtyDaysAgo).first<{ churned: number }>();

    // Get active subscribers at start of period for churn calculation
    const startOfPeriodActive = await this.db.prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE subscription_status IN ('active', 'canceled', 'expired')
    `).first<{ count: number }>();

    const churned = churnData?.churned || 0;
    const startCount = startOfPeriodActive?.count || 1;
    const churnRate = startCount > 0 ? (churned / startCount) * 100 : 0;

    // Calculate ARPU
    const avgRevenuePerUser = active > 0 ? Math.round(mrr / active) : 0;

    return {
      totalSubscribers: total,
      activeSubscribers: active,
      mrr,
      arr,
      churnRate: Math.round(churnRate * 100) / 100,
      avgRevenuePerUser,
    };
  }

  /**
   * Get breakdown by tier
   */
  async getTierBreakdown(): Promise<TierBreakdown[]> {
    const result = await this.db.prepare(`
      SELECT 
        tier,
        COUNT(*) as count
      FROM users
      WHERE subscription_status = 'active'
      GROUP BY tier
    `).all<{ tier: string; count: number }>();

    const total = result.results?.reduce((sum, r) => sum + r.count, 0) || 0;

    return (result.results || []).map(row => ({
      tier: row.tier,
      count: row.count,
      percentage: total > 0 ? Math.round((row.count / total) * 100) : 0,
      mrr: row.count * (TIER_PRICING[row.tier] || 0),
    }));
  }

  /**
   * Get breakdown by platform
   */
  async getPlatformBreakdown(): Promise<PlatformBreakdown[]> {
    const result = await this.db.prepare(`
      SELECT 
        COALESCE(subscription_platform, 'unknown') as platform,
        tier,
        COUNT(*) as count
      FROM users
      WHERE subscription_status = 'active'
      GROUP BY subscription_platform, tier
    `).all<{ platform: string; tier: string; count: number }>();

    // Aggregate by platform
    const platformMap = new Map<string, { count: number; mrr: number }>();
    
    for (const row of result.results || []) {
      const existing = platformMap.get(row.platform) || { count: 0, mrr: 0 };
      existing.count += row.count;
      existing.mrr += row.count * (TIER_PRICING[row.tier] || 0);
      platformMap.set(row.platform, existing);
    }

    const total = Array.from(platformMap.values()).reduce((sum, p) => sum + p.count, 0);

    return Array.from(platformMap.entries()).map(([platform, data]) => ({
      platform,
      count: data.count,
      percentage: total > 0 ? Math.round((data.count / total) * 100) : 0,
      mrr: data.mrr,
    }));
  }

  /**
   * Get subscription trends over time
   */
  async getSubscriptionTrends(days: number = 30): Promise<SubscriptionTrend[]> {
    const startDate = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);

    const result = await this.db.prepare(`
      SELECT 
        date(created_at, 'unixepoch') as date,
        SUM(CASE WHEN event_type = 'user.subscription.changed' THEN 1 ELSE 0 END) as new_subs,
        SUM(CASE WHEN event_type = 'user.subscription.ended' THEN 1 ELSE 0 END) as ended
      FROM system_events
      WHERE created_at > ?
        AND event_type IN ('user.subscription.changed', 'user.subscription.ended')
      GROUP BY date(created_at, 'unixepoch')
      ORDER BY date ASC
    `).bind(startDate).all<{ date: string; new_subs: number; ended: number }>();

    return (result.results || []).map(row => ({
      date: row.date,
      newSubscriptions: row.new_subs || 0,
      cancellations: 0, // Would need more granular events
      expirations: row.ended || 0,
      netChange: (row.new_subs || 0) - (row.ended || 0),
    }));
  }

  /**
   * Get recent subscription events
   */
  async getRecentEvents(limit: number = 50): Promise<RevenueEvent[]> {
    const result = await this.db.prepare(`
      SELECT 
        id,
        event_type,
        user_id,
        metadata,
        created_at
      FROM system_events
      WHERE event_type IN ('user.subscription.changed', 'user.subscription.ended')
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(limit).all<{ 
      id: string; 
      event_type: string; 
      user_id: string; 
      metadata: string; 
      created_at: number 
    }>();

    return (result.results || []).map(row => {
      let metadata: Record<string, unknown> = {};
      try {
        metadata = JSON.parse(row.metadata || '{}');
      } catch { /* ignore */ }

      return {
        id: row.id,
        eventType: row.event_type,
        userId: row.user_id,
        tier: String(metadata.tier || 'unknown'),
        platform: String(metadata.platform || 'unknown'),
        productId: String(metadata.product_id || 'unknown'),
        timestamp: row.created_at,
      };
    });
  }

  /**
   * Get MRR history over time
   */
  async getMRRHistory(days: number = 90): Promise<Array<{ date: string; mrr: number }>> {
    // This is a simplified version - in production you'd want to track MRR snapshots
    const trends = await this.getSubscriptionTrends(days);
    
    // Get current MRR and work backwards
    const overview = await this.getOverview();
    let runningMrr = overview.mrr;
    
    const history: Array<{ date: string; mrr: number }> = [];
    
    // Work backwards through trends
    for (let i = trends.length - 1; i >= 0; i--) {
      const trend = trends[i];
      history.unshift({
        date: trend.date,
        mrr: Math.max(0, runningMrr),
      });
      
      // Estimate MRR change based on net subscriber change
      // Assuming average revenue per subscriber
      const avgRevenue = overview.avgRevenuePerUser || TIER_PRICING.premium;
      runningMrr -= trend.netChange * avgRevenue;
    }

    return history;
  }

  /**
   * Get subscriber count by status
   */
  async getSubscribersByStatus(): Promise<Record<string, number>> {
    const result = await this.db.prepare(`
      SELECT 
        COALESCE(subscription_status, 'none') as status,
        COUNT(*) as count
      FROM users
      GROUP BY subscription_status
    `).all<{ status: string; count: number }>();

    const statusMap: Record<string, number> = {};
    for (const row of result.results || []) {
      statusMap[row.status] = row.count;
    }

    return statusMap;
  }

  /**
   * Get users expiring soon (for renewal risk)
   */
  async getExpiringSubscriptions(daysAhead: number = 7): Promise<number> {
    const now = Math.floor(Date.now() / 1000);
    const futureDate = now + (daysAhead * 24 * 60 * 60);

    const result = await this.db.prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE subscription_status = 'active'
        AND subscription_expires_at IS NOT NULL
        AND subscription_expires_at BETWEEN ? AND ?
    `).bind(now, futureDate).first<{ count: number }>();

    return result?.count || 0;
  }
}

