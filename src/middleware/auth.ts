import { HTTPException } from 'hono/http-exception';
import type { MiddlewareHandler } from 'hono';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { AppEnv, AppUser } from '../types/app';
import { logWithContext } from '../utils/logger';

// ═══════════════════════════════════════════════════════════════════════
// ⚠️  DEV BYPASS MODE - SET TO FALSE BEFORE PRODUCTION DEPLOYMENT ⚠️
// ═══════════════════════════════════════════════════════════════════════
// When true, ALL authentication is bypassed and requests are treated as
// coming from a dev admin user. This is EXTREMELY DANGEROUS in production.
// 
// See: AUTH_BYPASS_WARNING.md for full details
// ═══════════════════════════════════════════════════════════════════════
const AUTH_BYPASS_MODE = true;
const BYPASS_USER: AppUser = {
  id: 'dev-bypass-admin',
  role: 'admin',
  email: 'dev@hanzimaster.local',
  tier: 'pro',
};
// ═══════════════════════════════════════════════════════════════════════

type AuthOptions = {
  allowRoles?: AppUser['role'][];
};

export const authMiddleware = (options?: AuthOptions): MiddlewareHandler<AppEnv> => {
  const allowedRoles = options?.allowRoles;

  return async (c, next) => {
    // ⚠️ DEV BYPASS - Skip all auth checks
    if (AUTH_BYPASS_MODE) {
      c.set('user', BYPASS_USER);
      await next();
      return;
    }

    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HTTPException(401, { message: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const config = c.get('config');
    const requestId = c.get('requestId');

    // Check if we have Clerk configuration
    const clerkJwksUrl = config.secrets.clerkJwksUrl;
    const clerkIssuer = config.secrets.clerkJwtIssuer;

    // If Clerk is not configured AND legacy auth is disabled, reject
    if (!clerkJwksUrl || !clerkIssuer) {
      if (!config.auth.allowLegacy) {
        throw new HTTPException(503, { 
          message: 'Authentication service not configured. Clerk JWKS required or set ALLOW_LEGACY_AUTH=true' 
        });
      }
      // Legacy auth allowed - proceed with HS256 validation
      return legacyJwtValidation(c, next, token, config, allowedRoles, requestId);
    }

    try {
      // ALWAYS create a fresh JWKS client to avoid stale cache issues
      // In production, this would be cached properly, but for dev we need fresh keys
      const jwksClient = createRemoteJWKSet(new URL(clerkJwksUrl), {
        cacheMaxAge: 60000, // Cache for 1 minute only
        cooldownDuration: 0, // No cooldown - refresh immediately when needed
      });

      // Verify JWT with Clerk's public keys
      const { payload } = await jwtVerify(token, jwksClient, {
        issuer: clerkIssuer,
        algorithms: ['RS256'], // Clerk uses RS256
      });

      const clerkId = typeof payload.sub === 'string' ? payload.sub : null;
      const email = typeof payload.email === 'string' ? payload.email : undefined;

      if (!clerkId) {
        throw new HTTPException(401, { message: 'Invalid token payload' });
      }

      // Sync user from Clerk to local DB on first request
      const user = await syncUserFromClerk(c.env.DB, {
        clerkId,
        email: email || '',
        name: typeof payload.name === 'string' ? payload.name : undefined,
      });

      // Check role permissions
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        throw new HTTPException(403, { message: 'Insufficient permissions' });
      }

      // Set user context with tier for rate limiting
      c.set('user', { 
        id: user.id, 
        role: user.role, 
        email: user.email,
        tier: user.tier,
        clerkId: user.clerkId,
      });

      await next();
    } catch (err) {
      if (err instanceof HTTPException) {
        throw err;
      }
      logWithContext('warn', 'clerk.jwt.validation_failed', {
        requestId,
        meta: { error: (err as Error).message },
      });
      throw new HTTPException(401, { message: 'Invalid or expired token' });
    }
  };
};

/**
 * Legacy JWT validation for backward compatibility
 * Used when Clerk is not configured or for admin tokens
 */
async function legacyJwtValidation(
  c: any,
  next: any,
  token: string,
  config: any,
  allowedRoles: AppUser['role'][] | undefined,
  requestId: string
) {
  const textEncoder = new TextEncoder();
  const secretKey = textEncoder.encode(config.secrets.jwtSecret);

  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
      maxTokenAge: config.jwt.maxAge,
    });

    const userId = typeof payload.sub === 'string' ? payload.sub : null;
    const roleValue = typeof payload.role === 'string' ? payload.role : 'user';
    const role = roleValue === 'admin' ? 'admin' : 'user';
    const email = typeof payload.email === 'string' ? payload.email : undefined;

    if (!userId) {
      throw new HTTPException(401, { message: 'Invalid token payload' });
    }

    if (allowedRoles && !allowedRoles.includes(role)) {
      throw new HTTPException(403, { message: 'Insufficient permissions' });
    }

    c.set('user', { id: userId, role, email, tier: 'free' });
    await next();
  } catch (err) {
    if (err instanceof HTTPException) {
      throw err;
    }
    logWithContext('warn', 'legacy.jwt.validation_failed', {
      requestId,
      meta: { error: (err as Error).message },
    });
    throw new HTTPException(401, { message: 'Invalid or expired token' });
  }
}

/**
 * Sync user from Clerk to local database
 * Creates user if doesn't exist, updates last_login_at if exists
 */
async function syncUserFromClerk(
  db: any,
  clerkUser: {
    clerkId: string;
    email: string;
    name?: string;
  }
): Promise<{
  id: string;
  clerkId: string;
  email: string;
  role: 'user' | 'admin';
  tier: 'free' | 'premium' | 'pro';
}> {
  // Try to find existing user by clerk_id
  let user = await db
    .prepare('SELECT id, clerk_id, email, role, tier FROM users WHERE clerk_id = ?')
    .bind(clerkUser.clerkId)
    .first();

  if (!user) {
    // Create new user with free tier
    const id = crypto.randomUUID();
    
    await db
      .prepare(`
        INSERT INTO users (id, clerk_id, email, name, role, tier, created_at, last_login_at)
        VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'), strftime('%s', 'now'))
      `)
      .bind(id, clerkUser.clerkId, clerkUser.email, clerkUser.name || null, 'user', 'free')
      .run();

    user = {
      id,
      clerk_id: clerkUser.clerkId,
      email: clerkUser.email,
      role: 'user',
      tier: 'free',
    };

    // Emit analytics event
    await db
      .prepare(`
        INSERT INTO system_events (id, event_type, user_id, metadata, created_at)
        VALUES (?, ?, ?, ?, strftime('%s', 'now'))
      `)
      .bind(
        crypto.randomUUID(),
        'user.registered',
        id,
        JSON.stringify({ source: 'clerk', clerk_id: clerkUser.clerkId })
      )
      .run();
  } else {
    // Update last_login_at for existing user
    await db
      .prepare('UPDATE users SET last_login_at = strftime("%s", "now") WHERE id = ?')
      .bind(user.id)
      .run();
  }

  return {
    id: user.id,
    clerkId: user.clerk_id,
    email: user.email,
    role: user.role as 'user' | 'admin',
    tier: (user.tier || 'free') as 'free' | 'premium' | 'pro',
  };
}
