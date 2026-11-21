# CampusLink Major Upgrade — Source Review Notes

## Included changes
- Landing hero replaced with a real University of Kabianga campus photo sourced from the University's portal. The image is currently loaded remotely; it is not bundled because this environment could not resolve external DNS to download it.
- Landing page Support, Feedback and Report a problem links now open email drafts addressed to `solomonmwendwa@gmail.com`.
- Marketplace API now returns ordered listing images and supports up to 3 compressed JPEG/PNG/WebP data-URL images per listing, capped at 220 KB decoded bytes per image. Create/update operations persist image rows and replace image rows on edit. API request JSON body is capped at 1 MB.
- Added PostView model, migration, authenticated post-view endpoint and per-user deduplication. The feed payload includes view counts and a viewer-viewed flag. Existing Post likes, comments, and repost counters remain backend-supported.
- Added frontend API helper functions for marketplace listing fetch/create/favorite and post-view recording.

## Important integration status
This package is a targeted source enhancement, not a fully completed UI integration of all backend social features. The existing app feed and marketplace screens still have local-state paths and must be connected to these API helpers before post likes/comments/reposts/views or marketplace uploads are fully database-backed in the UI. The landing hero image is remote and can fail if its source host is unavailable.

## Migration
`apps/api/prisma/migrations/20261122020000_post_views/migration.sql` creates the `PostView` table. Deploy the API with the normal Prisma migration process, then generate the Prisma client. Do not delete existing database records.

## Verification
Dependency installation could not complete in this environment due network/DNS timeout, so production builds and Prisma validation have not been run here. Run `npm run db:generate -w apps/api`, `npm run build -w apps/api`, and `npm run build -w apps/web` locally before deployment.
