/**
 * Vocabulary Enhancer Service
 * AI-powered example sentence generation for vocabulary entries
 */

import { createOpenRouterClient, OPENROUTER_MODELS, getProviders, estimateOpenRouterCost } from './openrouter-client';
import { AIUsageLogger } from './ai-usage-logger';
import { logWithContext } from '../utils/logger';
import type { D1Database } from '@cloudflare/workers-types';

export interface ExampleSentence {
  chinese: string;
  pinyin: string;
  english: string;
}

export interface GenerateExampleResult {
  sentence: ExampleSentence;
  tokensUsed: number;
}

export interface TranslationResult {
  english: string;
  pinyin: string;
  tokensUsed: number;
}

/**
 * Generate an example sentence for a vocabulary word using AI
 */
export async function generateExampleSentence(
  hanzi: string,
  english: string,
  hskLevel: number,
  openrouterApiKey: string,
  requestId: string,
  db?: D1Database
): Promise<GenerateExampleResult> {
  const client = createOpenRouterClient(openrouterApiKey);
  const usageLogger = db ? new AIUsageLogger(db) : null;

  // Build HSK vocabulary guidance
  const hskGuidance = hskLevel <= 2 
    ? `Use ONLY basic HSK ${hskLevel} vocabulary. Keep sentence very simple (3-6 words).`
    : hskLevel <= 4
    ? `Use HSK ${hskLevel} or lower vocabulary. Keep sentence moderately simple (4-8 words).`
    : `Use vocabulary appropriate for HSK ${hskLevel}. Sentence can be more complex (5-12 words).`;

  const prompt = `Create an example sentence that USES the word "${hanzi}" (${english}) in a natural, meaningful context.

IMPORTANT RULES:
1. The sentence must CONTAIN and USE the word "${hanzi}" - don't just repeat the word alone
2. ${hskGuidance}
3. The sentence should demonstrate how the word is used in real conversation
4. Include accurate pinyin with tone marks (ā, á, ǎ, à, etc.)

Word to use: ${hanzi} (${english})
HSK Level: ${hskLevel}

Example format:
For 妈妈 (mom), HSK1: {"chinese": "我爱我的妈妈。", "pinyin": "wǒ ài wǒ de māmā.", "english": "I love my mom."}
For 学习 (study), HSK2: {"chinese": "我每天学习中文。", "pinyin": "wǒ měi tiān xuéxí zhōngwén.", "english": "I study Chinese every day."}

Output ONLY the JSON object, nothing else:
{"chinese": "...", "pinyin": "...", "english": "..."}`;

  try {
    const completion = await client.chat.completions.create({
      model: OPENROUTER_MODELS.QWEN_CODER_32B,
      messages: [
        { role: 'system', content: 'You output JSON only. No thinking, no explanation, just the JSON object requested.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 500,
      // @ts-ignore
      provider: { order: getProviders(OPENROUTER_MODELS.QWEN_CODER_32B) },
    });

    const rawContent = completion.choices[0]?.message?.content || '';
    const tokensUsed = completion.usage?.total_tokens || 0;

    // Note: using 'info' instead of 'debug' since LogLevel doesn't support 'debug'
    logWithContext('info', 'vocab.generate_example.raw_response', {
      requestId,
      meta: { content: rawContent.substring(0, 500) },
    });

    // First, try to extract JSON directly from raw content (including inside think tags)
    // This handles cases where the model wraps everything in <think> tags
    let jsonStr = '';
    
    // Look for JSON object with our expected fields anywhere in the response
    const jsonRegex = /\{[^{}]*"chinese"\s*:\s*"[^"]*"[^{}]*"pinyin"\s*:\s*"[^"]*"[^{}]*"english"\s*:\s*"[^"]*"[^{}]*\}/;
    const directMatch = rawContent.match(jsonRegex);
    
    if (directMatch) {
      jsonStr = directMatch[0];
    } else {
      // Fallback: find any JSON object
      const fallbackMatch = rawContent.match(/\{[^{}]+\}/g);
      if (fallbackMatch) {
        // Find the one that looks most like our expected format
        for (const match of fallbackMatch) {
          if (match.includes('chinese') || match.includes('pinyin') || match.includes('english')) {
            jsonStr = match;
            break;
          }
        }
        // If none found with our fields, use the first one
        if (!jsonStr && fallbackMatch.length > 0) {
          jsonStr = fallbackMatch[0];
        }
      }
    }

    if (!jsonStr) {
      throw new Error(`No JSON found in response. Raw: ${rawContent.substring(0, 200)}`);
    }

    // Parse the JSON
    let sentence: ExampleSentence;
    try {
      sentence = JSON.parse(jsonStr) as ExampleSentence;
    } catch (parseErr) {
      logWithContext('error', 'vocab.generate_example.parse_failed', {
        requestId,
        meta: { jsonStr: jsonStr.substring(0, 200), error: (parseErr as Error).message },
      });
      throw new Error(`JSON parse failed: ${(parseErr as Error).message}. JSON: ${jsonStr.substring(0, 100)}`);
    }

    // Validate required fields
    if (!sentence.chinese || !sentence.pinyin || !sentence.english) {
      throw new Error('Invalid response: missing required fields');
    }

    // Log AI usage for cost tracking
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    const cost = estimateOpenRouterCost(OPENROUTER_MODELS.QWEN_CODER_32B, inputTokens, outputTokens);
    
    if (usageLogger) {
      await usageLogger.log({
        sessionId: requestId,
        model: OPENROUTER_MODELS.QWEN_CODER_32B,
        endpoint: 'vocab-enhancer',
        inputTokens,
        outputTokens,
        cost,
        success: true,
        requestType: 'example_sentence',
        metadata: { hanzi, hskLevel },
      });
    }

    logWithContext('info', 'vocab.generate_example.success', {
      requestId,
      meta: { hanzi, tokensUsed, cost },
    });

    return { sentence, tokensUsed };

  } catch (err) {
    logWithContext('error', 'vocab.generate_example.failed', {
      requestId,
      meta: { hanzi, error: (err as Error).message },
    });
    throw err;
  }
}

/**
 * Translate Chinese word to English and generate pinyin using AI
 */
export async function translateWord(
  hanzi: string,
  openrouterApiKey: string,
  requestId: string,
  db?: D1Database
): Promise<TranslationResult> {
  const client = createOpenRouterClient(openrouterApiKey);
  const usageLogger = db ? new AIUsageLogger(db) : null;

  const prompt = `Translate this Chinese word/phrase to English and provide pinyin with tone marks.

Chinese: ${hanzi}

Rules:
1. Provide the most common/primary English meaning
2. Use accurate pinyin with tone marks (ā, á, ǎ, à, ē, é, ě, è, etc.)
3. Keep translation concise (1-4 words typically)

Examples:
妈妈 → {"english": "mom", "pinyin": "māmā"}
学习 → {"english": "to study", "pinyin": "xuéxí"}
非常 → {"english": "very", "pinyin": "fēicháng"}
电脑 → {"english": "computer", "pinyin": "diànnǎo"}

Output ONLY JSON, nothing else:
{"english": "...", "pinyin": "..."}`;

  try {
    logWithContext('info', 'vocab.translate_word.calling_openrouter', {
      requestId,
      meta: { hanzi, model: OPENROUTER_MODELS.QWEN_CODER_32B },
    });

    const completion = await client.chat.completions.create({
      model: OPENROUTER_MODELS.QWEN_CODER_32B,
      messages: [
        { role: 'system', content: 'You are a Chinese-English translator. Output JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3, // Lower temperature for more consistent translations
      max_tokens: 100,
      // Don't specify provider to allow fallback
    });

    const rawContent = completion.choices[0]?.message?.content || '';
    const tokensUsed = completion.usage?.total_tokens || 0;

    // Extract JSON from response
    const jsonMatch = rawContent.match(/\{[^{}]*"english"\s*:\s*"[^"]*"[^{}]*"pinyin"\s*:\s*"[^"]*"[^{}]*\}/);
    
    if (!jsonMatch) {
      // Try fallback regex
      const fallback = rawContent.match(/\{[^{}]+\}/);
      if (!fallback) {
        throw new Error(`No JSON found in response: ${rawContent.substring(0, 100)}`);
      }
    }

    const jsonStr = jsonMatch ? jsonMatch[0] : rawContent.match(/\{[^{}]+\}/)![0];
    const result = JSON.parse(jsonStr) as { english: string; pinyin: string };

    if (!result.english || !result.pinyin) {
      throw new Error('Invalid response: missing english or pinyin');
    }

    // Log AI usage
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    const cost = estimateOpenRouterCost(OPENROUTER_MODELS.QWEN_CODER_32B, inputTokens, outputTokens);
    
    if (usageLogger) {
      await usageLogger.log({
        sessionId: requestId,
        model: OPENROUTER_MODELS.QWEN_CODER_32B,
        endpoint: 'vocab-enhancer',
        inputTokens,
        outputTokens,
        cost,
        success: true,
        requestType: 'translate_word',
        metadata: { hanzi },
      });
    }

    logWithContext('info', 'vocab.translate_word.success', {
      requestId,
      meta: { hanzi, english: result.english, tokensUsed, cost },
    });

    return { 
      english: result.english, 
      pinyin: result.pinyin,
      tokensUsed 
    };

  } catch (err) {
    logWithContext('error', 'vocab.translate_word.failed', {
      requestId,
      meta: { hanzi, error: (err as Error).message },
    });
    throw err;
  }
}

