# 🔐 Secrets Setup Guide

Complete guide for configuring Clerk, RevenueCat, and other secrets in Wrangler.

---

## 📋 Prerequisites

Before you begin, gather these credentials:

### 1. Clerk (Authentication)
- **Publishable Key** (starts with `pk_test_` or `pk_live_`)
- **Secret Key** (starts with `sk_test_` or `sk_live_`)
- **JWT Issuer URL** (e.g., `https://your-app.clerk.accounts.dev`)
- **JWKS URL** (e.g., `https://your-app.clerk.accounts.dev/.well-known/jwks.json`)

📍 **Where to find:** [Clerk Dashboard](https://dashboard.clerk.com) → Select your app → API Keys

### 2. RevenueCat (In-App Billing)
- **Public API Key** (starts with `appl_` for Apple/Google)
- **Secret API Key** (starts with `sk_`)
- **Webhook Authorization Header** (for verifying webhooks)

📍 **Where to find:** [RevenueCat Dashboard](https://app.revenuecat.com) → Settings → API Keys

### 3. OpenAI (Existing)
- **API Key** (starts with `sk-`)
- **Base URL** (optional, defaults to OpenAI)

### 4. JWT Secret (Internal)
- Generate a strong secret (32+ characters) for legacy admin tokens

---

## 🛠️ Setup Instructions

### Step 1: Local Development (.dev.vars)

Update your `.dev.vars` file for local testing:

```bash
# === Authentication ===
CLERK_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXXXXXX
CLERK_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXX
CLERK_JWT_ISSUER=https://your-app.clerk.accounts.dev
CLERK_JWKS_URL=https://your-app.clerk.accounts.dev/.well-known/jwks.json

# === Billing ===
REVENUECAT_PUBLIC_API_KEY=appl_XXXXXXXXXXXXXXXXXXXX
REVENUECAT_SECRET_API_KEY=sk_XXXXXXXXXXXXXXXXXXXX
REVENUECAT_WEBHOOK_SECRET=your-webhook-secret-from-revenuecat

# === AI Services ===
OPENAI_API_KEY=sk-XXXXXXXXXXXXXXXXXXXX
OPENAI_BASE_URL=https://api.openai.com/v1

# === Legacy (for migration/testing) ===
ADMIN_SECRET=your-legacy-admin-secret
JWT_SECRET=your-strong-jwt-secret-change-me-in-production
JWT_MAX_AGE=7d

# === Rate Limiting (overridden by tier_limits table) ===
MAX_REQUESTS_PER_DAY=10
MAX_TOKENS_PER_DAY=5000
```

**⚠️ Important:** Add `.dev.vars` to `.gitignore` (already done)

---

### Step 2: Production Secrets (Wrangler)

Set secrets for your deployed worker using Wrangler CLI:

```bash
# Authentication
npx wrangler secret put CLERK_PUBLISHABLE_KEY
npx wrangler secret put CLERK_SECRET_KEY
npx wrangler secret put CLERK_JWT_ISSUER
npx wrangler secret put CLERK_JWKS_URL

# Billing
npx wrangler secret put REVENUECAT_PUBLIC_API_KEY
npx wrangler secret put REVENUECAT_SECRET_API_KEY
npx wrangler secret put REVENUECAT_WEBHOOK_SECRET

# AI Services
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put OPENAI_BASE_URL  # Optional, skip if using default

# Legacy/Internal
npx wrangler secret put ADMIN_SECRET
npx wrangler secret put JWT_SECRET
```

**Each command will prompt you to paste the value. Press Enter twice when done.**

---

### Step 3: Verify Secrets

List all configured secrets (values hidden):

```bash
npx wrangler secret list
```

Expected output:
```
┌──────────────────────────────┬────────────────────┐
│ Name                         │ Updated At         │
├──────────────────────────────┼────────────────────┤
│ ADMIN_SECRET                 │ 2024-01-15 10:23  │
│ CLERK_JWT_ISSUER             │ 2024-01-15 10:24  │
│ CLERK_JWKS_URL               │ 2024-01-15 10:24  │
│ CLERK_PUBLISHABLE_KEY        │ 2024-01-15 10:24  │
│ CLERK_SECRET_KEY             │ 2024-01-15 10:24  │
│ JWT_SECRET                   │ 2024-01-15 10:25  │
│ OPENAI_API_KEY               │ 2024-01-15 10:25  │
│ REVENUECAT_PUBLIC_API_KEY    │ 2024-01-15 10:26  │
│ REVENUECAT_SECRET_API_KEY    │ 2024-01-15 10:26  │
│ REVENUECAT_WEBHOOK_SECRET    │ 2024-01-15 10:26  │
└──────────────────────────────┴────────────────────┘
```

---

### Step 4: Update Non-Secret Variables (wrangler.jsonc)

Non-sensitive configuration goes in `wrangler.jsonc` under `vars`:

```jsonc
{
  "vars": {
    "ENVIRONMENT": "production",
    "ALLOWED_ORIGINS": "https://app.hanzimaster.com,https://portal.hanzimaster.com",
    "DEFAULT_AI_MODEL": "gpt-5-nano",
    
    // Rate limits (fallback if tier_limits table fails)
    "MAX_REQUESTS_PER_DAY": "10",
    "MAX_TOKENS_PER_DAY": "5000",
    
    // JWT Config
    "JWT_MAX_AGE": "7d",
    
    // RevenueCat App-Specific Identifiers (optional)
    "REVENUECAT_IOS_APP_ID": "1234567890",
    "REVENUECAT_ANDROID_APP_ID": "com.hanzimaster.app"
  }
}
```

---

## 🧪 Testing Secrets

### Test Clerk Integration

```bash
# Get a test token from Clerk
curl -X POST https://api.clerk.com/v1/client/sign_ins \
  -H "Authorization: Bearer YOUR_CLERK_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"identifier": "test@example.com"}'

# Use token with your API
curl https://YOUR-WORKER-URL.workers.dev/v1/users/me \
  -H "Authorization: Bearer eyJhbGc..."
```

### Test RevenueCat Webhook (Local)

```bash
# Start local dev server
pnpm dev

# Send test webhook
curl -X POST http://localhost:8787/v1/billing/webhooks/revenuecat \
  -H "Content-Type: application/json" \
  -H "X-RevenueCat-Signature: test-signature" \
  -d '{
    "event_type": "INITIAL_PURCHASE",
    "app_user_id": "clerk-user-123",
    "product_id": "hanzi_premium_monthly",
    "store": "app_store",
    "expiration_at_ms": 1735689600000
  }'
```

---

## 🔄 Rotating Secrets

### If a secret is compromised:

```bash
# Delete old secret
npx wrangler secret delete SECRET_NAME

# Set new secret
npx wrangler secret put SECRET_NAME

# Redeploy (automatically picks up new secret)
pnpm deploy
```

**No downtime** - Workers use the new secret immediately after deploy.

---

## 🚨 Troubleshooting

### "Secret not found" error in logs

**Cause:** Secret not set in production environment  
**Fix:** Run `npx wrangler secret put SECRET_NAME`

### "Invalid JWT issuer" error

**Cause:** `CLERK_JWT_ISSUER` doesn't match Clerk dashboard  
**Fix:** Verify exact URL in Clerk Dashboard → JWT Template → Issuer

### RevenueCat webhook returns 401

**Cause:** Signature verification failing  
**Fix:** Check `REVENUECAT_WEBHOOK_SECRET` matches RevenueCat Dashboard → Webhooks → Authorization Header

### Local dev works, production fails

**Cause:** `.dev.vars` present locally but secrets not set remotely  
**Fix:** Run all `npx wrangler secret put` commands from Step 2

---

## 📚 Additional Resources

- [Wrangler Secrets Docs](https://developers.cloudflare.com/workers/wrangler/commands/#secret)
- [Clerk Authentication Guide](https://clerk.com/docs/authentication/overview)
- [RevenueCat Webhooks](https://www.revenuecat.com/docs/webhooks)
- [Cloudflare Workers Environment Variables](https://developers.cloudflare.com/workers/configuration/environment-variables/)

---

## 🔐 Security Best Practices

1. ✅ **Never commit secrets** to git (use `.dev.vars` + `.gitignore`)
2. ✅ **Use different keys** for dev/staging/production
3. ✅ **Rotate secrets** quarterly or if compromised
4. ✅ **Limit secret access** (only deploy team needs Wrangler access)
5. ✅ **Monitor webhook signatures** (log failures to detect attacks)
6. ✅ **Use Clerk's test mode** for development (keys start with `pk_test_`)

---

**Ready to deploy?** Continue to [DEPLOY.md](./DEPLOY.md) for full deployment steps.

