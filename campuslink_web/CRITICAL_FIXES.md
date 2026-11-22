# CampusLink Critical Fixes


## 1. Refresh identity and the fake `Campus student` profile

The source contained the fallback string `Campus student` in the frontend profile mapping. The API `/auth/me` endpoint only returned `id` and `username`, while the frontend expected the complete profile. This made the restored profile fall back to a placeholder. The fix returns the current account's safe profile fields from the database, unwraps the `{ user }` response in the frontend, and maps the real name/username/campus/course/year/bio/photo. The app no longer manufactures the `Campus student` account label. The startup cleanup no longer wipes the profile cache or resets it to the blank seed.

The Prisma seed script only upserts University and Campus records; it does not create a student account. The placeholder was confirmed in source as a frontend fallback, not a seeded database user. A read-only SQL preview and narrowly matched deletion script are included in `scripts/` in case a legacy row exists in the live database. The deletion only targets username `student` AND profile full name `Campus student`. It was not run from this environment because there is no live database access. Back up the database and inspect the preview before executing the deletion script.

## 2. Profile photo visibility

The current-user endpoint now returns the profile photo/cover fields, and the shared Avatar component displays image URLs with an initials fallback if an image fails. Registration now sends the optimized photo to the API and persists it in `Profile.photoUrl`, so it survives session refresh. Existing users can re-upload their photo or cover from Settings; those images now persist through the profile update endpoint. If a previously local-only image was already lost, it cannot be recovered automatically.

## 3. Followers/following counts

The authenticated profile endpoint returns Prisma relationship counts. The own-profile page now fetches these persisted counts and displays followers/following/post totals instead of hardcoded missing values. Public profile counts continue to come from the profile API. Profile edits now persist names, username, bio, campus, course, year, interests, skills, visibility, photo and cover.

## 4. Mobile sidebar

The mobile sidebar is now a real animated off-canvas drawer with a backdrop, independent scroll, Escape/backdrop close, close-on-navigation, and stacking above the bottom navigation. The page layout no longer needs to squeeze around it. Reduced-motion settings are respected.

## Verification

A fresh production build could not be run in this environment because `npm ci` timed out and workspace dependencies remained incomplete. Run the project builds locally after extracting the ZIP.
