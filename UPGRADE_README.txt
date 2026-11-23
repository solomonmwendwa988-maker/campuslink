CampusLink Admin Intelligence Upgrade

Extract this ZIP into the CampusLink workspace root and allow overwrites.

Includes: Activity Center readability fix, admin logout access, user detail API and detail modal with profile, counts and recent posts.

IMPORTANT: Admin user details expose personal profile information to authorized administrators. Password hashes, session tokens and authentication secrets are never returned.

After extraction, run:
  npm run build -w apps/web
  npm run build -w apps/api

The backend source uses Prisma and should be generated after edits if the schema is changed. This patch does not alter the Prisma schema.
