# CampusLink profile & verification UX patch

Copy the two files in `apps/web/src/...` into your existing CampusLink project, overwriting those exact files.


Changes:
- Verification request button becomes locked after pending submission and after approval.
- Own profile shows clear pending-review or verified status panels; the request form cannot reopen once status is set.
- Verified badge has a more polished trust-badge treatment.
- Profile post cards are redesigned with media-first layout, readable body, and engagement row.

This patch is frontend-only. Admin Phase 2 backend code is included in the supplied source snapshot, but the migration `20261122130000_admin_phase2` was still pending at the time of the screenshot. Apply it from the project root after reviewing your DB backup and migration:
`npx prisma migrate deploy --schema apps/api/prisma/schema.prisma`
Do not run this until you've confirmed the target database and backed it up.
Build check after copying:
`npm run build -w apps/web`
