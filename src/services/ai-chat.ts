/**
 * AI Chat Service
 * Dual-model architecture:
 * - DeepSeek Chat: Tool-calling orchestrator (decides what data to fetch)
 * - Qwen Coder 32B: Response generator (creates the final answer)
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, like, and, or, asc, sql } from 'drizzle-orm';
import * as schema from '../schema';
import { createOpenRouterClient, OPENROUTER_MODELS, OPENROUTER_PRICING, getProviders } from './openrouter-client';
import { decideTools, shouldUseOrchestrator, ToolCall } from './ai-orchestrator';
import { logWithContext } from '../utils/logger';

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
  private db: ReturnType<typeof drizzle>;
  private openrouterApiKey: string;
  private requestId: string;

  constructor(d1: D1Database, openrouterApiKey: string, requestId: string) {
    this.db = drizzle(d1, { schema });
    this.openrouterApiKey = openrouterApiKey;
    this.requestId = requestId;
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
    // Use the actual row_num column instead of OFFSET
    const vocab = await this.db.query.vocabulary.findFirst({
      where: eq(schema.vocabulary.rowNum, rowNum),
    });
    
    if (!vocab) return { error: `Vocabulary #${rowNum} not found` };
    
    return {
      rowNum: vocab.rowNum,
      id: vocab.id,
      hanzi: vocab.hanzi,
      pinyin: vocab.pinyin,
      english: vocab.english,
      hskLevel: vocab.hskLevel,
      category: vocab.category,
      example: vocab.exampleChinese ? {
        chinese: vocab.exampleChinese,
        pinyin: vocab.examplePinyin,
        english: vocab.exampleEnglish,
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
      category: story.category,
      sentences: sentences.map(s => ({
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
      stories: stories.map(s => ({
        id: s.id,
        title: s.title,
        hskLevel: s.hskLevel,
        category: s.category,
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
      lessons: lessons.map(l => ({ number: l.lessonNumber, title: l.title, type: l.lessonType })),
      stories: stories.map(s => ({ title: s.title, category: s.category })),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════

  private async loadSavedTuningPrompt(): Promise<string | null> {
    try {
      const settings = await this.db.query.aiAssistantSettings.findFirst({
        where: eq(schema.aiAssistantSettings.id, 'default'),
      });
      return settings?.tuningPrompt || null;
    } catch { return null; }
  }

  private async loadSystemFiles(): Promise<{ name: string; content: string }[]> {
    try {
      const files = await this.db.query.aiSystemFiles.findMany({
        where: eq(schema.aiSystemFiles.isActive, true),
        orderBy: schema.aiSystemFiles.orderIndex,
      });
      return files?.map(f => ({ name: f.name, content: f.content })) || [];
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
