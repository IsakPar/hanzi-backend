import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';

const baseUrl = 'http://localhost/v1/ai/prompts';

describe.sequential('Prompt routes', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  it('allows admins to create and promote prompt templates', async () => {
    const adminToken = await ctx.signAdminToken();
    const createRes = await ctx.app.fetch(
      new Request(`${baseUrl}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug: 'integration_lesson',
          body: 'Return JSON with { "title": "Test", "blocks": [] }',
        }),
      }),
      ctx.env,
      executionContext
    );

    expect(createRes.status).toBe(201);

    const promoteRes = await ctx.app.fetch(
      new Request(`${baseUrl}/integration_lesson/promote`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 1,
          reason: 'Activate integration template',
        }),
      }),
      ctx.env,
      executionContext
    );

    expect(promoteRes.status).toBe(200);

    const versionsRes = await ctx.app.fetch(
      new Request(`${baseUrl}/integration_lesson/versions`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }),
      ctx.env,
      executionContext
    );

    expect(versionsRes.status).toBe(200);
    const payload = await versionsRes.json();
    const active = payload.versions.find((t: any) => t.status === 'active');
    expect(active).toBeTruthy();
    expect(active.version).toBe(1);
  });

  it('rejects non-admin users for prompt mutations', async () => {
    const userToken = await ctx.signUserToken();
    const res = await ctx.app.fetch(
      new Request(`${baseUrl}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug: 'user_attempt',
          body: 'Should fail',
        }),
      }),
      ctx.env,
      executionContext
    );

    expect(res.status).toBe(403);
  });

  it('records analytics events on draft creation', async () => {
    const adminToken = await ctx.signAdminToken();
    const slug = 'analytics_check';

    const res = await ctx.app.fetch(
      new Request(`${baseUrl}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug,
          body: '{"foo":"bar"}',
        }),
      }),
      ctx.env,
      executionContext
    );

    expect(res.status).toBe(201);

    const eventRows = await ctx.db
      .prepare('SELECT event_type, metadata FROM system_events WHERE event_type = ?')
      .bind('prompt.create')
      .all();

    expect(eventRows.results?.length).toBeGreaterThan(0);
    const metadata = JSON.parse(eventRows.results?.[0].metadata as string);
    expect(metadata.slug).toBe(slug);
    expect(metadata.version).toBe(1);
  });
});

