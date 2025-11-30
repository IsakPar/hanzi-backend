/**
 * AI Tutor Lesson Generation Routes
 * 
 * Endpoints for generating AI Tutor lessons with reading + practice
 * 
 * @module routes/ai-tutor
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { AppBindings, AppVariables } from '../types/app';
import { AITutorGenerator, TutorLesson } from '../services/ai-tutor-generator';
import { VectorizeService } from '../services/vectorize';
import { logWithContext } from '../utils/logger';

const aiTutorRouter = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

// ═══════════════════════════════════════════════════════════
// Validation Schemas
// ═══════════════════════════════════════════════════════════

const generateLessonSchema = z.object({
  focusWords: z.array(z.string()).min(1).max(10),
  userLessonPosition: z.number().int().min(1).max(300),
  hskLevel: z.number().int().min(1).max(6),
});

// ═══════════════════════════════════════════════════════════
// POST /v1/ai-tutor/generate - Generate a lesson
// ═══════════════════════════════════════════════════════════

aiTutorRouter.post('/generate', async (c) => {
  const requestId = `ai_tutor_${Date.now()}`;
  
  try {
    // Parse and validate request body
    const body = await c.req.json();
    const validation = generateLessonSchema.safeParse(body);
    
    if (!validation.success) {
      return c.json({ 
        error: 'Invalid request body', 
        details: validation.error.errors 
      }, 400);
    }
    
    const { focusWords, userLessonPosition, hskLevel } = validation.data;
    
    // Get user from session if available
    const user = c.get('user');
    
    logWithContext('info', 'ai_tutor.generate.request', {
      requestId,
      meta: { focusWords, userLessonPosition, hskLevel, userId: user?.id }
    });
    
    // Check required environment variables
    const openrouterKey = c.env.OPENROUTER_API_KEY;
    const pythonUrl = c.env.VALIDATOR_URL;
    
    if (!openrouterKey) {
      return c.json({ error: 'OPENROUTER_API_KEY not configured' }, 500);
    }
    
    if (!pythonUrl) {
      return c.json({ error: 'VALIDATOR_URL not configured' }, 500);
    }
    
    // Initialize services
    let vectorizeService: VectorizeService | undefined;
    if (c.env.VECTORIZE && c.env.AI) {
      vectorizeService = new VectorizeService(c.env.VECTORIZE, c.env.AI);
    }
    
    const generator = new AITutorGenerator(
      c.env.DB,
      openrouterKey,
      pythonUrl,
      vectorizeService,
      c.env.AI
    );
    
    // Generate lesson
    const lesson: TutorLesson = await generator.generateLesson({
      focusWords,
      userLessonPosition,
      hskLevel,
      userId: user?.id,
    });
    
    logWithContext('info', 'ai_tutor.generate.complete', {
      requestId,
      meta: { 
        lessonId: lesson.id,
        exerciseCount: lesson.exercises.length,
        fallbackUsed: lesson.metadata.fallbackUsed,
        cost: lesson.metadata.totalCost,
        durationMs: lesson.metadata.durationMs
      }
    });
    
    return c.json({
      success: true,
      lesson,
    });
    
  } catch (error) {
    logWithContext('error', 'ai_tutor.generate.error', {
      requestId,
      meta: { error: (error as Error).message }
    });
    
    return c.json({ 
      error: 'Failed to generate lesson',
      message: (error as Error).message 
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// GET /v1/ai-tutor/health - Health check
// ═══════════════════════════════════════════════════════════

aiTutorRouter.get('/health', async (c) => {
  const checks = {
    openrouter: !!c.env.OPENROUTER_API_KEY,
    pythonValidator: !!c.env.VALIDATOR_URL,
    vectorize: !!(c.env.VECTORIZE && c.env.AI),
    database: !!c.env.DB,
  };
  
  const allHealthy = Object.values(checks).every(v => v);
  
  return c.json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  }, allHealthy ? 200 : 503);
});

export { aiTutorRouter };

