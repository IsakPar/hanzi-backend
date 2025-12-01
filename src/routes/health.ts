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

export default app;

