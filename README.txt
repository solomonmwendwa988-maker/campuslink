CampusLink — Mobile inbox blank-state fix

Patch is based on the latest CampusLink source ZIP available in this conversation. Copy/replace these three files into your project root:
- apps/web/src/components/messaging/MessagesPage.tsx
- apps/web/src/styles/messaging.css
- apps/web/src/services/api.ts

Fixes: explicit flex layout and bounded scroll area for mobile inbox; visible loading state; 12-second abortable inbox request timeout; visible error state and Retry button instead of a blank region. The timeout aborts the actual fetch.

No backend files, migrations, secrets, or other screens are changed. Caching is not included in this focused fix.

Validation: TSX/TS syntax transpilation and ZIP integrity checks passed. Full production workspace build was not run here.
