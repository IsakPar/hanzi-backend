import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestContext, executionContext, type TestContext } from '../helpers/test-app';

const mockedChatCreate = vi.fn(async () => ({
  choices: [
    {
      message: {
        content: JSON.stringify({
          title: 'Integration Lesson',
          blocks: [
            {
              type: 'hero',
              content: { headline: 'Hello world' },
            },
          ],
        }),
      },
    },
  ],
  usage: {
    prompt_tokens: 15,
    completion_tokens: 25,
    total_tokens: 40,
  },
}));

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockedChatCreate,
        },
      };
    },
  };
});

const baseUrl = 'http://localhost';

const promptsBase = 'http://localhost/v1/ai/prompts';

async function seedActivePrompt(ctx: TestContext) {
  const adminToken = await ctx.signAdminToken();
  const body = JSON.stringify({
    slug: 'lesson_default',
    body: [
      'You are a helpful AI.',
      'Allowed vocab: {{ALLOWED_VOCAB}}',
      'Targets: {{TARGET_WORDS}}',
      'Return valid JSON with title and blocks.',
    ].join('\n'),
  });
  await ctx.app.fetch(
    new Request(`${promptsBase}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body,
    }),
    ctx.env,
    executionContext
  );

  await ctx.app.fetch(
    new Request(`${promptsBase}/lesson_default/promote`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ version: 1, reason: 'Activate default prompt' }),
    }),
    ctx.env,
    executionContext
  );
}

async function seedActiveModel(ctx: TestContext) {
  await ctx.db
    .prepare(
      `INSERT INTO ai_models (id, name, provider, cost_per_1k_input, cost_per_1k_output, tier, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`
    )
    .bind('gpt-integration', 'Integration Model', 'openai', 0.001, 0.002, 'nano')
    .run();
}

describe.sequential('AI routes', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
    mockedChatCreate.mockClear();
    await seedActivePrompt(ctx);
    await seedActiveModel(ctx);
  });

  afterEach(async () => {
    await ctx?.dispose();
  });

  it('generates a lesson and records usage', async () => {
    const adminToken = await ctx.signAdminToken();
    const res = await ctx.app.fetch(
      new Request(`${baseUrl}/v1/ai/generate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_seq: 1,
          order: {
            targets: [],
          },
          sync_updates: [],
          prompt: {
            slug: 'lesson_default',
          },
        }),
      }),
      ctx.env,
      executionContext
    );

    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.title).toBe('Integration Lesson');
    expect(payload.blocks).toHaveLength(1);
    expect(mockedChatCreate).toHaveBeenCalledTimes(1);

    const usage = await ctx.db.prepare('SELECT * FROM api_usage').all();
    expect(usage.results.length).toBe(1);
    expect(usage.results[0].prompt_slug).toBe('lesson_default');
    expect(usage.results[0].total_tokens).toBe(40);
  });
});

