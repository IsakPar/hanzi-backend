/**
 * P0++: Mobile Exercise Tracking Tests
 * 
 * Every answer the user gives goes through this endpoint.
 * Critical for:
 * - Success rate analytics
 * - Identifying hard exercises
 * - User progress tracking
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import { nanoid } from 'nanoid';

describe.sequential('P0++: Mobile Exercise Tracking', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // EXERCISE ATTEMPT TRACKING
  // ========================================

  describe('POST /v1/analytics/exercises/attempt', () => {
    it('records correct attempt', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/exercises/attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: nanoid(),
            lessonId: nanoid(),
            blockId: nanoid(),
            exerciseType: 'mcq',
            isCorrect: true,
            attemptNumber: 1,
            timeSpentMs: 2500,
            hintsUsed: 0,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201]).toContain(res.status);
      
      if (res.status === 200 || res.status === 201) {
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.id).toBeDefined();
      }
    });

    it('records incorrect attempt', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/exercises/attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blockId: nanoid(),
            exerciseType: 'typing',
            isCorrect: false,
            attemptNumber: 1,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201]).toContain(res.status);
    });

    it('records multiple attempts on same block', async () => {
      const blockId = nanoid();

      // First attempt - wrong
      const res1 = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/exercises/attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blockId,
            exerciseType: 'mcq',
            isCorrect: false,
            attemptNumber: 1,
          }),
        }),
        ctx.env,
        executionContext
      );

      // Second attempt - wrong
      const res2 = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/exercises/attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blockId,
            exerciseType: 'mcq',
            isCorrect: false,
            attemptNumber: 2,
          }),
        }),
        ctx.env,
        executionContext
      );

      // Third attempt - correct
      const res3 = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/exercises/attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blockId,
            exerciseType: 'mcq',
            isCorrect: true,
            attemptNumber: 3,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201]).toContain(res1.status);
      expect([200, 201]).toContain(res2.status);
      expect([200, 201]).toContain(res3.status);
    });

    it('records flashcard exercise', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/exercises/attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blockId: nanoid(),
            exerciseType: 'flashcard',
            isCorrect: true,
            timeSpentMs: 1200,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201]).toContain(res.status);
    });

    it('records typing exercise', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/exercises/attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blockId: nanoid(),
            exerciseType: 'typing',
            isCorrect: true,
            timeSpentMs: 5000,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201]).toContain(res.status);
    });

    it('tracks hints used', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/exercises/attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blockId: nanoid(),
            exerciseType: 'mcq',
            isCorrect: true,
            hintsUsed: 2,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201]).toContain(res.status);
    });

    it('tracks story exercises', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/exercises/attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storyId: nanoid(),
            blockId: nanoid(),
            exerciseType: 'comprehension',
            isCorrect: true,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201]).toContain(res.status);
    });

    it('accepts anonymous attempts', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/exercises/attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // No userId - anonymous
            blockId: nanoid(),
            exerciseType: 'mcq',
            isCorrect: true,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201]).toContain(res.status);
    });

    it('rejects missing blockId', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/exercises/attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exerciseType: 'mcq',
            isCorrect: true,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 422]).toContain(res.status);
    });

    it('rejects missing exerciseType', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/exercises/attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blockId: nanoid(),
            isCorrect: true,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 422]).toContain(res.status);
    });

    it('rejects missing isCorrect', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/analytics/exercises/attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blockId: nanoid(),
            exerciseType: 'mcq',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 422]).toContain(res.status);
    });
  });
});

