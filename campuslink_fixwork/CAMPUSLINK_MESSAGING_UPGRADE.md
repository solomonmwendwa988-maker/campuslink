# CampusLink Messaging / Notifications Upgrade

## Changes in this source update
- Inbox refresh no longer automatically chooses the first conversation.
- Read receipts are acknowledged only from the explicit conversation-selection effect; background message refresh does not call the read endpoint.
- Active message polling is visibility-aware and uses a 12-second interval; inbox list refresh uses a separate 30-second interval.
- Conversation unread counts use one grouped database query instead of per-conversation count queries.
- Conversation mute is persisted in PostgreSQL and muted message notifications are filtered from the notification feed.
- Conversation header supports profile navigation and view-profile, mute/unmute, report and block actions.
- Audio recording UI supports microphone permission handling, a 120-second cap, preview, discard, upload and in-chat playback.
- Voice uploads are signed server-to-Cloudinary uploads; the backend attaches the media URL to the message and creates the message notification transactionally.
- Notifications now render actor profile photos and can navigate to actor profiles or open a message conversation from a message notification.
- Session restoration no longer displays the text toast; a responsive skeleton shell is rendered instead.

## Database
A new migration `apps/api/prisma/migrations/20261122030000_conversation_mutes` creates the `ConversationMute` relation. Apply migrations before deploying the API.

## Required API deployment environment for voice messages
Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in the API service environment. These values are server-only and must not be prefixed with `VITE_`. Voice uploads are capped at 8 MB and the client recording UI stops at 120 seconds.

## Important verification limits
This environment did not have a complete dependency installation. `npm ci` timed out and the API build failed because type packages were missing from the incomplete `node_modules`, not because of a reported source diagnostic. All 61 TS/TSX files were checked for syntax via TypeScript transpilation with zero syntax diagnostics. Prisma schema validation and full API/frontend type builds remain to be run locally after dependencies are present.

## Storage/privacy note
Cloudinary upload uses a signed server-side upload, but this implementation stores Cloudinary delivery URLs in message attachments. Unless the Cloudinary account is configured with authenticated/private delivery and a secure delivery-signing/proxy strategy, these URLs may be publicly accessible to anyone who obtains them. Do not treat voice media as end-to-end encrypted or private-by-link.


## Credential hygiene
The source ZIP uploaded for review included an API environment file. This returned upgrade archive removes all `.env` files. Rotate the database credentials and JWT secret from the uploaded environment file before the next production deployment.
