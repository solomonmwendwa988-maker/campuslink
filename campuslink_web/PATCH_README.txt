CampusLink messaging reliability patch
====================================

This patch is designed for the existing workspace. Extract it into the project root,
keeping the included folder structure, and overwrite the listed files.

Changes:
- Adds user-scoped local inbox cache (7-day expiry) and renders cached rows immediately.
- Adds a 12-second inbox request deadline with abort + independent timeout race.
- Adds visible retry action on inbox/message fetch errors.
- Adds per-conversation message cache (7-day expiry, bounded to the most recent 100).
- Prevents stale inbox/message fetches from overwriting newer selections.
- Adds an optional cacheScope prop to MessagesPage and passes the logged-in username.
- Fixes mobile grid sizing by explicitly forcing one column and bounded internal scroll.
- Bumps service-worker cache version and requests immediate activation so stale shell caches are retired.

Files:
- apps/web/src/app/App.tsx
- apps/web/src/components/messaging/MessagesPage.tsx
- apps/web/src/services/api.ts
- apps/web/src/styles/messaging.css
- apps/web/public/sw.js

Verification:
- TypeScript/TSX transpilation syntax passed for all 3 changed TS/TSX files.
- PostCSS parsing passed for messaging.css.
- Full Vite/TypeScript production build was not run because this archive omitted node_modules.
- Please run `npm run build -w apps/web` locally before pushing.
