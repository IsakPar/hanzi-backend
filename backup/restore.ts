/**
 * Backup Restore
 * 
 * Restores a backup to a target D1 database (typically staging).
 * 
 * Usage:
 *   npx ts-node backup/restore.ts                    # Restore latest
 *   npx ts-node backup/restore.ts 2025-12-01T03:00:00.000Z  # Restore specific
 */

import {
  BackupConfig,
  BackupMetadataV1,
  BackupPayload,
  D1RowCounts,
  isBackupMetadataV1,
} from './types';
import {
  parseMetadata,
  validateRowCounts,
  generateMetadataKey,
  generateStorageKey,
} from './metadata';
import { importD1, getRowCounts, D1Config } from './d1';
import { downloadFromS3, downloadFromR2, listS3Objects, S3Config, R2Config } from './storage';

// ============================================================================
// MAIN RESTORE FUNCTION
// ============================================================================

export interface RestoreOptions {
  /**
   * Specific backup ID to restore. If not provided, restores latest.
   */
  backup_id?: string;
  
  /**
   * Whether to verify row counts after restore.
   */
  verify_row_counts?: boolean;
  
  /**
   * Whether to run migrations after restore.
   */
  run_migrations?: boolean;
}

export interface RestoreResult {
  success: boolean;
  backup_id: string;
  duration_ms: number;
  row_counts_verified: boolean;
  row_count_mismatches?: string[];
  error?: string;
}

/**
 * Execute a restore.
 * 
 * 1. Find backup (latest or specific)
 * 2. Download encrypted backup
 * 3. Verify checksum
 * 4. Decrypt
 * 5. Verify inner checksum
 * 6. Restore D1
 * 7. Verify row counts
 */
export async function executeRestore(
  config: BackupConfig,
  options: RestoreOptions = {}
): Promise<RestoreResult> {
  const startedAt = new Date();
  
  console.log('[RESTORE] Starting restore...');
  console.log(`[RESTORE] Environment: ${config.environment}`);
  
  try {
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Find Backup
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[RESTORE] Step 1: Finding backup...');
    
    let backup_id: string;
    
    if (options.backup_id) {
      backup_id = options.backup_id;
      console.log(`[RESTORE] Using specified backup: ${backup_id}`);
    } else {
      backup_id = await findLatestBackup(config);
      console.log(`[RESTORE] Found latest backup: ${backup_id}`);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Download Metadata
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[RESTORE] Step 2: Downloading metadata...');
    
    const metadataKey = generateMetadataKey(config.environment, backup_id);
    const metadataJson = await downloadFromStorage(config, metadataKey);
    const metadata = parseMetadata(metadataJson.toString('utf-8'));
    
    console.log(`[RESTORE] Backup name: ${metadata.name}`);
    console.log(`[RESTORE] Created at: ${metadata.created_at}`);
    console.log(`[RESTORE] Trigger: ${metadata.trigger}`);
    
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: Download Encrypted Backup
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[RESTORE] Step 3: Downloading encrypted backup...');
    
    const backupKey = generateStorageKey(config.environment, backup_id, 'd1');
    const encrypted = await downloadFromStorage(config, backupKey);
    
    console.log(`[RESTORE] Downloaded: ${formatBytes(encrypted.length)}`);
    
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4: Verify Post-Encryption Checksum
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[RESTORE] Step 4: Verifying download integrity...');
    
    const actualChecksum = await sha256(encrypted);
    
    if (actualChecksum !== metadata.checksum_after_encryption) {
      throw new Error(
        `Checksum mismatch: expected ${metadata.checksum_after_encryption}, got ${actualChecksum}`
      );
    }
    
    console.log('[RESTORE] Download checksum verified ✓');
    
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 5: Decrypt
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[RESTORE] Step 5: Decrypting...');
    
    const decrypted = await decryptPayload(encrypted, metadata, config);
    
    console.log(`[RESTORE] Decrypted: ${formatBytes(decrypted.length)}`);
    
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 6: Verify Pre-Encryption Checksum
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[RESTORE] Step 6: Verifying decryption integrity...');
    
    const decryptedChecksum = await sha256(decrypted);
    
    if (decryptedChecksum !== metadata.checksum_before_encryption) {
      throw new Error(
        `Decryption checksum mismatch: expected ${metadata.checksum_before_encryption}, got ${decryptedChecksum}`
      );
    }
    
    console.log('[RESTORE] Decryption checksum verified ✓');
    
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 7: Parse Payload
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[RESTORE] Step 7: Parsing payload...');
    
    const payload = JSON.parse(decrypted.toString('utf-8'));
    const d1Dump = Buffer.from(payload.d1_dump, 'base64');
    
    console.log(`[RESTORE] D1 dump size: ${formatBytes(d1Dump.length)}`);
    console.log(`[RESTORE] R2 manifest: ${payload.r2_manifest.objects.length} objects`);
    
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 8: Restore to D1
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[RESTORE] Step 8: Restoring to D1...');
    
    await restoreD1(config, d1Dump);
    
    console.log('[RESTORE] D1 restore complete ✓');
    
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 9: Run Migrations (if requested)
    // ─────────────────────────────────────────────────────────────────────────
    if (options.run_migrations) {
      console.log('[RESTORE] Step 9: Running migrations...');
      await runMigrations(config);
      console.log('[RESTORE] Migrations complete ✓');
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 10: Verify Row Counts
    // ─────────────────────────────────────────────────────────────────────────
    let row_counts_verified = false;
    let row_count_mismatches: string[] | undefined;
    
    if (options.verify_row_counts !== false) {
      console.log('[RESTORE] Step 10: Verifying row counts...');
      
      const actualRowCounts = await getD1RowCounts(config);
      const verification = validateRowCounts(metadata.d1_row_counts, actualRowCounts);
      
      row_counts_verified = verification.valid;
      row_count_mismatches = verification.mismatches;
      
      if (verification.valid) {
        console.log('[RESTORE] Row counts verified ✓');
      } else {
        console.warn('[RESTORE] Row count mismatches:', verification.mismatches);
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // DONE
    // ─────────────────────────────────────────────────────────────────────────
    const duration_ms = Date.now() - startedAt.getTime();
    
    console.log('[RESTORE] ════════════════════════════════════════════════');
    console.log(`[RESTORE] ✅ RESTORE COMPLETE`);
    console.log(`[RESTORE] Backup ID: ${backup_id}`);
    console.log(`[RESTORE] Duration: ${(duration_ms / 1000).toFixed(2)}s`);
    console.log(`[RESTORE] Row counts verified: ${row_counts_verified}`);
    console.log('[RESTORE] ════════════════════════════════════════════════');
    
    return {
      success: true,
      backup_id,
      duration_ms,
      row_counts_verified,
      row_count_mismatches,
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error('[RESTORE] ════════════════════════════════════════════════');
    console.error(`[RESTORE] ❌ RESTORE FAILED`);
    console.error(`[RESTORE] Error: ${errorMessage}`);
    console.error('[RESTORE] ════════════════════════════════════════════════');
    
    return {
      success: false,
      backup_id: options.backup_id || 'unknown',
      duration_ms: Date.now() - startedAt.getTime(),
      row_counts_verified: false,
      error: errorMessage,
    };
  }
}

// ============================================================================
// FIND LATEST BACKUP
// ============================================================================

async function findLatestBackup(config: BackupConfig): Promise<string> {
  console.log('[RESTORE] Finding latest backup...');
  
  const s3Config: S3Config = {
    bucket: config.s3.bucket,
    region: config.s3.region,
    accessKeyId: config.s3.access_key_id,
    secretAccessKey: config.s3.secret_access_key,
  };
  
  // List metadata files
  const prefix = `env=${config.environment}/metadata/`;
  console.log(`[RESTORE] Listing objects with prefix: ${prefix}`);
  
  const objects = await listS3Objects(s3Config, prefix);
  
  if (objects.length === 0) {
    throw new Error(`No backups found in ${config.s3.bucket} with prefix ${prefix}`);
  }
  
  // Sort by key (newest first - keys contain dates like 2025/12/01)
  objects.sort((a, b) => b.key.localeCompare(a.key));
  
  // Extract backup_id from the key
  // Key format: env=production/metadata/2025/12/01/2025-12-01T03-00-00-000Z.json
  const latestKey = objects[0].key;
  const filename = latestKey.split('/').pop()!;  // "2025-12-01T03-00-00-000Z.json"
  const backupId = filename
    .replace('.json', '')
    .replace(/-(\d{2})-(\d{2})-(\d{3})Z$/, ':$1:$2.$3Z');  // Convert back to ISO format
  
  console.log(`[RESTORE] Found ${objects.length} backups, latest: ${backupId}`);
  
  return backupId;
}

// ============================================================================
// DOWNLOAD FROM STORAGE
// ============================================================================

async function downloadFromStorage(
  config: BackupConfig,
  key: string
): Promise<Buffer> {
  console.log(`[RESTORE] Downloading: ${key}`);
  
  // Try R2 first (hot storage), fallback to S3 (warm storage)
  if (config.r2.access_key_id && config.r2.secret_access_key) {
    try {
      const r2Config: R2Config = {
        bucket: config.r2.bucket,
        accountId: config.r2.account_id,
        accessKeyId: config.r2.access_key_id,
        secretAccessKey: config.r2.secret_access_key,
      };
      return await downloadFromR2(r2Config, key);
    } catch (r2Error) {
      console.log(`[RESTORE] R2 failed, trying S3: ${r2Error}`);
    }
  }
  
  // Fallback to S3
  const s3Config: S3Config = {
    bucket: config.s3.bucket,
    region: config.s3.region,
    accessKeyId: config.s3.access_key_id,
    secretAccessKey: config.s3.secret_access_key,
  };
  
  return downloadFromS3(s3Config, key);
}

// ============================================================================
// DECRYPTION
// ============================================================================

async function decryptPayload(
  encrypted: Buffer,
  metadata: BackupMetadataV1,
  config: BackupConfig
): Promise<Buffer> {
  // Import key
  const keyMaterial = await getDecryptionKey(config, metadata.encryption_key_id);
  const key = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(keyMaterial).buffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  
  // Decode IV
  const ivBuffer = Buffer.from(metadata.encryption_iv, 'base64');
  const iv = new Uint8Array(ivBuffer).buffer;
  
  // Convert encrypted to ArrayBuffer
  const encryptedArrayBuffer = new Uint8Array(encrypted).buffer;
  
  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encryptedArrayBuffer
  );
  
  return Buffer.from(decrypted);
}

async function getDecryptionKey(
  config: BackupConfig,
  keyId: string
): Promise<Uint8Array> {
  // Match the encryption key retrieval logic
  if (config.encryption.local_key) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(config.encryption.local_key);
    const hash = await crypto.subtle.digest('SHA-256', keyData);
    return new Uint8Array(hash);
  }
  
  // TODO: Implement KMS key retrieval
  throw new Error('KMS not yet implemented. Set encryption.local_key for development.');
}

// ============================================================================
// D1 RESTORE
// ============================================================================

async function restoreD1(config: BackupConfig, dump: Buffer): Promise<void> {
  const d1Config: D1Config = {
    database_name: config.d1.database_name,
    database_id: config.d1.database_id,
    account_id: config.d1.account_id,
    api_token: config.d1.api_token,
  };
  
  const result = await importD1(d1Config, dump);
  
  if (!result.success) {
    throw new Error(`D1 restore failed: ${result.error}`);
  }
  
  console.log(`[D1] Restored ${result.tablesRestored} tables`);
}

async function runMigrations(config: BackupConfig): Promise<void> {
  console.log('[D1] Running migrations...');
  
  // Use wrangler to apply migrations
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  const env = {
    ...process.env,
    CLOUDFLARE_API_TOKEN: config.d1.api_token,
    CLOUDFLARE_ACCOUNT_ID: config.d1.account_id,
  };
  
  try {
    await execAsync('npm run db:migrate', { env });
    console.log('[D1] Migrations complete');
  } catch (error) {
    console.warn('[D1] Migration warning:', error);
    // Don't fail on migration errors - they might already be applied
  }
}

async function getD1RowCounts(config: BackupConfig): Promise<D1RowCounts> {
  const d1Config: D1Config = {
    database_name: config.d1.database_name,
    database_id: config.d1.database_id,
    account_id: config.d1.account_id,
    api_token: config.d1.api_token,
  };
  
  return getRowCounts(d1Config);
}

// ============================================================================
// UTILITIES
// ============================================================================

async function sha256(data: Buffer): Promise<string> {
  const arrayBuffer = new Uint8Array(data).buffer;
  const hash = await crypto.subtle.digest('SHA-256', arrayBuffer);
  return Buffer.from(hash).toString('hex');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const backup_id = args[0];
  
  // Load config from environment
  const config: BackupConfig = {
    environment: (process.env.ENVIRONMENT || 'staging') as any,
    
    d1: {
      database_name: process.env.D1_STAGING_DATABASE_NAME || process.env.D1_DATABASE_NAME || 'hanzimaster-db-staging',
      database_id: process.env.D1_STAGING_DATABASE_ID || process.env.D1_DATABASE_ID || '',
      api_token: process.env.CLOUDFLARE_API_TOKEN || process.env.D1_API_TOKEN || '',
      account_id: process.env.CF_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || '',
    },
    
    r2: {
      bucket: process.env.R2_BUCKET || 'hanzimaster-backups',
      account_id: process.env.CF_ACCOUNT_ID || '',
      access_key_id: process.env.R2_ACCESS_KEY_ID || '',
      secret_access_key: process.env.R2_SECRET_ACCESS_KEY || '',
    },
    
    s3: {
      bucket: process.env.S3_BUCKET || 'hm-prod-backups',
      region: process.env.S3_REGION || 'us-east-1',
      access_key_id: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
      secret_access_key: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
      aws_account_id: process.env.AWS_ACCOUNT_ID || '',
    },
    
    encryption: {
      key_id: process.env.ENCRYPTION_KEY_ID || 'local:dev',
      local_key: process.env.ENCRYPTION_LOCAL_KEY,
    },
    
    retention: {
      r2_days: 14,
      s3_standard_days: 60,
      s3_glacier_days: 365,
    },
  };
  
  const options: RestoreOptions = {
    backup_id,
    verify_row_counts: true,
    run_migrations: process.env.RUN_MIGRATIONS === 'true',
  };
  
  const result = await executeRestore(config, options);
  
  if (result.success) {
    console.log('RESTORE_OK', result.backup_id);
    process.exit(0);
  } else {
    console.error('RESTORE_FAIL', result.error);
    process.exit(1);
  }
}

// Only run if this is the main module
if (require.main === module) {
  main().catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
}

