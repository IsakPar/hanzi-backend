import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import type { ExecutionContext } from 'hono';
import { SignJWT } from 'jose';
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { requestContextMiddleware } from '../../src/middleware/request-context';
import { authMiddleware } from '../../src/middleware/auth';
import type { AppBindings, AppEnv } from '../../src/types/app';

const baseEnv: AppBindings = {
  DB: {} as D1Database,
  CONTENT_BUCKET: {} as R2Bucket,
  ADMIN_SECRET: 'admin-secret',
  OPENAI_API_KEY: 'test-openai-key',
  OPENAI_BASE_URL: undefined,
  ALLOWED_ORIGINS: 'http://localhost:5173',
  DEFAULT_AI_MODEL: 'gpt-4o-mini',
  MAX_REQUESTS_PER_DAY: '10',
  MAX_TOKENS_PER_DAY: '5000',
  JWT_SECRET: 'test-jwt-secret',
  JWT_MAX_AGE: '1h',
  ALLOW_LEGACY_AUTH: 'true', // Enable legacy auth for tests
};

const createToken = async (overrides?: { role?: 'admin' | 'user'; exp?: string }) => {
  const payload = {
    role: overrides?.role ?? 'admin',
    email: 'user@example.com',
  };

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('user-123')
    .setIssuedAt()
    .setExpirationTime(overrides?.exp ?? '1h')
    .sign(new TextEncoder().encode(baseEnv.JWT_SECRET));
};

const createApp = () => {
  const app = new Hono<AppEnv>();
  app.use('*', requestContextMiddleware);
  app.use('*', authMiddleware({ allowRoles: ['admin'] }));
  app.get('/secure', (c) => c.json({ ok: true }));
  return app;
};

const dummyCtx: ExecutionContext = {
  waitUntil() {},
  passThroughOnException() {},
};

describe('authMiddleware', () => {
  it('allows valid admin tokens', async () => {
    const app = createApp();
    const token = await createToken();
    const req = new Request('http://localhost/secure', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const res = await app.fetch(req, baseEnv, dummyCtx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it('rejects tokens with insufficient role', async () => {
    const app = createApp();
    const token = await createToken({ role: 'user' });
    const req = new Request('http://localhost/secure', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const res = await app.fetch(req, baseEnv, dummyCtx);
    expect(res.status).toBe(403);
  });

  it('rejects expired tokens', async () => {
    const app = createApp();
    const token = await createToken({ exp: '0s' });
    const req = new Request('http://localhost/secure', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const res = await app.fetch(req, baseEnv, dummyCtx);
    expect(res.status).toBe(401);
  });

  it('rejects missing Authorization header', async () => {
    const app = createApp();
    const req = new Request('http://localhost/secure');

    const res = await app.fetch(req, baseEnv, dummyCtx);
    expect(res.status).toBe(401);
  });
});

