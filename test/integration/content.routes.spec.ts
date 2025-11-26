import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';

const baseUrl = 'http://localhost/v1/content';

async function uploadDraftContent(ctx: TestContext, adminToken: string, metadataOverrides: Record<string, unknown> = {}) {
  const form = new FormData();
  const payload = new TextEncoder().encode('integration-content');
  form.set('file', new File([payload], 'lesson.pdf', { type: 'application/pdf' }));
  form.set(
    'metadata',
    JSON.stringify({
      title: 'Integration Content',
      contentType: 'text',
      hskLevel: 1,
      ...metadataOverrides,
    })
  );

  const res = await ctx.app.fetch(
    new Request(`${baseUrl}/admin/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      body: form,
    }),
    ctx.env,
    executionContext
  );

  expect(res.status).toBe(201);
  const body = await res.json();
  return body.content as { id: string };
}

async function publishContent(ctx: TestContext, adminToken: string, contentId: string) {
  const res = await ctx.app.fetch(
    new Request(`${baseUrl}/admin/library/${contentId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_published: true }),
    }),
    ctx.env,
    executionContext
  );
  expect(res.status).toBe(200);
}

describe.sequential('Content routes', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  it('allows admins to upload and publish content, exposing it publicly', async () => {
    const adminToken = await ctx.signAdminToken();
    const draft = await uploadDraftContent(ctx, adminToken);
    await publishContent(ctx, adminToken, draft.id);

    const publicRes = await ctx.app.fetch(new Request(`${baseUrl}/library`), ctx.env, executionContext);
    expect(publicRes.status).toBe(200);
    const publicBody = await publicRes.json();
    expect(publicBody.results.length).toBe(1);
    expect(publicBody.results[0].id).toBe(draft.id);

    const eventRows = await ctx.db
      .prepare('SELECT event_type FROM system_events WHERE event_type = ?')
      .bind('content.upload')
      .all();
    expect(eventRows.results?.length ?? 0).toBeGreaterThan(0);

    const r2Objects = await ctx.r2.list();
    expect(r2Objects.objects.length).toBeGreaterThan(0);
  });

  it('rejects empty uploads with a 400 status', async () => {
    const adminToken = await ctx.signAdminToken();
    const form = new FormData();
    form.set('file', new File([], 'empty.pdf', { type: 'application/pdf' }));
    form.set(
      'metadata',
      JSON.stringify({
        title: 'Invalid Upload',
        contentType: 'text',
        hskLevel: 1,
      })
    );

    const res = await ctx.app.fetch(
      new Request(`${baseUrl}/admin/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        body: form,
      }),
      ctx.env,
      executionContext
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Empty/);
  });

  it('allows authenticated users to toggle favorites and updates counts', async () => {
    const adminToken = await ctx.signAdminToken();
    const content = await uploadDraftContent(ctx, adminToken, { title: 'Favorite Ready' });
    await publishContent(ctx, adminToken, content.id);

    const userToken = await ctx.signUserToken();

    const res = await ctx.app.fetch(
      new Request(`${baseUrl}/favorite/${content.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      }),
      ctx.env,
      executionContext
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.is_favorite).toBe(true);

    const row = await ctx.db
      .prepare('SELECT favorite_count FROM content_library WHERE id = ?')
      .bind(content.id)
      .first<{ favorite_count: number }>();
    expect(row?.favorite_count).toBe(1);
  });

  it('records user progress updates via progress endpoint', async () => {
    const adminToken = await ctx.signAdminToken();
    const content = await uploadDraftContent(ctx, adminToken, { title: 'Progress Lesson' });
    await publishContent(ctx, adminToken, content.id);

    const userToken = await ctx.signUserToken();

    const res = await ctx.app.fetch(
      new Request(`${baseUrl}/progress/${content.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          progress_seconds: 45,
          progress_percentage: 20,
          status: 'in_progress',
          rating: 4,
        }),
      }),
      ctx.env,
      executionContext
    );

    expect(res.status).toBe(200);

    const progressRow = await ctx.db
      .prepare('SELECT progress_seconds, status FROM user_library WHERE user_id = ? AND content_id = ?')
      .bind('standard-user', content.id)
      .first<{ progress_seconds: number; status: string }>();

    expect(progressRow?.progress_seconds).toBe(45);
    expect(progressRow?.status).toBe('in_progress');
  });
});

