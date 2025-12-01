/**
 * Test Application Context
 * 
 * Provides a test context with:
 * - In-memory D1 database
 * - In-memory R2 bucket
 * - Better Auth configured for testing
 */

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
};

export const executionContext: ExecutionContext = {
  waitUntil() {},
  passThroughOnException() {},
};

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
    REVENUECAT_WEBHOOK_SECRET: 'test-webhook-secret',
    // JWT config - MUST match jwt-auth-helpers.ts DEFAULT_JWT_SECRET
    JWT_SECRET: 'test-jwt-secret-for-testing',
    JWT_MAX_AGE: '1h',
    // Better Auth configuration - also used as JWT fallback
    BETTER_AUTH_SECRET: 'test-jwt-secret-for-testing',
    BETTER_AUTH_URL: 'http://localhost',
  };

  return {
    app,
    env,
    db: harness.db,
    r2,
    dispose: harness.dispose,
  };
}

