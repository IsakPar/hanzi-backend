import { z } from 'zod';
import type { AppBindings } from '../types/app';

const envSchema = z.object({
  ADMIN_SECRET: z.string().min(1, 'ADMIN_SECRET is required'),
  OPENAI_API_KEY: z.string().optional(), // Legacy - prefer OPENROUTER_API_KEY
  OPENROUTER_API_KEY: z.string().optional(),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_MAX_AGE: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  MAX_REQUESTS_PER_DAY: z.coerce.number().int().positive().optional(),
  MAX_TOKENS_PER_DAY: z.coerce.number().int().positive().optional(),
  DEFAULT_AI_MODEL: z.string().optional(),
  ALLOW_LEGACY_AUTH: z.enum(['true', 'false']).optional().default('false'),
  // Clerk (optional for now, will be required later)
  CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_JWT_ISSUER: z.string().url().optional(),
  CLERK_JWKS_URL: z.string().url().optional(),
  // RevenueCat (optional for now)
  REVENUECAT_PUBLIC_API_KEY: z.string().optional(),
  REVENUECAT_SECRET_API_KEY: z.string().optional(),
  REVENUECAT_WEBHOOK_SECRET: z.string().optional(),
});

export type RuntimeConfig = {
  secrets: {
    adminSecret: string;
    openAIApiKey?: string;
    openRouterApiKey?: string;
    jwtSecret: string;
    clerkPublishableKey?: string;
    clerkSecretKey?: string;
    clerkJwtIssuer?: string;
    clerkJwksUrl?: string;
    revenuecatPublicApiKey?: string;
    revenuecatSecretApiKey?: string;
    revenuecatWebhookSecret?: string;
  };
  jwt: {
    maxAge: string;
  };
  auth: {
    allowLegacy: boolean;
  };
  openaiBaseUrl?: string;
  defaultModel?: string;
  allowedOrigins: string[];
  rateLimits: {
    requestsPerDay: number;
    tokensPerDay: number;
  };
};

const DEFAULT_ORIGINS = ['http://localhost:5173', 'http://localhost:3000'];
const DEFAULT_REQUEST_LIMIT = 10;
const DEFAULT_TOKEN_LIMIT = 5000;
const DEFAULT_JWT_MAX_AGE = '7d';

export const resolveRuntimeConfig = (bindings: AppBindings): RuntimeConfig => {
  const parsed = envSchema.parse(bindings);

  const allowedOriginsRaw = parsed.ALLOWED_ORIGINS;
  const allowedOrigins = allowedOriginsRaw
    ? allowedOriginsRaw.split(',').map((origin) => origin.trim()).filter(Boolean)
    : DEFAULT_ORIGINS;

  return {
    secrets: {
      adminSecret: parsed.ADMIN_SECRET,
      openAIApiKey: parsed.OPENAI_API_KEY,
      openRouterApiKey: parsed.OPENROUTER_API_KEY,
      jwtSecret: parsed.JWT_SECRET,
      clerkPublishableKey: parsed.CLERK_PUBLISHABLE_KEY,
      clerkSecretKey: parsed.CLERK_SECRET_KEY,
      clerkJwtIssuer: parsed.CLERK_JWT_ISSUER,
      clerkJwksUrl: parsed.CLERK_JWKS_URL,
      revenuecatPublicApiKey: parsed.REVENUECAT_PUBLIC_API_KEY,
      revenuecatSecretApiKey: parsed.REVENUECAT_SECRET_API_KEY,
      revenuecatWebhookSecret: parsed.REVENUECAT_WEBHOOK_SECRET,
    },
    jwt: {
      maxAge: parsed.JWT_MAX_AGE || DEFAULT_JWT_MAX_AGE,
    },
    auth: {
      allowLegacy: parsed.ALLOW_LEGACY_AUTH === 'true',
    },
    openaiBaseUrl: parsed.OPENAI_BASE_URL,
    defaultModel: parsed.DEFAULT_AI_MODEL,
    allowedOrigins,
    rateLimits: {
      requestsPerDay: parsed.MAX_REQUESTS_PER_DAY ?? DEFAULT_REQUEST_LIMIT,
      tokensPerDay: parsed.MAX_TOKENS_PER_DAY ?? DEFAULT_TOKEN_LIMIT,
    },
  };
};

