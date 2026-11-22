CampusLink Profile UI refinement — mobile-first

This patch changes only:
apps/web/src/styles/campuslink-system.css

It targets existing ProfilePage classes (profile-page-v2, profile-cover,
profile-main, profile-top, profile-actions, profile-facts, profile-meta,
profile-tabs, profile-post-grid) and is designed to override earlier responsive
profile rules because campuslink-system.css is imported last in App.tsx.

Install:
Extract the ZIP into the CampusLink project root:
C:\Users\ShadowNeko\Videos\campuslink_web

Allow overwrite of:
apps/web/src/styles/campuslink-system.css

No API, database, Prisma, or messaging files are changed.
