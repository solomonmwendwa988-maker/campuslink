# CampusLink Admin Phase 2 — Administration Dashboard & Operations

This update adds an API-backed admin dashboard and management workflows while preserving the existing app architecture and social features.

## Implemented in this source update
- Dashboard summary cards for total users, active users, suspended/deactivated users, posts, open reports, pending verifications, and verified profiles.
- Recent user registrations, open reports, and admin activity.
- Searchable/paginated user list.
- Admin account suspension/reactivation (separate `suspendedAt` field from user self-deactivation), session revocation on suspension, and blocked sign-in/refresh for suspended accounts.
- Role changes for existing roles (`USER`, `MODERATOR`, `ADMIN`) restricted to `SUPER_ADMIN`. `SUPER_ADMIN` elevation remains bootstrap-only and cannot be changed from this panel.
- Report status management (`REVIEWED`, `ACTIONED`, `DISMISSED`).
- Verification request review (approve/reject); approval adds profile verification timestamp/badge. Rejection leaves an existing verified timestamp untouched.
- Administrative action audit log.
- Admin dashboard responsive layout with Overview, Users, Reports, Verification, Audit log sections.

## New API routes (all protected by JWT + role guard)
- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/users?q=&page=&limit=`
- `PATCH /api/v1/admin/users/:id/status` body `{ "disabled": boolean, "reason": "..." }`
- `PATCH /api/v1/admin/users/:id/role` body `{ "role": "USER|MODERATOR|ADMIN" }` (Super Admin only)
- `GET /api/v1/admin/reports?status=`
- `PATCH /api/v1/admin/reports/:id` body `{ "status": "OPEN|REVIEWED|ACTIONED|DISMISSED" }`
- `GET /api/v1/admin/verifications?status=`
- `PATCH /api/v1/admin/verifications/:id` body `{ "status": "APPROVED|REJECTED", "note": "..." }`
- `GET /api/v1/admin/audit-logs`

## Migration
A migration adds `AdminAuditLog` and the `User.suspendedAt` / `User.suspensionReason` fields. Do not deploy the API before applying migrations and generating Prisma Client.


## Deployment/testing commands
From the repository root:

```powershell
npm ci
npm run db:generate -w apps/api
npm run db:migrate -w apps/api
npm run build -w apps/api
npm run build -w apps/web
```

Review scripts in `apps/api/package.json` and run the migration against the intended environment/database only. Test first in a staging or backup-protected database. Admin role elevation and user suspension are privileged operations.

## Important limitation
This phase adds administrative review/status workflows, but does not yet provide hard deletion, post/listing/event takedown actions, IP/device telemetry, automated moderation, or a complete audit trail of non-admin application activity. Report statuses currently track the review lifecycle; direct target removal is a later moderation phase.
