# CampusLink Phase 5 — Regression Protection & QA

This additive patch expands automated DTO regression coverage and standardizes API test discovery.

## Changes
- API test command discovers all `test/*.spec.ts` files.
- New regression tests cover registration/login/password DTOs, profile updates, student discovery, posts/comments/feed cursors, and verification requests.
- Root convenience scripts: `npm run test:api` and `npm run test:db`.
- No application feature code, database schema, migrations, or user data are changed.

## Install
Extract the ZIP into the CampusLink workspace and overwrite the included files.

## Verify
```powershell
npm run test:api
npm run test:db
npm run build -w apps/api
npm run build -w apps/web
```
The DB integration suite may skip unless its database test environment is configured.
