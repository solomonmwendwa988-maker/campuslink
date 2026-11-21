import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createOpaqueToken, hashOpaqueToken, hashPassword, verifyPassword } from '../src/auth/credentials.js';

test('passwords are bcrypt hashed and only matching passwords verify', async () => {
  const plaintext = 'campuslink-test-password-2026';
  const hash = await hashPassword(plaintext);
  assert.notEqual(hash, plaintext);
  assert.match(hash, /^\$2[aby]\$12\$/);
  assert.equal(await verifyPassword(plaintext, hash), true);
  assert.equal(await verifyPassword('not-the-password', hash), false);
});

test('refresh tokens are opaque, high entropy, and stored as one-way hashes', () => {
  const first = createOpaqueToken();
  const second = createOpaqueToken();
  assert.notEqual(first, second);
  assert.ok(first.length >= 64);
  assert.notEqual(hashOpaqueToken(first), first);
  assert.equal(hashOpaqueToken(first), hashOpaqueToken(first));
  assert.notEqual(hashOpaqueToken(first), hashOpaqueToken(second));
});
