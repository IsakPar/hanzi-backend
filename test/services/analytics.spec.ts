import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import { AnalyticsService } from '../../src/services/analytics';
import { createD1Harness } from '../utils/d1';
import { API_USAGE_SCHEMA, SYSTEM_EVENTS_SCHEMA } from '../utils/schema';

describe('AnalyticsService', () => {
  let harness: Awaited<ReturnType<typeof createD1Harness>>;
  let service: AnalyticsService;
  let db: D1Database;

  beforeEach(async () => {
    harness = await createD1Harness([...SYSTEM_EVENTS_SCHEMA, ...API_USAGE_SCHEMA]);
    db = harness.db;
    service = new AnalyticsService(db);
  });

  afterEach(async () => {
    await harness.dispose();
  });

  it('records system events with metadata', async () => {
    await service.record({
      type: 'ai.lesson.success',
      requestId: 'req-1',
      userId: 'user-1',
      modelUsed: 'gpt-4o',
      promptSlug: 'lesson_default',
      promptVersion: 2,
      latencyMs: 1234,
      costUsd: 0.01,
      metadata: { foo: 'bar' },
    });

    const result = await db.prepare('SELECT * FROM system_events').first<any>();
    expect(result?.event_type).toBe('ai.lesson.success');
    expect(result?.prompt_slug).toBe('lesson_default');
    expect(result?.prompt_version).toBe(2);
  });

  it('summarizes AI usage with filters', async () => {
    const stmt = db.prepare(
      `INSERT INTO api_usage (id, user_id, request_id, model_used, total_tokens, estimated_cost, success, prompt_slug, prompt_version, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    await stmt.bind('1', 'user-1', 'req-1', 'gpt-4o', 100, 0.02, 1, 'lesson_default', 1, 1).run();
    await stmt.bind('2', 'user-1', 'req-2', 'gpt-4o', 200, 0.05, 0, 'lesson_default', 2, 2).run();

    const stats = await service.getAiUsageStats({
      prompt_slug: 'lesson_default',
      success: true,
    });

    expect(stats.summary.totalRequests).toBe(1);
    expect(stats.summary.totalTokens).toBe(100);
    expect(stats.summary.totalCost).toBeCloseTo(0.02);
  });

  it('returns recent system events within date range', async () => {
    await service.record({ type: 'content.upload', requestId: 'req-1' });

    const events = await service.getSystemEvents({
      from: new Date(Date.now() - 1000).toISOString(),
      to: new Date(Date.now() + 1000).toISOString(),
    });

    expect(events.records.length).toBe(1);
    expect(events.records[0].eventType).toBe('content.upload');
  });
});

