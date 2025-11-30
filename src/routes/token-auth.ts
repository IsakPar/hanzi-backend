/**
 * Token-Based Authentication Routes
 * 
 * Uses Better Auth for password verification, but issues JWTs instead of cookies.
 * This avoids Safari's ITP and cross-subdomain cookie issues.
 * 
 * Endpoints:
 * - POST /token/login - Email/password login, returns tokens
 * - POST /token/refresh - Exchange refresh token for new access token (with rotation)
 * - POST /token/logout - Revoke refresh token
 * - GET /token/me - Get current user from access token
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../types/app';
import {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  getRefreshTokenExpiry,
  InvalidTokenError,
  TokenExpiredError,
  type TokenUser,
} from '../lib/jwt';
import { createAuth } from '../lib/auth';
import { authRateLimit } from '../middleware/rate-limit';

const tokenAuthRouter = new Hono<AppEnv>();

// Apply rate limiting to all auth endpoints
tokenAuthRouter.use('/*', authRateLimit);

// ═══════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// ═══════════════════════════════════════════════════════════
// POST /token/login
// ═══════════════════════════════════════════════════════════

tokenAuthRouter.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const db = c.env.DB;
  const jwtSecret = c.env.JWT_SECRET || c.env.BETTER_AUTH_SECRET;

  if (!jwtSecret) {
    console.error('JWT_SECRET or BETTER_AUTH_SECRET not configured');
    return c.json({ error: 'Server configuration error' }, 500);
  }

  try {
    // Use Better Auth to verify credentials
    const auth = createAuth(db, {
      BETTER_AUTH_SECRET: c.env.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: c.env.BETTER_AUTH_URL,
      RESEND_API_KEY: c.env.RESEND_API_KEY,
      PORTAL_URL: c.env.PORTAL_URL,
    });

    // Call Better Auth's sign-in handler internally
    const signInRequest = new Request('http://internal/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const signInResponse = await auth.handler(signInRequest);
    
    if (!signInResponse.ok) {
      const errorData = await signInResponse.json().catch(() => ({}));
      return c.json({ 
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      }, 401);
    }

    // Better Auth verified credentials, now get user from DB
    const user = await db
      .prepare('SELECT id, email, name, role, tier FROM ba_user WHERE email = ?')
      .bind(email)
      .first<{ id: string; email: string; name: string; role: string; tier: string }>();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Generate tokens
    const tokenUser: TokenUser = {
      id: user.id,
      email: user.email,
      role: (user.role as 'admin' | 'user') || 'user',
      tier: (user.tier as 'free' | 'premium' | 'pro') || 'free',
    };

    const accessToken = await signAccessToken(tokenUser, jwtSecret);
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = await hashRefreshToken(refreshToken);
    const expiresAt = getRefreshTokenExpiry();

    // Store refresh token hash in database
    const tokenId = crypto.randomUUID();
    await db
      .prepare(`
        INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
        VALUES (?, ?, ?, ?)
      `)
      .bind(tokenId, user.id, refreshTokenHash, expiresAt)
      .run();

    // Update last login timestamp
    await db
      .prepare('UPDATE ba_user SET last_login_at = unixepoch() WHERE id = ?')
      .bind(user.id)
      .run();

    return c.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tier: user.tier,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// POST /token/refresh
// ═══════════════════════════════════════════════════════════

tokenAuthRouter.post('/refresh', zValidator('json', refreshSchema), async (c) => {
  const { refreshToken } = c.req.valid('json');
  const db = c.env.DB;
  const jwtSecret = c.env.JWT_SECRET || c.env.BETTER_AUTH_SECRET;

  if (!jwtSecret) {
    return c.json({ error: 'Server configuration error' }, 500);
  }

  try {
    // Hash the incoming refresh token
    const tokenHash = await hashRefreshToken(refreshToken);

    // Find the refresh token in database
    const tokenRow = await db
      .prepare(`
        SELECT rt.id, rt.user_id, rt.expires_at, u.email, u.name, u.role, u.tier
        FROM refresh_tokens rt
        JOIN ba_user u ON rt.user_id = u.id
        WHERE rt.token_hash = ?
      `)
      .bind(tokenHash)
      .first<{
        id: string;
        user_id: string;
        expires_at: number;
        email: string;
        name: string;
        role: string;
        tier: string;
      }>();

    if (!tokenRow) {
      return c.json({ error: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' }, 401);
    }

    // Check if expired
    const now = Math.floor(Date.now() / 1000);
    if (tokenRow.expires_at < now) {
      // Delete expired token
      await db.prepare('DELETE FROM refresh_tokens WHERE id = ?').bind(tokenRow.id).run();
      return c.json({ error: 'Refresh token expired', code: 'REFRESH_TOKEN_EXPIRED' }, 401);
    }

    // Delete old refresh token (rotation)
    await db.prepare('DELETE FROM refresh_tokens WHERE id = ?').bind(tokenRow.id).run();

    // Generate new tokens
    const tokenUser: TokenUser = {
      id: tokenRow.user_id,
      email: tokenRow.email,
      role: (tokenRow.role as 'admin' | 'user') || 'user',
      tier: (tokenRow.tier as 'free' | 'premium' | 'pro') || 'free',
    };

    const newAccessToken = await signAccessToken(tokenUser, jwtSecret);
    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = await hashRefreshToken(newRefreshToken);
    const newExpiresAt = getRefreshTokenExpiry();

    // Store new refresh token
    const newTokenId = crypto.randomUUID();
    await db
      .prepare(`
        INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
        VALUES (?, ?, ?, ?)
      `)
      .bind(newTokenId, tokenRow.user_id, newRefreshTokenHash, newExpiresAt)
      .run();

    return c.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Refresh error:', error);
    return c.json({ error: 'Token refresh failed' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════
// POST /token/logout
// ═══════════════════════════════════════════════════════════

tokenAuthRouter.post('/logout', zValidator('json', refreshSchema), async (c) => {
  const { refreshToken } = c.req.valid('json');
  const db = c.env.DB;

  try {
    const tokenHash = await hashRefreshToken(refreshToken);
    await db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').bind(tokenHash).run();
    return c.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    // Still return success - user wanted to logout anyway
    return c.json({ success: true });
  }
});

// ═══════════════════════════════════════════════════════════
// GET /token/me
// ═══════════════════════════════════════════════════════════

tokenAuthRouter.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization');
  const jwtSecret = c.env.JWT_SECRET || c.env.BETTER_AUTH_SECRET;
  const db = c.env.DB;

  if (!jwtSecret) {
    return c.json({ error: 'Server configuration error' }, 500);
  }

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing authorization header', code: 'NO_TOKEN' }, 401);
  }

  const token = authHeader.slice('Bearer '.length).trim();

  try {
    const tokenUser = await verifyAccessToken(token, jwtSecret);
    
    // Optionally fetch fresh user data from DB
    const user = await db
      .prepare('SELECT id, email, name, role, tier FROM ba_user WHERE id = ?')
      .bind(tokenUser.id)
      .first<{ id: string; email: string; name: string; role: string; tier: string }>();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tier: user.tier,
      },
    });
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      return c.json({ error: 'Token expired', code: 'TOKEN_EXPIRED' }, 401);
    }
    if (error instanceof InvalidTokenError) {
      return c.json({ error: 'Invalid token', code: 'INVALID_TOKEN' }, 401);
    }
    console.error('Me error:', error);
    return c.json({ error: 'Authentication failed' }, 401);
  }
});

export default tokenAuthRouter;

