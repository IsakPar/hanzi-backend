import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { jwtAuthMiddleware } from '../middleware/jwt-auth';
import { createPromptsDomain } from '../domains/prompts';
import type { AppEnv } from '../types/app';
import { AnalyticsService } from '../services/analytics';

const app = new Hono<AppEnv>();

app.use('/*', jwtAuthMiddleware({ allowRoles: ['admin'] }));

const getServices = (env: AppEnv['Bindings']) => createPromptsDomain(env);

// Legacy single-prompt schema
const createSchema = z.object({
  slug: z.string().min(1),
  body: z.string().min(1),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Pipeline step schema
const pipelineStepSchema = z.object({
  order: z.number().int().min(1).max(5),
  name: z.string().min(1).max(100),
  modelId: z.string().min(1),
  promptBody: z.string().min(1),
  input: z.object({
    includeTargets: z.boolean().default(true),
    includeGrammar: z.boolean().default(false),
    includeKnownVocab: z.boolean().default(false),
    includePreviousOutput: z.boolean().default(false),
  }),
  output: z.object({
    format: z.enum(['json', 'text']).default('json'),
    schema: z.string().optional(),
  }),
  settings: z.object({
    temperature: z.number().min(0).max(2).default(0.7),
    maxInputTokens: z.number().int().min(100).max(16000).default(4000),
    maxOutputTokens: z.number().int().min(100).max(16000).default(4000),
  }),
  onFailure: z.object({
    fallbackModelId: z.string().optional(),
    maxRetries: z.number().int().min(0).max(3).default(1),
  }).default({}),
});

// Cost limits schema
const costLimitsSchema = z.object({
  maxCostPerRun: z.number().min(0.01).max(10).default(0.20),
  maxInputTokensPerStep: z.number().int().min(100).max(16000).default(4000),
  maxOutputTokensPerStep: z.number().int().min(100).max(16000).default(4000),
  abortOnExceed: z.boolean().default(true),
});

// Quality gate schema
const qualityGateSchema = z.object({
  minValidationScore: z.number().int().min(0).max(100).default(70),
  returnUnavailableBelow: z.number().int().min(0).max(100).default(50),
  requireValidation: z.boolean().default(false),
});

// Pipeline creation schema
const createPipelineSchema = z.object({
  slug: z.string().min(1),
  steps: z.array(pipelineStepSchema).min(1).max(5),
  costLimits: costLimitsSchema.optional(),
  qualityGate: qualityGateSchema.optional(),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Pipeline update schema
const updatePipelineSchema = z.object({
  steps: z.array(pipelineStepSchema).min(1).max(5).optional(),
  costLimits: costLimitsSchema.optional(),
  qualityGate: qualityGateSchema.optional(),
  notes: z.string().optional(),
});

const cloneSchema = z.object({
  version: z.number().int().min(1),
});

const promoteSchema = z.object({
  version: z.number().int().min(1),
  reason: z.string().optional(),
});

const rollbackSchema = z.object({
  reason: z.string().optional(),
});

app.get('/:slug/versions', async (c) => {
  const slug = c.req.param('slug');
  const { prompts } = getServices(c.env);
  const versions = await prompts.listTemplates(slug);
  return c.json({ versions });
});

// Legacy single-prompt creation
app.post('/', zValidator('json', createSchema), async (c) => {
  const input = c.req.valid('json');
  const user = c.get('user');
  const { prompts } = getServices(c.env);
  const analytics = new AnalyticsService(c.env.DB);

  const record = await prompts.createDraft({
    slug: input.slug,
    body: input.body,
    notes: input.notes,
    metadata: input.metadata,
    createdBy: user?.id,
  });

  await analytics.record({
    type: 'prompt.create',
    requestId: c.get('requestId'),
    userId: user?.id,
    metadata: { slug: input.slug, version: record.version },
  });

  return c.json({ template: record }, 201);
});

/**
 * POST /pipeline - Create a new pipeline-based prompt
 */
app.post('/pipeline', zValidator('json', createPipelineSchema), async (c) => {
  const input = c.req.valid('json');
  const user = c.get('user');
  const { prompts } = getServices(c.env);
  const analytics = new AnalyticsService(c.env.DB);

  const record = await prompts.createPipelineDraft({
    slug: input.slug,
    steps: input.steps,
    costLimits: input.costLimits,
    qualityGate: input.qualityGate,
    notes: input.notes,
    metadata: input.metadata,
    createdBy: user?.id,
  });

  await analytics.record({
    type: 'prompt.pipeline.create',
    requestId: c.get('requestId'),
    userId: user?.id,
    metadata: { 
      slug: input.slug, 
      version: record.version,
      stepCount: input.steps.length,
    },
  });

  return c.json({ template: record }, 201);
});

/**
 * PUT /:slug/versions/:version/pipeline - Update a pipeline draft
 */
app.put('/:slug/versions/:version/pipeline', zValidator('json', updatePipelineSchema), async (c) => {
  const slug = c.req.param('slug');
  const version = parseInt(c.req.param('version'), 10);
  const input = c.req.valid('json');
  const user = c.get('user');
  const { prompts } = getServices(c.env);
  const analytics = new AnalyticsService(c.env.DB);

  await prompts.updatePipelineDraft(slug, version, {
    steps: input.steps,
    costLimits: input.costLimits,
    qualityGate: input.qualityGate,
    notes: input.notes,
  });

  await analytics.record({
    type: 'prompt.pipeline.update',
    requestId: c.get('requestId'),
    userId: user?.id,
    metadata: { slug, version },
  });

  return c.json({ success: true });
});

app.post('/:slug/clone', zValidator('json', cloneSchema), async (c) => {
  const slug = c.req.param('slug');
  const { version } = c.req.valid('json');
  const user = c.get('user');
  const { prompts } = getServices(c.env);
  const analytics = new AnalyticsService(c.env.DB);

  const result = await prompts.cloneVersion(slug, version, user?.id);

  await analytics.record({
    type: 'prompt.clone',
    requestId: c.get('requestId'),
    userId: user?.id,
    metadata: { slug, fromVersion: version, newVersion: result.version },
  });

  return c.json({ template: result }, 201);
});

app.post('/:slug/promote', zValidator('json', promoteSchema), async (c) => {
  const slug = c.req.param('slug');
  const body = c.req.valid('json');
  const user = c.get('user');
  const { prompts } = getServices(c.env);
  const analytics = new AnalyticsService(c.env.DB);

  await prompts.promoteVersion({
    slug,
    version: body.version,
    reason: body.reason,
    changedBy: user?.id,
  });

  await analytics.record({
    type: 'prompt.promote',
    requestId: c.get('requestId'),
    userId: user?.id,
    metadata: { slug, version: body.version, reason: body.reason },
  });

  return c.json({ success: true });
});

app.post('/:slug/rollback', zValidator('json', rollbackSchema), async (c) => {
  const slug = c.req.param('slug');
  const { reason } = c.req.valid('json');
  const user = c.get('user');
  const { prompts } = getServices(c.env);
  const analytics = new AnalyticsService(c.env.DB);

  await prompts.rollback(slug, user?.id, reason);

  await analytics.record({
    type: 'prompt.rollback',
    requestId: c.get('requestId'),
    userId: user?.id,
    metadata: { slug, reason },
  });

  return c.json({ success: true });
});

export default app;

