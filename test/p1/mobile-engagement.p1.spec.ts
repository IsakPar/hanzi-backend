/**
 * P1: Mobile Engagement Tracking Tests
 * 
 * Story reading, AI tutor sessions, and activity logging.
 * Used for:
 * - Retention analytics
 * - Engagement metrics
 * - Streak tracking
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import { nanoid } from 'nanoid';

describe.sequential('P1: Mobile Engagement Tracking', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // STORY READING TRACKING
  // ========================================

  describe('POST /v1/analytics/stories/reading', () => {
    it('records story reading session', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/stories/reading', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storyId: nanoid(),
            sentencesRead: 15,
            totalSentences: 30,
            wordsTapped: 5,
            audioPlays: 3,
            timeSpentSeconds: 180,
            scrollDepthPct: 50,
            finished: false,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201]).toContain(res.status);
    });

    it('records completed story', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/stories/reading', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: nanoid(),
            storyId: nanoid(),
            sentencesRead: 30,
            totalSentences: 30,
            wordsTapped: 10,
            audioPlays: 8,
            timeSpentSeconds: 420,
            scrollDepthPct: 100,
            finished: true,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201]).toContain(res.status);
    });

    it('tracks word taps for vocabulary analysis', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/stories/reading', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storyId: nanoid(),
            wordsTapped: 25, // Many taps = confusing story
            timeSpentSeconds: 600,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201]).toContain(res.status);
    });

    it('tracks audio usage', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/stories/reading', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storyId: nanoid(),
            audioPlays: 15, // Heavy audio usage
            timeSpentSeconds: 300,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201]).toContain(res.status);
    });

    it('accepts anonymous reading', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/stories/reading', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storyId: nanoid(),
            sentencesRead: 10,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201]).toContain(res.status);
    });

    it('rejects missing storyId', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/stories/reading', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sentencesRead: 10,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 422]).toContain(res.status);
    });
  });

  // ========================================
  // AI TUTOR SESSION TRACKING
  // ========================================

  describe('POST /v1/analytics/ai-tutor/session', () => {
    it('records AI tutor session', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/ai-tutor/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: nanoid(),
            userId: nanoid(),
            messageCount: 10,
            userMessageCount: 5,
            aiMessageCount: 5,
            topicsDiscussed: ['greetings', 'numbers'],
            correctionsMade: 3,
            totalTokensUsed: 1500,
            estimatedCostUsd: 0.05,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201]).toContain(res.status);
    });

    it('updates existing session', async () => {
      const sessionId = nanoid();

      // Initial session
      await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/ai-tutor/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            messageCount: 2,
            totalTokensUsed: 500,
          }),
        }),
        ctx.env,
        executionContext
      );

      // Update same session with more messages
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/ai-tutor/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            messageCount: 10,
            totalTokensUsed: 2000,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201]).toContain(res.status);
    });

    it('ends session with rating', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/ai-tutor/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: nanoid(),
            messageCount: 15,
            userRating: 5,
            endSession: true,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201]).toContain(res.status);
    });

    it('tracks grammar points covered', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/ai-tutor/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: nanoid(),
            grammarPointsCovered: ['suiran-danshi', 'bushi-ershi'],
            correctionsMade: 5,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201]).toContain(res.status);
    });

    it('tracks vocabulary used', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/ai-tutor/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: nanoid(),
            vocabularyUsed: ['你好', '谢谢', '再见'],
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201]).toContain(res.status);
    });

    it('rejects missing sessionId', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/ai-tutor/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageCount: 10,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 422]).toContain(res.status);
    });

    it('validates rating range', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/ai-tutor/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: nanoid(),
            userRating: 10, // Invalid - should be 1-5
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 422]).toContain(res.status);
    });
  });

  // ========================================
  // ACTIVITY LOGGING (STREAKS)
  // ========================================

  describe('POST /v1/analytics/activity', () => {
    it('logs lesson activity', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: nanoid(),
            activityType: 'lesson',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201]).toContain(res.status);
    });

    it('logs story activity', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: nanoid(),
            activityType: 'story',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201]).toContain(res.status);
    });

    it('logs vocab activity', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: nanoid(),
            activityType: 'vocab',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201]).toContain(res.status);
    });

    it('logs ai_chat activity', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: nanoid(),
            activityType: 'ai_chat',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201]).toContain(res.status);
    });

    it('increments activity count on same day', async () => {
      const userId = nanoid();

      // First activity
      const res1 = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, activityType: 'lesson' }),
        }),
        ctx.env,
        executionContext
      );

      // Second activity same day
      const res2 = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, activityType: 'lesson' }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201]).toContain(res1.status);
      expect([200, 201]).toContain(res2.status);
    });

    it('rejects missing userId', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activityType: 'lesson',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 422]).toContain(res.status);
    });

    it('rejects invalid activityType', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: nanoid(),
            activityType: 'invalid_type',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 422]).toContain(res.status);
    });
  });
});

