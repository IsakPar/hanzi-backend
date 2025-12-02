/**
 * i+1 Lesson Generator Service
 * 
 * Orchestrates lesson generation with true i+1 compliance:
 * 1. Qwen3 32B generates text with focus words (generation)
 * 2. Python validator checks all words are lesson-appropriate
 * 3. Retry with feedback if validation fails
 * 4. DeepSeek R1 32B polishes final output (validation/quality)
 * 
 * Uses OpenRouter as the AI provider.
 */

import { logWithContext } from '../utils/logger';
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { PromptTemplateService } from '../domains/prompts/services/prompt-template.service';
import {
  createOpenRouterClient,
  OPENROUTER_MODELS,
  estimateOpenRouterCost,
  getProviders,
} from './openrouter-client';
import { LessonCacheService } from './lesson-cache';
import { MIN_LESSON_FOR_AI } from '../types/lesson-cache';
import { AIUsageLogger } from './ai-usage-logger';
import type OpenAI from 'openai';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface GenerateLessonInput {
  lessonNumber: number;
  focusWords: string[];
  grammarPoint?: string;
  hskLevel: number;
  textLength?: number; // Default: 250 for HSK1
}

export interface ValidatorResponse {
  valid: boolean;
  invalidWords?: {
    word: string;
    lessonId: number;
    reason: string;
  }[];
  suggestion?: string;
}

export interface GeneratedLesson {
  chinese: string;
  pinyin: string;
  english: string;
  focusWordsUsed: string[];
  grammarUsed?: string;
}

export interface GenerationResult {
  success: boolean;
  lesson?: GeneratedLesson;
  error?: string;
  attempts: number;
  validatorPassed: boolean;
  finalModel: string;
  cost: number;
  latencyMs: number;
  fromCache?: boolean;
  requiresCache?: boolean;
}

interface GeneratorConfig {
  db: D1Database;
  bucket: R2Bucket;
  openrouterApiKey: string;
  validatorUrl: string;
  requestId: string;
}

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const MAX_RETRIES = 3;
const PROMPT_SLUG = 'i1-lesson-generator';

// Note: MIN_LESSON_FOR_AI imported from types/lesson-cache.ts

// Text length by HSK level
const TEXT_LENGTH_BY_HSK: Record<number, number> = {
  1: 250,
  2: 350,
  3: 500,
  4: 700,
  5: 900,
  6: 1100,
  7: 1300,
  8: 1500,
  9: 1800,
};

// ═══════════════════════════════════════════════════════════
// GENERATOR CLASS
// ═══════════════════════════════════════════════════════════

export class LessonGenerator {
  private openrouter: OpenAI;
  private validatorUrl: string;
  private requestId: string;
  private db: D1Database;
  private bucket: R2Bucket;
  private promptService: PromptTemplateService;
  private cacheService: LessonCacheService;
  private usageLogger: AIUsageLogger;

  constructor(config: GeneratorConfig) {
    this.openrouter = createOpenRouterClient(config.openrouterApiKey);
    this.validatorUrl = config.validatorUrl;
    this.requestId = config.requestId;
    this.db = config.db;
    this.bucket = config.bucket;
    this.promptService = new PromptTemplateService(config.db);
    this.cacheService = new LessonCacheService(config.bucket, config.requestId);
    this.usageLogger = new AIUsageLogger(config.db);
  }

  async generate(input: GenerateLessonInput): Promise<GenerationResult> {
    const startTime = Date.now();
    let attempts = 0;
    let totalCost = 0;
    let lastError: string | undefined;
    let feedbackWords: string[] = [];

    const textLength = input.textLength || TEXT_LENGTH_BY_HSK[input.hskLevel] || 250;

    logWithContext('info', 'lesson_generator.start', {
      requestId: this.requestId,
      meta: {
        lessonNumber: input.lessonNumber,
        focusWords: input.focusWords,
        hskLevel: input.hskLevel,
        textLength,
        provider: 'openrouter',
      },
    });

    // ═══════════════════════════════════════════════════════════
    // CACHE CHECK FOR EARLY LESSONS
    // ═══════════════════════════════════════════════════════════
    
    if (input.lessonNumber < MIN_LESSON_FOR_AI) {
      logWithContext('info', 'lesson_generator.checking_cache', {
        requestId: this.requestId,
        meta: { lessonNumber: input.lessonNumber, reason: 'early_lesson' },
      });

      // Try to get from cache
      const cached = await this.cacheService.get(input.lessonNumber, input.focusWords);
      
      if (cached && cached.status === 'approved') {
        logWithContext('info', 'lesson_generator.cache_hit', {
          requestId: this.requestId,
          meta: { 
            lessonNumber: input.lessonNumber, 
            cacheId: cached.id,
            version: cached.version,
          },
        });

        return {
          success: true,
          lesson: {
            chinese: cached.chinese,
            pinyin: cached.pinyin,
            english: cached.english,
            focusWordsUsed: cached.focusWords,
          },
          attempts: 0,
          validatorPassed: true,
          finalModel: 'cache',
          cost: 0,
          latencyMs: Date.now() - startTime,
          fromCache: true,
        };
      }

      // No approved cache for early lesson
      logWithContext('warn', 'lesson_generator.cache_miss_early_lesson', {
        requestId: this.requestId,
        meta: { 
          lessonNumber: input.lessonNumber,
          hasDraft: cached?.status === 'draft',
        },
      });

      return {
        success: false,
        error: `Lesson ${input.lessonNumber} requires pre-generated content. ` +
               `Early lessons (1-${MIN_LESSON_FOR_AI - 1}) need human-crafted content ` +
               `due to limited vocabulary. Please use the Lesson Cache Manager to create ` +
               `and approve content for this lesson.`,
        attempts: 0,
        validatorPassed: false,
        finalModel: 'none',
        cost: 0,
        latencyMs: Date.now() - startTime,
        requiresCache: true,
      };
    }

    // ═══════════════════════════════════════════════════════════
    // AI GENERATION FOR LESSONS >= MIN_LESSON_FOR_AI
    // ═══════════════════════════════════════════════════════════

    // Fetch allowed vocabulary (words from lesson 1 to current lesson)
    const allowedVocab = await this.fetchAllowedVocabulary(input.lessonNumber);
    
    logWithContext('info', 'lesson_generator.vocabulary_loaded', {
      requestId: this.requestId,
      meta: {
        allowedWords: allowedVocab.length,
        lessonNumber: input.lessonNumber,
      },
    });

    // Load prompt from DB (or use fallback)
    const promptRecord = await this.promptService.getTemplateForGeneration(PROMPT_SLUG);
    const systemPrompt = promptRecord?.body || this.getDefaultPrompt();

    // ═══════════════════════════════════════════════════════════
    // GENERATION LOOP
    // ═══════════════════════════════════════════════════════════

    while (attempts < MAX_RETRIES) {
      attempts++;

      try {
        // Step 1: Generate with Qwen Coder 32B (generation model)
        const { text: generatedText, inputTokens, outputTokens } = await this.callQwenCoder(
          systemPrompt,
          input,
          textLength,
          feedbackWords,
          allowedVocab
        );
        const genCost = estimateOpenRouterCost(OPENROUTER_MODELS.QWEN_CODER_32B, inputTokens, outputTokens);
        totalCost += genCost;

        // Log generation to AI usage tracker
        await this.usageLogger.log({
          sessionId: this.requestId,
          model: OPENROUTER_MODELS.QWEN_CODER_32B,
          endpoint: 'lesson-generator',
          inputTokens,
          outputTokens,
          cost: genCost,
          success: true,
          requestType: 'lesson_generation',
          metadata: {
            lessonNumber: input.lessonNumber,
            hskLevel: input.hskLevel,
            attempt: attempts,
          },
        });

        logWithContext('info', 'lesson_generator.qwen_coder_response', {
          requestId: this.requestId,
          meta: {
            hasChinese: !!generatedText.chinese,
            hasPinyin: !!generatedText.pinyin,
            hasEnglish: !!generatedText.english,
            chineseLength: generatedText.chinese?.length || 0,
            inputTokens,
            outputTokens,
          },
        });

        // Validate we got a proper response
        if (!generatedText.chinese || generatedText.chinese.length === 0) {
          throw new Error(`Qwen Coder did not return Chinese text. Got: ${JSON.stringify(generatedText)}`);
        }

        // Step 2: Validate with Python service
        const validation = await this.callValidator({
          text: generatedText.chinese,
          lessonNumber: input.lessonNumber,
          focusWords: input.focusWords,
          hskLevel: input.hskLevel,
        });

        if (validation.valid) {
          // Step 3: Polish with Qwen Coder (validation prompt)
          const { lesson: polished, inputTokens: polishIn, outputTokens: polishOut } = 
            await this.callValidation(generatedText, input);
          const polishCost = estimateOpenRouterCost(OPENROUTER_MODELS.QWEN_CODER_32B, polishIn, polishOut);
          totalCost += polishCost;

          // Log polish step to AI usage tracker
          await this.usageLogger.log({
            sessionId: this.requestId,
            model: OPENROUTER_MODELS.QWEN_CODER_32B,
            endpoint: 'lesson-generator',
            inputTokens: polishIn,
            outputTokens: polishOut,
            cost: polishCost,
            success: true,
            requestType: 'lesson_polish',
            metadata: {
              lessonNumber: input.lessonNumber,
              hskLevel: input.hskLevel,
              attempt: attempts,
            },
          });

          logWithContext('info', 'lesson_generator.success', {
            requestId: this.requestId,
            meta: {
              attempts,
              latencyMs: Date.now() - startTime,
              cost: totalCost,
              provider: 'openrouter',
            },
          });

          return {
            success: true,
            lesson: polished,
            attempts,
            validatorPassed: true,
            finalModel: OPENROUTER_MODELS.QWEN_CODER_32B,
            cost: totalCost,
            latencyMs: Date.now() - startTime,
          };
        }

        // Validation failed - collect feedback for retry
        feedbackWords = validation.invalidWords?.map(w => w.word) || [];
        lastError = `Invalid words: ${feedbackWords.join(', ')}`;

        logWithContext('warn', 'lesson_generator.validation_failed', {
          requestId: this.requestId,
          meta: {
            attempt: attempts,
            invalidWords: feedbackWords,
            suggestion: validation.suggestion,
          },
        });

      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        logWithContext('error', 'lesson_generator.attempt_failed', {
          requestId: this.requestId,
          meta: { attempt: attempts, error: lastError },
        });
      }
    }

    // All retries exhausted
    logWithContext('error', 'lesson_generator.failed', {
      requestId: this.requestId,
      meta: { attempts, lastError },
    });

    return {
      success: false,
      error: lastError || 'Max retries exceeded',
      attempts,
      validatorPassed: false,
      finalModel: OPENROUTER_MODELS.QWEN_CODER_32B,
      cost: totalCost,
      latencyMs: Date.now() - startTime,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════

  /**
   * Fetch allowed vocabulary from Sevalla (words from lesson 1 to current)
   */
  private async fetchAllowedVocabulary(lessonNumber: number): Promise<string[]> {
    try {
      const response = await fetch(`${this.validatorUrl}/get-vocabulary?max_lesson=${lessonNumber}`);
      if (response.ok) {
        const data = await response.json() as { words: string[] };
        return data.words || [];
      }
    } catch (err) {
      logWithContext('warn', 'lesson_generator.vocab_fetch_failed', {
        requestId: this.requestId,
        meta: { error: (err as Error).message },
      });
    }
    return [];
  }

  /**
   * Generate content with Qwen Coder 32B
   */
  private async callQwenCoder(
    systemPrompt: string,
    input: GenerateLessonInput,
    textLength: number,
    excludeWords: string[],
    allowedVocab: string[]
  ): Promise<{
    text: { chinese: string; pinyin: string; english: string };
    inputTokens: number;
    outputTokens: number;
  }> {
    
    // Build vocabulary constraint
    const vocabConstraint = allowedVocab.length > 0
      ? `\n\nCRITICAL: You may ONLY use these Chinese words (plus basic grammar particles like 的, 了, 吗, 在, 是, 有, 不, 很, 也, 都, 和, 跟, 给, 让, 把, 被, 比, 从, 到, 对, 向, 往, 为):\n${allowedVocab.join(', ')}`
      : '';
    
    const userPrompt = `Generate a Chinese lesson text (about ${textLength} characters).

Requirements:
- HSK Level: ${input.hskLevel}
- Must include these focus words: ${input.focusWords.join(', ')}
${input.grammarPoint ? `- Grammar focus: ${input.grammarPoint}` : ''}
${excludeWords.length > 0 ? `- DO NOT use these words (failed validation): ${excludeWords.join(', ')}` : ''}${vocabConstraint}

Return ONLY valid JSON:
{"chinese": "你的中文课文", "pinyin": "nǐ de zhōngwén kèwén", "english": "Your Chinese lesson text"}`;

    logWithContext('info', 'lesson_generator.qwen_coder_request', {
      requestId: this.requestId,
      meta: { 
        focusWords: input.focusWords,
        textLength,
        excludeWords: excludeWords.length,
        providers: getProviders(OPENROUTER_MODELS.QWEN_CODER_32B),
      },
    });

    const response = await this.openrouter.chat.completions.create({
      model: OPENROUTER_MODELS.QWEN_CODER_32B,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1000,
      temperature: 0.7,
      // @ts-ignore - OpenRouter specific
      provider: {
        order: getProviders(OPENROUTER_MODELS.QWEN_CODER_32B),
      },
    });

    let content = response.choices[0]?.message?.content || '{}';
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    
    logWithContext('info', 'lesson_generator.qwen_coder_raw_response', {
      requestId: this.requestId,
      meta: {
        contentLength: content.length,
        contentPreview: content.substring(0, 300),
        inputTokens,
        outputTokens,
      },
    });

    // Strip <think> tags (OpenRouter thinking models)
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    
    // Strip markdown code blocks if present
    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }

    try {
      const parsed = JSON.parse(content);
      return {
        text: {
          chinese: parsed.chinese || '',
          pinyin: parsed.pinyin || '',
          english: parsed.english || '',
        },
        inputTokens,
        outputTokens,
      };
    } catch (e) {
      logWithContext('error', 'lesson_generator.qwen_coder_parse_error', {
        requestId: this.requestId,
        meta: { content, error: (e as Error).message },
      });
      throw new Error(`Failed to parse Qwen Coder response: ${content.substring(0, 200)}`);
    }
  }

  private async callValidator(data: {
    text: string;
    lessonNumber: number;
    focusWords: string[];
    hskLevel: number;
  }): Promise<ValidatorResponse> {
    
    const response = await fetch(`${this.validatorUrl}/validate-lesson`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: data.text,
        lesson_number: data.lessonNumber,
        focus_words: data.focusWords,
        hsk_level: data.hskLevel,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Validator error: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as any;
    
    return {
      valid: result.valid,
      invalidWords: result.invalid_words?.map((w: any) => ({
        word: w.word,
        lessonId: w.lesson_id,
        reason: w.reason,
      })),
      suggestion: result.suggestion,
    };
  }

  /**
   * Validate/polish with Qwen Coder (validation prompt)
   */
  private async callValidation(
    generated: { chinese: string; pinyin: string; english: string },
    input: GenerateLessonInput
  ): Promise<{
    lesson: GeneratedLesson;
    inputTokens: number;
    outputTokens: number;
  }> {
    
    const response = await this.openrouter.chat.completions.create({
      model: OPENROUTER_MODELS.QWEN_CODER_32B,
      messages: [
        {
          role: 'system',
          content: `You are a Chinese language validator. Review and polish this lesson text.

TASK: Check and improve the text, then return ONLY valid JSON.

VALIDATION CHECKLIST:
1. Chinese text is natural and fluent
2. Pinyin has correct tone marks
3. English translation is accurate
4. All focus words are used correctly

Return ONLY this JSON format (no explanation):
{"chinese": "...", "pinyin": "...", "english": "..."}`,
        },
        {
          role: 'user',
          content: `Review this lesson for HSK ${input.hskLevel}:

Chinese: ${generated.chinese}
Pinyin: ${generated.pinyin}
English: ${generated.english}

Focus words that MUST be included: ${input.focusWords.join(', ')}

Return polished JSON only.`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.3,
      // @ts-ignore - OpenRouter specific
      provider: {
        order: getProviders(OPENROUTER_MODELS.QWEN_CODER_32B),
      },
    });

    let content = response.choices[0]?.message?.content || '{}';
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;

    // Strip <think> tags (OpenRouter reasoning models)
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    
    // Strip markdown/reasoning if present
    let jsonContent = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }

    try {
      const parsed = JSON.parse(jsonContent);
      return {
        lesson: {
          chinese: parsed.chinese || generated.chinese,
          pinyin: parsed.pinyin || generated.pinyin,
          english: parsed.english || generated.english,
          focusWordsUsed: input.focusWords,
          grammarUsed: input.grammarPoint,
        },
        inputTokens,
        outputTokens,
      };
    } catch {
      // If parsing fails, return original
      return {
        lesson: {
          chinese: generated.chinese,
          pinyin: generated.pinyin,
          english: generated.english,
          focusWordsUsed: input.focusWords,
          grammarUsed: input.grammarPoint,
        },
        inputTokens,
        outputTokens,
      };
    }
  }

  private getDefaultPrompt(): string {
    return `You are a Chinese language tutor creating lesson texts for HSK students.

Guidelines:
- Use simple, clear Chinese appropriate for the HSK level
- Include all focus words naturally in the text
- Create engaging, practical scenarios (daily life, travel, work)
- Ensure grammatically correct sentences
- Always respond with valid JSON containing chinese, pinyin, and english fields`;
  }
}
