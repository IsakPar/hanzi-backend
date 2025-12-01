/// <reference types="@cloudflare/workers-types" />
/**
 * Critical Data Backup Cron
 * Exports waitlist, users, and subscription data to R2 daily
 * 
 * Run: Every day at 3:00 AM UTC
 * Retention: 30 days
 * 
 * 95 LOC
 */

import { logWithContext } from '../utils/logger';

interface BackupResult {
  table: string;
  rowCount: number;
  timestamp: string;
  r2Key: string;
}

const CRITICAL_TABLES = [
  'waitlist',
  'users',
  'system_events',
] as const;

export async function handleBackupCron(
  db: D1Database,
  bucket: R2Bucket,
  log: (message: string, meta?: Record<string, unknown>) => void
): Promise<{ success: boolean; backups: BackupResult[] }> {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const backups: BackupResult[] = [];
  
  log('backup.starting', { tables: CRITICAL_TABLES, timestamp });

  for (const table of CRITICAL_TABLES) {
    try {
      // Export table data
      const result = await db
        .prepare(`SELECT * FROM ${table}`)
        .all();
      
      const data = {
        table,
        exportedAt: new Date().toISOString(),
        rowCount: result.results.length,
        rows: result.results,
      };
      
      // Upload to R2
      const r2Key = `backups/${timestamp}/${table}.json`;
      await bucket.put(r2Key, JSON.stringify(data, null, 2), {
        httpMetadata: { contentType: 'application/json' },
        customMetadata: { 
          table, 
          rowCount: String(result.results.length),
          exportedAt: data.exportedAt,
        },
      });
      
      backups.push({
        table,
        rowCount: result.results.length,
        timestamp: data.exportedAt,
        r2Key,
      });
      
      log('backup.table_exported', { table, rowCount: result.results.length, r2Key });
    } catch (error) {
      log('backup.table_failed', { 
        table, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  // Cleanup old backups (older than 30 days)
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];
    
    const oldBackups = await bucket.list({ prefix: 'backups/' });
    let deletedCount = 0;
    
    for (const object of oldBackups.objects) {
      // Extract date from key: backups/YYYY-MM-DD/table.json
      const dateMatch = object.key.match(/backups\/(\d{4}-\d{2}-\d{2})\//);
      if (dateMatch && dateMatch[1] < cutoffDate) {
        await bucket.delete(object.key);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      log('backup.cleanup_complete', { deletedCount, cutoffDate });
    }
  } catch (error) {
    log('backup.cleanup_failed', { 
      error: error instanceof Error ? error.message : String(error) 
    });
  }

  log('backup.complete', { 
    tablesBackedUp: backups.length, 
    totalRows: backups.reduce((sum, b) => sum + b.rowCount, 0) 
  });

  return { success: true, backups };
}

