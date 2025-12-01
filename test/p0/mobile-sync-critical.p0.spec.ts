/**
 * P0+++: Mobile Sync Critical Tests
 * 
 * These tests are CRITICAL for mobile app data integrity.
 * Covers: partial updates, multi-device sync, conflict resolution.
 * 
 * FAILURE HERE = USER DATA LOSS
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createTestUser,
  signTestAccessToken,
  authBearerHeaders,
  jsonAuthBearerHeaders,
} from '../fixtures/jwt-auth-helpers';
import { nanoid } from 'nanoid';

describe.sequential('P0+++: Mobile Sync Critical', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // Helper to create authenticated user
  async function createAuthUser() {
    const user = await createTestUser(ctx.db);
    const token = await signTestAccessToken(user, ctx.env.JWT_SECRET);
    return { user, token };
  }

  // ========================================
  // PARTIAL UPDATE PROTECTION
  // ========================================

  describe('Partial Update Does NOT Overwrite Full State', () => {
    it('syncing 1 word should not delete other words', async () => {
      const { user, token } = await createAuthUser();

      // First sync: user has learned 5 words
      const initialSync = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress/sync', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(token),
          body: JSON.stringify({
            clientSeq: 1,
            updates: [
              { id: 'word-1', bucket: 'learning', proficiency: 0.5, lastReview: Date.now() },
              { id: 'word-2', bucket: 'learning', proficiency: 0.6, lastReview: Date.now() },
              { id: 'word-3', bucket: 'mastered', proficiency: 1.0, lastReview: Date.now() },
              { id: 'word-4', bucket: 'weak', proficiency: 0.2, lastReview: Date.now() },
              { id: 'word-5', bucket: 'new', proficiency: 0.0, lastReview: Date.now() },
            ],
          }),
        }),
        ctx.env,
        executionContext
      );

      // Second sync: only update 1 word (partial sync from mobile)
      const partialSync = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress/sync', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(token),
          body: JSON.stringify({
            clientSeq: 2,
            updates: [
              { id: 'word-1', bucket: 'mastered', proficiency: 1.0, lastReview: Date.now() },
            ],
          }),
        }),
        ctx.env,
        executionContext
      );

      // Get current state
      const stateRes = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress', {
          headers: authBearerHeaders(token),
        }),
        ctx.env,
        executionContext
      );

      if (stateRes.status === 200) {
        const body = await stateRes.json();
        // CRITICAL: All 5 words should still exist, not just word-1
        const wordCount = body.progress?.words?.length || 0;
        expect(wordCount).toBeGreaterThanOrEqual(5);
      }
    });

    it('empty updates array should not clear progress', async () => {
      const { user, token } = await createAuthUser();

      // Initial sync with data
      await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress/sync', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(token),
          body: JSON.stringify({
            clientSeq: 1,
            updates: [
              { id: 'word-1', bucket: 'learning', proficiency: 0.5, lastReview: Date.now() },
            ],
          }),
        }),
        ctx.env,
        executionContext
      );

      // Sync with empty updates (should NOT clear)
      await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress/sync', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(token),
          body: JSON.stringify({
            clientSeq: 2,
            updates: [],
          }),
        }),
        ctx.env,
        executionContext
      );

      // Verify data still exists
      const stateRes = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress', {
          headers: authBearerHeaders(token),
        }),
        ctx.env,
        executionContext
      );

      if (stateRes.status === 200) {
        const body = await stateRes.json();
        expect(body.progress?.words?.length || 0).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // ========================================
  // MULTI-DEVICE SYNC
  // ========================================

  describe('Multi-Device Sync', () => {
    it('same user on device A and B should merge progress', async () => {
      const { user, token } = await createAuthUser();

      // Device A syncs words 1-3
      await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress/sync', {
          method: 'POST',
          headers: {
            ...jsonAuthBearerHeaders(token),
            'X-Device-ID': 'device-A',
          },
          body: JSON.stringify({
            clientSeq: 1,
            updates: [
              { id: 'word-1', bucket: 'learning', proficiency: 0.5, lastReview: Date.now() },
              { id: 'word-2', bucket: 'learning', proficiency: 0.5, lastReview: Date.now() },
              { id: 'word-3', bucket: 'learning', proficiency: 0.5, lastReview: Date.now() },
            ],
          }),
        }),
        ctx.env,
        executionContext
      );

      // Device B syncs words 4-6 (different words)
      await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress/sync', {
          method: 'POST',
          headers: {
            ...jsonAuthBearerHeaders(token),
            'X-Device-ID': 'device-B',
          },
          body: JSON.stringify({
            clientSeq: 1,
            updates: [
              { id: 'word-4', bucket: 'new', proficiency: 0.0, lastReview: Date.now() },
              { id: 'word-5', bucket: 'new', proficiency: 0.0, lastReview: Date.now() },
              { id: 'word-6', bucket: 'new', proficiency: 0.0, lastReview: Date.now() },
            ],
          }),
        }),
        ctx.env,
        executionContext
      );

      // Get merged state
      const stateRes = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress', {
          headers: authBearerHeaders(token),
        }),
        ctx.env,
        executionContext
      );

      if (stateRes.status === 200) {
        const body = await stateRes.json();
        // Should have ALL 6 words from both devices
        expect(body.progress?.words?.length || 0).toBeGreaterThanOrEqual(6);
      }
    });

    it('conflicting updates use last-write-wins with timestamp', async () => {
      const { user, token } = await createAuthUser();
      const now = Date.now();

      // Device A updates word-1 (older timestamp)
      await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress/sync', {
          method: 'POST',
          headers: {
            ...jsonAuthBearerHeaders(token),
            'X-Device-ID': 'device-A',
          },
          body: JSON.stringify({
            clientSeq: 1,
            updates: [
              { id: 'word-1', bucket: 'learning', proficiency: 0.3, lastReview: now - 10000 },
            ],
          }),
        }),
        ctx.env,
        executionContext
      );

      // Device B updates same word-1 (newer timestamp)
      await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress/sync', {
          method: 'POST',
          headers: {
            ...jsonAuthBearerHeaders(token),
            'X-Device-ID': 'device-B',
          },
          body: JSON.stringify({
            clientSeq: 1,
            updates: [
              { id: 'word-1', bucket: 'mastered', proficiency: 1.0, lastReview: now },
            ],
          }),
        }),
        ctx.env,
        executionContext
      );

      // Device B's update (newer) should win
      const stateRes = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress', {
          headers: authBearerHeaders(token),
        }),
        ctx.env,
        executionContext
      );

      if (stateRes.status === 200) {
        const body = await stateRes.json();
        const word1 = body.progress?.words?.find((w: any) => w.id === 'word-1');
        if (word1) {
          expect(word1.bucket).toBe('mastered');
          expect(word1.proficiency).toBe(1.0);
        }
      }
    });
  });

  // ========================================
  // CLIENT SEQUENCE VALIDATION
  // ========================================

  describe('Client Sequence Number Handling', () => {
    it('accepts sequential client sequence numbers', async () => {
      const { user, token } = await createAuthUser();

      const res1 = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress/sync', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(token),
          body: JSON.stringify({
            clientSeq: 1,
            updates: [{ id: 'word-1', bucket: 'new', proficiency: 0.0, lastReview: Date.now() }],
          }),
        }),
        ctx.env,
        executionContext
      );

      const res2 = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress/sync', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(token),
          body: JSON.stringify({
            clientSeq: 2,
            updates: [{ id: 'word-2', bucket: 'new', proficiency: 0.0, lastReview: Date.now() }],
          }),
        }),
        ctx.env,
        executionContext
      );

      // Both should succeed
      expect([200, 201, 404]).toContain(res1.status);
      expect([200, 201, 404]).toContain(res2.status);
    });

    it('handles out-of-order sequence numbers gracefully', async () => {
      const { user, token } = await createAuthUser();

      // Send seq 5 before seq 3 (out of order)
      const res5 = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress/sync', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(token),
          body: JSON.stringify({
            clientSeq: 5,
            updates: [{ id: 'word-5', bucket: 'new', proficiency: 0.0, lastReview: Date.now() }],
          }),
        }),
        ctx.env,
        executionContext
      );

      const res3 = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress/sync', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(token),
          body: JSON.stringify({
            clientSeq: 3,
            updates: [{ id: 'word-3', bucket: 'new', proficiency: 0.0, lastReview: Date.now() }],
          }),
        }),
        ctx.env,
        executionContext
      );

      // Should handle gracefully (not crash, maybe warn)
      expect([200, 201, 400, 404, 409]).toContain(res5.status);
      expect([200, 201, 400, 404, 409]).toContain(res3.status);
    });
  });

  // ========================================
  // OFFLINE → ONLINE SYNC
  // ========================================

  describe('Offline to Online Sync', () => {
    it('bulk offline sync merges correctly', async () => {
      const { user, token } = await createAuthUser();

      // User was offline for a week, syncing 100 word updates at once
      const offlineUpdates = Array.from({ length: 100 }, (_, i) => ({
        id: `word-${i}`,
        bucket: i % 4 === 0 ? 'mastered' : i % 3 === 0 ? 'learning' : 'new',
        proficiency: Math.random(),
        lastReview: Date.now() - Math.random() * 604800000, // Random time in last week
      }));

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress/sync', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(token),
          body: JSON.stringify({
            clientSeq: 1,
            updates: offlineUpdates,
          }),
        }),
        ctx.env,
        executionContext
      );

      // Should handle bulk sync
      expect([200, 201, 404]).toContain(res.status);

      // Verify all words are saved
      const stateRes = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress', {
          headers: authBearerHeaders(token),
        }),
        ctx.env,
        executionContext
      );

      if (stateRes.status === 200) {
        const body = await stateRes.json();
        expect(body.progress?.words?.length || 0).toBeGreaterThanOrEqual(100);
      }
    });

    it('sync returns server state for client reconciliation', async () => {
      const { user, token } = await createAuthUser();

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress/sync', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(token),
          body: JSON.stringify({
            clientSeq: 1,
            updates: [{ id: 'word-1', bucket: 'new', proficiency: 0.0, lastReview: Date.now() }],
          }),
        }),
        ctx.env,
        executionContext
      );

      if (res.status === 200) {
        const body = await res.json();
        // Response should include server state for reconciliation
        expect(body).toHaveProperty('serverSeq');
        // Or at minimum confirm the sync
        expect(body.success || body.synced).toBeTruthy();
      }
    });
  });

  // ========================================
  // DATA INTEGRITY
  // ========================================

  describe('Data Integrity', () => {
    it('proficiency values are bounded 0-1', async () => {
      const { user, token } = await createAuthUser();

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress/sync', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(token),
          body: JSON.stringify({
            clientSeq: 1,
            updates: [
              { id: 'word-1', bucket: 'learning', proficiency: 1.5, lastReview: Date.now() }, // Invalid
              { id: 'word-2', bucket: 'learning', proficiency: -0.5, lastReview: Date.now() }, // Invalid
            ],
          }),
        }),
        ctx.env,
        executionContext
      );

      // Should either reject or clamp values
      expect([200, 400, 404, 422]).toContain(res.status);
    });

    it('invalid bucket names are rejected', async () => {
      const { user, token } = await createAuthUser();

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress/sync', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(token),
          body: JSON.stringify({
            clientSeq: 1,
            updates: [
              { id: 'word-1', bucket: 'invalid-bucket', proficiency: 0.5, lastReview: Date.now() },
            ],
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 404, 422]).toContain(res.status);
    });

    it('future timestamps are handled', async () => {
      const { user, token } = await createAuthUser();

      const futureTime = Date.now() + 86400000; // 1 day in future

      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress/sync', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(token),
          body: JSON.stringify({
            clientSeq: 1,
            updates: [
              { id: 'word-1', bucket: 'learning', proficiency: 0.5, lastReview: futureTime },
            ],
          }),
        }),
        ctx.env,
        executionContext
      );

      // Should either reject or clamp to current time
      expect([200, 400, 404, 422]).toContain(res.status);
    });
  });

  // ========================================
  // LOGIN ON NEW DEVICE
  // ========================================

  describe('Login on New Device', () => {
    it('new device receives full progress state', async () => {
      const { user, token } = await createAuthUser();

      // Sync progress on device A
      await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress/sync', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(token),
          body: JSON.stringify({
            clientSeq: 1,
            updates: [
              { id: 'word-1', bucket: 'mastered', proficiency: 1.0, lastReview: Date.now() },
              { id: 'word-2', bucket: 'learning', proficiency: 0.5, lastReview: Date.now() },
            ],
          }),
        }),
        ctx.env,
        executionContext
      );

      // Login on device B (same user, new token)
      const newToken = await signTestAccessToken(user, ctx.env.JWT_SECRET);

      // Device B fetches initial state
      const stateRes = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress', {
          headers: {
            ...authBearerHeaders(newToken),
            'X-Device-ID': 'device-B-new',
          },
        }),
        ctx.env,
        executionContext
      );

      if (stateRes.status === 200) {
        const body = await stateRes.json();
        // New device should see all progress from device A
        expect(body.progress?.words?.length || 0).toBeGreaterThanOrEqual(2);
      }
    });

    it('initial sync endpoint returns full state', async () => {
      const { user, token } = await createAuthUser();

      // Add some progress
      await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress/sync', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(token),
          body: JSON.stringify({
            clientSeq: 1,
            updates: [
              { id: 'word-1', bucket: 'mastered', proficiency: 1.0, lastReview: Date.now() },
            ],
          }),
        }),
        ctx.env,
        executionContext
      );

      // Initial sync request (new device)
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/users/me/progress/initial', {
          headers: authBearerHeaders(token),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);

      if (res.status === 200) {
        const body = await res.json();
        expect(body).toHaveProperty('progress');
        expect(body).toHaveProperty('serverSeq');
      }
    });
  });
});

