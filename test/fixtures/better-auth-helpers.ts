/**
 * Better Auth Test Helpers
 * 
 * Utilities for testing with Better Auth:
 * - Create test users via Better Auth signup
 * - Get session cookies for authenticated requests
 * - Make authenticated requests with proper cookies
 */

import type { D1Database } from '@cloudflare/workers-types';
import { nanoid } from 'nanoid';

export type BetterAuthTestUser = {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  tier: 'free' | 'premium' | 'pro';
  password: string;
};

/**
 * Create a Better Auth user directly in the database
 * This bypasses the signup flow for faster test setup
 */
export async function createBetterAuthUser(
  db: D1Database,
  overrides: Partial<Omit<BetterAuthTestUser, 'password'>> & { password?: string } = {}
): Promise<BetterAuthTestUser> {
  const id = overrides.id ?? nanoid();
  const user: BetterAuthTestUser = {
    id,
    email: overrides.email ?? `test-${nanoid(6)}@example.com`,
    name: overrides.name ?? 'Test User',
    role: overrides.role ?? 'user',
    tier: overrides.tier ?? 'free',
    password: overrides.password ?? 'TestPassword123!',
  };

  // Insert into ba_user table (Better Auth's user table)
  await db.prepare(`
    INSERT INTO ba_user (id, email, name, emailVerified, createdAt, updatedAt, role, tier)
    VALUES (?, ?, ?, 1, datetime('now'), datetime('now'), ?, ?)
  `)
    .bind(user.id, user.email, user.name, user.role, user.tier)
    .run();

  // Also insert into legacy users table for routes that check it
  await db.prepare(`
    INSERT OR IGNORE INTO users (id, email, name, role, tier, created_at)
    VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
  `)
    .bind(user.id, user.email, user.name, user.role, user.tier)
    .run();

  return user;
}

/**
 * Create a Better Auth session for a user
 * Returns the session token to use in cookies
 */
export async function createBetterAuthSession(
  db: D1Database,
  userId: string,
  expiresInSeconds: number = 3600
): Promise<{ sessionToken: string; sessionId: string }> {
  const sessionId = nanoid();
  const sessionToken = nanoid(32);
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  await db.prepare(`
    INSERT INTO ba_session (id, userId, token, expiresAt, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `)
    .bind(sessionId, userId, sessionToken, expiresAt)
    .run();

  return { sessionToken, sessionId };
}

/**
 * Create an admin user with active session
 */
export async function createAuthenticatedAdmin(db: D1Database): Promise<{
  user: BetterAuthTestUser;
  sessionToken: string;
  cookies: string;
}> {
  const user = await createBetterAuthUser(db, {
    role: 'admin',
    name: 'Admin User',
    email: `admin-${nanoid(6)}@example.com`,
  });

  const { sessionToken } = await createBetterAuthSession(db, user.id);
  const cookies = `better-auth.session_token=${sessionToken}`;

  return { user, sessionToken, cookies };
}

/**
 * Create a regular user with active session
 */
export async function createAuthenticatedUser(db: D1Database): Promise<{
  user: BetterAuthTestUser;
  sessionToken: string;
  cookies: string;
}> {
  const user = await createBetterAuthUser(db, {
    role: 'user',
    name: 'Regular User',
    email: `user-${nanoid(6)}@example.com`,
  });

  const { sessionToken } = await createBetterAuthSession(db, user.id);
  const cookies = `better-auth.session_token=${sessionToken}`;

  return { user, sessionToken, cookies };
}

/**
 * Create an expired session (for testing session expiry)
 */
export async function createExpiredSession(
  db: D1Database,
  userId: string
): Promise<{ sessionToken: string }> {
  const sessionId = nanoid();
  const sessionToken = nanoid(32);
  // Session expired 1 hour ago
  const expiresAt = new Date(Date.now() - 3600 * 1000).toISOString();

  await db.prepare(`
    INSERT INTO ba_session (id, userId, token, expiresAt, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `)
    .bind(sessionId, userId, sessionToken, expiresAt)
    .run();

  return { sessionToken };
}

/**
 * Get headers with session cookie for authenticated requests
 */
export function authBearerHeaders(sessionToken: string): Record<string, string> {
  return {
    Cookie: `better-auth.session_token=${sessionToken}`,
  };
}

/**
 * Get headers with session cookie and JSON content type
 */
export function jsonAuthBearerHeaders(sessionToken: string): Record<string, string> {
  return {
    Cookie: `better-auth.session_token=${sessionToken}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Delete a session (for testing logout)
 */
export async function deleteSession(db: D1Database, sessionToken: string): Promise<void> {
  await db.prepare('DELETE FROM ba_session WHERE token = ?').bind(sessionToken).run();
}

/**
 * Update user role
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
 * Update user tier
 */
export async function updateUserTier(
  db: D1Database,
  userId: string,
  tier: 'free' | 'premium' | 'pro'
): Promise<void> {
  await db.prepare('UPDATE ba_user SET tier = ? WHERE id = ?').bind(tier, userId).run();
  await db.prepare('UPDATE users SET tier = ? WHERE id = ?').bind(tier, userId).run();
}


