# CampusLink major messaging & notifications upgrade

## Implemented in this source package
- Inbox refresh no longer automatically selects the first conversation.
- Read acknowledgements happen only from the selected-conversation effect; background history polling does not call the read endpoint.
- Message polling is visibility-aware and runs at 12 seconds while an open chat is visible; inbox refresh runs separately at 30 seconds.
- Unread counts use a grouped database query instead of one count query per conversation.
- Mute is stored in PostgreSQL using the new `ConversationMute` table and muted message notifications are excluded from the notification feed.
- Conversation header has profile navigation and actions for mute/unmute, report and block.
- Voice message recording supports permission handling, a 120-second cap, preview, cancel, upload, sending and playback. Uploads use signed server-to-Cloudinary requests and attachments are persisted with the message.
- Notification actor profile images are supplied to the avatar component; clicking message notifications can open the sender's conversation and other actor notifications navigate to the actor profile.
- The session-restoration popup has been replaced by an animated skeleton shell. Message inbox, chat and notification loading also have skeletons.

## Deployment configuration
Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` on the API deployment service before enabling voice-message uploads. Never expose these in `VITE_` variables. The audio endpoint caps uploads at 8 MB and the UI caps recording duration at 120 seconds.

Run Prisma client generation and apply the new migration before deploying the API. This update adds the migration folder `apps/api/prisma/migrations/20261122030000_conversation_mutes`.

## Verification limitation
A full dependency installation timed out in this environment. The API build then failed because the incomplete `node_modules` tree lacked TypeScript type definition packages. Syntax transpilation checked 61 TS/TSX source files and found no syntax diagnostics. A full type/build verification and Prisma schema validation still need to be run with a complete install.

## Media privacy warning
Cloudinary uploads are signed server-side, but attachment records contain Cloudinary delivery URLs. This is not end-to-end encryption and the media URL may be accessible to anyone who obtains it unless the Cloudinary account and delivery flow are configured for authenticated/private media. Treat this as a launch limitation to address before storing sensitive audio.
