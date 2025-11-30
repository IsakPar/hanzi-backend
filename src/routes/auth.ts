/**
 * Better Auth Route Handler
 * 
 * Mounts Better Auth at /v1/auth/*
 * All auth endpoints are handled by Better Auth automatically
 */

import { Hono } from 'hono';
import { createAuth } from '../lib/auth';
import type { AppEnv } from '../types/app';

const authRouter = new Hono<AppEnv>();

/**
 * Bootstrap endpoint: Promote a user to admin
 * Only works if no admins exist yet (bootstrap scenario)
 * Or if the request comes from localhost
 */
authRouter.post('/promote-admin', async (c) => {
  const body = await c.req.json();
  const { email } = body;

  if (!email) {
    return c.json({ error: 'Email required' }, 400);
  }

  // Check if request is from localhost (bootstrap scenario)
  const origin = c.req.header('origin') || '';
  const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
  
  if (!isLocal) {
    return c.json({ error: 'This endpoint is only available locally' }, 403);
  }

  try {
    // Update user role to admin
    await c.env.DB
      .prepare('UPDATE ba_user SET role = ?, tier = ? WHERE email = ?')
      .bind('admin', 'pro', email)
      .run();

    return c.json({ success: true, message: `User ${email} promoted to admin` });
  } catch (error) {
    return c.json({ error: 'Failed to promote user' }, 500);
  }
});

/**
 * Handle all auth requests through Better Auth
 * Better Auth exposes endpoints like:
 * - POST /sign-up/email
 * - POST /sign-in/email
 * - POST /sign-out
 * - GET /session
 * - POST /forget-password
 * - POST /reset-password
 * - etc.
 */
authRouter.all('/*', async (c) => {
  const origin = c.req.header('Origin');
  
  // Handle preflight OPTIONS requests
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  
  try {
    const auth = createAuth(c.env.DB, {
      BETTER_AUTH_SECRET: c.env.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: c.env.BETTER_AUTH_URL,
      RESEND_API_KEY: c.env.RESEND_API_KEY,
      PORTAL_URL: c.env.PORTAL_URL,
    });
    
    // Better Auth expects the full path, so we need to construct it
    const url = new URL(c.req.url);
    // Rewrite path from /v1/auth/* to /api/auth/*
    url.pathname = url.pathname.replace('/v1/auth', '/api/auth');
    
    const request = new Request(url.toString(), {
      method: c.req.method,
      headers: c.req.raw.headers,
      body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? c.req.raw.body : undefined,
    });
    
    const response = await auth.handler(request);
    
    // Clone response and add CORS headers
    const headers = new Headers(response.headers);
    if (origin) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    console.error('Auth error:', error);
    const errorResponse = c.json({ 
      error: 'Authentication service error', 
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
    
    // Add CORS headers to error response
    if (origin) {
      errorResponse.headers.set('Access-Control-Allow-Origin', origin);
      errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    return errorResponse;
  }
});

export default authRouter;
