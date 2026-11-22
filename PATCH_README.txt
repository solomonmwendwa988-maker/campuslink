CampusLink inbox reliability patch

Apply from project root by extracting and overwriting these three files:
- apps/web/src/components/messaging/MessagesPage.tsx
- apps/web/src/app/App.tsx
- apps/web/src/styles/messaging.css

Changes: per-user localStorage inbox cache (7-day expiry), cached inbox render on entry, hard 9-second request timeout using Promise.race plus AbortController, retry and stale-cache notice, latest-request guard against overlapping refreshes, mobile scroll/layout overrides.

No API/database/schema changes. TypeScript syntax transpilation was checked; full npm builds must be run in the user's workspace.
