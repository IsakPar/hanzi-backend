/**
 * Content Routes Integration Tests
 * 
 * Tests content upload, publishing, favorites, and progress tracking.
 * Uses Better Auth for authentication.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';
import {
  createAuthenticatedAdmin,
  createAuthenticatedUser,
  authBearerHeaders,
} from '../fixtures/jwt-auth-helpers';

const baseUrl = 'http://localhost/v1/content';

async function uploadDraftContent(
  ctx: TestContext,
  sessionToken: string,
  metadataOverrides: Record<string, unknown> = {}
) {
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
      headers: authBearerHeaders(sessionToken),
      body: form,
    }),
    ctx.env,
    executionContext
  );

  expect(res.status).toBe(201);
  const body = await res.json();
  return body.content as { id: string };
}

async function publishContent(ctx: TestContext, sessionToken: string, contentId: string) {
  const res = await ctx.app.fetch(
    new Request(`${baseUrl}/admin/library/${contentId}`, {
      method: 'PUT',
      headers: {
        ...authBearerHeaders(sessionToken),
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
    const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
    const draft = await uploadDraftContent(ctx, sessionToken);
    await publishContent(ctx, sessionToken, draft.id);

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
    const { accessToken: sessionToken } = await createAuthenticatedAdmin(ctx.db);
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
        headers: authBearerHeaders(sessionToken),
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
    const admin = await createAuthenticatedAdmin(ctx.db);
    const content = await uploadDraftContent(ctx, admin.accessToken, { title: 'Favorite Ready' });
    await publishContent(ctx, admin.accessToken, content.id);

    const { accessToken: userToken, user } = await createAuthenticatedUser(ctx.db);

    const res = await ctx.app.fetch(
      new Request(`${baseUrl}/favorite/${content.id}`, {
        method: 'POST',
        headers: authBearerHeaders(userToken),
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
    const admin = await createAuthenticatedAdmin(ctx.db);
    const content = await uploadDraftContent(ctx, admin.accessToken, { title: 'Progress Lesson' });
    await publishContent(ctx, admin.accessToken, content.id);

    const { accessToken: userToken, user } = await createAuthenticatedUser(ctx.db);

    const res = await ctx.app.fetch(
      new Request(`${baseUrl}/progress/${content.id}`, {
        method: 'POST',
        headers: {
          ...authBearerHeaders(userToken),
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
      .bind(user.id, content.id)
      .first<{ progress_seconds: number; status: string }>();

    expect(progressRow?.progress_seconds).toBe(45);
    expect(progressRow?.status).toBe('in_progress');
  });
});
