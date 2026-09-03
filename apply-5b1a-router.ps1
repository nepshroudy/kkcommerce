$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$router = Join-Path $root "backend\src\worker\router.mjs"

if (-not (Test-Path $router)) {
  Write-Host "Could not find: $router" -ForegroundColor Red
  Write-Host "Extract this ZIP directly into C:\Projects\kkcommerce and run the script again."
  exit 1
}

$content = Get-Content -Raw -Path $router

if ($content -match 'adminOrdersByDateRoute') {
  Write-Host "5B1A router patch is already installed." -ForegroundColor Yellow
  exit 0
}

$backup = "$router.5b1a.bak"
if (-not (Test-Path $backup)) {
  Copy-Item $router $backup
  Write-Host "Backup created: $backup"
}

$commerceImportPattern = '(?ms)(import\s*\{\s*handleCommerceRoutes,\s*\}\s*from\s*"\./routes/commerce\.mjs";)'
$adminImport = @'

import {
  adminOrdersByDateRoute,
} from "./routes/admin-orders-by-date.mjs";
'@

if ($content -notmatch $commerceImportPattern) {
  Write-Host "Could not locate the commerce route import in router.mjs." -ForegroundColor Red
  Write-Host "No changes were made. Restore from the backup if needed."
  exit 1
}

$content = [regex]::Replace(
  $content,
  $commerceImportPattern,
  ('$1' + $adminImport),
  1
)

$fallbackPattern = '(?ms)\}\s*else\s*\{\s*response\s*=\s*await\s+handleCommerceRoutes\(request,\s*context\);'
$replacement = @'
} else if (
    method === "GET" &&
    pathname === "/api/admin/orders"
  ) {
    response = await adminOrdersByDateRoute(
      request,
      context
    );
  } else {
    response = await handleCommerceRoutes(request, context);
'@

if ($content -notmatch $fallbackPattern) {
  Write-Host "Could not locate the commerce fallback block in router.mjs." -ForegroundColor Red
  Write-Host "The original file is available at: $backup"
  exit 1
}

$content = [regex]::Replace(
  $content,
  $fallbackPattern,
  $replacement,
  1
)

Set-Content -Path $router -Value $content -Encoding UTF8
Write-Host "5B1A router patch installed successfully." -ForegroundColor Green
Write-Host "Next run:"
Write-Host "  cd C:\Projects\kkcommerce\backend"
Write-Host "  npx wrangler deploy --dry-run"
