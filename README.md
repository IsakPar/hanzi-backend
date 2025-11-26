# Hanzimaster Backend V2

Production-ready backend for Hanzimaster Chinese learning platform.

> **Version 2.0** – Production-grade architecture with DDD structure, comprehensive testing, and enterprise-level security.

Built with **Hono** on **Cloudflare Workers** with **D1** database and **R2** storage.

## Features

- 📚 Lesson management (CRUD)
- 🤖 AI lesson generation with OpenAI
- 🚦 Rate limiting
- 💾 D1 database with Drizzle ORM
- 📦 R2 content storage (audiobooks, texts, videos)
- 🏷️ Tag system
- 📊 User progress tracking
- 🔐 Authentication middleware

## Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Secrets (Local Development)
Copy `.dev.vars` and add your credentials:
```bash
# Edit .dev.vars with your Clerk, RevenueCat, and OpenAI keys
# See SECRETS_SETUP.md for detailed instructions
```

### 3. Development
```bash
pnpm dev
```

### 4. Deploy
See [DEPLOY.md](./DEPLOY.md) for production deployment.  
See [SECRETS_SETUP.md](./SECRETS_SETUP.md) for secrets configuration.

## Project Structure

```
src/
├── index.ts              # Main Hono app
├── schema.ts             # Drizzle schemas
├── middleware/
│   └── auth.ts           # Authentication
├── services/
│   ├── ai.ts             # AI lesson generation
│   ├── content.ts        # R2 content management
│   ├── model-manager.ts  # AI model configuration
│   └── rate-limit.ts     # Rate limiting
└── routes/
    ├── lessons.ts        # Public lessons
    ├── admin.ts          # Admin management
    ├── ai.ts             # AI generation
    ├── models.ts         # Model management
    └── content.ts        # Content library
```

## API Endpoints

### Public
- `GET /` - Health check
- `GET /v1/lessons` - List published lessons
- `GET /v1/lessons/:id` - Get lesson details
- `GET /v1/content/library` - Browse content
- `GET /v1/content/tags` - List tags

### Authenticated
- `POST /v1/admin/lessons` - Create lesson
- `POST /v1/ai/generate` - Generate AI lesson
- `GET /v1/models/models` - List AI models
- `POST /v1/content/admin/upload` - Upload content

## Environment Variables

The Worker validates required variables at startup. Configure the following Cloudflare secrets/vars:

### Required Secrets (via `npx wrangler secret put`)

| Key | Description |
| --- | --- |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key (pk_test_* or pk_live_*) |
| `CLERK_SECRET_KEY` | Clerk secret key (sk_test_* or sk_live_*) |
| `CLERK_JWT_ISSUER` | Clerk JWT issuer URL (e.g., https://your-app.clerk.accounts.dev) |
| `CLERK_JWKS_URL` | Clerk JWKS endpoint for JWT verification |
| `REVENUECAT_PUBLIC_API_KEY` | RevenueCat public API key (appl_*) |
| `REVENUECAT_SECRET_API_KEY` | RevenueCat secret API key (sk_*) |
| `REVENUECAT_WEBHOOK_SECRET` | RevenueCat webhook authorization secret |
| `OPENAI_API_KEY` | OpenAI API key for lesson generation |
| `ADMIN_SECRET` | Legacy admin secret (for internal workflows) |
| `JWT_SECRET` | HS256 signing key for internal JWT issuance |

### Optional Secrets

| Key | Default | Description |
| --- | --- | --- |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Custom OpenAI-compatible endpoint |

### Non-Secret Variables (in `wrangler.jsonc`)

| Key | Default | Description |
| --- | --- | --- |
| `JWT_MAX_AGE` | `7d` | How long JWTs remain valid |
| `ALLOWED_ORIGINS` | localhost ports | Comma-separated CORS origins |
| `MAX_REQUESTS_PER_DAY` | `10` | Fallback daily request quota |
| `MAX_TOKENS_PER_DAY` | `5000` | Fallback daily token quota |
| `DEFAULT_AI_MODEL` | `gpt-5-nano` | Model ID if no active DB model exists |

**📖 See [SECRETS_SETUP.md](./SECRETS_SETUP.md) for step-by-step setup instructions.**

Missing/invalid values will fail fast with a descriptive error, so misconfigurations are caught before traffic hits production.

## Authentication

The backend uses **Clerk** for authentication. Mobile apps and web clients authenticate with Clerk, then send the JWT to this API.

### JWT Validation

- All protected endpoints expect `Authorization: Bearer <clerk_jwt>` header
- JWTs are validated against Clerk's JWKS endpoint (configured via `CLERK_JWKS_URL`)
- The payload must include `sub` (Clerk user ID), with optional `role` and `tier` claims

Example validated payload:
```json
{
  "sub": "user_2abc123xyz",
  "email": "user@example.com",
  "iss": "https://your-app.clerk.accounts.dev",
  "exp": 1735689600
}
```

### User Sync

On first API request with a Clerk JWT:
1. Backend validates token with Clerk's public keys
2. Checks if user exists in local DB (by `clerk_id`)
3. If not, creates user record with default `free` tier
4. Updates `last_login_at` timestamp
5. Attaches user context to request

### Legacy Admin Authentication (Deprecated)

For backward compatibility, some internal endpoints still accept:
```json
{
  "sub": "admin-user-123",
  "role": "admin",
  "email": "admin@example.com"
}
```

Signed with `JWT_SECRET`. This will be phased out in favor of Clerk admin users.

### Testing Locally

Use Clerk's test mode (keys starting with `pk_test_` / `sk_test_`) in `.dev.vars`.  
Get test tokens from Clerk Dashboard or use their SDKs.

## Observability

- Each request receives an `X-Request-ID` header (use it in clients/tests). Logs are emitted in structured JSON form with `level`, `message`, `requestId`, and metadata to simplify ingestion into log pipelines.
- Errors surface the `requestId` in HTTP responses so you can correlate failures with logs quickly.

## Analytics API

- `GET /v1/analytics/ai` – summarizes recent AI usage (cost, tokens, prompt versions); query params: `from`, `to`, `model`, `prompt_slug`, `success`.
- `GET /v1/analytics/content` – lists recent content-related events (uploads, favorites, etc.) from the event log.
- `GET /v1/analytics/system` – raw system events (rate-limit hits, prompt promotions, etc.).

All analytics endpoints require admin auth. They currently return the latest 500 records (filtered in-memory) which is sufficient until the dedicated portal consumes them.

## Rate Limiting

Rate limits are **tier-based** and configured in the `tier_limits` table:

| Tier | Daily Requests | Daily Tokens | Parallel Generations | Content Downloads | Offline Packages |
|------|----------------|--------------|----------------------|-------------------|------------------|
| **Free** | 10 | 5,000 | 1 | 5 | 0 |
| **Premium** | 100 | 50,000 | 3 | 50 | 3 |
| **Pro** | 1,000 | 500,000 | 10 | Unlimited | Unlimited |

- Quotas reset at **00:00 UTC** each day
- Exceeding limits returns HTTP 429 (`RateLimitExceededError`)
- Tier is determined by user's subscription status (synced from RevenueCat webhooks)
- Fallback limits (`MAX_REQUESTS_PER_DAY` / `MAX_TOKENS_PER_DAY` env vars) apply if DB query fails

## Prompt Templates

Active AI prompts are managed via `/v1/ai/prompts` (admin-only):

- `POST /v1/ai/prompts` – create a draft version for a slug.
- `POST /v1/ai/prompts/:slug/clone` – clone an existing version to a new draft.
- `POST /v1/ai/prompts/:slug/promote` – make a version active (records reason + history).
- `POST /v1/ai/prompts/:slug/rollback` – revert to the previously active version.
- `GET /v1/ai/prompts/:slug/versions` – inspect status/history.

The AI generation endpoint accepts an optional `prompt` object (slug/version) so you can run validation passes against drafts before promoting them. Every AI analytics row stores the slug + version for downstream quality tracking.
## Database

Migrations in `drizzle/` directory.
Seed data in `seed/` directory.

## License

Private - Hanzimaster Project
