import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = Object.freeze({ N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
    throw new Error('A senha precisa ter entre 10 e 128 caracteres.');
  }

  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS);

  return [
    'scrypt',
    SCRYPT_OPTIONS.N,
    SCRYPT_OPTIONS.r,
    SCRYPT_OPTIONS.p,
    salt.toString('base64url'),
    derivedKey.toString('base64url'),
  ].join('$');
}

export async function verifyPassword(password, encodedHash) {
  try {
    const [algorithm, n, r, p, saltValue, hashValue] = encodedHash.split('$');
    if (algorithm !== 'scrypt') {
      return false;
    }

    const expectedHash = Buffer.from(hashValue, 'base64url');
    const actualHash = await scrypt(password, Buffer.from(saltValue, 'base64url'), expectedHash.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 64 * 1024 * 1024,
    });

    return expectedHash.length === actualHash.length && timingSafeEqual(expectedHash, actualHash);
  } catch {
    return false;
  }
}
