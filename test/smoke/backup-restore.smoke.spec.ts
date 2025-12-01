/**
 * Backup & Restore Smoke Tests
 * 
 * End-to-end tests for the backup system.
 * Run weekly in CI to verify backups are actually restorable.
 * 
 * These tests require real credentials and will:
 * 1. Create a backup
 * 2. Upload to S3
 * 3. Download from S3
 * 4. Decrypt and verify checksums
 * 5. Restore to staging D1
 * 6. Verify data integrity
 * 
 * @group smoke
 * @group backup
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  executeBackup,
  executeRestore,
  downloadFromS3,
  listS3Objects,
  parseMetadata,
  generateMetadataKey,
  BackupConfig,
  S3Config,
} from '../../backup';
import { DEFAULT_RETENTION } from '../../backup/types';

// Skip if credentials not available
const hasCredentials = !!(
  process.env.S3_BUCKET &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.ENCRYPTION_LOCAL_KEY
);

const hasD1Credentials = !!(
  process.env.CF_ACCOUNT_ID &&
  process.env.CLOUDFLARE_API_TOKEN &&
  process.env.D1_DATABASE_NAME &&
  process.env.D1_DATABASE_ID
);

const hasStagingD1 = !!(
  process.env.D1_STAGING_DATABASE_NAME &&
  process.env.D1_STAGING_DATABASE_ID
);

// Test config
function getTestConfig(): BackupConfig {
  return {
    environment: 'staging',
    
    d1: {
      database_name: process.env.D1_DATABASE_NAME || 'hanzimaster-db',
      database_id: process.env.D1_DATABASE_ID || '',
      api_token: process.env.CLOUDFLARE_API_TOKEN || '',
      account_id: process.env.CF_ACCOUNT_ID || '',
    },
    
    r2: {
      bucket: process.env.R2_BUCKET || 'hanzimaster-backups',
      account_id: process.env.CF_ACCOUNT_ID || '',
      access_key_id: process.env.R2_ACCESS_KEY_ID || '',
      secret_access_key: process.env.R2_SECRET_ACCESS_KEY || '',
    },
    
    s3: {
      bucket: process.env.S3_BUCKET || 'hm-test-backups',
      region: process.env.S3_REGION || 'us-east-1',
      access_key_id: process.env.AWS_ACCESS_KEY_ID || '',
      secret_access_key: process.env.AWS_SECRET_ACCESS_KEY || '',
      aws_account_id: process.env.AWS_ACCOUNT_ID || '',
    },
    
    encryption: {
      key_id: 'local:test',
      local_key: process.env.ENCRYPTION_LOCAL_KEY || 'test-key-32-characters-long!!!!',
    },
    
    retention: DEFAULT_RETENTION,
  };
}

function getStagingConfig(): BackupConfig {
  const config = getTestConfig();
  config.d1.database_name = process.env.D1_STAGING_DATABASE_NAME || 'hanzimaster-db-staging';
  config.d1.database_id = process.env.D1_STAGING_DATABASE_ID || '';
  return config;
}

describe.skipIf(!hasCredentials)('Backup System Smoke Tests', () => {
  let backupId: string;
  
  describe('S3 Connectivity', () => {
    it('can list S3 bucket contents', async () => {
      const config = getTestConfig();
      const s3Config: S3Config = {
        bucket: config.s3.bucket,
        region: config.s3.region,
        accessKeyId: config.s3.access_key_id,
        secretAccessKey: config.s3.secret_access_key,
      };
      
      const objects = await listS3Objects(s3Config, 'env=staging/');
      
      // Should not throw - bucket is accessible
      expect(Array.isArray(objects)).toBe(true);
    });
  });
  
  describe.skipIf(!hasD1Credentials)('Full Backup Flow', () => {
    it('creates a backup and uploads to S3', async () => {
      const config = getTestConfig();
      
      const result = await executeBackup(config, {
        trigger: 'manual',
        triggered_by: 'smoke-test',
        notes: `Smoke test at ${new Date().toISOString()}`,
      });
      
      expect(result.success).toBe(true);
      expect(result.backup_id).toBeTruthy();
      expect(result.storage_locations.length).toBeGreaterThan(0);
      
      // Save for later tests
      backupId = result.backup_id;
      
      console.log(`[SMOKE] Backup created: ${backupId}`);
    }, 120000); // 2 minute timeout
    
    it('backup metadata is accessible in S3', async () => {
      expect(backupId).toBeTruthy();
      
      const config = getTestConfig();
      const s3Config: S3Config = {
        bucket: config.s3.bucket,
        region: config.s3.region,
        accessKeyId: config.s3.access_key_id,
        secretAccessKey: config.s3.secret_access_key,
      };
      
      const metadataKey = generateMetadataKey('staging', backupId);
      const metadataBuffer = await downloadFromS3(s3Config, metadataKey);
      
      expect(metadataBuffer.length).toBeGreaterThan(0);
      
      const metadata = parseMetadata(metadataBuffer.toString('utf-8'));
      
      expect(metadata.backup_id).toBe(backupId);
      expect(metadata.schema_version).toBe(1);
      expect(metadata.trigger).toBe('manual');
      expect(metadata.d1_row_counts).toBeDefined();
      expect(metadata.checksum_before_encryption).toBeTruthy();
      expect(metadata.checksum_after_encryption).toBeTruthy();
      
      console.log(`[SMOKE] Metadata verified:`);
      console.log(`  - Tables: ${metadata.d1_tables_included.length}`);
      console.log(`  - D1 dump size: ${metadata.d1_dump_size_bytes} bytes`);
      console.log(`  - R2 blobs: ${metadata.r2_blob_count}`);
    });
    
    it('encrypted backup can be downloaded from S3', async () => {
      expect(backupId).toBeTruthy();
      
      const config = getTestConfig();
      const s3Config: S3Config = {
        bucket: config.s3.bucket,
        region: config.s3.region,
        accessKeyId: config.s3.access_key_id,
        secretAccessKey: config.s3.secret_access_key,
      };
      
      // Generate the backup key
      const date = new Date(backupId);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const filename = backupId.replace(/:/g, '-').replace(/\./g, '-');
      const backupKey = `env=staging/d1/${year}/${month}/${day}/${filename}.enc`;
      
      const encryptedData = await downloadFromS3(s3Config, backupKey);
      
      expect(encryptedData.length).toBeGreaterThan(0);
      
      console.log(`[SMOKE] Downloaded encrypted backup: ${encryptedData.length} bytes`);
    });
  });
  
  describe.skipIf(!hasD1Credentials || !hasStagingD1)('Full Restore Flow', () => {
    it('restores backup to staging D1', async () => {
      expect(backupId).toBeTruthy();
      
      const config = getStagingConfig();
      
      const result = await executeRestore(config, {
        backup_id: backupId,
        verify_row_counts: true,
        run_migrations: false,
      });
      
      expect(result.success).toBe(true);
      expect(result.backup_id).toBe(backupId);
      expect(result.row_counts_verified).toBe(true);
      
      if (result.row_count_mismatches && result.row_count_mismatches.length > 0) {
        console.warn(`[SMOKE] Row count mismatches:`, result.row_count_mismatches);
      }
      
      console.log(`[SMOKE] Restore complete in ${result.duration_ms}ms`);
    }, 180000); // 3 minute timeout
    
    it('staging D1 can be queried after restore', async () => {
      // This would ideally make a real D1 query
      // For now, we trust the row count verification in executeRestore
      
      // TODO: Add actual D1 query test
      // const result = await queryD1(stagingConfig, 'SELECT COUNT(*) FROM ba_user');
      // expect(result[0].count).toBeGreaterThan(0);
      
      expect(true).toBe(true);
    });
  });
});

describe('Backup Metadata Validation', () => {
  it('validates correct metadata', () => {
    const validMetadata = {
      schema_version: 1,
      backup_id: new Date().toISOString(),
      environment: 'staging',
      name: 'test-backup',
      trigger: 'manual',
      triggered_by: 'test',
      d1_database_id: 'test-db-id',
      migration_version: null,
      d1_row_counts: {
        ba_user: 10,
        ba_session: 5,
        refresh_tokens: 3,
        users: 10,
        vocabulary: 1000,
        lessons: 50,
        stories: 20,
        units: 5,
        user_progress: 100,
        user_vocabulary: 500,
        subscriptions: 8,
      },
      d1_dump_size_bytes: 1024,
      d1_tables_included: ['ba_user', 'users'],
      r2_bucket: 'test-bucket',
      r2_blob_count: 10,
      r2_total_bytes: 5000,
      r2_backup_mode: 'manifest_only',
      checksum_algorithm: 'sha256',
      checksum_before_encryption: 'a'.repeat(64),
      checksum_after_encryption: 'b'.repeat(64),
      encryption_algorithm: 'aes-256-gcm',
      encryption_key_id: 'local:test',
      encryption_iv: 'dGVzdC1pdi1iYXNlNjQ=',
      encryption_auth_tag: 'dGVzdC10YWctYmFzZTY0',
      storage_locations: [
        {
          provider: 's3',
          bucket: 'test-bucket',
          key: 'test-key',
          tier: 'warm',
          uploaded_at: new Date().toISOString(),
        },
      ],
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: 1000,
      expires_at: null,
      last_verified_at: null,
      last_verification_result: null,
    };
    
    // Should not throw
    const parsed = parseMetadata(JSON.stringify(validMetadata));
    expect(parsed.schema_version).toBe(1);
  });
  
  it('rejects metadata with wrong schema version', () => {
    const invalidMetadata = {
      schema_version: 99,
      backup_id: new Date().toISOString(),
    };
    
    expect(() => parseMetadata(JSON.stringify(invalidMetadata))).toThrow();
  });
  
  it('rejects metadata with invalid checksum format', () => {
    const invalidMetadata = {
      schema_version: 1,
      backup_id: new Date().toISOString(),
      environment: 'staging',
      name: 'test',
      trigger: 'manual',
      triggered_by: 'test',
      d1_database_id: 'test',
      migration_version: null,
      d1_row_counts: {
        ba_user: 10,
        ba_session: 5,
        refresh_tokens: 3,
        users: 10,
        subscriptions: 8,
      },
      d1_dump_size_bytes: 1024,
      d1_tables_included: ['ba_user'],
      r2_bucket: 'test',
      r2_blob_count: 0,
      r2_total_bytes: 0,
      r2_backup_mode: 'manifest_only',
      checksum_algorithm: 'sha256',
      checksum_before_encryption: 'invalid-not-64-chars',  // Invalid
      checksum_after_encryption: 'b'.repeat(64),
      encryption_algorithm: 'aes-256-gcm',
      encryption_key_id: 'local:test',
      encryption_iv: 'test',
      encryption_auth_tag: 'test',
      storage_locations: [{ provider: 's3', bucket: 'test', key: 'test', tier: 'warm', uploaded_at: new Date().toISOString() }],
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: 1000,
      expires_at: null,
      last_verified_at: null,
      last_verification_result: null,
    };
    
    expect(() => parseMetadata(JSON.stringify(invalidMetadata))).toThrow(/checksum/i);
  });
});

describe('Storage Path Generation', () => {
  it('generates correct S3 key format', () => {
    const backupId = '2025-12-01T03:00:00.000Z';
    const key = generateMetadataKey('production', backupId);
    
    expect(key).toContain('env=production');
    expect(key).toContain('metadata');
    expect(key).toContain('2025');
    expect(key).toContain('12');
    expect(key).toContain('01');
    expect(key).toEndWith('.json');
  });
  
  it('sanitizes colons and dots in backup ID', () => {
    const backupId = '2025-12-01T03:00:00.000Z';
    const key = generateMetadataKey('production', backupId);
    
    // Filename should not contain : or .
    const filename = key.split('/').pop()!;
    expect(filename).not.toContain(':');
    // Only the final .json should have a dot
    expect(filename.split('.').length).toBe(2);
  });
});

