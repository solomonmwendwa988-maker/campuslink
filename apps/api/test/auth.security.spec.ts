import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createOpaqueToken, hashOpaqueToken, hashPassword, verifyPassword } from '../src/auth/credentials.js';
import { maskLoginIdentifier, resolveTrustProxyHops } from '../src/auth/security.utils.js';
import { validate } from 'class-validator';
import { RegisterDto, LoginDto } from '../src/auth/dto.js';

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


test('login identifiers are masked before being written to security activity records', () => {
  assert.equal(maskLoginIdentifier('solomon@example.com'), 's***n@example.com');
  assert.equal(maskLoginIdentifier('abc@example.com'), 'a***c@example.com');
  assert.equal(maskLoginIdentifier('student123'), 's***');
  assert.equal(maskLoginIdentifier(''), '***');
  assert.ok(maskLoginIdentifier('x'.repeat(500)).length <= 160);
});

test('trust proxy defaults are conservative locally and suitable for one production proxy', () => {
  assert.equal(resolveTrustProxyHops(undefined, false), 0);
  assert.equal(resolveTrustProxyHops(undefined, true), 1);
  assert.equal(resolveTrustProxyHops('0', true), 0);
  assert.equal(resolveTrustProxyHops('2', true), 2);
  assert.throws(() => resolveTrustProxyHops('-1', true));
  assert.throws(() => resolveTrustProxyHops('6', true));
  assert.throws(() => resolveTrustProxyHops('proxy', true));
});

test('registration DTO rejects malformed or oversized profile arrays', async () => {
  const dto = Object.assign(new RegisterDto(), {
    name: 'Test Student', username: 'test_student', email: 'test@example.com', password: 'TestPassword123',
    campus: 'Main Campus', course: 'Computer Science', year: 2,
    interests: ['valid', 42], skills: ['coding'],
  });
  const errors = await validate(dto);
  assert.ok(errors.some((error) => error.property === 'interests'));
  dto.interests = Array.from({ length: 21 }, (_, i) => `interest-${i}`);
  const sizeErrors = await validate(dto);
  assert.ok(sizeErrors.some((error) => error.property === 'interests'));
});

test('login DTO limits identifiers to a reasonable maximum length', async () => {
  const dto = Object.assign(new LoginDto(), { identifier: 'a'.repeat(255), password: 'password' });
  const errors = await validate(dto);
  assert.ok(errors.some((error) => error.property === 'identifier'));
});
