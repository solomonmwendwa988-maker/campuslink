# CampusLink Post Persistence Fix

## Root cause
The Home feed was using `useLocalState('posts', campusPostsSeed)` and `publish()` inserted a `Date.now()` local-only post. It never called the existing API `POST /api/v1/posts`. Refreshing therefore replaced the locally-created post with the initial local state. The frontend also did not load the persisted API feed on session restore.

## Changes
- Load feed records from the authenticated API when the user is signed in, and reload when feed tab changes.
- Use API feed endpoint for For You/Latest/Popular and API Following endpoint for Following.
- Map database UUID post IDs and API author/count/like/bookmark state into UI post records.
- Publish text posts via existing `createSocialPost()` API and only display success after API success.
- Persist edit/delete through existing API calls; update UI only after server success.
- Remove numeric UUID sorting for Latest; the API already supplies descending creation order.
- Stop local Following filters from overriding server-side follow scope.
- Explicitly prevent image-containing posts from appearing to succeed because media upload is not wired to persistent storage in the current API.

## Apply
Extract this ZIP into the CampusLink repository root and overwrite the two included files.

Then run:

```powershell
npm run build -w apps/web
npm run build -w apps/api
```

If both pass, review the changes and commit:
```powershell
git add apps/web/src/app/App.tsx apps/web/src/types/post.ts
git commit -m "Connect feed and post creation to persistent API"
git push origin main
```

## Verification notes
TypeScript transpilation syntax checks passed for the edited files. A full web build could not be completed in this workspace because the dependency installation timed out and left incomplete `node_modules` (missing several `@types` packages). The patch is not runtime-tested against the deployed API.
