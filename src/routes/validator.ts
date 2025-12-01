/**
 * Validator Proxy Routes
 * Proxies requests to the vocab-validator service on Sevalla
 * 
 * Endpoints:
 * - GET /v1/validator/health
 * - GET /v1/validator/version
 * - POST /v1/validator/sync (requires admin)
 * - POST /v1/validator/test (requires admin)
 * 
 * 85 LOC
 */

import { Hono } from 'hono';
import type { AppEnv } from '../types/app';
import { jwtAuthMiddleware } from '../middleware/jwt-auth';
import { logWithContext } from '../utils/logger';
import { adminRateLimit } from '../middleware/rate-limit';

const validatorRouter = new Hono<AppEnv>();

// Apply rate limiting
validatorRouter.use('/*', adminRateLimit);

// Helper to get validator URL
function getValidatorUrl(c: any): string {
  return c.env.VALIDATOR_URL || 'https://hanzi-vocab-val-u53gq.sevalla.app';
}

// ═══════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS (for dashboard status display)
// ═══════════════════════════════════════════════════════════

// GET /health - Check validator health
validatorRouter.get('/health', async (c) => {
  const validatorUrl = getValidatorUrl(c);
  
  try {
    const response = await fetch(`${validatorUrl}/health`);
    const data = await response.json();
    return c.json(data);
  } catch (error) {
    logWithContext('error', 'validator.health_failed', {
      meta: { error: error instanceof Error ? error.message : String(error) }
    });
    return c.json({ 
      status: 'unreachable', 
      error: error instanceof Error ? error.message : 'Connection failed' 
    }, 503);
  }
});

// GET /version - Get validator version
validatorRouter.get('/version', async (c) => {
  const validatorUrl = getValidatorUrl(c);
  
  try {
    const response = await fetch(`${validatorUrl}/version`);
    const data = await response.json();
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Validator unreachable' }, 503);
  }
});

// ═══════════════════════════════════════════════════════════
// ADMIN ENDPOINTS (require authentication)
// ═══════════════════════════════════════════════════════════

// POST /sync - Trigger curriculum sync (admin only)
validatorRouter.post('/sync', jwtAuthMiddleware({ allowRoles: ['admin'] }), async (c) => {
  const validatorUrl = getValidatorUrl(c);
  const apiKey = c.env.VALIDATOR_API_KEY;
  
  try {
    const response = await fetch(`${validatorUrl}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey || '',
      },
    });
    
    const data = await response.json() as { detail?: string; [key: string]: unknown };
    
    if (!response.ok) {
      return c.json({ error: data.detail || 'Sync failed' }, response.status as 400 | 500);
    }
    
    return c.json(data);
  } catch (error) {
    logWithContext('error', 'validator.sync_failed', {
      meta: { error: error instanceof Error ? error.message : String(error) }
    });
    return c.json({ error: 'Failed to sync validator' }, 500);
  }
});

// POST /test - Test validation (admin only)
validatorRouter.post('/test', jwtAuthMiddleware({ allowRoles: ['admin'] }), async (c) => {
  const validatorUrl = getValidatorUrl(c);
  
  try {
    const body = await c.req.json();
    
    const response = await fetch(`${validatorUrl}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return c.json(data);
  } catch (error) {
    logWithContext('error', 'validator.test_failed', {
      meta: { error: error instanceof Error ? error.message : String(error) }
    });
    return c.json({ error: 'Validation test failed' }, 500);
  }
});

export default validatorRouter;

