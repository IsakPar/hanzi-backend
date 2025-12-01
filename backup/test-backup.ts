/**
 * Manual Backup Test Script
 * 
 * Usage:
 *   # Dry run (no actual uploads)
 *   npx ts-node backup/test-backup.ts --dry-run
 * 
 *   # Full test (requires credentials)
 *   npx ts-node backup/test-backup.ts
 * 
 * Required environment variables:
 *   - CF_ACCOUNT_ID
 *   - CLOUDFLARE_API_TOKEN
 *   - D1_DATABASE_NAME
 *   - D1_DATABASE_ID
 *   - S3_BUCKET
 *   - S3_REGION
 *   - AWS_ACCESS_KEY_ID
 *   - AWS_SECRET_ACCESS_KEY
 *   - ENCRYPTION_LOCAL_KEY
 */

import { executeBackup, BackupConfig, BackupOptions } from './index';
import { DEFAULT_RETENTION } from './types';

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  
  console.log('');
  console.log('════════════════════════════════════════════════════════════');
  console.log('  BACKUP TEST');
  console.log(`  Mode: ${isDryRun ? 'DRY RUN (no uploads)' : 'FULL TEST'}`);
  console.log('════════════════════════════════════════════════════════════');
  console.log('');
  
  // Check required environment variables
  const requiredVars = [
    'CF_ACCOUNT_ID',
    'CLOUDFLARE_API_TOKEN',
    'D1_DATABASE_NAME',
    'D1_DATABASE_ID',
  ];
  
  if (!isDryRun) {
    requiredVars.push(
      'S3_BUCKET',
      'S3_REGION',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'ENCRYPTION_LOCAL_KEY',
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
    environment: 'development',
    
    d1: {
      database_name: process.env.D1_DATABASE_NAME!,
      database_id: process.env.D1_DATABASE_ID!,
      api_token: process.env.CLOUDFLARE_API_TOKEN!,
      account_id: process.env.CF_ACCOUNT_ID!,
    },
    
    r2: {
      bucket: process.env.R2_BUCKET || 'hanzimaster-backups-test',
      account_id: process.env.CF_ACCOUNT_ID!,
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
  
  const options: BackupOptions = {
    trigger: 'manual',
    triggered_by: 'test-script',
    notes: `Test backup at ${new Date().toISOString()}`,
  };
  
  console.log('Configuration:');
  console.log(`  Environment: ${config.environment}`);
  console.log(`  D1 Database: ${config.d1.database_name} (${config.d1.database_id.slice(0, 8)}...)`);
  console.log(`  S3 Bucket: ${config.s3.bucket}`);
  console.log(`  R2 Bucket: ${config.r2.bucket}`);
  console.log('');
  
  if (isDryRun) {
    console.log('⚠️  DRY RUN MODE - Will only test D1 export and encryption');
    console.log('   No files will be uploaded to S3/R2');
    console.log('');
    
    // Clear S3/R2 credentials to skip uploads
    config.s3.access_key_id = '';
    config.s3.secret_access_key = '';
    config.r2.access_key_id = '';
    config.r2.secret_access_key = '';
  }
  
  // Execute backup
  const result = await executeBackup(config, options);
  
  console.log('');
  console.log('════════════════════════════════════════════════════════════');
  
  if (result.success) {
    console.log('  ✅ BACKUP TEST PASSED');
    console.log(`  Backup ID: ${result.backup_id}`);
    console.log(`  Duration: ${(result.duration_ms / 1000).toFixed(2)}s`);
    console.log(`  Storage locations: ${result.storage_locations.length}`);
    
    if (result.storage_locations.length > 0) {
      console.log('');
      console.log('  Files uploaded:');
      for (const loc of result.storage_locations) {
        console.log(`    - ${loc.provider}://${loc.bucket}/${loc.key}`);
      }
    }
  } else {
    console.log('  ❌ BACKUP TEST FAILED');
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

