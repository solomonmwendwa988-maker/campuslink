-- Deletes only the exact placeholder username/name pair, if present.
-- Run preview-campus-student.sql first and back up the live database.
BEGIN;
DELETE FROM "User" u
USING "Profile" p
WHERE p."userId" = u.id
  AND lower(trim(u.username)) = 'student'
  AND lower(trim(p."fullName")) = 'campus student'
  AND u."deletedAt" IS NULL
RETURNING u.id, u.username;
COMMIT;
