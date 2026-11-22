# CampusLink Phase 3 — Social Engine Upgrade (API Foundation)

This patch extends the current CampusLink NestJS/Prisma social foundation without introducing a database migration or duplicating existing relationship/engagement models.

## Added

- `GET /api/v1/posts?mode=latest|popular` — latest chronological feed or bounded engagement ranking.
- `GET /api/v1/posts/saved?cursor=...` — cursor-paginated saved posts for the authenticated account.
- `GET /api/v1/posts/trending` — engagement-ranked posts from the last seven days (candidate window is bounded to 100; returns up to 20).
- `GET /api/v1/profiles/recommended` — recommended public accounts, scored by shared interests, same campus, same course and follower count; excludes self, already-followed accounts, blocked accounts and muted accounts.
- `GET /api/v1/notifications/summary` — unread notification count and real received-engagement totals for posts.
- Frontend API client methods for feeds, trending, saved posts, recommendations, likes, bookmarks, reposts, comments and activity summary.
- Feed exclusion of accounts muted by the viewer.

## Existing features reused

CampusLink already has database models and API handlers for follows, likes, comments/replies, reposts, bookmarks, notification records, followers/following lists, profile discovery and post views. This patch builds on those.


## Ranking details

- Popular feed: latest 200 eligible posts are scored by `likes + 2*comments + 3*reposts`; score ties favor newer posts. Popular pagination operates inside this bounded candidate set and may shift if engagement changes between requests.
- Trending: latest eligible posts within the previous seven days, bounded to 100 candidates, ranked by the same engagement score and returns up to 20.
- Recommendations: latest 100 eligible public accounts, scored by shared interests (5 points each), same campus (3 points), same course (2 points), then follower count for tie-breaking. It is a bounded recommendation pass, not an ML system.

## Files changed

- `apps/api/src/posts/posts.service.ts`
- `apps/api/src/posts/posts.controller.ts`
- `apps/api/src/posts/posts.dto.ts`
- `apps/api/src/profiles/profiles.service.ts`
- `apps/api/src/profiles/profiles.controller.ts`
- `apps/api/src/notifications/notifications.service.ts`
- `apps/api/src/notifications/notifications.controller.ts`
- `apps/web/src/services/api.ts`


## Database

No Prisma schema changes or migration are included. The patch uses existing tables/relations.


## Build verification

TypeScript syntax transpilation passed for every changed source file. A full workspace build could not be completed because `npm ci` timed out and left incomplete type packages in the temporary verification environment. Run the builds locally after dependencies are installed:


```powershell
npm ci
npx prisma generate --schema apps/api/prisma/schema.prisma
npm run build -w apps/api
npm run build -w apps/web
```

This patch adds API capabilities and frontend API-client methods. The current `App.tsx` social feed still uses local preview state for posts and interactions; full end-to-end UI migration from local state to these API methods is a distinct integration step and is not falsely marked complete here.
