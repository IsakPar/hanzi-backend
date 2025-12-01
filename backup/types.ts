/**
 * Backup System Types
 * 
 * IMPORTANT: This schema is versioned. If you need breaking changes:
 * 1. Bump CURRENT_SCHEMA_VERSION
 * 2. Add migration logic in restore.ts
 * 3. Never delete old type definitions (keep for restore compatibility)
 * 
 * @version 1
 */

// ============================================================================
// SCHEMA VERSION
// ============================================================================

export const CURRENT_SCHEMA_VERSION = 1 as const;

// ============================================================================
// BACKUP METADATA (v1)
// ============================================================================

export interface BackupMetadataV1 {
  /**
   * Schema version for forward compatibility.
   * Restore logic checks this to handle old backup formats.
   */
  schema_version: 1;

  // ─────────────────────────────────────────────────────────────────────────
  // IDENTITY
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Unique backup identifier.
   * Format: ISO 8601 timestamp when backup started.
   * Example: "2025-12-01T03:00:00.000Z"
   */
  backup_id: string;

  /**
   * Environment this backup was taken from.
   */
  environment: 'production' | 'staging' | 'development';

  /**
   * Human-readable name for quick identification.
   * Example: "prod-daily-2025-12-01" or "pre-migration-0042"
   */
  name: string;

  // ─────────────────────────────────────────────────────────────────────────
  // TRIGGER CONTEXT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * What initiated this backup.
   */
  trigger: BackupTrigger;

  /**
   * Who/what triggered the backup.
   * - For 'cron': "github-actions" or "cloudflare-cron"
   * - For 'manual': user email
   * - For 'pre-migration': "migrate-script"
   */
  triggered_by: string;

  /**
   * Optional notes about why this backup was taken.
   * Useful for manual backups: "Before risky schema change"
   */
  notes?: string;

  // ─────────────────────────────────────────────────────────────────────────
  // DATABASE STATE (D1)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Cloudflare D1 database ID.
   */
  d1_database_id: string;

  /**
   * Current migration version at time of backup.
   * Matches the latest applied migration filename.
   * Example: "0042_add_grammar_table"
   */
  migration_version: string | null;

  /**
   * Row counts for critical tables at backup time.
   * Used for sanity checks during restore.
   */
  d1_row_counts: D1RowCounts;

  /**
   * Total size of the D1 dump in bytes (before encryption).
   */
  d1_dump_size_bytes: number;

  /**
   * List of tables included in backup.
   */
  d1_tables_included: string[];

  // ─────────────────────────────────────────────────────────────────────────
  // BLOB STORAGE STATE (R2)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * R2 bucket name.
   */
  r2_bucket: string;

  /**
   * Number of objects in R2 at backup time.
   */
  r2_blob_count: number;

  /**
   * Total size of all R2 objects in bytes.
   */
  r2_total_bytes: number;

  /**
   * Whether full R2 blobs are included or just manifest.
   * - 'manifest_only': Just the list of keys (for incremental)
   * - 'full': All blobs included in backup
   */
  r2_backup_mode: 'manifest_only' | 'full';

  // ─────────────────────────────────────────────────────────────────────────
  // INTEGRITY
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Checksum algorithm used.
   */
  checksum_algorithm: 'sha256';

  /**
   * SHA-256 hash of the raw payload BEFORE encryption.
   * Used to verify integrity after decryption.
   * Format: lowercase hex string
   */
  checksum_before_encryption: string;

  /**
   * SHA-256 hash of the encrypted payload.
   * Used to verify download integrity.
   * Format: lowercase hex string
   */
  checksum_after_encryption: string;

  // ─────────────────────────────────────────────────────────────────────────
  // ENCRYPTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Encryption algorithm used.
   */
  encryption_algorithm: 'aes-256-gcm';

  /**
   * Key identifier used for encryption.
   * Format: "kms:<key-id>" for AWS KMS, "cf:<key-id>" for CF, "local:<key-hash>" for dev
   */
  encryption_key_id: string;

  /**
   * Initialization vector (nonce) for AES-GCM.
   * Format: base64 encoded
   */
  encryption_iv: string;

  /**
   * Authentication tag from AES-GCM.
   * Format: base64 encoded
   */
  encryption_auth_tag: string;

  // ─────────────────────────────────────────────────────────────────────────
  // STORAGE LOCATIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Where this backup is stored.
   */
  storage_locations: StorageLocation[];

  // ─────────────────────────────────────────────────────────────────────────
  // TIMESTAMPS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * When backup started (ISO 8601).
   */
  created_at: string;

  /**
   * When backup completed (ISO 8601).
   */
  completed_at: string;

  /**
   * Duration of backup process in milliseconds.
   */
  duration_ms: number;

  /**
   * When this backup should be automatically deleted (ISO 8601).
   * Null = never auto-delete (e.g., break-glass backups).
   */
  expires_at: string | null;

  // ─────────────────────────────────────────────────────────────────────────
  // VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Last time this backup was verified (restore test).
   * Null = never verified.
   */
  last_verified_at: string | null;

  /**
   * Result of last verification.
   */
  last_verification_result: VerificationResult | null;
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

export type BackupTrigger = 
  | 'cron'           // Scheduled nightly backup
  | 'pre-migration'  // Before database schema change
  | 'manual'         // Admin-triggered via portal or CLI
  | 'pre-deploy';    // Before code deployment (future)

export interface D1RowCounts {
  // Auth
  ba_user: number;
  ba_session: number;
  refresh_tokens: number;
  
  // Core content
  users: number;
  vocabulary: number;
  lessons: number;
  stories: number;
  units: number;
  
  // User data
  user_progress: number;
  user_vocabulary: number;
  
  // Billing
  subscriptions: number;
  
  // Analytics (optional - can be large)
  ai_usage_log?: number;
  engagement_events_raw?: number;
  
  // Other tables (catch-all for future)
  [key: string]: number | undefined;
}

export interface StorageLocation {
  /**
   * Storage provider.
   */
  provider: 'r2' | 's3' | 's3-glacier';

  /**
   * Bucket name.
   */
  bucket: string;

  /**
   * Full object key/path.
   * Example: "env=prod/d1/2025/12/01/2025-12-01T03-00-00Z.enc"
   */
  key: string;

  /**
   * AWS region (for S3 only).
   */
  region?: string;

  /**
   * AWS account ID (for cross-account tracking).
   */
  aws_account_id?: string;

  /**
   * Storage tier.
   */
  tier: 'hot' | 'warm' | 'cold' | 'archive';

  /**
   * When uploaded to this location.
   */
  uploaded_at: string;
}

export interface VerificationResult {
  /**
   * Whether verification passed.
   */
  success: boolean;

  /**
   * Verification timestamp.
   */
  verified_at: string;

  /**
   * Which storage location was used for verification.
   */
  restored_from: StorageLocation;

  /**
   * Target environment for restore test.
   */
  restored_to: 'staging' | 'test';

  /**
   * Smoke test results.
   */
  smoke_tests: {
    migrations_applied: boolean;
    can_query_users: boolean;
    row_counts_match: boolean;
  };

  /**
   * Error message if verification failed.
   */
  error?: string;
}

// ============================================================================
// BACKUP PAYLOAD (the actual encrypted blob)
// ============================================================================

export interface BackupPayload {
  /**
   * Metadata (also stored separately for quick access).
   */
  metadata: BackupMetadataV1;

  /**
   * D1 database dump.
   * Format: Base64-encoded SQL dump.
   */
  d1_dump: string;

  /**
   * R2 manifest listing all objects.
   * Full blobs only included if r2_backup_mode === 'full'.
   */
  r2_manifest: R2Manifest;
}

export interface R2Manifest {
  /**
   * Bucket name.
   */
  bucket: string;

  /**
   * List of all objects.
   */
  objects: R2ObjectEntry[];

  /**
   * When manifest was generated.
   */
  generated_at: string;
}

export interface R2ObjectEntry {
  /**
   * Object key.
   */
  key: string;

  /**
   * Object size in bytes.
   */
  size: number;

  /**
   * ETag for integrity checking.
   */
  etag: string;

  /**
   * Last modified timestamp.
   */
  last_modified: string;

  /**
   * Content type.
   */
  content_type?: string;

  /**
   * If r2_backup_mode === 'full', this contains the base64-encoded blob.
   */
  data?: string;
}

// ============================================================================
// BACKUP CONFIG
// ============================================================================

export interface BackupConfig {
  /**
   * Environment being backed up.
   */
  environment: 'production' | 'staging' | 'development';

  /**
   * D1 database configuration.
   */
  d1: {
    database_name: string;  // e.g., "hanzimaster-db"
    database_id: string;
    api_token: string;
    account_id: string;
  };

  /**
   * R2 configuration.
   */
  r2: {
    bucket: string;
    access_key_id: string;
    secret_access_key: string;
    endpoint: string;  // R2's S3-compatible endpoint
  };

  /**
   * S3 configuration (primary AWS account).
   */
  s3: {
    bucket: string;
    region: string;
    access_key_id: string;
    secret_access_key: string;
    account_id: string;
  };

  /**
   * Encryption key.
   */
  encryption: {
    key_id: string;
    // For AWS KMS:
    kms_region?: string;
    // For local dev:
    local_key?: string;
  };

  /**
   * Retention policies.
   */
  retention: {
    r2_days: number;        // Hot storage (7-14)
    s3_standard_days: number;  // Warm storage (30-60)
    s3_glacier_days: number;   // Cold archive (180-365)
  };
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isBackupMetadataV1(obj: unknown): obj is BackupMetadataV1 {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'schema_version' in obj &&
    (obj as any).schema_version === 1
  );
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Critical tables that MUST be backed up.
 * Backup fails if any of these are missing.
 */
export const CRITICAL_TABLES = [
  'ba_user',
  'users',
  'subscriptions',
  'user_progress',
  'refresh_tokens',
] as const;

/**
 * All tables to include in backup.
 * Order matters for restore (foreign key dependencies).
 */
export const BACKUP_TABLES = [
  // Auth (no dependencies)
  'ba_user',
  'ba_session',
  'ba_account',
  'ba_verification',
  'refresh_tokens',
  
  // Core (depends on ba_user)
  'users',
  'subscriptions',
  
  // Content (no user dependencies)
  'vocabulary',
  'lessons',
  'lesson_blocks',
  'units',
  'stories',
  'story_sentences',
  'story_categories',
  'story_series',
  'announcements',
  'ai_models',
  'prompts',
  
  // User data (depends on users + content)
  'user_progress',
  'user_vocabulary',
  'user_settings',
  
  // Analytics (depends on users)
  'ai_usage_log',
  'engagement_events_raw',
  'engagement_events_aggregated',
] as const;

/**
 * Default retention periods in days.
 */
export const DEFAULT_RETENTION = {
  r2_hot: 14,
  s3_warm: 60,
  s3_glacier: 365,
} as const;

