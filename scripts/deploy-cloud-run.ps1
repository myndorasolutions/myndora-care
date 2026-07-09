# Deploy NestJS API to Cloud Run as myndora-backend-api (Firebase Hosting rewrite target).
#
# Prerequisites:
#   gcloud auth login
#   gcloud config set project YOUR_GCP_PROJECT_ID
#
# Usage:
#   powershell -File scripts\deploy-cloud-run.ps1
#   powershell -File scripts\deploy-cloud-run.ps1 -ProjectId myndora-care-dev -DatabaseUrl "postgresql://..."

param(
    [string]$ProjectId = "",
    [string]$Region = "europe-west3",
    [string]$ServiceName = "myndora-backend-api",
    [string]$DatabaseUrl = $env:DATABASE_URL
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

if ($ProjectId) {
    gcloud config set project $ProjectId
}

if (-not $DatabaseUrl) {
    Write-Error "Set DATABASE_URL env var or pass -DatabaseUrl for Cloud Run."
}

Push-Location $RepoRoot
try {
    gcloud run deploy $ServiceName `
        --source . `
        --region $Region `
        --allow-unauthenticated `
        --port 8080 `
        --set-build-env-vars "BP_NODE_INSTALL_ARGS=--no-frozen-lockfile" `
        --set-env-vars "NODE_ENV=production,APP_ENV=production,DATABASE_URL=$DatabaseUrl,CORS_ORIGINS=*"

    Write-Host ""
    Write-Host "Cloud Run service deployed: $ServiceName ($Region)"
    Write-Host "Verify: gcloud run services describe $ServiceName --region $Region --format='value(status.url)'"
}
finally {
    Pop-Location
}
