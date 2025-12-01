/**
 * Manual Restore Test Script
 * 
 * Tests the full restore flow:
 * 1. Download latest backup from S3
 * 2. Decrypt and verify checksums
 * 3. Restore to staging D1
 * 4. Verify row counts
 * 
 * Usage:
 *   # Restore latest backup
 *   npx ts-node backup/test-restore.ts
 * 
 *   # Restore specific backup
 *   npx ts-node backup/test-restore.ts 2025-12-01T03:00:00.000Z
 * 
 *   # Dry run (download + decrypt only, no restore)
 *   npx ts-node backup/test-restore.ts --dry-run
 */

import { executeRestore, BackupConfig, RestoreOptions } from './index';
import { DEFAULT_RETENTION } from './types';

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const backupId = args.find(a => !a.startsWith('--'));
  
  console.log('');
  console.log('════════════════════════════════════════════════════════════');
  console.log('  RESTORE TEST');
  console.log(`  Mode: ${isDryRun ? 'DRY RUN (download + verify only)' : 'FULL RESTORE'}`);
  if (backupId) {
    console.log(`  Backup ID: ${backupId}`);
  } else {
    console.log(`  Backup ID: (latest)`);
  }
  console.log('════════════════════════════════════════════════════════════');
  console.log('');
  
  // Check required environment variables
  const requiredVars = [
    'S3_BUCKET',
    'S3_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'ENCRYPTION_LOCAL_KEY',
  ];
  
  if (!isDryRun) {
    requiredVars.push(
      'CF_ACCOUNT_ID',
      'CLOUDFLARE_API_TOKEN',
      'D1_STAGING_DATABASE_NAME',
      'D1_STAGING_DATABASE_ID',
    );
  }
  
  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    for (const v of missing) {
      console.error(`   - ${v}`);
    }
    console.error('');
    console.error('Set these variables and try again.');
    process.exit(1);
  }
  
  // Build config
  const config: BackupConfig = {
    environment: 'staging',
    
    d1: {
      database_name: process.env.D1_STAGING_DATABASE_NAME || 'hanzimaster-db-staging',
      database_id: process.env.D1_STAGING_DATABASE_ID || '',
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
      bucket: process.env.S3_BUCKET!,
      region: process.env.S3_REGION!,
      access_key_id: process.env.AWS_ACCESS_KEY_ID!,
      secret_access_key: process.env.AWS_SECRET_ACCESS_KEY!,
      aws_account_id: process.env.AWS_ACCOUNT_ID || '',
    },
    
    encryption: {
      key_id: 'local:test',
      local_key: process.env.ENCRYPTION_LOCAL_KEY!,
    },
    
    retention: DEFAULT_RETENTION,
  };
  
  const options: RestoreOptions = {
    backup_id: backupId,
    verify_row_counts: !isDryRun,
    run_migrations: false,  // Don't run migrations during test
  };
  
  console.log('Configuration:');
  console.log(`  S3 Bucket: ${config.s3.bucket}`);
  console.log(`  Target D1: ${config.d1.database_name}`);
  console.log('');
  
  if (isDryRun) {
    console.log('⚠️  DRY RUN MODE - Will download and verify but not restore');
    console.log('');
  }
  
  // Execute restore
  const result = await executeRestore(config, options);
  
  console.log('');
  console.log('════════════════════════════════════════════════════════════');
  
  if (result.success) {
    console.log('  ✅ RESTORE TEST PASSED');
    console.log(`  Backup ID: ${result.backup_id}`);
    console.log(`  Duration: ${(result.duration_ms / 1000).toFixed(2)}s`);
    console.log(`  Row counts verified: ${result.row_counts_verified}`);
    
    if (result.row_count_mismatches && result.row_count_mismatches.length > 0) {
      console.log('');
      console.log('  ⚠️  Row count mismatches:');
      for (const mismatch of result.row_count_mismatches) {
        console.log(`    - ${mismatch}`);
      }
    }
  } else {
    console.log('  ❌ RESTORE TEST FAILED');
    console.log(`  Error: ${result.error}`);
  }
  
  console.log('════════════════════════════════════════════════════════════');
  console.log('');
  
  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});

