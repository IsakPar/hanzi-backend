/// <reference types="@cloudflare/workers-types" />
/**
 * AI Usage Logger
 * 
 * Tracks every AI API call with token counts and costs.
 * Stores data in D1 for persistent analytics.
 */

import { nanoid } from 'nanoid';

// ═══════════════════════════════════════════════════════════
// COST CONFIGURATION - Models We Actually Use
// ═══════════════════════════════════════════════════════════

// Cost per 1M tokens for LLMs
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  // DeepSeek (primary for AI features)
  'deepseek-chat': { input: 0.14, output: 0.28 },
  'deepseek-coder': { input: 0.14, output: 0.28 },
  'deepseek/deepseek-chat': { input: 0.14, output: 0.28 },
  'deepseek/deepseek-coder': { input: 0.14, output: 0.28 },
  
  // Qwen (via OpenRouter)
  'qwen-coder-32b': { input: 0.10, output: 0.20 },
  'qwen/qwen-2.5-coder-32b-instruct': { input: 0.10, output: 0.20 },
  
  // Cloudflare Workers AI (free)
  '@cf/qwen/qwen1.5-14b-chat-awq': { input: 0.00, output: 0.00 },
  '@cf/meta/llama-3-8b-instruct': { input: 0.00, output: 0.00 },
  
  // Default fallback
  'default': { input: 0.50, output: 1.00 },
};

// ElevenLabs TTS cost per 1000 characters
const ELEVENLABS_COST_PER_1K_CHARS = 0.30; // $0.30 per 1K characters

// Provider categorization for display
export const PROVIDERS = {
  deepseek: {
    name: 'DeepSeek',
    color: '#0066FF',
    models: ['deepseek-chat', 'deepseek-coder', 'deepseek/deepseek-chat', 'deepseek/deepseek-coder'],
  },
  qwen: {
    name: 'Qwen',
    color: '#7C3AED',
    models: ['qwen-coder-32b', 'qwen/qwen-2.5-coder-32b-instruct', '@cf/qwen/qwen1.5-14b-chat-awq'],
  },
  elevenlabs: {
    name: 'ElevenLabs',
    color: '#10B981',
    models: ['elevenlabs-tts'],
  },
  cloudflare: {
    name: 'Cloudflare AI',
    color: '#F59E0B',
    models: ['@cf/meta/llama-3-8b-instruct'],
  },
} as const;

export function getProviderForModel(model: string): string {
  for (const [provider, config] of Object.entries(PROVIDERS)) {
    if (config.models.some(m => model.toLowerCase().includes(m.toLowerCase()))) {
      return provider;
    }
  }
  return 'other';
}

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
  // For ElevenLabs TTS
  characters?: number;
}

export interface ElevenLabsUsageEntry {
  userId?: string;
  sessionId?: string;
  characters: number;
  latencyMs?: number;
  success?: boolean;
  errorMessage?: string;
  voiceId?: string;
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
   * Calculate ElevenLabs TTS cost based on characters
   */
  calculateElevenLabsCost(characters: number): number {
    return Math.round((characters / 1000) * ELEVENLABS_COST_PER_1K_CHARS * 1_000_000) / 1_000_000;
  }

  /**
   * Log ElevenLabs TTS usage
   */
  async logElevenLabs(entry: ElevenLabsUsageEntry): Promise<void> {
    const id = nanoid();
    const costUsd = this.calculateElevenLabsCost(entry.characters);

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
        'elevenlabs-tts',
        'tts',
        entry.characters, // Store characters as input_tokens for consistency
        0,
        entry.characters,
        costUsd,
        entry.latencyMs || null,
        entry.success !== false ? 1 : 0,
        entry.errorMessage || null,
        entry.voiceId ? JSON.stringify({ voiceId: entry.voiceId }) : null,
      ).run();
    } catch (error) {
      console.error('Failed to log ElevenLabs usage:', error);
    }
  }

  /**
   * Log an AI usage entry to the database
   */
  async log(entry: AIUsageEntry): Promise<void> {
    const id = nanoid();
    const totalTokens = entry.inputTokens + entry.outputTokens;
    const costUsd = entry.cost ?? this.calculateCost(entry.model, entry.inputTokens, entry.outputTokens);

    // Merge requestType into metadata for querying
    const metadata = {
      ...entry.metadata,
      ...(entry.requestType ? { requestType: entry.requestType } : {}),
    };

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
        Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
      ).run();
    } catch (error) {
      // Don't throw - logging should never break the main flow
      console.error('Failed to log AI usage:', error);
    }
  }

  /**
   * Get usage summary for a time period
   * Set days=0 for all-time data
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
    byProvider: Record<string, { requests: number; tokens: number; cost: number; models: string[] }>;
    firstLogDate: string | null;
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
    const byProvider: Record<string, { requests: number; tokens: number; cost: number; models: string[] }> = {};
    let totalRequests = 0;
    let totalTokens = 0;
    let totalCost = 0;

    for (const row of result.results || []) {
      const model = row.model as string;
      const requests = row.requests as number;
      const tokens = (row.tokens as number) || 0;
      const cost = (row.cost as number) || 0;

      byModel[model] = { requests, tokens, cost };
      totalRequests += requests;
      totalTokens += tokens;
      totalCost += cost;

      // Group by provider
      const provider = getProviderForModel(model);
      if (!byProvider[provider]) {
        byProvider[provider] = { requests: 0, tokens: 0, cost: 0, models: [] };
      }
      byProvider[provider].requests += requests;
      byProvider[provider].tokens += tokens;
      byProvider[provider].cost += cost;
      if (!byProvider[provider].models.includes(model)) {
        byProvider[provider].models.push(model);
      }
    }

    // Get earliest log date
    const firstLogResult = await this.db.prepare(`
      SELECT MIN(date(created_at, 'unixepoch')) as first_date
      FROM ai_usage_log
    `).first();
    const firstLogDate = firstLogResult?.first_date as string | null;

    return { totalRequests, totalTokens, totalCost, byModel, byProvider, firstLogDate };
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
   * Set days=0 for all-time data
   */
  async getDailyUsage(days: number = 30): Promise<Array<{
    date: string;
    requests: number;
    tokens: number;
    cost: number;
  }>> {
    let query = `
      SELECT 
        date(created_at, 'unixepoch') as date,
        COUNT(*) as requests,
        SUM(total_tokens) as tokens,
        SUM(cost_usd) as cost
      FROM ai_usage_log
    `;
    
    if (days > 0) {
      query += ` WHERE created_at >= strftime('%s', 'now', '-' || ${days} || ' days')`;
    }
    
    query += ` GROUP BY date(created_at, 'unixepoch') ORDER BY date DESC`;

    const result = await this.db.prepare(query).all();

    return (result.results || []).map(row => ({
      date: row.date as string,
      requests: row.requests as number,
      tokens: (row.tokens as number) || 0,
      cost: (row.cost as number) || 0,
    }));
  }

  /**
   * Get daily usage grouped by provider
   */
  async getDailyUsageByProvider(days: number = 30): Promise<Array<{
    date: string;
    provider: string;
    requests: number;
    tokens: number;
    cost: number;
  }>> {
    let query = `
      SELECT 
        date(created_at, 'unixepoch') as date,
        model,
        COUNT(*) as requests,
        SUM(total_tokens) as tokens,
        SUM(cost_usd) as cost
      FROM ai_usage_log
    `;
    
    if (days > 0) {
      query += ` WHERE created_at >= strftime('%s', 'now', '-' || ${days} || ' days')`;
    }
    
    query += ` GROUP BY date(created_at, 'unixepoch'), model ORDER BY date DESC`;

    const result = await this.db.prepare(query).all();

    // Group by date and provider
    const byDateProvider: Record<string, Record<string, { requests: number; tokens: number; cost: number }>> = {};
    
    for (const row of result.results || []) {
      const date = row.date as string;
      const model = row.model as string;
      const provider = getProviderForModel(model);
      
      if (!byDateProvider[date]) {
        byDateProvider[date] = {};
      }
      if (!byDateProvider[date][provider]) {
        byDateProvider[date][provider] = { requests: 0, tokens: 0, cost: 0 };
      }
      
      byDateProvider[date][provider].requests += (row.requests as number) || 0;
      byDateProvider[date][provider].tokens += (row.tokens as number) || 0;
      byDateProvider[date][provider].cost += (row.cost as number) || 0;
    }

    // Flatten to array
    const output: Array<{ date: string; provider: string; requests: number; tokens: number; cost: number }> = [];
    for (const [date, providers] of Object.entries(byDateProvider)) {
      for (const [provider, data] of Object.entries(providers)) {
        output.push({ date, provider, ...data });
      }
    }
    
    return output.sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Get AI Tutor lesson generation summary
   * Filters by requestType containing 'tutor_'
   */
  async getTutorUsageSummary(days: number = 0): Promise<{
    totalLessons: number;
    totalCost: number;
    avgCostPerLesson: number;
    totalTokens: number;
    daily: Array<{
      date: string;
      lessons: number;
      cost: number;
      tokens: number;
    }>;
    recentLessons: Array<{
      sessionId: string;
      timestamp: string;
      inputTokens: number;
      outputTokens: number;
      cost: number;
      steps: number;
      metadata?: Record<string, unknown>;
    }>;
  }> {
    // Get all tutor-related entries
    let baseQuery = `
      FROM ai_usage_log 
      WHERE metadata LIKE '%"requestType":"tutor_%'
    `;
    
    if (days > 0) {
      baseQuery += ` AND created_at >= strftime('%s', 'now', '-' || ${days} || ' days')`;
    }

    // Get totals grouped by session (each session = 1 lesson with multiple steps)
    const totalsQuery = `
      SELECT 
        COUNT(DISTINCT session_id) as total_lessons,
        SUM(cost_usd) as total_cost,
        SUM(total_tokens) as total_tokens,
        COUNT(*) as total_steps
      ${baseQuery}
    `;
    
    const totalsResult = await this.db.prepare(totalsQuery).first();
    const totalLessons = (totalsResult?.total_lessons as number) || 0;
    const totalCost = (totalsResult?.total_cost as number) || 0;
    const totalTokens = (totalsResult?.total_tokens as number) || 0;

    // Get daily breakdown (count unique sessions per day as lessons)
    const dailyQuery = `
      SELECT 
        date(created_at, 'unixepoch') as date,
        COUNT(DISTINCT session_id) as lessons,
        SUM(cost_usd) as cost,
        SUM(total_tokens) as tokens
      ${baseQuery}
      GROUP BY date(created_at, 'unixepoch')
      ORDER BY date DESC
      LIMIT 30
    `;
    
    const dailyResult = await this.db.prepare(dailyQuery).all();
    const daily = (dailyResult.results || []).map(row => ({
      date: row.date as string,
      lessons: (row.lessons as number) || 0,
      cost: (row.cost as number) || 0,
      tokens: (row.tokens as number) || 0,
    }));

    // Get recent individual lessons (grouped by session)
    const recentQuery = `
      SELECT 
        session_id,
        MAX(created_at) as timestamp,
        SUM(input_tokens) as input_tokens,
        SUM(output_tokens) as output_tokens,
        SUM(cost_usd) as cost,
        COUNT(*) as steps,
        GROUP_CONCAT(metadata) as all_metadata
      ${baseQuery}
      GROUP BY session_id
      ORDER BY timestamp DESC
      LIMIT 20
    `;
    
    const recentResult = await this.db.prepare(recentQuery).all();
    const recentLessons = (recentResult.results || []).map(row => {
      // Try to parse first metadata for lesson info
      let metadata: Record<string, unknown> | undefined;
      try {
        const allMeta = row.all_metadata as string;
        if (allMeta) {
          const firstMeta = allMeta.split(',')[0];
          metadata = JSON.parse(firstMeta);
        }
      } catch {
        // Ignore parse errors
      }

      return {
        sessionId: row.session_id as string,
        timestamp: new Date((row.timestamp as number) * 1000).toISOString(),
        inputTokens: (row.input_tokens as number) || 0,
        outputTokens: (row.output_tokens as number) || 0,
        cost: (row.cost as number) || 0,
        steps: (row.steps as number) || 0,
        metadata,
      };
    });

    return {
      totalLessons,
      totalCost,
      avgCostPerLesson: totalLessons > 0 ? totalCost / totalLessons : 0,
      totalTokens,
      daily,
      recentLessons,
    };
  }
}

/**
 * Helper to create logger instance
 */
export function createAIUsageLogger(db: D1Database): AIUsageLogger {
  return new AIUsageLogger(db);
}

