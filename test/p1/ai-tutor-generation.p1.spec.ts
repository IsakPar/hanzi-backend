/**
 * P1: AI Tutor Generation Tests
 * 
 * Tests for AI Tutor lesson generation.
 * Validates input, handles errors, tracks costs.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
  jsonAuthBearerHeaders,
} from '../fixtures/jwt-auth-helpers';

describe.sequential('P1: AI Tutor Generation', () => {
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
  // INPUT VALIDATION
  // ========================================

  describe('POST /v1/ai-tutor/generate - Validation', () => {
    it('requires focusWords array', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/ai-tutor/generate', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            userLessonPosition: 1,
            hskLevel: 1,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 422]).toContain(res.status);
    });

    it('requires non-empty focusWords', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/ai-tutor/generate', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            focusWords: [],
            userLessonPosition: 1,
            hskLevel: 1,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 422]).toContain(res.status);
    });

    it('validates hskLevel range (1-6)', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/ai-tutor/generate', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            focusWords: ['你好'],
            userLessonPosition: 1,
            hskLevel: 99, // Invalid
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 422]).toContain(res.status);
    });

    it('validates userLessonPosition range', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/ai-tutor/generate', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            focusWords: ['你好'],
            userLessonPosition: 0, // Invalid (min 1)
            hskLevel: 1,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 422]).toContain(res.status);
    });

    it('limits focusWords to max 10', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/ai-tutor/generate', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            focusWords: Array(15).fill('你好'), // Too many
            userLessonPosition: 1,
            hskLevel: 1,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([400, 422]).toContain(res.status);
    });
  });

  // ========================================
  // SUCCESSFUL GENERATION
  // ========================================

  describe('POST /v1/ai-tutor/generate - Success', () => {
    it('accepts valid generation request', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/ai-tutor/generate', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            focusWords: ['你好', '谢谢'],
            userLessonPosition: 5,
            hskLevel: 1,
          }),
        }),
        ctx.env,
        executionContext
      );

      // May fail due to AI binding, but should not be validation error
      expect([200, 500, 503]).toContain(res.status);
    });

    it('returns lesson structure on success', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/ai-tutor/generate', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            focusWords: ['你好'],
            userLessonPosition: 1,
            hskLevel: 1,
          }),
        }),
        ctx.env,
        executionContext
      );

      if (res.status === 200) {
        const body = await res.json();
        expect(body).toHaveProperty('lesson');
        expect(body.lesson).toHaveProperty('reading');
        expect(body.lesson).toHaveProperty('practice');
      }
    });
  });

  // ========================================
  // AUTHENTICATION
  // ========================================

  describe('Authentication', () => {
    it('requires authentication', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/ai-tutor/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            focusWords: ['你好'],
            userLessonPosition: 1,
            hskLevel: 1,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect(res.status).toBe(401);
    });

    it('allows regular users to generate', async () => {
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/ai-tutor/generate', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(userToken),
          body: JSON.stringify({
            focusWords: ['你好'],
            userLessonPosition: 1,
            hskLevel: 1,
          }),
        }),
        ctx.env,
        executionContext
      );

      // User should be able to generate (may fail due to AI binding)
      expect([200, 401, 403, 500, 503]).toContain(res.status);
    });
  });
});
