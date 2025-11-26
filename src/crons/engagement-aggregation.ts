/**
 * Engagement Aggregation Cron
 * Runs every 10 minutes to process raw engagement events
 * 
 * Tasks:
 * 1. Aggregate unprocessed events into per-content stats
 * 2. Update daily engagement summaries
 * 3. Cleanup raw events older than 90 days
 */

import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { 
  aggregateEngagementEvents, 
  cleanupOldEngagementEvents 
} from '../services/engagement-tracking';

type LogFn = (message: string, meta?: Record<string, unknown>) => void;

export interface AggregationResult {
  processed: number;
  errors: number;
  cleaned: number;
  durationMs: number;
  [key: string]: unknown; // Index signature for compatibility
}

export async function handleEngagementAggregation(
  d1Database: D1Database,
  log: LogFn
): Promise<AggregationResult> {
  const startTime = Date.now();
  const db = drizzle(d1Database);
  
  log('engagement_aggregation.started');
  
  try {
    // Step 1: Aggregate unprocessed events
    const aggregationResult = await aggregateEngagementEvents(db);
    log('engagement_aggregation.events_processed', {
      processed: aggregationResult.processed,
      errors: aggregationResult.errors,
    });
    
    // Step 2: Cleanup old events (90 days retention)
    // Only run cleanup once per hour to reduce DB load
    const currentMinute = new Date().getMinutes();
    let cleaned = 0;
    
    if (currentMinute < 10) { // Run during the first 10-minute block of each hour
      const cleanupResult = await cleanupOldEngagementEvents(db, 90);
      cleaned = cleanupResult.deleted;
      
      if (cleaned > 0) {
        log('engagement_aggregation.cleanup_complete', { deleted: cleaned });
      }
    }
    
    const durationMs = Date.now() - startTime;
    
    log('engagement_aggregation.complete', { 
      processed: aggregationResult.processed,
      errors: aggregationResult.errors,
      cleaned,
      durationMs,
    });
    
    return {
      processed: aggregationResult.processed,
      errors: aggregationResult.errors,
      cleaned,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);
    
    log('engagement_aggregation.failed', { 
      error: errorMessage,
      durationMs,
    });
    
    throw err;
  }
}

