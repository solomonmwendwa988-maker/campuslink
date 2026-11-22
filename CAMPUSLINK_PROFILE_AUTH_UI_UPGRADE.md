# CampusLink Profile + Auth UI Upgrade

UI-only changes.

Files included:
- `apps/web/src/pages/ProfilePage.tsx` (unchanged profile behavior)
- `apps/web/src/pages/auth/AuthPage.tsx` (adds UI-only Back to home button using router navigation)
- `apps/web/src/styles/campuslink-system.css` (responsive profile refinement and auth theme alignment)

Install by extracting this archive into the CampusLink repository root and overwriting the files. No backend, database, authentication behavior, or API changes are intended.

Build with:
`npm run build -w apps/web`
