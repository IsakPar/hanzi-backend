import type { D1Database } from '@cloudflare/workers-types';

export interface RateLimitConfig {
  requestsPerDay: number;
  tokensPerDay: number;
}

export interface RateLimitUsage {
  requestCount: number;
  tokenCount: number;
}

type RateLimitResult = {
  allowed: boolean;
  reason?: string;
  usage?: RateLimitUsage | null;
};

type RateLimitStoreResult = {
  updated: boolean;
  usage?: RateLimitUsage | null;
};

export interface RateLimitStore {
  reserve(
    userId: string,
    date: string,
    requestIncrement: number,
    tokenIncrement: number,
    limits: RateLimitConfig
  ): Promise<RateLimitStoreResult>;
  addTokens(
    userId: string,
    date: string,
    tokenIncrement: number,
    limits: RateLimitConfig
  ): Promise<RateLimitStoreResult>;
  getUsage(userId: string, date: string): Promise<RateLimitUsage | null>;
}

export class RateLimitExceededError extends Error {
  readonly status = 429;

  constructor(message: string) {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}

export class RateLimitService {
  private limits: RateLimitConfig;
  private readonly store: RateLimitStore;
  private readonly dateProvider: () => string;

  constructor(
    db: D1Database,
    config?: Partial<RateLimitConfig>,
    store?: RateLimitStore,
    dateProvider?: () => string
  ) {
    this.limits = {
      requestsPerDay: config?.requestsPerDay ?? 10,
      tokensPerDay: config?.tokensPerDay ?? 5000,
    };
    this.store = store ?? new D1RateLimitStore(db);
    this.dateProvider =
      dateProvider ??
      (() =>
        // Daily quotas reset at 00:00 UTC. Update this provider if you need a different policy.
        new Date().toISOString().split('T')[0]);
  }

  async reserveRequest(userId: string, tokenBudget: number = 0): Promise<RateLimitResult> {
    const date = this.getTodayDate();
    const sanitizedBudget = Math.max(tokenBudget, 0);
    const result = await this.store.reserve(
      userId,
      date,
      1,
      sanitizedBudget,
      this.limits
    );

    if (result.updated) {
      return { allowed: true };
    }

    const usage = result.usage ?? (await this.store.getUsage(userId, date));
    return {
      allowed: false,
      reason: this.buildReason(usage, { requests: 1, tokens: sanitizedBudget }),
      usage,
    };
  }

  async recordTokens(userId: string, tokensUsed: number): Promise<RateLimitResult> {
    if (tokensUsed <= 0) {
      return { allowed: true };
    }

    const date = this.getTodayDate();
    const result = await this.store.addTokens(
      userId,
      date,
      tokensUsed,
      this.limits
    );

    if (result.updated) {
      return { allowed: true };
    }

    const usage = result.usage ?? (await this.store.getUsage(userId, date));
    return {
      allowed: false,
      reason: this.buildReason(usage, { tokens: tokensUsed }),
      usage,
    };
  }

  async getUsage(userId: string): Promise<RateLimitUsage> {
    const usage = await this.store.getUsage(userId, this.getTodayDate());
    return usage ?? { requestCount: 0, tokenCount: 0 };
  }

  assertWithinLimit(userId: string, tokenBudget: number = 0) {
    return this.reserveRequest(userId, tokenBudget).then((result) => {
      if (!result.allowed) {
        throw new RateLimitExceededError(result.reason || 'Rate limit exceeded');
      }
      return result;
    });
  }

  private getTodayDate(): string {
    return this.dateProvider();
  }

  private buildReason(
    usage: RateLimitUsage | null | undefined,
    increments: { requests?: number; tokens?: number } = {}
  ) {
    if (!usage) {
      return 'Rate limit exceeded';
    }

    const requestTotal = usage.requestCount + (increments.requests ?? 0);
    if (requestTotal > this.limits.requestsPerDay || usage.requestCount >= this.limits.requestsPerDay) {
      return `Daily request limit reached (${this.limits.requestsPerDay})`;
    }

    const tokenTotal = usage.tokenCount + (increments.tokens ?? 0);
    if (tokenTotal > this.limits.tokensPerDay || usage.tokenCount >= this.limits.tokensPerDay) {
      return `Daily token limit reached (${this.limits.tokensPerDay})`;
    }

    return 'Rate limit exceeded';
  }
}

class D1RateLimitStore implements RateLimitStore {
  constructor(private readonly db: D1Database) {}

  private async ensureRow(userId: string, date: string) {
    await this.db
      .prepare(
        `
        INSERT INTO daily_usage (user_id, date, request_count, token_count)
        VALUES (?, ?, 0, 0)
        ON CONFLICT(user_id, date) DO NOTHING
      `
      )
      .bind(userId, date)
      .run();
  }

  async reserve(
    userId: string,
    date: string,
    requestIncrement: number,
    tokenIncrement: number,
    limits: RateLimitConfig
  ): Promise<RateLimitStoreResult> {
    await this.ensureRow(userId, date);

    const result = await this.db
      .prepare(
        `
        UPDATE daily_usage
        SET request_count = request_count + ?, token_count = token_count + ?
        WHERE user_id = ? AND date = ?
          AND request_count + ? <= ?
          AND token_count + ? <= ?
      `
      )
      .bind(
        requestIncrement,
        tokenIncrement,
        userId,
        date,
        requestIncrement,
        limits.requestsPerDay,
        tokenIncrement,
        limits.tokensPerDay
      )
      .run();

    if (result.success && (result.meta?.changes ?? 0) > 0) {
      return { updated: true };
    }

    return {
      updated: false,
      usage: await this.getUsage(userId, date),
    };
  }

  async addTokens(
    userId: string,
    date: string,
    tokenIncrement: number,
    limits: RateLimitConfig
  ): Promise<RateLimitStoreResult> {
    await this.ensureRow(userId, date);

    const result = await this.db
      .prepare(
        `
        UPDATE daily_usage
        SET token_count = token_count + ?
        WHERE user_id = ? AND date = ?
          AND token_count + ? <= ?
      `
      )
      .bind(tokenIncrement, userId, date, tokenIncrement, limits.tokensPerDay)
      .run();

    if (result.success && (result.meta?.changes ?? 0) > 0) {
      return { updated: true };
    }

    return {
      updated: false,
      usage: await this.getUsage(userId, date),
    };
  }

  async getUsage(userId: string, date: string): Promise<RateLimitUsage | null> {
    const row = await this.db
      .prepare(
        `
        SELECT request_count as requestCount, token_count as tokenCount
        FROM daily_usage
        WHERE user_id = ? AND date = ?
      `
      )
      .bind(userId, date)
      .first<RateLimitUsage>();

    return row ?? null;
  }
}
