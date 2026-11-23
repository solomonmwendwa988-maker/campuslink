param(
  [Parameter(Mandatory=$true)][string]$BackupFile,
  [Parameter(Mandatory=$true)][string]$TargetDatabaseUrl,
  [switch]$ConfirmRestore
)
$ErrorActionPreference = 'Stop'
if (-not $ConfirmRestore) { throw 'Restore is blocked by default. Re-run with -ConfirmRestore only after verifying the target database URL and backup.' }
if (-not (Test-Path $BackupFile)) { throw "Backup file not found: $BackupFile" }
$pgRestore = Get-Command pg_restore -ErrorAction SilentlyContinue
if (-not $pgRestore) { throw 'pg_restore not found. Install PostgreSQL client tools and ensure pg_restore is on PATH.' }
& pg_restore --list "$BackupFile" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Backup is unreadable; restore stopped.' }
Write-Warning 'Restore may overwrite objects in the TARGET database. Prefer a fresh recovery database. This script does not drop the database.'
$typed = Read-Host 'Type RESTORE to proceed against the specified target'
if ($typed -ne 'RESTORE') { Write-Host 'Cancelled.'; exit 1 }
& pg_restore --dbname="$TargetDatabaseUrl" --no-owner --no-acl --clean --if-exists "$BackupFile"
if ($LASTEXITCODE -ne 0) { throw "pg_restore failed with exit code $LASTEXITCODE" }
Write-Host 'Restore command completed. Run Prisma migration status and integrity checks against the restored target.'
