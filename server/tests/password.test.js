import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/security/password.js';

test('scrypt gera hashes com salt e valida apenas a senha correta', async () => {
  const firstHash = await hashPassword('A-secure-password!');
  const secondHash = await hashPassword('A-secure-password!');

  assert.notEqual(firstHash, secondHash);
  assert.equal(await verifyPassword('A-secure-password!', firstHash), true);
  assert.equal(await verifyPassword('wrong-password', firstHash), false);
  assert.equal(await verifyPassword('A-secure-password!', 'invalid-hash'), false);
});

test('rejeita senhas fora dos limites de segurança', async () => {
  await assert.rejects(() => hashPassword('short'));
  await assert.rejects(() => hashPassword('x'.repeat(129)));
});
