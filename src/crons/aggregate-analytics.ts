/**
 * Analytics Aggregation Cron Job
 * Runs daily to aggregate raw events into daily/weekly stats
 * Also handles data cleanup for 90-day retention on raw events
 * 
 * 230 LOC
 */

import type { D1Database } from '@cloudflare/workers-types';
import { logWithContext } from '../utils/logger';

interface AggregationResult {
  date: string;
  totalUsers: number;
  newSignups: number;
  activeUsers: number;
  returningUsers: number;
  tierBreakdown: { free: number; premium: number; pro: number };
}

/**
 * Main aggregation function - call this from scheduled handler
 */
export async function aggregateAnalytics(db: D1Database): Promise<void> {
  const startTime = Date.now();
  logWithContext('info', 'analytics_aggregation.started', {});

  try {
    // Get yesterday's date
    const yesterday = getYesterdayDate();

    // 1. Aggregate daily user stats
    await aggregateDailyUserStats(db, yesterday);

    // 2. Aggregate tier breakdown
    await aggregateTierStats(db, yesterday);

    // 3. Calculate retention cohorts (run weekly on Sunday)
    if (isSunday()) {
      await calculateRetentionCohorts(db);
    }

    // 4. Cleanup old raw events (90 days)
    await cleanupOldRawEvents(db);

    // 5. Cleanup old aggregated data (24 months)
    await cleanupOldAggregatedData(db);

    const duration = Date.now() - startTime;
    logWithContext('info', 'analytics_aggregation.completed', {
      meta: { durationMs: duration, date: yesterday },
    });
  } catch (err) {
    logWithContext('error', 'analytics_aggregation.failed', {
      meta: { error: (err as Error).message },
    });
    throw err;
  }
}

/**
 * Aggregate daily user statistics
 */
async function aggregateDailyUserStats(db: D1Database, date: string): Promise<void> {
  try {
    // Get stats for the specified date
    const dateStart = Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 1000);
    const dateEnd = dateStart + 86400;

    // Total users up to this date
    const totalUsers = await db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE created_at < ?
    `).bind(dateEnd).first<{ count: number }>();

    // New signups on this date
    const newSignups = await db.prepare(`
      SELECT COUNT(*) as count FROM users 
      WHERE created_at >= ? AND created_at < ?
    `).bind(dateStart, dateEnd).first<{ count: number }>();

    // Active users on this date (logged in)
    const activeUsers = await db.prepare(`
      SELECT COUNT(*) as count FROM users 
      WHERE last_login_at >= ? AND last_login_at < ?
    `).bind(dateStart, dateEnd).first<{ count: number }>();

    // Returning users (created before this date, logged in on this date)
    const returningUsers = await db.prepare(`
      SELECT COUNT(*) as count FROM users 
      WHERE created_at < ? AND last_login_at >= ? AND last_login_at < ?
    `).bind(dateStart, dateStart, dateEnd).first<{ count: number }>();

    // Calculate average session duration from raw events (if available)
    const avgSession = await db.prepare(`
      SELECT AVG(
        CASE 
          WHEN payload IS NOT NULL 
          THEN json_extract(payload, '$.duration_seconds')
          ELSE 0 
        END
      ) as avg
      FROM analytics_events_raw
      WHERE event_type = 'session_end'
        AND created_at >= ? AND created_at < ?
    `).bind(dateStart, dateEnd).first<{ avg: number }>();

    // Count total sessions
    const totalSessions = await db.prepare(`
      SELECT COUNT(*) as count FROM analytics_events_raw
      WHERE event_type = 'session_start'
        AND created_at >= ? AND created_at < ?
    `).bind(dateStart, dateEnd).first<{ count: number }>();

    // Upsert into analytics_users_daily
    await db.prepare(`
      INSERT INTO analytics_users_daily 
        (date, total_users, new_signups, active_users, returning_users, avg_session_duration_seconds, total_sessions)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        total_users = excluded.total_users,
        new_signups = excluded.new_signups,
        active_users = excluded.active_users,
        returning_users = excluded.returning_users,
        avg_session_duration_seconds = excluded.avg_session_duration_seconds,
        total_sessions = excluded.total_sessions
    `).bind(
      date,
      totalUsers?.count || 0,
      newSignups?.count || 0,
      activeUsers?.count || 0,
      returningUsers?.count || 0,
      Math.round(avgSession?.avg || 0),
      totalSessions?.count || 0
    ).run();

    logWithContext('info', 'analytics_aggregation.daily_users_done', {
      meta: { date, totalUsers: totalUsers?.count, newSignups: newSignups?.count },
    });
  } catch (err) {
    logWithContext('error', 'analytics_aggregation.daily_users_failed', {
      meta: { date, error: (err as Error).message },
    });
  }
}

/**
 * Aggregate tier statistics for the day
 */
async function aggregateTierStats(db: D1Database, date: string): Promise<void> {
  try {
    const tiers = ['free', 'premium', 'pro'];
    
    for (const tier of tiers) {
      const count = await db.prepare(`
        SELECT COUNT(*) as count FROM users WHERE tier = ?
      `).bind(tier).first<{ count: number }>();

      await db.prepare(`
        INSERT INTO analytics_tier_daily (date, tier, user_count)
        VALUES (?, ?, ?)
        ON CONFLICT(date, tier) DO UPDATE SET user_count = excluded.user_count
      `).bind(date, tier, count?.count || 0).run();
    }
  } catch (err) {
    logWithContext('error', 'analytics_aggregation.tier_stats_failed', {
      meta: { date, error: (err as Error).message },
    });
  }
}

/**
 * Calculate weekly retention cohorts
 */
async function calculateRetentionCohorts(db: D1Database): Promise<void> {
  try {
    // Get the last 8 weeks of cohorts
    const now = new Date();
    
    for (let weeksAgo = 1; weeksAgo <= 8; weeksAgo++) {
      const cohortStart = new Date(now);
      cohortStart.setDate(cohortStart.getDate() - (weeksAgo * 7 + now.getDay()));
      cohortStart.setHours(0, 0, 0, 0);
      
      const cohortEnd = new Date(cohortStart);
      cohortEnd.setDate(cohortEnd.getDate() + 7);
      
      const cohortWeek = getISOWeek(cohortStart);
      const cohortStartTs = Math.floor(cohortStart.getTime() / 1000);
      const cohortEndTs = Math.floor(cohortEnd.getTime() / 1000);

      // Users in this cohort (signed up during this week)
      const usersInCohort = await db.prepare(`
        SELECT COUNT(*) as count FROM users
        WHERE created_at >= ? AND created_at < ?
      `).bind(cohortStartTs, cohortEndTs).first<{ count: number }>();

      if ((usersInCohort?.count || 0) === 0) continue;

      // Calculate retention for each subsequent week
      for (let weekNum = 0; weekNum <= Math.min(weeksAgo - 1, 4); weekNum++) {
        const checkStart = new Date(cohortStart);
        checkStart.setDate(checkStart.getDate() + (weekNum * 7));
        const checkEnd = new Date(checkStart);
        checkEnd.setDate(checkEnd.getDate() + 7);
        
        const checkStartTs = Math.floor(checkStart.getTime() / 1000);
        const checkEndTs = Math.floor(checkEnd.getTime() / 1000);

        // Users from cohort who were active in this week
        const retained = await db.prepare(`
          SELECT COUNT(DISTINCT u.id) as count
          FROM users u
          WHERE u.created_at >= ? AND u.created_at < ?
            AND u.last_login_at >= ? AND u.last_login_at < ?
        `).bind(cohortStartTs, cohortEndTs, checkStartTs, checkEndTs).first<{ count: number }>();

        const retentionRate = ((retained?.count || 0) / (usersInCohort?.count || 1)) * 100;

        await db.prepare(`
          INSERT INTO analytics_retention_cohorts 
            (cohort_week, week_number, users_in_cohort, users_retained, retention_rate)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(cohort_week, week_number) DO UPDATE SET
            users_in_cohort = excluded.users_in_cohort,
            users_retained = excluded.users_retained,
            retention_rate = excluded.retention_rate
        `).bind(
          cohortWeek,
          weekNum,
          usersInCohort?.count || 0,
          retained?.count || 0,
          Math.round(retentionRate * 10) / 10
        ).run();
      }
    }

    logWithContext('info', 'analytics_aggregation.retention_cohorts_done', {});
  } catch (err) {
    logWithContext('error', 'analytics_aggregation.retention_cohorts_failed', {
      meta: { error: (err as Error).message },
    });
  }
}

/**
 * Cleanup raw events older than 90 days
 */
async function cleanupOldRawEvents(db: D1Database): Promise<void> {
  const cutoff = Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60);
  
  const result = await db.prepare(`
    DELETE FROM analytics_events_raw WHERE created_at < ?
  `).bind(cutoff).run();

  logWithContext('info', 'analytics_aggregation.cleanup_raw_events', {
    meta: { deleted: result.meta?.changes || 0 },
  });
}

/**
 * Cleanup aggregated data older than 24 months
 */
async function cleanupOldAggregatedData(db: D1Database): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 24);
  const cutoff = cutoffDate.toISOString().split('T')[0];

  await db.prepare(`
    DELETE FROM analytics_users_daily WHERE date < ?
  `).bind(cutoff).run();

  await db.prepare(`
    DELETE FROM analytics_tier_daily WHERE date < ?
  `).bind(cutoff).run();

  logWithContext('info', 'analytics_aggregation.cleanup_aggregated', {
    meta: { cutoffDate: cutoff },
  });
}

// --- Helpers ---

function getYesterdayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function isSunday(): boolean {
  return new Date().getDay() === 0;
}

function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

