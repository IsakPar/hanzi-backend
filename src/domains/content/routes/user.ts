import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../../../middleware/auth';
import { createContentServices } from '..';
import type { AppEnv } from '../../../types/app';
import { AnalyticsService } from '../../../services/analytics';

const progressSchema = z.object({
  progress_seconds: z.number().optional(),
  progress_page: z.number().optional(),
  progress_percentage: z.number().min(0).max(100).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed']).optional(),
  rating: z.number().min(1).max(5).optional(),
});

export const createUserContentRouter = () => {
  const router = new Hono<AppEnv>();

  router.use('/progress/*', authMiddleware({ allowRoles: ['user', 'admin'] }));
  router.use('/favorite/*', authMiddleware({ allowRoles: ['user', 'admin'] }));

  router.post('/progress/:id', zValidator('json', progressSchema), async (c) => {
    const contentId = c.req.param('id');
    const data = c.req.valid('json');
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { userLibrary } = createContentServices(c.env);
    try {
      await userLibrary.updateUserProgress({
        userId: user.id,
        contentId,
        progressSeconds: data.progress_seconds,
        progressPage: data.progress_page,
        progressPercentage: data.progress_percentage,
        status: data.status,
        userRating: data.rating,
      });
      return c.json({ success: true });
    } catch (err: any) {
      return c.json({ error: 'Failed to update progress', message: err.message }, 500);
    }
  });

  router.post('/favorite/:id', async (c) => {
    const contentId = c.req.param('id');
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { userLibrary } = createContentServices(c.env);
    const analytics = new AnalyticsService(c.env.DB);
    try {
      const isFavorite = await userLibrary.toggleFavorite(user.id, contentId);
      await analytics.record({
        type: 'content.favorite.toggle',
        requestId: c.get('requestId'),
        userId: user.id,
        metadata: { contentId, isFavorite },
      });
      return c.json({ success: true, is_favorite: isFavorite });
    } catch (err: any) {
      return c.json({ error: 'Failed to toggle favorite', message: err.message }, 500);
    }
  });

  return router;
};

