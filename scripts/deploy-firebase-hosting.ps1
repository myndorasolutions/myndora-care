# Build web SPA and deploy to Firebase Hosting (Classic).
#
# Prerequisites:
#   firebase login
#   gcloud config set project YOUR_GCP_PROJECT_ID  (must match web/.firebaserc)
#   Cloud Run service myndora-backend-api deployed in europe-west3
#
# Usage:
#   powershell -File scripts\deploy-firebase-hosting.ps1

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$WebRoot = Join-Path $RepoRoot "web"

Push-Location $WebRoot
try {
    Write-Host "Building production SPA (VITE_API_BASE_URL=/api/v1) ..."
    npm run build

    if (-not (Test-Path "dist\index.html")) {
        Write-Error "Build failed: dist/index.html not found"
    }

    Write-Host "Deploying Firebase Hosting ..."
    npx -y firebase-tools@latest deploy --only hosting

    Write-Host ""
    Write-Host "Post-deploy checks:"
    Write-Host "  1. Firebase Console -> Hosting (latest release active)"
    Write-Host "  2. https://YOUR-PROJECT.web.app/login"
    Write-Host "  3. https://YOUR-PROJECT.web.app/api/v1/health"
}
finally {
    Pop-Location
}
