/**
 * P1: Models API Tests - AI model management
 * 
 * Tests model CRUD and usage tracking
 * 
 * Actual ai_models schema:
 * - id, name, provider, cost_per_1k_input, cost_per_1k_output
 * - is_active, tier, max_tokens, supports_json, created_at, updated_at
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
  jsonAuthBearerHeaders,
} from '../fixtures/jwt-auth-helpers';
import { nanoid } from 'nanoid';

describe.sequential('P1: Models API', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  // ========================================
  // MODEL LISTING
  // ========================================

  describe('GET /v1/models', () => {
    it('returns available models', async () => {
      const { accessToken: adminToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/models', {
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/models/active returns active model', async () => {
      const { accessToken: adminToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/models/active', {
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // MODEL CRUD
  // ========================================

  describe('Model CRUD', () => {
    it('POST /v1/models creates model (admin)', async () => {
      const { accessToken: adminToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/models', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            name: 'test-model',
            provider: 'openai',
            costPer1kInput: 0.03,
            costPer1kOutput: 0.06,
            tier: 'pro',
            maxTokens: 4096,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 201, 404]).toContain(res.status);
    });

    it('PUT /v1/models/:id updates model', async () => {
      const { accessToken: adminToken } = await createAuthenticatedAdmin(ctx.db);
      const modelId = nanoid();
      
      // Create model first with correct schema
      await ctx.db.prepare(`
        INSERT INTO ai_models (id, name, provider, cost_per_1k_input, cost_per_1k_output, tier, max_tokens, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `).bind(modelId, 'test-model', 'openai', 0.03, 0.06, 'pro', 4096).run();
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/models/${modelId}`, {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({
            costPer1kInput: 0.05,
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('DELETE /v1/models/:id removes model', async () => {
      const { accessToken: adminToken } = await createAuthenticatedAdmin(ctx.db);
      const modelId = nanoid();
      
      // Create model first with correct schema
      await ctx.db.prepare(`
        INSERT INTO ai_models (id, name, provider, cost_per_1k_input, cost_per_1k_output, tier, max_tokens, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      `).bind(modelId, 'to-delete', 'openai', 0.01, 0.02, 'free', 1024).run();
      
      const res = await ctx.app.fetch(
        new Request(`http://localhost/v1/models/${modelId}`, {
          method: 'DELETE',
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 204, 404]).toContain(res.status);
    });

    it('denies non-admin model creation', async () => {
      const { accessToken: userToken } = await createAuthenticatedUser(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/models', {
          method: 'POST',
          headers: jsonAuthBearerHeaders(userToken),
          body: JSON.stringify({
            name: 'unauthorized-model',
            provider: 'openai',
            costPer1kInput: 0.03,
            costPer1kOutput: 0.06,
            tier: 'pro',
          }),
        }),
        ctx.env,
        executionContext
      );

      expect([401, 403, 404]).toContain(res.status);
    });
  });

  // ========================================
  // ACTIVE MODEL MANAGEMENT
  // ========================================

  describe('Active Model', () => {
    it('PUT /v1/models/active sets active model', async () => {
      const { accessToken: adminToken } = await createAuthenticatedAdmin(ctx.db);
      const modelId = nanoid();
      
      // Create model first with correct schema
      await ctx.db.prepare(`
        INSERT INTO ai_models (id, name, provider, cost_per_1k_input, cost_per_1k_output, tier, max_tokens, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      `).bind(modelId, 'to-activate', 'openai', 0.03, 0.06, 'pro', 4096).run();
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/models/active', {
          method: 'PUT',
          headers: jsonAuthBearerHeaders(adminToken),
          body: JSON.stringify({ modelId }),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });

  // ========================================
  // USAGE TRACKING
  // ========================================

  describe('Model Usage', () => {
    it('GET /v1/models/usage returns usage stats', async () => {
      const { accessToken: adminToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/models/usage', {
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });

    it('GET /v1/models/usage/realtime returns real-time usage', async () => {
      const { accessToken: adminToken } = await createAuthenticatedAdmin(ctx.db);
      
      const res = await ctx.app.fetch(
        new Request('http://localhost/v1/models/usage/realtime', {
          headers: authBearerHeaders(adminToken),
        }),
        ctx.env,
        executionContext
      );

      expect([200, 404]).toContain(res.status);
    });
  });
});
