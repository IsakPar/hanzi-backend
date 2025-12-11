/**
 * AI Models Service
 * 
 * All Chinese open-source LLMs via OpenRouter:
 * - Qwen2.5-72B for generation
 * - Qwen2.5-Coder for validation
 * - DeepSeek for quality checking
 * 
 * Single API, single key, all models.
 */

import type { Ai } from '@cloudflare/workers-types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// OpenRouter model IDs
export const MODELS = {
  // Primary generator - best Chinese understanding
  GENERATOR: 'qwen/qwen-2.5-72b-instruct',
  // Code/JSON validator - precise and fast
  VALIDATOR: 'qwen/qwen-2.5-coder-32b-instruct',
  // Quality checker - great for Chinese accuracy
  CHECKER: 'deepseek/deepseek-chat',
  // Fast fallback
  FAST: 'qwen/qwen-2.5-7b-instruct',
};

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface GenerationResult {
  content: string;
  tokensUsed: number;
  durationMs: number;
  model: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export interface ValidationError {
  path: string;
  message: string;
  type: 'missing_field' | 'invalid_type' | 'invalid_value' | 'schema_error';
}

export interface QualityReport {
  score: number; // 0-100
  passed: boolean;
  chineseAccuracy: {
    score: number;
    issues: ChineseIssue[];
  };
  pedagogyQuality: {
    score: number;
    feedback: string[];
  };
  suggestions: string[];
}

export interface ChineseIssue {
  text: string;
  issue: string;
  suggestion: string;
  severity: 'error' | 'warning';
}

// ═══════════════════════════════════════════════════════════════════════════
// OPENROUTER - UNIFIED API FOR ALL MODELS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Call OpenRouter API with any supported model
 */
async function callOpenRouter(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  model: string,
  options: {
    apiKey: string;
    temperature?: number;
    maxTokens?: number;
    siteUrl?: string;
    siteName?: string;
  }
): Promise<GenerationResult> {
  const startTime = Date.now();
  
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': options.siteUrl || 'https://studio.polymasterlabs.com',
      'X-Title': options.siteName || 'HanziMaster AI Studio',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter error (${model}): ${response.status} - ${errorText}`);
  }

  const data = await response.json() as {
    choices: { message: { content: string } }[];
    usage: { total_tokens: number };
    model: string;
  };

  return {
    content: data.choices[0].message.content,
    tokensUsed: data.usage?.total_tokens || 0,
    durationMs: Date.now() - startTime,
    model: data.model || model,
  };
}

/**
 * Generate lesson content using Qwen2.5-72B
 */
export async function generateWithQwen(
  systemPrompt: string,
  userPrompt: string,
  env: { OPENROUTER_API_KEY: string }
): Promise<GenerationResult> {
  return callOpenRouter(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    MODELS.GENERATOR,
    {
      apiKey: env.OPENROUTER_API_KEY,
      temperature: 0.7,
      maxTokens: 8000,
    }
  );
}

/**
 * Generate with Qwen Coder for validation tasks
 */
export async function generateWithQwenCoder(
  prompt: string,
  env: { OPENROUTER_API_KEY: string }
): Promise<GenerationResult> {
  return callOpenRouter(
    [{ role: 'user', content: prompt }],
    MODELS.VALIDATOR,
    {
      apiKey: env.OPENROUTER_API_KEY,
      temperature: 0.1, // Low temp for precise validation
      maxTokens: 4000,
    }
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DEEPSEEK VIA OPENROUTER - FOR QUALITY CHECKING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check lesson quality using DeepSeek via OpenRouter
 */
export async function checkWithDeepSeek(
  lessonJson: string,
  env: { OPENROUTER_API_KEY: string }
): Promise<{ report: QualityReport; tokensUsed: number; durationMs: number }> {
  const startTime = Date.now();
  
  const prompt = `You are a Chinese language education expert. Review this lesson JSON for:

1. **Chinese Accuracy** (40 points):
   - Pinyin tones correct (吃 = chī, not chi)
   - Translations accurate and natural
   - Example sentences grammatically correct
   - Simplified Chinese used consistently

2. **Pedagogy Quality** (40 points):
   - Appropriate vocabulary load (5-8 new words max)
   - Exercises build in difficulty
   - Clear learning progression
   - Engaging for learners

3. **Technical Quality** (20 points):
   - All required fields present
   - Content well-structured
   - No duplicate content

LESSON JSON:
${lessonJson}

Respond with a JSON object in this exact format:
{
  "score": <0-100>,
  "passed": <true if score >= 80>,
  "chineseAccuracy": {
    "score": <0-40>,
    "issues": [
      {"text": "...", "issue": "...", "suggestion": "...", "severity": "error|warning"}
    ]
  },
  "pedagogyQuality": {
    "score": <0-40>,
    "feedback": ["..."]
  },
  "suggestions": ["..."]
}`;

  try {
    const result = await callOpenRouter(
      [{ role: 'user', content: prompt }],
      MODELS.CHECKER,
      {
        apiKey: env.OPENROUTER_API_KEY,
        temperature: 0.3,
        maxTokens: 2000,
      }
    );

    // Parse the response
    let report: QualityReport;
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      report = JSON.parse(jsonMatch[0]);
    } catch {
      // Fallback report if parsing fails
      report = {
        score: 70,
        passed: false,
        chineseAccuracy: { score: 30, issues: [] },
        pedagogyQuality: { score: 30, feedback: ['Could not parse quality report'] },
        suggestions: ['Manual review recommended'],
      };
    }

    return {
      report,
      tokensUsed: result.tokensUsed,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    // Return a default report on API error
    return {
      report: {
        score: 50,
        passed: false,
        chineseAccuracy: { score: 20, issues: [] },
        pedagogyQuality: { score: 20, feedback: [`API error: ${(error as Error).message}`] },
        suggestions: ['Manual review required - quality check failed'],
      },
      tokensUsed: 0,
      durationMs: Date.now() - startTime,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKERS AI - FOR FAST VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fast JSON validation using Workers AI (included in Cloudflare)
 */
export async function validateWithWorkersAI(
  lessonJson: string,
  schema: string,
  ai: Ai
): Promise<ValidationResult> {
  const prompt = `Validate this JSON against the schema. Return ONLY a JSON response.

SCHEMA:
${schema}

JSON TO VALIDATE:
${lessonJson}

Respond with:
{
  "isValid": true/false,
  "errors": [{"path": "...", "message": "...", "type": "missing_field|invalid_type|invalid_value|schema_error"}],
  "warnings": ["..."]
}`;

  try {
    const response = await ai.run('@cf/qwen/qwen1.5-7b-chat-awq', {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
    });

    // Parse response
    const content = (response as { response: string }).response;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        isValid: false,
        errors: [{ path: 'root', message: 'Could not parse validation response', type: 'schema_error' }],
        warnings: [],
      };
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    return {
      isValid: false,
      errors: [{ path: 'root', message: `Validation failed: ${(error as Error).message}`, type: 'schema_error' }],
      warnings: [],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EMBEDDINGS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate embeddings using Workers AI
 */
export async function generateEmbedding(
  text: string,
  ai: Ai
): Promise<number[]> {
  const response = await ai.run('@cf/baai/bge-base-en-v1.5', {
    text: text,
  });

  return (response as { data: number[][] }).data[0];
}

/**
 * Batch generate embeddings
 */
export async function generateEmbeddings(
  texts: string[],
  ai: Ai
): Promise<number[][]> {
  // Workers AI supports batch embeddings
  const response = await ai.run('@cf/baai/bge-base-en-v1.5', {
    text: texts,
  });

  return (response as { data: number[][] }).data;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROMPTS
// ═══════════════════════════════════════════════════════════════════════════

export const SYSTEM_PROMPTS = {
  lessonGenerator: `You are an expert Chinese language curriculum designer for HanziMaster, a language learning app.

Your task is to generate high-quality, engaging Chinese lessons in JSON format.

RULES:
1. Use only simplified Chinese characters
2. Include accurate pinyin with tone marks (ā, á, ǎ, à, ē, é, ě, è, etc.)
3. Provide natural English translations
4. Build exercises that reinforce vocabulary progressively
5. Keep vocabulary load appropriate (5-8 new words per lesson)
6. Use real Chinese sentences, not word-for-word translations
7. Make content engaging and culturally appropriate

BLOCK TYPES AVAILABLE:
- intro: Welcome and set context
- hero_hanzi: Showcase a key word/phrase
- tip: Cultural or grammar notes
- pattern: Grammar pattern with examples
- exercise_multiple_choice: Quiz questions
- exercise_drag_sentence: Word ordering exercise
- speaking_practice: Pronunciation practice
- celebration: End of lesson reward

OUTPUT: Valid JSON only, no markdown or explanations.`,

  unitPlanner: `You are a curriculum planner for Chinese language education.

Your task is to plan a logical unit of lessons that:
1. Introduces vocabulary progressively
2. Builds on previous knowledge
3. Includes variety (teaching, practice, review, test)
4. Follows HSK guidelines for the specified level

Output a detailed plan in JSON format.`,
};

export const BLOCK_SCHEMA = `{
  "intro": { "heroHanzi": "string", "titleEn": "string", "introText": "string" },
  "hero_hanzi": { "hanzi": "string", "pinyin": "string", "translation": "string" },
  "tip": { "markdown": "string", "icon": "string" },
  "pattern": { "title": "string", "template": "string", "examples": [{ "hanzi": "string", "pinyin": "string", "translation": "string" }] },
  "exercise_multiple_choice": { "question": "string", "options": [{ "text": "string", "isCorrect": boolean }], "explanation": "string" },
  "exercise_drag_sentence": { "instruction": "string", "correctOrder": ["string"], "wordPool": ["string"], "hint": "string" },
  "speaking_practice": { "instruction": "string", "target_text": "string", "target_pinyin": "string", "target_english": "string", "hint": "string" },
  "celebration": { "message": "string" }
}`;

