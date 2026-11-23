# CampusLink Phase 2 — Database Integrity, Backup & Recovery

## Safety scope
This phase adds read-only integrity diagnostics and explicit backup/restore tooling. It does **not** drop, reset, truncate, or automatically clean data. It does not run migrations during build or startup. Backups contain private user data; store them encrypted, restrict access, and do not commit them to Git.

## 1. Integrity diagnostics
From the workspace root:

```powershell
npm run db:integrity
```
The report counts only and does not print user rows or mutate the database. `REVIEW` counts require investigation; do not automatically delete/repair rows based only on this output.

Checks: campus/university mismatch in profiles, self-follow/self-block/self-mute, comment-parent cross-post mismatch, event time order, negative listing prices, messages sent by non-participants, oversized direct conversations, direct conversations with participant count other than two, and active expired refresh sessions.

## 2. Create and verify a backup
Install PostgreSQL command-line tools (`pg_dump` and `pg_restore`) and ensure they are on PATH. Run from the workspace root:
```powershell
./scripts/db/backup.ps1 -Verify
```
A timestamped custom-format dump and SHA-256 sidecar are written to `./backups`. The verification checks archive readability; it is not a substitute for a restore rehearsal.

## 3. Recovery rehearsal (recommended in a separate database)
1. Create a separate empty PostgreSQL recovery database. Never use the live production database as the rehearsal target.
2. Obtain its connection string and the backup file.
3. Run:
```powershell
./scripts/db/restore.ps1 -BackupFile "./backups/campuslink-YYYYMMDD-HHMMSS.dump" -TargetDatabaseUrl "<RECOVERY_DATABASE_URL>" -ConfirmRestore
```
4. Run `npx prisma migrate status --schema apps/api/prisma/schema.prisma` using the recovery connection, then run `npm run db:integrity` against that recovery database.
5. Validate sign-in, profiles, feed, messaging, reports, admin data and key relationships before declaring recovery successful.

The restore script asks for a second typed confirmation and does not create or drop the target database. `pg_restore --clean --if-exists` removes objects with matching names in the target, so use a dedicated recovery database.

## 4. Suggested operational schedule
- Before schema changes: create and verify a backup; review migration SQL.
- Production: schedule encrypted daily backups and retain a short rolling window plus weekly/monthly copies according to storage and privacy requirements.
- Periodically rehearse restoring to an isolated database. Record recovery time and the backup timestamp.
- Monitor backup exit codes and disk space; an unverified backup is not a recovery plan.
- Keep `backups/` outside version control and limit access.

## 5. Data integrity notes
The schema already uses primary keys, unique constraints, composite keys and foreign-key delete actions across core social records. This patch avoids adding potentially failing constraints until the diagnostics can be run against live data and existing findings are resolved. `Report.targetId` and `ActivityEvent.targetId` are polymorphic references and intentionally do not have a single target foreign key.
