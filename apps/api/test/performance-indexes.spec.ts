import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const schema = readFileSync(resolve(process.cwd(), 'prisma/schema.prisma'), 'utf8');
const migration = readFileSync(resolve(process.cwd(), 'prisma/migrations/20261123160000_performance_query_indexes/migration.sql'), 'utf8');

test('Phase 6 query-performance indexes remain declared in Prisma schema and additive migration', () => {
  const indexDeclarations = [
    '@@index([deletedAt, createdAt(sort: Desc), id])',
  ];
  for (const declaration of indexDeclarations) assert.ok(schema.includes(declaration), `Missing schema declaration: ${declaration}`);
  const expectedIndexNames = [
    'Post_deletedAt_createdAt_id_idx',
    'Comment_postId_parentId_deletedAt_createdAt_id_idx',
    'User_deletedAt_deactivatedAt_createdAt_id_idx',
    'Listing_campusId_available_deletedAt_createdAt_id_idx',
    'Event_campusId_deletedAt_startsAt_id_idx',
  ];
  for (const name of expectedIndexNames) assert.ok(migration.includes(name), `Missing additive SQL index: ${name}`);
  assert.ok(migration.includes('CREATE INDEX IF NOT EXISTS'), 'Migration must be safe to rerun at index level');
  assert.ok(!/DROP\s+(TABLE|INDEX)|TRUNCATE|DELETE\s+FROM/i.test(migration), 'Migration must not contain destructive SQL');
});
