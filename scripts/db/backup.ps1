param(
  [string]$OutputDirectory = "./backups",
  [switch]$Verify
)
$ErrorActionPreference = 'Stop'
$envFile = Join-Path (Get-Location) 'apps/api/.env'
if (-not (Test-Path $envFile)) { throw "Missing apps/api/.env. Run this from the CampusLink workspace root." }
$line = Get-Content $envFile | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1
if (-not $line) { throw 'DATABASE_URL not found in apps/api/.env' }
$dbUrl = ($line -replace '^\s*DATABASE_URL\s*=\s*','').Trim().Trim('"').Trim("'")
if (-not $dbUrl) { throw 'DATABASE_URL is empty' }
$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) { throw 'pg_dump not found. Install PostgreSQL client tools and ensure pg_dump is on PATH.' }
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$file = Join-Path $OutputDirectory "campuslink-$stamp.dump"
Write-Host "Creating database backup: $file"
& pg_dump --dbname="$dbUrl" --format=custom --no-owner --no-acl --file="$file"
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed with exit code $LASTEXITCODE" }
if (-not (Test-Path $file) -or (Get-Item $file).Length -lt 1024) { throw 'Backup file is missing or unexpectedly small.' }
$hash = Get-FileHash -Path $file -Algorithm SHA256
$hashFile = "$file.sha256"
"$($hash.Hash)  $(Split-Path $file -Leaf)" | Set-Content -Path $hashFile -Encoding ASCII
Write-Host "Backup created. SHA256: $($hash.Hash)"
if ($Verify) {
  $pgRestore = Get-Command pg_restore -ErrorAction SilentlyContinue
  if (-not $pgRestore) { throw 'pg_restore not found; backup created but verification could not run.' }
  & pg_restore --list "$file" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'pg_restore archive listing verification failed.' }
  Write-Host 'Backup archive verification: PASS (archive readable; restore rehearsal still recommended).'
}
