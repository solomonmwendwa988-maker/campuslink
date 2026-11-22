# CampusLink Messaging Reliability Patch

Apply these six source files to the existing CampusLink workspace, replacing the same paths. This is a patch ZIP, not a full project. Do not replace the entire repository.

## Included improvements
- Stable, constrained mobile inbox height and independent scrolling.
- Account-scoped inbox cache and message cache using localStorage; cached content renders before network refresh. Cache entries expire after 7 days. Message cache keeps the latest 40 items per opened conversation.
- Cached text and voice message data updates after successful sends.
- Inbox API refresh interval: 8 seconds while visible.
- Inbox typing previews via one batched endpoint for up to 50 conversations, polled every 2.5 seconds while visible.
- Last-message preview displays outgoing Seen or Delivered state from existing readAt/deliveredAt fields.
- Batched typing endpoint validates conversation IDs, requires membership, and filters blocked users/conversations.
- Stale list/history requests are guarded from overwriting newer state.
- Presence heartbeat: 15 seconds; presence polling: 5 seconds; stale-online threshold: 60 seconds.

## Files changed
1. apps/web/src/components/messaging/MessagesPage.tsx
2. apps/web/src/app/App.tsx
3. apps/web/src/services/api.ts
4. apps/web/src/styles/messaging.css
5. apps/api/src/messaging/messaging.service.ts
6. apps/api/src/messaging/messaging.controller.ts

No Prisma schema changes or migrations are required.

## Validation
TS/TSX parser syntax check passed for the modified files. A full web build could not be verified in this environment: dependency installation timed out and the workspace has an incomplete node_modules (TypeScript reports missing React and related type packages). Run both commands from the actual project root after applying:

```powershell
npm run build -w apps/web
npm run build -w apps/api
```

Typing previews are near-real-time polling, not WebSocket push. Inbox read-receipt previews refresh through the conversation list API every 8 seconds. Cache stores message text/metadata locally, scoped to the username; it is not encrypted and should not be used on shared devices without care.
