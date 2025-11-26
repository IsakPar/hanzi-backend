import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { desc } from 'drizzle-orm';
import { apiUsage, systemEvents } from '../schema';

export type AnalyticsEvent = {
  type: string;
  requestId?: string;
  userId?: string;
  modelUsed?: string;
  promptSlug?: string | null;
  promptVersion?: number | null;
  latencyMs?: number | null;
  costUsd?: number | null;
  metadata?: Record<string, unknown>;
};

export class AnalyticsService {
  constructor(private readonly db: D1Database) {}

  private getClient() {
    return drizzle(this.db);
  }

  async record(event: AnalyticsEvent) {
    const d1 = this.getClient();
    await d1.insert(systemEvents).values({
      id: crypto.randomUUID(),
      eventType: event.type,
      requestId: event.requestId,
      userId: event.userId,
      modelUsed: event.modelUsed ?? null,
      promptSlug: event.promptSlug ?? null,
      promptVersion: event.promptVersion ?? null,
      latencyMs: event.latencyMs ?? null,
      costUsd: event.costUsd ?? null,
      metadata: event.metadata ?? null,
    });
  }

  async getAiUsageStats(filters: {
    from?: string;
    to?: string;
    model?: string;
    prompt_slug?: string;
    success?: boolean;
  }) {
    const d1 = this.getClient();
    const records = await d1
      .select()
      .from(apiUsage)
      .orderBy(desc(apiUsage.createdAt))
      .limit(500)
      .all();

    const fromTs = filters.from ? new Date(filters.from).getTime() : undefined;
    const toTs = filters.to ? new Date(filters.to).getTime() : undefined;

    const filtered = records.filter((record) => {
      const createdAt =
        typeof record.createdAt === 'number'
          ? record.createdAt * 1000
          : new Date(record.createdAt as any).getTime();

      if (fromTs && createdAt < fromTs) return false;
      if (toTs && createdAt > toTs) return false;
      if (filters.model && record.modelUsed !== filters.model) return false;
      if (filters.prompt_slug && record.promptSlug !== filters.prompt_slug) return false;
      if (typeof filters.success === 'boolean' && !!record.success !== filters.success) return false;
      return true;
    });

    const totalCost = filtered.reduce((sum, r) => sum + (r.estimatedCost || 0), 0);
    const totalTokens = filtered.reduce((sum, r) => sum + (r.totalTokens || 0), 0);

    return {
      summary: {
        totalCost,
        totalTokens,
        totalRequests: filtered.length,
      },
      records: filtered,
    };
  }

  async getSystemEvents(filters: { from?: string; to?: string }) {
    const d1 = this.getClient();
    const records = await d1
      .select()
      .from(systemEvents)
      .orderBy(desc(systemEvents.createdAt))
      .limit(500)
      .all();

    const fromTs = filters.from ? new Date(filters.from).getTime() : undefined;
    const toTs = filters.to ? new Date(filters.to).getTime() : undefined;

    const filtered = records.filter((event) => {
      const createdAt =
        typeof event.createdAt === 'number'
          ? event.createdAt * 1000
          : new Date(event.createdAt as any).getTime();
      if (fromTs && createdAt < fromTs) return false;
      if (toTs && createdAt > toTs) return false;
      return true;
    });

    return { records: filtered };
  }

  async getContentEvents(filters: { from?: string; to?: string }) {
    const { records } = await this.getSystemEvents(filters);
    return {
      records: records.filter((event) => event.eventType?.startsWith('content.')),
    };
  }
}
