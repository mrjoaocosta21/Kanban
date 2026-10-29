try {
  process.loadEnvFile?.();
} catch (error) {
  if (error?.code !== 'ENOENT') {
    throw error;
  }
}

function readPositiveInteger(value, fallback, name) {
  const parsedValue = Number.parseInt(value ?? `${fallback}`, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${name} precisa ser um número inteiro positivo.`);
  }

  return parsedValue;
}

export function createConfig(environment = process.env) {
  const nodeEnv = environment.NODE_ENV ?? 'development';
  const appOrigin = environment.APP_ORIGIN ?? 'http://localhost:5173';
  const databaseUrl = environment.DATABASE_URL
    ?? 'postgres://kanban:kanban@localhost:5432/kanban';
  const isProduction = nodeEnv === 'production';

  return Object.freeze({
    nodeEnv,
    isProduction,
    port: readPositiveInteger(environment.PORT, 3001, 'PORT'),
    appOrigin,
    databaseUrl,
    autoMigrate: environment.AUTO_MIGRATE === 'true',
    sessionCookieName: environment.SESSION_COOKIE_NAME ?? 'kanban_session',
    sessionTtlDays: readPositiveInteger(environment.SESSION_TTL_DAYS, 7, 'SESSION_TTL_DAYS'),
    cookieSecure: environment.COOKIE_SECURE === undefined
      ? isProduction
      : environment.COOKIE_SECURE === 'true',
    trustProxy: environment.TRUST_PROXY === 'true',
  });
}

export const config = createConfig();
