/**
 * Rate Limiting Middleware
 * 
 * Simple IP-based rate limiting using Cloudflare KV.
 * Used to protect auth endpoints from brute force attacks.
 */

import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../types/app';

interface RateLimitOptions {
  /** Maximum requests allowed in the window */
  max: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Key prefix for KV storage */
  keyPrefix?: string;
}

/**
 * Create a rate limiting middleware
 */
export function rateLimit(options: RateLimitOptions): MiddlewareHandler<AppEnv> {
  const { max, windowSeconds, keyPrefix = 'rl' } = options;

  return async (c, next) => {
    // Get client IP (Cloudflare provides this)
    const ip = c.req.header('CF-Connecting-IP') || 
               c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() || 
               'unknown';
    
    // Build the rate limit key
    const key = `${keyPrefix}:${ip}`;
    
    // Try to get KV binding
    const kv = c.env.RATE_LIMIT_KV;
    
    if (!kv) {
      // No KV configured - skip rate limiting but log warning
      console.warn('RATE_LIMIT_KV not configured - skipping rate limit');
      await next();
      return;
    }

    try {
      // Get current count
      const current = await kv.get(key);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= max) {
        // Rate limit exceeded
        return c.json(
          { 
            error: 'Too many requests', 
            code: 'RATE_LIMITED',
            retryAfter: windowSeconds 
          },
          429,
          {
            'Retry-After': String(windowSeconds),
            'X-RateLimit-Limit': String(max),
            'X-RateLimit-Remaining': '0',
          }
        );
      }

      // Increment counter
      await kv.put(key, String(count + 1), {
        expirationTtl: windowSeconds,
      });

      // Add rate limit headers
      c.header('X-RateLimit-Limit', String(max));
      c.header('X-RateLimit-Remaining', String(max - count - 1));

      await next();
    } catch (error) {
      // On error, allow the request but log
      console.error('Rate limit error:', error);
      await next();
    }
  };
}

/**
 * Pre-configured rate limits for auth endpoints
 */
export const authRateLimit = rateLimit({
  max: 10,           // 10 attempts
  windowSeconds: 300, // per 5 minutes
  keyPrefix: 'auth',
});

/**
 * Stricter rate limit for password reset
 */
export const passwordResetRateLimit = rateLimit({
  max: 3,            // 3 attempts
  windowSeconds: 3600, // per hour
  keyPrefix: 'pwreset',
});

