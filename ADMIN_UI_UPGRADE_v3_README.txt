CAMPUSLINK ADMIN UI UPGRADE v3

FILES INCLUDED (extract at CampusLink workspace root):
- apps/web/src/pages/AdminDashboardPage.tsx
- apps/web/src/styles/admin-phase3.css
- apps/web/src/components/admin-activity-center.css

Changes:
- Includes an event metadata formatter that displays nested metadata as readable values instead of [object Object].
- Fixes missing detail-modal styling that caused profile detail content to appear unformatted.
- Adds responsive, structured user detail modal styles for profile, account information, activity stats, recent posts and comments.
- Makes Overview metric cards clickable and routes them into relevant admin sections.
- Makes recently-joined accounts clickable to open their user details.
- Hides the non-functional CampusLink/back button for SUPER_ADMIN; keeps it for other admin roles.
- Converts audit metadata into readable labeled details, including metadata received as JSON strings.
- Removes raw-code/monospace presentation for activity event details, formats nested event metadata, and improves responsive layout.

Install: extract this ZIP into the CampusLink workspace folder and allow overwrite.
Then run:
  npm run build -w apps/web

This is a frontend-only UI patch; it does not change the database or API.
