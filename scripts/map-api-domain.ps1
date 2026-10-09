# Map Cloud Run (europe-west3) to api.myndoracare.com via global HTTPS LB + managed cert.
# Native Cloud Run domain-mappings are NOT available in europe-west3.
#
# Usage:
#   powershell -File scripts\map-api-domain.ps1
#   powershell -File scripts\map-api-domain.ps1 -Poll
#   powershell -File scripts\map-api-domain.ps1 -DescribeOnly

param(
    [string]$ProjectId = "project-681c9d16-2470-459b-8a1",
    [string]$Region = "europe-west3",
    [string]$ServiceName = "myndora-backend-api",
    [string]$Domain = "api.myndoracare.com",
    [string]$Prefix = "myndora-api",
    [switch]$DescribeOnly,
    [switch]$Poll,
    [int]$PollSeconds = 30,
    [int]$MaxPolls = 40
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

$NegName = "$Prefix-neg"
$BackendName = "$Prefix-backend"
$UrlMapName = "$Prefix-url-map"
$CertName = "$Prefix-cert"
$HttpsProxyName = "$Prefix-https-proxy"
$HttpProxyName = "$Prefix-http-proxy"
$HttpsFwName = "$Prefix-https-fw"
$HttpFwName = "$Prefix-http-fw"
$AddressName = "$Prefix-ip"
$HttpRedirectUrlMap = "$Prefix-http-redirect"

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

function Invoke-Gcloud {
    param(
        [Parameter(Mandatory = $true)][string[]]$GcloudArgs,
        [switch]$AllowFail
    )
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $out = & $gcloud @GcloudArgs 2>&1
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    Write-GcloudStream $out
    if ($code -ne 0 -and -not $AllowFail) {
        throw "gcloud failed ($code): $($GcloudArgs -join ' ')"
    }
    return $code
}

function Get-GcloudValue {
    param([Parameter(Mandatory = $true)][string[]]$GcloudArgs)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $out = & $gcloud @GcloudArgs 2>&1
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    $lines = @()
    foreach ($item in @($out)) {
        if ($null -eq $item) { continue }
        $msg = if ($item -is [System.Management.Automation.ErrorRecord]) { $item.ToString() } else { "$item" }
        if ($msg -match 'InsecureRequestWarning|urllib3|warnings\.warn') { continue }
        if ($msg.Trim().Length -gt 0) { $lines += $msg.Trim() }
    }
    if ($code -ne 0) { return $null }
    return ($lines -join "`n").Trim()
}

function Test-GcloudResource {
    param([Parameter(Mandatory = $true)][string[]]$DescribeArgs)
    $code = Invoke-Gcloud -GcloudArgs $DescribeArgs -AllowFail
    return ($code -eq 0)
}

Write-Host "Project=$ProjectId Region=$Region Service=$ServiceName Domain=$Domain" -ForegroundColor Cyan
Write-Host "Path=global HTTPS load balancer (required: domain-mappings unsupported in $Region)" -ForegroundColor Yellow
Write-Host ""

Write-Host "Verified domains for this account:" -ForegroundColor Cyan
Invoke-Gcloud -GcloudArgs @('domains', 'list-user-verified', '--project', $ProjectId) -AllowFail | Out-Null

function Show-Status {
    Write-Host ""
    Write-Host "=== Load balancer / SSL status ===" -ForegroundColor Cyan

    $ip = Get-GcloudValue @(
        'compute', 'addresses', 'describe', $AddressName,
        '--global', '--project', $ProjectId, '--format=value(address)'
    )
    $certStatus = Get-GcloudValue @(
        'compute', 'ssl-certificates', 'describe', $CertName,
        '--global', '--project', $ProjectId, '--format=value(managed.status)'
    )
    $certDomainStatus = Get-GcloudValue @(
        'compute', 'ssl-certificates', 'describe', $CertName,
        '--global', '--project', $ProjectId, '--format=value(managed.domainStatus)'
    )

    Write-Host "Static IP ($AddressName): $ip"
    Write-Host "Managed cert status ($CertName): $certStatus"
    Write-Host "Managed cert domainStatus: $certDomainStatus"
    Write-Host ""
    Write-Host "=== DNS records to configure at your registrar ===" -ForegroundColor Cyan
    if ($ip) {
        Write-Host "Type  Name  Value"
        Write-Host "A     api   $ip"
        Write-Host "(Host/name may be 'api' or 'api.myndoracare.com' depending on registrar UI.)"
    } else {
        Write-Host "IP not allocated yet."
    }
    return @{ Ip = $ip; CertStatus = $certStatus; DomainStatus = $certDomainStatus }
}

if (-not $DescribeOnly) {
    Write-Host "Enabling required APIs ..." -ForegroundColor Cyan
    Invoke-Gcloud -GcloudArgs @(
        'services', 'enable',
        'compute.googleapis.com',
        'run.googleapis.com',
        '--project', $ProjectId,
        '--quiet'
    ) | Out-Null

    Write-Host "Ensuring MOCK_PAYSTACK=true on $ServiceName ..." -ForegroundColor Cyan
    Invoke-Gcloud -GcloudArgs @(
        'run', 'services', 'update', $ServiceName,
        '--region', $Region,
        '--project', $ProjectId,
        '--update-env-vars', 'MOCK_PAYSTACK=true',
        '--quiet'
    ) | Out-Null

    Write-Host "Ensuring public invoker on Cloud Run (LB edge) ..." -ForegroundColor Cyan
    Invoke-Gcloud -GcloudArgs @(
        'run', 'services', 'add-iam-policy-binding', $ServiceName,
        '--region', $Region,
        '--project', $ProjectId,
        '--member=allUsers',
        '--role=roles/run.invoker',
        '--quiet'
    ) -AllowFail | Out-Null

    Write-Host "Reserving global static IP ($AddressName) ..." -ForegroundColor Cyan
    if (-not (Test-GcloudResource @(
        'compute', 'addresses', 'describe', $AddressName,
        '--global', '--project', $ProjectId
    ))) {
        Invoke-Gcloud -GcloudArgs @(
            'compute', 'addresses', 'create', $AddressName,
            '--network-tier=PREMIUM',
            '--ip-version=IPV4',
            '--global',
            '--project', $ProjectId
        ) | Out-Null
    }

    Write-Host "Creating serverless NEG ($NegName) ..." -ForegroundColor Cyan
    if (-not (Test-GcloudResource @(
        'compute', 'network-endpoint-groups', 'describe', $NegName,
        '--region', $Region, '--project', $ProjectId
    ))) {
        Invoke-Gcloud -GcloudArgs @(
            'compute', 'network-endpoint-groups', 'create', $NegName,
            '--region', $Region,
            '--project', $ProjectId,
            '--network-endpoint-type=serverless',
            "--cloud-run-service=$ServiceName"
        ) | Out-Null
    }

    Write-Host "Creating backend service ($BackendName) ..." -ForegroundColor Cyan
    if (-not (Test-GcloudResource @(
        'compute', 'backend-services', 'describe', $BackendName,
        '--global', '--project', $ProjectId
    ))) {
        Invoke-Gcloud -GcloudArgs @(
            'compute', 'backend-services', 'create', $BackendName,
            '--load-balancing-scheme=EXTERNAL_MANAGED',
            '--global',
            '--project', $ProjectId
        ) | Out-Null
    }

    Write-Host "Attaching NEG to backend ..." -ForegroundColor Cyan
    Invoke-Gcloud -GcloudArgs @(
        'compute', 'backend-services', 'add-backend', $BackendName,
        '--global',
        '--project', $ProjectId,
        "--network-endpoint-group=$NegName",
        "--network-endpoint-group-region=$Region"
    ) -AllowFail | Out-Null

    Write-Host "Creating Google-managed SSL cert ($CertName) for $Domain ..." -ForegroundColor Cyan
    if (-not (Test-GcloudResource @(
        'compute', 'ssl-certificates', 'describe', $CertName,
        '--global', '--project', $ProjectId
    ))) {
        Invoke-Gcloud -GcloudArgs @(
            'compute', 'ssl-certificates', 'create', $CertName,
            "--domains=$Domain",
            '--global',
            '--project', $ProjectId
        ) | Out-Null
    }

    Write-Host "Creating HTTPS URL map ($UrlMapName) ..." -ForegroundColor Cyan
    if (-not (Test-GcloudResource @(
        'compute', 'url-maps', 'describe', $UrlMapName,
        '--global', '--project', $ProjectId
    ))) {
        Invoke-Gcloud -GcloudArgs @(
            'compute', 'url-maps', 'create', $UrlMapName,
            "--default-service=$BackendName",
            '--global',
            '--project', $ProjectId
        ) | Out-Null
    }

    Write-Host "Creating HTTPS proxy ($HttpsProxyName) ..." -ForegroundColor Cyan
    if (-not (Test-GcloudResource @(
        'compute', 'target-https-proxies', 'describe', $HttpsProxyName,
        '--global', '--project', $ProjectId
    ))) {
        Invoke-Gcloud -GcloudArgs @(
            'compute', 'target-https-proxies', 'create', $HttpsProxyName,
            "--ssl-certificates=$CertName",
            "--url-map=$UrlMapName",
            '--global',
            '--project', $ProjectId
        ) | Out-Null
    }

    Write-Host "Creating HTTPS forwarding rule ($HttpsFwName) ..." -ForegroundColor Cyan
    if (-not (Test-GcloudResource @(
        'compute', 'forwarding-rules', 'describe', $HttpsFwName,
        '--global', '--project', $ProjectId
    ))) {
        Invoke-Gcloud -GcloudArgs @(
            'compute', 'forwarding-rules', 'create', $HttpsFwName,
            "--address=$AddressName",
            "--target-https-proxy=$HttpsProxyName",
            '--global',
            '--ports=443',
            '--load-balancing-scheme=EXTERNAL_MANAGED',
            '--project', $ProjectId
        ) | Out-Null
    }

    # Optional HTTP -> HTTPS redirect
    Write-Host "Creating HTTP->HTTPS redirect ..." -ForegroundColor Cyan
    if (-not (Test-GcloudResource @(
        'compute', 'url-maps', 'describe', $HttpRedirectUrlMap,
        '--global', '--project', $ProjectId
    ))) {
        Invoke-Gcloud -GcloudArgs @(
            'compute', 'url-maps', 'create', $HttpRedirectUrlMap,
            '--global',
            '--project', $ProjectId,
            '--default-url-redirect-response-code=MOVED_PERMANENTLY_DEFAULT',
            '--default-url-redirect-https-redirect'
        ) -AllowFail | Out-Null
    }

    if (-not (Test-GcloudResource @(
        'compute', 'target-http-proxies', 'describe', $HttpProxyName,
        '--global', '--project', $ProjectId
    ))) {
        Invoke-Gcloud -GcloudArgs @(
            'compute', 'target-http-proxies', 'create', $HttpProxyName,
            "--url-map=$HttpRedirectUrlMap",
            '--global',
            '--project', $ProjectId
        ) -AllowFail | Out-Null
    }

    if (-not (Test-GcloudResource @(
        'compute', 'forwarding-rules', 'describe', $HttpFwName,
        '--global', '--project', $ProjectId
    ))) {
        Invoke-Gcloud -GcloudArgs @(
            'compute', 'forwarding-rules', 'create', $HttpFwName,
            "--address=$AddressName",
            "--target-http-proxy=$HttpProxyName",
            '--global',
            '--ports=80',
            '--load-balancing-scheme=EXTERNAL_MANAGED',
            '--project', $ProjectId
        ) -AllowFail | Out-Null
    }
}

$status = Show-Status

if ($Poll) {
    for ($i = 1; $i -le $MaxPolls; $i++) {
        Write-Host "Poll $i/$MaxPolls (waiting for ACTIVE cert + DNS) ..." -ForegroundColor Gray
        $status = Show-Status
        $certOk = ("$($status.CertStatus)" -eq 'ACTIVE')
        if ($certOk) {
            Write-Host "Managed SSL certificate is ACTIVE." -ForegroundColor Green
            $healthUrl = "https://${Domain}/api/v1/health"
            $prev = $ErrorActionPreference
            $ErrorActionPreference = 'Continue'
            try {
                $resp = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 20
                Write-Host "Health check HTTP $($resp.StatusCode): $($resp.Content)" -ForegroundColor Green
            } catch {
                Write-Host "Health check not ready yet: $($_.Exception.Message)" -ForegroundColor Yellow
            }
            $ErrorActionPreference = $prev
            if ($certOk -and $resp -and $resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300) {
                break
            }
            if ($certOk) {
                # Cert active but health may still fail until DNS points here
                Write-Host "Cert ACTIVE. If health fails, confirm DNS A record for api -> $($status.Ip)" -ForegroundColor Yellow
                break
            }
        }
        Start-Sleep -Seconds $PollSeconds
    }
}

Write-Host ""
$healthUrl = "https://${Domain}/api/v1/health"
Write-Host "Live API (custom domain, after DNS): $healthUrl" -ForegroundColor Green
Write-Host "Live API (Cloud Run URL): https://myndora-backend-api-571111508046.europe-west3.run.app/api/v1/health" -ForegroundColor Green
if ($status.Ip) {
    Write-Host "Add DNS now: A  api  $($status.Ip)" -ForegroundColor Cyan
}
