# Quick Deployment Guide

## 0. Prerequisites

📋 **Before deploying, gather all credentials:**
- Clerk (auth): Publishable Key, Secret Key, JWT Issuer, JWKS URL
- RevenueCat (billing): Public API Key, Secret Key, Webhook Secret
- OpenAI: API Key

See [SECRETS_SETUP.md](./SECRETS_SETUP.md) for detailed instructions on where to find these.

---

## 1. Create Database
```bash
npx wrangler d1 create hanzimaster-db
```
Copy the `database_id` and update `wrangler.jsonc`.

## 2. Create R2 Buckets
```bash
npx wrangler r2 bucket create hanzimaster-content
npx wrangler r2 bucket create hanzimaster-content-dev
```

## 3. Set Secrets

**⚠️ IMPORTANT:** Run all these commands before deploying.

```bash
# Authentication (Clerk)
npx wrangler secret put CLERK_PUBLISHABLE_KEY
npx wrangler secret put CLERK_SECRET_KEY
npx wrangler secret put CLERK_JWT_ISSUER
npx wrangler secret put CLERK_JWKS_URL

# Billing (RevenueCat)
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

**Verify secrets are set:**
```bash
npx wrangler secret list
```

## 4. Deploy
```bash
pnpm deploy
```

## 5. Run Migrations

```bash
# Run all migrations in order
npx wrangler d1 execute hanzimaster-db --remote --file=drizzle/0000_married_ma_gnuci.sql
npx wrangler d1 execute hanzimaster-db --remote --file=drizzle/0001_mighty_kid_colt.sql
npx wrangler d1 execute hanzimaster-db --remote --file=drizzle/0002_classy_venus.sql
npx wrangler d1 execute hanzimaster-db --remote --file=drizzle/0003_shiny_exodus.sql
npx wrangler d1 execute hanzimaster-db --remote --file=drizzle/0004_bumpy_bill_hollister.sql
npx wrangler d1 execute hanzimaster-db --remote --file=drizzle/0005_modern_khan.sql

# TODO: Add new migration for Clerk + tier system
# npx wrangler d1 execute hanzimaster-db --remote --file=drizzle/0006_clerk_billing.sql
```

## 6. Seed Data
```bash
npx wrangler d1 execute hanzimaster-db --remote --file=seed/0001_seed_hsk1.sql
npx wrangler d1 execute hanzimaster-db --remote --file=seed/0002_vocab_meta.sql
npx wrangler d1 execute hanzimaster-db --remote --file=seed/0003_ai_models.sql
npx wrangler d1 execute hanzimaster-db --remote --file=seed/0004_tags.sql
```

## 7. Test Deployment

### Health Check
```bash
curl https://YOUR-WORKER-URL.workers.dev/
```

### Test Authentication (with Clerk token)
```bash
# Get token from Clerk (or use mobile app)
curl https://YOUR-WORKER-URL.workers.dev/v1/users/me \
  -H "Authorization: Bearer YOUR_CLERK_JWT_TOKEN"
```

### Test RevenueCat Webhook
```bash
# Use RevenueCat dashboard "Test Webhook" feature
# or send manually:
curl -X POST https://YOUR-WORKER-URL.workers.dev/v1/billing/webhooks/revenuecat \
  -H "Content-Type: application/json" \
  -H "X-RevenueCat-Signature: your-signature" \
  -d @test-webhook.json
```

---

## 8. Configure External Services

### Clerk Dashboard
1. Go to **JWT Templates** → Create new template
2. Set **Issuer** to match `CLERK_JWT_ISSUER`
3. Add custom claim: `"tier": "{{user.public_metadata.tier}}"` (optional, for future use)
4. Add **Authorized Origins**: `https://YOUR-WORKER-URL.workers.dev`

### RevenueCat Dashboard
1. Go to **Integrations** → **Webhooks**
2. Add webhook URL: `https://YOUR-WORKER-URL.workers.dev/v1/billing/webhooks/revenuecat`
3. Copy **Authorization Header** value and set as `REVENUECAT_WEBHOOK_SECRET`
4. Enable events: `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`, `BILLING_ISSUE`, `UNCANCELLATION`

**⚠️ IMPORTANT**: RevenueCat sends webhooks with `Authorization: Bearer <YOUR_SECRET>` format. Make sure:
- Your secret is set correctly in Cloudflare Workers secrets
- The webhook URL is publicly accessible (not behind CORS)
- Your Worker is deployed before testing from RevenueCat portal

---

## 9. Webhook Debugging Guide

### Testing RevenueCat Webhooks Locally

**Option 1: Use curl (simplest)**
```bash
curl -X POST http://localhost:8787/v1/billing/webhooks/revenuecat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-webhook-secret" \
  -d '{
    "event": {
      "type": "INITIAL_PURCHASE",
      "app_user_id": "user_test_123",
      "product_id": "hanzi_premium_monthly",
      "store": "app_store",
      "expiration_at_ms": 1735689600000
    }
  }'
```

**Option 2: Use RevenueCat Test Mode**
```bash
# Deploy your worker first
pnpm deploy

# Then use RevenueCat's "Test Webhook" button in dashboard
# It will send a real webhook to your worker URL
```

### Common Webhook Issues & Solutions

#### Issue 1: RevenueCat Portal says "Webhook Failed"
**Symptoms**: Test from portal returns 401 Unauthorized  
**Cause**: Authorization header mismatch

**Solution**:
```bash
# Check your secret matches exactly
npx wrangler secret list | grep REVENUECAT_WEBHOOK_SECRET

# Update if needed
npx wrangler secret put REVENUECAT_WEBHOOK_SECRET
# Paste the EXACT value from RevenueCat dashboard (under "Authorization Header")
```

#### Issue 2: Webhook works with curl but not from RevenueCat
**Symptoms**: curl returns 200, but RevenueCat portal times out  
**Cause**: Worker might be cold-starting or taking too long

**Solution**:
- Check Worker logs: `npx wrangler tail`
- Ensure webhook responds within 10 seconds
- Our implementation responds immediately (200 OK) then processes async

#### Issue 3: User tier not updating after webhook
**Symptoms**: Webhook returns 200 but user stays on free tier  
**Cause**: User doesn't exist in database or clerk_id mismatch

**Debug Steps**:
```bash
# Check if user exists
npx wrangler d1 execute hanzimaster-db --remote --command \
  "SELECT id, clerk_id, tier FROM users WHERE clerk_id = 'user_abc123'"

# Check webhook events
npx wrangler d1 execute hanzimaster-db --remote --command \
  "SELECT * FROM system_events WHERE event_type = 'user.subscription.changed' ORDER BY created_at DESC LIMIT 5"

# View logs in real-time
npx wrangler tail --format pretty
```

#### Issue 4: Testing with Wrong Product IDs
**Symptoms**: User upgraded but tier shows 'free'  
**Cause**: Product ID not in tierMap

**Solution**: Check `/src/routes/billing.ts` line ~104:
```typescript
const tierMap: Record<string, 'free' | 'premium' | 'pro'> = {
  'hanzi_premium_monthly': 'premium',
  'hanzi_premium_yearly': 'premium',
  'hanzi_pro_monthly': 'pro',
  'hanzi_pro_yearly': 'pro',
};
```

Make sure your RevenueCat product IDs match these exactly.

### Testing Checklist

Before deploying:
- [ ] `pnpm test` passes (especially `billing.routes.spec.ts`)
- [ ] RevenueCat webhook secret is set correctly
- [ ] Product IDs match between RevenueCat dashboard and tierMap
- [ ] Worker is deployed to production
- [ ] Test webhook from RevenueCat portal (not just curl)

### Monitoring Webhook Health

```bash
# View recent webhooks in logs
npx wrangler tail --format pretty | grep revenuecat.webhook

# Check success rate
npx wrangler d1 execute hanzimaster-db --remote --command \
  "SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN event_type = 'user.subscription.changed' THEN 1 ELSE 0 END) as successful
  FROM system_events 
  WHERE created_at > strftime('%s', 'now', '-7 days')"
```

---

Done! 🚀

**Next Steps:**
- Monitor logs: `npx wrangler tail`
- Update mobile apps with Worker URL
- Test full auth flow: Signup → Login → Subscribe → API calls
- See [SECRETS_SETUP.md](./SECRETS_SETUP.md) for troubleshooting

