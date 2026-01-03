/**
 * JWT Authentication Middleware
 * 
 * Validates Bearer tokens in Authorization header.
 * Sets c.set('user', ...) with the authenticated user info.
 */

import { HTTPException } from 'hono/http-exception';
import type { MiddlewareHandler } from 'hono';
import type { AppEnv, AppUser } from '../types/app';
import {
  verifyAccessToken,
  InvalidTokenError,
  TokenExpiredError,
} from '../lib/jwt';

type JWTAuthOptions = {
  allowRoles?: AppUser['role'][];
};

/**
 * JWT auth middleware - validates Bearer tokens
 * Use this instead of betterAuthMiddleware for token-based auth
 */
export const jwtAuthMiddleware = (options?: JWTAuthOptions): MiddlewareHandler<AppEnv> => {
  const allowedRoles = options?.allowRoles;

  return async (c, next) => {
    const jwtSecret = c.env.JWT_SECRET || c.env.BETTER_AUTH_SECRET;

    if (!jwtSecret) {
      console.error('JWT_SECRET or BETTER_AUTH_SECRET not configured');
      throw new HTTPException(500, { message: 'Server configuration error' });
    }

    // Parse Authorization header
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      throw new HTTPException(401, { message: 'Missing or invalid authorization header' });
    }

    const token = authHeader.slice('Bearer '.length).trim();

    if (!token) {
      throw new HTTPException(401, { message: 'No token provided' });
    }

    try {
      // Verify and decode the token
      const tokenUser = await verifyAccessToken(token, jwtSecret);

      // Check role permissions
      if (allowedRoles && !allowedRoles.includes(tokenUser.role)) {
        throw new HTTPException(403, { message: 'Insufficient permissions' });
      }

      // Set user context (matches the structure from betterAuthMiddleware)
      c.set('user', {
        id: tokenUser.id,
        email: tokenUser.email,
        role: tokenUser.role,
        tier: tokenUser.tier,
      });

      await next();
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      if (error instanceof TokenExpiredError) {
        throw new HTTPException(401, { message: 'Token expired' });
      }
      if (error instanceof InvalidTokenError) {
        throw new HTTPException(401, { message: 'Invalid token' });
      }
      console.error('JWT auth error:', error);
      throw new HTTPException(401, { message: 'Authentication failed' });
    }
  };
};

/**
 * Optional JWT auth middleware - sets user context if token provided, but doesn't require it
 * Use this for endpoints that work for both authenticated and anonymous users
 */
export const optionalJwtAuthMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const jwtSecret = c.env.JWT_SECRET || c.env.BETTER_AUTH_SECRET;

  if (!jwtSecret) {
    // No secret configured, continue without auth
    await next();
    return;
  }

  const authHeader = c.req.header('Authorization');
  
  // No auth header - continue anonymously
  if (!authHeader?.startsWith('Bearer ')) {
    await next();
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();

  if (!token) {
    await next();
    return;
  }

  try {
    // Verify and decode the token
    const tokenUser = await verifyAccessToken(token, jwtSecret);

    // Set user context
    c.set('user', {
      id: tokenUser.id,
      email: tokenUser.email,
      role: tokenUser.role,
      tier: tokenUser.tier,
    });
  } catch {
    // Token invalid or expired - continue anonymously
    // Don't throw, just proceed without user context
  }

  await next();
};

/**
 * Require admin role
 */
export const requireAdmin = jwtAuthMiddleware({ allowRoles: ['admin'] });

/**
 * Require any authenticated user
 */
export const requireAuth = jwtAuthMiddleware();

