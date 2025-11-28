/**
 * Better Auth Configuration
 * 
 * Using Better Auth for authentication with:
 * - Drizzle adapter (SQLite/D1)
 * - Email/password authentication with verification
 * - Password reset via email
 * 
 * @see https://www.better-auth.com
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import type { D1Database } from '@cloudflare/workers-types';
import * as schema from '../schema';
import { 
  sendEmail, 
  verificationEmailTemplate, 
  passwordResetEmailTemplate,
} from './email';

export interface AuthEnv {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL?: string;
  RESEND_API_KEY?: string;
  PORTAL_URL?: string;
}

/**
 * Create the Better Auth instance
 * Uses ba_* prefixed tables to not conflict with existing users table
 */
export function createAuth(d1: D1Database, env: AuthEnv) {
  const db = drizzle(d1, { schema });
  const portalUrl = env.PORTAL_URL || 'https://hanzimaster-portal.pages.dev';
  
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL || 'https://hanzimaster-backend-v2.isak-parild.workers.dev',
    
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: {
        // Use our prefixed tables
        user: schema.baUser,
        session: schema.baSession,
        account: schema.baAccount,
        verification: schema.baVerification,
      },
    }),
    
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: !!env.RESEND_API_KEY,
      minPasswordLength: 8,
      sendResetPassword: env.RESEND_API_KEY ? async ({ user, url }) => {
        await sendEmail(env.RESEND_API_KEY!, {
          to: user.email,
          subject: 'Reset Your HanziMaster Password',
          html: passwordResetEmailTemplate({
            name: user.name || 'there',
            resetUrl: url,
          }),
        });
      } : undefined,
    },
    
    // Email verification
    emailVerification: env.RESEND_API_KEY ? {
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail(env.RESEND_API_KEY!, {
          to: user.email,
          subject: 'Verify Your HanziMaster Email',
          html: verificationEmailTemplate({
            name: user.name || 'there',
            verificationUrl: url,
          }),
        });
      },
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
    } : undefined,
    
    // Session configuration - 10 minute inactivity timeout
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60,
      },
      expiresIn: 60 * 10, // 10 minutes
      updateAge: 60,
    },
    
    // Trust proxy for Cloudflare
    trustedOrigins: [
      'https://hanzimaster-portal.pages.dev',
      'https://hanzimaster-portal-v2.pages.dev',
      'http://localhost:5173',
      'http://localhost:8787',
      portalUrl,
    ],
    
    // Advanced options
    advanced: {
      crossSubDomainCookies: {
        enabled: false,
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
