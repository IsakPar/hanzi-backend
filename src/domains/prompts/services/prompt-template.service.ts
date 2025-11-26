import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { and, desc, eq, max } from 'drizzle-orm';
import { 
  promptTemplates, 
  promptTemplateHistory,
  type PipelineStep,
  type CostLimits,
  type QualityGate,
} from '../../../schema';

export type TemplateStatus = 'draft' | 'active' | 'archived';
export type PromptTemplateRecord = typeof promptTemplates.$inferSelect;

// Legacy single-prompt input
export type CreateTemplateInput = {
  slug: string;
  body: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdBy?: string;
};

// New pipeline-based input
export type CreatePipelineInput = {
  slug: string;
  steps: PipelineStep[];
  costLimits?: CostLimits;
  qualityGate?: QualityGate;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdBy?: string;
};

export type PromoteInput = {
  slug: string;
  version: number;
  reason?: string;
  changedBy?: string;
};

export class PromptTemplateService {
  constructor(private readonly db: D1Database) {}

  private getClient() {
    return drizzle(this.db);
  }

  async listTemplates(slug: string): Promise<PromptTemplateRecord[]> {
    const client = this.getClient();
    return client
      .select()
      .from(promptTemplates)
      .where(eq(promptTemplates.slug, slug))
      .orderBy(desc(promptTemplates.version))
      .all();
  }

  /**
   * Create a legacy single-prompt draft (backwards compatible)
   */
  async createDraft(input: CreateTemplateInput): Promise<PromptTemplateRecord> {
    const client = this.getClient();
    const latest = await client
      .select({ version: max(promptTemplates.version).as('version') })
      .from(promptTemplates)
      .where(eq(promptTemplates.slug, input.slug))
      .get();

    const nextVersion = (latest?.version ?? 0) + 1;
    const now = new Date();
    const record = {
      id: crypto.randomUUID(),
      slug: input.slug,
      version: nextVersion,
      status: 'draft' as TemplateStatus,
      body: input.body,
      notes: input.notes ?? null,
      metadata: input.metadata ?? null,
      steps: null,
      costLimits: null,
      qualityGate: null,
      createdBy: input.createdBy ?? null,
      promotedBy: null,
      createdAt: now,
      updatedAt: now,
    };

    await client.insert(promptTemplates).values(record);
    return record;
  }

  /**
   * Create a new pipeline-based draft
   */
  async createPipelineDraft(input: CreatePipelineInput): Promise<PromptTemplateRecord> {
    const client = this.getClient();
    const latest = await client
      .select({ version: max(promptTemplates.version).as('version') })
      .from(promptTemplates)
      .where(eq(promptTemplates.slug, input.slug))
      .get();

    const nextVersion = (latest?.version ?? 0) + 1;
    const now = new Date();
    
    // Default cost limits
    const defaultCostLimits: CostLimits = {
      maxCostPerRun: 0.20,
      maxInputTokensPerStep: 4000,
      maxOutputTokensPerStep: 4000,
      abortOnExceed: true,
    };
    
    // Default quality gate
    const defaultQualityGate: QualityGate = {
      minValidationScore: 70,
      returnUnavailableBelow: 50,
      requireValidation: false,
    };

    const record = {
      id: crypto.randomUUID(),
      slug: input.slug,
      version: nextVersion,
      status: 'draft' as TemplateStatus,
      body: null, // Pipelines don't use body
      notes: input.notes ?? null,
      metadata: input.metadata ?? null,
      steps: input.steps,
      costLimits: input.costLimits ?? defaultCostLimits,
      qualityGate: input.qualityGate ?? defaultQualityGate,
      createdBy: input.createdBy ?? null,
      promotedBy: null,
      createdAt: now,
      updatedAt: now,
    };

    await client.insert(promptTemplates).values(record);
    return record;
  }

  /**
   * Update an existing draft's pipeline configuration
   */
  async updatePipelineDraft(
    slug: string,
    version: number,
    updates: Partial<Pick<CreatePipelineInput, 'steps' | 'costLimits' | 'qualityGate' | 'notes'>>
  ): Promise<void> {
    const client = this.getClient();
    
    const existing = await client
      .select()
      .from(promptTemplates)
      .where(and(eq(promptTemplates.slug, slug), eq(promptTemplates.version, version)))
      .get();

    if (!existing) {
      throw new Error(`Template ${slug} v${version} not found`);
    }

    if (existing.status !== 'draft') {
      throw new Error(`Can only update draft templates. Current status: ${existing.status}`);
    }

    await client
      .update(promptTemplates)
      .set({
        ...(updates.steps && { steps: updates.steps }),
        ...(updates.costLimits && { costLimits: updates.costLimits }),
        ...(updates.qualityGate && { qualityGate: updates.qualityGate }),
        ...(updates.notes && { notes: updates.notes }),
        updatedAt: new Date(),
      })
      .where(eq(promptTemplates.id, existing.id));
  }

  async cloneVersion(slug: string, version: number, createdBy?: string) {
    const client = this.getClient();
    const source = await client
      .select()
      .from(promptTemplates)
      .where(and(eq(promptTemplates.slug, slug), eq(promptTemplates.version, version)))
      .get();

    if (!source) {
      throw new Error(`Template ${slug} v${version} not found`);
    }

    // Check if it's a pipeline or legacy template
    if (source.steps && Array.isArray(source.steps)) {
      // Clone as pipeline
      return this.createPipelineDraft({
        slug,
        steps: source.steps as PipelineStep[],
        costLimits: (source.costLimits as CostLimits | null) ?? undefined,
        qualityGate: (source.qualityGate as QualityGate | null) ?? undefined,
        notes: source.notes ?? undefined,
        metadata: (source.metadata as Record<string, unknown> | null) ?? undefined,
        createdBy,
      });
    } else {
      // Clone as legacy
      return this.createDraft({
        slug,
        body: source.body || '',
        notes: source.notes ?? undefined,
        metadata: (source.metadata as Record<string, unknown> | null) ?? undefined,
        createdBy,
      });
    }
  }

  async promoteVersion(input: PromoteInput) {
    const client = this.getClient();
    const target = await client
      .select()
      .from(promptTemplates)
      .where(and(eq(promptTemplates.slug, input.slug), eq(promptTemplates.version, input.version)))
      .get();

    if (!target) {
      throw new Error(`Template ${input.slug} v${input.version} not found`);
    }

    const previousActive = await client
      .select()
      .from(promptTemplates)
      .where(and(eq(promptTemplates.slug, input.slug), eq(promptTemplates.status, 'active')))
      .get();

    if (previousActive) {
      await client
        .update(promptTemplates)
        .set({ status: 'archived', updatedAt: new Date() })
        .where(eq(promptTemplates.id, previousActive.id));
    }

    await client
      .update(promptTemplates)
      .set({
        status: 'active',
        promotedBy: input.changedBy,
        updatedAt: new Date(),
      })
      .where(eq(promptTemplates.id, target.id));

    await client.insert(promptTemplateHistory).values({
      id: crypto.randomUUID(),
      slug: input.slug,
      fromVersion: previousActive?.version ?? null,
      toVersion: input.version,
      reason: input.reason,
      changedBy: input.changedBy,
    });
  }

  async rollback(slug: string, changedBy?: string, reason?: string) {
    const client = this.getClient();
    const lastHistory = await client
      .select()
      .from(promptTemplateHistory)
      .where(eq(promptTemplateHistory.slug, slug))
      .orderBy(desc(promptTemplateHistory.createdAt))
      .limit(1)
      .get();

    const fallbackVersion = lastHistory?.fromVersion;
    if (!fallbackVersion) {
      throw new Error(`No previous version to rollback to for ${slug}`);
    }

    await this.promoteVersion({
      slug,
      version: fallbackVersion,
      reason: reason ?? 'rollback',
      changedBy,
    });
  }

  async getTemplateForGeneration(slug: string, options?: { version?: number }) {
    const client = this.getClient();
    const where = options?.version
      ? and(eq(promptTemplates.slug, slug), eq(promptTemplates.version, options.version))
      : and(eq(promptTemplates.slug, slug), eq(promptTemplates.status, 'active'));

    return client.select().from(promptTemplates).where(where).limit(1).get();
  }
}

