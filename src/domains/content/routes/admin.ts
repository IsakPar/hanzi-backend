import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../../../middleware/auth';
import type { AppEnv } from '../../../types/app';
import { createContentServices } from '..';
import type { UploadContentParams } from '../types';
import { AnalyticsService } from '../../../services/analytics';

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_SAMPLE_UPLOAD_BYTES = 50 * 1024 * 1024;

const ALLOWED_UPLOAD_MIME = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/x-m4a',
  'application/pdf',
  'application/epub+zip',
  'video/mp4',
]);
const ALLOWED_IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const ALLOWED_SAMPLE_MIME = new Set(['audio/mpeg', 'audio/mp3', 'audio/x-m4a', 'audio/wav']);

const metadataSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  author: z.string().optional(),
  narrator: z.string().optional(),
  description: z.string().optional(),
  contentType: z.enum(['audiobook', 'text', 'video']),
  hskLevel: z.number().min(1).max(6).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  targetAudience: z.enum(['kids', 'teens', 'adults']).optional(),
  category: z.string().optional(),
  genre: z.string().optional(),
  seriesName: z.string().optional(),
  seriesOrder: z.number().optional(),
  duration: z.number().min(0).optional(),
  pageCount: z.number().min(0).optional(),
  language: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const updateSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  author: z.string().optional(),
  narrator: z.string().optional(),
  description: z.string().optional(),
  hsk_level: z.number().min(1).max(6).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  category: z.string().optional(),
  genre: z.string().optional(),
  is_published: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  is_free: z.boolean().optional(),
  requires_premium: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

const createTagSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['topic', 'grammar', 'skill', 'genre']).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: z.string().optional(),
});

const searchSchema = z.object({
  type: z.enum(['audiobook', 'text', 'video']).optional(),
  hsk_level: z.coerce.number().min(1).max(6).optional(),
  category: z.string().optional(),
  genre: z.string().optional(),
  difficulty: z.string().optional(),
  tags: z.string().optional(),
  query: z.string().optional(),
  featured: z.coerce.boolean().optional(),
  free: z.coerce.boolean().optional(),
  limit: z.coerce.number().max(100).optional(),
  offset: z.coerce.number().optional(),
  sort: z.enum(['newest', 'popular', 'rating', 'title']).optional(),
});

const recordContentEvent = async (
  c: Context<AppEnv>,
  type: string,
  metadata?: Record<string, unknown>
) => {
  const analytics = new AnalyticsService(c.env.DB);
  await analytics.record({
    type,
    requestId: c.get('requestId'),
    userId: c.get('user')?.id,
    metadata,
  });
};

export const createAdminContentRouter = () => {
  const router = new Hono<AppEnv>();

  router.use('/admin/*', authMiddleware({ allowRoles: ['admin'] }));

  router.post('/admin/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const metadataStr = formData.get('metadata') as string | null;

    if (!file) return c.json({ error: 'No file provided' }, 400);
    if (!metadataStr) return c.json({ error: 'No metadata provided' }, 400);

const metadata = metadataSchema.parse(JSON.parse(metadataStr)) as UploadContentParams['metadata'];
    const fileSize = file.size ?? 0;
    if (fileSize <= 0) return c.json({ error: 'Empty files are not allowed' }, 400);
    if (fileSize > MAX_UPLOAD_BYTES) {
      return c.json({ error: `File too large (max ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB)` }, 400);
    }

    const fileType = file.type || 'application/octet-stream';
    if (!ALLOWED_UPLOAD_MIME.has(fileType)) {
      return c.json({ error: `Unsupported file type: ${fileType}` }, 400);
    }

    const fileBuffer = await file.arrayBuffer();
    const { media } = createContentServices(c.env);

    const result = await media.uploadContent({
      file: fileBuffer,
      fileName: file.name,
      fileType,
      fileSize,
      metadata,
    });

    await recordContentEvent(c, 'content.upload', {
      contentId: result.id,
      fileSize,
      contentType: metadata.contentType,
    });

    return c.json({ success: true, content: result }, 201);
  } catch (err: any) {
    return c.json({ error: 'Upload failed', message: err.message }, 500);
  }
  });

  router.post('/admin/upload-cover/:id', async (c) => {
  const contentId = c.req.param('id');
  try {
    const formData = await c.req.formData();
    const cover = formData.get('cover') as File | null;
    if (!cover) return c.json({ error: 'No cover image provided' }, 400);

    if (cover.size <= 0) return c.json({ error: 'Empty cover file provided' }, 400);
    if (cover.size > MAX_IMAGE_UPLOAD_BYTES) {
      return c.json({ error: `Cover image too large (max ${MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)} MB)` }, 400);
    }

    const coverType = cover.type || 'application/octet-stream';
    if (!ALLOWED_IMAGE_MIME.has(coverType)) {
      return c.json({ error: `Unsupported cover image type: ${coverType}` }, 400);
    }

    const coverBuffer = await cover.arrayBuffer();
    const { media } = createContentServices(c.env);
    const r2Key = await media.uploadCoverImage(contentId, coverBuffer, cover.name, coverType);

    await recordContentEvent(c, 'content.cover.upload', { contentId, key: r2Key });
    return c.json({ success: true, cover_r2_key: r2Key });
  } catch (err: any) {
    return c.json({ error: 'Cover upload failed', message: err.message }, 500);
  }
  });

  router.post('/admin/upload-sample/:id', async (c) => {
  const contentId = c.req.param('id');
  try {
    const formData = await c.req.formData();
    const sample = formData.get('sample') as File | null;
    if (!sample) return c.json({ error: 'No sample provided' }, 400);
    if (sample.size <= 0) return c.json({ error: 'Empty sample file provided' }, 400);
    if (sample.size > MAX_SAMPLE_UPLOAD_BYTES) {
      return c.json({ error: `Sample file too large (max ${MAX_SAMPLE_UPLOAD_BYTES / (1024 * 1024)} MB)` }, 400);
    }

    const sampleType = sample.type || 'application/octet-stream';
    if (!ALLOWED_SAMPLE_MIME.has(sampleType)) {
      return c.json({ error: `Unsupported sample file type: ${sampleType}` }, 400);
    }

    const sampleBuffer = await sample.arrayBuffer();
    const { media } = createContentServices(c.env);
    const r2Key = await media.uploadSample(contentId, sampleBuffer, sample.name, sampleType);

    await recordContentEvent(c, 'content.sample.upload', { contentId, key: r2Key });
    return c.json({ success: true, sample_r2_key: r2Key });
  } catch (err: any) {
    return c.json({ error: 'Sample upload failed', message: err.message }, 500);
  }
  });

  router.put('/admin/library/:id', zValidator('json', updateSchema), async (c) => {
  const contentId = c.req.param('id');
  const updates = c.req.valid('json');
  const { catalog } = createContentServices(c.env);

  try {
    await catalog.updateContent(contentId, {
      title: updates.title,
      subtitle: updates.subtitle,
      author: updates.author,
      narrator: updates.narrator,
      description: updates.description,
      hskLevel: updates.hsk_level,
      difficulty: updates.difficulty,
      category: updates.category,
      genre: updates.genre,
      isPublished: updates.is_published,
      isFeatured: updates.is_featured,
      isFree: updates.is_free,
      requiresPremium: updates.requires_premium,
      tags: updates.tags,
    });

    await recordContentEvent(c, 'content.update', {
      contentId,
      fields: Object.keys(updates),
    });
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: 'Update failed', message: err.message }, 500);
  }
  });

  router.delete('/admin/library/:id', async (c) => {
  const contentId = c.req.param('id');
  const { media } = createContentServices(c.env);

  try {
    await media.deleteContent(contentId);
    await recordContentEvent(c, 'content.delete', { contentId });
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: 'Delete failed', message: err.message }, 500);
  }
  });

  router.post('/admin/tags', zValidator('json', createTagSchema), async (c) => {
  const data = c.req.valid('json');
  const { catalog } = createContentServices(c.env);

  try {
    const result = await catalog.createTag(data);
    await recordContentEvent(c, 'content.tag.create', { tagId: result.id, name: data.name });
    return c.json({ success: true, tag: result }, 201);
  } catch (err: any) {
    return c.json({ error: 'Failed to create tag', message: err.message }, 500);
  }
  });

  router.get('/admin/library', zValidator('query', searchSchema), async (c) => {
  const filters = c.req.valid('query');
  const { catalog } = createContentServices(c.env);

  try {
    const results = await catalog.searchContent({
      contentType: filters.type,
      hskLevel: filters.hsk_level,
      category: filters.category,
      genre: filters.genre,
      difficulty: filters.difficulty,
      tags: filters.tags?.split(',').filter(Boolean),
      query: filters.query,
      isFeatured: filters.featured,
      isFree: filters.free,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
      sortBy: filters.sort || 'newest',
      includeUnpublished: true,
    });

    return c.json({
      results,
      count: results.length,
    });
  } catch (err: any) {
    return c.json({ error: 'Search failed', message: err.message }, 500);
  }
  });

  return router;
};

