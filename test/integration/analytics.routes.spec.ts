/**
 * Analytics Routes Integration Tests
 * 
 * Tests analytics endpoints for AI usage and system events.
 * Uses Better Auth for authentication.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
  type BetterAuthTestUser,
} from '../fixtures/jwt-auth-helpers';

const baseUrl = 'http://localhost';

async function seedAnalyticsData(ctx: TestContext, userId: string) {
  await ctx.db
    .prepare(
      `INSERT INTO system_events (id, event_type, request_id, user_id, model_used, prompt_slug, prompt_version, latency_ms, cost_usd, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      crypto.randomUUID(),
      'ai.generate.success',
      'req-1',
      userId,
      'gpt-test',
      'lesson_default',
      1,
      1200,
      0.02,
      JSON.stringify({ detail: 'ok' })
    )
    .run();

  const stmt = ctx.db.prepare(
    `INSERT INTO api_usage (id, user_id, request_id, model_used, input_tokens, output_tokens, total_tokens, estimated_cost, latency_ms, success, prompt_slug, prompt_version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  await stmt
    .bind(
      crypto.randomUUID(),
      userId,
      'req-1',
      'gpt-test',
      100,
      50,
      150,
      0.03,
      900,
      1,
      'lesson_default',
      1
    )
    .run();
  await stmt
    .bind(
      crypto.randomUUID(),
      userId,
      'req-2',
      'gpt-test',
      200,
      100,
      300,
      0.06,
      1100,
      0,
      'lesson_experiment',
      2
    )
    .run();
}

describe.sequential('Analytics routes', () => {
  let ctx: TestContext;
  let adminUser: BetterAuthTestUser;
  let adminToken: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    const admin = await createAuthenticatedAdmin(ctx.db);
    adminUser = admin.user;
    adminToken = admin.accessToken;
    await seedAnalyticsData(ctx, adminUser.id);
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  it('returns filtered AI analytics for admin', async () => {
    const res = await ctx.app.fetch(
      new Request(`${baseUrl}/v1/analytics/ai?prompt_slug=lesson_default&success=true`, {
        headers: authBearerHeaders(adminToken),
      }),
      ctx.env,
      executionContext
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary.totalRequests).toBe(1);
    expect(body.summary.totalTokens).toBe(150);
  });

  it('rejects non-admin access', async () => {
    const { accessToken: sessionToken } = await createAuthenticatedUser(ctx.db);
    
    const res = await ctx.app.fetch(
      new Request(`${baseUrl}/v1/analytics/ai`, {
        headers: authBearerHeaders(sessionToken),
      }),
      ctx.env,
      executionContext
    );

    expect(res.status).toBe(403);
  });

  it('returns system events within date range', async () => {
    const from = new Date(Date.now() - 1000).toISOString();
    const to = new Date(Date.now() + 1000).toISOString();
    
    const res = await ctx.app.fetch(
      new Request(`${baseUrl}/v1/analytics/system?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
        headers: authBearerHeaders(adminToken),
      }),
      ctx.env,
      executionContext
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.records.length).toBeGreaterThanOrEqual(1);
    expect(body.records[0].eventType).toBe('ai.generate.success');
  });

  it('rejects non-admin access to system analytics', async () => {
    const { accessToken: sessionToken } = await createAuthenticatedUser(ctx.db);
    
    const res = await ctx.app.fetch(
      new Request(`${baseUrl}/v1/analytics/system`, {
        headers: authBearerHeaders(sessionToken),
      }),
      ctx.env,
      executionContext
    );

    expect(res.status).toBe(403);
  });
});
