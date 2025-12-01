/**
 * D1 Database Operations
 * 
 * Uses wrangler CLI for D1 export/import operations.
 * Designed to run in GitHub Actions or local CLI context.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

import { D1RowCounts, BACKUP_TABLES, CRITICAL_TABLES } from './types';

const execAsync = promisify(exec);

// ============================================================================
// D1 EXPORT
// ============================================================================

export interface D1ExportResult {
  /**
   * SQL dump as a buffer.
   */
  dump: Buffer;
  
  /**
   * Row counts for all tables.
   */
  rowCounts: D1RowCounts;
  
  /**
   * Tables included in the dump.
   */
  tables: string[];
  
  /**
   * Size of the dump in bytes.
   */
  sizeBytes: number;
}

export interface D1Config {
  database_name: string;
  database_id: string;
  account_id: string;
  api_token: string;
}

/**
 * Export D1 database using wrangler CLI.
 * 
 * Requires wrangler to be installed and authenticated.
 */
export async function exportD1(config: D1Config): Promise<D1ExportResult> {
  // Create temp directory for export
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hm-backup-'));
  const outputPath = path.join(tempDir, 'export.sql');
  
  try {
    console.log(`[D1] Exporting database: ${config.database_name}`);
    console.log(`[D1] Database ID: ${config.database_id}`);
    
    // Set up environment for wrangler
    const env = {
      ...process.env,
      CLOUDFLARE_API_TOKEN: config.api_token,
      CLOUDFLARE_ACCOUNT_ID: config.account_id,
    };
    
    // Export using wrangler
    // wrangler d1 export <database-name> --output <file>
    const { stdout, stderr } = await execAsync(
      `npx wrangler d1 export ${config.database_name} --output ${outputPath}`,
      { 
        env,
        maxBuffer: 100 * 1024 * 1024, // 100MB buffer for large exports
      }
    );
    
    if (stderr && !stderr.includes('Successfully exported')) {
      console.warn(`[D1] Wrangler stderr: ${stderr}`);
    }
    
    console.log(`[D1] Export complete: ${outputPath}`);
    
    // Read the exported SQL
    const dump = await fs.readFile(outputPath);
    console.log(`[D1] Dump size: ${formatBytes(dump.length)}`);
    
    // Get row counts
    const rowCounts = await getRowCounts(config);
    
    // Extract tables from dump
    const tables = extractTablesFromDump(dump.toString('utf-8'));
    
    // Verify critical tables are present
    for (const table of CRITICAL_TABLES) {
      if (!tables.includes(table)) {
        throw new Error(`Critical table missing from export: ${table}`);
      }
    }
    
    return {
      dump,
      rowCounts,
      tables,
      sizeBytes: dump.length,
    };
    
  } finally {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch (e) {
      console.warn(`[D1] Failed to cleanup temp dir: ${tempDir}`);
    }
  }
}

/**
 * Alternative export method using D1 HTTP API.
 * Use this when wrangler CLI is not available.
 */
export async function exportD1ViaApi(config: D1Config): Promise<D1ExportResult> {
  console.log(`[D1] Exporting via API: ${config.database_id}`);
  
  const tables: string[] = [];
  const rowCounts: D1RowCounts = {} as D1RowCounts;
  const sqlStatements: string[] = [];
  
  // Get list of tables
  const tablesResult = await queryD1(
    config,
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'"
  );
  
  for (const row of tablesResult) {
    const tableName = row.name as string;
    tables.push(tableName);
    
    // Get row count
    const countResult = await queryD1(config, `SELECT COUNT(*) as count FROM "${tableName}"`);
    rowCounts[tableName] = countResult[0]?.count as number || 0;
    
    // Get table schema
    const schemaResult = await queryD1(
      config,
      `SELECT sql FROM sqlite_master WHERE type='table' AND name='${tableName}'`
    );
    const createStatement = schemaResult[0]?.sql as string;
    if (createStatement) {
      sqlStatements.push(createStatement + ';');
    }
    
    // Get all rows (with pagination for large tables)
    const rows = await getAllRows(config, tableName);
    
    if (rows.length > 0) {
      const columns = Object.keys(rows[0]);
      
      // Generate INSERT statements in batches
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const values = batch.map(row => 
          '(' + columns.map(col => escapeValue(row[col])).join(', ') + ')'
        ).join(',\n');
        
        sqlStatements.push(
          `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES\n${values};`
        );
      }
    }
  }
  
  // Add indexes
  const indexesResult = await queryD1(
    config,
    "SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL"
  );
  for (const row of indexesResult) {
    if (row.sql) {
      sqlStatements.push(row.sql + ';');
    }
  }
  
  const dump = Buffer.from(sqlStatements.join('\n\n'), 'utf-8');
  
  return {
    dump,
    rowCounts,
    tables,
    sizeBytes: dump.length,
  };
}

// ============================================================================
// D1 IMPORT (RESTORE)
// ============================================================================

export interface D1ImportResult {
  success: boolean;
  tablesRestored: number;
  rowsInserted: number;
  error?: string;
}

/**
 * Import SQL dump to D1 database using wrangler CLI.
 */
export async function importD1(config: D1Config, dump: Buffer): Promise<D1ImportResult> {
  // Create temp directory for import
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hm-restore-'));
  const inputPath = path.join(tempDir, 'restore.sql');
  
  try {
    console.log(`[D1] Importing to database: ${config.database_name}`);
    
    // Write dump to temp file
    await fs.writeFile(inputPath, dump);
    
    // Set up environment for wrangler
    const env = {
      ...process.env,
      CLOUDFLARE_API_TOKEN: config.api_token,
      CLOUDFLARE_ACCOUNT_ID: config.account_id,
    };
    
    // Clear existing data first (optional - be careful!)
    // For staging, we typically want a clean restore
    console.log(`[D1] Clearing existing data...`);
    await execAsync(
      `npx wrangler d1 execute ${config.database_name} --command "SELECT 'Starting restore...'"`,
      { env }
    );
    
    // Import using wrangler
    // wrangler d1 execute <database-name> --file <file>
    const { stdout, stderr } = await execAsync(
      `npx wrangler d1 execute ${config.database_name} --file ${inputPath}`,
      { 
        env,
        maxBuffer: 100 * 1024 * 1024,
      }
    );
    
    console.log(`[D1] Import complete`);
    
    // Count results
    const tables = extractTablesFromDump(dump.toString('utf-8'));
    
    return {
      success: true,
      tablesRestored: tables.length,
      rowsInserted: 0, // Would need to parse output to get actual count
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[D1] Import failed: ${errorMessage}`);
    
    return {
      success: false,
      tablesRestored: 0,
      rowsInserted: 0,
      error: errorMessage,
    };
    
  } finally {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch (e) {
      console.warn(`[D1] Failed to cleanup temp dir: ${tempDir}`);
    }
  }
}

// ============================================================================
// D1 QUERIES
// ============================================================================

/**
 * Query D1 via HTTP API.
 */
async function queryD1(config: D1Config, sql: string): Promise<Record<string, unknown>[]> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${config.account_id}/d1/database/${config.database_id}/query`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.api_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`D1 query failed: ${response.status} ${error}`);
  }
  
  const data = await response.json() as {
    success: boolean;
    result: Array<{ results: Record<string, unknown>[] }>;
    errors: Array<{ message: string }>;
  };
  
  if (!data.success) {
    throw new Error(`D1 query failed: ${data.errors?.[0]?.message || 'Unknown error'}`);
  }
  
  return data.result?.[0]?.results || [];
}

/**
 * Get all rows from a table with pagination.
 */
async function getAllRows(
  config: D1Config,
  tableName: string,
  batchSize: number = 1000
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let offset = 0;
  
  while (true) {
    const batch = await queryD1(
      config,
      `SELECT * FROM "${tableName}" LIMIT ${batchSize} OFFSET ${offset}`
    );
    
    rows.push(...batch);
    
    if (batch.length < batchSize) {
      break;
    }
    
    offset += batchSize;
  }
  
  return rows;
}

/**
 * Get row counts for all backup tables.
 */
export async function getRowCounts(config: D1Config): Promise<D1RowCounts> {
  console.log(`[D1] Getting row counts...`);
  
  const rowCounts: D1RowCounts = {
    ba_user: 0,
    ba_session: 0,
    refresh_tokens: 0,
    users: 0,
    vocabulary: 0,
    lessons: 0,
    stories: 0,
    units: 0,
    user_progress: 0,
    user_vocabulary: 0,
    subscriptions: 0,
  };
  
  // Build a query to get all counts at once
  const countQueries = BACKUP_TABLES.map(table => 
    `SELECT '${table}' as table_name, COUNT(*) as count FROM "${table}"`
  ).join(' UNION ALL ');
  
  try {
    const results = await queryD1(config, countQueries);
    
    for (const row of results) {
      const tableName = row.table_name as string;
      const count = row.count as number;
      rowCounts[tableName] = count;
    }
  } catch (error) {
    // If union query fails, try individual queries
    console.warn(`[D1] Batch count failed, trying individual queries...`);
    
    for (const table of BACKUP_TABLES) {
      try {
        const result = await queryD1(config, `SELECT COUNT(*) as count FROM "${table}"`);
        rowCounts[table] = result[0]?.count as number || 0;
      } catch (e) {
        console.warn(`[D1] Failed to count ${table}: ${e}`);
        rowCounts[table] = 0;
      }
    }
  }
  
  console.log(`[D1] Row counts:`, rowCounts);
  return rowCounts;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Extract table names from SQL dump.
 */
function extractTablesFromDump(sql: string): string[] {
  const tables: string[] = [];
  const regex = /CREATE TABLE\s+(?:"([^"]+)"|(\w+))/gi;
  let match;
  
  while ((match = regex.exec(sql)) !== null) {
    tables.push(match[1] || match[2]);
  }
  
  return tables;
}

/**
 * Escape a value for SQL INSERT.
 */
function escapeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  
  if (typeof value === 'number') {
    return String(value);
  }
  
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }
  
  if (typeof value === 'string') {
    // Escape single quotes by doubling them
    return `'${value.replace(/'/g, "''")}'`;
  }
  
  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }
  
  // For objects/arrays, JSON stringify
  return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

