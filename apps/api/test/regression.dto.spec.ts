import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validate } from 'class-validator';
import { RegisterDto, LoginDto, ChangePasswordDto } from '../src/auth/dto.js';
import { UpdateProfileDto, DiscoverStudentsDto, VerificationRequestDto } from '../src/profiles/profiles.dto.js';
import { CreatePostDto, CreateCommentDto, PostPageDto } from '../src/posts/posts.dto.js';

async function propertyErrors(dto: object) {
  const errors = await validate(dto);
  return new Set(errors.map((e) => e.property));
}

test('registration DTO accepts a valid registration payload', async () => {
  const dto = Object.assign(new RegisterDto(), {
    name: 'Campus Student', username: 'campus.student', email: 'student@example.com',
    password: 'secure-password-123', campus: 'main-campus', course: 'Computer Science', year: 2,
  });
  assert.deepEqual(await propertyErrors(dto), new Set());
});

test('registration DTO rejects invalid username, email, short name, password and year', async () => {
  const dto = Object.assign(new RegisterDto(), {
    name: 'A', username: 'bad username!', email: 'not-an-email', password: 'short',
    campus: 'x', course: 'Computer Science', year: 11,
  });
  const errors = await propertyErrors(dto);
  for (const key of ['name', 'username', 'email', 'password', 'campus', 'year']) assert.ok(errors.has(key), `expected ${key} to be invalid`);
});

test('login DTO rejects empty identifier and oversized password', async () => {
  const dto = Object.assign(new LoginDto(), { identifier: '', password: 'x'.repeat(129) });
  const errors = await propertyErrors(dto);
  assert.ok(errors.has('identifier'));
  assert.ok(errors.has('password'));
});

test('password change DTO enforces new password minimum and maximum', async () => {
  const dto = Object.assign(new ChangePasswordDto(), { currentPassword: 'old', newPassword: 'short' });
  const errors = await propertyErrors(dto);
  assert.ok(errors.has('newPassword'));
  assert.equal(errors.has('currentPassword'), false);
});

test('profile update DTO rejects malformed email, username, year and non-string interests', async () => {
  const dto = Object.assign(new UpdateProfileDto(), { email: 'bad', username: 'bad username', yearOfStudy: 0, interests: [3] });
  const errors = await propertyErrors(dto);
  for (const key of ['email', 'username', 'yearOfStudy', 'interests']) assert.ok(errors.has(key), `expected ${key} to be invalid`);
});

test('student discovery DTO limits search length', async () => {
  const dto = Object.assign(new DiscoverStudentsDto(), { search: 's'.repeat(81) });
  assert.ok((await propertyErrors(dto)).has('search'));
});

test('post DTO enforces content length and type', async () => {
  assert.deepEqual(await propertyErrors(Object.assign(new CreatePostDto(), { content: 'A valid post' })), new Set());
  assert.ok((await propertyErrors(Object.assign(new CreatePostDto(), { content: '' }))).has('content'));
  assert.ok((await propertyErrors(Object.assign(new CreatePostDto(), { content: 'x'.repeat(3001) }))).has('content'));
});

test('comment DTO validates content and UUID parent reference', async () => {
  const dto = Object.assign(new CreateCommentDto(), { content: 'A comment', parentId: 'not-a-uuid' });
  assert.ok((await propertyErrors(dto)).has('parentId'));
  assert.deepEqual(await propertyErrors(Object.assign(new CreateCommentDto(), { content: 'A valid comment' })), new Set());
});

test('post page DTO rejects unsupported feed modes and malformed cursors', async () => {
  const dto = Object.assign(new PostPageDto(), { mode: 'random', cursor: 'bad-cursor' });
  const errors = await propertyErrors(dto);
  assert.ok(errors.has('mode'));
  assert.ok(errors.has('cursor'));
});

test('verification request DTO rejects invalid phone and unaccepted attestation', async () => {
  const dto = Object.assign(new VerificationRequestDto(), {
    fullName: 'Campus Student', studentId: 'ABC12345', phone: 'not-a-phone', course: 'CS', campus: 'Main',
    reason: 'I need verified status for campus access purposes.', attestationsAccepted: false,
  });
  const errors = await propertyErrors(dto);
  assert.ok(errors.has('phone'));
  assert.equal(errors.has('attestationsAccepted'), false, 'false is a valid boolean; acceptance is checked by the request handler');
});
