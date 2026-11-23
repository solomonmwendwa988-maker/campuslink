# CampusLink Admin recovery patch

## Included source changes
- Connected the existing AdminDashboardPage to the active app shell.
- Restored authenticated admin identity loading via the protected `/admin/auth/me` endpoint.
- Added a protected Administration navigation entry for users whose API identity is authorized.
- Added an admin route state with loading and denial handling.
- SUPER_ADMIN is routed into the admin dashboard instead of the ordinary social UI.
- Added the Phase 2 admin stylesheet to the active app imports.

## Important
This archive intentionally excludes `.env` files, `node_modules`, build output, and compiled `dist` files.

A full frontend/backend build was attempted in this environment, but dependency installation timed out and left an incomplete `node_modules`, so build results are not verified here. Run `npm ci` in your Windows project folder, then `npm run build -w apps/web` and `npm run build -w apps/api`.
