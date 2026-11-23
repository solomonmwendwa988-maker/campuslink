CAMPUSLINK ACTIVITY ENGINE - PATCH PACKAGE

Extract this ZIP into your existing CampusLink repository root and overwrite the listed files.
This is a source overlay; it does not include node_modules, .env, dist, or .git.

Included:
- Prisma ActivityEvent model + PostgreSQL migration
- Protected admin Activity API (paginated/filterable event timeline and analytics summary)
- Captures successful/failed login, registrations, post create/edit/delete, reports, and admin actions
- Activity Center UI integrated into the existing Admin Dashboard navigation
- Daily volume and category charts based only on stored events

After extracting:
1. npm run db:generate
2. npm run db:migrate  (required to create the ActivityEvent table; safe migration does not erase existing data)
3. npm run build

Then restart your API and web development servers. Existing records remain untouched. Activity history begins at deployment; historical events are not fabricated.

SECURITY NOTES:
- Passwords and tokens are not stored in event metadata.
- Failed login identifiers are masked.
- Admin Activity endpoints require the existing authenticated Admin role.
- Activity write failures are deliberately non-blocking for ordinary user operations.

The migration is intentionally not hidden inside a build command. Builds must not mutate production databases.
