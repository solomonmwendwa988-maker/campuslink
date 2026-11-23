CampusLink Phase 1C.1 – Verified Comment Identity Fix

Files changed:
- apps/api/src/posts/posts.service.ts
  - Comment author selection now includes profile.verifiedAt so verification state is included in comment and reply payloads.
- apps/web/src/app/App.tsx
  - Comment and reply author names are clickable and route through the existing onProfile navigation.
  - VerifiedName renders next to names when author.profile.verifiedAt is present.
  - Comment author profile photo null values are already normalized to undefined for Avatar.
- apps/web/src/styles/phase1c-visual-fix.css
  - Adds focused styling for comment-author links, hover, and keyboard focus.

Apply:
Copy these files into the matching paths in your CampusLink workspace, replacing the originals.

Verification:
This patch was source-reviewed and exact changes were applied against the uploaded ZIP. A full npm build/test was not run because the upload did not include installed node_modules dependencies. After installing in your workspace, run:
  npm run build -w apps/web
  npm run build -w apps/api
  npm run test -w apps/api

No database migrations are included.
