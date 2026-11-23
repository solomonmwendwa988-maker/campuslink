$ErrorActionPreference = 'Stop'

$root = "C:\Users\ShadowNeko\Videos\campuslink_web"
$appFile = Join-Path $root "apps\web\src\app\App.tsx"

if (-not (Test-Path $appFile)) {
  throw "CampusLink App.tsx not found at: $appFile. No files were changed."
}

# Make a backup before any edits.
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $root "campuslink-backups"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
$backup = Join-Path $backupDir "App.tsx-$stamp.bak"
Copy-Item -Path $appFile -Destination $backup
Write-Host "Backup created: $backup" -ForegroundColor Cyan

$content = Get-Content -Path $appFile -Raw
$changed = $false

# Fix: do not force every authenticated SUPER_ADMIN into the Admin dashboard.
# Admin remains accessible through the protected Administration navigation.
$autoAdminPattern = "(?m)^\s*if\s*\(isAuthenticated\s*&&\s*adminIdentity\?\.admin\.role\s*===\s*'SUPER_ADMIN'\s*&&\s*page\s*!==\s*'Admin'\)\s*return\s*<AdminDashboardPage\s+identity=\{adminIdentity\}\s+onBack=\{\(\)=>\{\}\}\s*\/>\s*;\s*\r?\n?"
if ([regex]::IsMatch($content, $autoAdminPattern)) {
  $content = [regex]::Replace($content, $autoAdminPattern, "", 1)
  $changed = $true
  Write-Host "Removed the automatic Super Admin dashboard redirect." -ForegroundColor Green
} else {
  Write-Host "Automatic Super Admin redirect not found (already absent or source differs)." -ForegroundColor Yellow
}

# Make the Admin dashboard Back button return Super Admins to the regular app too.
$superAdminBack = "onBack={adminIdentity.admin.role==='SUPER_ADMIN'?()=>{}:()=>setPage('Home')}"
if ($content.Contains($superAdminBack)) {
  $content = $content.Replace($superAdminBack, "onBack={()=>setPage('Home')}")
  $changed = $true
  Write-Host "Restored the Admin dashboard Back navigation for Super Admin." -ForegroundColor Green
}

# Fix the missing Shield icon import only if the source uses Shield and it is not imported.
$iconPattern = '(?s)import\s*\{(?<icons>.*?)\}\s*from\s*[''"]lucide-react[''"]\s*;'
$iconMatch = [regex]::Match($content, $iconPattern)
if ($content -match '\bShield\b' -and $iconMatch.Success -and $iconMatch.Groups["icons"].Value -notmatch '\bShield\b') {
  $icons = $iconMatch.Groups["icons"].Value.Trim().TrimEnd(',').TrimEnd()
  $replacement = "import { $icons, Shield } from 'lucide-react';"
  $content = $content.Substring(0, $iconMatch.Index) + $replacement + $content.Substring($iconMatch.Index + $iconMatch.Length)
  $changed = $true
  Write-Host "Added missing Shield icon import." -ForegroundColor Green
}

if ($changed) {
  [System.IO.File]::WriteAllText($appFile, $content, [System.Text.UTF8Encoding]::new($false))
  Write-Host "Patched App.tsx safely." -ForegroundColor Green
} else {
  Write-Host "App.tsx required no changes." -ForegroundColor Yellow
}

Set-Location $root

Write-Host "`n=== Generate Prisma client ===" -ForegroundColor Cyan
npm run db:generate -w apps/api
if ($LASTEXITCODE -ne 0) { throw "Prisma generation failed. Review the output above; backup remains at $backup." }

Write-Host "`n=== Build frontend ===" -ForegroundColor Cyan
npm run build -w apps/web
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed. Review the output above; backup remains at $backup." }

Write-Host "`n=== Build backend ===" -ForegroundColor Cyan
npm run build -w apps/api
if ($LASTEXITCODE -ne 0) { throw "Backend build failed. Review the output above; backup remains at $backup." }

Write-Host "`n=== Run API auth security tests ===" -ForegroundColor Cyan
npm run test -w apps/api
if ($LASTEXITCODE -ne 0) { throw "API auth tests failed. Review the output above; backup remains at $backup." }

Write-Host "`nCampusLink repair checks completed successfully." -ForegroundColor Green
