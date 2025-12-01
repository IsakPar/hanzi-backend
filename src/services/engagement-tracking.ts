/**
 * Engagement Tracking Service
 * Phase 3b: Anonymous content engagement analytics
 * 
 * Handles:
 * - Batch event ingestion from mobile apps
 * - Per-content stats aggregation
 * - Stats retrieval for portal
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and, gte, lte, sql, desc, isNull, or } from 'drizzle-orm';
import { 
  engagementEventsRaw, 
  analyticsLessonStats, 
  analyticsStoryStats,
  analyticsVocabStats,
  analyticsEngagementDaily,
  lessons,
  stories
} from '../schema';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export type EventType = 
  | 'lesson.started'
  | 'lesson.progress'
  | 'lesson.completed'
  | 'lesson.abandoned'
  | 'story.started'
  | 'story.progress'
  | 'story.completed'
  | 'story.abandoned'
  | 'vocab.reviewed'
  | 'practice.completed';

export interface BlockTiming {
  index: number;
  type: string;
  seconds: number;
}

export interface EngagementEventPayload {
  // Lesson-specific
  lessonId?: string;
  score?: number;
  blocksCompleted?: number;
  totalBlocks?: number;
  blockTimings?: BlockTiming[];
  
  // Story-specific
  storyId?: string;
  sentencesRead?: number;
  totalSentences?: number;
  sentenceIndex?: number;
  
  // Vocab-specific
  vocabId?: string;
  correct?: boolean;
  responseTimeMs?: number;
  
  // Practice-specific
  practiceType?: 'lesson' | 'story' | 'vocab';
  itemsCompleted?: number;
  totalItems?: number;
  
  // General
  hskLevel?: number;
}

export interface EngagementEvent {
  id: string;
  type: EventType;
  timestamp: string; // ISO 8601
  payload: EngagementEventPayload;
}

export interface BatchIngestRequest {
  events: EngagementEvent[];
  appVersion?: string;
  platform?: 'ios' | 'android';
}

export interface BatchIngestResponse {
  accepted: number;
  rejected: number;
  errors?: string[];
}

export interface LessonStats {
  lessonId: string;
  title?: string;
  hskLevel?: number;
  totalStarts: number;
  totalCompletions: number;
  completionRate: number;
  avgTimeSeconds: number;
  minTimeSeconds: number;
  maxTimeSeconds: number;
  medianTimeSeconds: number;
  p90TimeSeconds: number;
  avgScore: number;
  blockStats?: BlockStat[];
  lastEventAt?: string;
}

export interface BlockStat {
  index: number;
  type: string;
  avgTime: number;
  completions: number;
  dropOffs: number;
}

export interface StoryStats {
  storyId: string;
  title?: string;
  hskLevel?: number;
  totalStarts: number;
  totalCompletions: number;
  completionRate: number;
  avgTimeSeconds: number;
  avgSentencesRead: number;
  sentenceStats?: SentenceStat[];
  lastEventAt?: string;
}

export interface SentenceStat {
  index: number;
  avgTime: number;
  reads: number;
  dropOffs: number;
}

export interface VocabStats {
  vocabId: string;
  totalReviews: number;
  correctCount: number;
  incorrectCount: number;
  accuracyRate: number;
  avgResponseTimeMs: number;
}

export interface EngagementOverview {
  lessons: {
    totalStarts: number;
    totalCompletions: number;
    avgCompletionRate: number;
    avgTimeSeconds: number;
  };
  stories: {
    totalStarts: number;
    totalCompletions: number;
    avgCompletionRate: number;
  };
  vocab: {
    totalReviews: number;
    avgAccuracyRate: number;
  };
  trends: Array<{
    date: string;
    lessonCompletions: number;
    storyCompletions: number;
    vocabReviews: number;
  }>;
}

// ═══════════════════════════════════════════════════════════
// BATCH INGESTION
// ═══════════════════════════════════════════════════════════

export async function ingestEventsBatch(
  db: ReturnType<typeof drizzle>,
  request: BatchIngestRequest
): Promise<BatchIngestResponse> {
  const { events } = request;
  const errors: string[] = [];
  let accepted = 0;
  let rejected = 0;

  // Validate and transform events
  const validEvents: Array<{
    id: string;
    eventType: string;
    contentId: string;
    contentType: string;
    hskLevel: number | null;
    timestamp: string;
    timeSeconds: number | null;
    payload: EngagementEventPayload;
    processed: boolean;
  }> = [];

  for (const event of events) {
    try {
      const parsed = parseEvent(event);
      if (parsed) {
        validEvents.push(parsed);
        accepted++;
      } else {
        rejected++;
        errors.push(`Invalid event: ${event.id}`);
      }
    } catch (err) {
      rejected++;
      errors.push(`Error parsing event ${event.id}: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }

  // Batch insert valid events
  if (validEvents.length > 0) {
    // Insert in batches of 50 to avoid query size limits
    const batchSize = 50;
    for (let i = 0; i < validEvents.length; i += batchSize) {
      const batch = validEvents.slice(i, i + batchSize);
      await db.insert(engagementEventsRaw)
        .values(batch.map(e => ({
          id: e.id,
          eventType: e.eventType,
          contentId: e.contentId,
          contentType: e.contentType,
          hskLevel: e.hskLevel,
          timestamp: e.timestamp,
          timeSeconds: e.timeSeconds,
          payload: e.payload,
          processed: e.processed,
        })))
        .onConflictDoNothing();
    }
  }

  return {
    accepted,
    rejected,
    errors: errors.length > 0 ? errors : undefined,
  };
}

function parseEvent(event: EngagementEvent): {
  id: string;
  eventType: string;
  contentId: string;
  contentType: string;
  hskLevel: number | null;
  timestamp: string;
  timeSeconds: number | null;
  payload: EngagementEventPayload;
  processed: boolean;
} | null {
  // Extract content info based on event type
  let contentId: string;
  let contentType: 'lesson' | 'story' | 'vocab';
  let timeSeconds: number | null = null;

  if (event.type.startsWith('lesson.')) {
    if (!event.payload.lessonId) return null;
    contentId = event.payload.lessonId;
    contentType = 'lesson';
    
    // Calculate time if we have block timings
    if (event.payload.blockTimings) {
      timeSeconds = event.payload.blockTimings.reduce((sum, b) => sum + b.seconds, 0);
    }
  } else if (event.type.startsWith('story.')) {
    if (!event.payload.storyId) return null;
    contentId = event.payload.storyId;
    contentType = 'story';
  } else if (event.type.startsWith('vocab.')) {
    if (!event.payload.vocabId) return null;
    contentId = event.payload.vocabId;
    contentType = 'vocab';
  } else if (event.type === 'practice.completed') {
    // Practice events reference their content type
    contentType = event.payload.practiceType || 'lesson';
    contentId = event.payload.lessonId || event.payload.storyId || 'practice';
  } else {
    return null;
  }

  return {
    id: event.id,
    eventType: event.type,
    contentId,
    contentType,
    hskLevel: event.payload.hskLevel || null,
    timestamp: event.timestamp,
    timeSeconds,
    payload: event.payload,
    processed: false,
  };
}

// ═══════════════════════════════════════════════════════════
// STATS RETRIEVAL
// ═══════════════════════════════════════════════════════════

export async function getLessonStats(
  db: ReturnType<typeof drizzle>,
  lessonId: string
): Promise<LessonStats | null> {
  // Get stats from aggregated table
  const [stats] = await db
    .select()
    .from(analyticsLessonStats)
    .where(eq(analyticsLessonStats.lessonId, lessonId))
    .limit(1);

  if (!stats) {
    return null;
  }

  // Get lesson metadata
  const [lesson] = await db
    .select({ title: lessons.title, hskLevel: lessons.hskLevel })
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);

  return {
    lessonId,
    title: lesson?.title,
    hskLevel: lesson?.hskLevel,
    totalStarts: stats.totalStarts || 0,
    totalCompletions: stats.totalCompletions || 0,
    completionRate: stats.completionRate || 0,
    avgTimeSeconds: stats.avgTimeSeconds || 0,
    minTimeSeconds: stats.minTimeSeconds || 0,
    maxTimeSeconds: stats.maxTimeSeconds || 0,
    medianTimeSeconds: stats.medianTimeSeconds || 0,
    p90TimeSeconds: stats.p90TimeSeconds || 0,
    avgScore: stats.avgScore || 0,
    blockStats: stats.blockStats as BlockStat[] | undefined,
    lastEventAt: stats.lastEventAt || undefined,
  };
}

export async function getStoryStats(
  db: ReturnType<typeof drizzle>,
  storyId: string
): Promise<StoryStats | null> {
  const [stats] = await db
    .select()
    .from(analyticsStoryStats)
    .where(eq(analyticsStoryStats.storyId, storyId))
    .limit(1);

  if (!stats) {
    return null;
  }

  // Get story metadata
  const [story] = await db
    .select({ title: stories.title, hskLevel: stories.hskLevel })
    .from(stories)
    .where(eq(stories.id, storyId))
    .limit(1);

  return {
    storyId,
    title: story?.title,
    hskLevel: story?.hskLevel,
    totalStarts: stats.totalStarts || 0,
    totalCompletions: stats.totalCompletions || 0,
    completionRate: stats.completionRate || 0,
    avgTimeSeconds: stats.avgTimeSeconds || 0,
    avgSentencesRead: stats.avgSentencesRead || 0,
    sentenceStats: stats.sentenceStats as SentenceStat[] | undefined,
    lastEventAt: stats.lastEventAt || undefined,
  };
}

export async function getVocabStats(
  db: ReturnType<typeof drizzle>,
  vocabId: string
): Promise<VocabStats | null> {
  const [stats] = await db
    .select()
    .from(analyticsVocabStats)
    .where(eq(analyticsVocabStats.vocabId, vocabId))
    .limit(1);

  if (!stats) {
    return null;
  }

  return {
    vocabId,
    totalReviews: stats.totalReviews || 0,
    correctCount: stats.correctCount || 0,
    incorrectCount: stats.incorrectCount || 0,
    accuracyRate: stats.accuracyRate || 0,
    avgResponseTimeMs: stats.avgResponseTimeMs || 0,
  };
}

export async function getAllLessonStats(
  db: ReturnType<typeof drizzle>,
  options?: { hskLevel?: number; limit?: number; orderBy?: 'completions' | 'time' | 'rate' }
): Promise<LessonStats[]> {
  const { hskLevel, limit = 50, orderBy = 'completions' } = options || {};

  // Build query based on order
  let orderByClause;
  switch (orderBy) {
    case 'time':
      orderByClause = desc(analyticsLessonStats.avgTimeSeconds);
      break;
    case 'rate':
      orderByClause = desc(analyticsLessonStats.completionRate);
      break;
    default:
      orderByClause = desc(analyticsLessonStats.totalCompletions);
  }

  const query = db
    .select({
      lessonId: analyticsLessonStats.lessonId,
      totalStarts: analyticsLessonStats.totalStarts,
      totalCompletions: analyticsLessonStats.totalCompletions,
      completionRate: analyticsLessonStats.completionRate,
      avgTimeSeconds: analyticsLessonStats.avgTimeSeconds,
      minTimeSeconds: analyticsLessonStats.minTimeSeconds,
      maxTimeSeconds: analyticsLessonStats.maxTimeSeconds,
      medianTimeSeconds: analyticsLessonStats.medianTimeSeconds,
      p90TimeSeconds: analyticsLessonStats.p90TimeSeconds,
      avgScore: analyticsLessonStats.avgScore,
      blockStats: analyticsLessonStats.blockStats,
      lastEventAt: analyticsLessonStats.lastEventAt,
      title: lessons.title,
      hskLevel: lessons.hskLevel,
    })
    .from(analyticsLessonStats)
    .leftJoin(lessons, eq(analyticsLessonStats.lessonId, lessons.id))
    .orderBy(orderByClause)
    .limit(limit);

  const results = await (hskLevel 
    ? query.where(eq(lessons.hskLevel, hskLevel)) 
    : query
  );

  return results.map(r => ({
    lessonId: r.lessonId,
    title: r.title || undefined,
    hskLevel: r.hskLevel || undefined,
    totalStarts: r.totalStarts || 0,
    totalCompletions: r.totalCompletions || 0,
    completionRate: r.completionRate || 0,
    avgTimeSeconds: r.avgTimeSeconds || 0,
    minTimeSeconds: r.minTimeSeconds || 0,
    maxTimeSeconds: r.maxTimeSeconds || 0,
    medianTimeSeconds: r.medianTimeSeconds || 0,
    p90TimeSeconds: r.p90TimeSeconds || 0,
    avgScore: r.avgScore || 0,
    blockStats: r.blockStats as BlockStat[] | undefined,
    lastEventAt: r.lastEventAt || undefined,
  }));
}

export async function getAllStoryStats(
  db: ReturnType<typeof drizzle>,
  options?: { hskLevel?: number; limit?: number; orderBy?: 'completions' | 'time' | 'rate' }
): Promise<StoryStats[]> {
  const { hskLevel, limit = 50, orderBy = 'completions' } = options || {};

  let orderByClause;
  switch (orderBy) {
    case 'time':
      orderByClause = desc(analyticsStoryStats.avgTimeSeconds);
      break;
    case 'rate':
      orderByClause = desc(analyticsStoryStats.completionRate);
      break;
    default:
      orderByClause = desc(analyticsStoryStats.totalCompletions);
  }

  const query = db
    .select({
      storyId: analyticsStoryStats.storyId,
      totalStarts: analyticsStoryStats.totalStarts,
      totalCompletions: analyticsStoryStats.totalCompletions,
      completionRate: analyticsStoryStats.completionRate,
      avgTimeSeconds: analyticsStoryStats.avgTimeSeconds,
      avgSentencesRead: analyticsStoryStats.avgSentencesRead,
      sentenceStats: analyticsStoryStats.sentenceStats,
      lastEventAt: analyticsStoryStats.lastEventAt,
      title: stories.title,
      hskLevel: stories.hskLevel,
    })
    .from(analyticsStoryStats)
    .leftJoin(stories, eq(analyticsStoryStats.storyId, stories.id))
    .orderBy(orderByClause)
    .limit(limit);

  const results = await (hskLevel 
    ? query.where(eq(stories.hskLevel, hskLevel)) 
    : query
  );

  return results.map(r => ({
    storyId: r.storyId,
    title: r.title || undefined,
    hskLevel: r.hskLevel || undefined,
    totalStarts: r.totalStarts || 0,
    totalCompletions: r.totalCompletions || 0,
    completionRate: r.completionRate || 0,
    avgTimeSeconds: r.avgTimeSeconds || 0,
    avgSentencesRead: r.avgSentencesRead || 0,
    sentenceStats: r.sentenceStats as SentenceStat[] | undefined,
    lastEventAt: r.lastEventAt || undefined,
  }));
}

export async function getEngagementOverview(
  db: ReturnType<typeof drizzle>,
  startDate: string,
  endDate: string
): Promise<EngagementOverview> {
  // Get lesson aggregates
  const lessonResults = await db
    .select({
      totalStarts: sql<number>`coalesce(sum(${analyticsLessonStats.totalStarts}), 0)`,
      totalCompletions: sql<number>`coalesce(sum(${analyticsLessonStats.totalCompletions}), 0)`,
      avgCompletionRate: sql<number>`coalesce(avg(${analyticsLessonStats.completionRate}), 0)`,
      avgTimeSeconds: sql<number>`coalesce(avg(${analyticsLessonStats.avgTimeSeconds}), 0)`,
    })
    .from(analyticsLessonStats);

  // Get story aggregates
  const storyResults = await db
    .select({
      totalStarts: sql<number>`coalesce(sum(${analyticsStoryStats.totalStarts}), 0)`,
      totalCompletions: sql<number>`coalesce(sum(${analyticsStoryStats.totalCompletions}), 0)`,
      avgCompletionRate: sql<number>`coalesce(avg(${analyticsStoryStats.completionRate}), 0)`,
    })
    .from(analyticsStoryStats);

  // Get vocab aggregates
  const vocabResults = await db
    .select({
      totalReviews: sql<number>`coalesce(sum(${analyticsVocabStats.totalReviews}), 0)`,
      avgAccuracyRate: sql<number>`coalesce(avg(${analyticsVocabStats.accuracyRate}), 0)`,
    })
    .from(analyticsVocabStats);

  // Get daily trends
  const trendsResults = await db
    .select({
      date: analyticsEngagementDaily.date,
      contentType: analyticsEngagementDaily.contentType,
      totalCompletions: analyticsEngagementDaily.totalCompletions,
    })
    .from(analyticsEngagementDaily)
    .where(and(
      gte(analyticsEngagementDaily.date, startDate),
      lte(analyticsEngagementDaily.date, endDate)
    ))
    .orderBy(analyticsEngagementDaily.date);

  // Group trends by date
  const trendsByDate = new Map<string, { lessonCompletions: number; storyCompletions: number; vocabReviews: number }>();
  for (const row of trendsResults) {
    if (!trendsByDate.has(row.date)) {
      trendsByDate.set(row.date, { lessonCompletions: 0, storyCompletions: 0, vocabReviews: 0 });
    }
    const entry = trendsByDate.get(row.date)!;
    if (row.contentType === 'lesson') {
      entry.lessonCompletions = row.totalCompletions || 0;
    } else if (row.contentType === 'story') {
      entry.storyCompletions = row.totalCompletions || 0;
    } else if (row.contentType === 'vocab') {
      entry.vocabReviews = row.totalCompletions || 0;
    }
  }

  const trends = Array.from(trendsByDate.entries()).map(([date, data]) => ({
    date,
    ...data,
  }));

  return {
    lessons: lessonResults[0] || { totalStarts: 0, totalCompletions: 0, avgCompletionRate: 0, avgTimeSeconds: 0 },
    stories: storyResults[0] || { totalStarts: 0, totalCompletions: 0, avgCompletionRate: 0 },
    vocab: vocabResults[0] || { totalReviews: 0, avgAccuracyRate: 0 },
    trends,
  };
}

// ═══════════════════════════════════════════════════════════
// AGGREGATION (called by cron)
// ═══════════════════════════════════════════════════════════

export async function aggregateEngagementEvents(
  db: ReturnType<typeof drizzle>
): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  // Get unprocessed events
  const unprocessedEvents = await db
    .select()
    .from(engagementEventsRaw)
    .where(eq(engagementEventsRaw.processed, false))
    .limit(1000); // Process in batches

  // Group events by content
  const lessonEvents = new Map<string, typeof unprocessedEvents>();
  const storyEvents = new Map<string, typeof unprocessedEvents>();
  const vocabEvents = new Map<string, typeof unprocessedEvents>();

  for (const event of unprocessedEvents) {
    if (event.contentType === 'lesson') {
      if (!lessonEvents.has(event.contentId)) {
        lessonEvents.set(event.contentId, []);
      }
      lessonEvents.get(event.contentId)!.push(event);
    } else if (event.contentType === 'story') {
      if (!storyEvents.has(event.contentId)) {
        storyEvents.set(event.contentId, []);
      }
      storyEvents.get(event.contentId)!.push(event);
    } else if (event.contentType === 'vocab') {
      if (!vocabEvents.has(event.contentId)) {
        vocabEvents.set(event.contentId, []);
      }
      vocabEvents.get(event.contentId)!.push(event);
    }
  }

  // Aggregate lesson stats
  for (const [lessonId, events] of lessonEvents) {
    try {
      await aggregateLessonStats(db, lessonId, events);
      processed += events.length;
    } catch {
      errors += events.length;
    }
  }

  // Aggregate story stats
  for (const [storyId, events] of storyEvents) {
    try {
      await aggregateStoryStats(db, storyId, events);
      processed += events.length;
    } catch {
      errors += events.length;
    }
  }

  // Aggregate vocab stats
  for (const [vocabId, events] of vocabEvents) {
    try {
      await aggregateVocabStats(db, vocabId, events);
      processed += events.length;
    } catch {
      errors += events.length;
    }
  }

  // Mark events as processed
  if (unprocessedEvents.length > 0) {
    const eventIds = unprocessedEvents.map(e => e.id);
    // Update in batches
    const batchSize = 50;
    for (let i = 0; i < eventIds.length; i += batchSize) {
      const batch = eventIds.slice(i, i + batchSize);
      await db
        .update(engagementEventsRaw)
        .set({ processed: true })
        .where(sql`${engagementEventsRaw.id} IN (${sql.join(batch.map(id => sql`${id}`), sql`, `)})`);
    }
  }

  // Update daily engagement table
  await updateDailyEngagement(db);

  return { processed, errors };
}

async function aggregateLessonStats(
  db: ReturnType<typeof drizzle>,
  lessonId: string,
  events: Array<{ eventType: string; timestamp: string; timeSeconds: number | null; payload: unknown }>
): Promise<void> {
  // Get existing stats
  const [existing] = await db
    .select()
    .from(analyticsLessonStats)
    .where(eq(analyticsLessonStats.lessonId, lessonId))
    .limit(1);

  // Calculate new aggregates
  const starts = events.filter(e => e.eventType === 'lesson.started').length;
  const completions = events.filter(e => e.eventType === 'lesson.completed').length;
  const abandons = events.filter(e => e.eventType === 'lesson.abandoned').length;
  
  const times = events
    .filter(e => e.eventType === 'lesson.completed' && e.timeSeconds)
    .map(e => e.timeSeconds!);
  
  const scores = events
    .filter(e => e.eventType === 'lesson.completed')
    .map(e => (e.payload as EngagementEventPayload)?.score)
    .filter((s): s is number => typeof s === 'number');

  // Calculate time metrics
  const avgTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const minTime = times.length > 0 ? Math.min(...times) : 0;
  const maxTime = times.length > 0 ? Math.max(...times) : 0;
  const medianTime = times.length > 0 ? calculateMedian(times) : 0;
  const p90Time = times.length > 0 ? calculatePercentile(times, 90) : 0;
  const totalTime = times.reduce((a, b) => a + b, 0);

  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  // Merge with existing
  const newStarts = (existing?.totalStarts || 0) + starts;
  const newCompletions = (existing?.totalCompletions || 0) + completions;
  const newTotalTime = (existing?.totalTimeSeconds || 0) + totalTime;
  const newAbandons = (existing?.totalAbandons || 0) + abandons;
  
  const completionRate = newStarts > 0 ? (newCompletions / newStarts) * 100 : 0;

  // Get latest timestamp
  const latestEvent = events.reduce((latest, e) => 
    e.timestamp > latest ? e.timestamp : latest, 
    existing?.lastEventAt || events[0].timestamp
  );

  if (existing) {
    await db
      .update(analyticsLessonStats)
      .set({
        totalStarts: newStarts,
        totalCompletions: newCompletions,
        totalAbandons: newAbandons,
        avgTimeSeconds: avgTime || existing.avgTimeSeconds,
        minTimeSeconds: minTime > 0 ? Math.min(minTime, existing.minTimeSeconds || minTime) : existing.minTimeSeconds,
        maxTimeSeconds: maxTime > 0 ? Math.max(maxTime, existing.maxTimeSeconds || 0) : existing.maxTimeSeconds,
        medianTimeSeconds: medianTime || existing.medianTimeSeconds,
        p90TimeSeconds: p90Time || existing.p90TimeSeconds,
        totalTimeSeconds: newTotalTime,
        avgScore: avgScore || existing.avgScore,
        completionRate,
        lastEventAt: latestEvent,
      })
      .where(eq(analyticsLessonStats.lessonId, lessonId));
  } else {
    await db.insert(analyticsLessonStats).values({
      lessonId,
      totalStarts: starts,
      totalCompletions: completions,
      totalAbandons: abandons,
      avgTimeSeconds: avgTime,
      minTimeSeconds: minTime,
      maxTimeSeconds: maxTime,
      medianTimeSeconds: medianTime,
      p90TimeSeconds: p90Time,
      totalTimeSeconds: totalTime,
      avgScore,
      completionRate,
      firstEventAt: events[0].timestamp,
      lastEventAt: latestEvent,
    });
  }
}

async function aggregateStoryStats(
  db: ReturnType<typeof drizzle>,
  storyId: string,
  events: Array<{ eventType: string; timestamp: string; timeSeconds: number | null; payload: unknown }>
): Promise<void> {
  const [existing] = await db
    .select()
    .from(analyticsStoryStats)
    .where(eq(analyticsStoryStats.storyId, storyId))
    .limit(1);

  const starts = events.filter(e => e.eventType === 'story.started').length;
  const completions = events.filter(e => e.eventType === 'story.completed').length;
  const abandons = events.filter(e => e.eventType === 'story.abandoned').length;

  const times = events
    .filter(e => e.eventType === 'story.completed' && e.timeSeconds)
    .map(e => e.timeSeconds!);

  const sentencesRead = events
    .filter(e => e.eventType === 'story.completed')
    .map(e => (e.payload as EngagementEventPayload)?.sentencesRead)
    .filter((s): s is number => typeof s === 'number');

  const avgTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const minTime = times.length > 0 ? Math.min(...times) : 0;
  const maxTime = times.length > 0 ? Math.max(...times) : 0;
  const totalTime = times.reduce((a, b) => a + b, 0);
  const avgSentences = sentencesRead.length > 0 
    ? sentencesRead.reduce((a, b) => a + b, 0) / sentencesRead.length 
    : 0;

  const newStarts = (existing?.totalStarts || 0) + starts;
  const newCompletions = (existing?.totalCompletions || 0) + completions;
  const newTotalTime = (existing?.totalTimeSeconds || 0) + totalTime;
  const completionRate = newStarts > 0 ? (newCompletions / newStarts) * 100 : 0;

  const latestEvent = events.reduce((latest, e) => 
    e.timestamp > latest ? e.timestamp : latest, 
    existing?.lastEventAt || events[0].timestamp
  );

  if (existing) {
    await db
      .update(analyticsStoryStats)
      .set({
        totalStarts: newStarts,
        totalCompletions: newCompletions,
        totalAbandons: (existing.totalAbandons || 0) + abandons,
        avgTimeSeconds: avgTime || existing.avgTimeSeconds,
        minTimeSeconds: minTime > 0 ? Math.min(minTime, existing.minTimeSeconds || minTime) : existing.minTimeSeconds,
        maxTimeSeconds: maxTime > 0 ? Math.max(maxTime, existing.maxTimeSeconds || 0) : existing.maxTimeSeconds,
        totalTimeSeconds: newTotalTime,
        avgSentencesRead: avgSentences || existing.avgSentencesRead,
        completionRate,
        lastEventAt: latestEvent,
      })
      .where(eq(analyticsStoryStats.storyId, storyId));
  } else {
    await db.insert(analyticsStoryStats).values({
      storyId,
      totalStarts: starts,
      totalCompletions: completions,
      totalAbandons: abandons,
      avgTimeSeconds: avgTime,
      minTimeSeconds: minTime,
      maxTimeSeconds: maxTime,
      totalTimeSeconds: totalTime,
      avgSentencesRead: avgSentences,
      completionRate,
      firstEventAt: events[0].timestamp,
      lastEventAt: latestEvent,
    });
  }
}

async function aggregateVocabStats(
  db: ReturnType<typeof drizzle>,
  vocabId: string,
  events: Array<{ eventType: string; payload: unknown }>
): Promise<void> {
  const [existing] = await db
    .select()
    .from(analyticsVocabStats)
    .where(eq(analyticsVocabStats.vocabId, vocabId))
    .limit(1);

  const reviews = events.filter(e => e.eventType === 'vocab.reviewed').length;
  const correct = events.filter(e => {
    const p = e.payload as EngagementEventPayload;
    return e.eventType === 'vocab.reviewed' && p?.correct === true;
  }).length;
  const incorrect = reviews - correct;

  const responseTimes = events
    .filter(e => e.eventType === 'vocab.reviewed')
    .map(e => (e.payload as EngagementEventPayload)?.responseTimeMs)
    .filter((t): t is number => typeof t === 'number');

  const avgResponseTime = responseTimes.length > 0 
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : 0;

  const newReviews = (existing?.totalReviews || 0) + reviews;
  const newCorrect = (existing?.correctCount || 0) + correct;
  const newIncorrect = (existing?.incorrectCount || 0) + incorrect;
  const accuracyRate = newReviews > 0 ? (newCorrect / newReviews) * 100 : 0;

  if (existing) {
    await db
      .update(analyticsVocabStats)
      .set({
        totalReviews: newReviews,
        correctCount: newCorrect,
        incorrectCount: newIncorrect,
        avgResponseTimeMs: avgResponseTime || existing.avgResponseTimeMs,
        accuracyRate,
      })
      .where(eq(analyticsVocabStats.vocabId, vocabId));
  } else {
    await db.insert(analyticsVocabStats).values({
      vocabId,
      totalReviews: reviews,
      correctCount: correct,
      incorrectCount: incorrect,
      avgResponseTimeMs: avgResponseTime,
      accuracyRate,
    });
  }
}

async function updateDailyEngagement(db: ReturnType<typeof drizzle>): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  // Aggregate today's events by content type
  const dailyStats = await db
    .select({
      contentType: engagementEventsRaw.contentType,
      totalEvents: sql<number>`count(*)`,
      totalStarts: sql<number>`sum(case when ${engagementEventsRaw.eventType} like '%.started' then 1 else 0 end)`,
      totalCompletions: sql<number>`sum(case when ${engagementEventsRaw.eventType} like '%.completed' then 1 else 0 end)`,
      totalTimeSeconds: sql<number>`coalesce(sum(${engagementEventsRaw.timeSeconds}), 0)`,
    })
    .from(engagementEventsRaw)
    .where(sql`date(${engagementEventsRaw.timestamp}) = ${today}`)
    .groupBy(engagementEventsRaw.contentType);

  for (const row of dailyStats) {
    const completionRate = (row.totalStarts || 0) > 0 
      ? ((row.totalCompletions || 0) / (row.totalStarts || 1)) * 100 
      : 0;

    await db
      .insert(analyticsEngagementDaily)
      .values({
        date: today,
        contentType: row.contentType,
        totalEvents: row.totalEvents,
        totalStarts: row.totalStarts || 0,
        totalCompletions: row.totalCompletions || 0,
        totalTimeSeconds: row.totalTimeSeconds || 0,
        avgCompletionRate: completionRate,
      })
      .onConflictDoUpdate({
        target: [analyticsEngagementDaily.date, analyticsEngagementDaily.contentType],
        set: {
          totalEvents: row.totalEvents,
          totalStarts: row.totalStarts || 0,
          totalCompletions: row.totalCompletions || 0,
          totalTimeSeconds: row.totalTimeSeconds || 0,
          avgCompletionRate: completionRate,
        },
      });
  }
}

// ═══════════════════════════════════════════════════════════
// CLEANUP (called by cron)
// ═══════════════════════════════════════════════════════════

export async function cleanupOldEngagementEvents(
  db: ReturnType<typeof drizzle>,
  retentionDays: number = 90
): Promise<{ deleted: number }> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);

  const result = await db
    .delete(engagementEventsRaw)
    .where(and(
      eq(engagementEventsRaw.processed, true),
      lte(engagementEventsRaw.createdAt, new Date(cutoffTimestamp * 1000))
    ));

  return { deleted: (result as { rowCount?: number }).rowCount || 0 };
}

// ═══════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════

function calculateMedian(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculatePercentile(arr: number[], percentile: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

