import { SignJWT } from 'jose';
import type { ExecutionContext } from 'hono';
import type { AppBindings } from '../../src/types/app';
import app from '../../src/index';
import { createMigratedD1 } from '../utils/d1';
import { InMemoryR2Bucket } from './r2';
import type { D1Database } from '@cloudflare/workers-types';

export type TestContext = {
  app: typeof app;
  env: AppBindings;
  db: D1Database;
  r2: InMemoryR2Bucket;
  dispose: () => Promise<void>;
  signAdminToken: () => Promise<string>;
  signUserToken: () => Promise<string>;
};

const textEncoder = new TextEncoder();

export const executionContext: ExecutionContext = {
  waitUntil() {},
  passThroughOnException() {},
};

async function ensureUser(db: D1Database, id: string, role: 'admin' | 'user', email: string) {
  // Use INSERT OR IGNORE to handle potential conflicts in sequential tests
  await db
    .prepare(
      `INSERT OR IGNORE INTO users (id, email, role, name)
       VALUES (?, ?, ?, ?)`
    )
    .bind(id, email, role, role === 'admin' ? 'Admin' : 'User')
    .run();
}

export async function createTestContext(): Promise<TestContext> {
  const harness = await createMigratedD1();
  const r2 = new InMemoryR2Bucket();

  const env: AppBindings = {
    DB: harness.db,
    CONTENT_BUCKET: r2,
    OPENAI_API_KEY: 'sk-test',
    OPENAI_BASE_URL: 'https://api.test',
    ADMIN_SECRET: 'admin-secret',
    ALLOWED_ORIGINS: 'http://localhost',
    DEFAULT_AI_MODEL: 'gpt-integration',
    MAX_REQUESTS_PER_DAY: '5',
    MAX_TOKENS_PER_DAY: '1000',
    JWT_SECRET: 'jwt-secret',
    JWT_MAX_AGE: '1h',
    REVENUECAT_WEBHOOK_SECRET: 'test-webhook-secret',
    ALLOW_LEGACY_AUTH: 'true', // Allow legacy auth for tests
  };

  const adminUserId = 'admin-user';
  const standardUserId = 'standard-user';
  await ensureUser(harness.db, adminUserId, 'admin', 'admin@example.com');
  await ensureUser(harness.db, standardUserId, 'user', 'user@example.com');

  const signToken = async (sub: string, role: 'admin' | 'user') =>
    new SignJWT({ role, email: `${role}@example.com` })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(sub)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(textEncoder.encode(env.JWT_SECRET));

  return {
    app,
    env,
    db: harness.db,
    r2,
    dispose: harness.dispose,
    signAdminToken: () => signToken(adminUserId, 'admin'),
    signUserToken: () => signToken(standardUserId, 'user'),
  };
}

