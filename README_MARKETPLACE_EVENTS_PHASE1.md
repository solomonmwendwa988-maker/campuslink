# CampusLink Marketplace & Events — Phase 1 API Query Upgrade

## Included changes (4 API source files)

### Marketplace listing discovery
- Adds server-side condition filter (`NEW`, `LIKE_NEW`, `GOOD`, `FAIR`).
- Adds explicit server-side sorting: `NEWEST` (default), `PRICE_LOW`, `PRICE_HIGH`.
- Preserves existing campus visibility, blocking exclusions, soft deletion, availability, search, category, and cursor pagination behavior.
- Rejects an invalid min/max price range (minimum greater than maximum).

### Events discovery
- Adds optional ISO date-time bounds (`from`, `to`) to query upcoming events.
- Adds sort selection (`UPCOMING`, default; or `NEWEST`).
- Validates that the requested date range is not reversed.
- Preserves campus visibility, blocked-owner exclusion, soft-deletion, search/category filters and cursor pagination.

## Apply
Copy the `apps` folder into the CampusLink repository root and merge/overwrite matching files.

## Verify
From repository root:

```powershell
npm run build -w apps/api
npm run test -w apps/api
```

This is an API query-foundation upgrade, not the full Marketplace/Events feature release. The current frontend Marketplace and Events views still contain local-state/mock presentation. Listing location/phone visibility, persisted seller management, API-driven event creation/RSVP UI, event capacity/registration, organizer tools, and frontend integration remain future phases. No database schema migration is included.
