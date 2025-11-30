/**
 * JWT Test Helpers
 * 
 * Provides utilities for creating test JWTs for both Clerk RS256 and legacy HS256 auth.
 */

import { SignJWT, importPKCS8, exportJWK, generateKeyPair, importSPKI } from 'jose';

const textEncoder = new TextEncoder();

// ========================================
// LEGACY HS256 JWT HELPERS
// ========================================

export type LegacyTokenPayload = {
  sub: string;
  role: 'admin' | 'user';
  email: string;
  exp?: string;
};

/**
 * Create a legacy HS256 JWT token (for backwards compatibility testing)
 */
export async function createLegacyToken(
  secret: string,
  payload: Partial<LegacyTokenPayload> & { sub: string }
): Promise<string> {
  const { sub, role = 'user', email = 'test@example.com', exp = '1h' } = payload;

  return new SignJWT({ role, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(textEncoder.encode(secret));
}

/**
 * Create an expired legacy token for testing rejection
 */
export async function createExpiredLegacyToken(
  secret: string,
  sub: string
): Promise<string> {
  return createLegacyToken(secret, { sub, exp: '0s' });
}

/**
 * Create a token with wrong signature
 */
export async function createInvalidSignatureToken(
  correctSecret: string,
  sub: string
): Promise<string> {
  // Sign with a different secret
  return createLegacyToken('wrong-secret-totally-different', { sub });
}

// ========================================
// CLERK RS256 JWT HELPERS (MOCK)
// ========================================

let mockClerkKeyPair: CryptoKeyPair | null = null;

/**
 * Get or create a mock RSA key pair for Clerk JWT testing
 */
async function getMockClerkKeyPair(): Promise<CryptoKeyPair> {
  if (!mockClerkKeyPair) {
    mockClerkKeyPair = await generateKeyPair('RS256');
  }
  return mockClerkKeyPair;
}

/**
 * Get the mock Clerk public key in JWK format for JWKS endpoint mocking
 */
export async function getMockClerkJWKS(): Promise<{ keys: object[] }> {
  const keyPair = await getMockClerkKeyPair();
  const publicJwk = await exportJWK(keyPair.publicKey);
  return {
    keys: [
      {
        ...publicJwk,
        kid: 'test-key-id',
        use: 'sig',
        alg: 'RS256',
      },
    ],
  };
}

export type ClerkTokenPayload = {
  sub: string;
  azp?: string;  // Authorized party (client ID)
  org_id?: string;
  org_role?: string;
  metadata?: Record<string, unknown>;
  exp?: string;
};

/**
 * Create a mock Clerk RS256 JWT token
 */
export async function createClerkToken(
  payload: Partial<ClerkTokenPayload> & { sub: string }
): Promise<string> {
  const keyPair = await getMockClerkKeyPair();
  const { sub, azp, org_id, org_role, metadata, exp = '1h' } = payload;

  const jwt = new SignJWT({
    azp,
    org_id,
    org_role,
    ...metadata,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key-id' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(exp)
    .setIssuer('https://clerk.test.dev');

  return jwt.sign(keyPair.privateKey);
}

/**
 * Create an expired Clerk token for testing rejection
 */
export async function createExpiredClerkToken(sub: string): Promise<string> {
  return createClerkToken({ sub, exp: '0s' });
}

// ========================================
// TOKEN VALIDATION HELPERS
// ========================================

/**
 * Helper to create Authorization header
 */
export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Create headers with content type and auth
 */
export function jsonAuthHeaders(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...authHeader(token),
  };
}

// ========================================
// TEST TOKEN PRESETS
// ========================================

/**
 * Common test token scenarios
 */
export const TokenScenarios = {
  /** Create a valid admin token */
  validAdmin: (secret: string, userId: string) =>
    createLegacyToken(secret, { sub: userId, role: 'admin' }),
  
  /** Create a valid user token */
  validUser: (secret: string, userId: string) =>
    createLegacyToken(secret, { sub: userId, role: 'user' }),
  
  /** Create an expired token */
  expired: (secret: string, userId: string) =>
    createExpiredLegacyToken(secret, userId),
  
  /** Create a token with invalid signature */
  invalidSignature: (secret: string, userId: string) =>
    createInvalidSignatureToken(secret, userId),
} as const;

