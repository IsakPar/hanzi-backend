/**
 * Admin K6 Results API
 * 
 * Provides access to k6 load test results stored in R2.
 * Used by the portal performance dashboard.
 */

import { Hono } from 'hono';
import type { AppContext } from '../types';
import { jwtAuthMiddleware } from '../middleware/jwt-auth';
import { adminRateLimit } from '../middleware/rate-limit';

const app = new Hono<AppContext>();

// Require admin authentication
app.use('/*', jwtAuthMiddleware({ allowRoles: ['admin'] }), adminRateLimit);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface K6Result {
  id: string;
  test_type: 'smoke' | 'load' | 'soak' | 'stress';
  timestamp: string;
  date: string;
  commit_sha: string;
  branch: string;
  status: 'success' | 'failure';
  summary: K6Summary;
  github_run_url: string;
}

interface K6Summary {
  metrics?: {
    http_req_duration?: {
      avg: number;
      min: number;
      med: number;
      max: number;
      'p(90)': number;
      'p(95)': number;
      'p(99)': number;
    };
    http_req_failed?: {
      rate: number;
    };
    http_reqs?: {
      count: number;
      rate: number;
    };
    iterations?: {
      count: number;
      rate: number;
    };
  };
}

interface K6ResultsListResponse {
  results: K6ResultListItem[];
  total: number;
  hasMore: boolean;
}

interface K6ResultListItem {
  id: string;
  test_type: string;
  timestamp: string;
  status: string;
  p95_ms: number | null;
  error_rate: number | null;
  total_requests: number | null;
}

interface K6DashboardSummary {
  latest_smoke: K6ResultListItem | null;
  latest_load: K6ResultListItem | null;
  latest_soak: K6ResultListItem | null;
  trends: {
    dates: string[];
    p95_values: (number | null)[];
    error_rates: (number | null)[];
  };
  health: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/admin/k6-results - List recent test runs
// ─────────────────────────────────────────────────────────────────────────────
app.get('/', async (c) => {
  const bucket = c.env.CONTENT_BUCKET;
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
  const testType = c.req.query('type'); // Optional filter

  try {
    // List objects in k6-results/ prefix
    const listResult = await bucket.list({
      prefix: 'k6-results/',
      limit: 200, // Fetch more to filter/sort
    });

    // Parse and filter results
    let results: K6ResultListItem[] = [];

    for (const obj of listResult.objects) {
      // Extract date and filename from key: k6-results/2024-12-01/smoke-12345.json
      const parts = obj.key.split('/');
      if (parts.length < 3) continue;

      const filename = parts[2];
      const testTypeMatch = filename.match(/^(smoke|load|soak|stress)-/);
      if (!testTypeMatch) continue;

      const objTestType = testTypeMatch[1];

      // Apply filter if specified
      if (testType && objTestType !== testType) continue;

      // Fetch the object to get details
      const objData = await bucket.get(obj.key);
      if (!objData) continue;

      try {
        const data: K6Result = await objData.json();
        results.push({
          id: data.id,
          test_type: data.test_type,
          timestamp: data.timestamp,
          status: data.status,
          p95_ms: data.summary?.metrics?.http_req_duration?.['p(95)'] ?? null,
          error_rate: data.summary?.metrics?.http_req_failed?.rate ?? null,
          total_requests: data.summary?.metrics?.http_reqs?.count ?? null,
        });
      } catch {
        // Skip malformed entries
      }
    }

    // Sort by timestamp descending
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply limit
    const hasMore = results.length > limit;
    results = results.slice(0, limit);

    const response: K6ResultsListResponse = {
      results,
      total: results.length,
      hasMore,
    };

    return c.json(response);
  } catch (error) {
    console.error('Failed to list k6 results:', error);
    return c.json({ error: 'Failed to list k6 results' }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/admin/k6-results/summary - Dashboard summary
// ─────────────────────────────────────────────────────────────────────────────
app.get('/summary', async (c) => {
  const bucket = c.env.CONTENT_BUCKET;

  try {
    // List recent results
    const listResult = await bucket.list({
      prefix: 'k6-results/',
      limit: 100,
    });

    const allResults: K6Result[] = [];

    for (const obj of listResult.objects) {
      const objData = await bucket.get(obj.key);
      if (!objData) continue;

      try {
        const data: K6Result = await objData.json();
        allResults.push(data);
      } catch {
        // Skip malformed
      }
    }

    // Sort by timestamp
    allResults.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Find latest of each type
    const findLatest = (type: string) => {
      const found = allResults.find(r => r.test_type === type);
      if (!found) return null;
      return {
        id: found.id,
        test_type: found.test_type,
        timestamp: found.timestamp,
        status: found.status,
        p95_ms: found.summary?.metrics?.http_req_duration?.['p(95)'] ?? null,
        error_rate: found.summary?.metrics?.http_req_failed?.rate ?? null,
        total_requests: found.summary?.metrics?.http_reqs?.count ?? null,
      };
    };

    // Build trends (last 30 days of smoke tests)
    const smokeResults = allResults
      .filter(r => r.test_type === 'smoke')
      .slice(0, 30)
      .reverse();

    const trends = {
      dates: smokeResults.map(r => r.date),
      p95_values: smokeResults.map(r => r.summary?.metrics?.http_req_duration?.['p(95)'] ?? null),
      error_rates: smokeResults.map(r => r.summary?.metrics?.http_req_failed?.rate ?? null),
    };

    // Determine health status
    let health: 'healthy' | 'degraded' | 'unhealthy' | 'unknown' = 'unknown';
    const latestSmoke = findLatest('smoke');
    
    if (latestSmoke) {
      if (latestSmoke.status === 'failure') {
        health = 'unhealthy';
      } else if (latestSmoke.p95_ms && latestSmoke.p95_ms > 500) {
        health = 'degraded';
      } else if (latestSmoke.error_rate && latestSmoke.error_rate > 0.01) {
        health = 'degraded';
      } else {
        health = 'healthy';
      }
    }

    const summary: K6DashboardSummary = {
      latest_smoke: findLatest('smoke'),
      latest_load: findLatest('load'),
      latest_soak: findLatest('soak'),
      trends,
      health,
    };

    return c.json(summary);
  } catch (error) {
    console.error('Failed to get k6 summary:', error);
    return c.json({ error: 'Failed to get k6 summary' }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/admin/k6-results/:id - Get specific result details
// ─────────────────────────────────────────────────────────────────────────────
app.get('/:id', async (c) => {
  const bucket = c.env.CONTENT_BUCKET;
  const id = c.req.param('id');

  try {
    // Search for the result by ID
    // ID format: {run_id}-{test_type}
    const listResult = await bucket.list({
      prefix: 'k6-results/',
      limit: 500,
    });

    for (const obj of listResult.objects) {
      const objData = await bucket.get(obj.key);
      if (!objData) continue;

      try {
        const data: K6Result = await objData.json();
        if (data.id === id) {
          return c.json(data);
        }
      } catch {
        // Skip malformed
      }
    }

    return c.json({ error: 'Result not found' }, 404);
  } catch (error) {
    console.error('Failed to get k6 result:', error);
    return c.json({ error: 'Failed to get k6 result' }, 500);
  }
});

export { app as adminK6Router };

