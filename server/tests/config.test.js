import test from 'node:test';
import assert from 'node:assert/strict';
import { createConfig } from '../src/config.js';

test('ativa cookie Secure por padrão em produção', () => {
  const value = createConfig({ NODE_ENV: 'production' });
  assert.equal(value.cookieSecure, true);
});

test('permite desativar cookie Secure somente por configuração explícita', () => {
  const value = createConfig({ NODE_ENV: 'production', COOKIE_SECURE: 'false' });
  assert.equal(value.cookieSecure, false);
});
