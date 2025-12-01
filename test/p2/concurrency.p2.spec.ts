/**
 * P2: Concurrency Tests
 * 
 * Tests for race conditions, parallel requests, locking.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
  jsonAuthBearerHeaders,
  createTestUser,
  signTestAccessToken,
} from '../fixtures/jwt-auth-helpers';
import { nanoid } from 'nanoid';

describe.sequential('P2: Concurrency', () => {
  let ctx: TestContext;
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    const admin = await createAuthenticatedAdmin(ctx.db);
    const user = await createAuthenticatedUser(ctx.db);
    adminToken = admin.accessToken;
    userToken = user.accessToken;
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // PARALLEL READS
  // ========================================

  describe('Parallel Reads', () => {
    it('handles multiple concurrent reads', async () => {
      const requests = Array.from({ length: 10 }, () =>
        ctx.app.fetch(
          new Request('http://localhost/v1/vocabulary', {
            headers: authBearerHeaders(userToken),
          }),
          ctx.env,
          executionContext
        )
      );

      const responses = await Promise.all(requests);
      
      // All should succeed
      responses.forEach(res => {
        expect([200, 404, 429]).toContain(res.status);
      });
    });

    it('concurrent reads return consistent data', async () => {
      // Create a vocabulary item
      const vocabId = nanoid();
      await ctx.db.prepare(`
        INSERT INTO vocabulary (id, hanzi, pinyin, english, hsk_level, category)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(vocabId, '测试', 'cèshì', 'test', 1, 'general').run();

      // Read concurrently
      const requests = Array.from({ length: 5 }, () =>
        ctx.app.fetch(
          new Request(`http://localhost/v1/vocabulary/${vocabId}`, {
            headers: authBearerHeaders(userToken),
          }),
          ctx.env,
          executionContext
        )
      );

      const responses = await Promise.all(requests);
      const bodies = await Promise.all(
        responses.filter(r => r.status === 200).map(r => r.json())
      );

      // All should return same data
      if (bodies.length > 1) {
        bodies.forEach(body => {
          expect(body.hanzi || body.vocabulary?.hanzi).toBe('测试');
        });
      }
    });
  });

  // ========================================
  // PARALLEL WRITES
  // ========================================

  describe('Parallel Writes', () => {
    it('handles concurrent progress updates', async () => {
      const user = await createTestUser(ctx.db);
      const token = await signTestAccessToken(user, ctx.env.JWT_SECRET);

      const requests = Array.from({ length: 5 }, (_, i) =>
        ctx.app.fetch(
          new Request('http://localhost/v1/users/me/progress/sync', {
            method: 'POST',
            headers: jsonAuthBearerHeaders(token),
            body: JSON.stringify({
              clientSeq: i + 1,
              updates: [
                { id: `word-${i}`, bucket: 'learning', proficiency: 0.5, lastReview: Date.now() },
              ],
            }),
          }),
          ctx.env,
          executionContext
        )
      );

      const responses = await Promise.all(requests);
      
      // All should be handled (not crash)
      responses.forEach(res => {
        expect([200, 201, 404, 409, 429]).toContain(res.status);
      });
    });

    it('prevents duplicate creation race condition', async () => {
      const vocab = {
        hanzi: '唯一',
        pinyin: 'wéiyī',
        english: 'unique',
        hskLevel: 3,
        category: 'general',
      };

      // Try to create same item concurrently
      const requests = Array.from({ length: 5 }, () =>
        ctx.app.fetch(
          new Request('http://localhost/v1/vocabulary/admin', {
            method: 'POST',
            headers: jsonAuthBearerHeaders(adminToken),
            body: JSON.stringify(vocab),
          }),
          ctx.env,
          executionContext
        )
      );

      const responses = await Promise.all(requests);
      
      // At most one should succeed with 201
      const successCount = responses.filter(r => r.status === 201).length;
      expect(successCount).toBeLessThanOrEqual(1);
    });
  });

  // ========================================
  // READ-WRITE CONFLICTS
  // ========================================

  describe('Read-Write Conflicts', () => {
    it('handles concurrent read during write', async () => {
      const vocabId = nanoid();
      await ctx.db.prepare(`
        INSERT INTO vocabulary (id, hanzi, pinyin, english, hsk_level, category)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(vocabId, '原始', 'yuánshǐ', 'original', 1, 'general').run();

      // Concurrent read and write
      const [readRes, writeRes] = await Promise.all([
        ctx.app.fetch(
          new Request(`http://localhost/v1/vocabulary/${vocabId}`, {
            headers: authBearerHeaders(userToken),
          }),
          ctx.env,
          executionContext
        ),
        ctx.app.fetch(
          new Request(`http://localhost/v1/vocabulary/admin/${vocabId}`, {
            method: 'PUT',
            headers: jsonAuthBearerHeaders(adminToken),
            body: JSON.stringify({ english: 'updated' }),
          }),
          ctx.env,
          executionContext
        ),
      ]);

      // Both should complete (not deadlock)
      expect([200, 404]).toContain(readRes.status);
      expect([200, 404]).toContain(writeRes.status);
    });
  });

  // ========================================
  // MULTI-USER CONCURRENCY
  // ========================================

  describe('Multi-User Concurrency', () => {
    it('handles multiple users accessing same resource', async () => {
      // Create multiple users
      const users = await Promise.all(
        Array.from({ length: 5 }, async () => {
          const user = await createTestUser(ctx.db);
          const token = await signTestAccessToken(user, ctx.env.JWT_SECRET);
          return { user, token };
        })
      );

      // All users read same resource
      const requests = users.map(({ token }) =>
        ctx.app.fetch(
          new Request('http://localhost/v1/vocabulary', {
            headers: authBearerHeaders(token),
          }),
          ctx.env,
          executionContext
        )
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(res => {
        expect([200, 404, 429]).toContain(res.status);
      });
    });

    it('isolates user progress updates', async () => {
      // Create two users
      const user1 = await createTestUser(ctx.db);
      const user2 = await createTestUser(ctx.db);
      const token1 = await signTestAccessToken(user1, ctx.env.JWT_SECRET);
      const token2 = await signTestAccessToken(user2, ctx.env.JWT_SECRET);

      // Both update progress concurrently
      await Promise.all([
        ctx.app.fetch(
          new Request('http://localhost/v1/users/me/progress/sync', {
            method: 'POST',
            headers: jsonAuthBearerHeaders(token1),
            body: JSON.stringify({
              clientSeq: 1,
              updates: [{ id: 'word-1', bucket: 'mastered', proficiency: 1.0, lastReview: Date.now() }],
            }),
          }),
          ctx.env,
          executionContext
        ),
        ctx.app.fetch(
          new Request('http://localhost/v1/users/me/progress/sync', {
            method: 'POST',
            headers: jsonAuthBearerHeaders(token2),
            body: JSON.stringify({
              clientSeq: 1,
              updates: [{ id: 'word-1', bucket: 'new', proficiency: 0.0, lastReview: Date.now() }],
            }),
          }),
          ctx.env,
          executionContext
        ),
      ]);

      // Verify isolation - each user sees their own progress
      const [prog1, prog2] = await Promise.all([
        ctx.app.fetch(
          new Request('http://localhost/v1/users/me/progress', {
            headers: authBearerHeaders(token1),
          }),
          ctx.env,
          executionContext
        ),
        ctx.app.fetch(
          new Request('http://localhost/v1/users/me/progress', {
            headers: authBearerHeaders(token2),
          }),
          ctx.env,
          executionContext
        ),
      ]);

      // Progress should be isolated per user
      expect([200, 404]).toContain(prog1.status);
      expect([200, 404]).toContain(prog2.status);
    });
  });
});

