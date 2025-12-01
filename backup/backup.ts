/**
 * Backup Orchestrator
 * 
 * Main entry point for creating backups.
 * 
 * Usage:
 *   npx ts-node backup/backup.ts cron
 *   npx ts-node backup/backup.ts pre-migration 0042_add_grammar_table
 *   npx ts-node backup/backup.ts manual "Before risky change"
 */

import {
  BackupConfig,
  BackupPayload,
  BackupTrigger,
  D1RowCounts,
  StorageLocation,
  R2Manifest,
  R2ObjectEntry,
  BACKUP_TABLES,
  DEFAULT_RETENTION,
} from './types';
import {
  createBackupMetadata,
  generateStorageKey,
  generateMetadataKey,
  serializeMetadata,
} from './metadata';
import { exportD1, exportD1ViaApi, D1Config, D1ExportResult } from './d1';
import { 
  uploadToS3, 
  uploadToR2, 
  buildR2Manifest as buildR2ManifestFromStorage,
  S3Config,
  R2Config,
} from './storage';

// ============================================================================
// MAIN BACKUP FUNCTION
// ============================================================================

export interface BackupOptions {
  trigger: BackupTrigger;
  triggered_by: string;
  migration_version?: string;
  notes?: string;
}

export interface BackupResult {
  success: boolean;
  backup_id: string;
  duration_ms: number;
  storage_locations: StorageLocation[];
  error?: string;
}

/**
 * Execute a full backup.
 * 
 * 1. Dump D1 database
 * 2. Build R2 manifest
 * 3. Create metadata
 * 4. Encrypt payload
 * 5. Upload to R2 + S3
 * 6. Store metadata separately for quick access
 */
export async function executeBackup(
  config: BackupConfig,
  options: BackupOptions
): Promise<BackupResult> {
  const startedAt = new Date();
  const storage_locations: StorageLocation[] = [];
  
  console.log(`[BACKUP] Starting ${options.trigger} backup...`);
  console.log(`[BACKUP] Environment: ${config.environment}`);
  console.log(`[BACKUP] Triggered by: ${options.triggered_by}`);
  
  try {
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Dump D1 Database
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[BACKUP] Step 1: Dumping D1 database...');
    
    const { dump: d1Dump, rowCounts, tables } = await dumpD1(config);
    
    console.log(`[BACKUP] D1 dump complete: ${formatBytes(d1Dump.length)}`);
    console.log(`[BACKUP] Tables: ${tables.length}`);
    console.log(`[BACKUP] Row counts:`, rowCounts);
    
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Build R2 Manifest
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[BACKUP] Step 2: Building R2 manifest...');
    
    const r2Manifest = await buildR2Manifest(config);
    
    console.log(`[BACKUP] R2 manifest complete: ${r2Manifest.objects.length} objects`);
    console.log(`[BACKUP] R2 total size: ${formatBytes(r2Manifest.objects.reduce((sum, o) => sum + o.size, 0))}`);
    
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: Create Raw Payload
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[BACKUP] Step 3: Creating payload...');
    
    // We'll add metadata after we know the checksums
    const partialPayload = {
      d1_dump: Buffer.from(d1Dump).toString('base64'),
      r2_manifest: r2Manifest,
    };
    
    const rawPayload = Buffer.from(JSON.stringify(partialPayload), 'utf-8');
    console.log(`[BACKUP] Raw payload size: ${formatBytes(rawPayload.length)}`);
    
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4: Calculate Checksum (before encryption)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[BACKUP] Step 4: Calculating checksum...');
    
    const checksumBeforeEncryption = await sha256(rawPayload);
    console.log(`[BACKUP] Checksum (pre-encrypt): ${checksumBeforeEncryption.slice(0, 16)}...`);
    
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 5: Encrypt Payload
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[BACKUP] Step 5: Encrypting payload...');
    
    const { encrypted, iv, authTag } = await encryptPayload(rawPayload, config);
    
    const checksumAfterEncryption = await sha256(encrypted);
    console.log(`[BACKUP] Encrypted size: ${formatBytes(encrypted.length)}`);
    console.log(`[BACKUP] Checksum (post-encrypt): ${checksumAfterEncryption.slice(0, 16)}...`);
    
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 6: Upload to R2 (Hot Storage)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[BACKUP] Step 6: Uploading to R2...');
    
    const r2Key = generateStorageKey(config.environment, startedAt.toISOString(), 'd1');
    await uploadBackupToR2(config, r2Key, encrypted);
    
    if (config.r2.access_key_id && config.r2.secret_access_key) {
      storage_locations.push({
        provider: 'r2',
        bucket: config.r2.bucket,
        key: r2Key,
        tier: 'hot',
        uploaded_at: new Date().toISOString(),
      });
      console.log(`[BACKUP] R2 upload complete: ${r2Key}`);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 7: Upload to S3 (Warm Storage)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[BACKUP] Step 7: Uploading to S3...');
    
    const s3Key = generateStorageKey(config.environment, startedAt.toISOString(), 'd1');
    await uploadBackupToS3(config, s3Key, encrypted);
    
    storage_locations.push({
      provider: 's3',
      bucket: config.s3.bucket,
      key: s3Key,
      region: config.s3.region,
      aws_account_id: config.s3.aws_account_id,
      tier: 'warm',
      uploaded_at: new Date().toISOString(),
    });
    
    console.log(`[BACKUP] S3 upload complete: ${s3Key}`);
    
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 8: Create Final Metadata
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[BACKUP] Step 8: Creating metadata...');
    
    const completedAt = new Date();
    
    const metadata = createBackupMetadata({
      trigger: options.trigger,
      triggered_by: options.triggered_by,
      environment: config.environment,
      notes: options.notes,
      
      d1_database_id: config.d1.database_id,
      migration_version: options.migration_version || null,
      d1_row_counts: rowCounts,
      d1_dump_size_bytes: d1Dump.length,
      d1_tables_included: tables,
      
      r2_bucket: config.r2.bucket,
      r2_blob_count: r2Manifest.objects.length,
      r2_total_bytes: r2Manifest.objects.reduce((sum, o) => sum + o.size, 0),
      r2_backup_mode: 'manifest_only',
      
      encryption_key_id: config.encryption.key_id,
      encryption_iv: iv,
      encryption_auth_tag: authTag,
      
      checksum_before_encryption: checksumBeforeEncryption,
      checksum_after_encryption: checksumAfterEncryption,
      
      storage_locations,
      
      started_at: startedAt,
      completed_at: completedAt,
      
      expires_in_days: DEFAULT_RETENTION.r2_days,
    });
    
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 9: Store Metadata (unencrypted for quick access)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[BACKUP] Step 9: Storing metadata...');
    
    const metadataJson = serializeMetadata(metadata);
    const metadataKey = generateMetadataKey(config.environment, startedAt.toISOString());
    const metadataBuffer = Buffer.from(metadataJson, 'utf-8');
    
    await uploadBackupToR2(config, metadataKey, metadataBuffer);
    await uploadBackupToS3(config, metadataKey, metadataBuffer);
    
    console.log(`[BACKUP] Metadata stored: ${metadataKey}`);
    
    // ─────────────────────────────────────────────────────────────────────────
    // DONE
    // ─────────────────────────────────────────────────────────────────────────
    const duration_ms = completedAt.getTime() - startedAt.getTime();
    
    console.log('[BACKUP] ════════════════════════════════════════════════');
    console.log(`[BACKUP] ✅ BACKUP COMPLETE`);
    console.log(`[BACKUP] Backup ID: ${metadata.backup_id}`);
    console.log(`[BACKUP] Duration: ${(duration_ms / 1000).toFixed(2)}s`);
    console.log(`[BACKUP] Storage locations: ${storage_locations.length}`);
    console.log('[BACKUP] ════════════════════════════════════════════════');
    
    return {
      success: true,
      backup_id: metadata.backup_id,
      duration_ms,
      storage_locations,
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error('[BACKUP] ════════════════════════════════════════════════');
    console.error(`[BACKUP] ❌ BACKUP FAILED`);
    console.error(`[BACKUP] Error: ${errorMessage}`);
    console.error('[BACKUP] ════════════════════════════════════════════════');
    
    return {
      success: false,
      backup_id: startedAt.toISOString(),
      duration_ms: Date.now() - startedAt.getTime(),
      storage_locations,
      error: errorMessage,
    };
  }
}

// ============================================================================
// D1 DATABASE DUMP
// ============================================================================

interface D1DumpResult {
  dump: Uint8Array;
  rowCounts: D1RowCounts;
  tables: string[];
}

async function dumpD1(config: BackupConfig): Promise<D1DumpResult> {
  const d1Config: D1Config = {
    database_name: config.d1.database_name || 'hanzimaster-db',
    database_id: config.d1.database_id,
    account_id: config.d1.account_id,
    api_token: config.d1.api_token,
  };
  
  // Determine export method based on environment
  const useWranglerCli = process.env.USE_WRANGLER_CLI !== 'false';
  
  let result: D1ExportResult;
  
  if (useWranglerCli) {
    // Use wrangler CLI (preferred in GitHub Actions)
    console.log('[D1] Using wrangler CLI for export...');
    result = await exportD1(d1Config);
  } else {
    // Use HTTP API (when wrangler not available)
    console.log('[D1] Using HTTP API for export...');
    result = await exportD1ViaApi(d1Config);
  }
  
  return {
    dump: new Uint8Array(result.dump),
    rowCounts: result.rowCounts,
    tables: result.tables,
  };
}

// ============================================================================
// R2 MANIFEST
// ============================================================================

async function buildR2Manifest(config: BackupConfig): Promise<R2Manifest> {
  // Check if R2 credentials are configured
  if (!config.r2.access_key_id || !config.r2.secret_access_key) {
    console.log('[R2] No R2 credentials configured, skipping manifest');
    return {
      bucket: config.r2.bucket,
      objects: [],
      generated_at: new Date().toISOString(),
    };
  }
  
  const r2Config: R2Config = {
    bucket: config.r2.bucket,
    accountId: config.r2.account_id,
    accessKeyId: config.r2.access_key_id,
    secretAccessKey: config.r2.secret_access_key,
  };
  
  return buildR2ManifestFromStorage(r2Config);
}

// ============================================================================
// ENCRYPTION
// ============================================================================

interface EncryptionResult {
  encrypted: Buffer;
  iv: string;
  authTag: string;
}

async function encryptPayload(
  payload: Buffer,
  config: BackupConfig
): Promise<EncryptionResult> {
  // Generate random IV (12 bytes for AES-GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Import key
  const keyMaterial = await getEncryptionKey(config);
  const key = await crypto.subtle.importKey(
    'raw',
    keyMaterial.buffer.slice(keyMaterial.byteOffset, keyMaterial.byteOffset + keyMaterial.byteLength) as ArrayBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  // Encrypt - convert Buffer to ArrayBuffer
  const payloadBuffer = payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength) as ArrayBuffer;
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    payloadBuffer
  );
  
  // AES-GCM appends auth tag to ciphertext
  // Last 16 bytes are the auth tag
  const encryptedArray = new Uint8Array(encrypted);
  const authTag = encryptedArray.slice(-16);
  
  return {
    encrypted: Buffer.from(encryptedArray),
    iv: Buffer.from(iv).toString('base64'),
    authTag: Buffer.from(authTag).toString('base64'),
  };
}

async function getEncryptionKey(config: BackupConfig): Promise<Uint8Array> {
  // In production: Use AWS KMS or Cloudflare KMS
  // For development: Use local key from config
  
  if (config.encryption.local_key) {
    // Hash the local key to get 256 bits
    const encoder = new TextEncoder();
    const keyData = encoder.encode(config.encryption.local_key);
    const hash = await crypto.subtle.digest('SHA-256', keyData);
    return new Uint8Array(hash);
  }
  
  // TODO: Implement KMS key retrieval
  throw new Error('KMS not yet implemented. Set encryption.local_key for development.');
}

// ============================================================================
// STORAGE UPLOADS
// ============================================================================

async function uploadBackupToR2(
  config: BackupConfig,
  key: string,
  data: Buffer
): Promise<void> {
  // Check if R2 credentials are configured
  if (!config.r2.access_key_id || !config.r2.secret_access_key) {
    console.log('[R2] No R2 credentials configured, skipping upload');
    return;
  }
  
  const r2Config: R2Config = {
    bucket: config.r2.bucket,
    accountId: config.r2.account_id,
    accessKeyId: config.r2.access_key_id,
    secretAccessKey: config.r2.secret_access_key,
  };
  
  await uploadToR2(r2Config, key, data);
}

async function uploadBackupToS3(
  config: BackupConfig,
  key: string,
  data: Buffer
): Promise<void> {
  const s3Config: S3Config = {
    bucket: config.s3.bucket,
    region: config.s3.region,
    accessKeyId: config.s3.access_key_id,
    secretAccessKey: config.s3.secret_access_key,
  };
  
  await uploadToS3(s3Config, key, data);
}

// ============================================================================
// UTILITIES
// ============================================================================

async function sha256(data: Buffer): Promise<string> {
  const dataBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const hash = await crypto.subtle.digest('SHA-256', dataBuffer);
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
  
  if (args.length === 0) {
    console.error('Usage: npx ts-node backup/backup.ts <trigger> [migration_version|notes]');
    console.error('  trigger: cron | pre-migration | manual');
    console.error('');
    console.error('Examples:');
    console.error('  npx ts-node backup/backup.ts cron');
    console.error('  npx ts-node backup/backup.ts pre-migration 0042_add_grammar_table');
    console.error('  npx ts-node backup/backup.ts manual "Before risky change"');
    process.exit(1);
  }
  
  const trigger = args[0] as BackupTrigger;
  const secondArg = args[1];
  
  // Load config from environment
  const config: BackupConfig = {
    environment: (process.env.ENVIRONMENT || 'development') as any,
    
    d1: {
      database_name: process.env.D1_DATABASE_NAME || 'hanzimaster-db',
      database_id: process.env.D1_DATABASE_ID || '',
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
    
    retention: DEFAULT_RETENTION,
  };
  
  const options: BackupOptions = {
    trigger,
    triggered_by: process.env.TRIGGERED_BY || 'cli',
    migration_version: trigger === 'pre-migration' ? secondArg : undefined,
    notes: trigger === 'manual' ? secondArg : undefined,
  };
  
  const result = await executeBackup(config, options);
  
  if (result.success) {
    console.log('BACKUP_OK', result.backup_id);
    process.exit(0);
  } else {
    console.error('BACKUP_FAIL', result.error);
    process.exit(1);
  }
}

// Run if invoked directly
// Works with both CommonJS (require.main) and ESM (import.meta)
const isMainModule = typeof require !== 'undefined' 
  ? require.main === module 
  : import.meta.url === `file://${process.argv[1]}`;

if (isMainModule || process.argv[1]?.includes('backup.ts') || process.argv[1]?.includes('backup/backup')) {
  main().catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
}

