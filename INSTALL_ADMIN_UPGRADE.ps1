$ErrorActionPreference = 'Stop'

$root = (Get-Location).Path
$appFile = Join-Path $root 'apps/web/src/app/App.tsx'
$styleFile = Join-Path $root 'apps/web/src/styles/admin-phase3.css'
$sourceStyle = Join-Path $PSScriptRoot 'apps/web/src/styles/admin-phase3.css'

if (!(Test-Path $appFile)) {
  throw "Can't find apps/web/src/app/App.tsx. Run this script from the CampusLink workspace root. No files changed."
}
if (!(Test-Path $sourceStyle)) {
  throw "Upgrade CSS is missing next to the script. Re-extract the ZIP preserving folders. No files changed."
}

$backupDir = Join-Path $root 'campuslink-backups/admin-ui-phase3'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item $appFile (Join-Path $backupDir "App.tsx-$stamp.bak") -Force

$targetStylesDir = Split-Path $styleFile -Parent
New-Item -ItemType Directory -Force -Path $targetStylesDir | Out-Null
if ([IO.Path]::GetFullPath($sourceStyle) -ne [IO.Path]::GetFullPath($styleFile)) { Copy-Item $sourceStyle $styleFile -Force }

$content = Get-Content $appFile -Raw
$importLine = "import '../styles/admin-phase3.css';"
if ($content -notmatch [regex]::Escape($importLine)) {
  # Insert after the existing import block so CSS loads after earlier app styles.
  $lastImport = [regex]::Matches($content, '(?m)^import .*?;\s*$') | Select-Object -Last 1
  if ($lastImport) {
    $idx = $lastImport.Index + $lastImport.Length
    $content = $content.Insert($idx, "`r`n$importLine")
  } else {
    $content = "$importLine`r`n$content"
  }
  Set-Content -Path $appFile -Value $content -NoNewline -Encoding UTF8
}
Write-Host "Admin UI Phase 3 visual refinement installed." -ForegroundColor Green
Write-Host "Backup: $backupDir" -ForegroundColor Cyan
Write-Host "Next, run: npm run build -w apps/web" -ForegroundColor Yellow

