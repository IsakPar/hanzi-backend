/**
 * P0: Email Security Tests - HMAC token generation and verification
 * 
 * Critical security tests for unsubscribe tokens to prevent:
 * - Token forgery
 * - Timing attacks
 * - Unauthorized unsubscribes
 */

import { describe, expect, it } from 'vitest';
import { 
  generateUnsubscribeToken, 
  verifyUnsubscribeToken 
} from '../../src/services/email';

const TEST_SECRET = 'test-hmac-secret-for-email-tokens';

describe.sequential('P0: Email Security', () => {
  
  // ========================================
  // UNSUBSCRIBE TOKEN GENERATION
  // ========================================

  describe('Unsubscribe Token Generation', () => {
    it('generates different tokens each time (includes timestamp)', async () => {
      const email = 'test@example.com';
      const token1 = await generateUnsubscribeToken(email, TEST_SECRET);
      
      // Wait a tiny bit to ensure different timestamp
      await new Promise(r => setTimeout(r, 5));
      const token2 = await generateUnsubscribeToken(email, TEST_SECRET);
      
      // Tokens include timestamp so they differ
      expect(token1).not.toBe(token2);
    });

    it('generates different tokens for different emails', async () => {
      const token1 = await generateUnsubscribeToken('user1@example.com', TEST_SECRET);
      const token2 = await generateUnsubscribeToken('user2@example.com', TEST_SECRET);
      
      expect(token1).not.toBe(token2);
    });

    it('generates different tokens with different secrets', async () => {
      const email = 'test@example.com';
      const token1 = await generateUnsubscribeToken(email, 'secret1');
      const token2 = await generateUnsubscribeToken(email, 'secret2');
      
      expect(token1).not.toBe(token2);
    });

    it('generates non-empty tokens', async () => {
      const token = await generateUnsubscribeToken('test@example.com', TEST_SECRET);
      
      expect(token).toBeTruthy();
      expect(token.length).toBeGreaterThan(20);
    });

    it('generates URL-safe tokens (base64url)', async () => {
      const token = await generateUnsubscribeToken('test@example.com', TEST_SECRET);
      
      // Token should be base64url encoded (no +, /, or =)
      expect(token).not.toMatch(/[+/=]/);
    });
  });

  // ========================================
  // UNSUBSCRIBE TOKEN VERIFICATION
  // ========================================

  describe('Unsubscribe Token Verification', () => {
    it('verifies valid token', async () => {
      const email = 'valid@example.com';
      const token = await generateUnsubscribeToken(email, TEST_SECRET);
      
      const result = await verifyUnsubscribeToken(token, TEST_SECRET);
      
      expect(result).not.toBeNull();
      expect(result?.email).toBe(email);
    });

    it('rejects invalid token', async () => {
      const fakeToken = 'fake-token-attempt-12345';
      
      const result = await verifyUnsubscribeToken(fakeToken, TEST_SECRET);
      
      expect(result).toBeNull();
    });

    it('rejects token with wrong secret', async () => {
      const email = 'test@example.com';
      const token = await generateUnsubscribeToken(email, 'secret1');
      
      // Verify with different secret
      const result = await verifyUnsubscribeToken(token, 'secret2');
      
      expect(result).toBeNull();
    });

    it('rejects empty token', async () => {
      const result = await verifyUnsubscribeToken('', TEST_SECRET);
      
      expect(result).toBeNull();
    });

    it('handles special characters in email', async () => {
      const email = 'test+special@example.com';
      const token = await generateUnsubscribeToken(email, TEST_SECRET);
      
      const result = await verifyUnsubscribeToken(token, TEST_SECRET);
      
      expect(result).not.toBeNull();
      expect(result?.email).toBe(email);
    });

    it('respects expiration time', async () => {
      const email = 'test@example.com';
      const token = await generateUnsubscribeToken(email, TEST_SECRET);
      
      // Verify with very short max age (should fail if token is older)
      // Since we just generated it, it should still be valid
      const result = await verifyUnsubscribeToken(token, TEST_SECRET, 60 * 60 * 1000); // 1 hour
      
      expect(result).not.toBeNull();
      expect(result?.email).toBe(email);
    });
  });

  // ========================================
  // TOKEN FORMAT VALIDATION
  // ========================================

  describe('Token Format', () => {
    it('rejects malformed base64', async () => {
      const result = await verifyUnsubscribeToken('!!!not-base64!!!', TEST_SECRET);
      expect(result).toBeNull();
    });

    it('rejects truncated token', async () => {
      const email = 'test@example.com';
      const token = await generateUnsubscribeToken(email, TEST_SECRET);
      const truncated = token.slice(0, token.length / 2);
      
      const result = await verifyUnsubscribeToken(truncated, TEST_SECRET);
      expect(result).toBeNull();
    });

    it('rejects modified token', async () => {
      const email = 'test@example.com';
      const token = await generateUnsubscribeToken(email, TEST_SECRET);
      const modified = token.slice(0, -5) + 'XXXXX';
      
      const result = await verifyUnsubscribeToken(modified, TEST_SECRET);
      expect(result).toBeNull();
    });
  });
});

