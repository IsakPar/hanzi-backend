import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import type { RuntimeConfig } from '../config/runtime';

export type AppUser = {
  id: string;
  role: 'admin' | 'user';
  email?: string;
  tier?: 'free' | 'premium' | 'pro';
  clerkId?: string;
};

export type AppBindings = {
  DB: D1Database;
  CONTENT_BUCKET: R2Bucket;
  ALLOWED_ORIGINS?: string;
  OPENAI_API_KEY: string;
  OPENAI_BASE_URL?: string;
  ADMIN_SECRET: string;
  JWT_SECRET: string;
  JWT_MAX_AGE?: string;
  DEFAULT_AI_MODEL?: string;
  MAX_REQUESTS_PER_DAY?: string;
  MAX_TOKENS_PER_DAY?: string;
  ALLOW_LEGACY_AUTH?: string;
  // Clerk Auth
  CLERK_PUBLISHABLE_KEY?: string;
  CLERK_SECRET_KEY?: string;
  CLERK_JWT_ISSUER?: string;
  CLERK_JWKS_URL?: string;
  // RevenueCat
  REVENUECAT_PUBLIC_API_KEY?: string;
  REVENUECAT_SECRET_API_KEY?: string;
  REVENUECAT_WEBHOOK_SECRET?: string;
};

export type AppVariables = {
  requestId: string;
  user?: AppUser;
  config: RuntimeConfig;
};

export type AppEnv = {
  Bindings: AppBindings;
  Variables: AppVariables;
};

