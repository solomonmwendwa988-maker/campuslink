import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load DATABASE_URL from apps/api/.env when the shell has not already provided it.
if (!process.env.DATABASE_URL) {
  try {
    const envText = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
    const match = envText.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/m);
    if (match) process.env.DATABASE_URL = match[1].trim().replace(/^['\"]|['\"]$/g, '');
  } catch {}
}
const prisma = new PrismaClient();
const checks = [
  ['Profiles with campus/university mismatch', `SELECT COUNT(*)::int AS count FROM "Profile" p JOIN "Campus" c ON c.id=p."campusId" WHERE c."universityId" <> p."universityId"`],
  ['Self-follow relationships', `SELECT COUNT(*)::int AS count FROM "Follow" WHERE "followerId" = "followedId"`],
  ['Self-block relationships', `SELECT COUNT(*)::int AS count FROM "Block" WHERE "blockerId" = "blockedId"`],
  ['Self-account mutes', `SELECT COUNT(*)::int AS count FROM "AccountMute" WHERE "userId" = "mutedUserId"`],
  ['Comments whose parent belongs to another post', `SELECT COUNT(*)::int AS count FROM "Comment" child JOIN "Comment" parent ON parent.id=child."parentId" WHERE child."postId" <> parent."postId"`],
  ['Events with end time before start time', `SELECT COUNT(*)::int AS count FROM "Event" WHERE "endsAt" < "startsAt"`],
  ['Listings with negative prices', `SELECT COUNT(*)::int AS count FROM "Listing" WHERE price < 0`],
  ['Messages whose sender is not a conversation participant', `SELECT COUNT(*)::int AS count FROM "Message" m WHERE NOT EXISTS (SELECT 1 FROM "ConversationParticipant" cp WHERE cp."conversationId"=m."conversationId" AND cp."userId"=m."senderId")`],
  ['Conversations with more than 2 participants', `SELECT COUNT(*)::int AS count FROM (SELECT "conversationId" FROM "ConversationParticipant" GROUP BY "conversationId" HAVING COUNT(*) > 2) x`],
  ['Direct conversations with incorrect participant count', `SELECT COUNT(*)::int AS count FROM "Conversation" c WHERE c."directKey" IS NOT NULL AND (SELECT COUNT(*) FROM "ConversationParticipant" cp WHERE cp."conversationId"=c.id) <> 2`],
  ['Active refresh sessions already expired', `SELECT COUNT(*)::int AS count FROM "RefreshSession" WHERE "revokedAt" IS NULL AND "expiresAt" < NOW()`],
];

try {
  await prisma.$queryRaw`SELECT 1`;
  console.log('CampusLink database integrity report (counts only; no personal data)');
  console.log('---------------------------------------------------------------');
  let hasFindings = false;
  for (const [label, query] of checks) {
    const rows = await prisma.$queryRawUnsafe(query);
    const count = Number(rows[0]?.count ?? 0);
    const status = count === 0 ? 'PASS' : 'REVIEW';
    if (count !== 0) hasFindings = true;
    console.log(`${status.padEnd(7)} ${label}: ${count}`);
  }
  console.log('---------------------------------------------------------------');
  console.log(hasFindings ? 'Review flagged counts before cleanup. This script makes no changes.' : 'No integrity findings in the checks listed above.');
  if (hasFindings) process.exitCode = 2;
} catch (error) {
  console.error('Integrity check failed to run:', error?.message ?? error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
