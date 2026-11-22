# CampusLink Persistent Engagement + Comments + Avatars Update

This patch connects the feed's post engagement controls to existing backend endpoints.

## Included
- Persistent like/unlike actions with server-confirmed state updates.
- Persistent bookmark/unbookmark actions.
- Persistent repost/unrepost actions and local count updates after server success.
- Comments and replies posted through the API; comments are reloaded from the backend when the thread is opened or after submitting.
- Visible comment threads including other users' comments and nested replies.
- Author profile-photo rendering on feed cards (fallback initials when image is absent/unavailable).
- Failure messages instead of fake-success updates.

## Apply
Extract this ZIP into the CampusLink repository root and overwrite the included files.

Then run:
```powershell
npm run build -w apps/web
npm run build -w apps/api
```

The API source and Prisma schema are unchanged because the current source already contains the like, bookmark, repost, comment, and nested-reply endpoints/models. The frontend patch connects to those endpoints.

## Verification
The ZIP was integrity-checked. A local build could not be completed in this environment because `npm ci` timed out and left incomplete type dependencies (`TS2688` missing type definitions). Run the build in the project environment after applying.
