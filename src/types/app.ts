import type { D1Database, R2Bucket, VectorizeIndex, Ai, KVNamespace } from '@cloudflare/workers-types';
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
  // Vectorize for semantic search
  VECTORIZE: VectorizeIndex;
  AI: Ai;
  ALLOWED_ORIGINS?: string;
  OPENAI_API_KEY: string;
  OPENAI_BASE_URL?: string;
  ADMIN_SECRET: string;
  JWT_SECRET: string;
  JWT_MAX_AGE?: string;
  DEFAULT_AI_MODEL?: string;
  MAX_REQUESTS_PER_DAY?: string;
  MAX_TOKENS_PER_DAY?: string;
  // Better Auth
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL?: string;
  RESEND_API_KEY?: string;
  PORTAL_URL?: string;
  // OpenRouter
  OPENROUTER_API_KEY?: string;
  VALIDATOR_URL?: string;
  VALIDATOR_API_KEY?: string;
  // RevenueCat
  REVENUECAT_PUBLIC_API_KEY?: string;
  REVENUECAT_SECRET_API_KEY?: string;
  REVENUECAT_WEBHOOK_SECRET?: string;
  // ElevenLabs
  ELEVENLABS_API_KEY?: string;
  // Rate Limiting
  RATE_LIMIT_KV?: KVNamespace;
  // AI Studio (Chinese LLM lesson generation)
  AI_STUDIO_DB?: D1Database;
  AI_STUDIO_BUCKET?: R2Bucket;
  CURRICULUM_INDEX?: VectorizeIndex;
  // OPENROUTER_API_KEY already exists for other AI features
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

