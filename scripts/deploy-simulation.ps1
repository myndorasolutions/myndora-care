# Deploy simulation stack: build image, Cloud Run sim API, migrate sim DB, Hosting sim site.
#
# Prerequisites:
#   SIMULATION_DATABASE_URL + SIMULATION_DIRECT_URL (must differ from production)
#   Optional: SIMULATION_SUPABASE_PROJECT_REF
#   Production DATABASE_URL available on myndora-backend-api (for isolation check)
#
# Usage:
#   powershell -File scripts\deploy-simulation.ps1
#   powershell -File scripts\deploy-simulation.ps1 -PaystackPublicKey pk_test_xxx

param(
    [string]$ProjectId = "project-681c9d16-2470-459b-8a1",
    [string]$Region = "europe-west3",
    [string]$PaystackPublicKey = $env:VITE_PAYSTACK_PUBLIC_KEY,
    [string]$SimulationDatabaseUrl = $env:SIMULATION_DATABASE_URL,
    [string]$SimulationDirectUrl = $env:SIMULATION_DIRECT_URL,
    [string]$SimulationSupabaseRef = $env:SIMULATION_SUPABASE_PROJECT_REF,
    [switch]$SkipHosting,
    [switch]$SkipMigrate
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
. (Join-Path $RepoRoot "scripts\lib\Deploy-Common.ps1")

$gcloud = Resolve-GcloudExe
$defaults = Get-DualDeployDefaults -Environment simulation
$sha = Get-GitShortSha -RepoRoot $RepoRoot
$ImageTag = "sim-$sha"
$Image = "europe-west3-docker.pkg.dev/$ProjectId/myndora-repo/myndora-backend-api:$ImageTag"

Write-Host "=== Deploy simulation ===" -ForegroundColor Cyan
Write-Host "Image=$Image"
Write-Host "Service=$($defaults.ServiceName) Site=$($defaults.HostingSiteId)"

if (-not $SimulationDatabaseUrl) {
    throw "Set SIMULATION_DATABASE_URL to a Supabase pooler URL that is NOT production."
}
if (-not $SimulationDirectUrl) {
    throw "Set SIMULATION_DIRECT_URL for migrations (direct Postgres port 5432)."
}

# Production fingerprint from live service (never print secrets)
$prev = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$prodDb = $null
try {
    $prodJsonText = & $gcloud run services describe myndora-backend-api --region $Region --project $ProjectId --format=json 2>$null
    if ($prodJsonText) {
        $prodJson = $prodJsonText | ConvertFrom-Json
        $prodDb = ($prodJson.spec.template.spec.containers[0].env | Where-Object { $_.name -eq 'DATABASE_URL' } | Select-Object -First 1).value
    }
} catch {
    Write-Host "Could not parse prod service env: $($_.Exception.Message)" -ForegroundColor Yellow
}
$ErrorActionPreference = $prev
if (-not $prodDb) {
    $prodDb = $env:PRODUCTION_DATABASE_URL
    if (-not $prodDb) { $prodDb = $env:DATABASE_URL }
}
if (-not $prodDb) {
    throw "Production DATABASE_URL is required for isolation checks (set PRODUCTION_DATABASE_URL or ensure myndora-backend-api is readable)."
}
Assert-DistinctDatabaseUrls -SimulationUrl $SimulationDatabaseUrl -ProductionUrl $prodDb

# Ensure Hosting site exists
$token = (& $gcloud auth print-access-token).Trim()
$headers = @{
    Authorization = "Bearer $token"
    'Content-Type' = 'application/json'
    'x-goog-user-project' = $ProjectId
}
$siteId = $defaults.HostingSiteId
try {
    Invoke-RestMethod -Uri "https://firebasehosting.googleapis.com/v1beta1/sites/$siteId" -Headers $headers -UseBasicParsing | Out-Null
    Write-Host "Hosting site $siteId exists." -ForegroundColor Green
} catch {
    Write-Host "Creating Hosting site $siteId ..." -ForegroundColor Cyan
    try {
        Invoke-RestMethod -Method POST `
            -Uri "https://firebasehosting.googleapis.com/v1beta1/projects/$ProjectId/sites?siteId=$siteId" `
            -Headers $headers `
            -Body '{}' | Out-Null
        Write-Host "Hosting site $siteId created." -ForegroundColor Green
    } catch {
        $exists = $false
        if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 409) {
            $exists = $true
        } elseif ("$($_.Exception.Message)" -match '409|ALREADY_EXISTS|Conflict') {
            $exists = $true
        }
        if ($exists) {
            Write-Host "Hosting site $siteId already exists (409)." -ForegroundColor Yellow
        } else {
            throw
        }
    }
}

# Build + push image
Write-Host "Building image via Cloud Build ..." -ForegroundColor Cyan
Push-Location $RepoRoot
try {
    & $gcloud builds submit --tag $Image --project $ProjectId --timeout=1200 .
    if ($LASTEXITCODE -ne 0) { throw "Cloud Build failed ($LASTEXITCODE)" }
} finally {
    Pop-Location
}

# Persist certified tag for promote
$tagFile = Join-Path $RepoRoot "scripts\.last-simulation-image"
$Image | Set-Content -Path $tagFile -Encoding utf8
Write-Host "Wrote certified image tag to $tagFile" -ForegroundColor Green

# Deploy Cloud Run sim
$env:SIMULATION_DATABASE_URL = $SimulationDatabaseUrl
$env:SIMULATION_SUPABASE_PROJECT_REF = $SimulationSupabaseRef
powershell -File (Join-Path $RepoRoot "scripts\deploy-cloud-run.ps1") `
    -ProjectId $ProjectId `
    -Region $Region `
    -Environment simulation `
    -DatabaseUrl $SimulationDatabaseUrl `
    -SupabaseProjectRef $SimulationSupabaseRef `
    -Image $Image
if ($LASTEXITCODE -ne 0) { throw "Simulation Cloud Run deploy failed" }

# Migrate sim DB
if (-not $SkipMigrate) {
    Write-Host "Migrating simulation database ..." -ForegroundColor Cyan
    powershell -File (Join-Path $RepoRoot "scripts\run-db-init-job.ps1") `
        -ProjectId $ProjectId `
        -Region $Region `
        -JobName $defaults.JobName `
        -ServiceName $defaults.ServiceName `
        -Image $Image `
        -DatabaseUrl $SimulationDatabaseUrl `
        -DirectUrl $SimulationDirectUrl `
        -SupabaseProjectRef $SimulationSupabaseRef
    if ($LASTEXITCODE -ne 0) { throw "Simulation DB init failed" }
}

# Hosting
if (-not $SkipHosting) {
    Push-Location (Join-Path $RepoRoot "web")
    try {
        if ($PaystackPublicKey) { $env:VITE_PAYSTACK_PUBLIC_KEY = $PaystackPublicKey }
        Write-Host "Building simulation SPA ..." -ForegroundColor Cyan
        npm run build:simulation
        if ($LASTEXITCODE -ne 0) { throw "Simulation web build failed" }
    } finally {
        Pop-Location
    }

    powershell -File (Join-Path $RepoRoot "scripts\deploy-hosting-api.ps1") `
        -ProjectId $ProjectId `
        -SiteId $siteId `
        -CloudRunService $defaults.ServiceName `
        -CloudRunRegion $Region
    if ($LASTEXITCODE -ne 0) { throw "Simulation hosting deploy failed" }

    # Remap custom domain to sim site (idempotent)
    Write-Host "Ensuring simulation.myndoracare.com maps to $siteId ..." -ForegroundColor Cyan
    powershell -File (Join-Path $RepoRoot "scripts\map-simulation-domain.ps1") `
        -ProjectId $ProjectId `
        -SiteId $siteId `
        -Domain "simulation.myndoracare.com"
}

Write-Host ""
Write-Host "=== Simulation deploy complete ===" -ForegroundColor Green
Write-Host "Certified image: $Image"
Write-Host "App:  https://simulation.myndoracare.com"
Write-Host "Alt:  https://$siteId.web.app"
Write-Host "API:  Cloud Run $($defaults.ServiceName) (via Hosting /api/v1 rewrite)"
Write-Host "Promote when certified:"
Write-Host "  powershell -File scripts\promote-production.ps1 -FromSimulation"
