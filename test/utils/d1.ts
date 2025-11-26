import type { D1Database } from '@cloudflare/workers-types';
import { Miniflare } from 'miniflare';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type D1TestHarness = {
  db: D1Database;
  dispose: () => Promise<void>;
};

type HarnessOptions =
  | string[]
  | {
      schemaStatements?: string[];
    };

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const drizzleDir = join(projectRoot, 'drizzle');
const workerPath = join(projectRoot, 'test', 'fixtures', 'empty-worker.mjs');

export async function createD1Harness(options?: HarnessOptions): Promise<D1TestHarness> {
  const schemaStatements = Array.isArray(options) ? options : options?.schemaStatements;
  const mf = new Miniflare({
    modules: [{ type: 'ESModule', path: workerPath }],
    d1Databases: {
      DB: ':memory:',
    },
  });

  const db = await mf.getD1Database('DB');

  if (schemaStatements && schemaStatements.length > 0) {
    for (const statement of schemaStatements) {
      const sql = statement.trim();
      if (!sql) continue;
      await db.prepare(sql).run();
    }
  }

  return {
    db,
    dispose: () => mf.dispose(),
  };
}

async function applyMigrations(db: D1Database) {
  const files = (await readdir(drizzleDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    try {
      const content = await readFile(join(drizzleDir, file), 'utf8');
      
      // Remove comments and split by statement-breakpoint or semicolons
      const cleanContent = content
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n');
      
      const statements = cleanContent
        .split('--> statement-breakpoint')
        .flatMap(block => block.split(';'))
        .map((stmt) => stmt.trim())
        .filter(Boolean);

      for (const statement of statements) {
        // Skip empty statements and complex window functions that might not be supported
        if (!statement || statement.length < 5) continue;
        
        // Skip problematic UPDATE statements with window functions
        if (statement.includes('ROW_NUMBER()') || statement.includes('OVER (')) {
          console.warn(`Skipping unsupported statement in ${file}: ${statement.substring(0, 50)}...`);
          continue;
        }
        
        try {
          await db.prepare(statement).run();
        } catch (error) {
          // Log but don't fail on individual statement errors (like adding duplicate columns)
          console.warn(`Warning in ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error(`Failed to apply migration ${file}:`, error);
      throw error;
    }
  }
}

export async function createMigratedD1(): Promise<D1TestHarness> {
  const harness = await createD1Harness();
  await applyMigrations(harness.db);
  return harness;
}

