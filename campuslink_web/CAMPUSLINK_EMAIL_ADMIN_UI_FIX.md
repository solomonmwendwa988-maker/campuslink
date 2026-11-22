# CampusLink targeted email + Admin Phase 1 UI fix


This patch is based on the latest source ZIP uploaded in this conversation. It does not rebuild the feed, messaging, profile pages, or existing authentication.


## Fixes
- Profile email now flows through the profile update DTO/service and persists on the `User.email` column.
- Email is normalized to lowercase and duplicate-email conflicts return a clear conflict response.
- Changing the email clears `emailVerifiedAt`, so the old address is not treated as verified. Saving an unchanged email does not reset verification.
- The email returned by `/auth/me` is mapped back into the Settings profile.
- The frontend checks the protected `GET /api/v1/admin/auth/me` endpoint; only successful admin responses show the Admin Control Center navigation.
- Admin screen shows authenticated role and API-provided permissions; no admin registration or new auth system is added.
- `/admin` is added to page routing. API authorization remains authoritative.


## Changed files
- `apps/api/src/profiles/profiles.dto.ts`
- `apps/api/src/profiles/profiles.service.ts`
- `apps/web/src/services/api.ts`
- `apps/web/src/app/router/routes.ts`
- `apps/web/src/app/App.tsx`
- `apps/web/src/styles/admin-phase1.css` (new)


## Apply
Extract the ZIP into the existing repository root, merge/overwrite the listed files, then run:


```powershell
npm run build -w apps/api
npm run build -w apps/web
```

No Prisma schema migration is required.
