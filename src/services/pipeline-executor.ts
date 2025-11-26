/**
 * Pipeline Executor Service
 * 
 * Executes multi-step AI prompt pipelines with:
 * - Sequential step execution
 * - Variable injection (targets, grammar, known_vocab, previous_output)
 * - Cost tracking and limits
 * - Retry logic with fallback models
 * - Quality gate validation
 */

import type { D1Database } from '@cloudflare/workers-types';
import OpenAI from 'openai';
import { ModelManagerService } from './model-manager';
import type { PipelineStep, CostLimits, QualityGate } from '../schema';
import { logWithContext } from '../utils/logger';

export interface PipelineInput {
  targets: string[];
  grammar?: string[];
  knownVocabulary?: string[];
}

export interface StepResult {
  stepOrder: number;
  stepName: string;
  status: 'success' | 'failed' | 'skipped';
  modelUsed: string;
  output?: unknown;
  rawOutput?: string;
  error?: string;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  cost: number;
  latencyMs: number;
  retryCount: number;
}

export interface PipelineResult {
  success: boolean;
  finalOutput?: unknown;
  steps: StepResult[];
  totalCost: number;
  totalTokens: number;
  totalLatencyMs: number;
  qualityScore?: number;
  abortReason?: string;
}

export interface ExecutePipelineOptions {
  db: D1Database;
  openaiApiKey: string;
  openaiBaseUrl?: string;
  requestId: string;
  steps: PipelineStep[];
  input: PipelineInput;
  costLimits?: CostLimits;
  qualityGate?: QualityGate;
}

export class PipelineExecutor {
  private modelManager: ModelManagerService;
  private openai: OpenAI;
  private requestId: string;
  private costLimits: CostLimits;
  private qualityGate: QualityGate;

  constructor(
    db: D1Database,
    openaiApiKey: string,
    openaiBaseUrl?: string,
    requestId?: string
  ) {
    this.modelManager = new ModelManagerService(db);
    this.openai = new OpenAI({
      apiKey: openaiApiKey,
      baseURL: openaiBaseUrl,
    });
    this.requestId = requestId || crypto.randomUUID();
    
    // Default limits
    this.costLimits = {
      maxCostPerRun: 0.50, // $0.50 default max
      maxInputTokensPerStep: 4000,
      maxOutputTokensPerStep: 4000,
      abortOnExceed: true,
    };
    
    this.qualityGate = {
      minValidationScore: 70,
      returnUnavailableBelow: 50,
      requireValidation: false,
    };
  }

  async execute(options: ExecutePipelineOptions): Promise<PipelineResult> {
    const { steps, input, costLimits, qualityGate } = options;
    
    // Apply custom limits
    if (costLimits) {
      this.costLimits = { ...this.costLimits, ...costLimits };
    }
    if (qualityGate) {
      this.qualityGate = { ...this.qualityGate, ...qualityGate };
    }

    const stepResults: StepResult[] = [];
    let previousOutput: unknown = null;
    let totalCost = 0;
    let totalTokens = 0;
    const startTime = Date.now();

    logWithContext('info', 'pipeline.start', {
      requestId: this.requestId,
      meta: {
        stepCount: steps.length,
        targets: input.targets,
        costLimits: this.costLimits,
      },
    });

    // Sort steps by order
    const sortedSteps = [...steps].sort((a, b) => a.order - b.order);

    for (const step of sortedSteps) {
      // Check cost limit before executing
      if (totalCost >= this.costLimits.maxCostPerRun && this.costLimits.abortOnExceed) {
        logWithContext('warn', 'pipeline.cost_limit_exceeded', {
          requestId: this.requestId,
          meta: { totalCost, limit: this.costLimits.maxCostPerRun },
        });

        return {
          success: false,
          steps: stepResults,
          totalCost,
          totalTokens,
          totalLatencyMs: Date.now() - startTime,
          abortReason: `Cost limit exceeded: $${totalCost.toFixed(4)} >= $${this.costLimits.maxCostPerRun}`,
        };
      }

      const stepResult = await this.executeStep(step, input, previousOutput);
      stepResults.push(stepResult);
      totalCost += stepResult.cost;
      totalTokens += stepResult.tokens.total;

      if (stepResult.status === 'failed') {
        logWithContext('error', 'pipeline.step_failed', {
          requestId: this.requestId,
          meta: {
            step: step.order,
            stepName: step.name,
            error: stepResult.error,
          },
        });

        return {
          success: false,
          steps: stepResults,
          totalCost,
          totalTokens,
          totalLatencyMs: Date.now() - startTime,
          abortReason: `Step ${step.order} (${step.name}) failed: ${stepResult.error}`,
        };
      }

      previousOutput = stepResult.output;
    }

    // Check quality gate if validation step exists
    let qualityScore: number | undefined;
    const validationStep = stepResults.find(s => 
      s.stepName.toLowerCase().includes('validate') || 
      s.stepName.toLowerCase().includes('validation')
    );

    if (validationStep?.output && typeof validationStep.output === 'object') {
      const validationOutput = validationStep.output as Record<string, unknown>;
      if (typeof validationOutput.score === 'number') {
        qualityScore = validationOutput.score;
        
        if (qualityScore < this.qualityGate.returnUnavailableBelow) {
          return {
            success: false,
            steps: stepResults,
            totalCost,
            totalTokens,
            totalLatencyMs: Date.now() - startTime,
            qualityScore,
            abortReason: `Quality score ${qualityScore} below minimum ${this.qualityGate.returnUnavailableBelow}`,
          };
        }
      }
    }

    logWithContext('info', 'pipeline.complete', {
      requestId: this.requestId,
      meta: {
        totalCost,
        totalTokens,
        latencyMs: Date.now() - startTime,
        qualityScore,
      },
    });

    return {
      success: true,
      finalOutput: previousOutput,
      steps: stepResults,
      totalCost,
      totalTokens,
      totalLatencyMs: Date.now() - startTime,
      qualityScore,
    };
  }

  private async executeStep(
    step: PipelineStep,
    input: PipelineInput,
    previousOutput: unknown
  ): Promise<StepResult> {
    const stepStartTime = Date.now();
    let retryCount = 0;
    let lastError: string | undefined;

    // Try with primary model, then fallback
    const modelsToTry = [step.modelId];
    if (step.onFailure?.fallbackModelId) {
      modelsToTry.push(step.onFailure.fallbackModelId);
    }

    for (const modelId of modelsToTry) {
      for (let attempt = 0; attempt <= (step.onFailure?.maxRetries || 0); attempt++) {
        try {
          const result = await this.callModel(step, input, previousOutput, modelId);
          
          return {
            stepOrder: step.order,
            stepName: step.name,
            status: 'success',
            modelUsed: modelId,
            output: result.output,
            rawOutput: result.rawOutput,
            tokens: result.tokens,
            cost: result.cost,
            latencyMs: Date.now() - stepStartTime,
            retryCount,
          };
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
          retryCount++;
          
          logWithContext('warn', 'pipeline.step_retry', {
            requestId: this.requestId,
            meta: {
              step: step.order,
              model: modelId,
              attempt,
              error: lastError,
            },
          });
        }
      }
    }

    // All attempts failed
    return {
      stepOrder: step.order,
      stepName: step.name,
      status: 'failed',
      modelUsed: step.modelId,
      error: lastError,
      tokens: { input: 0, output: 0, total: 0 },
      cost: 0,
      latencyMs: Date.now() - stepStartTime,
      retryCount,
    };
  }

  private async callModel(
    step: PipelineStep,
    input: PipelineInput,
    previousOutput: unknown,
    modelId: string
  ): Promise<{
    output: unknown;
    rawOutput: string;
    tokens: { input: number; output: number; total: number };
    cost: number;
  }> {
    // Build the prompt with variable injection
    let prompt = step.promptBody;

    if (step.input.includeTargets) {
      prompt = prompt.replace(/\{\{targets\}\}/g, JSON.stringify(input.targets));
    }
    if (step.input.includeGrammar && input.grammar) {
      prompt = prompt.replace(/\{\{grammar\}\}/g, JSON.stringify(input.grammar));
    }
    if (step.input.includeKnownVocab && input.knownVocabulary) {
      // Truncate known vocabulary to avoid token explosion
      const truncatedVocab = input.knownVocabulary.slice(0, 100);
      prompt = prompt.replace(/\{\{known_vocabulary\}\}/g, JSON.stringify(truncatedVocab));
      if (input.knownVocabulary.length > 100) {
        prompt = prompt.replace(
          /\{\{known_vocabulary_summary\}\}/g,
          `User knows ${input.knownVocabulary.length} words total (showing first 100)`
        );
      }
    }
    if (step.input.includePreviousOutput && previousOutput !== null) {
      prompt = prompt.replace(
        /\{\{previous_output\}\}/g,
        typeof previousOutput === 'string' 
          ? previousOutput 
          : JSON.stringify(previousOutput, null, 2)
      );
    }

    // Call OpenAI
    const completion = await this.openai.chat.completions.create({
      model: modelId,
      response_format: step.output.format === 'json' ? { type: 'json_object' } : undefined,
      messages: [
        { role: 'system', content: prompt },
        { 
          role: 'user', 
          content: step.input.includePreviousOutput && previousOutput
            ? 'Process the provided input and generate the required output.'
            : `Process these targets: ${input.targets.join(', ')}`
        },
      ],
      temperature: step.settings.temperature,
      max_tokens: Math.min(
        step.settings.maxOutputTokens,
        this.costLimits.maxOutputTokensPerStep
      ),
    });

    const rawOutput = completion.choices[0].message.content || '';
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;

    // Parse output
    let output: unknown;
    if (step.output.format === 'json') {
      try {
        output = JSON.parse(rawOutput);
      } catch {
        throw new Error(`Invalid JSON response from model: ${rawOutput.substring(0, 200)}`);
      }
    } else {
      output = rawOutput;
    }

    // Calculate cost
    const models = await this.modelManager.getAllModels();
    const modelInfo = models.find(m => m.id === modelId);
    let cost = 0;
    if (modelInfo) {
      cost = (inputTokens / 1000) * modelInfo.costPer1kInput +
             (outputTokens / 1000) * modelInfo.costPer1kOutput;
    }

    return {
      output,
      rawOutput,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
      cost,
    };
  }
}

/**
 * Helper to create a simple single-step pipeline from legacy prompt body
 */
export function createLegacyPipeline(body: string, modelId: string): PipelineStep[] {
  return [{
    order: 1,
    name: 'Generate',
    modelId,
    promptBody: body,
    input: {
      includeTargets: true,
      includeGrammar: true,
      includeKnownVocab: false,
      includePreviousOutput: false,
    },
    output: {
      format: 'json',
    },
    settings: {
      temperature: 0.7,
      maxInputTokens: 4000,
      maxOutputTokens: 4000,
    },
    onFailure: {
      maxRetries: 1,
    },
  }];
}


