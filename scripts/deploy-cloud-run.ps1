# Deploy NestJS API to Cloud Run as myndora-backend-api (Firebase Hosting rewrite target).
#
# Prerequisites:
#   gcloud auth login
#   gcloud config set project YOUR_GCP_PROJECT_ID
#
# Runtime DATABASE_URL must be the Supabase transaction pooler (port 6543, pgbouncer=true)
# with tenant-qualified username: postgres.<project-ref>  OR  <user>.<project-ref>
#
# Usage:
#   powershell -File scripts\deploy-cloud-run.ps1 `
#     -ProjectId project-681c9d16-2470-459b-8a1 `
#     -DatabaseUrl "postgresql://postgres.<ref>:<pass>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true" `
#     -SupabaseProjectRef "<ref>"
#
#   # Env-only update (no rebuild) after boot-fix image is already live:
#   powershell -File scripts\deploy-cloud-run.ps1 -UpdateEnvOnly -SupabaseProjectRef "<ref>"

param(
    [string]$ProjectId = "",
    [string]$Region = "europe-west3",
    [ValidateSet('simulation', 'production', '')][string]$Environment = "",
    [string]$ServiceName = "",
    [string]$DatabaseUrl = "",
    [string]$SupabaseProjectRef = "",
    [string]$Image = "",
    [switch]$UpdateEnvOnly
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
. (Join-Path $RepoRoot "scripts\lib\Deploy-Common.ps1")

if ($Environment) {
    $defaults = Get-DualDeployDefaults -Environment $Environment
    if (-not $ServiceName) { $ServiceName = $defaults.ServiceName }
    if (-not $DatabaseUrl) {
        $DatabaseUrl = [Environment]::GetEnvironmentVariable($defaults.DatabaseUrlEnv)
        if (-not $DatabaseUrl -and $Environment -eq 'production') {
            $DatabaseUrl = $env:DATABASE_URL
        }
    }
    if (-not $SupabaseProjectRef) {
        $SupabaseProjectRef = [Environment]::GetEnvironmentVariable($defaults.SupabaseRefEnv)
        if (-not $SupabaseProjectRef) { $SupabaseProjectRef = $env:SUPABASE_PROJECT_REF }
    }
} else {
    if (-not $ServiceName) { $ServiceName = "myndora-backend-api" }
    if (-not $DatabaseUrl) { $DatabaseUrl = $env:DATABASE_URL }
    if (-not $SupabaseProjectRef) { $SupabaseProjectRef = $env:SUPABASE_PROJECT_REF }
    $Environment = "production"
}

if (-not $Environment) { $Environment = "production" }

function Resolve-GcloudExe {
    $cmd = Get-Command gcloud.cmd -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $cmd = Get-Command gcloud.exe -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $fallback = Join-Path $env:LOCALAPPDATA "Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
    if (Test-Path $fallback) { return $fallback }
    throw "gcloud executable not found on PATH"
}

function Invoke-Gcloud {
    param(
        [Parameter(Mandatory = $true)][string[]]$GcloudArgs,
        [switch]$CaptureJson
    )

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = Resolve-GcloudExe
    $quoted = foreach ($a in $GcloudArgs) {
        if ($a -match '[\s,&]') { '"' + ($a -replace '"', '\"') + '"' } else { $a }
    }
    $psi.Arguments = ($quoted -join " ")
    if ($CaptureJson) {
        $psi.Arguments += " --format=json"
    }
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true

    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $psi
    [void]$proc.Start()
    $stdout = $proc.StandardOutput.ReadToEnd()
    $stderr = $proc.StandardError.ReadToEnd()
    $proc.WaitForExit()

    if ($proc.ExitCode -ne 0) {
        throw "gcloud $($GcloudArgs -join ' ') failed ($($proc.ExitCode)): $stderr"
    }

    if ($CaptureJson) {
        if (-not $stdout.Trim()) { return $null }
        return $stdout | ConvertFrom-Json
    }

    return $stdout
}

function Normalize-SupabasePoolerUrl {
    param(
        [string]$Url,
        [string]$ProjectRef = ""
    )

    if (-not $Url) {
        throw "DATABASE_URL is required."
    }

    if ($Url -notmatch '^postgresql://([^:]+):([^@]+)@([^/]+)/([^?]+)(\?.*)?$') {
        throw "DATABASE_URL is not a valid postgresql URL."
    }

    $user = $Matches[1]
    $password = $Matches[2]
    $hostPort = $Matches[3]
    $database = $Matches[4]
    $query = $Matches[5]

    # Force transaction pooler port
    $hostOnly = ($hostPort -split ':')[0]
    $hostPort = "${hostOnly}:6543"

    if ($user -notmatch '\.') {
        if (-not $ProjectRef) {
            throw "Pooler username '$user' lacks tenant identifier. Pass -SupabaseProjectRef or set SUPABASE_PROJECT_REF."
        }
        # Preserve custom DB role when present (e.g. vitalink.<ref>); default to postgres.<ref>
        if ($user -eq 'postgres' -or $user -eq 'vitalink') {
            $user = "$user.$ProjectRef"
        }
        else {
            $user = "$user.$ProjectRef"
        }
    }

    $query = if ($query) { $query.TrimStart('?') } else { "" }
    $params = [ordered]@{}
    foreach ($part in ($query -split '&' | Where-Object { $_ })) {
        $kv = $part -split '=', 2
        $params[$kv[0]] = if ($kv.Length -gt 1) { $kv[1] } else { "" }
    }
    $params['pgbouncer'] = 'true'
    $queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join '&'

    return "postgresql://${user}:$password@${hostPort}/${database}?$queryString"
}

function Get-SupabaseProjectRefFromUrl {
    param([string]$Url)
    if (-not $Url) { return "" }
    if ($Url -match '@db\.([^.]+)\.supabase\.co') { return $Matches[1] }
    if ($Url -match 'postgres\.([^:@]+)@') { return $Matches[1] }
    if ($Url -match '^postgresql://[^.]+\.([^:@]+)@') { return $Matches[1] }
    return ""
}

function Get-JobEnvValue {
    param(
        [object]$JobJson,
        [string]$Name
    )
    $containers = @($JobJson.spec.template.spec.template.spec.containers)
    if ($containers.Count -eq 0) { return $null }
    $envVar = $containers[0].env | Where-Object { $_.name -eq $Name } | Select-Object -First 1
    return $envVar.value
}

function Resolve-SupabaseProjectRef {
    param(
        [string]$ProjectRef,
        [string]$DeployRegion,
        [string]$DeployProjectId,
        [string]$ExistingDatabaseUrl = ""
    )

    if ($ProjectRef) { return $ProjectRef }

    $fromUrl = Get-SupabaseProjectRefFromUrl -Url $ExistingDatabaseUrl
    if ($fromUrl) { return $fromUrl }

    try {
        $jobJson = Invoke-Gcloud -GcloudArgs @(
            'run', 'jobs', 'describe', 'myndora-db-init',
            '--region', $DeployRegion,
            '--project', $DeployProjectId
        ) -CaptureJson

        foreach ($name in @('DIRECT_URL', 'DATABASE_URL')) {
            $val = Get-JobEnvValue -JobJson $jobJson -Name $name
            $derived = Get-SupabaseProjectRefFromUrl -Url $val
            if ($derived) {
                Write-Host "Derived Supabase project ref from db-init job $name." -ForegroundColor Yellow
                return $derived
            }
        }
    }
    catch {
        Write-Host "Could not read myndora-db-init job for project ref: $($_.Exception.Message)" -ForegroundColor Yellow
    }

    return ""
}

function Get-CurrentServiceDatabaseUrl {
    param([string]$Service, [string]$DeployRegion, [string]$DeployProjectId)

    $json = Invoke-Gcloud -GcloudArgs @(
        'run', 'services', 'describe', $Service,
        '--region', $DeployRegion,
        '--project', $DeployProjectId
    ) -CaptureJson

    if (-not $json) {
        throw "Unable to read Cloud Run service configuration."
    }

    $envVar = $json.spec.template.spec.containers[0].env |
        Where-Object { $_.name -eq 'DATABASE_URL' } |
        Select-Object -First 1

    return $envVar.value
}

function Wait-CloudRunReady {
    param(
        [string]$Service,
        [string]$DeployRegion,
        [string]$DeployProjectId,
        [int]$TimeoutSec = 300
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        $json = Invoke-Gcloud -GcloudArgs @(
            'run', 'services', 'describe', $Service,
            '--region', $DeployRegion,
            '--project', $DeployProjectId
        ) -CaptureJson

        if ($json) {
            $ready = $json.status.conditions | Where-Object { $_.type -eq 'Ready' } | Select-Object -First 1
            if ($ready.status -eq 'True') {
                return $json.status.url
            }
            Write-Host "Waiting for Ready... ($($ready.reason))" -ForegroundColor Gray
        }

        Start-Sleep -Seconds 10
    }

    throw "Cloud Run service $Service did not become Ready within ${TimeoutSec}s."
}

function Write-LatestRevisionLogs {
    param(
        [string]$Service,
        [string]$DeployRegion,
        [string]$DeployProjectId
    )

    try {
        $json = Invoke-Gcloud -GcloudArgs @(
            'run', 'services', 'describe', $Service,
            '--region', $DeployRegion,
            '--project', $DeployProjectId
        ) -CaptureJson
        $revision = $json.status.latestCreatedRevisionName
        if (-not $revision) { return }

        Write-Host ""
        Write-Host "Latest revision logs ($revision):" -ForegroundColor Yellow
        $filter = "resource.type=`"cloud_run_revision`" AND resource.labels.service_name=`"$Service`" AND resource.labels.revision_name=`"$revision`""
        $logs = Invoke-Gcloud -GcloudArgs @(
            'logging', 'read', $filter,
            '--project', $DeployProjectId,
            '--limit', '15',
            '--format', 'value(textPayload)'
        )
        foreach ($line in ($logs -split "`n" | Where-Object { $_.Trim() })) {
            Write-Host "  $line" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "Could not fetch revision logs: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# --- Main ---

if ($ProjectId) {
    [void](Invoke-Gcloud -GcloudArgs @('config', 'set', 'project', $ProjectId))
}

$activeProject = (Invoke-Gcloud -GcloudArgs @('config', 'get-value', 'project')).Trim()
if (-not $activeProject) {
    throw "No active gcloud project configured."
}

if (-not $DatabaseUrl -or $DatabaseUrl -notmatch 'pooler\.supabase\.com|supabase\.co') {
    if ($Environment -eq 'simulation') {
        throw "SIMULATION_DATABASE_URL is required for simulation deploys (separate DB from production)."
    }
    $DatabaseUrl = Get-CurrentServiceDatabaseUrl -Service $ServiceName -DeployRegion $Region -DeployProjectId $activeProject
    Write-Host "Using DATABASE_URL from existing Cloud Run service configuration." -ForegroundColor Yellow
}

$SupabaseProjectRef = Resolve-SupabaseProjectRef `
    -ProjectRef $SupabaseProjectRef `
    -DeployRegion $Region `
    -DeployProjectId $activeProject `
    -ExistingDatabaseUrl $DatabaseUrl

$DatabaseUrl = Normalize-SupabasePoolerUrl -Url $DatabaseUrl -ProjectRef $SupabaseProjectRef
Write-Host "Pooler URL validated (tenant-qualified user, port 6543, pgbouncer=true)." -ForegroundColor Green

try {
    if ($UpdateEnvOnly) {
        Write-Host "Updating env on $ServiceName (ENVIRONMENT=$Environment, no rebuild)..." -ForegroundColor Cyan
        $envPair = "DATABASE_URL=$DatabaseUrl,ENVIRONMENT=$Environment,APP_ENV=$Environment,MOCK_PAYSTACK=true,MOCK_AT=true"
        [void](Invoke-Gcloud -GcloudArgs @(
            'run', 'services', 'update', $ServiceName,
            '--region', $Region,
            '--project', $activeProject,
            '--update-env-vars', $envPair
        ))
    }
    elseif ($Image) {
        Write-Host "Deploying $ServiceName from image $Image (ENVIRONMENT=$Environment)..." -ForegroundColor Cyan
        # Use ^|^ delimiter so commas inside CORS_ORIGINS are preserved
        $setEnv = "NODE_ENV=production,ENVIRONMENT=$Environment,APP_ENV=$Environment,DATABASE_URL=$DatabaseUrl,MOCK_PAYSTACK=true,MOCK_AT=true,CORS_ORIGINS=*"
        [void](Invoke-Gcloud -GcloudArgs @(
            'run', 'deploy', $ServiceName,
            '--image', $Image,
            '--region', $Region,
            '--project', $activeProject,
            '--allow-unauthenticated',
            '--port', '8080',
            '--set-env-vars', $setEnv,
            '--quiet'
        ))
    }
    else {
        Push-Location $RepoRoot
        try {
            Write-Host "Deploying $ServiceName from source (ENVIRONMENT=$Environment)..." -ForegroundColor Cyan
            [void](Invoke-Gcloud -GcloudArgs @(
                'run', 'deploy', $ServiceName,
                '--source', '.',
                '--region', $Region,
                '--project', $activeProject,
                '--allow-unauthenticated',
                '--port', '8080',
                '--set-build-env-vars', 'BP_NODE_INSTALL_ARGS=--no-frozen-lockfile',
                '--set-env-vars', "NODE_ENV=production,ENVIRONMENT=$Environment,APP_ENV=$Environment,DATABASE_URL=$DatabaseUrl,MOCK_PAYSTACK=true,MOCK_AT=true,CORS_ORIGINS=*"
            ))
        }
        finally {
            Pop-Location
        }
    }

    $serviceUrl = Wait-CloudRunReady -Service $ServiceName -DeployRegion $Region -DeployProjectId $activeProject

    Write-Host ""
    Write-Host "Cloud Run service ready: $ServiceName ($Region) ENVIRONMENT=$Environment" -ForegroundColor Green
    Write-Host "URL: $serviceUrl"
    Write-Host "Health: $serviceUrl/api/v1/health"
}
catch {
    Write-Host ""
    Write-Host "Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-LatestRevisionLogs -Service $ServiceName -DeployRegion $Region -DeployProjectId $activeProject
    exit 1
}
