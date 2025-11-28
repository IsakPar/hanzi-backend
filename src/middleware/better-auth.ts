/**
 * Better Auth Session Middleware
 * 
 * Validates session cookies and sets user context
 * Replaces the old Clerk/JWT auth middleware
 */

import { HTTPException } from 'hono/http-exception';
import type { MiddlewareHandler } from 'hono';
import type { AppEnv, AppUser } from '../types/app';
import { createAuth } from '../lib/auth';
import type { D1Database } from '@cloudflare/workers-types';

type AuthOptions = {
  allowRoles?: AppUser['role'][];
};

/**
 * Better Auth middleware - validates session cookies
 * Uses Better Auth's built-in session validation
 */
export const betterAuthMiddleware = (options?: AuthOptions): MiddlewareHandler<AppEnv> => {
  const allowedRoles = options?.allowRoles;

  return async (c, next) => {
    // Create auth instance
    const auth = createAuth(c.env.DB, {
      BETTER_AUTH_SECRET: c.env.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: c.env.BETTER_AUTH_URL,
      RESEND_API_KEY: c.env.RESEND_API_KEY,
      PORTAL_URL: c.env.PORTAL_URL,
    });

    try {
      // Get session from Better Auth
      // Better Auth reads cookies from the request automatically
      const session = await auth.api.getSession({
        headers: c.req.raw.headers,
      });

      if (!session || !session.user) {
        throw new HTTPException(401, { message: 'Not authenticated' });
      }

      const user = session.user;
      
      // Get user role and tier from ba_user table
      const userInfo = await getUserInfo(c.env.DB, user.id, user.email);
      
      // Check role permissions
      if (allowedRoles && !allowedRoles.includes(userInfo.role)) {
        throw new HTTPException(403, { message: 'Insufficient permissions' });
      }

      // Set user context
      c.set('user', {
        id: user.id,
        role: userInfo.role,
        email: user.email,
        tier: userInfo.tier,
      });

      await next();
    } catch (err) {
      if (err instanceof HTTPException) {
        throw err;
      }
      throw new HTTPException(401, { message: 'Invalid session' });
    }
  };
};

/**
 * Get user role and tier from ba_user table
 */
async function getUserInfo(
  db: D1Database,
  userId: string,
  email: string
): Promise<{ role: 'admin' | 'user'; tier: 'free' | 'premium' | 'pro' }> {
  // Check if user has admin role in ba_user table
  const user = await db
    .prepare('SELECT role, tier FROM ba_user WHERE id = ?')
    .bind(userId)
    .first<{ role: string | null; tier: string | null }>();

  const role = user?.role === 'admin' ? 'admin' : 'user';
  const tier = (user?.tier as 'free' | 'premium' | 'pro') || 'free';

  return { role, tier };
}

