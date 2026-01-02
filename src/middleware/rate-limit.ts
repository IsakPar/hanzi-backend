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

// ═══════════════════════════════════════════════════════════════════════════
// PRE-CONFIGURED RATE LIMITS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Auth endpoints - strictest (brute force protection)
 * 30 requests per 5 minutes (increased for dev)
 */
export const authRateLimit = rateLimit({
  max: 30,
  windowSeconds: 300,
  keyPrefix: 'auth',
});

/**
 * Password reset - very strict
 * 3 requests per hour
 */
export const passwordResetRateLimit = rateLimit({
  max: 3,
  windowSeconds: 3600,
  keyPrefix: 'pwreset',
});

/**
 * Public endpoints (waitlist, curriculum, announcements)
 * 30 requests per minute - generous for legitimate users
 */
export const publicRateLimit = rateLimit({
  max: 30,
  windowSeconds: 60,
  keyPrefix: 'public',
});

/**
 * AI/Expensive operations (AI generation, speech synthesis)
 * 20 requests per minute - protects cost
 */
export const aiRateLimit = rateLimit({
  max: 20,
  windowSeconds: 60,
  keyPrefix: 'ai',
});

/**
 * Admin endpoints - moderate
 * 100 requests per minute - admins need flexibility
 */
export const adminRateLimit = rateLimit({
  max: 100,
  windowSeconds: 60,
  keyPrefix: 'admin',
});

/**
 * R2 Upload endpoints (admin only) - very high limit
 * 500 requests per minute - R2 uploads are cheap, no external API cost
 * Used for saving audio, images to R2
 */
export const r2UploadRateLimit = rateLimit({
  max: 500,
  windowSeconds: 60,
  keyPrefix: 'r2-upload',
});

/**
 * Standard API endpoints - generous
 * 200 requests per minute - normal usage
 */
export const apiRateLimit = rateLimit({
  max: 200,
  windowSeconds: 60,
  keyPrefix: 'api',
});

/**
 * Upload endpoints - moderate
 * 30 requests per minute - prevent abuse
 */
export const uploadRateLimit = rateLimit({
  max: 30,
  windowSeconds: 60,
  keyPrefix: 'upload',
});

/**
 * Webhook endpoints - high throughput
 * 500 requests per minute - webhooks can burst
 */
export const webhookRateLimit = rateLimit({
  max: 500,
  windowSeconds: 60,
  keyPrefix: 'webhook',
});

/**
 * Bulk AI tagging - higher limit for batch operations
 * 100 requests per minute - allows batch tagging ~100 words
 */
export const bulkTaggingRateLimit = rateLimit({
  max: 100,
  windowSeconds: 60,
  keyPrefix: 'bulk-tag',
});

