/**
 * Health Check Routes
 * 
 * Comprehensive endpoint testing and system health monitoring.
 * Includes both public health check and admin-only detailed diagnostics.
 */

import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { sql } from 'drizzle-orm';
import { jwtAuthMiddleware } from '../middleware/jwt-auth';
import type { AppEnv } from '../types/app';
import { logWithContext } from '../utils/logger';

const app = new Hono<AppEnv>();

interface EndpointTest {
  name: string;
  path: string;
  method: string;
  status: 'pass' | 'fail' | 'skip';
  responseTime?: number;
  error?: string;
  details?: string;
}

interface HealthReport {
  timestamp: string;
  overall: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  environment: string;
  services: {
    database: { status: 'up' | 'down'; latencyMs?: number; error?: string };
    r2: { status: 'up' | 'down' | 'unknown'; error?: string };
    vectorize: { status: 'up' | 'down' | 'unknown'; error?: string };
    kv: { status: 'up' | 'down' | 'unknown'; error?: string };
  };
  endpoints?: EndpointTest[];
}

/**
 * GET /health - Public health check (simple)
 */
app.get('/', async (c) => {
  const start = Date.now();
  let dbStatus: 'up' | 'down' = 'down';
  let dbLatency: number | undefined;
  let dbError: string | undefined;

  // Test database connection
  try {
    const db = drizzle(c.env.DB);
    const result = await db.run(sql`SELECT 1 as test`);
    dbLatency = Date.now() - start;
    dbStatus = 'up';
  } catch (err) {
    dbError = (err as Error).message;
  }

  const report: HealthReport = {
    timestamp: new Date().toISOString(),
    overall: dbStatus === 'up' ? 'healthy' : 'unhealthy',
    version: '1.0.0',
    environment: (c.env as Record<string, unknown>).ENVIRONMENT as string || 'unknown',
    services: {
      database: { status: dbStatus, latencyMs: dbLatency, error: dbError },
      r2: { status: 'unknown' },
      vectorize: { status: 'unknown' },
      kv: { status: 'unknown' },
    },
  };

  const statusCode = report.overall === 'healthy' ? 200 : 503;
  return c.json(report, statusCode);
});

/**
 * GET /health/detailed - Admin-only detailed health check
 * Tests all critical services and endpoints
 */
app.get('/detailed', jwtAuthMiddleware({ allowRoles: ['admin'] }), async (c) => {
  const requestId = c.get('requestId');
  const start = Date.now();
  const endpoints: EndpointTest[] = [];

  logWithContext('info', 'health.detailed_check_start', { requestId });

  // 1. Test Database
  let dbStatus: 'up' | 'down' = 'down';
  let dbLatency: number | undefined;
  let dbError: string | undefined;

  try {
    const dbStart = Date.now();
    const db = drizzle(c.env.DB);
    await db.run(sql`SELECT 1`);
    dbLatency = Date.now() - dbStart;
    dbStatus = 'up';
    endpoints.push({
      name: 'Database Connection',
      path: 'D1',
      method: 'SELECT',
      status: 'pass',
      responseTime: dbLatency,
    });
  } catch (err) {
    dbError = (err as Error).message;
    endpoints.push({
      name: 'Database Connection',
      path: 'D1',
      method: 'SELECT',
      status: 'fail',
      error: dbError,
    });
  }

  // 2. Test R2 Bucket
  let r2Status: 'up' | 'down' | 'unknown' = 'unknown';
  let r2Error: string | undefined;

  try {
    const r2Start = Date.now();
    // Try to list objects (with limit 1) to verify bucket access
    const list = await c.env.CONTENT_BUCKET.list({ limit: 1 });
    const r2Latency = Date.now() - r2Start;
    r2Status = 'up';
    endpoints.push({
      name: 'R2 Bucket Access',
      path: 'CONTENT_BUCKET',
      method: 'LIST',
      status: 'pass',
      responseTime: r2Latency,
      details: `${list.objects.length} objects listed`,
    });
  } catch (err) {
    r2Status = 'down';
    r2Error = (err as Error).message;
    endpoints.push({
      name: 'R2 Bucket Access',
      path: 'CONTENT_BUCKET',
      method: 'LIST',
      status: 'fail',
      error: r2Error,
    });
  }

  // 3. Test Vectorize
  let vectorizeStatus: 'up' | 'down' | 'unknown' = 'unknown';
  let vectorizeError: string | undefined;

  try {
    if (c.env.VECTORIZE) {
      const vecStart = Date.now();
      // Just check if we can access it
      const info = await c.env.VECTORIZE.describe();
      const vecLatency = Date.now() - vecStart;
      vectorizeStatus = 'up';
      endpoints.push({
        name: 'Vectorize Index',
        path: 'VECTORIZE',
        method: 'DESCRIBE',
        status: 'pass',
        responseTime: vecLatency,
      });
    } else {
      vectorizeStatus = 'unknown';
      endpoints.push({
        name: 'Vectorize Index',
        path: 'VECTORIZE',
        method: 'DESCRIBE',
        status: 'skip',
        details: 'Not configured',
      });
    }
  } catch (err) {
    vectorizeStatus = 'down';
    vectorizeError = (err as Error).message;
    endpoints.push({
      name: 'Vectorize Index',
      path: 'VECTORIZE',
      method: 'DESCRIBE',
      status: 'fail',
      error: vectorizeError,
    });
  }

  // 4. Test KV
  let kvStatus: 'up' | 'down' | 'unknown' = 'unknown';
  let kvError: string | undefined;

  try {
    if (c.env.RATE_LIMIT_KV) {
      const kvStart = Date.now();
      await c.env.RATE_LIMIT_KV.get('health_check_test');
      const kvLatency = Date.now() - kvStart;
      kvStatus = 'up';
      endpoints.push({
        name: 'KV Store',
        path: 'RATE_LIMIT_KV',
        method: 'GET',
        status: 'pass',
        responseTime: kvLatency,
      });
    } else {
      kvStatus = 'unknown';
      endpoints.push({
        name: 'KV Store',
        path: 'RATE_LIMIT_KV',
        method: 'GET',
        status: 'skip',
        details: 'Not configured',
      });
    }
  } catch (err) {
    kvStatus = 'down';
    kvError = (err as Error).message;
    endpoints.push({
      name: 'KV Store',
      path: 'RATE_LIMIT_KV',
      method: 'GET',
      status: 'fail',
      error: kvError,
    });
  }

  // 5. Test Database Tables
  const tables = ['vocabulary', 'lessons', 'stories', 'waitlist', 'ba_user'];
  for (const table of tables) {
    try {
      const tableStart = Date.now();
      const db = drizzle(c.env.DB);
      const result = await db.run(sql.raw(`SELECT COUNT(*) as count FROM ${table}`));
      const tableLatency = Date.now() - tableStart;
      const count = (result.results?.[0] as any)?.count ?? 'unknown';
      endpoints.push({
        name: `Table: ${table}`,
        path: table,
        method: 'COUNT',
        status: 'pass',
        responseTime: tableLatency,
        details: `${count} rows`,
      });
    } catch (err) {
      endpoints.push({
        name: `Table: ${table}`,
        path: table,
        method: 'COUNT',
        status: 'fail',
        error: (err as Error).message,
      });
    }
  }

  // Calculate overall status
  const failCount = endpoints.filter(e => e.status === 'fail').length;
  const overall = failCount === 0 ? 'healthy' : failCount <= 2 ? 'degraded' : 'unhealthy';

  const report: HealthReport = {
    timestamp: new Date().toISOString(),
    overall,
    version: '1.0.0',
    environment: (c.env as Record<string, unknown>).ENVIRONMENT as string || 'unknown',
    services: {
      database: { status: dbStatus, latencyMs: dbLatency, error: dbError },
      r2: { status: r2Status, error: r2Error },
      vectorize: { status: vectorizeStatus, error: vectorizeError },
      kv: { status: kvStatus, error: kvError },
    },
    endpoints,
  };

  logWithContext('info', 'health.detailed_check_complete', {
    requestId,
    meta: { overall, failCount, duration: Date.now() - start },
  });

  return c.json(report);
});

/**
 * GET /health/endpoints - List all available API endpoints
 */
app.get('/endpoints', jwtAuthMiddleware({ allowRoles: ['admin'] }), async (c) => {
  // This is a static list of all major endpoints for reference
  const endpoints = [
    // Public
    { method: 'GET', path: '/', auth: 'none', description: 'Health check' },
    { method: 'GET', path: '/v1/vocabulary', auth: 'none', description: 'List vocabulary' },
    { method: 'GET', path: '/v1/vocabulary/:id', auth: 'none', description: 'Get vocabulary entry' },
    { method: 'POST', path: '/v1/waitlist', auth: 'none', description: 'Join waitlist' },
    { method: 'GET', path: '/v1/curriculum/hsk/:level', auth: 'none', description: 'Get HSK level content' },
    
    // Auth
    { method: 'POST', path: '/v1/auth/token/login', auth: 'none', description: 'Login' },
    { method: 'POST', path: '/v1/auth/token/refresh', auth: 'refresh', description: 'Refresh token' },
    { method: 'GET', path: '/v1/auth/token/me', auth: 'bearer', description: 'Get current user' },
    { method: 'POST', path: '/v1/auth/token/logout', auth: 'none', description: 'Logout' },
    
    // Admin - Vocabulary
    { method: 'POST', path: '/v1/vocabulary/admin', auth: 'admin', description: 'Create vocabulary' },
    { method: 'PUT', path: '/v1/vocabulary/admin/:id', auth: 'admin', description: 'Update vocabulary' },
    { method: 'DELETE', path: '/v1/vocabulary/admin/:id', auth: 'admin', description: 'Delete vocabulary' },
    { method: 'POST', path: '/v1/vocabulary/admin/:id/preview-word-audio', auth: 'admin', description: 'Preview word audio' },
    { method: 'POST', path: '/v1/vocabulary/admin/:id/save-word-audio', auth: 'admin', description: 'Save word audio' },
    { method: 'POST', path: '/v1/vocabulary/admin/:id/preview-example-audio', auth: 'admin', description: 'Preview example audio' },
    { method: 'POST', path: '/v1/vocabulary/admin/:id/save-example-audio', auth: 'admin', description: 'Save example audio' },
    
    // Admin - Lessons
    { method: 'GET', path: '/v1/lessons', auth: 'admin', description: 'List lessons' },
    { method: 'GET', path: '/v1/lessons/:id', auth: 'admin', description: 'Get lesson' },
    { method: 'POST', path: '/v1/lessons', auth: 'admin', description: 'Create lesson' },
    { method: 'PUT', path: '/v1/lessons/:id', auth: 'admin', description: 'Update lesson' },
    { method: 'DELETE', path: '/v1/lessons/:id', auth: 'admin', description: 'Delete lesson' },
    
    // Admin - Speech
    { method: 'GET', path: '/v1/speech/voices', auth: 'user', description: 'List voices' },
    { method: 'POST', path: '/v1/speech/preview-for-lesson', auth: 'user', description: 'Preview lesson audio' },
    { method: 'POST', path: '/v1/speech/save-for-lesson', auth: 'user', description: 'Save lesson audio' },
    
    // Admin - Analytics
    { method: 'GET', path: '/v1/analytics/users', auth: 'admin', description: 'User analytics' },
    { method: 'GET', path: '/v1/analytics/ai', auth: 'admin', description: 'AI usage analytics' },
    
    // AI
    { method: 'POST', path: '/v1/ai/chat', auth: 'admin', description: 'AI chat' },
    { method: 'POST', path: '/v1/ai/suggest', auth: 'admin', description: 'AI content suggestions' },
    
    // Health
    { method: 'GET', path: '/v1/health', auth: 'none', description: 'Simple health check' },
    { method: 'GET', path: '/v1/health/detailed', auth: 'admin', description: 'Detailed health check' },
  ];

  return c.json({
    count: endpoints.length,
    endpoints,
  });
});

/**
 * GET /health/test-all - Run comprehensive endpoint tests
 * Tests all major endpoints and returns detailed results
 */
app.get('/test-all', jwtAuthMiddleware({ allowRoles: ['admin'] }), async (c) => {
  const requestId = c.get('requestId');
  const start = Date.now();
  
  logWithContext('info', 'health.test_all_start', { requestId });

  const results: EndpointTest[] = [];
  const baseUrl = (c.env as Record<string, unknown>).PORTAL_URL 
    ? 'https://api.studio.polymasterlabs.com'
    : 'http://localhost:8787';
  const cdnUrl = (c.env as Record<string, unknown>).CDN_BASE_URL as string || 'https://content.polymasterlabs.com';

  // Helper function to test an endpoint
  async function testEndpoint(name: string, path: string, method: string, options: RequestInit = {}): Promise<EndpointTest> {
    const testStart = Date.now();
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        ...options,
      });
      
      return {
        name,
        path,
        method,
        status: response.ok ? 'pass' : 'fail',
        responseTime: Date.now() - testStart,
        details: `HTTP ${response.status}`,
      };
    } catch (err) {
      return {
        name,
        path,
        method,
        status: 'fail',
        responseTime: Date.now() - testStart,
        error: (err as Error).message,
      };
    }
  }

  // Helper for internal tests (using c.env directly)
  async function testInternal(name: string, test: () => Promise<void>): Promise<EndpointTest> {
    const testStart = Date.now();
    try {
      await test();
      return {
        name,
        path: 'internal',
        method: 'INTERNAL',
        status: 'pass',
        responseTime: Date.now() - testStart,
      };
    } catch (err) {
      return {
        name,
        path: 'internal',
        method: 'INTERNAL',
        status: 'fail',
        responseTime: Date.now() - testStart,
        error: (err as Error).message,
      };
    }
  }

  // ===== 1. PUBLIC ENDPOINTS =====
  results.push(await testEndpoint('Health Check', '/v1/health', 'GET'));
  results.push(await testEndpoint('Vocabulary List', '/v1/vocabulary', 'GET'));
  results.push(await testEndpoint('Vocabulary Single', '/v1/vocabulary?limit=1', 'GET'));
  results.push(await testEndpoint('HSK1 Curriculum', '/v1/curriculum/hsk/1', 'GET'));

  // ===== 2. INTERNAL SERVICE TESTS =====
  
  // Database tables
  const tables = ['vocabulary', 'lessons', 'stories', 'waitlist', 'ba_user', 'lesson_blocks'];
  for (const table of tables) {
    results.push(await testInternal(`DB Table: ${table}`, async () => {
      const db = drizzle(c.env.DB);
      const result = await db.run(sql.raw(`SELECT COUNT(*) as count FROM ${table}`));
      const count = (result.results?.[0] as any)?.count;
      if (count === undefined) throw new Error('No count returned');
    }));
  }

  // R2 Bucket
  results.push(await testInternal('R2 Bucket List', async () => {
    const list = await c.env.CONTENT_BUCKET.list({ limit: 1 });
  }));

  // R2 Bucket - Check for audio folder
  results.push(await testInternal('R2 Audio Folder', async () => {
    const list = await c.env.CONTENT_BUCKET.list({ prefix: 'audio/', limit: 5 });
    if (list.objects.length === 0) {
      throw new Error('No audio files found in R2');
    }
  }));

  // KV Store
  if (c.env.RATE_LIMIT_KV) {
    results.push(await testInternal('KV Store', async () => {
      await c.env.RATE_LIMIT_KV.get('health_test');
    }));
  }

  // Vectorize
  if (c.env.VECTORIZE) {
    results.push(await testInternal('Vectorize Index', async () => {
      await c.env.VECTORIZE.describe();
    }));
  }

  // ===== 3. CDN TESTS =====
  results.push(await testEndpoint('CDN Root', cdnUrl, 'HEAD'));
  
  // Test a known audio file (if we have vocab with audio)
  try {
    const db = drizzle(c.env.DB);
    const vocabWithAudio = await db.run(sql`
      SELECT word_audio_r2_key FROM vocabulary 
      WHERE word_audio_r2_key IS NOT NULL 
      LIMIT 1
    `);
    if (vocabWithAudio.results && vocabWithAudio.results.length > 0) {
      const audioKey = (vocabWithAudio.results[0] as any).word_audio_r2_key;
      if (audioKey) {
        results.push(await testEndpoint('CDN Audio File', `${cdnUrl}/${audioKey}`, 'HEAD'));
      }
    }
  } catch {
    results.push({
      name: 'CDN Audio File',
      path: cdnUrl,
      method: 'HEAD',
      status: 'skip',
      details: 'No vocab with audio found',
    });
  }

  // ===== 4. EXTERNAL API TESTS =====
  
  // ElevenLabs API (just check if configured)
  const elevenLabsKey = (c.env as Record<string, unknown>).ELEVENLABS_API_KEY;
  if (elevenLabsKey) {
    results.push(await testEndpoint(
      'ElevenLabs Voices',
      'https://api.elevenlabs.io/v1/voices',
      'GET',
      { headers: { 'xi-api-key': elevenLabsKey as string } }
    ));
  } else {
    results.push({
      name: 'ElevenLabs API',
      path: 'ELEVENLABS_API_KEY',
      method: 'CONFIG',
      status: 'skip',
      details: 'Not configured',
    });
  }

  // OpenRouter/AI API (just check if key exists)
  const aiKey = (c.env as Record<string, unknown>).OPENROUTER_API_KEY || (c.env as Record<string, unknown>).OPENAI_API_KEY;
  results.push({
    name: 'AI API Key',
    path: 'OPENROUTER/OPENAI',
    method: 'CONFIG',
    status: aiKey ? 'pass' : 'fail',
    details: aiKey ? 'Configured' : 'Missing OPENROUTER_API_KEY or OPENAI_API_KEY',
  });

  // ===== SUMMARY =====
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;
  const overall = failed === 0 ? 'healthy' : failed <= 3 ? 'degraded' : 'unhealthy';

  logWithContext('info', 'health.test_all_complete', {
    requestId,
    meta: { passed, failed, skipped, overall, duration: Date.now() - start },
  });

  return c.json({
    timestamp: new Date().toISOString(),
    duration: Date.now() - start,
    overall,
    summary: { passed, failed, skipped, total: results.length },
    results,
  });
});

export default app;

