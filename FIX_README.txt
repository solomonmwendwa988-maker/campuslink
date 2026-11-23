CampusLink Admin UI Upgrade v3 — TypeScript build fix

Extract this ZIP into the CampusLink workspace root:
C:\Users\ShadowNeko\Videos\campuslink_web

It replaces apps/web/src/pages/AdminDashboardPage.tsx with a corrected auditDetails() implementation.
The TypeScript error TS18046 came from calling trim() on the unknown variable parsed inside a JSON.parse catch.
The corrected code trims the original string (raw) before parsing, so TypeScript can safely type it.

Then run:
 npm run build -w apps/web

This patch only contains the fixed source file; it does not change backend files.
