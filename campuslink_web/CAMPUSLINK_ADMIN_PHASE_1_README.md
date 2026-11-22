# CampusLink Admin Phase 1 — Auth & Role Security

This patch adds role-based administrator access without rebuilding existing auth or social features.

## Added
- UserRole enum: USER, MODERATOR, ADMIN, SUPER_ADMIN (default USER).
- API-side role guard with hierarchy.
- Protected `GET /api/v1/admin/auth/me` endpoint; requires ADMIN or higher.
- JWT validation now retrieves the current role from the database, so role changes apply on the next authenticated request (no stale role claim).
- One-time bootstrap script to promote an existing account to SUPER_ADMIN, locked if a Super Admin already exists.

## Apply
From project root:

```powershell
npx prisma generate --schema apps/api/prisma/schema.prisma
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
npm run build -w apps/api
npm run build -w apps/web
```

## Create the first Super Admin
After migration, run from project root:

```powershell
npm run admin:bootstrap -w apps/api -- your-existing-account-email@example.com
```

Replace the email with the email of an existing account you control. Bootstrap refuses to run if any active Super Admin already exists. Do not use public signup to create admin accounts.

## Verify
1. Sign in with the promoted account using the normal login endpoint and obtain its access token.
2. Call `GET /api/v1/admin/auth/me` with `Authorization: Bearer <accessToken>`. It should return admin identity and permissions.
3. Call the same endpoint with a normal user token; it must return `403 Forbidden`.

This is API/security foundation only; no admin dashboard UI or management actions are included yet.
