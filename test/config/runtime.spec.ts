import { describe, expect, it } from 'vitest';
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { resolveRuntimeConfig } from '../../src/config/runtime';

const baseEnv = {
  ADMIN_SECRET: 'secret',
  OPENAI_API_KEY: 'openai',
  JWT_SECRET: 'jwt-secret',
  DB: {} as D1Database,
  CONTENT_BUCKET: {} as R2Bucket,
};

describe('resolveRuntimeConfig', () => {
  it('falls back to defaults when optional values missing', () => {
    const config = resolveRuntimeConfig(baseEnv);
    expect(config.allowedOrigins).toEqual([
      'http://localhost:5173',
      'http://localhost:3000',
    ]);
    expect(config.rateLimits.requestsPerDay).toBe(10);
    expect(config.rateLimits.tokensPerDay).toBe(5000);
  });

  it('parses comma-separated origins and numeric limits', () => {
    const config = resolveRuntimeConfig({
      ...baseEnv,
      ALLOWED_ORIGINS: 'https://app.example.com, https://admin.example.com',
      MAX_REQUESTS_PER_DAY: '25',
      MAX_TOKENS_PER_DAY: '7777',
    });

    expect(config.allowedOrigins).toEqual([
      'https://app.example.com',
      'https://admin.example.com',
    ]);
    expect(config.rateLimits.requestsPerDay).toBe(25);
    expect(config.rateLimits.tokensPerDay).toBe(7777);
  });

  it('throws on missing secrets', () => {
    expect(() =>
      resolveRuntimeConfig({
        ...baseEnv,
        ADMIN_SECRET: '',
      })
    ).toThrow(/ADMIN_SECRET/);
  });
});

