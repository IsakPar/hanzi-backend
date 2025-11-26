import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { contentLibrary } from '../schema';
import { and, eq, lt, or, sql } from 'drizzle-orm';

/**
 * Cleanup Cron Job for Orphaned Uploads
 * 
 * Purpose: Cleans up failed or stuck uploads to prevent R2 storage bloat
 * 
 * Runs: Every 6 hours (recommended schedule)
 * 
 * Cleans up:
 * 1. Records older than 1 hour with status 'pending_upload' or 'uploading'
 * 2. Records marked as 'failed'
 * 3. Associated R2 files
 * 
 * Safety:
 * - Only touches records older than 1 hour (prevents race conditions)
 * - Logs all cleanup actions for audit
 * - Gracefully handles R2 delete failures
 */

interface CleanupResult {
  recordsCleaned: number;
  filesDeleted: number;
  errors: string[];
}

export async function cleanupOrphanedUploads(
  db: D1Database,
  bucket: R2Bucket,
  logFn: (message: string, meta?: any) => void = console.log
): Promise<CleanupResult> {
  const d1 = drizzle(db);
  const result: CleanupResult = {
    recordsCleaned: 0,
    filesDeleted: 0,
    errors: [],
  };

  // Calculate cutoff time (1 hour ago)
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - 1);
  const cutoffTimestamp = Math.floor(cutoffTime.getTime() / 1000);

  try {
    // Find stuck or failed uploads older than 1 hour
    const stuckUploads = await d1
      .select()
      .from(contentLibrary)
      .where(
        and(
          or(
            eq(contentLibrary.uploadStatus, 'pending_upload'),
            eq(contentLibrary.uploadStatus, 'uploading'),
            eq(contentLibrary.uploadStatus, 'failed')
          ),
          lt(contentLibrary.createdAt, cutoffTime)
        )
      )
      .all();

    logFn('cleanup.orphaned_uploads.scan_complete', {
      found: stuckUploads.length,
      cutoffTime: cutoffTime.toISOString(),
    });

    // Clean up each stuck upload
    for (const upload of stuckUploads) {
      try {
        // Delete from R2
        const deletePromises = [];
        if (upload.r2Key) deletePromises.push(bucket.delete(upload.r2Key));
        if (upload.coverImageR2Key) deletePromises.push(bucket.delete(upload.coverImageR2Key));
        if (upload.sampleR2Key) deletePromises.push(bucket.delete(upload.sampleR2Key));

        const r2Results = await Promise.allSettled(deletePromises);
        const filesDeleted = r2Results.filter((r) => r.status === 'fulfilled').length;
        result.filesDeleted += filesDeleted;

        // Delete from D1
        await d1.delete(contentLibrary).where(eq(contentLibrary.id, upload.id));
        result.recordsCleaned++;

        logFn('cleanup.orphaned_uploads.record_cleaned', {
          contentId: upload.id,
          status: upload.uploadStatus,
          ageHours: Math.floor((Date.now() - (upload.createdAt?.getTime() || 0)) / (1000 * 60 * 60)),
          filesDeleted,
        });
      } catch (error) {
        const errorMsg = `Failed to clean upload ${upload.id}: ${(error as Error).message}`;
        result.errors.push(errorMsg);
        logFn('cleanup.orphaned_uploads.error', {
          contentId: upload.id,
          error: (error as Error).message,
        });
      }
    }

    logFn('cleanup.orphaned_uploads.complete', {
      recordsCleaned: result.recordsCleaned,
      filesDeleted: result.filesDeleted,
      errors: result.errors.length,
    });

    return result;
  } catch (error) {
    logFn('cleanup.orphaned_uploads.fatal_error', {
      error: (error as Error).message,
    });
    throw error;
  }
}

// Scheduled handler for Cloudflare Workers Cron
// Add to wrangler.jsonc triggers.crons: ["0 */6 * * *"]
export async function handleCleanupCron(
  db: D1Database,
  bucket: R2Bucket,
  logFn?: (message: string, meta?: any) => void
): Promise<Response> {
  try {
    const result = await cleanupOrphanedUploads(db, bucket, logFn);

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

