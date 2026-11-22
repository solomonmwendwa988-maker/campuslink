# CampusLink Social Engine Integration Patch

## Applied changes
- Home feed requests server-backed posts when signed in; Following uses the API following feed.
- Server post creation, editing, deletion, likes, bookmarks, reposts, and comments are wired to the frontend actions.
- Post interaction state is optimistically updated and rolled back when an API request fails.
- Removed local-only success behavior for publishing and post actions; API failures surface through the app toast.
- UUID post IDs are supported by the frontend Post model and action handlers.
- Image-only post publishing is explicitly blocked because this server version has no post-media upload endpoint; local preview is not falsely reported as published.

## Files
- `apps/web/src/app/App.tsx`
- `apps/web/src/types/post.ts`

## Apply
Extract this patch into the CampusLink project root and overwrite the two files above. This patch is from the source archive provided for this update.

## Verification
The uploaded source archive passed ZIP integrity testing. Build verification was attempted but could not run because the dependency installation timed out and left incomplete `node_modules` type packages. Run `npm ci` in the project root, then:

`npm run build -w apps/web`

This patch does **not** yet implement the remaining full database-backed follow/discovery/recommendation integration or feed pagination UI. It is a focused server integration update, not a claim that all five social-engine phases are complete.
