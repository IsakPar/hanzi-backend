import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../types/app';
import { resolveRuntimeConfig } from '../config/runtime';
import { logWithContext } from '../utils/logger';

export const requestContextMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const incomingId = c.req.header('X-Request-ID');
  const requestId = incomingId && incomingId.trim().length > 0 ? incomingId : crypto.randomUUID();
  c.set('requestId', requestId);

  const config = resolveRuntimeConfig(c.env);
  c.set('config', config);

  const startedAt = Date.now();
  try {
    await next();
  } finally {
    c.header('X-Request-ID', requestId);
    const durationMs = Date.now() - startedAt;
    logWithContext('info', 'request.completed', {
      requestId,
      meta: {
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs,
      },
    });
  }
};

