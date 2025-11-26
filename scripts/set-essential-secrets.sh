#!/bin/bash
# Quick script to set essential secrets for testing

echo "Setting essential secrets..."

echo "Setting ADMIN_SECRET..."
echo "hanzi-master-admin-key-production" | pnpm wrangler secret put ADMIN_SECRET

echo "Setting JWT_SECRET..."
echo "super-secret-jwt-key-for-production-change-me-later" | pnpm wrangler secret put JWT_SECRET

echo "Setting OPENAI_API_KEY..."
echo "sk-test-placeholder" | pnpm wrangler secret put OPENAI_API_KEY

echo "✅ Essential secrets set!"

