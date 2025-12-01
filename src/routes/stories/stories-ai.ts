/**
 * Stories AI Routes
 * AI-powered practice block generation using OpenRouter
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../../types/app';
import { createStoriesDomain } from '../../domains/stories';
import { AnalyticsService } from '../../services/analytics';
import { logWithContext } from '../../utils/logger';
import { generatePracticeSchema } from './schemas';
import {
  createOpenRouterClient,
  OPENROUTER_MODELS,
  OPENROUTER_PRICING,
  estimateOpenRouterCost,
  getGenerationModel,
  getProviders,
  type OpenRouterModel,
} from '../../services/openrouter-client';

const app = new Hono<AppEnv>();

const getServices = (env: AppEnv['Bindings']) => createStoriesDomain(env);

// Map ANY model name to Qwen Coder (single model)
const MODEL_MAPPING: Record<string, string> = {
  // Legacy Together.ai
  'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B': OPENROUTER_MODELS.QWEN_CODER_32B,
  'Qwen/Qwen2.5-Coder-32B-Instruct': OPENROUTER_MODELS.QWEN_CODER_32B,
  // Legacy OpenAI
  'gpt-5-nano': OPENROUTER_MODELS.QWEN_CODER_32B,
  'gpt-5-mini': OPENROUTER_MODELS.QWEN_CODER_32B,
  'gpt-4o-mini': OPENROUTER_MODELS.QWEN_CODER_32B,
  'gpt-4o': OPENROUTER_MODELS.QWEN_CODER_32B,
  // Legacy
  'qwen/qwen3-32b': OPENROUTER_MODELS.QWEN_CODER_32B,
  'deepseek/deepseek-r1-distill-qwen-32b': OPENROUTER_MODELS.QWEN_CODER_32B,
};

function resolveModel(modelId: string): string {
  if (modelId === OPENROUTER_MODELS.QWEN_CODER_32B) {
    return modelId;
  }
  return MODEL_MAPPING[modelId] || getGenerationModel();
}

// Default prompt for practice generation
const DEFAULT_PRACTICE_SYSTEM_PROMPT = `You are a Chinese learning practice block generator. Generate practice exercises for a story.

OUTPUT ONLY VALID JSON. No explanations, no markdown, just the JSON array.

Block type schemas:
- exercise_multiple_choice: { type, content: { question, questionHanzi?, options: [{ id, text, isCorrect }], explanation? } }
- exercise_drag_sentence: { type, content: { instruction, correctOrder: string[], wordPool: string[], hint?, explanation? } }
- exercise_spot_error: { type, content: { question, words: string[], incorrectWordIndex: number, hint?, explanation? } }
- exercise_build_sentence: { type, content: { instruction, slots: [{ content: string|null, isFixed: boolean }], correctSentence: string[], phrasePool: string[], hint?, explanation? } }
- reading_comprehension: { type, content: { instruction, questions: [{ question, choices: [{ text, isCorrect }] }], explanation? } }

Each block MUST have a unique "id" field (use format "gen-{type}-{number}").
Questions should test comprehension of the story content.
Use vocabulary and grammar from the story.
HSK {{HSK_LEVEL}} appropriate difficulty.`;

const PRACTICE_PROMPT_SLUG = 'story-practice-generator';

/**
 * POST /stories/:id/generate-practice
 * Generate practice blocks using AI (OpenRouter)
 */
app.post('/:id/generate-practice', zValidator('json', generatePracticeSchema), async (c) => {
  const storyId = c.req.param('id');
  const { blockTypes, model, count } = c.req.valid('json');
  const user = c.get('user');
  const { stories } = getServices(c.env);
  const analytics = new AnalyticsService(c.env.DB);

  const { createPromptsDomain } = await import('../../domains/prompts');
  const { prompts } = createPromptsDomain(c.env);

  const openrouterApiKey = c.env.OPENROUTER_API_KEY;
  if (!openrouterApiKey) {
    return c.json({ error: 'OPENROUTER_API_KEY not configured' }, 500);
  }

  try {
    const story = await stories.getStoryWithDetails(storyId);
    if (!story) {
      return c.json({ error: 'Story not found' }, 404);
    }

    const promptRecord = await prompts.getTemplateForGeneration(PRACTICE_PROMPT_SLUG);
    const promptSource = promptRecord ? 'database' : 'default';
    
    let systemPrompt = promptRecord?.body || DEFAULT_PRACTICE_SYSTEM_PROMPT;
    systemPrompt = systemPrompt.replace(/\{\{HSK_LEVEL\}\}/g, String(story.hskLevel));

    const segmentsText = story.sentences
      .map((s, i) => `${i + 1}. ${s.chinese} (${s.pinyin}) - ${s.english}`)
      .join('\n');

    const vocabText = story.vocabulary
      .map(v => `- ${v.hanzi}: ${v.english}`)
      .join('\n');

    const userPrompt = `Story: "${story.title}"
HSK Level: ${story.hskLevel}
Difficulty: ${story.difficulty}

Segments:
${segmentsText}

${vocabText ? `Vocabulary:\n${vocabText}` : ''}

Generate ${count} practice blocks of these types: ${blockTypes.join(', ')}
Return a JSON array of blocks.`;

    const resolvedModel = resolveModel(model);
    const openrouter = createOpenRouterClient(openrouterApiKey);

    const startTime = Date.now();
    const response = await openrouter.chat.completions.create({
      model: resolvedModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      // @ts-ignore - OpenRouter specific
      provider: {
        order: getProviders(resolvedModel as OpenRouterModel),
      },
    });
    const latencyMs = Date.now() - startTime;

    let content = response.choices[0]?.message?.content || '{"blocks":[]}';
    
    // Strip <think> tags (OpenRouter reasoning models)
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    
    let blocks;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
      const parsed = JSON.parse(content);
      blocks = Array.isArray(parsed) ? parsed : (parsed.blocks || []);
    } catch {
      blocks = [];
    }

    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const totalCost = estimateOpenRouterCost(
      resolvedModel as OpenRouterModel,
      inputTokens,
      outputTokens
    );
    const storiesPerDollar = totalCost > 0 ? Math.floor(1 / totalCost) : 0;

    await analytics.record({
      type: 'story.generate_practice',
      requestId: c.get('requestId'),
      userId: user?.id,
      metadata: {
        storyId,
        model: resolvedModel,
        originalModel: model,
        blockTypes,
        blocksGenerated: blocks.length,
        inputTokens,
        outputTokens,
        totalCost,
        latencyMs,
        promptSource,
        promptVersion: promptRecord?.version || null,
        provider: 'openrouter',
      },
    });

    logWithContext('info', 'stories.generate_practice_success', {
      requestId: c.get('requestId'),
      meta: {
        storyId,
        model: resolvedModel,
        blocksGenerated: blocks.length,
        tokens: { input: inputTokens, output: outputTokens },
        cost: totalCost,
        promptSource,
        promptVersion: promptRecord?.version || null,
        provider: 'openrouter',
      },
    });

    return c.json({
      success: true,
      blocks,
      usage: {
        model: resolvedModel,
        provider: 'openrouter',
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        estimatedCost: totalCost,
        actualCost: totalCost,
        storiesPerDollar,
        latencyMs,
      },
    });
  } catch (err) {
    logWithContext('error', 'stories.generate_practice_failed', {
      requestId: c.get('requestId'),
      meta: { storyId, error: (err as Error).message },
    });
    return c.json({ 
      error: 'Generation failed', 
      details: (err as Error).message 
    }, 500);
  }
});

export default app;
