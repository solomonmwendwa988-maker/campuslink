# CampusLink Phase 1 — Security, Authentication & Session Hardening

This patch is designed to be extracted into the CampusLink workspace root. It does not include `node_modules`, real `.env` files, credentials, or database migrations.


## Changes

- Added strict bounds/type validation for registration `interests` and `skills` arrays.
- Limited authentication identifier and recovery-email lengths.
- Added masked identifiers to authentication activity records; failed-login logs do not store the raw login identifier.
- Added a bcrypt dummy verification for unknown account identifiers to reduce account-enumeration timing differences.
- Records attempts to log in to suspended accounts in the ActivityEvent stream.
- Makes account reactivation and refresh-session creation transactional, with the session ID generated and JWT signed before the transaction so signing failures cannot leave a live session behind.
- Validates refresh-cookie SameSite configuration and rejects `SameSite=None` when the cookie is not secure.
- Configures Express trusted proxy hops to improve client IP-based throttling when deployed behind a reverse proxy. Default: 0 locally; 1 in production. Override with `TRUST_PROXY_HOPS` (0–5).
- Adds security unit coverage for identifier masking, proxy-hop configuration, DTO bounds and authentication credential helpers.
- Expands optional PostgreSQL/API integration coverage for refresh replay, logout, session listing/revocation, password change invalidation, deactivation and reactivation.


## Apply

1. Extract this ZIP into the CampusLink workspace root, preserving folders.
2. Review overwritten files if you have local edits.
3. Build the API:
   ```powershell
   npm run build -w apps/api
   ```
4. Run unit tests:
   ```powershell
   npm run test -w apps/api
   ```
5. Optional database/API integration tests require a running API and test database:
   ```powershell
   npm run test:db -w apps/api
   ```

No Prisma schema changes are included, so no database migration is needed for this phase.


## Production configuration notes

- Keep `JWT_ACCESS_SECRET` a unique random secret of at least 32 characters.
- Set `CORS_ORIGINS` to exact frontend origins without trailing slashes.
- `TRUST_PROXY_HOPS` defaults to `1` in production and `0` in development. Verify the actual hosting proxy chain before changing this; only trust proxies you control.
- `REFRESH_COOKIE_SAME_SITE=none` requires production secure cookies (`NODE_ENV=production`).
- The built-in throttler uses in-memory counters. For multi-instance production deployments, shared throttling storage (for example Redis) should be added in a separate deployment-specific change.


## Not included / still pending

- Email delivery and real password-reset token flow.
- Email verification.
- Multi-factor authentication.
- Shared/distributed rate-limit storage for multiple API instances.
- Automated dependency vulnerability remediation.
- Full production penetration testing.

These are not silently represented as completed by this patch.
