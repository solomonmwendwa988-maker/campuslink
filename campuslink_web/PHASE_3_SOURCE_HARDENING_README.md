# CampusLink Phase 3 - Source Hardening Patch

This is a targeted patch against the uploaded, path-preserving CampusLink workspace. It does NOT claim to complete frontend-to-backend social synchronization.

## Included
- Feed API now passes the authenticated viewer ID into the feed service so liked/bookmarked/reposted/viewed state can be personalized.
- Popular-feed requests with an expired/invalid cursor now return a clear refresh error instead of silently restarting and duplicating the first page.
- Replies notify the actual parent-comment author (not always the post author); self-notifications are suppressed.
- Following connections use a stable directional tie-breaker for pagination.
- API client adds create/edit/delete post methods.

## Apply
Extract the ZIP into the CampusLink project root and overwrite the included files.

## Verify
Run:
`npm run build -w apps/api`
`npm run build -w apps/web`

Full production builds were not run in the patch environment because dependency installation timed out. The main Home feed and post interactions are still local-state driven in App.tsx and must be connected in a follow-up integration patch; image publishing is not supported by the current post API.
