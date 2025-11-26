import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import lessonsRouter from './routes/lessons';
import adminRouter from './routes/admin';
import aiRouter from './routes/ai';
import modelsRouter from './routes/models';
import contentRouter from './routes/content';
import promptsRouter from './routes/prompts';
import analyticsRouter, { publicAnalyticsRoutes } from './routes/analytics';
import billingRouter from './routes/billing';
import usersRouter from './routes/users';
import storiesRouter from './routes/stories';
import vocabularyRouter from './routes/vocabulary';
import unitsRouter from './routes/units';
import waitlistRouter from './routes/waitlist';
import curriculumDerivedRouter from './routes/curriculum-derived';
import validatorRouter from './routes/validator';
import type { AppEnv } from './types/app';
import { requestContextMiddleware } from './middleware/request-context';
import { logWithContext } from './utils/logger';
import { handleCleanupCron } from './crons/cleanup-uploads';
import { handleEngagementAggregation } from './crons/engagement-aggregation';
import { handleBackupCron } from './crons/backup-critical-data';

const app = new Hono<AppEnv>();

// Request context (requestId, logging)
app.use('*', requestContextMiddleware);

// Global Middleware - CORS with strict whitelist (skip for webhooks)
// 
// Security Model:
// 1. Webhooks (/webhooks/*): No CORS checks (external services don't send Origin)
// 2. No Origin header: Allow (same-origin requests or server-to-server)
// 3. Unknown Origin: Reject with 403 (prevents CSRF/XSS attacks)
// 4. Allowed Origin: Accept with credentials
//
// To add origins: Update ALLOWED_ORIGINS env var (comma-separated list)
app.use('/*', async (c, next) => {
  const path = c.req.path;
  
  // Skip CORS for webhook endpoints (they don't send Origin headers)
  if (path.includes('/webhooks/')) {
    return next();
  }
  
  const config = c.get('config');
  const origin = c.req.header('Origin');
  const allowedOrigins = config.allowedOrigins;

  // Strict CORS: Reject requests with unknown origins
  if (!origin) {
    // No origin header - likely same-origin request or non-browser client (curl, Postman)
    // This is safe because browsers ALWAYS send Origin for cross-origin requests
    return next();
  }

  if (!allowedOrigins.includes(origin)) {
    throw new HTTPException(403, { message: 'Origin not allowed' });
  }

  return cors({
    origin: origin,
    credentials: true,
  })(c, next);
});

// Error Handler
app.onError((err, c) => {
  const requestId = c.get('requestId');
  if (err instanceof HTTPException) {
    return c.json({ message: err.message, requestId }, err.status);
  }
  logWithContext('error', 'Unhandled error', {
    requestId,
    meta: {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    },
  });
  return c.json({ message: 'Internal Server Error', requestId }, 500);
});

// Health Check
app.get('/', (c) => {
  return c.json({ 
    status: 'ok', 
    service: 'hanzimaster-backend-v2',
    version: '1.0.0' 
  });
});

// Routes
app.route('/v1/lessons', lessonsRouter);
app.route('/v1/admin', adminRouter);
app.route('/v1/ai', aiRouter);
app.route('/v1/models', modelsRouter);
app.route('/v1/content', contentRouter);
app.route('/v1/ai/prompts', promptsRouter);
app.route('/v1/analytics', analyticsRouter);
app.route('/v1/analytics', publicAnalyticsRoutes); // Public event ingestion (no auth)
app.route('/v1/billing', billingRouter);
app.route('/v1/users', usersRouter);
app.route('/v1/stories', storiesRouter);
app.route('/v1/vocabulary', vocabularyRouter);
app.route('/v1/units', unitsRouter);
app.route('/v1/waitlist', waitlistRouter);
app.route('/v1/curriculum', curriculumDerivedRouter);
app.route('/v1/validator', validatorRouter);

// Export default handler with cron support
export default {
  fetch: app.fetch,
  
  async scheduled(event: { cron: string }, env: any, ctx: { waitUntil: (promise: Promise<unknown>) => void }) {
    const cron = event.cron;
    
    // Engagement aggregation - every 10 minutes
    // Also handles cleanup of raw events older than 90 days
    if (cron === '*/10 * * * *') {
      ctx.waitUntil(
        handleEngagementAggregation(
          env.DB,
          (message, meta) => logWithContext('info', message, { meta })
        ).then((result) => {
          logWithContext('info', 'cron.engagement_aggregation_complete', { meta: result });
        }).catch((err) => {
          logWithContext('error', 'cron.engagement_aggregation_failed', { 
            meta: { error: err instanceof Error ? err.message : String(err) } 
          });
        })
      );
      return;
    }
    
    // Critical data backup - daily at 3 AM UTC
    if (cron === '0 3 * * *') {
      ctx.waitUntil(
        handleBackupCron(
          env.DB,
          env.CONTENT_BUCKET,
          (message, meta) => logWithContext('info', message, { meta })
        ).then((result) => {
          logWithContext('info', 'cron.backup_complete', { meta: result });
        }).catch((err) => {
          logWithContext('error', 'cron.backup_failed', { 
            meta: { error: err instanceof Error ? err.message : String(err) } 
          });
        })
      );
      return;
    }
    
    // Upload cleanup - every 6 hours (0 */6 * * *)
    ctx.waitUntil(
      handleCleanupCron(
        env.DB,
        env.CONTENT_BUCKET,
        (message, meta) => logWithContext('info', message, { meta })
      ).then((response: Response) => {
        return response.json().then((data) => {
          logWithContext('info', 'cron.cleanup_complete', { meta: data });
        });
      })
    );
  },
};
