/**
 * JWT Auth Test Helpers
 * 
 * Utilities for testing with JWT token-based authentication:
 * - Create test users and JWT tokens
 * - Create refresh tokens
 * - Make authenticated requests with Bearer tokens
 */

import type { D1Database } from '@cloudflare/workers-types';
import { nanoid } from 'nanoid';
import { SignJWT } from 'jose';

export type JWTTestUser = {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  tier: 'free' | 'premium' | 'pro';
};

const DEFAULT_JWT_SECRET = 'test-jwt-secret-for-testing';

/**
 * Create a test user directly in the database
 * Creates entries in BOTH ba_user (for auth) and users (for FK relationships)
 */
export async function createTestUser(
  db: D1Database,
  overrides: Partial<JWTTestUser> = {}
): Promise<JWTTestUser> {
  const id = overrides.id ?? nanoid();
  const user: JWTTestUser = {
    id,
    email: overrides.email ?? `test-${nanoid(6)}@example.com`,
    name: overrides.name ?? 'Test User',
    role: overrides.role ?? 'user',
    tier: overrides.tier ?? 'free',
  };

  // Insert into ba_user table (for JWT auth)
  await db.prepare(`
    INSERT INTO ba_user (id, email, name, emailVerified, createdAt, updatedAt, role, tier)
    VALUES (?, ?, ?, 1, datetime('now'), datetime('now'), ?, ?)
  `)
    .bind(user.id, user.email, user.name, user.role, user.tier)
    .run();

  // Also insert into users table (for FK relationships with user_progress, etc.)
  await db.prepare(`
    INSERT INTO users (id, clerk_id, email, name, role, tier, subscription_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'none', strftime('%s', 'now'))
  `)
    .bind(user.id, `clerk_${user.id}`, user.email, user.name, user.role, user.tier)
    .run();

  return user;
}

/**
 * Sign a JWT access token for a user
 */
export async function signTestAccessToken(
  user: JWTTestUser,
  secret: string = DEFAULT_JWT_SECRET,
  expiresIn: string = '15m'
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);
  
  return new SignJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
    tier: user.tier,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

/**
 * Create an expired access token
 */
export async function signExpiredAccessToken(
  user: JWTTestUser,
  secret: string = DEFAULT_JWT_SECRET
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);
  
  // Create token that expired 1 hour ago
  const pastTime = Math.floor(Date.now() / 1000) - 3600;
  
  return new SignJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
    tier: user.tier,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(pastTime - 900) // Issued 15 min before expiry
    .setExpirationTime(pastTime)
    .sign(secretKey);
}

/**
 * Create a refresh token and store its hash in the database
 */
export async function createTestRefreshToken(
  db: D1Database,
  userId: string,
  expiresInSeconds: number = 7 * 24 * 3600
): Promise<string> {
  const refreshToken = `${nanoid(32)}.${nanoid(32)}`;
  const tokenHash = await hashToken(refreshToken);
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const tokenId = nanoid();

  await db.prepare(`
    INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
    VALUES (?, ?, ?, ?)
  `)
    .bind(tokenId, userId, tokenHash, expiresAt)
    .run();

  return refreshToken;
}

/**
 * Create an expired refresh token
 */
export async function createExpiredRefreshToken(
  db: D1Database,
  userId: string
): Promise<string> {
  const refreshToken = `${nanoid(32)}.${nanoid(32)}`;
  const tokenHash = await hashToken(refreshToken);
  // Expired 1 hour ago
  const expiresAt = Math.floor(Date.now() / 1000) - 3600;
  const tokenId = nanoid();

  await db.prepare(`
    INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
    VALUES (?, ?, ?, ?)
  `)
    .bind(tokenId, userId, tokenHash, expiresAt)
    .run();

  return refreshToken;
}

/**
 * Hash a token using SHA-256 (same as production code)
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create an admin user with access token
 */
export async function createAuthenticatedAdmin(
  db: D1Database,
  secret: string = DEFAULT_JWT_SECRET
): Promise<{
  user: JWTTestUser;
  accessToken: string;
  refreshToken: string;
}> {
  const user = await createTestUser(db, {
    role: 'admin',
    name: 'Admin User',
    email: `admin-${nanoid(6)}@example.com`,
  });

  const accessToken = await signTestAccessToken(user, secret);
  const refreshToken = await createTestRefreshToken(db, user.id);
  
  // Also create ba_session for backward compatibility
  await db.prepare(`
    INSERT INTO ba_session (id, userId, token, expiresAt, createdAt, updatedAt)
    VALUES (?, ?, ?, datetime('now', '+1 hour'), datetime('now'), datetime('now'))
  `).bind(nanoid(), user.id, accessToken).run();

  return { user, accessToken, refreshToken };
}

/**
 * Create a regular user with access token
 */
export async function createAuthenticatedUser(
  db: D1Database,
  secret: string = DEFAULT_JWT_SECRET
): Promise<{
  user: JWTTestUser;
  accessToken: string;
  refreshToken: string;
}> {
  const user = await createTestUser(db, {
    role: 'user',
    name: 'Regular User',
    email: `user-${nanoid(6)}@example.com`,
  });

  const accessToken = await signTestAccessToken(user, secret);
  const refreshToken = await createTestRefreshToken(db, user.id);
  
  // Also create ba_session for backward compatibility
  await db.prepare(`
    INSERT INTO ba_session (id, userId, token, expiresAt, createdAt, updatedAt)
    VALUES (?, ?, ?, datetime('now', '+1 hour'), datetime('now'), datetime('now'))
  `).bind(nanoid(), user.id, accessToken).run();

  return { user, accessToken, refreshToken };
}

/**
 * Get headers with Bearer token for authenticated requests
 */
export function authBearerHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

/**
 * Get headers with Bearer token and JSON content type
 */
export function jsonAuthBearerHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Delete a refresh token (for testing logout)
 */
export async function deleteRefreshToken(db: D1Database, refreshToken: string): Promise<void> {
  const tokenHash = await hashToken(refreshToken);
  await db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').bind(tokenHash).run();
}

/**
 * Update user role (updates both ba_user and users tables)
 */
export async function updateUserRole(
  db: D1Database,
  userId: string,
  role: 'user' | 'admin'
): Promise<void> {
  await db.prepare('UPDATE ba_user SET role = ? WHERE id = ?').bind(role, userId).run();
  await db.prepare('UPDATE users SET role = ? WHERE id = ?').bind(role, userId).run();
}

/**
 * Update user tier (updates both ba_user and users tables)
 */
export async function updateUserTier(
  db: D1Database,
  userId: string,
  tier: 'free' | 'premium' | 'pro'
): Promise<void> {
  await db.prepare('UPDATE ba_user SET tier = ? WHERE id = ?').bind(tier, userId).run();
  await db.prepare('UPDATE users SET tier = ? WHERE id = ?').bind(tier, userId).run();
}

/**
 * Count refresh tokens for a user
 */
export async function countUserRefreshTokens(db: D1Database, userId: string): Promise<number> {
  const result = await db
    .prepare('SELECT COUNT(*) as count FROM refresh_tokens WHERE user_id = ?')
    .bind(userId)
    .first<{ count: number }>();
  return result?.count ?? 0;
}

// ═══════════════════════════════════════════════════════════
// BACKWARD COMPATIBILITY ALIASES
// These exist to make migration from cookie-based auth easier
// ═══════════════════════════════════════════════════════════

/** Alias for createTestUser (old name from better-auth-helpers) */
export const createBetterAuthUser = createTestUser;

/** Alias for type */
export type BetterAuthTestUser = JWTTestUser;

/**
 * Create a session (returns access token for JWT auth)
 * Also inserts into ba_session for backward compatibility with session-based tests
 * @deprecated Use signTestAccessToken instead
 */
export async function createBetterAuthSession(
  db: D1Database,
  userId: string,
  secret: string = 'test-jwt-secret-for-testing'
): Promise<{ sessionToken: string; sessionId: string }> {
  const user = await db
    .prepare('SELECT id, email, role, tier FROM ba_user WHERE id = ?')
    .bind(userId)
    .first<{ id: string; email: string; role: string; tier: string }>();
  
  if (!user) throw new Error(`User ${userId} not found`);
  
  const accessToken = await signTestAccessToken({
    id: user.id,
    email: user.email,
    name: 'Test User',
    role: user.role as 'admin' | 'user',
    tier: user.tier as 'free' | 'premium' | 'pro',
  }, secret);
  
  const sessionId = nanoid();
  // Use unique token for ba_session to avoid UNIQUE constraint violations
  const uniqueSessionToken = `${accessToken.slice(0, 50)}_${nanoid()}`;
  
  // Also create a ba_session entry for backward compatibility with session-based tests
  await db.prepare(`
    INSERT INTO ba_session (id, userId, token, expiresAt, createdAt, updatedAt)
    VALUES (?, ?, ?, datetime('now', '+1 hour'), datetime('now'), datetime('now'))
  `).bind(sessionId, userId, uniqueSessionToken).run();
  
  return { sessionToken: accessToken, sessionId };
}

/**
 * Create an expired session token
 * @deprecated Use signExpiredAccessToken instead
 */
export async function createExpiredSession(
  db: D1Database,
  userId: string,
  secret: string = 'test-jwt-secret-for-testing'
): Promise<{ sessionToken: string }> {
  const user = await db
    .prepare('SELECT id, email, role, tier FROM ba_user WHERE id = ?')
    .bind(userId)
    .first<{ id: string; email: string; role: string; tier: string }>();
  
  if (!user) throw new Error(`User ${userId} not found`);
  
  const expiredToken = await signExpiredAccessToken({
    id: user.id,
    email: user.email,
    name: 'Test User',
    role: user.role as 'admin' | 'user',
    tier: user.tier as 'free' | 'premium' | 'pro',
  }, secret);
  
  return { sessionToken: expiredToken };
}

/**
 * Delete a session (no-op for JWT, but clears refresh tokens)
 * @deprecated Use deleteRefreshToken instead
 */
export async function deleteSession(db: D1Database, _sessionToken: string): Promise<void> {
  // For JWT, we can't invalidate access tokens directly
  // In a real app, you'd maintain a blocklist or just wait for expiry
  // For tests, this is a no-op
}

