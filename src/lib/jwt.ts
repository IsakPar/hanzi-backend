/**
 * JWT Utility for Token-Based Authentication
 * 
 * Uses jose library which works in Cloudflare Workers.
 * Access tokens are short-lived (15 min), refresh tokens are long-lived (7 days).
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

// Token expiry durations
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export interface AccessTokenPayload extends JWTPayload {
  sub: string;      // user id
  email: string;
  role: string;
  tier: string;
}

export interface TokenUser {
  id: string;
  email: string;
  role: 'admin' | 'user';
  tier: 'free' | 'premium' | 'pro';
}

/**
 * Sign an access token (15 min expiry)
 */
export async function signAccessToken(
  user: TokenUser,
  secret: string
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
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(secretKey);
}

/**
 * Verify an access token
 * Returns the payload if valid, throws if invalid/expired
 */
export async function verifyAccessToken(
  token: string,
  secret: string
): Promise<TokenUser> {
  const secretKey = new TextEncoder().encode(secret);
  
  try {
    const { payload } = await jwtVerify(token, secretKey);
    
    if (!payload.sub || !payload.email) {
      throw new InvalidTokenError('Missing required claims');
    }
    
    return {
      id: payload.sub,
      email: payload.email as string,
      role: (payload.role as 'admin' | 'user') || 'user',
      tier: (payload.tier as 'free' | 'premium' | 'pro') || 'free',
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        throw new TokenExpiredError('Access token expired');
      }
      if (error.message.includes('signature')) {
        throw new InvalidTokenError('Invalid token signature');
      }
    }
    throw new InvalidTokenError('Invalid access token');
  }
}

/**
 * Generate a refresh token (random, not JWT)
 * Format: uuid.uuid for extra entropy
 */
export function generateRefreshToken(): string {
  return `${crypto.randomUUID()}.${crypto.randomUUID()}`;
}

/**
 * Hash a refresh token for storage
 * We store the hash, not the raw token
 */
export async function hashRefreshToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get refresh token expiry timestamp (unix seconds)
 */
export function getRefreshTokenExpiry(): number {
  return Math.floor(Date.now() / 1000) + (REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60);
}

// Custom error classes for typed error handling
export class InvalidTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTokenError';
  }
}

export class TokenExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

