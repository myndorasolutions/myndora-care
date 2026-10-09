# Build + deploy simulation SPA only (API must already exist).
# Prefer scripts\deploy-simulation.ps1 for full dual-deploy.
#
# Usage:
#   powershell -File scripts\deploy-simulation-hosting.ps1

param(
    [string]$PaystackPublicKey = $env:VITE_PAYSTACK_PUBLIC_KEY,
    [string]$ProjectId = "project-681c9d16-2470-459b-8a1",
    [string]$SiteId = "myndora-care-simulation",
    [string]$CloudRunService = "myndora-backend-api-sim"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$WebRoot = Join-Path $RepoRoot "web"

Push-Location $WebRoot
try {
    if ($PaystackPublicKey) {
        $env:VITE_PAYSTACK_PUBLIC_KEY = $PaystackPublicKey
    }

    Write-Host "Building simulation SPA (mode=simulation, API=/api/v1 -> $CloudRunService) ..." -ForegroundColor Cyan
    npm run build:simulation

    if (-not (Test-Path "dist\index.html")) {
        Write-Error "Build failed: dist/index.html not found"
    }
    if (-not (Test-Path "dist\robots.txt")) {
        Write-Error "Build failed: dist/robots.txt not found"
    }
} finally {
    Pop-Location
}

powershell -File (Join-Path $RepoRoot "scripts\deploy-hosting-api.ps1") `
    -ProjectId $ProjectId `
    -SiteId $SiteId `
    -CloudRunService $CloudRunService

Write-Host ""
Write-Host "Post-deploy:" -ForegroundColor Green
Write-Host "  https://simulation.myndoracare.com/login"
Write-Host "  https://$SiteId.web.app/login"
Write-Host "  Full stack: powershell -File scripts\deploy-simulation.ps1"
