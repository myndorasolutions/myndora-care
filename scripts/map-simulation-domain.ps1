# Bind Firebase Hosting custom domain simulation.myndoracare.com and print DNS / SSL status.
#
# Usage:
#   powershell -File scripts\map-simulation-domain.ps1
#   powershell -File scripts\map-simulation-domain.ps1 -Poll
#   powershell -File scripts\map-simulation-domain.ps1 -DescribeOnly

param(
    [string]$ProjectId = "project-681c9d16-2470-459b-8a1",
    [string]$SiteId = "myndora-care-simulation",
    [string]$Domain = "simulation.myndoracare.com",
    [switch]$DescribeOnly,
    [switch]$Poll,
    [int]$PollSeconds = 60,
    [int]$MaxPolls = 40
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

function Resolve-GcloudExe {
    $cmd = Get-Command gcloud.cmd -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $cmd = Get-Command gcloud.exe -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $fallback = Join-Path $env:LOCALAPPDATA "Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
    if (Test-Path $fallback) { return $fallback }
    throw "gcloud executable not found on PATH"
}

$gcloud = Resolve-GcloudExe

function Write-GcloudStream {
    param($InputObject)
    foreach ($item in @($InputObject)) {
        if ($null -eq $item) { continue }
        $msg = if ($item -is [System.Management.Automation.ErrorRecord]) { $item.ToString() } else { "$item" }
        if ($msg -match 'InsecureRequestWarning|urllib3|warnings\.warn') { continue }
        Write-Host $msg
    }
}

function Invoke-GcloudAllowFail {
    param([string[]]$GcloudArgs)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $out = & $gcloud @GcloudArgs 2>&1
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    Write-GcloudStream $out
    return $code
}

function Get-AccessToken {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $token = & $gcloud auth print-access-token 2>$null
    $ErrorActionPreference = $prev
    if (-not $token) { throw "Unable to obtain gcloud access token" }
    return "$token".Trim()
}

function Invoke-FirebaseHostingApi {
    param(
        [string]$Method,
        [string]$Url,
        [object]$Body = $null
    )
    $token = Get-AccessToken
    $headers = @{
        Authorization = "Bearer $token"
        'Content-Type' = 'application/json'
        'x-goog-user-project' = $ProjectId
    }
    $params = @{
        Method = $Method
        Uri = $Url
        Headers = $headers
        UseBasicParsing = $true
    }
    if ($null -ne $Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 8 -Compress)
    }
    try {
        return Invoke-RestMethod @params
    } catch {
        $resp = $_.Exception.Response
        if ($resp) {
            $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
            $text = $reader.ReadToEnd()
            throw "Firebase Hosting API $Method $Url failed: $text"
        }
        throw
    }
}

Write-Host "Project=$ProjectId Site=$SiteId Domain=$Domain" -ForegroundColor Cyan

$domainsUrl = "https://firebasehosting.googleapis.com/v1beta1/sites/${SiteId}/domains"
$domainUrl = "https://firebasehosting.googleapis.com/v1beta1/sites/${SiteId}/domains/${Domain}"
# Prefer projects-scoped parent when available
$domainsUrlProjects = "https://firebasehosting.googleapis.com/v1beta1/projects/${ProjectId}/sites/${SiteId}/domains"
$domainUrlProjects = "https://firebasehosting.googleapis.com/v1beta1/projects/${ProjectId}/sites/${SiteId}/domains/${Domain}"

if (-not $DescribeOnly) {
    Write-Host "Ensuring custom domain mapping exists ..." -ForegroundColor Cyan
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $existing = Invoke-FirebaseHostingApi -Method GET -Url $domainUrl
        Write-Host "Domain already registered (status=$($existing.status))." -ForegroundColor Yellow
    } catch {
        Write-Host "Creating domain $Domain ..." -ForegroundColor Cyan
        $ErrorActionPreference = $prev
        # Domain resource requires both site + domainName (Firebase Hosting v1beta1)
        $created = Invoke-FirebaseHostingApi -Method POST -Url $domainsUrl -Body @{
            site = $SiteId
            domainName = $Domain
        }
        Write-Host "Created domain mapping. status=$($created.status)" -ForegroundColor Green
    }
    $ErrorActionPreference = $prev
}

function Show-DomainStatus {
    $info = Invoke-FirebaseHostingApi -Method GET -Url $domainUrl
    Write-Host ""
    Write-Host "=== Domain status ===" -ForegroundColor Cyan
    Write-Host "status: $($info.status)"
    Write-Host "certStatus: $($info.provisioning.certStatus)"
    Write-Host "dnsStatus: $($info.provisioning.dnsStatus)"
    Write-Host ""
    Write-Host "=== DNS records to configure at your registrar ===" -ForegroundColor Cyan
    $ips = @($info.provisioning.expectedIps)
    foreach ($ip in $ips) {
        Write-Host ("{0,-6} {1,-40} {2}" -f 'A', 'simulation', $ip)
    }
    if ($info.provisioning.certChallengeDns) {
        $chal = $info.provisioning.certChallengeDns
        Write-Host ("{0,-6} {1,-40} {2}" -f 'TXT', '_acme-challenge.simulation', $chal.token)
    }
    if (-not $ips -or $ips.Count -eq 0) {
        Write-Host ($info | ConvertTo-Json -Depth 8)
    }
    return $info
}

$status = Show-DomainStatus

if ($Poll) {
    for ($i = 1; $i -le $MaxPolls; $i++) {
        Write-Host "Poll $i/$MaxPolls ..." -ForegroundColor Gray
        $status = Show-DomainStatus
        $cert = "$($status.provisioning.certStatus)"
        if ($cert -eq 'CERT_ACTIVE') {
            Write-Host "Managed SSL certificate is ACTIVE." -ForegroundColor Green
            try {
                $health = Invoke-WebRequest -Uri "https://$Domain/robots.txt" -UseBasicParsing -TimeoutSec 20
                Write-Host "robots.txt HTTP $($health.StatusCode)" -ForegroundColor Green
                Write-Host $health.Content
            } catch {
                Write-Host "HTTPS not ready yet: $($_.Exception.Message)" -ForegroundColor Yellow
            }
            break
        }
        Start-Sleep -Seconds $PollSeconds
    }
}

Write-Host ""
Write-Host "Live app (after DNS/SSL): https://$Domain" -ForegroundColor Green
Write-Host "Login: https://$Domain/login" -ForegroundColor Green
Write-Host "robots.txt: https://$Domain/robots.txt" -ForegroundColor Green
