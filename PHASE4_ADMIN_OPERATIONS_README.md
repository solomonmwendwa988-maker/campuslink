# CampusLink Phase 4 — Admin Operational Intelligence (Backend patch)

Adds two authenticated admin endpoints without database migrations or data modifications.

## Endpoints
- `GET /api/v1/admin/system-health` — API uptime, DB connectivity/latency, Node version, and process memory (ADMIN role).
- `GET /api/v1/admin/activity-summary?hours=24` — event totals, grouped category/outcome totals, and up to 10 recent FAILED/ERROR events (ADMIN role). `hours` is clamped to 1–168.

## Install
Extract into the CampusLink workspace and overwrite the included files:
- `apps/api/src/admin/admin.service.ts`
- `apps/api/src/admin/admin.controller.ts`

No Prisma schema changes, migrations, destructive actions, or user-data changes.

## Verify
Run:
```powershell
npm run build -w apps/api
npm run build -w apps/web
npm run test -w apps/api
```
After the API is running and admin-authenticated, call the endpoints with your normal admin bearer token. The activity summary only returns event type/category/outcome/id/timestamp for failure rows, not message content or identifiers.

This patch adds operational API endpoints; the dashboard UI cards are intentionally not wired in this backend-only patch.
