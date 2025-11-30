import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import lessonsRouter from './routes/lessons';
import adminRouter from './routes/admin';
import aiRouter from './routes/ai';
import aiAssistantRouter from './routes/ai-assistant';
import modelsRouter from './routes/models';
import contentRouter from './routes/content';
import promptsRouter from './routes/prompts';
import analyticsRouter, { publicAnalyticsRoutes } from './routes/analytics';
import billingRouter from './routes/billing';
import usersRouter from './routes/users';
import storiesRouter from './routes/stories';
import storySeriesRouter from './routes/story-series';
import storyCategoriesRouter from './routes/story-categories';
import vocabularyRouter from './routes/vocabulary';
import unitsRouter from './routes/units';
import waitlistRouter from './routes/waitlist';
import curriculumDerivedRouter from './routes/curriculum-derived';
import validatorRouter from './routes/validator';
import speechRouter from './routes/speech';
import lessonCacheRouter from './routes/lesson-cache';
import audioRouter from './routes/audio';
import authRouter from './routes/auth';
import tokenAuthRouter from './routes/token-auth';
import controlCenterRouter from './routes/control-center';
import announcementsRouter from './routes/announcements';
import lessonAlternativesRouter from './routes/lesson-alternatives';
import { aiTutorRouter } from './routes/ai-tutor';
import type { AppEnv } from './types/app';
import { requestContextMiddleware } from './middleware/request-context';
import { logWithContext } from './utils/logger';
import { handleCleanupCron } from './crons/cleanup-uploads';
import { handleEngagementAggregation } from './crons/engagement-aggregation';
import { handleBackupCron } from './crons/backup-critical-data';

const app = new Hono<AppEnv>();

// Request context (requestId, logging)
app.use('*', requestContextMiddleware);

// Hardcoded allowed origins - more reliable than env parsing
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'https://studio.polymasterlabs.com',
  'https://api.studio.polymasterlabs.com',
  'https://polymasterlabs.com',
  'https://www.polymasterlabs.com',
  'https://hanzimaster-studio.pages.dev',
  'https://hanzimaster-portal.pages.dev',
  'https://main.hanzimaster-portal.pages.dev',
  'https://main.hanzimaster-studio.pages.dev',
];

// CORS middleware - simplified for token-based auth (no cookies needed)
app.use('/*', cors({
  origin: (origin) => {
    // No origin = same-origin or non-browser request
    if (!origin) return '*';
    // Check if origin is allowed
    if (ALLOWED_ORIGINS.includes(origin)) return origin;
    // Also allow any *.pages.dev subdomain (Cloudflare preview deployments)
    if (origin.endsWith('.pages.dev')) return origin;
    // Reject unknown origins
    console.error('CORS Rejected:', origin);
    return null;
  },
  // No credentials: true needed - we use Authorization header, not cookies
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposeHeaders: ['X-Request-ID'],
  maxAge: 86400, // Cache preflight for 24 hours
}));

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
app.route('/v1/speech', speechRouter);
app.route('/v1/audio', audioRouter);
app.route('/v1/lesson-cache', lessonCacheRouter);
app.route('/v1/ai-assistant', aiAssistantRouter);
app.route('/v1/story-series', storySeriesRouter);
app.route('/v1/story-categories', storyCategoriesRouter);
// Token auth must come BEFORE Better Auth's catch-all
app.route('/v1/auth/token', tokenAuthRouter); // Token-based auth (JWT, no cookies)
app.route('/v1/auth', authRouter); // Better Auth routes (cookie-based, keeping for backwards compat)
app.route('/v1/control-center', controlCenterRouter); // Content staging system
app.route('/v1/announcements', announcementsRouter); // SDUI announcements
app.route('/v1/lesson-alternatives', lessonAlternativesRouter); // Alternatives & connected words
app.route('/v1/ai-tutor', aiTutorRouter); // AI Tutor lesson generation

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
