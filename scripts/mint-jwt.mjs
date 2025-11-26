#!/usr/bin/env node
import { SignJWT } from 'jose';

const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : undefined;
    options[key] = value;
    if (value) i += 1;
  }
}

const sub = options.sub || process.env.JWT_SUB;
if (!sub) {
  console.error('Usage: node scripts/mint-jwt.mjs --sub <user-id> [--role admin] [--email user@example.com] [--expires 7d]');
  process.exit(1);
}

const role = options.role || 'user';
const email = options.email;
const expires = options.expires || process.env.JWT_MAX_AGE || '7d';
const secret = process.env.JWT_SECRET;

if (!secret) {
  console.error('Missing JWT_SECRET in environment.');
  process.exit(1);
}

const claims = { role };
if (email) {
  claims.email = email;
}

const encoder = new TextEncoder();
const token = await new SignJWT(claims)
  .setProtectedHeader({ alg: 'HS256' })
  .setSubject(sub)
  .setIssuedAt()
  .setExpirationTime(expires)
  .sign(encoder.encode(secret));

console.log(token);

