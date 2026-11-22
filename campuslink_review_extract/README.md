# CampusLink

CampusLink is a University of Kabianga student community app. The existing browser prototype remains available as an explicit local demo; a separate versioned NestJS API and PostgreSQL/Prisma data layer are being added without replacing the UI.

## Local demo

Requires Node.js 20+ and npm 10+.

```powershell
npm install
npm run dev
```

The web UI runs at `http://localhost:5173` and API at `http://localhost:4000`. The UI currently uses browser-local demo data and is not yet connected to API mode; demo records are not real multi-user data. Do not treat the preview login or social actions as production functionality.

## API development

1. Copy `.env.example` to `.env` and configure PostgreSQL. For local development, start the existing compose service with `docker compose up -d postgres`; the example `DATABASE_URL` and `DIRECT_URL` match that service. Never commit `.env` or paste complete connection strings into logs/issues.

   For Supabase, set `DATABASE_URL` to the project pooler URL used at runtime and `DIRECT_URL` to the direct database URL used by Prisma migrations. The Supabase Session pooler uses port 5432; Transaction pooler uses port 6543 and can be used for application traffic, but Prisma 6 deployments may need `pgbouncer=true` on that URL. Keep `sslmode=require` on remote URLs. Percent-encode special characters in usernames/passwords. If deploying from Render, ensure the selected Supabase endpoint is reachable from Render and configure both variables as Render secrets (not committed values).
2. Install dependencies and generate the Prisma client:

   ```powershell
   npm install
   npm run db:generate -w apps/api
   ```

3. Validate the Prisma schema and apply the checked-in migration, then seed University of Kabianga + Main Campus:

   ```powershell
   npm run db:migrate:deploy -w apps/api
   npm run db:seed -w apps/api
   ```

   `db:migrate:deploy` is the production-safe migration command. Run `npm run db:migrate:dev -w apps/api` only against a disposable development database when authoring a new migration. Do not use `prisma migrate reset` or `prisma db push` against a database with data.

4. Run the API with `npm run dev -w apps/api`. Liveness (process only): `/api/v1/health/live`. Readiness (PostgreSQL required; returns HTTP 503 when unavailable): `/api/v1/health/ready`; legacy `/api/v1/health` also reports readiness. Swagger: `/api/docs`.

### Database checks and tests

```powershell
npm run db:generate -w apps/api
npm run db:migrate:deploy -w apps/api
npm run test -w apps/api
```

The regular test command is database-independent unit coverage. The real authentication integration test requires a dedicated, disposable PostgreSQL database with the migration and seed already applied, plus a running API configured to use that same database. Set `DATABASE_URL` to the test database URL and `API_TEST_BASE_URL` to the test API origin (for example `http://127.0.0.1:4000`), then run `npm run test:db -w apps/api`. It creates a uniquely named test user, checks persistence, duplicate registration, credential validation, refresh-token rotation/replay, logout/session revocation, and password hashing, and deletes only that test account in `finally`. Never point this test at production data. It is skipped when these variables are absent.

For migration diagnostics, use `npx prisma validate --schema apps/api/prisma/schema.prisma` and `npx prisma migrate status --schema apps/api/prisma/schema.prisma` from the repository root with the appropriate environment loaded. `migrate status` requires a reachable database. If it fails, verify the database host/port, encoded credentials, SSL mode, Supabase pooler mode, and that `DIRECT_URL` is direct/reachable. Do not print full URLs when troubleshooting. The API starts without opening a DB connection; readiness becomes unavailable until PostgreSQL accepts a query.

Core routes are versioned under `/api/v1`: `/auth`, `/profiles`, `/posts`, `/marketplace/listings`, `/events`, `/messages/conversations`, `/notifications`, and `/safety`. Cursor-based list endpoints accept `cursor` and return `{ data, nextCursor }`. Socket.IO uses the `/messages` namespace; clients authenticate with `{ auth: { accessToken } }`, then use `conversation:join`, `message:send` (requires a stable `clientMessageId`), `message:read`, and `message:typing`. Server events include `message:new`, `message:read`, `message:typing`, and `notification:new`. Acks are returned only after message persistence. Reconnecting clients should refresh the access token and re-fetch conversation history; online presence is intentionally ephemeral.

Production requires a randomly generated `JWT_ACCESS_SECRET` of at least 32 characters, exact frontend origins in `CORS_ORIGINS`, Supabase PostgreSQL, and deployment environment variables. If no real secret is provided in development, a process-local random secret is generated (existing sessions will be invalid after an API restart). Never commit `.env` or expose server-only storage credentials to the browser.

## Current backend scope and limitations

The API currently implements health checks, registration/login/logout, refresh-token rotation, session listing/revocation, password change, account reactivation/deactivation/anonymized deletion, a privacy-safe password-recovery response, profile read/update/follow, cursor-paginated feeds, post editing/deletion, likes/bookmarks/reposts/comments, marketplace listings, events, notification read state, user blocking/reporting, and persisted conversations/messages. Socket.IO authenticates JWTs and authorizes conversation join/send/read/typing events; message persistence precedes acknowledgements, and client IDs deduplicate retries. Passwords use bcrypt; refresh tokens are stored only as hashes; protected requests verify session revocation against PostgreSQL. The schema and first migration cover the MVP domain entities, and the seed is idempotent.

`render.yaml` provides a Render API service definition and checks `/api/v1/health/ready`. Before deploying, provision PostgreSQL, configure `DATABASE_URL`, `DIRECT_URL`, `JWT_ACCESS_SECRET` (random, at least 32 characters), and exact `CORS_ORIGINS` in Render, then confirm the database is reachable from the service. The start command applies checked-in migrations with `migrate deploy` before launching the API. Render free instances can sleep, and Supabase free-tier connection/backups/quotas are limited; this prototype has no Redis adapter, external email provider, or external error monitoring.

This is not yet a production-ready service. Supabase file uploads, email delivery and usable verification/reset token flows, listing/event image handling, full notification event coverage, Socket.IO integration in the frontend, and database-backed end-to-end/security tests still need implementation and external configuration. The frontend remains demo mode and is not yet wired to these API routes; this avoids mixing demo records with production accounts. The backend must not be marketed as ready for real students until those gaps are closed and the integration/security test suite is run against a configured database.

Prisma migrations are versioned under `apps/api/prisma/migrations`; use `migrate dev` only against a disposable development database and `migrate deploy` in controlled deployment. Do not use `prisma db push` for production.
