# Promote the certified simulation image (+ production SPA) to production.
#
# Usage:
#   powershell -File scripts\promote-production.ps1 -FromSimulation
#   powershell -File scripts\promote-production.ps1 -ImageTag europe-west3-docker.pkg.dev/.../myndora-backend-api:sim-abc1234
#
# Requires production DB on existing myndora-backend-api (or PRODUCTION_DATABASE_URL).

param(
    [string]$ProjectId = "project-681c9d16-2470-459b-8a1",
    [string]$Region = "europe-west3",
    [string]$ImageTag = "",
    [switch]$FromSimulation,
    [switch]$SkipHosting,
    [string]$ProductionDatabaseUrl = $env:PRODUCTION_DATABASE_URL,
    [string]$ProductionSupabaseRef = $env:PRODUCTION_SUPABASE_PROJECT_REF
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
. (Join-Path $RepoRoot "scripts\lib\Deploy-Common.ps1")

$gcloud = Resolve-GcloudExe
$defaults = Get-DualDeployDefaults -Environment production

if ($FromSimulation -and -not $ImageTag) {
    $tagFile = Join-Path $RepoRoot "scripts\.last-simulation-image"
    if (-not (Test-Path $tagFile)) {
        throw "No scripts\.last-simulation-image found. Deploy simulation first or pass -ImageTag."
    }
    $ImageTag = (Get-Content $tagFile -Raw).Trim()
}

if (-not $ImageTag) {
    throw "Pass -FromSimulation or -ImageTag <certified image> (refuse promote without certified artifact)."
}

Write-Host "=== Promote to production ===" -ForegroundColor Cyan
Write-Host "Image=$ImageTag"
Write-Host "Service=$($defaults.ServiceName)"

# Isolation check vs simulation URL if present
$simDb = $env:SIMULATION_DATABASE_URL
$prev = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
if (-not $ProductionDatabaseUrl) {
    try {
        $prodJsonText = & $gcloud run services describe $defaults.ServiceName --region $Region --project $ProjectId --format=json 2>$null
        if ($prodJsonText) {
            $prodJson = $prodJsonText | ConvertFrom-Json
            $ProductionDatabaseUrl = ($prodJson.spec.template.spec.containers[0].env | Where-Object { $_.name -eq 'DATABASE_URL' } | Select-Object -First 1).value
        }
    } catch {}
}
$ErrorActionPreference = $prev
if (-not $ProductionDatabaseUrl) {
    $ProductionDatabaseUrl = $env:DATABASE_URL
}
if (-not $ProductionDatabaseUrl) {
    throw "Production DATABASE_URL not found on Cloud Run or env."
}
if ($simDb) {
    Assert-DistinctDatabaseUrls -SimulationUrl $simDb -ProductionUrl $ProductionDatabaseUrl
}

powershell -File (Join-Path $RepoRoot "scripts\deploy-cloud-run.ps1") `
    -ProjectId $ProjectId `
    -Region $Region `
    -Environment production `
    -DatabaseUrl $ProductionDatabaseUrl `
    -SupabaseProjectRef $ProductionSupabaseRef `
    -Image $ImageTag
if ($LASTEXITCODE -ne 0) { throw "Production Cloud Run promote failed" }

if (-not $SkipHosting) {
    Push-Location (Join-Path $RepoRoot "web")
    try {
        Write-Host "Building production SPA ..." -ForegroundColor Cyan
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "Production web build failed" }
    } finally {
        Pop-Location
    }

    powershell -File (Join-Path $RepoRoot "scripts\deploy-hosting-api.ps1") `
        -ProjectId $ProjectId `
        -SiteId $defaults.HostingSiteId `
        -CloudRunService $defaults.ServiceName `
        -CloudRunRegion $Region
    if ($LASTEXITCODE -ne 0) { throw "Production hosting deploy failed" }
}

Write-Host ""
Write-Host "=== Production promote complete ===" -ForegroundColor Green
Write-Host "API:  https://api.myndoracare.com/api/v1/health"
Write-Host "Web:  https://$($defaults.HostingSiteId).web.app"
Write-Host "Image promoted: $ImageTag"
