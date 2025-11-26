/**
 * User Analytics Service
 * Handles user tracking, aggregation, and retention analysis
 * 
 * 285 LOC
 */

import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { eq, gte, lte, desc, and, sql } from 'drizzle-orm';
import {
  users,
  analyticsEventsRaw,
  analyticsUsersDaily,
  analyticsRetentionCohorts,
  analyticsTierDaily,
} from '../schema';
import { logWithContext } from '../utils/logger';

export interface UserAnalyticsOverview {
  totalUsers: number;
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  newSignups: {
    today: number;
    last7Days: number;
    last30Days: number;
  };
  tierBreakdown: {
    free: number;
    premium: number;
    pro: number;
  };
  avgSessionDuration: number;
}

export interface UserGrowthData {
  date: string;
  totalUsers: number;
  newSignups: number;
  activeUsers: number;
}

export interface RetentionCohort {
  cohortWeek: string;
  weekNumber: number;
  usersInCohort: number;
  usersRetained: number;
  retentionRate: number;
}

export class UserAnalyticsService {
  constructor(private readonly db: D1Database) {}

  private getClient() {
    return drizzle(this.db);
  }

  /**
   * Get user analytics overview
   */
  async getOverview(): Promise<UserAnalyticsOverview> {
    const d1 = this.getClient();
    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - 86400;
    const sevenDaysAgo = now - 7 * 86400;
    const thirtyDaysAgo = now - 30 * 86400;

    try {
      // Get total users
      const totalResult = await this.db.prepare(
        'SELECT COUNT(*) as total FROM users'
      ).first<{ total: number }>();

      // Get tier breakdown
      const tierResult = await this.db.prepare(`
        SELECT tier, COUNT(*) as count FROM users GROUP BY tier
      `).all<{ tier: string; count: number }>();

      // Get new signups
      const signupsToday = await this.db.prepare(
        'SELECT COUNT(*) as count FROM users WHERE created_at >= ?'
      ).bind(oneDayAgo).first<{ count: number }>();

      const signups7Days = await this.db.prepare(
        'SELECT COUNT(*) as count FROM users WHERE created_at >= ?'
      ).bind(sevenDaysAgo).first<{ count: number }>();

      const signups30Days = await this.db.prepare(
        'SELECT COUNT(*) as count FROM users WHERE created_at >= ?'
      ).bind(thirtyDaysAgo).first<{ count: number }>();

      // Get active users (users with last_login_at in period)
      const dau = await this.db.prepare(
        'SELECT COUNT(*) as count FROM users WHERE last_login_at >= ?'
      ).bind(oneDayAgo).first<{ count: number }>();

      const wau = await this.db.prepare(
        'SELECT COUNT(*) as count FROM users WHERE last_login_at >= ?'
      ).bind(sevenDaysAgo).first<{ count: number }>();

      const mau = await this.db.prepare(
        'SELECT COUNT(*) as count FROM users WHERE last_login_at >= ?'
      ).bind(thirtyDaysAgo).first<{ count: number }>();

      // Get average session duration from daily stats
      const avgSession = await this.db.prepare(`
        SELECT AVG(avg_session_duration_seconds) as avg
        FROM analytics_users_daily
        WHERE date >= date('now', '-30 days')
      `).first<{ avg: number }>();

      // Build tier breakdown
      const tierBreakdown = { free: 0, premium: 0, pro: 0 };
      for (const row of (tierResult.results || [])) {
        const tier = row.tier || 'free';
        if (tier in tierBreakdown) {
          tierBreakdown[tier as keyof typeof tierBreakdown] = row.count;
        }
      }

      return {
        totalUsers: totalResult?.total || 0,
        activeUsers: {
          daily: dau?.count || 0,
          weekly: wau?.count || 0,
          monthly: mau?.count || 0,
        },
        newSignups: {
          today: signupsToday?.count || 0,
          last7Days: signups7Days?.count || 0,
          last30Days: signups30Days?.count || 0,
        },
        tierBreakdown,
        avgSessionDuration: avgSession?.avg || 0,
      };
    } catch (err) {
      logWithContext('error', 'user_analytics.overview_failed', {
        meta: { error: (err as Error).message },
      });
      throw err;
    }
  }

  /**
   * Get user growth data for charts
   */
  async getGrowthData(days: number = 30): Promise<UserGrowthData[]> {
    try {
      // Try to get from aggregated table first
      const aggregated = await this.db.prepare(`
        SELECT date, total_users, new_signups, active_users
        FROM analytics_users_daily
        WHERE date >= date('now', '-${days} days')
        ORDER BY date ASC
      `).all<{
        date: string;
        total_users: number;
        new_signups: number;
        active_users: number;
      }>();

      if (aggregated.results && aggregated.results.length > 0) {
        return aggregated.results.map(row => ({
          date: row.date,
          totalUsers: row.total_users,
          newSignups: row.new_signups,
          activeUsers: row.active_users,
        }));
      }

      // Fallback: Calculate from users table directly
      const result = await this.db.prepare(`
        WITH RECURSIVE dates AS (
          SELECT date('now', '-${days} days') as date
          UNION ALL
          SELECT date(date, '+1 day')
          FROM dates
          WHERE date < date('now')
        )
        SELECT 
          d.date,
          (SELECT COUNT(*) FROM users WHERE date(created_at, 'unixepoch') <= d.date) as total_users,
          (SELECT COUNT(*) FROM users WHERE date(created_at, 'unixepoch') = d.date) as new_signups,
          (SELECT COUNT(*) FROM users WHERE date(last_login_at, 'unixepoch') = d.date) as active_users
        FROM dates d
        ORDER BY d.date ASC
      `).all<{
        date: string;
        total_users: number;
        new_signups: number;
        active_users: number;
      }>();

      return (result.results || []).map(row => ({
        date: row.date,
        totalUsers: row.total_users || 0,
        newSignups: row.new_signups || 0,
        activeUsers: row.active_users || 0,
      }));
    } catch (err) {
      logWithContext('error', 'user_analytics.growth_data_failed', {
        meta: { error: (err as Error).message, days },
      });
      throw err;
    }
  }

  /**
   * Get retention cohort data
   */
  async getRetentionCohorts(weeks: number = 8): Promise<RetentionCohort[]> {
    try {
      // Try aggregated table first
      const result = await this.db.prepare(`
        SELECT cohort_week, week_number, users_in_cohort, users_retained, retention_rate
        FROM analytics_retention_cohorts
        ORDER BY cohort_week DESC, week_number ASC
        LIMIT ?
      `).bind(weeks * 5).all<{
        cohort_week: string;
        week_number: number;
        users_in_cohort: number;
        users_retained: number;
        retention_rate: number;
      }>();

      if (result.results && result.results.length > 0) {
        return result.results.map(row => ({
          cohortWeek: row.cohort_week,
          weekNumber: row.week_number,
          usersInCohort: row.users_in_cohort,
          usersRetained: row.users_retained,
          retentionRate: row.retention_rate || 0,
        }));
      }

      // Return empty if no data yet
      return [];
    } catch (err) {
      logWithContext('error', 'user_analytics.retention_failed', {
        meta: { error: (err as Error).message },
      });
      return [];
    }
  }

  /**
   * Get tier breakdown over time
   */
  async getTierHistory(days: number = 30): Promise<Array<{ date: string; free: number; premium: number; pro: number }>> {
    try {
      const result = await this.db.prepare(`
        SELECT date, tier, user_count
        FROM analytics_tier_daily
        WHERE date >= date('now', '-${days} days')
        ORDER BY date ASC
      `).all<{ date: string; tier: string; user_count: number }>();

      // Group by date
      const byDate: Record<string, { free: number; premium: number; pro: number }> = {};
      for (const row of (result.results || [])) {
        if (!byDate[row.date]) {
          byDate[row.date] = { free: 0, premium: 0, pro: 0 };
        }
        if (row.tier in byDate[row.date]) {
          byDate[row.date][row.tier as 'free' | 'premium' | 'pro'] = row.user_count;
        }
      }

      return Object.entries(byDate).map(([date, tiers]) => ({
        date,
        ...tiers,
      }));
    } catch (err) {
      logWithContext('error', 'user_analytics.tier_history_failed', {
        meta: { error: (err as Error).message },
      });
      return [];
    }
  }

  /**
   * Record a raw analytics event
   */
  async recordEvent(event: {
    eventType: string;
    userId?: string;
    sessionId?: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    const d1 = this.getClient();
    await d1.insert(analyticsEventsRaw).values({
      id: crypto.randomUUID(),
      eventType: event.eventType,
      userId: event.userId ?? null,
      sessionId: event.sessionId ?? null,
      payload: event.payload ?? null,
    });
  }
}

