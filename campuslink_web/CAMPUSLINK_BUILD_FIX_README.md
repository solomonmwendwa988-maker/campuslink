# CampusLink Social Interactions — Build Fix

This corrective patch resolves the TypeScript build errors reported after the social interactions upgrade.

## Apply
1. Extract this ZIP into the CampusLink repository root and overwrite files.
2. From the repository root run: `npx prisma generate --schema apps/api/prisma/schema.prisma`
3. Build: `npm run build -w apps/api` then `npm run build -w apps/web`.
4. Deploy only after both builds pass. The included migration is `20261122100000_comment_likes`; deployment must apply Prisma migrations (`prisma migrate deploy`) before the API uses the new CommentLike table. Do not reset or delete your database.

## Fixes
- Adds CommentLike relations and model to Prisma schema (from original upgrade).
- Includes the CommentLike SQL migration.
- Uses `Repeat` icon supported by installed lucide-react version instead of `Repeat2`.
- Corrects notification type check from display label `Likes` to API enum `LIKE`.
