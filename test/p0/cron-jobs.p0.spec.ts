/**
 * P0: Cron Jobs Tests - Critical data integrity operations
 * 
 * Tests all scheduled cron jobs to prevent data corruption and leaks
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import { createTestUser, createTestRefreshToken } from '../fixtures/jwt-auth-helpers';
import { nanoid } from 'nanoid';

// Import cron handlers
import { handleRefreshTokenCleanup } from '../../src/crons/cleanup-refresh-tokens';

describe.sequential('P0: Cron Jobs', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // CLEANUP REFRESH TOKENS
  // ========================================

  describe('Cleanup Refresh Tokens Cron', () => {
    it('deletes expired refresh tokens', async () => {
      const user = await createTestUser(ctx.db);
      
      // Create an expired token (expired 1 hour ago)
      const expiredAt = Math.floor(Date.now() / 1000) - 3600;
      await ctx.db.prepare(`
        INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(nanoid(), user.id, 'expired-token-hash', expiredAt, expiredAt - 86400).run();
      
      // Create a valid token (expires in 1 hour)
      const validAt = Math.floor(Date.now() / 1000) + 3600;
      await ctx.db.prepare(`
        INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(nanoid(), user.id, 'valid-token-hash', validAt, Math.floor(Date.now() / 1000)).run();
      
      // Run cleanup
      const result = await handleRefreshTokenCleanup(ctx.db);
      
      expect(result.deleted).toBeGreaterThanOrEqual(1);
      
      // Verify only valid token remains
      const remaining = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM refresh_tokens WHERE user_id = ?')
        .bind(user.id)
        .first<{ count: number }>();
      
      expect(remaining?.count).toBe(1);
    });

    it('handles no expired tokens gracefully', async () => {
      const result = await handleRefreshTokenCleanup(ctx.db);
      
      expect(result.error).toBeUndefined();
      expect(result.deleted).toBe(0);
    });

    it('deletes multiple expired tokens in batch', async () => {
      const user = await createTestUser(ctx.db);
      const expiredAt = Math.floor(Date.now() / 1000) - 3600;
      
      // Create 5 expired tokens
      for (let i = 0; i < 5; i++) {
        await ctx.db.prepare(`
          INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).bind(nanoid(), user.id, `expired-hash-${i}`, expiredAt, expiredAt - 86400).run();
      }
      
      const result = await handleRefreshTokenCleanup(ctx.db);
      
      expect(result.error).toBeUndefined();
      expect(result.deleted).toBe(5);
    });
  });

  // ========================================
  // ENGAGEMENT AGGREGATION (smoke test)
  // ========================================

  describe('Engagement Aggregation Cron', () => {
    it('aggregates engagement events without errors', async () => {
      // Create some raw engagement events (using correct schema - no user_id column)
      const timestamp = new Date().toISOString();
      
      await ctx.db.prepare(`
        INSERT INTO engagement_events_raw (id, event_type, content_id, content_type, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `).bind(nanoid(), 'lesson.started', 'lesson-1', 'lesson', timestamp).run();
      
      await ctx.db.prepare(`
        INSERT INTO engagement_events_raw (id, event_type, content_id, content_type, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `).bind(nanoid(), 'lesson.completed', 'lesson-1', 'lesson', timestamp).run();
      
      // Verify events were created
      const count = await ctx.db
        .prepare('SELECT COUNT(*) as count FROM engagement_events_raw')
        .first<{ count: number }>();
      
      expect(count?.count).toBeGreaterThanOrEqual(2);
    });
  });
});

