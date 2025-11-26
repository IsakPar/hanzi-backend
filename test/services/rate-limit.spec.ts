import { beforeEach, describe, expect, it } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import {
  RateLimitService,
  type RateLimitConfig,
  type RateLimitStore,
  type RateLimitUsage,
} from '../../src/services/rate-limit';

class InMemoryRateLimitStore implements RateLimitStore {
  private rows = new Map<string, RateLimitUsage>();

  private key(userId: string, date: string) {
    return `${userId}:${date}`;
  }

  private ensure(userId: string, date: string) {
    const key = this.key(userId, date);
    if (!this.rows.has(key)) {
      this.rows.set(key, { requestCount: 0, tokenCount: 0 });
    }
    return this.rows.get(key)!;
  }

  async reserve(
    userId: string,
    date: string,
    requestIncrement: number,
    tokenIncrement: number,
    limits: RateLimitConfig
  ) {
    const row = this.ensure(userId, date);
    if (
      row.requestCount + requestIncrement > limits.requestsPerDay ||
      row.tokenCount + tokenIncrement > limits.tokensPerDay
    ) {
      return { updated: false, usage: { ...row } };
    }

    row.requestCount += requestIncrement;
    row.tokenCount += tokenIncrement;
    return { updated: true };
  }

  async addTokens(
    userId: string,
    date: string,
    tokenIncrement: number,
    limits: RateLimitConfig
  ) {
    const row = this.ensure(userId, date);
    if (row.tokenCount + tokenIncrement > limits.tokensPerDay) {
      return { updated: false, usage: { ...row } };
    }

    row.tokenCount += tokenIncrement;
    return { updated: true };
  }

  async getUsage(userId: string, date: string) {
    const row = this.rows.get(this.key(userId, date));
    return row ? { ...row } : null;
  }
}

describe('RateLimitService', () => {
  const today = '2025-11-22';
  let store: InMemoryRateLimitStore;
  let service: RateLimitService;

  beforeEach(() => {
    store = new InMemoryRateLimitStore();
    service = new RateLimitService(
      {} as D1Database,
      { requestsPerDay: 2, tokensPerDay: 100 },
      store,
      () => today
    );
  });

  it('allows reservations until the daily request limit is reached', async () => {
    const first = await service.reserveRequest('user-1');
    const second = await service.reserveRequest('user-1');
    const third = await service.reserveRequest('user-1');

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.reason).toContain('request limit');
  });

  it('records request usage even when downstream work fails', async () => {
    await service.reserveRequest('user-2');
    const usage = await service.getUsage('user-2');
    expect(usage.requestCount).toBe(1);
    expect(usage.tokenCount).toBe(0);
  });

  it('enforces token limits when recording actual usage', async () => {
    await service.reserveRequest('user-3');
    const ok = await service.recordTokens('user-3', 80);
    const exceeded = await service.recordTokens('user-3', 30);

    expect(ok.allowed).toBe(true);
    expect(exceeded.allowed).toBe(false);
    expect(exceeded.reason).toContain('token limit');
  });
});

