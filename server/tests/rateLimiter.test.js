import test from 'node:test';
import assert from 'node:assert/strict';
import { LoginRateLimiter } from '../src/security/LoginRateLimiter.js';

test('limita tentativas de login e libera após a janela', () => {
  const limiter = new LoginRateLimiter({ maxAttempts: 2, windowMs: 1_000 });

  assert.equal(limiter.consume('client', 0).allowed, true);
  assert.equal(limiter.consume('client', 100).allowed, true);
  assert.equal(limiter.consume('client', 200).allowed, false);
  assert.equal(limiter.consume('client', 1_001).allowed, true);
});

test('reset remove tentativas após login bem-sucedido', () => {
  const limiter = new LoginRateLimiter({ maxAttempts: 1 });
  limiter.consume('client');
  limiter.reset('client');
  assert.equal(limiter.consume('client').allowed, true);
});
