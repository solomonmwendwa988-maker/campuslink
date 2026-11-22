# CampusLink Phase 2.1 upgrade overlay

This bundle contains the updated files only. Extract it into the CampusLink monorepo root and allow overwrite.

## Implemented in this patch
- Server-backed blocked accounts list and unblock action (uses existing Block model/API).
- Account-level mute persistence in PostgreSQL (`AccountMute`) with list/mute/unmute endpoints.
- Settings UI with tabs, search, profile image/name/username display, responsive rows, empty/loading/error states, retry/refresh, and custom confirmation dialogs.
- Muted account filtering in the Home feed and Explore feed for the client-side post collection.
- Muted actor notifications are excluded from the notifications list.
- Security settings: change password and active session list/revoke controls, using existing auth API endpoints.
- Messaging block/report prompts replaced with custom dialogs instead of native browser prompts.

## Overlay
Extract this archive into the root of the CampusLink project. The archive's directory structure matches the expected monorepo paths.

## Database
This adds a new Prisma model and migration for account-level mutes. From the monorepo root, after overlaying files, run:

```powershell
npx prisma generate --schema apps/api/prisma/schema.prisma
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```

If Prisma is invoked through a workspace script in your repository, use that script instead. Back up the database before applying the migration.

## Verification limitation
The uploaded ZIP contained source files flattened at the archive root, rather than preserving the workspace directory layout, and did not contain `node_modules`. I syntax-transpiled the edited TypeScript/TSX files successfully, but a complete workspace build could not be run against that flattened archive. Run the frontend and API builds in your actual project after overlaying the patch.

Suggested checks:
```powershell
npm run build -w apps/web
npm run build -w apps/api
```

Test block/unblock, mute/unmute, notification filtering, password change, and session revocation using two real test accounts.
