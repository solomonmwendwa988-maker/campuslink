# CampusLink Phase 2.3 Social UI & Logout Confirmation Patch

## Included
- Replaces the browser-native logout confirmation with the existing styled `ConfirmDialog`.
- Settings logout and top-bar logout now share the same confirmation flow.
- Replaces native browser confirmation for post deletion with the styled dialog.
- Replaces native prompt-based post editing with a styled textarea modal.
- Replaces clipboard browser alerts with the app toast message.
- Adds responsive visual polish to profile cover, stats, action buttons, tabs, profile posts, and About/listing sections.

## Files to overwrite
- `apps/web/src/app/App.tsx`
- `apps/web/src/styles/core.css`

## Install
Extract this patch into the CampusLink project root and allow these files to overwrite.

Then run:
`npm run build -w apps/web`

## Scope / limitation
This patch is a UI and interaction upgrade, not a complete server-backed social platform overhaul. Existing follow/profile API functionality is preserved. Feed posts, likes, comments, repost counts, and bookmarks in the currently supplied frontend still use local client state and are not made persistent by this patch. Backend posts endpoints exist in the supplied source, but wiring the complete post feed and engagement flow into them is a separate API integration phase and requires full source layout/build verification.
