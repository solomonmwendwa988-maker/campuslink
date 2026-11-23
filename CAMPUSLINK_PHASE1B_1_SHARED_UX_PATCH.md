# CampusLink Phase 1B.1 — Shared UX Feedback & Dialog Accessibility

## Included
- Added reusable `LoadingState`, `EmptyState`, `ErrorState`, and `InlineNotice` components in `apps/web/src/components/shared/FeedbackStates.tsx`.
- Added the shared feedback-state stylesheet and loaded it from the existing app entry (`App.tsx`).
- Improved shared Confirm/Report dialogs with keyboard focus containment, Escape dismissal (blocked while busy), and focus restoration when the dialog closes.
- Added unique accessible heading IDs for reusable empty/error states.

## Files changed/added
- `apps/web/src/components/shared/ConfirmDialog.tsx`
- `apps/web/src/components/shared/FeedbackStates.tsx` (new)
- `apps/web/src/styles/phase1b-feedback.css` (new)
- `apps/web/src/app/App.tsx`

## Integration notes
`FeedbackStates.tsx` exports:
- `LoadingState` — loading indicator with status announcement and optional compact layout
- `EmptyState` — title, optional description/icon/action
- `ErrorState` — optional title/description/icon/action
- `InlineNotice` — info/success/warning/danger notice

These components are intentionally additive; existing routes and page behavior are not changed. The new states can be adopted incrementally in the next UX pass.

## Validation
- Source and patch paths were inspected.
- Full frontend build was **not verified** in this environment because dependency installation timed out before completing. Run `npm run build -w apps/web` after applying this patch in the local workspace.
