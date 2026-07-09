# Myndora Care — Phase 1 seed + Phase 4 post-deploy smoke tests.
#
# Prerequisites:
#   - DATABASE_URL set (or pass -DatabaseUrl) for seed phase
#   - npm install at repo root (ts-node + prisma for seed)
#   - If Prisma SSL fails locally: $env:NODE_EXTRA_CA_CERTS="C:\path\to\ca.pem"
#
# Usage:
#   # Phase 1 only — prepare production DB
#   powershell -File scripts\launch-checklist.ps1 -SeedOnly -DatabaseUrl "postgresql://..."
#
#   # Post-deploy smoke (assumes seed already ran)
#   powershell -File scripts\launch-checklist.ps1 -BaseUrl "https://myndora-care-dev.web.app" -SkipSeed
#
#   # Seed + smoke in one run
#   powershell -File scripts\launch-checklist.ps1 `
#     -BaseUrl "https://myndora-care-dev.web.app" `
#     -DatabaseUrl "postgresql://..."

param(
    [string]$BaseUrl = "",
    [string]$DatabaseUrl = $env:DATABASE_URL,
    [string]$CloudRunUrl = "",
    [switch]$SeedOnly,
    [switch]$SkipSeed
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$BackendRoot = Join-Path $RepoRoot "backend"

$PatientId = "playtest-patient-grace"
$AdminToken = "mock-jwt-admin"
$CaregiverToken = "mock-jwt-caregiver"
$RequestTimeoutSec = 30

$script:TestResults = @()

function Write-TestResult {
    param(
        [int]$Number,
        [string]$Name,
        [bool]$Passed,
        [string]$Detail = ""
    )
    $status = if ($Passed) { "PASS" } else { "FAIL" }
    $color = if ($Passed) { "Green" } else { "Red" }
    Write-Host "[$status] Test $Number`: $Name" -ForegroundColor $color
    if ($Detail) {
        Write-Host "       $Detail" -ForegroundColor Gray
    }
    $script:TestResults += [PSCustomObject]@{
        Number = $Number
        Name   = $Name
        Passed = $Passed
        Detail = $Detail
    }
}

function Normalize-BaseUrl {
    param([string]$Url)
    return $Url.TrimEnd("/")
}

function Invoke-SmokeHtml {
    param([string]$Url)
    return Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec $RequestTimeoutSec -UseBasicParsing
}

function Invoke-SmokeJson {
    param(
        [string]$Url,
        [string]$Method = "Get",
        [hashtable]$Headers = @{},
        [string]$Body = $null
    )
    $params = @{
        Uri         = $Url
        Method      = $Method
        TimeoutSec  = $RequestTimeoutSec
        Headers     = $Headers
        ContentType = "application/json"
    }
    if ($Body) {
        $params.Body = $Body
    }
    return Invoke-RestMethod @params
}

function Invoke-SeedPhase {
    if (-not $DatabaseUrl) {
        Write-Error "DATABASE_URL is required for seed phase. Set env var or pass -DatabaseUrl."
    }

    $env:DATABASE_URL = $DatabaseUrl

    Write-Host ""
    Write-Host "=== Phase 1: Database migrate + seed ===" -ForegroundColor Cyan

    Push-Location $BackendRoot
    try {
        Write-Host "Running prisma migrate deploy ..."
        npx prisma migrate deploy
        if ($LASTEXITCODE -ne 0) {
            throw "prisma migrate deploy failed with exit code $LASTEXITCODE"
        }

        Write-Host "Running prisma db seed ..."
        npx prisma db seed
        if ($LASTEXITCODE -ne 0) {
            throw "prisma db seed failed with exit code $LASTEXITCODE"
        }

        Write-Host "Phase 1 complete." -ForegroundColor Green
    }
    finally {
        Pop-Location
    }
}

function Invoke-SmokeTests {
    param([string]$Origin)

    $Origin = Normalize-BaseUrl $Origin

    Write-Host ""
    Write-Host "=== Phase 4: Smoke tests against $Origin ===" -ForegroundColor Cyan

    # Test 1: SPA shell at /login
    try {
        $login = Invoke-SmokeHtml "$Origin/login"
        $body = $login.Content
        $hasRoot = $body -match 'id="root"'
        $hasTitle = $body -match "Myndora Care"
        $passed = ($login.StatusCode -eq 200) -and $hasRoot -and $hasTitle
        Write-TestResult -Number 1 -Name "SPA loads /login" -Passed $passed `
            -Detail "status=$($login.StatusCode), root=$hasRoot, title=$hasTitle"
    }
    catch {
        Write-TestResult -Number 1 -Name "SPA loads /login" -Passed $false -Detail $_.Exception.Message
    }

    # Test 2: SPA fallback at /sponsor/dashboard
    try {
        $dashboard = Invoke-SmokeHtml "$Origin/sponsor/dashboard"
        $body = $dashboard.Content
        $hasRoot = $body -match 'id="root"'
        $hasTitle = $body -match "Myndora Care"
        $passed = ($dashboard.StatusCode -eq 200) -and $hasRoot -and $hasTitle
        Write-TestResult -Number 2 -Name "SPA routing /sponsor/dashboard" -Passed $passed `
            -Detail "status=$($dashboard.StatusCode), SPA shell present=$hasRoot"
    }
    catch {
        Write-TestResult -Number 2 -Name "SPA routing /sponsor/dashboard" -Passed $false -Detail $_.Exception.Message
    }

    # Test 3: API rewrite /api/v1/health via Firebase domain
    try {
        $health = Invoke-SmokeJson "$Origin/api/v1/health"
        $passed = ($health.status -eq "ok") -and ($health.service -eq "myndora-care-backend")
        Write-TestResult -Number 3 -Name "API rewrite /api/v1/health" -Passed $passed `
            -Detail "status=$($health.status), service=$($health.service)"
    }
    catch {
        Write-TestResult -Number 3 -Name "API rewrite /api/v1/health" -Passed $false -Detail $_.Exception.Message
    }

    # Test 4: Admin review queue
    $reviewQueue = $null
    try {
        $headers = @{ Authorization = "Bearer $AdminToken" }
        $reviewQueue = @(Invoke-SmokeJson "$Origin/api/v1/vitals/review-queue" -Headers $headers)
        $needsReview = @($reviewQueue | Where-Object { $_.status -eq "needs_review" })
        $passed = ($reviewQueue.Count -ge 1) -and ($needsReview.Count -ge 1)
        Write-TestResult -Number 4 -Name "Admin review queue" -Passed $passed `
            -Detail "total=$($reviewQueue.Count), needs_review=$($needsReview.Count)"
    }
    catch {
        Write-TestResult -Number 4 -Name "Admin review queue" -Passed $false -Detail $_.Exception.Message
    }

    # Test 5: Sponsor vitals trend + visit history
    try {
        $headers = @{ Authorization = "Bearer $CaregiverToken" }
        $trend = @(Invoke-SmokeJson "$Origin/api/v1/vitals/patient/$PatientId/trend?days=14" -Headers $headers)
        $visits = @(Invoke-SmokeJson "$Origin/api/v1/chw-visits/patient/$PatientId" -Headers $headers)
        $passed = ($trend.Count -ge 1) -and ($visits.Count -ge 1)
        Write-TestResult -Number 5 -Name "Sponsor vitals + visits" -Passed $passed `
            -Detail "trend=$($trend.Count), visits=$($visits.Count)"
    }
    catch {
        Write-TestResult -Number 5 -Name "Sponsor vitals + visits" -Passed $false -Detail $_.Exception.Message
    }

    # Test 6: PATCH review
    try {
        if (-not $reviewQueue -or $reviewQueue.Count -eq 0) {
            throw "No review queue data from test 4"
        }
        $target = $reviewQueue | Where-Object { $_.status -eq "needs_review" } | Select-Object -First 1
        if (-not $target) {
            throw "No needs_review vital available to patch"
        }
        $headers = @{ Authorization = "Bearer $AdminToken" }
        $patchBody = '{"status":"reviewed","clinician_notes":"Launch checklist automated test"}'
        $patched = Invoke-SmokeJson "$Origin/api/v1/vitals/$($target.id)/review" `
            -Method Patch -Headers $headers -Body $patchBody
        $passed = $patched.status -eq "reviewed"
        Write-TestResult -Number 6 -Name "PATCH vital review" -Passed $passed `
            -Detail "vital=$($target.id), status=$($patched.status)"
    }
    catch {
        Write-TestResult -Number 6 -Name "PATCH vital review" -Passed $false -Detail $_.Exception.Message
    }

    # Test 7: Same-origin (implicit if tests 3-6 passed on BaseUrl)
    $apiTests = $script:TestResults | Where-Object { $_.Number -ge 3 -and $_.Number -le 6 }
    $allApiPassed = ($apiTests | Where-Object { -not $_.Passed }).Count -eq 0
    Write-TestResult -Number 7 -Name "Same-origin API calls" -Passed $allApiPassed `
        -Detail "All API requests used Firebase origin: $Origin"

    if ($CloudRunUrl) {
        $direct = Normalize-BaseUrl $CloudRunUrl
        Write-Host ""
        Write-Host "Diagnostic: direct Cloud Run health check (not pass/fail):" -ForegroundColor Yellow
        try {
            $directHealth = Invoke-SmokeJson "$direct/api/v1/health"
            Write-Host "  Cloud Run: $direct/api/v1/health -> status=$($directHealth.status)" -ForegroundColor Gray
            Write-Host "  Firebase:  $Origin/api/v1/health (rewrite target)" -ForegroundColor Gray
        }
        catch {
            Write-Host "  Cloud Run health check failed: $($_.Exception.Message)" -ForegroundColor Gray
        }
    }
}

function Write-Summary {
    Write-Host ""
    Write-Host "=== Summary ===" -ForegroundColor Cyan
    $passed = @($script:TestResults | Where-Object { $_.Passed }).Count
    $total = $script:TestResults.Count
    Write-Host "$passed / $total tests passed"

    $failed = $script:TestResults | Where-Object { -not $_.Passed }
    if ($failed.Count -gt 0) {
        Write-Host ""
        Write-Host "Failed tests:" -ForegroundColor Red
        foreach ($f in $failed) {
            Write-Host "  - Test $($f.Number): $($f.Name) - $($f.Detail)" -ForegroundColor Red
        }
        exit 1
    }

    Write-Host ""
    Write-Host "All smoke tests passed." -ForegroundColor Green
}

# --- Main ---

if (-not $SkipSeed) {
    if (-not $DatabaseUrl) {
        if ($SeedOnly) {
            Write-Error "DATABASE_URL is required for seed phase. Set env var or pass -DatabaseUrl."
        }
        Write-Host "Skipping seed phase (no DATABASE_URL)." -ForegroundColor Yellow
    }
    else {
        Invoke-SeedPhase
    }
}

if ($SeedOnly -and -not $BaseUrl) {
    Write-Host "Seed-only run complete."
    exit 0
}

if (-not $BaseUrl) {
    Write-Error "-BaseUrl is required for smoke tests. Example: -BaseUrl https://myndora-care-dev.web.app"
}

Invoke-SmokeTests -Origin $BaseUrl
Write-Summary
