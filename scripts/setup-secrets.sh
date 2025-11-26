#!/bin/bash

# 🔐 Wrangler Secrets Setup Script
# Interactive script to set all required secrets for Hanzimaster Backend

set -e

echo "🔐 Hanzimaster Backend - Secrets Setup"
echo "======================================="
echo ""
echo "This script will help you set all required secrets in Cloudflare Workers."
echo "You'll be prompted to paste each secret value."
echo ""
echo "📋 Make sure you have these ready:"
echo "   - Clerk: Publishable Key, Secret Key, JWT Issuer, JWKS URL"
echo "   - RevenueCat: Public Key, Secret Key, Webhook Secret"
echo "   - OpenAI: API Key"
echo "   - Internal: Admin Secret, JWT Secret"
echo ""
read -p "Ready to continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

echo ""
echo "=== 1. Authentication (Clerk) ==="
echo ""

echo "Setting CLERK_PUBLISHABLE_KEY (starts with pk_test_ or pk_live_)..."
npx wrangler secret put CLERK_PUBLISHABLE_KEY

echo "Setting CLERK_SECRET_KEY (starts with sk_test_ or sk_live_)..."
npx wrangler secret put CLERK_SECRET_KEY

echo "Setting CLERK_JWT_ISSUER (e.g., https://your-app.clerk.accounts.dev)..."
npx wrangler secret put CLERK_JWT_ISSUER

echo "Setting CLERK_JWKS_URL (e.g., https://your-app.clerk.accounts.dev/.well-known/jwks.json)..."
npx wrangler secret put CLERK_JWKS_URL

echo ""
echo "=== 2. Billing (RevenueCat) ==="
echo ""

echo "Setting REVENUECAT_PUBLIC_API_KEY (starts with appl_)..."
npx wrangler secret put REVENUECAT_PUBLIC_API_KEY

echo "Setting REVENUECAT_SECRET_API_KEY (starts with sk_)..."
npx wrangler secret put REVENUECAT_SECRET_API_KEY

echo "Setting REVENUECAT_WEBHOOK_SECRET (from RevenueCat Dashboard → Webhooks → Authorization)..."
npx wrangler secret put REVENUECAT_WEBHOOK_SECRET

echo ""
echo "=== 3. AI Services (OpenAI) ==="
echo ""

echo "Setting OPENAI_API_KEY (starts with sk-)..."
npx wrangler secret put OPENAI_API_KEY

read -p "Do you need a custom OpenAI base URL? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Setting OPENAI_BASE_URL..."
    npx wrangler secret put OPENAI_BASE_URL
else
    echo "⏭️  Skipping OPENAI_BASE_URL (will use default: https://api.openai.com/v1)"
fi

echo ""
echo "=== 4. Legacy/Internal Secrets ==="
echo ""

echo "Setting ADMIN_SECRET (for legacy admin workflows)..."
npx wrangler secret put ADMIN_SECRET

echo "Setting JWT_SECRET (for internal JWT signing, use 32+ random characters)..."
npx wrangler secret put JWT_SECRET

echo ""
echo "✅ All secrets configured!"
echo ""
echo "📋 Verifying secrets..."
npx wrangler secret list

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Run migrations: pnpm run migrate:remote"
echo "  2. Deploy worker: pnpm run deploy"
echo "  3. Configure Clerk webhook URL in dashboard"
echo "  4. Configure RevenueCat webhook URL in dashboard"
echo ""
echo "📖 See DEPLOY.md for full deployment instructions"

