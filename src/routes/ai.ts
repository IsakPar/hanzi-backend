import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { jwtAuthMiddleware } from '../middleware/jwt-auth';
import { AIService } from '../domains/ai/services/ai.service';
import { RateLimitExceededError } from '../services/rate-limit';
import { AnalyticsService } from '../services/analytics';
import { ModelManagerService } from '../services/model-manager';
import { PipelineExecutor, createLegacyPipeline } from '../services/pipeline-executor';
import { PromptTemplateService } from '../domains/prompts/services/prompt-template.service';
import { AIChatService } from '../services/ai-chat';
import { logWithContext } from '../utils/logger';
import type { AppEnv } from '../types/app';
import type { PipelineStep, CostLimits, QualityGate } from '../schema';
import OpenAI from 'openai';

const app = new Hono<AppEnv>();

app.use('/*', jwtAuthMiddleware({ allowRoles: ['admin'] }));

// Schema for the "Piggyback" Request
const generateSchema = z.object({
  client_seq: z.number(),
  order: z.object({
    targets: z.array(z.string()),
    grammar: z.array(z.string()).optional()
  }),
  sync_updates: z.array(z.object({
    id: z.string(),
    bucket: z.enum(['new', 'weak', 'learning', 'mastered']),
    proficiency: z.number(),
    stability: z.number(),
    lastReview: z.number(), 
  })).optional(),
  prompt: z.object({
    slug: z.string().optional(),
    version: z.number().int().min(1).optional(),
  }).optional()
});

// Schema for testing prompts (supports both legacy and pipeline)
const testPromptSchema = z.object({
  prompt_slug: z.string().min(1),
  prompt_version: z.number().int().min(1).optional(),
  model_id: z.string().optional(), // Override model for legacy prompts
  test_input: z.object({
    targets: z.array(z.string()).min(1),
    grammar: z.array(z.string()).optional(),
    known_vocabulary: z.array(z.string()).optional(), // For i+1 testing
  }),
});

app.post('/generate', zValidator('json', generateSchema), async (c) => {
  const body = c.req.valid('json');
  const requestId = c.req.header('X-Request-ID') || crypto.randomUUID();
  
  // Extract User from Context (set by Auth Middleware)
  const user = c.get('user');
  if (!user || !user.id) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const ai = new AIService();
  const analytics = new AnalyticsService(c.env.DB);

  try {
    const lesson = await ai.generateLesson({
      env: c.env,
      config: c.get('config'),
      userId: user.id,
      requestId,
      clientSeq: body.client_seq,
      order: {
        targets: body.order.targets,
        grammar: body.order.grammar
      },
      syncUpdates: body.sync_updates || [],
      prompt: body.prompt
    });

    return c.json(lesson);
  } catch (err: any) {
    logWithContext('error', 'ai.generate_failed', {
      requestId: c.get('requestId'),
      meta: {
        error: err instanceof Error ? err.message : String(err),
      },
    });
    if (err instanceof RateLimitExceededError) {
      await analytics.record({
        type: 'ai.rate_limit',
        requestId: c.get('requestId'),
        userId: user.id,
        metadata: { reason: err.message },
      });
      return c.json({ error: 'Rate limit exceeded', message: err.message }, err.status);
    }
    return c.json({ error: 'Generation Failed', message: err.message }, 500);
  }
});

/**
 * POST /test-prompt - Test a prompt template without affecting production
 * 
 * Supports both:
 * - Legacy single-prompt templates (uses body field)
 * - Pipeline templates (uses steps array)
 * 
 * Does NOT:
 * - Count against rate limits
 * - Sync user knowledge
 * - Record in production usage stats
 */
app.post('/test-prompt', zValidator('json', testPromptSchema), async (c) => {
  const body = c.req.valid('json');
  const requestId = `test_${crypto.randomUUID()}`;
  const startTime = Date.now();

  const user = c.get('user');
  if (!user || !user.id) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const config = c.get('config');
  const db = c.env.DB;
  const modelManager = new ModelManagerService(db);
  const promptService = new PromptTemplateService(db);
  const analytics = new AnalyticsService(db);

  try {
    // 1. Get the prompt template
    const promptRecord = await promptService.getTemplateForGeneration(body.prompt_slug, {
      version: body.prompt_version,
    });

    if (!promptRecord) {
      const versionInfo = body.prompt_version 
        ? `v${body.prompt_version}` 
        : 'active version';
      return c.json({ 
        error: 'Prompt not found', 
        message: `No ${versionInfo} found for slug "${body.prompt_slug}"` 
      }, 404);
    }

    logWithContext('info', 'ai.test_prompt_start', {
      requestId,
      meta: {
        promptSlug: body.prompt_slug,
        promptVersion: promptRecord.version,
        isPipeline: !!(promptRecord.steps && Array.isArray(promptRecord.steps)),
        targets: body.test_input.targets,
      },
    });

    // 2. Check if this is a pipeline or legacy prompt
    const isPipeline = promptRecord.steps && Array.isArray(promptRecord.steps) && promptRecord.steps.length > 0;

    if (isPipeline) {
      // ========== PIPELINE EXECUTION ==========
      const executor = new PipelineExecutor(
        db,
        config.secrets.openAIApiKey,
        config.openaiBaseUrl,
        requestId
      );

      const result = await executor.execute({
        db,
        openaiApiKey: config.secrets.openAIApiKey,
        openaiBaseUrl: config.openaiBaseUrl,
        requestId,
        steps: promptRecord.steps as PipelineStep[],
        input: {
          targets: body.test_input.targets,
          grammar: body.test_input.grammar,
          knownVocabulary: body.test_input.known_vocabulary,
        },
        costLimits: (promptRecord.costLimits as CostLimits) || undefined,
        qualityGate: (promptRecord.qualityGate as QualityGate) || undefined,
      });

      // Record analytics
      await analytics.record({
        type: 'ai.test_pipeline',
        requestId,
        userId: user.id,
        metadata: {
          promptSlug: body.prompt_slug,
          promptVersion: promptRecord.version,
          stepCount: result.steps.length,
          totalCost: result.totalCost,
          totalTokens: result.totalTokens,
          latencyMs: result.totalLatencyMs,
          success: result.success,
          qualityScore: result.qualityScore,
        },
      });

      return c.json({
        success: result.success,
        is_pipeline: true,
        output: result.finalOutput,
        steps: result.steps.map(s => ({
          order: s.stepOrder,
          name: s.stepName,
          status: s.status,
          model_used: s.modelUsed,
          output: s.output,
          error: s.error,
          tokens: s.tokens,
          cost: Math.round(s.cost * 10000) / 10000,
          latency_ms: s.latencyMs,
          retry_count: s.retryCount,
        })),
        debug: {
          request_id: requestId,
          prompt_slug: body.prompt_slug,
          prompt_version: promptRecord.version,
          prompt_status: promptRecord.status,
          total_tokens: result.totalTokens,
          total_cost: Math.round(result.totalCost * 10000) / 10000,
          total_latency_ms: result.totalLatencyMs,
          quality_score: result.qualityScore,
          abort_reason: result.abortReason,
        },
      });

    } else {
      // ========== LEGACY SINGLE-PROMPT EXECUTION ==========
      
      // Determine which model to use
      let modelToUse = body.model_id;
      if (!modelToUse) {
        const activeModel = await modelManager.getActiveModel();
        modelToUse = activeModel?.id || config.defaultModel || 'gpt-4o';
      }

      // Verify model exists if specified
      if (body.model_id) {
        const models = await modelManager.getAllModels();
        const modelExists = models.some(m => m.id === body.model_id);
        if (!modelExists) {
          return c.json({ 
            error: 'Model not found', 
            message: `Model "${body.model_id}" is not registered` 
          }, 404);
        }
      }

      // Build the test prompt
      const systemPrompt = promptRecord.body || `
        You are an expert Chinese Language Tutor.
        Generate a lesson JSON strictly following the schema below.
        
        CONSTRAINTS:
        1. You may ONLY use words from this list: ${JSON.stringify(body.test_input.targets)}.
        2. You MUST use these Target words: ${JSON.stringify(body.test_input.targets)}.
        3. The story must be coherent and use HSK 1 grammar.
        4. Return ONLY valid JSON.

        SCHEMA:
        {
          "title": "Lesson Title",
          "blocks": [
            { "type": "hero", "content": { "title": "...", "subtitle": "..." } },
            { "type": "vocabulary", "content": { "items": [{ "hanzi": "...", "pinyin": "...", "meaning": "..." }] } },
            { "type": "reading", "content": { "title": "...", "text": "...", "pinyin": "...", "segmentedContent": [] } },
            { "type": "quiz", "content": { "questions": [{ "question": "...", "options": [], "answer": "..." }] } }
          ]
        }
      `;

      // Replace template variables
      const processedPrompt = systemPrompt
        .replace(/\{\{targets\}\}/g, JSON.stringify(body.test_input.targets))
        .replace(/\{\{grammar\}\}/g, JSON.stringify(body.test_input.grammar || []))
        .replace(/\{\{known_vocabulary\}\}/g, JSON.stringify(body.test_input.known_vocabulary || []))
        .replace(/\{\{context\}\}/g, JSON.stringify(body.test_input.targets));

      // Call the AI
      const openai = new OpenAI({
        apiKey: config.secrets.openAIApiKey,
        baseURL: config.openaiBaseUrl
      });

      const completion = await openai.chat.completions.create({
        model: modelToUse,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: processedPrompt },
          { role: "user", content: `Create a lesson about: ${body.test_input.targets.join(', ')}` }
        ],
        temperature: 0.7,
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("Empty AI Response");
      }

      // Parse and validate output
      let output;
      try {
        output = JSON.parse(content);
      } catch {
        throw new Error("AI returned invalid JSON");
      }

      // Calculate costs
      const inputTokens = completion.usage?.prompt_tokens || 0;
      const outputTokens = completion.usage?.completion_tokens || 0;
      const totalTokens = completion.usage?.total_tokens || 0;
      const latencyMs = Date.now() - startTime;

      // Get model cost info
      const models = await modelManager.getAllModels();
      const modelInfo = models.find(m => m.id === modelToUse);
      let estimatedCost = 0;
      if (modelInfo) {
        const inputCost = (inputTokens / 1000) * (modelInfo.costPer1kInput || 0);
        const outputCost = (outputTokens / 1000) * (modelInfo.costPer1kOutput || 0);
        estimatedCost = inputCost + outputCost;
      }

      // Record analytics
      await analytics.record({
        type: 'ai.test_prompt',
        requestId,
        userId: user.id,
        metadata: {
          promptSlug: body.prompt_slug,
          promptVersion: promptRecord.version,
          model: modelToUse,
          tokens: totalTokens,
          latencyMs,
          estimatedCost,
          success: true,
        },
      });

      logWithContext('info', 'ai.test_prompt_success', {
        requestId,
        meta: {
          promptSlug: body.prompt_slug,
          promptVersion: promptRecord.version,
          model: modelToUse,
          tokens: totalTokens,
          latencyMs,
        },
      });

      return c.json({
        success: true,
        is_pipeline: false,
        output,
        prompt_used: {
          body: processedPrompt.substring(0, 500) + (processedPrompt.length > 500 ? '...' : ''),
          full_length: processedPrompt.length,
        },
        debug: {
          request_id: requestId,
          model_used: modelToUse,
          prompt_slug: body.prompt_slug,
          prompt_version: promptRecord.version,
          prompt_status: promptRecord.status,
          tokens: {
            input: inputTokens,
            output: outputTokens,
            total: totalTokens,
          },
          latency_ms: latencyMs,
          estimated_cost: Math.round(estimatedCost * 10000) / 10000,
        },
      });
    }

  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    
    logWithContext('error', 'ai.test_prompt_failed', {
      requestId,
      meta: {
        error: err.message || String(err),
        promptSlug: body.prompt_slug,
      },
    });

    await analytics.record({
      type: 'ai.test_prompt',
      requestId,
      userId: user.id,
      metadata: {
        promptSlug: body.prompt_slug,
        promptVersion: body.prompt_version,
        model: body.model_id,
        error: err.message,
        success: false,
      },
    });

    return c.json({
      success: false,
      error: 'Test failed',
      message: err.message || String(err),
      debug: {
        request_id: requestId,
        latency_ms: latencyMs,
      },
    }, 500);
  }
});

/**
 * GET /models - Get available models for testing
 * Returns list of registered models for the test UI
 */
app.get('/models', async (c) => {
  const modelManager = new ModelManagerService(c.env.DB);
  
  try {
    const [models, activeModel] = await Promise.all([
      modelManager.getAllModels(),
      modelManager.getActiveModel(),
    ]);

    return c.json({
      models: models.map(m => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
        tier: m.tier,
        cost_per_1k_input: m.costPer1kInput,
        cost_per_1k_output: m.costPer1kOutput,
        is_active: m.isActive,
      })),
      active_model_id: activeModel?.id || null,
    });
  } catch (err: any) {
    return c.json({ error: 'Failed to fetch models', message: err.message }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// AI CHAT (with Vectorize semantic search)
// ═══════════════════════════════════════════════════════════

const chatSchema = z.object({
  message: z.string().min(1).max(5000),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
  explicitContext: z.array(z.object({
    type: z.enum(['lesson', 'story', 'vocabulary', 'unit']),
    id: z.string(),
    title: z.string().optional(),
    content: z.string().optional(),
  })).optional(),
  hskLevel: z.number().int().min(1).max(9).optional(),
  systemPrompt: z.string().optional(),
});

/**
 * POST /chat - AI Chat with semantic search
 * Uses dual-model architecture + Vectorize for context retrieval
 */
app.post('/chat', zValidator('json', chatSchema), async (c) => {
  const body = c.req.valid('json');
  const requestId = c.get('requestId');
  const config = c.get('config');
  
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    // Create chat service with Vectorize bindings
    const chatService = new AIChatService(
      c.env.DB,
      config.secrets.openRouterApiKey || config.secrets.openAIApiKey,
      requestId,
      c.env.VECTORIZE, // Vectorize index
      c.env.AI         // Workers AI for embeddings
    );

    const result = await chatService.chat({
      message: body.message,
      conversationHistory: body.conversationHistory,
      explicitContext: body.explicitContext,
      hskLevel: body.hskLevel,
      systemPrompt: body.systemPrompt,
    });

    return c.json({
      response: result.response,
      meta: {
        intent: result.intent,
        dataFetched: result.dataFetched,
        tokensUsed: result.tokensUsed.total,
        cost: result.cost,
        latencyMs: result.latencyMs,
        contextUsed: result.dataFetched,
      },
    });

  } catch (err: any) {
    logWithContext('error', 'ai.chat.failed', {
      requestId,
      meta: { error: err.message || String(err) },
    });
    
    return c.json({ 
      error: 'Chat failed', 
      message: err.message || 'Unknown error' 
    }, 500);
  }
});

export default app;
