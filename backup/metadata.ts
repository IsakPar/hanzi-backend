/**
 * Backup Metadata Generator
 * 
 * Creates and validates backup metadata.
 */

import {
  BackupMetadataV1,
  BackupTrigger,
  D1RowCounts,
  StorageLocation,
  CURRENT_SCHEMA_VERSION,
  CRITICAL_TABLES,
} from './types';

// ============================================================================
// METADATA CREATION
// ============================================================================

export interface CreateMetadataInput {
  trigger: BackupTrigger;
  triggered_by: string;
  environment: 'production' | 'staging' | 'development';
  notes?: string;
  
  // D1 info
  d1_database_id: string;
  migration_version: string | null;
  d1_row_counts: D1RowCounts;
  d1_dump_size_bytes: number;
  d1_tables_included: string[];
  
  // R2 info
  r2_bucket: string;
  r2_blob_count: number;
  r2_total_bytes: number;
  r2_backup_mode: 'manifest_only' | 'full';
  
  // Encryption info
  encryption_key_id: string;
  encryption_iv: string;
  encryption_auth_tag: string;
  
  // Checksums
  checksum_before_encryption: string;
  checksum_after_encryption: string;
  
  // Storage
  storage_locations: StorageLocation[];
  
  // Timing
  started_at: Date;
  completed_at: Date;
  
  // Retention
  expires_in_days: number | null;  // null = never expire
}

/**
 * Create backup metadata with validation.
 */
export function createBackupMetadata(input: CreateMetadataInput): BackupMetadataV1 {
  const backup_id = input.started_at.toISOString();
  const duration_ms = input.completed_at.getTime() - input.started_at.getTime();
  
  // Calculate expiration
  let expires_at: string | null = null;
  if (input.expires_in_days !== null) {
    const expirationDate = new Date(input.completed_at);
    expirationDate.setDate(expirationDate.getDate() + input.expires_in_days);
    expires_at = expirationDate.toISOString();
  }
  
  // Generate human-readable name
  const name = generateBackupName(input.environment, input.trigger, input.started_at, input.migration_version);
  
  const metadata: BackupMetadataV1 = {
    schema_version: CURRENT_SCHEMA_VERSION,
    
    // Identity
    backup_id,
    environment: input.environment,
    name,
    
    // Trigger
    trigger: input.trigger,
    triggered_by: input.triggered_by,
    notes: input.notes,
    
    // D1
    d1_database_id: input.d1_database_id,
    migration_version: input.migration_version,
    d1_row_counts: input.d1_row_counts,
    d1_dump_size_bytes: input.d1_dump_size_bytes,
    d1_tables_included: input.d1_tables_included,
    
    // R2
    r2_bucket: input.r2_bucket,
    r2_blob_count: input.r2_blob_count,
    r2_total_bytes: input.r2_total_bytes,
    r2_backup_mode: input.r2_backup_mode,
    
    // Integrity
    checksum_algorithm: 'sha256',
    checksum_before_encryption: input.checksum_before_encryption,
    checksum_after_encryption: input.checksum_after_encryption,
    
    // Encryption
    encryption_algorithm: 'aes-256-gcm',
    encryption_key_id: input.encryption_key_id,
    encryption_iv: input.encryption_iv,
    encryption_auth_tag: input.encryption_auth_tag,
    
    // Storage
    storage_locations: input.storage_locations,
    
    // Timestamps
    created_at: input.started_at.toISOString(),
    completed_at: input.completed_at.toISOString(),
    duration_ms,
    expires_at,
    
    // Verification (not yet verified)
    last_verified_at: null,
    last_verification_result: null,
  };
  
  // Validate before returning
  validateMetadata(metadata);
  
  return metadata;
}

// ============================================================================
// VALIDATION
// ============================================================================

export class BackupValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(`Backup validation failed: ${message} (field: ${field})`);
    this.name = 'BackupValidationError';
  }
}

/**
 * Validate backup metadata.
 * Throws BackupValidationError if invalid.
 */
export function validateMetadata(metadata: BackupMetadataV1): void {
  // Schema version
  if (metadata.schema_version !== CURRENT_SCHEMA_VERSION) {
    throw new BackupValidationError(
      `Unknown schema version: ${metadata.schema_version}`,
      'schema_version',
      metadata.schema_version
    );
  }
  
  // Backup ID format (ISO 8601)
  if (!isValidISODate(metadata.backup_id)) {
    throw new BackupValidationError(
      'Invalid backup_id format (expected ISO 8601)',
      'backup_id',
      metadata.backup_id
    );
  }
  
  // Critical tables must have row counts
  for (const table of CRITICAL_TABLES) {
    if (metadata.d1_row_counts[table] === undefined) {
      throw new BackupValidationError(
        `Missing row count for critical table: ${table}`,
        'd1_row_counts',
        metadata.d1_row_counts
      );
    }
  }
  
  // Checksums must be hex strings
  if (!isValidSha256(metadata.checksum_before_encryption)) {
    throw new BackupValidationError(
      'Invalid checksum_before_encryption (expected 64-char hex)',
      'checksum_before_encryption',
      metadata.checksum_before_encryption
    );
  }
  
  if (!isValidSha256(metadata.checksum_after_encryption)) {
    throw new BackupValidationError(
      'Invalid checksum_after_encryption (expected 64-char hex)',
      'checksum_after_encryption',
      metadata.checksum_after_encryption
    );
  }
  
  // Must have at least one storage location
  if (metadata.storage_locations.length === 0) {
    throw new BackupValidationError(
      'No storage locations specified',
      'storage_locations',
      metadata.storage_locations
    );
  }
  
  // Duration must be positive
  if (metadata.duration_ms <= 0) {
    throw new BackupValidationError(
      'Duration must be positive',
      'duration_ms',
      metadata.duration_ms
    );
  }
  
  // D1 dump size must be positive
  if (metadata.d1_dump_size_bytes <= 0) {
    throw new BackupValidationError(
      'D1 dump size must be positive',
      'd1_dump_size_bytes',
      metadata.d1_dump_size_bytes
    );
  }
}

/**
 * Validate row counts match expected values (for restore verification).
 */
export function validateRowCounts(
  expected: D1RowCounts,
  actual: D1RowCounts,
  tolerance: number = 0.01  // 1% tolerance
): { valid: boolean; mismatches: string[] } {
  const mismatches: string[] = [];
  
  for (const table of CRITICAL_TABLES) {
    const expectedCount = expected[table];
    const actualCount = actual[table];
    
    if (expectedCount === undefined || actualCount === undefined) {
      mismatches.push(`${table}: missing count`);
      continue;
    }
    
    const diff = Math.abs(expectedCount - actualCount);
    const maxDiff = Math.max(1, Math.floor(expectedCount * tolerance));
    
    if (diff > maxDiff) {
      mismatches.push(`${table}: expected ${expectedCount}, got ${actualCount}`);
    }
  }
  
  return {
    valid: mismatches.length === 0,
    mismatches,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function generateBackupName(
  environment: string,
  trigger: BackupTrigger,
  date: Date,
  migrationVersion: string | null
): string {
  const dateStr = date.toISOString().split('T')[0];  // "2025-12-01"
  
  switch (trigger) {
    case 'cron':
      return `${environment}-daily-${dateStr}`;
    case 'pre-migration':
      return `${environment}-pre-migration-${migrationVersion || 'unknown'}-${dateStr}`;
    case 'manual':
      return `${environment}-manual-${dateStr}`;
    case 'pre-deploy':
      return `${environment}-pre-deploy-${dateStr}`;
    default:
      return `${environment}-${trigger}-${dateStr}`;
  }
}

function isValidISODate(str: string): boolean {
  const date = new Date(str);
  return !isNaN(date.getTime()) && str === date.toISOString();
}

function isValidSha256(str: string): boolean {
  return /^[a-f0-9]{64}$/.test(str);
}

// ============================================================================
// STORAGE PATH GENERATION
// ============================================================================

/**
 * Generate storage key/path for a backup.
 * Format: env=<env>/d1/<year>/<month>/<day>/<backup_id>.enc
 */
export function generateStorageKey(
  environment: string,
  backupId: string,
  type: 'd1' | 'r2' | 'metadata'
): string {
  const date = new Date(backupId);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  // Sanitize backup ID for use as filename
  const filename = backupId.replace(/:/g, '-').replace(/\./g, '-');
  
  return `env=${environment}/${type}/${year}/${month}/${day}/${filename}.enc`;
}

/**
 * Generate metadata-only key (unencrypted JSON for quick access).
 */
export function generateMetadataKey(
  environment: string,
  backupId: string
): string {
  const date = new Date(backupId);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  const filename = backupId.replace(/:/g, '-').replace(/\./g, '-');
  
  return `env=${environment}/metadata/${year}/${month}/${day}/${filename}.json`;
}

// ============================================================================
// SERIALIZATION
// ============================================================================

/**
 * Serialize metadata to JSON for storage.
 */
export function serializeMetadata(metadata: BackupMetadataV1): string {
  return JSON.stringify(metadata, null, 2);
}

/**
 * Parse metadata from JSON with validation.
 */
export function parseMetadata(json: string): BackupMetadataV1 {
  const parsed = JSON.parse(json);
  
  if (!parsed || typeof parsed !== 'object') {
    throw new BackupValidationError('Invalid JSON', 'root', parsed);
  }
  
  if (parsed.schema_version !== CURRENT_SCHEMA_VERSION) {
    throw new BackupValidationError(
      `Unsupported schema version: ${parsed.schema_version}`,
      'schema_version',
      parsed.schema_version
    );
  }
  
  // Full validation
  validateMetadata(parsed as BackupMetadataV1);
  
  return parsed as BackupMetadataV1;
}

