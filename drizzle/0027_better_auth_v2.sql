-- Better Auth Schema Migration
-- This migration creates the tables required by Better Auth
-- Tables prefixed with 'ba_' to avoid conflicts with existing tables

-- Create Better Auth tables

-- User table (Better Auth format)
CREATE TABLE IF NOT EXISTS ba_user (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  emailVerified INTEGER DEFAULT 0 NOT NULL,
  image TEXT,
  createdAt INTEGER DEFAULT (unixepoch()) NOT NULL,
  updatedAt INTEGER DEFAULT (unixepoch()) NOT NULL,
  -- Custom fields
  role TEXT DEFAULT 'user',
  tier TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'none',
  subscription_platform TEXT,
  subscription_expires_at INTEGER,
  last_login_at INTEGER
);

CREATE INDEX IF NOT EXISTS ba_user_email_idx ON ba_user(email);

--> statement-breakpoint

-- Session table (Better Auth format)
CREATE TABLE IF NOT EXISTS ba_session (
  id TEXT PRIMARY KEY NOT NULL,
  expiresAt INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  createdAt INTEGER DEFAULT (unixepoch()) NOT NULL,
  updatedAt INTEGER DEFAULT (unixepoch()) NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL REFERENCES ba_user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ba_session_userId_idx ON ba_session(userId);
CREATE INDEX IF NOT EXISTS ba_session_token_idx ON ba_session(token);

--> statement-breakpoint

-- Account table (Better Auth format - for email/pass + OAuth)
CREATE TABLE IF NOT EXISTS ba_account (
  id TEXT PRIMARY KEY NOT NULL,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES ba_user(id) ON DELETE CASCADE,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt INTEGER,
  refreshTokenExpiresAt INTEGER,
  scope TEXT,
  password TEXT,
  createdAt INTEGER DEFAULT (unixepoch()) NOT NULL,
  updatedAt INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE INDEX IF NOT EXISTS ba_account_userId_idx ON ba_account(userId);

--> statement-breakpoint

-- Verification table (Better Auth format - for email verification, password reset)
CREATE TABLE IF NOT EXISTS ba_verification (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt INTEGER NOT NULL,
  createdAt INTEGER DEFAULT (unixepoch()) NOT NULL,
  updatedAt INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE INDEX IF NOT EXISTS ba_verification_identifier_idx ON ba_verification(identifier);

--> statement-breakpoint

-- Drop old custom auth tables (they were from a failed migration attempt)
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS oauth_accounts;
DROP TABLE IF EXISTS email_verification_tokens;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS session;
DROP TABLE IF EXISTS user;
DROP TABLE IF EXISTS account;
DROP TABLE IF EXISTS verification;
