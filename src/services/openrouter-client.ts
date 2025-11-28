/**
 * OpenRouter Client Service
 * 
 * ONLY TWO MODELS ALLOWED:
 * - Qwen3 32B - for generation (cheap)
 * - DeepSeek R1 Distill Qwen 32B - for validation (quality)
 * 
 * @module services/openrouter-client
 */

import OpenAI from 'openai';

// ═══════════════════════════════════════════════════════════
// ALLOWED MODELS - ONLY THESE TWO, NO EXCEPTIONS
// ═══════════════════════════════════════════════════════════

export const OPENROUTER_MODELS = {
  // Main model for generation - Qwen 2.5 Coder 32B Instruct
  QWEN_CODER_32B: 'qwen/qwen-2.5-coder-32b-instruct',
  // Tool-calling orchestrator - DeepSeek Chat (supports function calling)
  DEEPSEEK_CHAT: 'deepseek/deepseek-chat',
} as const;

// Provider preferences
export const MODEL_PROVIDERS = {
  [OPENROUTER_MODELS.QWEN_CODER_32B]: ['deepinfra'],
  [OPENROUTER_MODELS.DEEPSEEK_CHAT]: ['deepseek'],
} as const;

// Pricing per 1M tokens (USD) - check OpenRouter for exact
export const OPENROUTER_PRICING = {
  [OPENROUTER_MODELS.QWEN_CODER_32B]: { input: 0.07, output: 0.16 },
  [OPENROUTER_MODELS.DEEPSEEK_CHAT]: { input: 0.14, output: 0.28 },
} as const;

// Set of allowed model IDs for runtime validation
const ALLOWED_MODELS = new Set(Object.values(OPENROUTER_MODELS));

export type OpenRouterModel = typeof OPENROUTER_MODELS[keyof typeof OPENROUTER_MODELS];

/**
 * Validate that a model ID is allowed
 * @throws Error if model is not in allowed list
 */
export function validateModel(modelId: string): void {
  if (!ALLOWED_MODELS.has(modelId as OpenRouterModel)) {
    throw new Error(
      `Model "${modelId}" is not allowed. Only Qwen Coder 32B is permitted.`
    );
  }
}

/**
 * Check if a model ID is allowed (without throwing)
 */
export function isAllowedModel(modelId: string): boolean {
  return ALLOWED_MODELS.has(modelId as OpenRouterModel);
}

/**
 * Get the generation model (Qwen Coder 32B)
 */
export function getGenerationModel(): string {
  return OPENROUTER_MODELS.QWEN_CODER_32B;
}

/**
 * Get the validation model (same as generation, different prompt)
 */
export function getValidationModel(): string {
  return OPENROUTER_MODELS.QWEN_CODER_32B;
}

/**
 * Creates an OpenAI-compatible client for OpenRouter
 */
export function createOpenRouterClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://hanzimaster.app',
      'X-Title': 'HanziMaster',
    },
  });
}

/**
 * Get provider order for a model
 */
export function getProviders(model: OpenRouterModel): readonly string[] {
  return MODEL_PROVIDERS[model] || [];
}

/**
 * Estimate cost for an OpenRouter request
 */
export function estimateOpenRouterCost(
  model: OpenRouterModel,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = OPENROUTER_PRICING[model];
  if (!pricing) return 0;
  
  return (
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output
  );
}

/**
 * Get model display info
 */
export function getModelInfo(model: OpenRouterModel) {
  switch (model) {
    case OPENROUTER_MODELS.QWEN_CODER_32B:
      return {
        name: 'Qwen 2.5 Coder 32B',
        provider: 'OpenRouter',
        type: 'all',
        description: 'Fast, great for JSON generation & validation',
        providers: MODEL_PROVIDERS[model],
      };
    default:
      return {
        name: model,
        provider: 'OpenRouter',
        type: 'unknown',
        description: '',
        providers: [],
      };
  }
}

