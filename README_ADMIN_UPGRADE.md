# CampusLink Admin Control Center — Phase 3 Visual Refinement


This is a **safe overlay patch**, not a replacement of your app. It refreshes the existing Admin UI to a more polished light SaaS style using scoped CSS only. Existing React logic, API calls, Admin routes, guards, reports, verification, account controls and audit functionality remain untouched.

## Install
1. Extract this ZIP into the root of your CampusLink workspace (`campuslink_web`) and allow the overlay to place the included CSS/script files.
2. Open PowerShell at the workspace root.
3. Run:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\INSTALL_ADMIN_UPGRADE.ps1
   ```
4. Build the web app:
   ```powershell
   npm run build -w apps/web
   ```
5. Start the frontend and inspect Admin at desktop, tablet and mobile widths.

The installer backs up `apps/web/src/app/App.tsx` under `campuslink-backups/admin-ui-phase3/` before editing and adds one stylesheet import. The stylesheet is scoped to existing `.admin2-*` classes and respects reduced-motion preferences.


## Included
- Light, neutral Admin UI with clear contrast and spacing
- Polished top bar, sidebar navigation, metrics, panels, status chips, tables, search, action controls and review cards
- Responsive behavior for tablet and mobile
- Focus-visible accessibility and reduced-motion handling
- No dependencies added; no backend or database changes


## Not included yet (requires a separate backend milestone)
This overlay does **not** implement persisted platform-wide activity tracking, successful/failed login-event storage, posts moderation endpoints, time-series chart endpoints, system telemetry, or additional audit pagination. The existing Admin API doesn't currently provide all of those data sources in the reviewed archive. This patch deliberately does not fake those metrics or expose data without proper backend authorization. Those features need schema changes, safe event recording, migrations, protected endpoints, tests and then frontend views.


## Rollback
Remove the CSS import `import '../styles/admin-phase3.css';` from `apps/web/src/app/App.tsx` and remove `apps/web/src/styles/admin-phase3.css`, or restore the timestamped App.tsx backup. No API/database changes were made.
