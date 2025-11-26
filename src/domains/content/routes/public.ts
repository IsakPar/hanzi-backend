import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../../../types/app';
import { createContentServices } from '..';

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

export const createPublicContentRouter = () => {
  const router = new Hono<AppEnv>();

  router.get('/library', zValidator('query', searchSchema), async (c) => {
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
        limit: filters.limit || 20,
        offset: filters.offset || 0,
        sortBy: filters.sort || 'newest',
      });

      return c.json({
        results,
        count: results.length,
        limit: filters.limit || 20,
        offset: filters.offset || 0,
      });
    } catch (err: any) {
      return c.json({ error: 'Search failed', message: err.message }, 500);
    }
  });

  router.get('/library/:id', async (c) => {
    const contentId = c.req.param('id');
    const { catalog, media } = createContentServices(c.env);

    try {
      const content = await catalog.getContent(contentId);
      const streamUrl = await media.getSignedUrl(contentId);
      return c.json({ ...content, streamUrl });
    } catch (err: any) {
      return c.json({ error: err.message }, 404);
    }
  });

  router.get('/stream/:id', async (c) => {
    const contentId = c.req.param('id');
    const { media } = createContentServices(c.env);

    try {
      const object = await media.streamContent(contentId);
      if (!object) {
        return c.json({ error: 'Content not found' }, 404);
      }
      return new Response(object.body as unknown as BodyInit, {
        headers: {
          'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
          'Content-Length': object.size.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (err: any) {
      return c.json({ error: 'Stream failed', message: err.message }, 500);
    }
  });

  router.get('/tags', async (c) => {
    const { catalog } = createContentServices(c.env);
    try {
      const tags = await catalog.getAllTags();
      return c.json({ tags });
    } catch (err: any) {
      return c.json({ error: 'Failed to fetch tags', message: err.message }, 500);
    }
  });

  return router;
};

