/**
 * Better Auth Session Middleware
 * 
 * Validates session cookies and sets user context.
 * Uses direct database queries for session validation (same as Better Auth internally).
 */

import { HTTPException } from 'hono/http-exception';
import type { MiddlewareHandler } from 'hono';
import type { AppEnv, AppUser } from '../types/app';
import type { D1Database } from '@cloudflare/workers-types';

type AuthOptions = {
  allowRoles?: AppUser['role'][];
};

// Better Auth cookie name
const SESSION_COOKIE_NAME = 'better-auth.session_token';

/**
 * Parse session token from Cookie header
 */
function parseSessionToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').map(c => c.trim());
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=');
    if (name === SESSION_COOKIE_NAME && value) {
      return value;
    }
  }
  return null;
}

/**
 * Validate session directly in database
 * Returns user if session is valid, null otherwise
 */
async function validateSession(
  db: D1Database,
  sessionToken: string
): Promise<{ id: string; email: string; role: 'admin' | 'user'; tier: 'free' | 'premium' | 'pro' } | null> {
  try {
    // Query session and join with user
    const result = await db
      .prepare(`
        SELECT 
          s.userId,
          s.expiresAt,
          u.email,
          u.role,
          u.tier
        FROM ba_session s
        JOIN ba_user u ON s.userId = u.id
        WHERE s.token = ?
      `)
      .bind(sessionToken)
      .first<{
        userId: string;
        expiresAt: string;
        email: string;
        role: string | null;
        tier: string | null;
      }>();

    if (!result) {
      return null;
    }

    // Check if session is expired
    const expiresAt = new Date(result.expiresAt);
    if (expiresAt < new Date()) {
      return null;
    }

    return {
      id: result.userId,
      email: result.email,
      role: result.role === 'admin' ? 'admin' : 'user',
      tier: (result.tier as 'free' | 'premium' | 'pro') || 'free',
    };
  } catch {
    return null;
  }
}

/**
 * Better Auth middleware - validates session cookies
 * Direct database validation for simplicity and testability
 */
export const betterAuthMiddleware = (options?: AuthOptions): MiddlewareHandler<AppEnv> => {
  const allowedRoles = options?.allowRoles;

  return async (c, next) => {
    // Parse session token from cookie
    const cookieHeader = c.req.header('Cookie');
    const sessionToken = parseSessionToken(cookieHeader);

    if (!sessionToken) {
      throw new HTTPException(401, { message: 'Not authenticated' });
    }

    // Validate session directly in database
    const user = await validateSession(c.env.DB, sessionToken);

    if (!user) {
      throw new HTTPException(401, { message: 'Invalid session' });
    }

    // Check role permissions
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      throw new HTTPException(403, { message: 'Insufficient permissions' });
    }

    // Set user context
    c.set('user', user);

    await next();
  };
};
