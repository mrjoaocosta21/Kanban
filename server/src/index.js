import { createServer } from 'node:http';
import { createApp } from './app.js';
import { config } from './config.js';
import { createDatabasePool } from './database.js';
import { runMigrations } from './migrate.js';

const pool = createDatabasePool(config.databaseUrl);

if (config.autoMigrate) {
  await runMigrations(pool);
}

await pool.query('SELECT 1');
await pool.query('DELETE FROM sessions WHERE expires_at <= NOW()');

const app = createApp({ pool, config });
const server = createServer(app);

server.listen(config.port, () => {
  console.log(`API Kanban disponível na porta ${config.port}.`);
});

async function shutdown(signal) {
  console.log(`${signal} recebido. Encerrando API.`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
