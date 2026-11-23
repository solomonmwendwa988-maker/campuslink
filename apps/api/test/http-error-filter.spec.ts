import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeHttpErrorPayload } from '../src/common/http/http-exception.filter.js';

test('safe error payload hides internal server error details', () => {
  const payload = safeHttpErrorPayload(500, 'secret database detail', '/api/v1/posts?token=secret', 'req-123');
  assert.equal(payload.statusCode, 500);
  assert.equal(payload.message, 'Internal server error');
  assert.equal(payload.path, '/api/v1/posts');
  assert.equal(payload.requestId, 'req-123');
  assert.equal('secret database detail'.includes(String(payload.message)), false);
});

test('safe error payload retains client validation messages', () => {
  const payload = safeHttpErrorPayload(400, ['content must not be empty'], '/api/v1/posts', 'req-456');
  assert.deepEqual(payload.message, ['content must not be empty']);
  assert.equal(payload.error, 'Bad Request');
});

test('safe error payload rejects non-string client messages', () => {
  const payload = safeHttpErrorPayload(403, { detail: 'internal object' }, '/api/v1/admin', 'req-789');
  assert.equal(payload.message, 'Request failed');
});
