/**
 * AI Chat Service
 * Dual-model architecture:
 * - DeepSeek Chat: Tool-calling orchestrator (decides what data to fetch)
 * - Qwen Coder 32B: Response generator (creates the final answer)
 * 
 * Now with Vectorize for semantic search!
 */

import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import { eq, like, and, or, asc, sql } from 'drizzle-orm';
import type { D1Database, VectorizeIndex, Ai } from '@cloudflare/workers-types';
import * as schema from '../schema';
import { createOpenRouterClient, OPENROUTER_MODELS, OPENROUTER_PRICING, getProviders } from './openrouter-client';
import { decideTools, shouldUseOrchestrator, ToolCall } from './ai-orchestrator';
import { VectorizeService, type EmbeddableType } from './vectorize';
import { logWithContext } from '../utils/logger';
import { AIUsageLogger } from './ai-usage-logger';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export type ChatIntent = 
  | 'lesson_query' | 'lesson_analysis' | 'lesson_generate'
  | 'story_query' | 'story_analysis' | 'story_generate'
  | 'vocabulary_query' | 'curriculum_query' | 'grammar_explain'
  | 'translation' | 'general';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
  explicitContext?: {
    type: 'lesson' | 'story' | 'vocabulary' | 'unit';
    id: string;
    title?: string;
    content?: string;
  }[];
  hskLevel?: number;
  systemPrompt?: string;
}

export interface ChatResponse {
  response: string;
  intent: ChatIntent;
  dataFetched: string[];
  tokensUsed: { input: number; output: number; total: number };
  cost: number;
  latencyMs: number;
}

// ═══════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are 小明 (Xiǎo Míng), an expert Chinese curriculum designer and tutor at HanziMaster.

**Your Knowledge:**
When data is provided in the "📊 Retrieved Data" section below, use it to answer questions accurately.

**Your Personality:**
- Helpful, encouraging, and constructive
- Give specific, actionable feedback
- Use Chinese examples with pinyin and translation
- Be concise but thorough
- Answer in the same language you're spoken to

**Response Format:**
- Use markdown for clarity
- Use Chinese characters with pinyin when demonstrating
- Be direct and helpful`;

// ═══════════════════════════════════════════════════════════
// CHAT SERVICE
// ═══════════════════════════════════════════════════════════

export class AIChatService {
  private db: DrizzleD1Database<typeof schema>;
  private d1: D1Database;
  private openrouterApiKey: string;
  private requestId: string;
  private vectorize: VectorizeService | null;
  private usageLogger: AIUsageLogger;
  private userId?: string;

  constructor(
    d1: D1Database, 
    openrouterApiKey: string, 
    requestId: string,
    vectorizeIndex?: VectorizeIndex,
    ai?: Ai,
    userId?: string
  ) {
    this.db = drizzle(d1, { schema });
    this.d1 = d1;
    this.openrouterApiKey = openrouterApiKey;
    this.requestId = requestId;
    this.userId = userId;
    // Initialize Vectorize if bindings are provided
    this.vectorize = (vectorizeIndex && ai) 
      ? new VectorizeService(vectorizeIndex, ai, requestId) 
      : null;
    // Initialize usage logger
    this.usageLogger = new AIUsageLogger(d1);
  }

  /**
   * Main chat method - Dual model flow
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    const intent = this.detectIntent(request.message);
    const dataFetched: string[] = [];
    let orchestratorCost = 0;
    let orchestratorTokens = 0;

    logWithContext('info', 'ai.chat.start', {
      requestId: this.requestId,
      meta: { intent, messageLength: request.message.length },
    });

    // Load settings
    const effectiveSystemPrompt = request.systemPrompt || 
                                   await this.loadSavedTuningPrompt() || 
                                   SYSTEM_PROMPT;
    const systemFiles = await this.loadSystemFiles();

    // ═══════════════════════════════════════════════════════
    // STAGE 1: DeepSeek Orchestrator (decide what data to fetch)
    // ═══════════════════════════════════════════════════════
    let fetchedData: { label: string; value: any }[] = [];

    if (shouldUseOrchestrator(request.message)) {
      try {
        const orchestratorResult = await decideTools(
          request.message, 
          this.openrouterApiKey, 
          this.requestId
        );
        
        orchestratorCost = orchestratorResult.orchestratorCost;
        orchestratorTokens = orchestratorResult.orchestratorTokens;

        // Execute the tools DeepSeek decided on
        if (orchestratorResult.toolCalls.length > 0) {
          fetchedData = await this.executeTools(orchestratorResult.toolCalls);
          dataFetched.push(...fetchedData.map(d => d.label));
        }
      } catch (err) {
        logWithContext('warn', 'ai.orchestrator.failed', {
          requestId: this.requestId,
          meta: { error: (err as Error).message },
        });
        // Continue without fetched data - Qwen will answer from general knowledge
      }
    }

    // ═══════════════════════════════════════════════════════
    // STAGE 2: Build Qwen prompt with fetched data
    // ═══════════════════════════════════════════════════════
    let fullSystemPrompt = effectiveSystemPrompt;

    // Add system files
    if (systemFiles.length > 0) {
      fullSystemPrompt += '\n\n**📁 Reference Files:**\n';
      for (const file of systemFiles) {
        fullSystemPrompt += `\n--- ${file.name} ---\n${file.content}\n`;
      }
    }

    // Add fetched data
    if (fetchedData.length > 0) {
      fullSystemPrompt += '\n\n**📊 Retrieved Data:**\n';
      for (const data of fetchedData) {
        fullSystemPrompt += `\n${data.label}:\n\`\`\`json\n${JSON.stringify(data.value, null, 2)}\n\`\`\`\n`;
      }
    }

    // Build messages
    const messages: ChatMessage[] = [{ role: 'system', content: fullSystemPrompt }];
    if (request.conversationHistory) {
      messages.push(...request.conversationHistory.slice(-10));
    }
    messages.push({ role: 'user', content: request.message });

    // ═══════════════════════════════════════════════════════
    // STAGE 3: Qwen generates the response
    // ═══════════════════════════════════════════════════════
    try {
      const client = createOpenRouterClient(this.openrouterApiKey);
      
      const completion = await client.chat.completions.create({
        model: OPENROUTER_MODELS.QWEN_CODER_32B,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
        // @ts-ignore
        provider: { order: getProviders(OPENROUTER_MODELS.QWEN_CODER_32B) },
      });

      const responseContent = completion.choices[0]?.message?.content || '';
      const cleanResponse = responseContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

      const inputTokens = completion.usage?.prompt_tokens || 0;
      const outputTokens = completion.usage?.completion_tokens || 0;
      
      const pricing = OPENROUTER_PRICING[OPENROUTER_MODELS.QWEN_CODER_32B];
      const qwenCost = (inputTokens / 1_000_000) * pricing.input + 
                       (outputTokens / 1_000_000) * pricing.output;

      const totalCost = orchestratorCost + qwenCost;
      const totalTokens = orchestratorTokens + inputTokens + outputTokens;
      const latencyMs = Date.now() - startTime;

      logWithContext('info', 'ai.chat.success', {
        requestId: this.requestId,
        meta: { 
          intent, 
          dataFetched, 
          orchestratorTokens,
          qwenTokens: inputTokens + outputTokens,
          totalCost, 
          latencyMs 
        },
      });

      // Log AI usage to database for persistent analytics
      await this.usageLogger.log({
        userId: this.userId,
        sessionId: this.requestId,
        model: OPENROUTER_MODELS.QWEN_CODER_32B,
        endpoint: '/v1/ai/chat',
        inputTokens,
        outputTokens,
        latencyMs,
        success: true,
        metadata: { intent, dataFetched, orchestratorTokens, orchestratorCost },
      });

      return {
        response: cleanResponse,
        intent,
        dataFetched,
        tokensUsed: { 
          input: inputTokens, 
          output: outputTokens, 
          total: totalTokens 
        },
        cost: Math.round(totalCost * 1000000) / 1000000,
        latencyMs,
      };

    } catch (err) {
      logWithContext('error', 'ai.chat.failed', {
        requestId: this.requestId,
        meta: { error: (err as Error).message },
      });
      
      // Log failed attempt
      await this.usageLogger.log({
        userId: this.userId,
        sessionId: this.requestId,
        model: OPENROUTER_MODELS.QWEN_CODER_32B,
        endpoint: '/v1/ai/chat',
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - startTime,
        success: false,
        errorMessage: (err as Error).message,
        metadata: { intent },
      });
      
      throw err;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // TOOL EXECUTION
  // ═══════════════════════════════════════════════════════════

  private async executeTools(toolCalls: ToolCall[]): Promise<{ label: string; value: any }[]> {
    const results: { label: string; value: any }[] = [];

    for (const call of toolCalls) {
      try {
        let result: any = null;
        let label = call.name;

        switch (call.name) {
          case 'lookup_vocabulary':
            if (typeof call.args.id === 'number') {
              result = await this.lookupVocabByRowNumber(call.args.id);
              label = `Vocabulary #${call.args.id}`;
            }
            break;

          case 'search_vocabulary':
            if (typeof call.args.query === 'string') {
              result = await this.searchVocabulary(call.args.query, call.args.hskLevel, call.args.limit);
              label = `Vocabulary search: "${call.args.query}"`;
            }
            break;

          case 'get_lesson':
            if (typeof call.args.lessonNumber === 'number') {
              result = await this.getLesson(call.args.lessonNumber, call.args.hskLevel);
              label = `Lesson ${call.args.lessonNumber}`;
            }
            break;

          case 'list_lessons':
            result = await this.listLessons(call.args.hskLevel, call.args.limit);
            label = call.args.hskLevel ? `HSK ${call.args.hskLevel} Lessons` : 'All Lessons';
            break;

          case 'get_story':
            if (typeof call.args.title === 'string') {
              result = await this.getStoryByTitle(call.args.title);
              label = `Story: "${call.args.title}"`;
            }
            break;

          case 'list_stories':
            result = await this.listStories(call.args.hskLevel, call.args.limit);
            label = call.args.hskLevel ? `HSK ${call.args.hskLevel} Stories` : 'All Stories';
            break;

          case 'get_curriculum_stats':
            result = await this.getCurriculumStats();
            label = 'Curriculum Statistics';
            break;

          case 'get_hsk_overview':
            if (typeof call.args.level === 'number') {
              result = await this.getHSKLevelOverview(call.args.level);
              label = `HSK ${call.args.level} Overview`;
            }
            break;

          // ═══════════════════════════════════════════════════════
          // SEMANTIC SEARCH TOOLS (Vectorize)
          // ═══════════════════════════════════════════════════════
          case 'semantic_search':
            if (this.vectorize && typeof call.args.query === 'string') {
              const searchResults = await this.vectorize.search(call.args.query, {
                type: call.args.type as EmbeddableType | undefined,
                hskLevel: call.args.hskLevel,
                topK: call.args.limit || 10,
              });
              // Fetch full details for top results
              result = await this.enrichSearchResults(searchResults);
              label = `Semantic search: "${call.args.query}"`;
            }
            break;

          case 'find_similar':
            if (this.vectorize && call.args.type && call.args.id) {
              const similarResults = await this.vectorize.findSimilar(
                call.args.type as EmbeddableType,
                call.args.id,
                call.args.limit || 5
              );
              result = await this.enrichSearchResults(similarResults);
              label = `Similar to ${call.args.type}:${call.args.id}`;
            }
            break;
        }

        if (result !== null) {
          results.push({ label, value: result });
        }
      } catch (err) {
        logWithContext('warn', 'ai.tool_execution.failed', {
          requestId: this.requestId,
          meta: { tool: call.name, error: (err as Error).message },
        });
      }
    }

    return results;
  }

  // ═══════════════════════════════════════════════════════════
  // DATA FETCHING METHODS
  // ═══════════════════════════════════════════════════════════

  private async lookupVocabByRowNumber(rowNum: number) {
    // Use OFFSET to simulate row number (1-indexed)
    const vocab = await this.db.query.vocabulary.findMany({
      limit: 1,
      offset: rowNum - 1,
    });
    
    const item = vocab[0];
    if (!item) return { error: `Vocabulary #${rowNum} not found` };
    
    return {
      rowNum: rowNum,
      id: item.id,
      hanzi: item.hanzi,
      pinyin: item.pinyin,
      english: item.english,
      hskLevel: item.hskLevel,
      category: item.category,
      example: item.exampleChinese ? {
        chinese: item.exampleChinese,
        pinyin: item.examplePinyin,
        english: item.exampleEnglish,
      } : null,
    };
  }

  private async searchVocabulary(query: string, hskLevel?: number, limit: number = 10) {
    const searchCondition = or(
      like(schema.vocabulary.hanzi, `%${query}%`),
      like(schema.vocabulary.pinyin, `%${query}%`),
      like(schema.vocabulary.english, `%${query}%`)
    );
    
    const whereCondition = hskLevel 
      ? and(searchCondition, eq(schema.vocabulary.hskLevel, hskLevel))
      : searchCondition;

    const results = await this.db.query.vocabulary.findMany({
      where: whereCondition,
      limit: Math.min(limit, 20),
    });

    return {
      count: results.length,
      results: results.map(v => ({
        id: v.id,
        hanzi: v.hanzi,
        pinyin: v.pinyin,
        english: v.english,
        hskLevel: v.hskLevel,
      })),
    };
  }

  private async getLesson(lessonNumber: number, hskLevel?: number) {
    const conditions = [eq(schema.lessons.lessonNumber, lessonNumber)];
    if (hskLevel) conditions.push(eq(schema.lessons.hskLevel, hskLevel));

    const lesson = await this.db.query.lessons.findFirst({
      where: conditions.length > 1 ? and(...conditions) : conditions[0],
    });

    if (!lesson) return { error: `Lesson ${lessonNumber} not found` };

    const blocks = await this.db.query.lessonBlocks.findMany({
      where: eq(schema.lessonBlocks.lessonId, lesson.id),
      orderBy: asc(schema.lessonBlocks.orderIndex),
    });

    return {
      id: lesson.id,
      title: lesson.title,
      lessonNumber: lesson.lessonNumber,
      hskLevel: lesson.hskLevel,
      lessonType: lesson.lessonType,
      description: lesson.description,
      blocks: blocks.map(b => ({
        type: b.type,
        content: typeof b.content === 'string' ? JSON.parse(b.content) : b.content,
      })),
    };
  }

  private async listLessons(hskLevel?: number, limit: number = 30) {
    const lessons = await this.db.query.lessons.findMany({
      where: hskLevel ? eq(schema.lessons.hskLevel, hskLevel) : undefined,
      orderBy: [asc(schema.lessons.hskLevel), asc(schema.lessons.lessonNumber)],
      limit: Math.min(limit, 50),
    });

    return {
      count: lessons.length,
      lessons: lessons.map(l => ({
        id: l.id,
        number: l.lessonNumber,
        title: l.title,
        hskLevel: l.hskLevel,
        type: l.lessonType,
      })),
    };
  }

  private async getStoryByTitle(title: string) {
    const story = await this.db.query.stories.findFirst({
      where: like(schema.stories.title, `%${title}%`),
    });

    if (!story) return { error: `Story "${title}" not found` };

    const sentences = await this.db.query.storySentences.findMany({
      where: eq(schema.storySentences.storyId, story.id),
      orderBy: asc(schema.storySentences.orderIndex),
      limit: 20,
    });

    return {
      id: story.id,
      title: story.title,
      hskLevel: story.hskLevel,
      topic: story.topic,
      sentences: sentences.map((s: any) => ({
        chinese: s.chinese,
        pinyin: s.pinyin,
        english: s.english,
      })),
    };
  }

  private async listStories(hskLevel?: number, limit: number = 30) {
    const stories = await this.db.query.stories.findMany({
      where: hskLevel ? eq(schema.stories.hskLevel, hskLevel) : undefined,
      limit: Math.min(limit, 50),
    });

    return {
      count: stories.length,
      stories: stories.map((s: any) => ({
        id: s.id,
        title: s.title,
        hskLevel: s.hskLevel,
        topic: s.topic,
      })),
    };
  }

  private async getCurriculumStats() {
    const [vocab, lessons, stories, units] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)` }).from(schema.vocabulary),
      this.db.select({ count: sql<number>`count(*)` }).from(schema.lessons),
      this.db.select({ count: sql<number>`count(*)` }).from(schema.stories),
      this.db.select({ count: sql<number>`count(*)` }).from(schema.units),
    ]);

    return {
      totalVocabulary: vocab[0]?.count || 0,
      totalLessons: lessons[0]?.count || 0,
      totalStories: stories[0]?.count || 0,
      totalUnits: units[0]?.count || 0,
    };
  }

  private async getHSKLevelOverview(level: number) {
    const [vocab, lessons, stories] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)` })
        .from(schema.vocabulary)
        .where(eq(schema.vocabulary.hskLevel, level)),
      this.db.query.lessons.findMany({
        where: eq(schema.lessons.hskLevel, level),
        orderBy: asc(schema.lessons.lessonNumber),
      }),
      this.db.query.stories.findMany({
        where: eq(schema.stories.hskLevel, level),
      }),
    ]);

    return {
      hskLevel: level,
      vocabularyCount: vocab[0]?.count || 0,
      lessons: lessons.map((l: any) => ({ number: l.lessonNumber, title: l.title, type: l.lessonType })),
      stories: stories.map((s: any) => ({ title: s.title, topic: s.topic })),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════

  /**
   * Enrich vector search results with full database details
   */
  private async enrichSearchResults(
    results: Array<{ id: string; score: number; metadata?: { type?: string; id?: string; hanzi?: string; title?: string; hskLevel?: number } }>
  ): Promise<any[]> {
    const enriched: any[] = [];

    for (const result of results.slice(0, 10)) { // Limit to 10 for performance
      const [type, id] = result.id.split(':');
      
      try {
        let details: any = null;

        switch (type) {
          case 'vocabulary':
            details = await this.db.query.vocabulary.findFirst({
              where: eq(schema.vocabulary.id, id),
            });
            if (details) {
              enriched.push({
                type: 'vocabulary',
                score: result.score,
                hanzi: details.hanzi,
                pinyin: details.pinyin,
                english: details.english,
                hskLevel: details.hskLevel,
                example: details.exampleChinese ? {
                  chinese: details.exampleChinese,
                  pinyin: details.examplePinyin,
                  english: details.exampleEnglish,
                } : null,
              });
            }
            break;

          case 'lesson':
            details = await this.db.query.lessons.findFirst({
              where: eq(schema.lessons.id, id),
            });
            if (details) {
              enriched.push({
                type: 'lesson',
                score: result.score,
                id: details.id,
                title: details.title,
                lessonNumber: details.lessonNumber,
                hskLevel: details.hskLevel,
                lessonType: details.lessonType,
                description: details.description,
              });
            }
            break;

          case 'story':
            details = await this.db.query.stories.findFirst({
              where: eq(schema.stories.id, id),
            });
            if (details) {
              enriched.push({
                type: 'story',
                score: result.score,
                id: details.id,
                title: details.title,
                hskLevel: details.hskLevel,
                category: details.category,
              });
            }
            break;

          default:
            // Return raw metadata if type unknown
            enriched.push({
              type,
              score: result.score,
              ...result.metadata,
            });
        }
      } catch (err) {
        // Skip failed lookups
        logWithContext('warn', 'ai.enrich_search_failed', {
          requestId: this.requestId,
          meta: { id: result.id, error: (err as Error).message },
        });
      }
    }

    return enriched;
  }

  private async loadSavedTuningPrompt(): Promise<string | null> {
    try {
      // Use raw SQL since aiAssistantSettings may not be in drizzle schema
      const result = await this.db.all<{ tuning_prompt: string | null }>(
        sql`SELECT tuning_prompt FROM ai_assistant_settings WHERE id = 'default' LIMIT 1`
      );
      return result[0]?.tuning_prompt || null;
    } catch { return null; }
  }

  private async loadSystemFiles(): Promise<{ name: string; content: string }[]> {
    try {
      // Use raw SQL since aiSystemFiles may not be in drizzle schema
      const files = await this.db.all<{ name: string; content: string }>(
        sql`SELECT name, content FROM ai_system_files WHERE is_active = 1 ORDER BY order_index ASC`
      );
      return files || [];
    } catch { return []; }
  }

  private detectIntent(message: string): ChatIntent {
    const lower = message.toLowerCase();
    
    if (/lesson\s*\d+|课\s*\d+/i.test(message)) {
      if (/analyze|review|critique|feedback/i.test(lower)) return 'lesson_analysis';
      if (/create|generate|make|write/i.test(lower)) return 'lesson_generate';
      return 'lesson_query';
    }
    
    if (/story|stories|故事/i.test(message)) {
      if (/analyze|review|critique|feedback/i.test(lower)) return 'story_analysis';
      if (/create|generate|make|write/i.test(lower)) return 'story_generate';
      return 'story_query';
    }
    
    if (/vocab|word|词|字|row|id\s*\d+/i.test(message)) return 'vocabulary_query';
    if (/grammar|语法|explain|how.*use/i.test(message)) return 'grammar_explain';
    if (/translate|翻译|how.*say/i.test(message)) return 'translation';
    if (/curriculum|unit|hsk|level|structure/i.test(message)) return 'curriculum_query';
    
    return 'general';
  }
}

export default AIChatService;
