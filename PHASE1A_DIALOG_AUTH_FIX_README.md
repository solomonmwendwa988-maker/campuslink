# CampusLink Phase 1A.1 — ConfirmDialog TypeScript correction

This patch corrects the TypeScript error in `ConfirmDialog.tsx` caused by an accidental `title` reference inside `ReportDialog`, where no `title` prop exists.

## Install
Extract this ZIP into the CampusLink repository root and overwrite the file:
`apps/web/src/components/shared/ConfirmDialog.tsx`

No backend, routes, API contracts, or authentication behavior are changed.
