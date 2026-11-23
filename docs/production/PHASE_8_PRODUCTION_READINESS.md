# CampusLink Phase 8 — Production Readiness & Deployment Hardening

## Environment preflight
From repository root, run `npm run production:check:api` and `npm run production:check:web`. These validate environment values only; they do not contact services, print secrets, or modify anything. Set deployment secrets in the hosting provider dashboard, never commit them.

### API environment (Render)
- `NODE_ENV=production`
- `DATABASE_URL` (runtime connection; pooled if appropriate)
- `DIRECT_URL` (direct connection for migrations)
- `JWT_ACCESS_SECRET` (random secret, at least 32 characters; not the example placeholder)
- `CORS_ORIGINS` (comma-separated exact frontend HTTPS origins)
- `PORT` platform-provided
- `REFRESH_COOKIE_SAME_SITE=none` only when HTTPS and cross-site refresh cookies are required
- Cloudinary variables only if voice media is enabled; all three or none

## Deployment sequence
1. Record the stable production deployment/commit for rollback.
2. Confirm backup and recovery path before deploying schema changes.
3. Run `npm ci`, `npm run db:generate`, both production builds, `npm run test:api`, and `npm run test:db`.
4. Run both preflight scripts using deployment environment values.
5. Review `npm run db:status` and pending migrations; approve migrations before deploy.
6. Deploy API; then frontend as needed. Do not improvise database rollback.
7. Check `GET /api/v1/health/live` and `/api/v1/health/ready` (ready must confirm DB).
8. Smoke-test login/register, feed and post CRUD, profiles/follows, messaging/socket, notifications, safety/reporting, marketplace/events and admin with suitable accounts.
9. Check browser console/network, CORS, cookies, websocket, desktop and mobile layouts.
10. Monitor deployment logs. For critical issues, redeploy recorded stable code; database rollback is a separate reviewed operation.

## Hosting configuration
### Render API
- Root directory: repository root
- Build: `npm ci && npm run db:generate -w apps/api && npm run build -w apps/api`
- Start: `npm run db:migrate:deploy -w apps/api && npm run start -w apps/api`
- Health check: `/api/v1/health/ready`
- Secrets must be configured in Render environment settings.
### Vercel Web
- Root directory: `apps/web`
- Build: `npm run build`
- Output: `dist`
- `VITE_API_URL`: deployed API origin, HTTPS, without `/api/v1`
- Preserve the SPA rewrite in `apps/web/vercel.json`.

## Release smoke checklist
- [ ] Live and ready endpoints pass; ready confirms database connection
- [ ] Web loads on desktop and mobile
- [ ] Register/login/refresh/logout verified
- [ ] Feed, paging, create/edit/delete post verified
- [ ] Profile/follow verified
- [ ] Messaging and socket verified
- [ ] Notifications verified
- [ ] Reports, block and mute verified
- [ ] Marketplace/events verified
- [ ] Admin functions verified with admin account
- [ ] No critical browser console/network errors
- [ ] CORS and cookie behavior verified on deployed domains
- [ ] Backup and restore rehearsal completed
- [ ] Rollback deployment recorded

## Outstanding release risks
- The PostgreSQL integration test is currently skipped unless its DB test environment is configured; unit tests do not prove database auth flows.
- Backups and restore rehearsal are not yet verified. Do not consider user data recoverable until a backup is successfully restored in a rehearsal.
- Confirm provider limits, websocket support, media storage, email delivery and monitoring before public launch.
- Preflight does not test DNS/TLS, provider settings, DB connectivity or live routes; manual smoke tests are required.
