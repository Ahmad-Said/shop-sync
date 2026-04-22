import { promises as fs } from 'fs';
import path from 'path';
import { pool } from './pool.js';

interface MigrationFile {
  version: string;
  name: string;
  filePath: string;
}

function migrationDirs(): string[] {
  return [
    path.resolve(process.cwd(), 'src/db/migrations'),
    path.resolve(process.cwd(), 'dist/db/migrations'),
  ];
}

async function resolveMigrationDir(): Promise<string | null> {
  for (const dir of migrationDirs()) {
    try {
      const stat = await fs.stat(dir);
      if (stat.isDirectory()) return dir;
    } catch {
      // keep searching
    }
  }
  return null;
}

function toMigrationFile(dir: string, fileName: string): MigrationFile | null {
  if (!fileName.endsWith('.sql')) return null;
  const [version] = fileName.split('_');
  if (!version) return null;
  return {
    version,
    name: fileName,
    filePath: path.join(dir, fileName),
  };
}

export async function runMigrations(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const dir = await resolveMigrationDir();
  if (!dir) {
    console.log('No migrations directory found, skipping migrations');
    return;
  }

  const files = (await fs.readdir(dir))
    .map((fileName) => toMigrationFile(dir, fileName))
    .filter((file): file is MigrationFile => file !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const migration of files) {
    const alreadyApplied = await pool.query(
      'SELECT 1 FROM schema_migrations WHERE version = $1',
      [migration.version]
    );

    if (alreadyApplied.rows.length > 0) continue;

    const sql = await fs.readFile(migration.filePath, 'utf8');
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
        [migration.version, migration.name]
      );
      await client.query('COMMIT');
      console.log(`Applied migration ${migration.name}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}


