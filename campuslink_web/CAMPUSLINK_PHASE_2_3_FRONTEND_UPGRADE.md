# CampusLink Phase 2.3 — Frontend Social Experience Upgrade

## Scope
This patch is frontend-only. It intentionally does not add API routes, Prisma schema changes, migrations, or database behavior.

## Changes
- Home feed gains `Latest` and `Popular` tabs alongside `For You` and `Following`.
- `Latest` sorts visible frontend posts by descending post ID (newer client-created IDs first).
- `Popular` uses a lightweight preview score (likes + comments weighted x2 + reposts weighted x3); this is not a backend ranking algorithm.
- Feed context label and visible post count provide tab context.
- Profile tabs now include `Media`, which filters profile posts to image-bearing posts.
- Follower/following statistics are interactive.
- Followers modal loads from the existing followers API, with search and cursor-based load-more.
- Following modal is UI-only with an explicit note that its API endpoint is not yet connected.
- Styling improvements for feed tab controls, feed context, post action buttons/comment composer, profile stat buttons and connection modals.

## Installation
Extract the ZIP into the project root and allow overwriting the listed source files:
- `apps/web/src/app/App.tsx`
- `apps/web/src/pages/ProfilePage.tsx`
- `apps/web/src/styles/core.css`
- `apps/web/src/styles/social.css`

No database migration is needed.


## Validation
TypeScript/TSX syntax transpilation was checked for the modified App and ProfilePage source files. A complete frontend build could not be run in this workspace because dependency installation timed out and the npm cache did not contain the required React packages. Run `npm run build -w apps/web` in the original project after applying the patch.

