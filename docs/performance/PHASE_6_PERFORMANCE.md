# CampusLink Phase 6 — Performance & Scalability


## Included
- Additive PostgreSQL indexes for common active feed, comment, user-discovery, marketplace listing, event, and notification query shapes.
- A read-only PostgreSQL statistics snapshot script for focused tables and their indexes.
- A regression test that checks the Phase 6 index declarations/migration and rejects destructive SQL patterns.

## Apply
1. Review and commit/backup the current source before deploying a migration.
2. Run `npm run db:status`.
3. Run `npm run db:migrate` to apply the additive Phase 6 migration. **This creates indexes; it does not delete or alter rows.** On a large production table, index creation can consume IO and may briefly affect writes. Schedule it during a quieter period and monitor database load.
4. Run `npm run db:generate`.
5. Run API tests/build and web build.

## Read-only report
Run `npm run db:performance` with a valid API `DATABASE_URL`. It reports estimated table row counts, table/index sizes, sequential scan counts, and index scan counts for focus tables. Statistics are cumulative since PostgreSQL's last statistics reset; zero index scans do not prove an index is unnecessary.

## Interpretation / next steps
- Capture the report before and after a realistic traffic period to compare.
- Do not drop indexes based only on this snapshot.
- Query-level latency analysis needs `pg_stat_statements` enabled by the database provider. This patch does not enable extensions or change provider settings.
- No cache is added in this phase: caching personalized feeds/messages risks stale or cross-user data. Add caching only with explicit invalidation and privacy boundaries.
- Existing bounded feed/discovery/message pagination is retained; this phase does not increase result limits.
