/**
 * Cleanup Expired Refresh Tokens
 * 
 * This cron job runs periodically to delete expired refresh tokens from the database.
 * Keeps the refresh_tokens table clean and prevents unbounded growth.
 * 
 * Schedule: Run every hour (configured in wrangler.toml)
 */

import type { D1Database } from '@cloudflare/workers-types';

export async function handleRefreshTokenCleanup(db: D1Database): Promise<{
  deleted: number;
  error?: string;
}> {
  try {
    const now = Math.floor(Date.now() / 1000);
    
    // Delete all expired refresh tokens
    const result = await db
      .prepare('DELETE FROM refresh_tokens WHERE expires_at < ?')
      .bind(now)
      .run();

    const deleted = result.meta.changes ?? 0;

    if (deleted > 0) {
      console.log(`[Cron] Cleaned up ${deleted} expired refresh tokens`);
    }

    return { deleted };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cron] Failed to cleanup refresh tokens:', message);
    return { deleted: 0, error: message };
  }
}


