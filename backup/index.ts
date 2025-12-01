/**
 * Backup System
 * 
 * Enterprise-grade backup system for HanziMaster.
 * 
 * Architecture:
 * - R2 (hot): 7-14 day retention, quick restore
 * - S3 (warm): 30-60 day retention, cross-cloud redundancy
 * - S3 Glacier (cold): 6-12 month retention, disaster recovery
 * - S3 Glacier 2nd Account: Break-glass, account compromise recovery
 * 
 * @module backup
 */

// Types
export * from './types';

// Metadata
export {
  createBackupMetadata,
  validateMetadata,
  validateRowCounts,
  generateStorageKey,
  generateMetadataKey,
  serializeMetadata,
  parseMetadata,
  BackupValidationError,
} from './metadata';

// Backup execution
export {
  executeBackup,
  type BackupOptions,
  type BackupResult,
} from './backup';

// Restore
export {
  executeRestore,
  type RestoreOptions,
  type RestoreResult,
} from './restore';

// D1 operations
export {
  exportD1,
  exportD1ViaApi,
  importD1,
  getRowCounts,
  type D1Config,
  type D1ExportResult,
  type D1ImportResult,
} from './d1';

