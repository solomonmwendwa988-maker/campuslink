# CampusLink Social Interactions Major Upgrade

Overlay the included files into the existing CampusLink workspace root, preserving the relative paths. This update adds persistent comment likes, post deep-link support for comment/reply notifications, and a share sheet that can send a post link through existing CampusLink direct conversations to accounts the current user follows.


## Included changes
- Prisma `CommentLike` model and migration (`20261122100000_comment_likes`).
- Authenticated API routes for liking/unliking comments and retrieving a single post by ID.
- Comments API returns comment/reply like state and counts for the current viewer.
- Notification API enriches comment/reply/comment-like notifications with post and comment IDs.
- Notification click opens the associated post and focuses the target comment/reply.
- Comment likes in the feed UI.
- Share sheet: copy share link, select accounts from the current user's Following list, and send the post link through existing DM conversations.
- Repost action uses the Repeat2 icon and preserves existing persistent repost API integration.

## Apply
1. Extract this patch ZIP into the CampusLink project root and overwrite included files.
2. Build locally: `npm run build -w apps/api` and `npm run build -w apps/web`.
3. Review the migration before deploying. Render's configured start command runs `prisma migrate deploy`; this migration will be applied during the API startup after deployment.
4. Commit and push only after both local builds pass.


## Verification performed
- ZIP integrity checked.
- TypeScript/TSX syntax transpilation checked for changed frontend and backend source files.
- Full TypeScript builds could not be run in this workspace because `npm ci` timed out and dependencies were not available. Run both builds in the existing local workspace before deploying.
