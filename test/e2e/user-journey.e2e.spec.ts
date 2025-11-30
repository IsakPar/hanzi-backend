/**
 * End-to-End User Journey Tests
 * 
 * Tests complete user flows using Better Auth:
 * - Waitlist signup
 * - Unit and lesson management
 * - Premium upgrade flow
 * - Content access patterns
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createTestUnit,
  createTestLesson,
  createTestLessonBlock,
  createPremiumUser,
} from '../fixtures/seed-data';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  createBetterAuthUser,
  authCookieHeaders,
  jsonAuthCookieHeaders,
  type BetterAuthTestUser,
} from '../fixtures/better-auth-helpers';

describe.sequential('E2E: User Journeys', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // WAITLIST SIGNUP
  // ========================================

  describe('Waitlist Signup', () => {
    it('completes waitlist signup flow', async () => {
      const uniqueEmail = `newuser-${Date.now()}@example.com`;
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: uniqueEmail, source: 'website' }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.message).toContain('on the list');
    });

    it('handles duplicate waitlist signup gracefully', async () => {
      const email = `duplicate-${Date.now()}@example.com`;

      // First signup
      await ctx.app.fetch(
        new Request('http://localhost/v1/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }),
        ctx.env,
        executionContext
      );

      // Second signup - should return success (privacy protection)
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }),
        ctx.env,
        executionContext
      );

      // Returns 200 with success message (doesn't reveal email exists)
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it('validates email format', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'not-an-email' }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // ADMIN CONTENT MANAGEMENT
  // ========================================

  describe('Admin Content Management', () => {
    let adminToken: string;

    beforeEach(async () => {
      const admin = await createAuthenticatedAdmin(ctx.db);
      adminToken = admin.sessionToken;
    });

    it('creates unit and lists it', async () => {
      // Create unit
      const createRes = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'POST',
          headers: jsonAuthCookieHeaders(adminToken),
          body: JSON.stringify({
            hskLevel: 1,
            title: 'Introduction to Chinese',
            description: 'Your first steps into Mandarin',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(createRes.status).toBe(201);
      const { id } = await createRes.json();

      // Verify it appears in list
      const listRes = await ctx.app.fetch(
        new Request('http://localhost/v1/units?hsk_level=1', {
          method: 'GET',
          headers: authCookieHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect(listRes.status).toBe(200);
      const listBody = await listRes.json();
      const createdUnit = listBody.units.find((u: { id: string }) => u.id === id);
      expect(createdUnit).toBeDefined();
      expect(createdUnit.title).toBe('Introduction to Chinese');
    });

    it('creates vocabulary and searches for it', async () => {
      // Create vocabulary
      const createRes = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary/admin', {
          method: 'POST',
          headers: jsonAuthCookieHeaders(adminToken),
          body: JSON.stringify({
            hanzi: '朋友',
            pinyin: 'péngyou',
            english: 'friend',
            category: 'nouns',
            hskLevel: 1,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(createRes.status).toBe(201);

      // Search for it
      const searchRes = await ctx.app.fetch(
        new Request('http://localhost/v1/vocabulary?query=friend', {
          method: 'GET',
        }),
        ctx.env,
        executionContext
      );

      expect(searchRes.status).toBe(200);
      const searchBody = await searchRes.json();
      expect(searchBody.results.length).toBeGreaterThan(0);
      expect(searchBody.results[0].hanzi).toBe('朋友');
    });

    it('publishes unit and verifies state', async () => {
      const unit = await createTestUnit(ctx.db, {
        isPublished: false,
        hskLevel: 2,
        unitNumber: 100,
      });

      // Publish
      const publishRes = await ctx.app.fetch(
        new Request(`http://localhost/v1/units/${unit.id}`, {
          method: 'PUT',
          headers: jsonAuthCookieHeaders(adminToken),
          body: JSON.stringify({ isPublished: true }),
        }),
        ctx.env,
        executionContext
      );

      expect(publishRes.status).toBe(200);

      // Verify
      const getRes = await ctx.app.fetch(
        new Request(`http://localhost/v1/units/${unit.id}`, {
          method: 'GET',
          headers: authCookieHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      const body = await getRes.json();
      expect(body.unit.isPublished).toBe(true);
    });
  });

  // ========================================
  // LESSON ACCESS
  // ========================================

  describe('Lesson Access', () => {
    it('retrieves lesson with all blocks', async () => {
      const unit = await createTestUnit(ctx.db, {
        hskLevel: 1,
        unitNumber: 200,
        isPublished: true,
      });
      const lesson = await createTestLesson(ctx.db, {
        unitId: unit.id,
        title: 'Hello & Goodbye',
        isPublished: true,
      });

      // Add multiple blocks
      await createTestLessonBlock(ctx.db, lesson.id, {
        type: 'intro',
        orderIndex: 0,
        content: { title: 'Welcome', description: 'Learn greetings' },
      });
      await createTestLessonBlock(ctx.db, lesson.id, {
        type: 'vocabulary',
        orderIndex: 1,
        content: { words: [{ hanzi: '你好', pinyin: 'nǐ hǎo', english: 'hello' }] },
      });
      await createTestLessonBlock(ctx.db, lesson.id, {
        type: 'quiz',
        orderIndex: 2,
        content: { question: 'How do you say hello?' },
      });

      // Fetch lesson
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/lessons/${lesson.id}`, {
          method: 'GET',
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.title).toBe('Hello & Goodbye');
      expect(body.blocks).toHaveLength(3);
      expect(body.blocks.map((b: { type: string }) => b.type)).toEqual([
        'intro',
        'vocabulary',
        'quiz',
      ]);
    });
  });

  // ========================================
  // PREMIUM UPGRADE FLOW
  // ========================================

  describe('Premium Upgrade Flow', () => {
    it('upgrades user from free to premium via webhook', async () => {
      // Create a user with a clerk_id for webhook lookup
      const userId = crypto.randomUUID();
      const clerkId = `user_test_${Date.now()}`;
      
      await ctx.db.prepare(`
        INSERT INTO users (id, clerk_id, email, name, role, tier, subscription_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
      `).bind(userId, clerkId, 'test@example.com', 'Test User', 'user', 'free', 'none').run();

      // Verify initial state
      const initialState = await ctx.db
        .prepare('SELECT tier FROM users WHERE id = ?')
        .bind(userId)
        .first<{ tier: string }>();
      expect(initialState?.tier).toBe('free');

      // Simulate purchase webhook
      const webhookRes = await ctx.app.fetch(
        new Request('http://localhost/v1/billing/webhooks/revenuecat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
          },
          body: JSON.stringify({
            event: {
              type: 'INITIAL_PURCHASE',
              app_user_id: clerkId,
              product_id: 'hanzi_premium_monthly',
              store: 'app_store',
              expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
            },
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(webhookRes.status).toBe(200);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify upgrade
      const upgradedState = await ctx.db
        .prepare('SELECT tier, subscription_status FROM users WHERE id = ?')
        .bind(userId)
        .first<{ tier: string; subscription_status: string }>();

      expect(upgradedState?.tier).toBe('premium');
      expect(upgradedState?.subscription_status).toBe('active');
    });

    it('handles subscription cancellation with grace period', async () => {
      const premiumUser = await createPremiumUser(ctx.db);
      const futureExpiration = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      await ctx.db
        .prepare('UPDATE users SET subscription_expires_at = ? WHERE id = ?')
        .bind(futureExpiration, premiumUser.id)
        .run();

      // Simulate cancellation
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/billing/webhooks/revenuecat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ctx.env.REVENUECAT_WEBHOOK_SECRET}`,
          },
          body: JSON.stringify({
            event: {
              type: 'CANCELLATION',
              app_user_id: premiumUser.clerkId,
              product_id: 'hanzi_premium_monthly',
              expiration_at_ms: futureExpiration * 1000,
            },
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // User should still be premium until expiration
      const user = await ctx.db
        .prepare('SELECT tier, subscription_status FROM users WHERE id = ?')
        .bind(premiumUser.id)
        .first<{ tier: string; subscription_status: string }>();

      expect(user?.tier).toBe('premium');
      expect(user?.subscription_status).toBe('canceled');
    });
  });

  // ========================================
  // ERROR RECOVERY
  // ========================================

  describe('Error Recovery', () => {
    it('handles concurrent unit updates gracefully', async () => {
      const { sessionToken: adminToken } = await createAuthenticatedAdmin(ctx.db);

      const unit = await createTestUnit(ctx.db, {
        hskLevel: 3,
        unitNumber: 300,
      });

      // Simulate concurrent updates
      const updates = Array(5).fill(null).map((_, i) =>
        ctx.app.fetch(
          new Request(`http://localhost/v1/units/${unit.id}`, {
            method: 'PUT',
            headers: jsonAuthCookieHeaders(adminToken),
            body: JSON.stringify({ title: `Concurrent Update ${i}` }),
          }),
          ctx.env,
          executionContext
        )
      );

      const responses = await Promise.all(updates);

      // All should succeed
      responses.forEach((res) => {
        expect(res.status).toBe(200);
      });

      // Final state should be consistent
      const finalUnit = await ctx.db
        .prepare('SELECT title FROM units WHERE id = ?')
        .bind(unit.id)
        .first<{ title: string }>();

      expect(finalUnit?.title).toMatch(/^Concurrent Update \d$/);
    });

    it('validates input and rejects invalid data', async () => {
      const { sessionToken: adminToken } = await createAuthenticatedAdmin(ctx.db);

      // Try to create unit with invalid HSK level
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'POST',
          headers: jsonAuthCookieHeaders(adminToken),
          body: JSON.stringify({
            hskLevel: 999, // Invalid: should be 1-9
            title: 'Invalid Unit',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(400);
    });

    it('returns proper error for unauthorized access', async () => {
      const { sessionToken: userToken } = await createAuthenticatedUser(ctx.db);

      // Try to access admin endpoint
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/units', {
          method: 'GET',
          headers: authCookieHeaders(userToken),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(403);
    });
  });

  // ========================================
  // HEALTH CHECK
  // ========================================

  describe('Health Check', () => {
    it('returns healthy status', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/', {
          method: 'GET',
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('ok');
      expect(body.service).toBe('hanzimaster-backend-v2');
    });
  });
});
