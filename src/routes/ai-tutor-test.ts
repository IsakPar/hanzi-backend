/**
 * AI Tutor Test Lab API
 * 
 * Endpoints for testing the AI Tutor pipeline from the Control Center.
 * Admin-only access for debugging and QA.
 * 
 * @module routes/ai-tutor-test
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { AppBindings, AppVariables } from '../types/app';
import { jwtAuthMiddleware } from '../middleware/jwt-auth';
import { AITutorGenerator, TutorLesson } from '../services/ai-tutor-generator';
import { TutorCache } from '../services/tutor-cache';
import { VectorizeService } from '../services/vectorize';
import { logWithContext } from '../utils/logger';

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface TestStep {
  timestamp: string;
  step: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  message: string;
  durationMs?: number;
  cost?: number;
  details?: Record<string, unknown>;
}

interface TestResult {
  success: boolean;
  lesson?: TutorLesson;
  steps: TestStep[];
  summary: {
    totalDurationMs: number;
    totalCost: number;
    cacheHit: boolean;
    cacheKey?: string;
    preFilterScore?: number;
    preFilterPassed?: boolean;
    attemptsReading: number;
    attemptsPractice: number;
    attemptsGrammar: number;
  };
  error?: string;
}

// ═══════════════════════════════════════════════════════════
// Schemas
// ═══════════════════════════════════════════════════════════

const runTestSchema = z.object({
  hskLevel: z.number().min(1).max(6),
  lessonPosition: z.number().min(1).max(500),
  focusWords: z.array(z.string()).min(1).max(10),
  options: z.object({
    bypassCache: z.boolean().default(false),
    simulateSlowResponse: z.boolean().default(false),
    injectValidationFailure: z.boolean().default(false),
  }).optional(),
});

const batchTestSchema = z.object({
  tests: z.array(z.object({
    hskLevel: z.number().min(1).max(6),
    lessonPosition: z.number().min(1).max(500),
    focusWords: z.array(z.string()).min(1).max(10),
  })).min(1).max(10),
  options: z.object({
    includeRandomCacheHits: z.boolean().default(true),
  }).optional(),
});

// ═══════════════════════════════════════════════════════════
// Routes
// ═══════════════════════════════════════════════════════════

// All routes require admin auth
app.use('/*', jwtAuthMiddleware({ allowRoles: ['admin'] }));

/**
 * Run a single test generation
 * POST /v1/ai-tutor-test/run
 */
app.post('/run', zValidator('json', runTestSchema), async (c) => {
  const { hskLevel, lessonPosition, focusWords, options } = c.req.valid('json');
  const requestId = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const startTime = Date.now();
  const steps: TestStep[] = [];
  
  const addStep = (step: string, status: TestStep['status'], message: string, details?: Record<string, unknown>) => {
    steps.push({
      timestamp: new Date().toISOString(),
      step,
      status,
      message,
      durationMs: Date.now() - startTime,
      details,
    });
  };

  logWithContext('info', 'ai_tutor_test.run.start', {
    requestId,
    meta: { hskLevel, lessonPosition, focusWords, options }
  });

  try {
    // Check required config
    const openrouterKey = c.env.OPENROUTER_API_KEY;
    const pythonUrl = c.env.VALIDATOR_URL;
    
    if (!openrouterKey) {
      addStep('config', 'error', 'OPENROUTER_API_KEY not configured');
      return c.json<TestResult>({
        success: false,
        steps,
        summary: {
          totalDurationMs: Date.now() - startTime,
          totalCost: 0,
          cacheHit: false,
          attemptsReading: 0,
          attemptsPractice: 0,
          attemptsGrammar: 0,
        },
        error: 'OPENROUTER_API_KEY not configured',
      }, 500);
    }

    if (!pythonUrl) {
      addStep('config', 'error', 'VALIDATOR_URL not configured');
      return c.json<TestResult>({
        success: false,
        steps,
        summary: {
          totalDurationMs: Date.now() - startTime,
          totalCost: 0,
          cacheHit: false,
          attemptsReading: 0,
          attemptsPractice: 0,
          attemptsGrammar: 0,
        },
        error: 'VALIDATOR_URL not configured',
      }, 500);
    }

    addStep('config', 'success', 'Configuration validated', {
      openrouterKeyPrefix: openrouterKey.slice(0, 10) + '...',
      pythonUrl: pythonUrl,
    });

    // Step: Check Python validator is reachable
    addStep('validator_check', 'running', 'Checking Python validator connection...');
    try {
      const validatorResponse = await fetch(`${pythonUrl}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5s timeout
      });
      
      if (validatorResponse.ok) {
        addStep('validator_check', 'success', 'Python validator is reachable', {
          status: validatorResponse.status,
        });
      } else {
        addStep('validator_check', 'error', `Python validator returned ${validatorResponse.status}`, {
          status: validatorResponse.status,
        });
      }
    } catch (validatorError) {
      const errMsg = validatorError instanceof Error ? validatorError.message : 'Unknown error';
      addStep('validator_check', 'error', `Cannot reach Python validator: ${errMsg}`, {
        url: pythonUrl,
        error: errMsg,
      });
    }

    // Step: Check vocabulary endpoint specifically
    addStep('vocab_check', 'running', 'Testing vocabulary endpoint...');
    try {
      const vocabResponse = await fetch(`${pythonUrl}/get-vocabulary?max_lesson=${lessonPosition}`, { 
        method: 'GET',
        signal: AbortSignal.timeout(10000) // 10s timeout
      });
      
      if (vocabResponse.ok) {
        const vocabData = await vocabResponse.json() as { words: string[] };
        addStep('vocab_check', 'success', `Got ${vocabData.words?.length || 0} allowed words`, {
          wordCount: vocabData.words?.length || 0,
          sampleWords: vocabData.words?.slice(0, 5),
        });
      } else {
        addStep('vocab_check', 'error', `Vocabulary endpoint returned ${vocabResponse.status}`, {
          status: vocabResponse.status,
        });
      }
    } catch (vocabError) {
      const errMsg = vocabError instanceof Error ? vocabError.message : 'Unknown error';
      addStep('vocab_check', 'error', `Vocabulary endpoint failed: ${errMsg}`, {
        error: errMsg,
      });
    }

    // Check cache first (unless bypassed)
    let cacheHit = false;
    let cacheKey: string | undefined;
    
    if (!options?.bypassCache) {
      addStep('cache_lookup', 'running', 'Checking cache...');
      const cache = new TutorCache(c.env.DB, c.env.CONTENT_BUCKET);
      const cacheResult = await cache.lookup(hskLevel, lessonPosition, focusWords);
      
      if (cacheResult.hit && cacheResult.lesson) {
        cacheHit = true;
        cacheKey = cacheResult.cacheKey;
        
        addStep('cache_lookup', 'success', `Cache HIT (${cacheResult.matchType})`, {
          cacheKey: cacheResult.cacheKey,
          matchType: cacheResult.matchType,
          savedCost: cacheResult.savedCost,
        });
        
        // Simulate artificial delay for realistic testing
        if (cacheResult.artificialDelayMs) {
          addStep('artificial_delay', 'running', `Simulating delay (${cacheResult.artificialDelayMs}ms) for UX...`);
          // Don't actually wait in test mode - just log it
          addStep('artificial_delay', 'skipped', `Would delay ${cacheResult.artificialDelayMs}ms in production`);
        }
        
        return c.json<TestResult>({
          success: true,
          lesson: cacheResult.lesson,
          steps,
          summary: {
            totalDurationMs: Date.now() - startTime,
            totalCost: 0,
            cacheHit: true,
            cacheKey: cacheResult.cacheKey,
            attemptsReading: 0,
            attemptsPractice: 0,
            attemptsGrammar: 0,
          },
        });
      } else {
        addStep('cache_lookup', 'success', 'Cache MISS - will generate', {
          cacheKey: cacheResult.cacheKey,
        });
        cacheKey = cacheResult.cacheKey;
      }
    } else {
      addStep('cache_lookup', 'skipped', 'Cache bypassed (test option)');
    }

    // Initialize services
    addStep('init_services', 'running', 'Initializing AI services...');
    
    let vectorizeService: VectorizeService | undefined;
    if (c.env.VECTORIZE && c.env.AI) {
      vectorizeService = new VectorizeService(c.env.VECTORIZE, c.env.AI);
    }
    
    addStep('init_services', 'success', 'Services initialized', {
      hasVectorize: !!vectorizeService,
    });

    // Generate lesson
    addStep('generate', 'running', 'Starting lesson generation...');
    
    const generator = new AITutorGenerator(
      c.env.DB,
      c.env.CONTENT_BUCKET,
      openrouterKey,
      pythonUrl,
      vectorizeService,
      c.env.AI
    );

    // Simulate slow response if requested
    if (options?.simulateSlowResponse) {
      addStep('simulate_slow', 'running', 'Simulating slow response (5s delay)...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      addStep('simulate_slow', 'success', 'Delay complete');
    }

    let lesson;
    try {
      lesson = await generator.generateLesson({
        focusWords,
        userLessonPosition: lessonPosition,
        hskLevel,
        userId: 'test_lab_user',
      });
    } catch (genError) {
      const errorMsg = genError instanceof Error ? genError.message : 'Unknown generation error';
      addStep('generate', 'error', `Generation threw: ${errorMsg}`, {
        errorType: genError instanceof Error ? genError.name : 'Unknown',
        stack: genError instanceof Error ? genError.stack?.split('\n').slice(0, 5) : undefined,
      });
      throw genError;
    }

    // Extract metadata for summary
    const metadata = lesson.metadata;

    // Check if fallback was used - this indicates something went wrong
    if (metadata.fallbackUsed) {
      addStep('generate', 'error', 'Generation failed - fallback used', {
        warnings: metadata.warnings,
        attempts: metadata.attempts,
        durationMs: metadata.durationMs,
      });
      
      // Add specific failure reasons
      if (metadata.warnings.length > 0) {
        metadata.warnings.forEach((warning, idx) => {
          addStep(`warning_${idx}`, 'error', warning);
        });
      }
      
      if (metadata.attempts.reading === 0 && metadata.attempts.practice === 0) {
        addStep('diagnosis', 'error', 'No generation attempts made - likely config or connection issue', {
          openrouterKeyExists: !!openrouterKey,
          pythonUrlExists: !!pythonUrl,
          pythonUrl: pythonUrl,
        });
      }
      
      return c.json<TestResult>({
        success: false,
        lesson,
        steps,
        summary: {
          totalDurationMs: Date.now() - startTime,
          totalCost: metadata.totalCost,
          cacheHit: false,
          cacheKey,
          preFilterScore: metadata.qualityMetrics?.preFilterScore,
          preFilterPassed: metadata.qualityMetrics?.preFilterPassed,
          attemptsReading: metadata.attempts.reading,
          attemptsPractice: metadata.attempts.practice,
          attemptsGrammar: metadata.attempts.grammarCheck,
        },
        error: `Generation failed: ${metadata.warnings.join(', ') || 'Unknown reason - check logs'}`,
      });
    }

    addStep('generate', 'success', 'Lesson generated successfully', {
      lessonId: lesson.id,
      exerciseCount: lesson.exercises.length,
      readingSentences: lesson.reading.sentences.length,
      fallbackUsed: metadata.fallbackUsed,
      attempts: metadata.attempts,
    });

    return c.json<TestResult>({
      success: true,
      lesson,
      steps,
      summary: {
        totalDurationMs: Date.now() - startTime,
        totalCost: metadata.totalCost,
        cacheHit: false,
        cacheKey,
        preFilterScore: metadata.qualityMetrics?.preFilterScore,
        preFilterPassed: metadata.qualityMetrics?.preFilterPassed,
        attemptsReading: metadata.attempts.reading,
        attemptsPractice: metadata.attempts.practice,
        attemptsGrammar: metadata.attempts.grammarCheck,
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    addStep('error', 'error', errorMessage);
    
    logWithContext('error', 'ai_tutor_test.run.error', {
      requestId,
      meta: { error: errorMessage }
    });

    return c.json<TestResult>({
      success: false,
      steps,
      summary: {
        totalDurationMs: Date.now() - startTime,
        totalCost: 0,
        cacheHit: false,
        attemptsReading: 0,
        attemptsPractice: 0,
        attemptsGrammar: 0,
      },
      error: errorMessage,
    });
  }
});

/**
 * Get cache statistics
 * GET /v1/ai-tutor-test/cache-stats
 */
app.get('/cache-stats', async (c) => {
  try {
    const cache = new TutorCache(c.env.DB, c.env.CONTENT_BUCKET);
    const stats = await cache.getStats();
    
    return c.json({
      success: true,
      stats,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * Get suggested focus words for testing
 * GET /v1/ai-tutor-test/suggested-words?hskLevel=1
 */
app.get('/suggested-words', async (c) => {
  const hskLevel = parseInt(c.req.query('hskLevel') || '1');
  
  // Common focus words per HSK level for testing
  const suggestedWords: Record<number, string[][]> = {
    1: [
      ['学习', '中文'],
      ['喜欢', '吃'],
      ['工作', '很'],
      ['朋友', '好'],
      ['今天', '明天'],
    ],
    2: [
      ['已经', '可能'],
      ['虽然', '但是'],
      ['因为', '所以'],
      ['比较', '更'],
      ['应该', '必须'],
    ],
    3: [
      ['经验', '机会'],
      ['改变', '发展'],
      ['影响', '结果'],
      ['解决', '问题'],
      ['计划', '准备'],
    ],
    4: [
      ['积极', '消极'],
      ['复杂', '简单'],
      ['传统', '现代'],
      ['环境', '保护'],
      ['交流', '合作'],
    ],
    5: [
      ['矛盾', '和谐'],
      ['趋势', '发展'],
      ['观念', '态度'],
      ['评价', '标准'],
      ['本质', '现象'],
    ],
    6: [
      ['抽象', '具体'],
      ['客观', '主观'],
      ['深刻', '肤浅'],
      ['根本', '次要'],
      ['普遍', '特殊'],
    ],
  };

  return c.json({
    success: true,
    hskLevel,
    suggestions: suggestedWords[hskLevel] || suggestedWords[1],
  });
});

/**
 * Run batch tests
 * POST /v1/ai-tutor-test/batch
 */
app.post('/batch', zValidator('json', batchTestSchema), async (c) => {
  const { tests, options } = c.req.valid('json');
  const results: Array<{
    input: { hskLevel: number; lessonPosition: number; focusWords: string[] };
    success: boolean;
    durationMs: number;
    cost: number;
    cacheHit: boolean;
    error?: string;
  }> = [];

  const batchStartTime = Date.now();

  for (const test of tests) {
    const testStartTime = Date.now();
    
    try {
      const openrouterKey = c.env.OPENROUTER_API_KEY;
      const pythonUrl = c.env.VALIDATOR_URL;

      if (!openrouterKey || !pythonUrl) {
        results.push({
          input: test,
          success: false,
          durationMs: Date.now() - testStartTime,
          cost: 0,
          cacheHit: false,
          error: 'Missing configuration',
        });
        continue;
      }

      // Check cache
      const cache = new TutorCache(c.env.DB, c.env.CONTENT_BUCKET);
      const cacheResult = await cache.lookup(test.hskLevel, test.lessonPosition, test.focusWords);

      if (cacheResult.hit && cacheResult.lesson) {
        results.push({
          input: test,
          success: true,
          durationMs: Date.now() - testStartTime,
          cost: 0,
          cacheHit: true,
        });
        continue;
      }

      // Generate
      let vectorizeService: VectorizeService | undefined;
      if (c.env.VECTORIZE && c.env.AI) {
        vectorizeService = new VectorizeService(c.env.VECTORIZE, c.env.AI);
      }

      const generator = new AITutorGenerator(
        c.env.DB,
        c.env.CONTENT_BUCKET,
        openrouterKey,
        pythonUrl,
        vectorizeService,
        c.env.AI
      );

      const lesson = await generator.generateLesson({
        focusWords: test.focusWords,
        userLessonPosition: test.lessonPosition,
        hskLevel: test.hskLevel,
        userId: 'batch_test_user',
      });

      results.push({
        input: test,
        success: true,
        durationMs: Date.now() - testStartTime,
        cost: lesson.metadata.totalCost,
        cacheHit: false,
      });

    } catch (error) {
      results.push({
        input: test,
        success: false,
        durationMs: Date.now() - testStartTime,
        cost: 0,
        cacheHit: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const cacheHitCount = results.filter(r => r.cacheHit).length;
  const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
  const avgDuration = results.reduce((sum, r) => sum + r.durationMs, 0) / results.length;

  return c.json({
    success: true,
    summary: {
      total: results.length,
      passed: successCount,
      failed: results.length - successCount,
      cacheHits: cacheHitCount,
      totalCost,
      avgDurationMs: Math.round(avgDuration),
      totalDurationMs: Date.now() - batchStartTime,
    },
    results,
  });
});

export default app;

