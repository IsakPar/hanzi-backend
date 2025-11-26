# 🚀 Quick Reference: Setting Secrets for Production

## One-Command Setup

Run the interactive script that will prompt you for all secrets:

```bash
./scripts/setup-secrets.sh
```

---

## Manual Setup (if you prefer)

### Copy-Paste Commands (run each one at a time):

```bash
# === Authentication ===
npx wrangler secret put CLERK_PUBLISHABLE_KEY
npx wrangler secret put CLERK_SECRET_KEY
npx wrangler secret put CLERK_JWT_ISSUER
npx wrangler secret put CLERK_JWKS_URL

# === Billing ===
npx wrangler secret put REVENUECAT_PUBLIC_API_KEY
npx wrangler secret put REVENUECAT_SECRET_API_KEY
npx wrangler secret put REVENUECAT_WEBHOOK_SECRET

# === AI ===
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put OPENAI_BASE_URL  # Optional

# === Internal ===
npx wrangler secret put ADMIN_SECRET
npx wrangler secret put JWT_SECRET
```

---

## Where to Find Your Credentials

### 🔐 Clerk
**Dashboard:** https://dashboard.clerk.com
1. Select your app
2. Go to **API Keys**
3. Copy:
   - **Publishable Key** (`pk_test_...` or `pk_live_...`)
   - **Secret Key** (`sk_test_...` or `sk_live_...`)
4. Go to **JWT Templates** → note your **Issuer URL**
5. JWKS URL is always: `{ISSUER_URL}/.well-known/jwks.json`

### 💰 RevenueCat
**Dashboard:** https://app.revenuecat.com
1. Go to **Settings** → **API Keys**
2. Copy:
   - **Public API Key** (`appl_...`)
   - **Secret API Key** (`sk_...`)
3. Go to **Integrations** → **Webhooks** → **Authorization Header**
4. Copy the webhook secret (you'll need to create a webhook first)

### 🤖 OpenAI
**Dashboard:** https://platform.openai.com/api-keys
1. Create new secret key
2. Copy immediately (can't view again)

---

## Verify Setup

```bash
# List all secrets (values hidden)
npx wrangler secret list

# Should show 10-11 secrets total
```

---

## After Setting Secrets

1. **Deploy:** `pnpm run deploy`
2. **Get Worker URL:** Check terminal output
3. **Configure Clerk webhook:** Dashboard → Webhooks → Add `https://YOUR-WORKER.workers.dev/v1/billing/webhooks/clerk`
4. **Configure RevenueCat webhook:** Dashboard → Integrations → Webhooks → Add `https://YOUR-WORKER.workers.dev/v1/billing/webhooks/revenuecat`

---

## Troubleshooting

### "Secret not found" in logs
```bash
npx wrangler secret put SECRET_NAME
```

### Delete a secret
```bash
npx wrangler secret delete SECRET_NAME
```

### View secret value (not possible!)
Secrets are write-only. If you lost a value, generate a new one and update it.

---

**Full docs:** [SECRETS_SETUP.md](./SECRETS_SETUP.md)

