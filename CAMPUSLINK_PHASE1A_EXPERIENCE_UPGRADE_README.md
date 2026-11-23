# CampusLink Phase 1A — Experience Upgrade (Patch)

## Files in this patch
- `apps/web/src/pages/LandingPage.tsx` — expanded public landing page with campus-focused hero, Connect/Discover/Trade/Grow, highlights, getting-started steps, safety messaging, FAQ, final CTA, and multi-column footer.
- `apps/web/src/styles/landing-v2.css` — appended responsive styles for the upgraded landing page sections and footer.
- `apps/web/src/styles/core.css` — appended refinements to the signed-in shell, sidebar navigation, search, page headings, cards, hover/focus states and mobile drawer.
- `apps/web/src/styles/auth.css` — appended visual polish for sign-in and registration forms; existing authentication flow and form behavior are preserved.

## Installation
1. Back up the three destination files in your working project.
2. Extract this ZIP into the repository root (`campuslink_web`) and allow the paths to merge/overwrite.
3. Review the changes before staging or committing.
4. Run:
   - `npm run build -w apps/web`
   - `npm run build -w apps/api`
   - `npm run test:api`
5. Preview the landing page in desktop, tablet, and mobile widths. Test sign-in, all registration steps, back/skip, validation, theme toggle, footer links, and navigation CTAs.

## Scope and limitations
- The existing theme variables, routing, and auth logic are intentionally preserved.
- The landing page remains campus-specific to the current University of Kabianga launch.
- FAQ and safety copy avoids claiming unimplemented backend features.
- Sign-in and registration UI are styled only; backend password reset and email verification are still not implemented.
- A local TypeScript parse/typecheck attempt was made, but a complete web build could not be run because dependencies were not present in the uploaded archive. Missing React/Lucide modules were the only errors reported by the targeted TypeScript check.
