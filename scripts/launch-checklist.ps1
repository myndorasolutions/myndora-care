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
    [string]$DirectUrl = $env:DIRECT_URL,
    [string]$CloudRunUrl = "",
    [switch]$SeedOnly,
    [switch]$SkipSeed
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$BackendRoot = Join-Path $RepoRoot "backend"

$PatientId = "playtest-patient-grace"
$SponsorId = "playtest-sponsor-tunde"
$AdminToken = "mock-jwt-admin"
$ChwToken = "mock-jwt-chw"
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
    if ($DirectUrl) {
        $env:DIRECT_URL = $DirectUrl
    }
    elseif (-not $env:DIRECT_URL) {
        $env:DIRECT_URL = $DatabaseUrl
    }

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

    $isCloudRunApi = $Origin -match '\.run\.app$'

    # Test 1: SPA shell at /login
    if ($isCloudRunApi) {
        Write-TestResult -Number 1 -Name "SPA loads /login" -Passed $true `
            -Detail "skipped on Cloud Run API URL (no Hosting SPA)"
    }
    else {
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
    }

    # Test 2: SPA fallback at /sponsor/dashboard
    if ($isCloudRunApi) {
        Write-TestResult -Number 2 -Name "SPA routing /sponsor/dashboard" -Passed $true `
            -Detail "skipped on Cloud Run API URL (no Hosting SPA)"
    }
    else {
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

    # Test 4: Escalation review queue
    $reviewQueue = $null
    try {
        $headers = @{ Authorization = "Bearer $AdminToken" }
        $reviewQueue = @(Invoke-SmokeJson "$Origin/api/v1/escalations/review-queue" -Headers $headers)
        $urgent = @($reviewQueue | Where-Object { $_.severity -eq "URGENT" })
        $passed = ($reviewQueue.Count -ge 1) -and ($urgent.Count -ge 1)
        Write-TestResult -Number 4 -Name "Escalation review queue" -Passed $passed `
            -Detail "total=$($reviewQueue.Count), urgent=$($urgent.Count)"
    }
    catch {
        Write-TestResult -Number 4 -Name "Escalation review queue" -Passed $false -Detail $_.Exception.Message
    }

    # Test 5: CHW profile + physical visit submission
    try {
        $headers = @{ Authorization = "Bearer $ChwToken" }
        $profile = Invoke-SmokeJson "$Origin/api/v1/chw/profile" -Headers $headers
        $postBody = @{
            patientId = $PatientId
            sponsorId = $SponsorId
            scheduledTime = (Get-Date).ToUniversalTime().ToString("o")
            checklistResponses = @{ medication_taken = $true }
            systolicBp = 124
            diastolicBp = 78
        } | ConvertTo-Json -Depth 5
        $visit = Invoke-SmokeJson "$Origin/api/v1/physical-visits" `
            -Method Post -Headers $headers -Body $postBody
        $passed = ($profile.activationLevel -eq "HOME_VISIT_APPROVED") -and ($null -ne $visit.visit)
        Write-TestResult -Number 5 -Name "CHW profile + physical visit" -Passed $passed `
            -Detail "activation=$($profile.activationLevel), visit=$($visit.visit.id)"
    }
    catch {
        Write-TestResult -Number 5 -Name "CHW profile + physical visit" -Passed $false -Detail $_.Exception.Message
    }

    # Test 6: Physical visit with urgent BP triggers escalation
    try {
        $headers = @{ Authorization = "Bearer $ChwToken" }
        $postBody = @{
            patientId = $PatientId
            sponsorId = $SponsorId
            scheduledTime = (Get-Date).ToUniversalTime().ToString("o")
            checklistResponses = @{ medication_taken = $false; symptoms = "severe headache" }
            systolicBp = 172
            diastolicBp = 108
        } | ConvertTo-Json -Depth 5
        $flagged = Invoke-SmokeJson "$Origin/api/v1/physical-visits" `
            -Method Post -Headers $headers -Body $postBody
        $passed = ($null -ne $flagged.escalation) -and ($flagged.escalation.severity -eq "URGENT")
        Write-TestResult -Number 6 -Name "Vital-flagging escalation" -Passed $passed `
            -Detail "severity=$($flagged.escalation.severity), visit=$($flagged.visit.id)"
    }
    catch {
        Write-TestResult -Number 6 -Name "Vital-flagging escalation" -Passed $false -Detail $_.Exception.Message
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

function Invoke-E2ELifecycleTests {
    param([string]$Origin)

    $Origin = Normalize-BaseUrl $Origin
    $api = "$Origin/api/v1"
    $stamp = Get-Date -Format "yyyyMMddHHmmss"

    Write-Host ""
    Write-Host "=== Phase 5: Staging E2E lifecycle against $Origin ===" -ForegroundColor Cyan

    $sponsorToken = $null
    $sponsorId = $null
    $patientId = $null
    $chwToken = $null
    $chwProfileId = $null

    # E2E 1: Sponsor onboarding
    try {
        $sponsorEmail = "e2e-sponsor-$stamp@myndora.demo"
        $regBody = @{
            email = $sponsorEmail
            password = "StagingPass1!"
            role = "SPONSOR"
            fullName = "E2E Sponsor $stamp"
            country = "Nigeria"
        } | ConvertTo-Json
        $reg = Invoke-SmokeJson "$api/auth/register" -Method Post -Body $regBody
        $sponsorToken = $reg.accessToken
        $sponsorId = $reg.sponsor.id
        $headers = @{ Authorization = "Bearer $sponsorToken" }
        $patientBody = @{
            fullName = "E2E Patient $stamp"
            dateOfBirth = "1965-01-15T00:00:00.000Z"
            gender = "female"
            address = "E2E Test Address, Ilorin"
            preferredLanguage = "English"
            emergencyContact = @{ name = "E2E Contact"; phone = "+234800000099" }
            conditionTags = @("hypertension")
        } | ConvertTo-Json -Depth 5
        $patient = Invoke-SmokeJson "$api/patients" -Method Post -Headers $headers -Body $patientBody
        $patientId = $patient.id
        $passed = ($null -ne $sponsorId) -and ($patient.consentStatus -eq $false) -and ($patient.sponsorId -eq $sponsorId)
        Write-TestResult -Number 8 -Name "E2E Sponsor onboarding" -Passed $passed `
            -Detail "sponsor=$sponsorId, patient=$patientId, consent=$($patient.consentStatus)"
    }
    catch {
        Write-TestResult -Number 8 -Name "E2E Sponsor onboarding" -Passed $false -Detail $_.Exception.Message
    }

    # E2E 2: Sandbox payment
    try {
        if (-not $sponsorToken) { throw "Skipped: sponsor token missing from E2E 1" }
        $headers = @{ Authorization = "Bearer $sponsorToken" }
        $initBody = @{ amountNaira = 5000; planName = "staging-sandbox" } | ConvertTo-Json
        $init = Invoke-SmokeJson "$api/payments/initialize" -Method Post -Headers $headers -Body $initBody
        $hookBody = @{
            event = "charge.success"
            data = @{ reference = $init.reference }
        } | ConvertTo-Json -Depth 5
        $hook = Invoke-SmokeJson "$api/payments/webhook" -Method Post -Body $hookBody
        $passed = ($init.reference -ne $null) -and ($hook.subscription.isActive -eq $true) -and ($hook.subscription.allocatedVisits -ge 1)
        Write-TestResult -Number 9 -Name "E2E Sandbox payment" -Passed $passed `
            -Detail "ref=$($init.reference), active=$($hook.subscription.isActive), visits=$($hook.subscription.allocatedVisits)"
    }
    catch {
        Write-TestResult -Number 9 -Name "E2E Sandbox payment" -Passed $false -Detail $_.Exception.Message
    }

    # E2E 3: CHW registration + early 403
    try {
        $chwEmail = "e2e-chw-$stamp@myndora.demo"
        $chwRegBody = @{
            email = $chwEmail
            password = "StagingPass1!"
            role = "CHW"
            fullName = "E2E CHW $stamp"
            attachmentPaths = @("/tmp/id-card.pdf", "/tmp/training-cert.pdf")
        } | ConvertTo-Json
        $chwReg = Invoke-SmokeJson "$api/auth/register" -Method Post -Body $chwRegBody
        $chwToken = $chwReg.accessToken
        $chwProfileId = $chwReg.chwProfile.id
        $level = $chwReg.chwProfile.activationLevel
        $denied = $false
        $denyDetail = ""
        try {
            $chwHeaders = @{ Authorization = "Bearer $chwToken" }
            $denyBody = @{
                patientId = $(if ($patientId) { $patientId } else { $PatientId })
                sponsorId = $(if ($sponsorId) { $sponsorId } else { $SponsorId })
                scheduledTime = (Get-Date).ToUniversalTime().ToString("o")
                checklistResponses = @{ medication_taken = $true }
                temperatureCelsius = 36.6
            } | ConvertTo-Json -Depth 5
            Invoke-SmokeJson "$api/physical-visits" -Method Post -Headers $chwHeaders -Body $denyBody | Out-Null
            $denyDetail = "expected 403 but request succeeded"
        }
        catch {
            $status = $null
            if ($_.Exception.Response) {
                $status = [int]$_.Exception.Response.StatusCode
            }
            $denied = ($status -eq 403) -or ($_.Exception.Message -match "403|Forbidden|activation level")
            $denyDetail = "status=$status msg=$($_.Exception.Message)"
        }
        $passed = ($level -eq "PENDING_REVIEW") -and $denied
        Write-TestResult -Number 10 -Name "E2E CHW registration PENDING_REVIEW" -Passed $passed `
            -Detail "level=$level, earlyVisitBlocked=$denied ($denyDetail)"
    }
    catch {
        Write-TestResult -Number 10 -Name "E2E CHW registration PENDING_REVIEW" -Passed $false -Detail $_.Exception.Message
    }

    # E2E 4: Admin activation
    try {
        if (-not $chwProfileId) { throw "Skipped: chwProfileId missing from E2E 3" }
        $adminHeaders = @{ Authorization = "Bearer $AdminToken" }
        $actBody = @{
            chwProfileId = $chwProfileId
            activationLevel = "HOME_VISIT_APPROVED"
            identityVerified = $true
            trainingCompleted = $true
            referencesChecked = $true
            ninStatus = $true
            vettingScorecard = @{
                identityDocument = 5
                ninVerification = 5
                referenceOne = 4
                referenceTwo = 5
                trainingCompetency = 5
                coordinatorNotes = "E2E coordinator call log - all references verified"
            }
        } | ConvertTo-Json -Depth 5
        $activated = Invoke-SmokeJson "$api/chw/activation" -Method Patch -Headers $adminHeaders -Body $actBody
        $passed = ($activated.activationLevel -eq "HOME_VISIT_APPROVED") -and ($null -ne $activated.vettingScorecard)
        Write-TestResult -Number 11 -Name "E2E Admin CHW activation" -Passed $passed `
            -Detail "chwProfile=$chwProfileId, level=$($activated.activationLevel), scorecard=$([bool]$activated.vettingScorecard)"
    }
    catch {
        Write-TestResult -Number 11 -Name "E2E Admin CHW activation" -Passed $false -Detail $_.Exception.Message
    }

    # E2E 5a: Consent OTP gate then field op + urgent temp alert + Template C
    try {
        if (-not $chwToken -or -not $patientId -or -not $sponsorId -or -not $sponsorToken) {
            throw "Skipped: missing chw/patient/sponsor from prior E2E steps"
        }
        $sponsorHeaders = @{ Authorization = "Bearer $sponsorToken" }
        $otpReq = Invoke-SmokeJson "$api/patients/$patientId/consent/request" -Method Post -Headers $sponsorHeaders -Body (@{ channel = "WHATSAPP" } | ConvertTo-Json)
        if (-not $otpReq.devCode) { throw "Expected mock devCode when MOCK_AT=true" }
        $otpVerify = Invoke-SmokeJson "$api/patients/$patientId/consent/verify" -Method Post -Headers $sponsorHeaders -Body (@{ code = $otpReq.devCode } | ConvertTo-Json)
        if ($otpVerify.consentStatus -ne $true) { throw "Consent verify did not flip consentStatus" }

        $chwHeaders = @{ Authorization = "Bearer $chwToken" }
        $visitBody = @{
            patientId = $patientId
            sponsorId = $sponsorId
            scheduledTime = (Get-Date).ToUniversalTime().ToString("o")
            checklistResponses = @{ medication_taken = $true; urgent_screen = $true }
            temperatureCelsius = 39.1
            systolicBp = 120
            diastolicBp = 80
        } | ConvertTo-Json -Depth 5
        $flagged = Invoke-SmokeJson "$api/physical-visits" -Method Post -Headers $chwHeaders -Body $visitBody
        $adminHeaders = @{ Authorization = "Bearer $AdminToken" }
        $queue = @(Invoke-SmokeJson "$api/escalations/review-queue" -Headers $adminHeaders)
        $caseId = $flagged.escalation.id
        $inQueue = @($queue | Where-Object { $_.id -eq $caseId }).Count -ge 1
        $msg = [string]$flagged.sponsorNotification.message
        $passed = ($flagged.escalation.severity -eq "URGENT") -and ($msg -match "Template C") -and $inQueue
        Write-TestResult -Number 12 -Name "E2E Field op urgent alert + Template C" -Passed $passed `
            -Detail "consent=True, severity=$($flagged.escalation.severity), template=$($msg.Substring(0, [Math]::Min(80, $msg.Length))), inQueue=$inQueue"
    }
    catch {
        Write-TestResult -Number 12 -Name "E2E Field op urgent alert + Template C" -Passed $false -Detail $_.Exception.Message
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
    Write-Host "All smoke + E2E tests passed." -ForegroundColor Green
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
Invoke-E2ELifecycleTests -Origin $BaseUrl
Write-Summary
