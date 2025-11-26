import { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { userKnowledgeSnapshot, vocabulary } from '../../../schema';
import { and, eq, inArray, lte, sql } from 'drizzle-orm';
import OpenAI from 'openai';
import { RateLimitExceededError, RateLimitService } from '../../../services/rate-limit';
import { ModelManagerService } from '../../../services/model-manager';
import { PromptTemplateService } from '../../prompts/services/prompt-template.service';
import { z } from 'zod';
import type { RuntimeConfig } from '../../../config/runtime';
import { logWithContext } from '../../../utils/logger';
import { AnalyticsService } from '../../../services/analytics';

export interface GenerateLessonRequest {
  env: {
    DB: D1Database;
  };
  config: RuntimeConfig;
  userId: string;
  requestId: string;
  clientSeq: number;
  order: {
    targets: string[]; 
    grammar?: string[];
  };
  syncUpdates: {
    id: string;
    bucket: 'new' | 'weak' | 'learning' | 'mastered';
    proficiency: number;
    stability: number;
    lastReview: number;
  }[];
  prompt?: {
    slug?: string;
    version?: number;
  };
}

// Schema for AI Output Validation
const lessonOutputSchema = z.object({
  title: z.string(),
  blocks: z.array(z.object({
    type: z.enum(['hero', 'vocabulary', 'reading', 'quiz']),
    content: z.record(z.any())
  }))
});

export class AIService {
  private static readonly DEFAULT_PROMPT_SLUG = 'lesson_default';
  
  async generateLesson(req: GenerateLessonRequest) {
    const startTime = Date.now();
    const db = req.env.DB;
    const d1 = drizzle(db);
    
    const limiter = new RateLimitService(db, req.config.rateLimits);
    const modelManager = new ModelManagerService(db);
    const analytics = new AnalyticsService(db);
    const promptService = new PromptTemplateService(db);

    // 0. RATE LIMIT CHECK
    const reservation = await limiter.reserveRequest(req.userId);
    if (!reservation.allowed) {
      throw new RateLimitExceededError(reservation.reason || 'Daily limit reached');
    }

    // 1. ATOMIC SYNC (Wrapped in try-catch for transaction safety)
    if (req.syncUpdates.length > 0) {
      try {
        const updates = req.syncUpdates.map(u => ({
          userId: req.userId,
          atomId: u.id,
          bucket: u.bucket,
          proficiency: u.proficiency,
          stability: u.stability,
          lastReview: new Date(u.lastReview),
          updatedAt: new Date(),
        }));

        // D1 doesn't support traditional transactions, but we use batch upsert
        // which is atomic within itself
        await d1.insert(userKnowledgeSnapshot)
          .values(updates)
          .onConflictDoUpdate({
            target: [userKnowledgeSnapshot.userId, userKnowledgeSnapshot.atomId],
            set: {
              bucket: sql`excluded.bucket`,
              proficiency: sql`excluded.proficiency`,
              stability: sql`excluded.stability`,
              lastReview: sql`excluded.last_review`,
              updatedAt: sql`excluded.updated_at`,
            }
          });
      } catch (syncError: any) {
        logWithContext('error', 'ai.sync_failed', {
          requestId: req.requestId,
          meta: { error: (syncError as Error).message },
        });
        throw new Error(`Failed to sync user knowledge: ${syncError.message}`);
      }
    }

    // 2. SMART CONTEXT SELECTION
    let targetCategories: string[] = [];
    if (req.order.targets.length > 0) {
      const targetMeta = await d1.select({ category: vocabulary.category })
        .from(vocabulary)
        .where(inArray(vocabulary.id, req.order.targets))
        .execute();
      targetCategories = targetMeta.map(m => m.category);
    }

    const contextWords: string[] = [];

    if (targetCategories.length > 0) {
      try {
        const categoryRows = await d1
          .select({ atomId: userKnowledgeSnapshot.atomId })
          .from(userKnowledgeSnapshot)
          .innerJoin(vocabulary, eq(userKnowledgeSnapshot.atomId, vocabulary.id))
          .where(
            and(
              eq(userKnowledgeSnapshot.userId, req.userId),
              eq(userKnowledgeSnapshot.bucket, 'mastered'),
              inArray(vocabulary.category, targetCategories)
            )
          )
          .orderBy(sql`RANDOM()`)
          .limit(15)
          .all();

        contextWords.push(...categoryRows.map((row) => row.atomId));
      } catch (e) {
        logWithContext('warn', 'ai.context_query_failed', {
          requestId: req.requestId,
          meta: { error: (e as Error).message },
        });
      }
    }

    try {
      const hskRows = await d1
        .select({ atomId: userKnowledgeSnapshot.atomId })
        .from(userKnowledgeSnapshot)
        .innerJoin(vocabulary, eq(userKnowledgeSnapshot.atomId, vocabulary.id))
        .where(
          and(
            eq(userKnowledgeSnapshot.userId, req.userId),
            eq(userKnowledgeSnapshot.bucket, 'mastered'),
            lte(vocabulary.hskLevel, 2)
          )
        )
        .orderBy(sql`RANDOM()`)
        .limit(25)
        .all();

      contextWords.push(...hskRows.map((row) => row.atomId));
    } catch (e) {
      logWithContext('warn', 'ai.context_query_failed', {
        requestId: req.requestId,
        meta: { error: (e as Error).message },
      });
    }

    if (contextWords.length === 0) {
      const fallbackRows = await d1
        .select({ atomId: userKnowledgeSnapshot.atomId })
        .from(userKnowledgeSnapshot)
        .where(
          and(
            eq(userKnowledgeSnapshot.userId, req.userId),
            eq(userKnowledgeSnapshot.bucket, 'mastered')
          )
        )
        .orderBy(sql`RANDOM()`)
        .limit(40)
        .all();

      contextWords.push(...fallbackRows.map((row) => row.atomId));
    }

    const allowedVocab = [...new Set([...contextWords, ...req.order.targets])];

    // 3. GET ACTIVE MODEL
    const activeModel = await modelManager.getActiveModel();
    const modelToUse = activeModel?.id || req.config.defaultModel || 'gpt-4o';
    
    logWithContext('info', 'ai.model_selected', {
      requestId: req.requestId,
      meta: { model: modelToUse },
    });

    // 4. AI GENERATION
    const openai = new OpenAI({
      apiKey: req.config.secrets.openAIApiKey,
      baseURL: req.config.openaiBaseUrl
    });

    const promptSlug = req.prompt?.slug || AIService.DEFAULT_PROMPT_SLUG;
    const promptRecord = await promptService.getTemplateForGeneration(promptSlug, {
      version: req.prompt?.version,
    });

    if (req.prompt?.version && !promptRecord) {
      throw new Error(`Prompt ${promptSlug} v${req.prompt.version} not found`);
    }

    const systemPrompt = promptRecord?.body || `
      You are an expert Chinese Language Tutor.
      Generate a lesson JSON strictly following the schema below.
      
      CONSTRAINTS:
      1. You may ONLY use words from this list: ${JSON.stringify(allowedVocab)}.
      2. You MUST use these Target words: ${JSON.stringify(req.order.targets)}.
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

    let inputTokens = 0;
    let outputTokens = 0;
    let totalTokens = 0;
    let success = false;
    let errorMessage: string | undefined;

    try {
      const completion = await openai.chat.completions.create({
        model: modelToUse, 
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create a lesson about: ${req.order.targets.join(', ')}` }
        ],
        temperature: 0.7,
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error("Empty AI Response");

      // Get token usage
      inputTokens = completion.usage?.prompt_tokens || 0;
      outputTokens = completion.usage?.completion_tokens || 0;
      totalTokens = completion.usage?.total_tokens || 0;

      const rawLesson = JSON.parse(content);
      
      // 5. VALIDATE SCHEMA (Safety Layer)
      const lesson = lessonOutputSchema.parse(rawLesson);

      success = true;

      // Inject ID and Metadata
      const result = {
        ...lesson,
        id: `gen_${req.requestId}`,
        debug: { 
          contextSize: allowedVocab.length, 
          tokens: totalTokens,
          model: modelToUse,
          latency_ms: Date.now() - startTime,
          prompt: {
            slug: promptSlug,
            version: promptRecord?.version ?? null,
          },
        }
      };

      // 6. TRACK USAGE (after success)
      const latencyMs = Date.now() - startTime;
      await Promise.all([
        modelManager.trackUsage({
          userId: req.userId,
          requestId: req.requestId,
          modelUsed: modelToUse,
          inputTokens,
          outputTokens,
          latencyMs,
          success: true,
          promptSlug,
          promptVersion: promptRecord?.version ?? null,
        }),
        analytics.record({
          type: 'ai.lesson.success',
          requestId: req.requestId,
          userId: req.userId,
          metadata: {
            model: modelToUse,
            tokens: totalTokens,
            latencyMs,
            promptSlug,
            promptVersion: promptRecord?.version ?? null,
          },
        }),
      ]);

      const tokenResult = await limiter.recordTokens(req.userId, totalTokens);
      if (!tokenResult.allowed) {
        throw new RateLimitExceededError(tokenResult.reason || 'Daily token limit reached');
      }

      return result;

    } catch (e: any) {
      success = false;
      errorMessage = e.message || String(e);

      logWithContext('error', 'ai.generate_failed', {
        requestId: req.requestId,
        meta: { error: errorMessage },
      });

      // Track failed usage
      const latencyMs = Date.now() - startTime;
      await Promise.all([
        modelManager.trackUsage({
          userId: req.userId,
          requestId: req.requestId,
          modelUsed: modelToUse,
          inputTokens,
          outputTokens,
          latencyMs,
          success: false,
          errorMessage,
          promptSlug,
          promptVersion: promptRecord?.version ?? null,
        }),
        analytics.record({
          type: 'ai.lesson.error',
          requestId: req.requestId,
          userId: req.userId,
          metadata: {
            model: modelToUse,
            error: errorMessage,
            promptSlug,
            promptVersion: promptRecord?.version ?? null,
          },
        }),
      ]);

      // Enhance error message
      if (e instanceof RateLimitExceededError) {
        throw e;
      }
      if (e instanceof z.ZodError) {
        throw new Error("AI Response Validation Failed: " + JSON.stringify(e.issues));
      }
      throw new Error("AI Gen Failed: " + (e.message || e));
    }
  }
}