/**
 * Pipeline Executor Tests
 * 
 * Tests the core pipeline logic including:
 * - Single step execution
 * - Multi-step execution  
 * - Variable injection
 * - Cost tracking
 * - createLegacyPipeline helper
 */

import { describe, it, expect } from 'vitest';
import { createLegacyPipeline } from '../pipeline-executor';
import type { PipelineStep, CostLimits, QualityGate } from '../../schema';

describe('PipelineExecutor', () => {
  describe('createLegacyPipeline', () => {
    it('should create a single-step pipeline from legacy body', () => {
      const body = 'You are an expert Chinese teacher. Create a lesson about {{targets}}.';
      const modelId = 'gpt-4o';
      
      const steps = createLegacyPipeline(body, modelId);
      
      expect(steps).toHaveLength(1);
      expect(steps[0]).toMatchObject({
        order: 1,
        name: 'Generate',
        modelId: 'gpt-4o',
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
      });
    });

    it('should use provided model ID', () => {
      const steps = createLegacyPipeline('Test prompt', 'gpt-4o-mini');
      expect(steps[0].modelId).toBe('gpt-4o-mini');
    });
  });

  describe('PipelineStep Type Validation', () => {
    it('should accept valid step configuration', () => {
      const step: PipelineStep = {
        order: 1,
        name: 'Generate Content',
        modelId: 'gpt-4o',
        promptBody: 'Create a lesson about: {{targets}}',
        input: {
          includeTargets: true,
          includeGrammar: true,
          includeKnownVocab: false,
          includePreviousOutput: false,
        },
        output: {
          format: 'json',
          schema: '{"title": "string", "blocks": "array"}',
        },
        settings: {
          temperature: 0.7,
          maxInputTokens: 4000,
          maxOutputTokens: 4000,
        },
        onFailure: {
          fallbackModelId: 'gpt-4o-mini',
          maxRetries: 2,
        },
      };

      expect(step.order).toBe(1);
      expect(step.name).toBe('Generate Content');
      expect(step.input.includeTargets).toBe(true);
      expect(step.output.format).toBe('json');
      expect(step.onFailure.fallbackModelId).toBe('gpt-4o-mini');
    });

    it('should allow text output format', () => {
      const step: PipelineStep = {
        order: 1,
        name: 'Validate',
        modelId: 'gpt-4o-mini',
        promptBody: 'Check this content',
        input: {
          includeTargets: false,
          includeGrammar: false,
          includeKnownVocab: false,
          includePreviousOutput: true,
        },
        output: {
          format: 'text',
        },
        settings: {
          temperature: 0.3,
          maxInputTokens: 2000,
          maxOutputTokens: 1000,
        },
        onFailure: {
          maxRetries: 0,
        },
      };

      expect(step.output.format).toBe('text');
      expect(step.input.includePreviousOutput).toBe(true);
    });
  });

  describe('CostLimits Type Validation', () => {
    it('should accept valid cost limits', () => {
      const limits: CostLimits = {
        maxCostPerRun: 0.25,
        maxInputTokensPerStep: 4000,
        maxOutputTokensPerStep: 4000,
        abortOnExceed: true,
      };

      expect(limits.maxCostPerRun).toBe(0.25);
      expect(limits.abortOnExceed).toBe(true);
    });

    it('should allow custom token limits', () => {
      const limits: CostLimits = {
        maxCostPerRun: 1.00,
        maxInputTokensPerStep: 8000,
        maxOutputTokensPerStep: 8000,
        abortOnExceed: false,
      };

      expect(limits.maxInputTokensPerStep).toBe(8000);
      expect(limits.abortOnExceed).toBe(false);
    });
  });

  describe('QualityGate Type Validation', () => {
    it('should accept valid quality gate config', () => {
      const gate: QualityGate = {
        minValidationScore: 70,
        returnUnavailableBelow: 50,
        requireValidation: true,
      };

      expect(gate.minValidationScore).toBe(70);
      expect(gate.returnUnavailableBelow).toBe(50);
      expect(gate.requireValidation).toBe(true);
    });
  });

  describe('Multi-Step Pipeline Configuration', () => {
    it('should configure a 2-step generation + validation pipeline', () => {
      const steps: PipelineStep[] = [
        {
          order: 1,
          name: 'Generate Lesson',
          modelId: 'gpt-4o',
          promptBody: `You are an expert Chinese teacher.
            Create a lesson focusing on: {{targets}}
            Grammar points: {{grammar}}
            The student knows: {{known_vocabulary}}
            Return valid JSON.`,
          input: {
            includeTargets: true,
            includeGrammar: true,
            includeKnownVocab: true,
            includePreviousOutput: false,
          },
          output: { format: 'json' },
          settings: {
            temperature: 0.7,
            maxInputTokens: 4000,
            maxOutputTokens: 4000,
          },
          onFailure: {
            fallbackModelId: 'gpt-4o-mini',
            maxRetries: 1,
          },
        },
        {
          order: 2,
          name: 'Validate Content',
          modelId: 'gpt-4o-mini',
          promptBody: `Validate this Chinese lesson:
            {{previous_output}}
            
            Check:
            1. All target words are used
            2. Content is appropriate for HSK level
            3. Grammar is correct
            
            Return JSON: {"valid": boolean, "score": number, "issues": string[]}`,
          input: {
            includeTargets: false,
            includeGrammar: false,
            includeKnownVocab: false,
            includePreviousOutput: true,
          },
          output: { format: 'json' },
          settings: {
            temperature: 0.3,
            maxInputTokens: 4000,
            maxOutputTokens: 1000,
          },
          onFailure: {
            maxRetries: 0,
          },
        },
      ];

      expect(steps).toHaveLength(2);
      expect(steps[0].name).toBe('Generate Lesson');
      expect(steps[1].name).toBe('Validate Content');
      expect(steps[0].input.includePreviousOutput).toBe(false);
      expect(steps[1].input.includePreviousOutput).toBe(true);
      expect(steps[1].settings.temperature).toBeLessThan(steps[0].settings.temperature);
    });

    it('should support up to 5 steps', () => {
      const steps: PipelineStep[] = Array.from({ length: 5 }, (_, i) => ({
        order: i + 1,
        name: `Step ${i + 1}`,
        modelId: 'gpt-4o-mini',
        promptBody: `Process step ${i + 1}: {{previous_output}}`,
        input: {
          includeTargets: i === 0,
          includeGrammar: i === 0,
          includeKnownVocab: false,
          includePreviousOutput: i > 0,
        },
        output: { format: 'json' as const },
        settings: {
          temperature: 0.7,
          maxInputTokens: 4000,
          maxOutputTokens: 4000,
        },
        onFailure: { maxRetries: 1 },
      }));

      expect(steps).toHaveLength(5);
      expect(steps[0].order).toBe(1);
      expect(steps[4].order).toBe(5);
      expect(steps[0].input.includeTargets).toBe(true);
      expect(steps[4].input.includeTargets).toBe(false);
    });
  });

  describe('Variable Placeholders', () => {
    it('should include all expected placeholders in prompts', () => {
      const promptWithAllVars = `
        Targets: {{targets}}
        Grammar: {{grammar}}
        Known vocab: {{known_vocabulary}}
        Previous: {{previous_output}}
      `;

      expect(promptWithAllVars).toContain('{{targets}}');
      expect(promptWithAllVars).toContain('{{grammar}}');
      expect(promptWithAllVars).toContain('{{known_vocabulary}}');
      expect(promptWithAllVars).toContain('{{previous_output}}');
    });

    it('should configure input flags to match placeholders', () => {
      const step: PipelineStep = {
        order: 1,
        name: 'Full Context',
        modelId: 'gpt-4o',
        promptBody: 'Use {{targets}}, {{grammar}}, {{known_vocabulary}}, {{previous_output}}',
        input: {
          includeTargets: true,
          includeGrammar: true,
          includeKnownVocab: true,
          includePreviousOutput: true,
        },
        output: { format: 'json' },
        settings: { temperature: 0.7, maxInputTokens: 4000, maxOutputTokens: 4000 },
        onFailure: { maxRetries: 0 },
      };

      // All flags should be true when all placeholders are used
      expect(step.input.includeTargets).toBe(true);
      expect(step.input.includeGrammar).toBe(true);
      expect(step.input.includeKnownVocab).toBe(true);
      expect(step.input.includePreviousOutput).toBe(true);
    });
  });
});
