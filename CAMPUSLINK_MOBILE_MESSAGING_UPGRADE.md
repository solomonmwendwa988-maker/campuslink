# Mobile & messaging upgrade (this pass)

Changed files: `apps/web/src/components/messaging/MessagesPage.tsx`, `apps/web/src/styles/messaging.css` (new overrides appended at the end).
No API, backend, schema, or routing changes. All existing data flows (cache, polling, presence, typing, read receipts, voice notes, mute/block/report) are untouched.

- Mobile (<=720px): conversation opens as a full-screen view above the app shell, sized to the visual viewport so the keyboard does not cover the composer. Real left-chevron back button (44px).
- Tablet (721-1023px): single-pane inbox/conversation (the two-pane layout left the chat ~120px wide beside the sidebar). Desktop >=1024px keeps two panes.
- Composer: auto-growing textarea (max 140px), Enter sends on desktop / newline on touch, Shift+Enter newline, 5000-char limit matching the API DTO, ref-based guard against duplicate sends, 16px font on mobile (no iOS zoom), spinner while sending.
- Chat: day separators, message grouping, time/receipt shown at the end of a group, instant jump on open and smooth follow only when near the bottom.
- Inbox: unread emphasis, 99+ cap, aria-current, search empty state that names the query, clear button only when searching.
- Fixes: "Start" button busy state never engaged; options menu now closes on outside click / Escape; menu has role/aria attributes.

NOT verified: `npm run build -w apps/web` could not be run (dependencies could not be installed offline). See report.
