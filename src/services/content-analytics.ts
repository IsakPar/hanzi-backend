/**
 * Content Analytics Service
 * Handles lesson, story, and vocabulary engagement tracking
 * 
 * 320 LOC
 */

import type { D1Database } from '@cloudflare/workers-types';
import { logWithContext } from '../utils/logger';

export interface ContentOverview {
  lessons: {
    total: number;
    published: number;
    totalCompletions: number;
    avgCompletionRate: number;
  };
  stories: {
    total: number;
    published: number;
    totalReads: number;
  };
  vocabulary: {
    total: number;
    wordsLearned: number;
    wordsMastered: number;
  };
}

export interface ContentEngagementData {
  date: string;
  lessons: number;
  stories: number;
  vocabulary: number;
}

export interface PopularContent {
  id: string;
  title: string;
  hskLevel: number;
  views: number;
  completions: number;
  completionRate: number;
}

export interface HskBreakdown {
  level: number;
  lessons: number;
  stories: number;
  vocabulary: number;
  completions: number;
  uniqueUsers: number;
}

export class ContentAnalyticsService {
  constructor(private readonly db: D1Database) {}

  /**
   * Get content analytics overview
   */
  async getOverview(): Promise<ContentOverview> {
    try {
      // Lesson stats
      const lessonTotal = await this.db.prepare(
        'SELECT COUNT(*) as count FROM lessons'
      ).first<{ count: number }>();

      const lessonPublished = await this.db.prepare(
        'SELECT COUNT(*) as count FROM lessons WHERE is_published = 1'
      ).first<{ count: number }>();

      const lessonCompletions = await this.db.prepare(
        'SELECT COUNT(*) as count FROM user_progress WHERE status = ?'
      ).bind('completed').first<{ count: number }>();

      const lessonStarts = await this.db.prepare(
        'SELECT COUNT(DISTINCT lesson_id) as count FROM user_progress'
      ).first<{ count: number }>();

      // Story stats
      const storyTotal = await this.db.prepare(
        'SELECT COUNT(*) as count FROM stories'
      ).first<{ count: number }>();

      const storyPublished = await this.db.prepare(
        'SELECT COUNT(*) as count FROM stories WHERE is_published = 1'
      ).first<{ count: number }>();

      // Vocabulary stats
      const vocabTotal = await this.db.prepare(
        'SELECT COUNT(*) as count FROM vocabulary'
      ).first<{ count: number }>();

      const vocabLearned = await this.db.prepare(
        'SELECT COUNT(DISTINCT atom_id) as count FROM user_knowledge_snapshot WHERE bucket != ?'
      ).bind('new').first<{ count: number }>();

      const vocabMastered = await this.db.prepare(
        'SELECT COUNT(DISTINCT atom_id) as count FROM user_knowledge_snapshot WHERE bucket = ?'
      ).bind('mastered').first<{ count: number }>();

      const completionRate = (lessonStarts?.count || 0) > 0
        ? ((lessonCompletions?.count || 0) / (lessonStarts?.count || 1)) * 100
        : 0;

      return {
        lessons: {
          total: lessonTotal?.count || 0,
          published: lessonPublished?.count || 0,
          totalCompletions: lessonCompletions?.count || 0,
          avgCompletionRate: Math.round(completionRate * 10) / 10,
        },
        stories: {
          total: storyTotal?.count || 0,
          published: storyPublished?.count || 0,
          totalReads: 0, // Will come from analytics table when tracking is active
        },
        vocabulary: {
          total: vocabTotal?.count || 0,
          wordsLearned: vocabLearned?.count || 0,
          wordsMastered: vocabMastered?.count || 0,
        },
      };
    } catch (err) {
      logWithContext('error', 'content_analytics.overview_failed', {
        meta: { error: (err as Error).message },
      });
      throw err;
    }
  }

  /**
   * Get daily engagement data for charts
   */
  async getEngagementData(days: number = 30): Promise<ContentEngagementData[]> {
    try {
      // Try aggregated table first
      const result = await this.db.prepare(`
        SELECT 
          date,
          SUM(CASE WHEN content_type = 'lesson' THEN total_views ELSE 0 END) as lessons,
          SUM(CASE WHEN content_type = 'story' THEN total_views ELSE 0 END) as stories,
          SUM(CASE WHEN content_type = 'vocabulary' THEN total_views ELSE 0 END) as vocabulary
        FROM analytics_content_daily
        WHERE date >= date('now', '-${days} days')
        GROUP BY date
        ORDER BY date ASC
      `).all<{
        date: string;
        lessons: number;
        stories: number;
        vocabulary: number;
      }>();

      if (result.results && result.results.length > 0) {
        return result.results;
      }

      // Fallback: Calculate from user_progress
      const fallback = await this.db.prepare(`
        WITH RECURSIVE dates AS (
          SELECT date('now', '-${days} days') as date
          UNION ALL
          SELECT date(date, '+1 day')
          FROM dates
          WHERE date < date('now')
        )
        SELECT 
          d.date,
          (SELECT COUNT(*) FROM user_progress WHERE date(updated_at, 'unixepoch') = d.date) as lessons,
          0 as stories,
          (SELECT COUNT(*) FROM user_knowledge_snapshot WHERE date(updated_at, 'unixepoch') = d.date) as vocabulary
        FROM dates d
        ORDER BY d.date ASC
      `).all<{
        date: string;
        lessons: number;
        stories: number;
        vocabulary: number;
      }>();

      return (fallback.results || []).map(row => ({
        date: row.date,
        lessons: row.lessons || 0,
        stories: row.stories || 0,
        vocabulary: row.vocabulary || 0,
      }));
    } catch (err) {
      logWithContext('error', 'content_analytics.engagement_failed', {
        meta: { error: (err as Error).message },
      });
      return [];
    }
  }

  /**
   * Get most popular lessons
   */
  async getPopularLessons(limit: number = 10): Promise<PopularContent[]> {
    try {
      const result = await this.db.prepare(`
        SELECT 
          l.id,
          l.title,
          l.hsk_level as hskLevel,
          COUNT(DISTINCT up.user_id) as views,
          SUM(CASE WHEN up.status = 'completed' THEN 1 ELSE 0 END) as completions
        FROM lessons l
        LEFT JOIN user_progress up ON up.lesson_id = l.id
        WHERE l.is_published = 1
        GROUP BY l.id
        ORDER BY views DESC
        LIMIT ?
      `).bind(limit).all<{
        id: string;
        title: string;
        hskLevel: number;
        views: number;
        completions: number;
      }>();

      return (result.results || []).map(row => ({
        id: row.id,
        title: row.title || 'Untitled',
        hskLevel: row.hskLevel || 1,
        views: row.views || 0,
        completions: row.completions || 0,
        completionRate: row.views > 0 
          ? Math.round((row.completions / row.views) * 100 * 10) / 10 
          : 0,
      }));
    } catch (err) {
      logWithContext('error', 'content_analytics.popular_lessons_failed', {
        meta: { error: (err as Error).message },
      });
      return [];
    }
  }

  /**
   * Get most popular stories
   */
  async getPopularStories(limit: number = 10): Promise<PopularContent[]> {
    try {
      // For now, return published stories ordered by HSK level
      // In the future, this will use analytics_story_daily
      const result = await this.db.prepare(`
        SELECT 
          s.id,
          s.title,
          s.hsk_level as hskLevel,
          0 as views,
          0 as completions
        FROM stories s
        WHERE s.is_published = 1
        ORDER BY s.hsk_level ASC
        LIMIT ?
      `).bind(limit).all<{
        id: string;
        title: string;
        hskLevel: number;
        views: number;
        completions: number;
      }>();

      return (result.results || []).map(row => ({
        id: row.id,
        title: row.title || 'Untitled',
        hskLevel: row.hskLevel || 1,
        views: row.views || 0,
        completions: row.completions || 0,
        completionRate: 0,
      }));
    } catch (err) {
      logWithContext('error', 'content_analytics.popular_stories_failed', {
        meta: { error: (err as Error).message },
      });
      return [];
    }
  }

  /**
   * Get HSK level breakdown
   */
  async getHskBreakdown(): Promise<HskBreakdown[]> {
    try {
      const result = await this.db.prepare(`
        SELECT 
          hsk_level as level,
          (SELECT COUNT(*) FROM lessons WHERE hsk_level = l.hsk_level AND is_published = 1) as lessons,
          (SELECT COUNT(*) FROM stories WHERE hsk_level = l.hsk_level AND is_published = 1) as stories,
          (SELECT COUNT(*) FROM vocabulary WHERE hsk_level = l.hsk_level) as vocabulary,
          (SELECT COUNT(*) FROM user_progress up 
           JOIN lessons le ON le.id = up.lesson_id 
           WHERE le.hsk_level = l.hsk_level AND up.status = 'completed') as completions,
          (SELECT COUNT(DISTINCT up.user_id) FROM user_progress up 
           JOIN lessons le ON le.id = up.lesson_id 
           WHERE le.hsk_level = l.hsk_level) as uniqueUsers
        FROM (SELECT DISTINCT hsk_level FROM lessons WHERE hsk_level BETWEEN 1 AND 6) l
        ORDER BY level ASC
      `).all<{
        level: number;
        lessons: number;
        stories: number;
        vocabulary: number;
        completions: number;
        uniqueUsers: number;
      }>();

      // Ensure we have all 6 HSK levels
      const levels = [1, 2, 3, 4, 5, 6];
      const resultMap = new Map(
        (result.results || []).map(r => [r.level, r])
      );

      return levels.map(level => {
        const data = resultMap.get(level);
        return {
          level,
          lessons: data?.lessons || 0,
          stories: data?.stories || 0,
          vocabulary: data?.vocabulary || 0,
          completions: data?.completions || 0,
          uniqueUsers: data?.uniqueUsers || 0,
        };
      });
    } catch (err) {
      logWithContext('error', 'content_analytics.hsk_breakdown_failed', {
        meta: { error: (err as Error).message },
      });
      return [];
    }
  }

  /**
   * Get vocabulary learning progress
   */
  async getVocabProgress(): Promise<{
    new: number;
    weak: number;
    learning: number;
    mastered: number;
    total: number;
  }> {
    try {
      const result = await this.db.prepare(`
        SELECT 
          bucket,
          COUNT(DISTINCT atom_id) as count
        FROM user_knowledge_snapshot
        GROUP BY bucket
      `).all<{ bucket: string; count: number }>();

      const buckets: Record<string, number> = {
        new: 0,
        weak: 0,
        learning: 0,
        mastered: 0,
      };

      for (const row of (result.results || [])) {
        if (row.bucket in buckets) {
          buckets[row.bucket] = row.count;
        }
      }

      const total = Object.values(buckets).reduce((a, b) => a + b, 0);

      return {
        new: buckets.new,
        weak: buckets.weak,
        learning: buckets.learning,
        mastered: buckets.mastered,
        total,
      };
    } catch (err) {
      logWithContext('error', 'content_analytics.vocab_progress_failed', {
        meta: { error: (err as Error).message },
      });
      return { new: 0, weak: 0, learning: 0, mastered: 0, total: 0 };
    }
  }
}

