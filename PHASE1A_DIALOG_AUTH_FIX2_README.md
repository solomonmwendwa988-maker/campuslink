# CampusLink Phase 1A.1 — ConfirmDialog hotfix 2

This hotfix corrects the placement of logout detection in `ConfirmDialog.tsx`.

- Declares `isLogout` inside `ConfirmDialog`, where `title` exists.
- Removes the erroneous reference from `ReportDialog`, where no `title` exists.
- Keeps both dialogs' existing behavior otherwise unchanged.

Extract into the repository root and overwrite:
`apps/web/src/components/shared/ConfirmDialog.tsx`

Then run:
`npm run build -w apps/web`
`npm run build -w apps/api`
`npm run test -w apps/api`

The web build is not claimed as verified here.
