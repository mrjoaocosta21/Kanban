import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { createDatabasePool, withTransaction } from './database.js';

const migrationsDirectory = fileURLToPath(new URL('../db/migrations/', import.meta.url));

export async function runMigrations(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((filename) => filename.endsWith('.sql'))
    .sort();

  const { rows: appliedRows } = await pool.query('SELECT filename FROM schema_migrations');
  const appliedMigrations = new Set(appliedRows.map((row) => row.filename));

  for (const filename of migrationFiles) {
    if (appliedMigrations.has(filename)) {
      continue;
    }

    const sql = await readFile(`${migrationsDirectory}/${filename}`, 'utf8');
    await withTransaction(pool, async (client) => {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pool = createDatabasePool(config.databaseUrl);

  runMigrations(pool)
    .then(() => {
      console.log('Migrations aplicadas com sucesso.');
    })
    .catch((error) => {
      console.error('Falha ao aplicar migrations:', error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
