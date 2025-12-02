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

  const prompt = `Create an example sentence for: ${hanzi} (${english})

HSK Level: ${hskLevel}

Output ONLY this JSON, nothing else:
{"chinese": "一个简单的句子", "pinyin": "yī gè jiǎn dān de jù zi", "english": "A simple sentence"}`;

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

