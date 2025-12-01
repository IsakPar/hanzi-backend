/// <reference types="@cloudflare/workers-types" />
/**
 * AI Usage Logger
 * 
 * Tracks every AI API call with token counts and costs.
 * Stores data in D1 for persistent analytics.
 */

import { nanoid } from 'nanoid';

// Cost per 1M tokens (as of late 2024, adjust as needed)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  
  // Anthropic
  'claude-3-opus': { input: 15.00, output: 75.00 },
  'claude-3-sonnet': { input: 3.00, output: 15.00 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  
  // DeepSeek
  'deepseek-chat': { input: 0.14, output: 0.28 },
  'deepseek-coder': { input: 0.14, output: 0.28 },
  
  // Qwen (via Cloudflare Workers AI or other)
  'qwen-coder-32b': { input: 0.10, output: 0.20 },
  '@cf/qwen/qwen1.5-14b-chat-awq': { input: 0.00, output: 0.00 }, // Workers AI - included in plan
  
  // Cloudflare Workers AI (generally free/included)
  '@cf/meta/llama-3-8b-instruct': { input: 0.00, output: 0.00 },
  '@cf/mistral/mistral-7b-instruct-v0.1': { input: 0.00, output: 0.00 },
  
  // Default fallback
  'default': { input: 0.50, output: 1.00 },
};

export interface AIUsageEntry {
  userId?: string;
  sessionId?: string;
  model: string;
  endpoint?: string;
  inputTokens: number;
  outputTokens: number;
  cost?: number;
  latencyMs?: number;
  success?: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  requestType?: string;
}

export class AIUsageLogger {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  /**
   * Calculate cost in USD based on model and token counts
   */
  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const costs = MODEL_COSTS[model] || MODEL_COSTS['default'];
    const inputCost = (inputTokens / 1_000_000) * costs.input;
    const outputCost = (outputTokens / 1_000_000) * costs.output;
    return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000; // Round to 6 decimal places
  }

  /**
   * Log an AI usage entry to the database
   */
  async log(entry: AIUsageEntry): Promise<void> {
    const id = nanoid();
    const totalTokens = entry.inputTokens + entry.outputTokens;
    const costUsd = this.calculateCost(entry.model, entry.inputTokens, entry.outputTokens);

    try {
      await this.db.prepare(`
        INSERT INTO ai_usage_log (
          id, user_id, session_id, model, endpoint,
          input_tokens, output_tokens, total_tokens, cost_usd,
          latency_ms, success, error_message, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
      `).bind(
        id,
        entry.userId || null,
        entry.sessionId || null,
        entry.model,
        entry.endpoint || null,
        entry.inputTokens,
        entry.outputTokens,
        totalTokens,
        costUsd,
        entry.latencyMs || null,
        entry.success !== false ? 1 : 0,
        entry.errorMessage || null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
      ).run();
    } catch (error) {
      // Don't throw - logging should never break the main flow
      console.error('Failed to log AI usage:', error);
    }
  }

  /**
   * Get usage summary for a time period
   */
  async getSummary(options: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    groupBy?: 'model' | 'day' | 'user';
  } = {}): Promise<{
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    byModel: Record<string, { requests: number; tokens: number; cost: number }>;
  }> {
    let query = `
      SELECT 
        model,
        COUNT(*) as requests,
        SUM(total_tokens) as tokens,
        SUM(cost_usd) as cost
      FROM ai_usage_log
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (options.startDate) {
      query += ` AND created_at >= ?`;
      params.push(Math.floor(options.startDate.getTime() / 1000));
    }
    if (options.endDate) {
      query += ` AND created_at <= ?`;
      params.push(Math.floor(options.endDate.getTime() / 1000));
    }
    if (options.userId) {
      query += ` AND user_id = ?`;
      params.push(options.userId);
    }

    query += ` GROUP BY model`;

    const result = await this.db.prepare(query).bind(...params).all();
    
    const byModel: Record<string, { requests: number; tokens: number; cost: number }> = {};
    let totalRequests = 0;
    let totalTokens = 0;
    let totalCost = 0;

    for (const row of result.results || []) {
      const model = row.model as string;
      const requests = row.requests as number;
      const tokens = row.tokens as number;
      const cost = row.cost as number;

      byModel[model] = { requests, tokens, cost };
      totalRequests += requests;
      totalTokens += tokens;
      totalCost += cost;
    }

    return { totalRequests, totalTokens, totalCost, byModel };
  }

  /**
   * Get recent usage entries
   */
  async getRecent(limit: number = 100): Promise<Array<{
    id: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    createdAt: Date;
  }>> {
    const result = await this.db.prepare(`
      SELECT id, model, input_tokens, output_tokens, cost_usd, created_at
      FROM ai_usage_log
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(limit).all();

    return (result.results || []).map(row => ({
      id: row.id as string,
      model: row.model as string,
      inputTokens: row.input_tokens as number,
      outputTokens: row.output_tokens as number,
      costUsd: row.cost_usd as number,
      createdAt: new Date((row.created_at as number) * 1000),
    }));
  }

  /**
   * Get daily usage for the last N days
   */
  async getDailyUsage(days: number = 30): Promise<Array<{
    date: string;
    requests: number;
    tokens: number;
    cost: number;
  }>> {
    const result = await this.db.prepare(`
      SELECT 
        date(created_at, 'unixepoch') as date,
        COUNT(*) as requests,
        SUM(total_tokens) as tokens,
        SUM(cost_usd) as cost
      FROM ai_usage_log
      WHERE created_at >= strftime('%s', 'now', '-' || ? || ' days')
      GROUP BY date(created_at, 'unixepoch')
      ORDER BY date DESC
    `).bind(days).all();

    return (result.results || []).map(row => ({
      date: row.date as string,
      requests: row.requests as number,
      tokens: row.tokens as number || 0,
      cost: row.cost as number || 0,
    }));
  }
}

/**
 * Helper to create logger instance
 */
export function createAIUsageLogger(db: D1Database): AIUsageLogger {
  return new AIUsageLogger(db);
}

