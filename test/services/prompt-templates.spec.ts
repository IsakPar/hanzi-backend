import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { PromptTemplateService } from '../../src/domains/prompts/services/prompt-template.service';
import { createD1Harness } from '../utils/d1';
import { PROMPT_TEMPLATES_SCHEMA } from '../utils/schema';

describe('PromptTemplateService', () => {
  let harness: Awaited<ReturnType<typeof createD1Harness>>;
  let service: PromptTemplateService;

  beforeEach(async () => {
    harness = await createD1Harness(PROMPT_TEMPLATES_SCHEMA);
    service = new PromptTemplateService(harness.db);
  });

  afterEach(async () => {
    await harness.dispose();
  });

  it('creates sequential draft versions', async () => {
    const first = await service.createDraft({
      slug: 'lesson_default',
      body: '{"foo":"bar"}',
      createdBy: 'user-1',
    });
    const second = await service.createDraft({
      slug: 'lesson_default',
      body: '{"foo":"baz"}',
    });

    expect(first.version).toBe(1);
    expect(second.version).toBe(2);

    const versions = await service.listTemplates('lesson_default');
    expect(versions).toHaveLength(2);
    expect(versions.map((v) => v.status)).toEqual(['draft', 'draft']);
  });

  it('promotes a version and archives previous active', async () => {
    await service.createDraft({ slug: 'lesson_default', body: 'v1' });
    await service.promoteVersion({ slug: 'lesson_default', version: 1, changedBy: 'admin' });

    await service.createDraft({ slug: 'lesson_default', body: 'v2' });
    await service.promoteVersion({ slug: 'lesson_default', version: 2, changedBy: 'admin' });

    const versions = await service.listTemplates('lesson_default');
    const active = versions.find((v) => v.status === 'active');
    const archived = versions.find((v) => v.version === 1);

    expect(active?.version).toBe(2);
    expect(archived?.status).toBe('archived');
  });

  it('rolls back to the previous active version', async () => {
    await service.createDraft({ slug: 'lesson_default', body: 'v1' });
    await service.promoteVersion({ slug: 'lesson_default', version: 1 });

    await service.createDraft({ slug: 'lesson_default', body: 'v2' });
    await service.promoteVersion({ slug: 'lesson_default', version: 2 });

    await service.rollback('lesson_default', 'admin', 'bad output');

    const versions = await service.listTemplates('lesson_default');
    const active = versions.find((v) => v.status === 'active');
    expect(active?.version).toBe(1);
  });
});

