import { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { aiModels, apiUsage } from '../schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  costPer1kInput: number;
  costPer1kOutput: number;
  isActive: boolean;
  tier: 'nano' | 'mini' | 'standard' | 'premium';
  maxTokens: number;
  supportsJson: boolean;
}

export interface UsageStats {
  totalCost: number;
  totalRequests: number;
  totalTokens: number;
  breakdown: Array<{
    date: string;
    model: string;
    requests: number;
    tokens: number;
    cost: number;
  }>;
  byModel: Record<string, { requests: number; cost: number; tokens: number }>;
}

const normalizeTimestamp = (value: unknown): Date => {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'number') {
    // Values coming from SQLite are seconds; multiply unless already ms
    return new Date(value > 1e12 ? value : value * 1000);
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed);
    }
  }
  return new Date(0);
};

export class ModelManagerService {
  constructor(private db: D1Database) {}

  /**
   * Get all available AI models
   */
  async getAllModels(): Promise<AIModel[]> {
    const d1 = drizzle(this.db);
    const models = await d1.select().from(aiModels).all();
    return models as AIModel[];
  }

  /**
   * Get the currently active model
   */
  async getActiveModel(): Promise<AIModel | null> {
    const d1 = drizzle(this.db);
    const model = await d1
      .select()
      .from(aiModels)
      .where(eq(aiModels.isActive, true))
      .limit(1)
      .get();
    
    return (model as AIModel) || null;
  }

  /**
   * Set a model as active (deactivates all others)
   */
  async setActiveModel(modelId: string): Promise<{ previous: string | null; current: string }> {
    const d1 = drizzle(this.db);

    // Get current active model
    const currentActive = await this.getActiveModel();

    // Deactivate all models
    await d1
      .update(aiModels)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(aiModels.isActive, true));

    // Activate the requested model
    const result = await d1
      .update(aiModels)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(aiModels.id, modelId));

    return {
      previous: currentActive?.id || null,
      current: modelId
    };
  }

  /**
   * Add a new model to the database
   */
  async addModel(model: Omit<AIModel, 'createdAt' | 'updatedAt'>): Promise<AIModel> {
    const d1 = drizzle(this.db);
    await d1.insert(aiModels).values({
      ...model,
      isActive: false, // New models are not active by default
    });

    const inserted = await d1
      .select()
      .from(aiModels)
      .where(eq(aiModels.id, model.id))
      .get();

    return inserted as AIModel;
  }

  /**
   * Track API usage
   */
  async trackUsage(params: {
    userId: string;
    requestId: string;
    modelUsed: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    success: boolean;
    errorMessage?: string;
    promptSlug?: string | null;
    promptVersion?: number | null;
  }): Promise<void> {
    const d1 = drizzle(this.db);

    // Calculate cost based on model pricing
    const model = await d1
      .select()
      .from(aiModels)
      .where(eq(aiModels.id, params.modelUsed))
      .get();

    let estimatedCost = 0;
    if (model) {
      const inputCost = (params.inputTokens / 1000) * (model.costPer1kInput || 0);
      const outputCost = (params.outputTokens / 1000) * (model.costPer1kOutput || 0);
      estimatedCost = inputCost + outputCost;
    }

    await d1.insert(apiUsage).values({
      id: crypto.randomUUID(),
      userId: params.userId,
      requestId: params.requestId,
      modelUsed: params.modelUsed,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      totalTokens: params.inputTokens + params.outputTokens,
      estimatedCost,
      latencyMs: params.latencyMs,
      success: params.success,
      errorMessage: params.errorMessage,
      promptSlug: params.promptSlug ?? null,
      promptVersion: params.promptVersion ?? null,
    });
  }

  /**
   * Get usage statistics for a date range
   */
  async getUsageStats(params: {
    userId?: string;
    from?: Date;
    to?: Date;
  }): Promise<UsageStats> {
    const d1 = drizzle(this.db);

    // Build where conditions
    const conditions = [];
    if (params.userId) {
      conditions.push(eq(apiUsage.userId, params.userId));
    }
    if (params.from) {
      conditions.push(gte(apiUsage.createdAt, params.from));
    }
    if (params.to) {
      conditions.push(lte(apiUsage.createdAt, params.to));
    }

    // Get all usage records
    const records = await d1
      .select()
      .from(apiUsage)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .all();

    // Calculate totals
    const totalCost = records.reduce((sum, r) => sum + (r.estimatedCost || 0), 0);
    const totalRequests = records.length;
    const totalTokens = records.reduce((sum, r) => sum + (r.totalTokens || 0), 0);

    // Group by model
    const byModel: Record<string, { requests: number; cost: number; tokens: number }> = {};
    records.forEach((r) => {
      if (!byModel[r.modelUsed]) {
        byModel[r.modelUsed] = { requests: 0, cost: 0, tokens: 0 };
      }
      byModel[r.modelUsed].requests++;
      byModel[r.modelUsed].cost += r.estimatedCost || 0;
      byModel[r.modelUsed].tokens += r.totalTokens || 0;
    });

    // Group by date (simple daily breakdown)
    const byDate: Record<string, Record<string, any>> = {};
    records.forEach((r) => {
      const createdAt = normalizeTimestamp(r.createdAt as any);
      const date = createdAt.toISOString().split('T')[0];
      if (!byDate[date]) {
        byDate[date] = {};
      }
      if (!byDate[date][r.modelUsed]) {
        byDate[date][r.modelUsed] = { requests: 0, tokens: 0, cost: 0 };
      }
      byDate[date][r.modelUsed].requests++;
      byDate[date][r.modelUsed].tokens += r.totalTokens || 0;
      byDate[date][r.modelUsed].cost += r.estimatedCost || 0;
    });

    const breakdown = Object.entries(byDate).flatMap(([date, models]) =>
      Object.entries(models).map(([model, stats]) => ({
        date,
        model,
        requests: (stats as any).requests,
        tokens: (stats as any).tokens,
        cost: (stats as any).cost,
      }))
    );

    return {
      totalCost: Math.round(totalCost * 10000) / 10000, // Round to 4 decimals
      totalRequests,
      totalTokens,
      breakdown,
      byModel,
    };
  }

  /**
   * Get real-time usage (today + this month)
   */
  async getRealtimeUsage(userId?: string): Promise<{
    today: { cost: number; requests: number; tokens: number };
    thisMonth: { cost: number; requests: number; tokens: number };
    currentModel: string | null;
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayStats = await this.getUsageStats({
      userId,
      from: todayStart,
      to: now,
    });

    const monthStats = await this.getUsageStats({
      userId,
      from: monthStart,
      to: now,
    });

    const activeModel = await this.getActiveModel();

    return {
      today: {
        cost: todayStats.totalCost,
        requests: todayStats.totalRequests,
        tokens: todayStats.totalTokens,
      },
      thisMonth: {
        cost: monthStats.totalCost,
        requests: monthStats.totalRequests,
        tokens: monthStats.totalTokens,
      },
      currentModel: activeModel?.id || null,
    };
  }
}

