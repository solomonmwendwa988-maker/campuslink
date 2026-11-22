-- Read-only check: confirm this is the exact fake placeholder account before deletion.
SELECT u.id, u.username, p."fullName", u.email
FROM "User" u
JOIN "Profile" p ON p."userId" = u.id
WHERE lower(trim(u.username)) = 'student'
  AND lower(trim(p."fullName")) = 'campus student'
  AND u."deletedAt" IS NULL;
