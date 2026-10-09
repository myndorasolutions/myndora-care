# Run database initialization via Cloud Run Job (migrate + seed).
# Migrations use DIRECT_URL (Supabase direct port 5432); runtime uses DATABASE_URL pooler.
#
# Prerequisites:
#   gcloud auth login
#   gcloud config set project YOUR_GCP_PROJECT_ID
#
# Usage:
#   powershell -File scripts\run-db-init-job.ps1 `
#     -DirectUrl "postgresql://postgres.<ref>:<pass>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres" `
#     -DatabaseUrl "postgresql://postgres.<ref>:<pass>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
#
# Prefer Supabase session pooler (:5432) for DIRECT_URL (matches production). Avoid db.<ref>.supabase.co
# from Cloud Run unless IPv4/direct access is confirmed.
#
#   powershell -File scripts\run-db-init-job.ps1 -ExecuteOnly
#
#   # Auto-read existing job env, normalize pooler username with -SupabaseProjectRef, then execute:
#   powershell -File scripts\run-db-init-job.ps1 -ProjectId project-681c9d16-2470-459b-8a1 -SupabaseProjectRef "<ref>"

param(
    [string]$ProjectId = "",
    [string]$Region = "europe-west3",
    [ValidateSet('simulation', 'production', '')][string]$Environment = "",
    [string]$JobName = "",
    [string]$Image = "",
    [string]$DirectUrl = $env:DIRECT_URL,
    [string]$DatabaseUrl = $env:DATABASE_URL,
    [string]$SupabaseProjectRef = $env:SUPABASE_PROJECT_REF,
    [string]$ServiceName = "",
    [switch]$ExecuteOnly,
    [switch]$CreateOnly
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
. (Join-Path $RepoRoot "scripts\lib\Deploy-Common.ps1")

if ($Environment) {
    $defaults = Get-DualDeployDefaults -Environment $Environment
    if (-not $JobName) { $JobName = $defaults.JobName }
    if (-not $ServiceName) { $ServiceName = $defaults.ServiceName }
    if ($Environment -eq 'simulation') {
        if (-not $DatabaseUrl -or $DatabaseUrl -eq $env:DATABASE_URL) {
            if ($env:SIMULATION_DATABASE_URL) { $DatabaseUrl = $env:SIMULATION_DATABASE_URL }
        }
        if (-not $DirectUrl -or $DirectUrl -eq $env:DIRECT_URL) {
            if ($env:SIMULATION_DIRECT_URL) { $DirectUrl = $env:SIMULATION_DIRECT_URL }
        }
        if (-not $SupabaseProjectRef -and $env:SIMULATION_SUPABASE_PROJECT_REF) {
            $SupabaseProjectRef = $env:SIMULATION_SUPABASE_PROJECT_REF
        }
    }
}
if (-not $JobName) { $JobName = "myndora-db-init" }
if (-not $ServiceName) { $ServiceName = "myndora-backend-api" }

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
    # Quote args that contain spaces or special chars
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
        throw "gcloud failed ($($proc.ExitCode)): $stderr"
    }

    if ($CaptureJson) {
        if (-not $stdout.Trim()) { return $null }
        return $stdout | ConvertFrom-Json
    }
    return $stdout
}

function Add-TenantToUser {
    param([string]$Url, [string]$ProjectRef)
    if (-not $Url) { return $Url }
    if ($Url -notmatch '^postgresql://([^:]+):([^@]+)@([^/]+)/([^?]+)(\?.*)?$') {
        return $Url
    }
    $user = $Matches[1]
    $password = $Matches[2]
    $hostPort = $Matches[3]
    $database = $Matches[4]
    $query = if ($Matches[5]) { $Matches[5] } else { "" }

    $hostOnly = ($hostPort -split ':')[0]
    # Direct Supabase host wants role "postgres"; pooler wants postgres.<ref>
    if ($hostOnly -match '^db\.[^.]+\.supabase\.co$') {
        if ($user -match '^postgres\.') { $user = 'postgres' }
    }
    elseif ($ProjectRef -and ($user -notmatch '\.')) {
        $user = "$user.$ProjectRef"
    }
    return "postgresql://${user}:$password@${hostPort}/${database}${query}"
}

function Write-JobEnvVarsFile {
    param(
        [string]$DirectUrl,
        [string]$DatabaseUrl
    )
    # Prefer --env-vars-file over --set-env-vars: URL-encoded passwords contain %XX.
    # Doubling % for cmd.exe via ProcessStartInfo leaves literal %% on the job (auth fails).
    $path = Join-Path $env:TEMP "myndora-db-init-env-$PID.yaml"
    $escapeYamlSingle = { param([string]$v) return "'" + ($v -replace "'", "''") + "'" }
    $lines = @(
        "DIRECT_URL: $(& $escapeYamlSingle $DirectUrl)"
    )
    if ($DatabaseUrl) {
        $lines += "DATABASE_URL: $(& $escapeYamlSingle $DatabaseUrl)"
    }
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllLines($path, [string[]]$lines, $utf8NoBom)
    return $path
}

function Get-JobEnvValue {
    param([object]$JobJson, [string]$Name)
    $containers = @($JobJson.spec.template.spec.template.spec.containers)
    if ($containers.Count -eq 0) { return $null }
    $envVar = $containers[0].env | Where-Object { $_.name -eq $Name } | Select-Object -First 1
    return $envVar.value
}

if ($ProjectId) {
    [void](Invoke-Gcloud -GcloudArgs @('config', 'set', 'project', $ProjectId))
}

$activeProject = (Invoke-Gcloud -GcloudArgs @('config', 'get-value', 'project')).Trim()

if ($ExecuteOnly) {
    Write-Host "Executing Cloud Run Job: $JobName ($Region) ..."
    [void](Invoke-Gcloud -GcloudArgs @('run', 'jobs', 'execute', $JobName, '--region', $Region, '--wait'))
    exit 0
}

# Auto-load URLs from existing job / service when not provided
if (-not $DirectUrl -or -not $DatabaseUrl) {
    try {
        $jobJson = Invoke-Gcloud -GcloudArgs @(
            'run', 'jobs', 'describe', $JobName,
            '--region', $Region,
            '--project', $activeProject
        ) -CaptureJson
        if (-not $DirectUrl) { $DirectUrl = Get-JobEnvValue -JobJson $jobJson -Name 'DIRECT_URL' }
        if (-not $DatabaseUrl) { $DatabaseUrl = Get-JobEnvValue -JobJson $jobJson -Name 'DATABASE_URL' }
    }
    catch {
        Write-Host "Could not read existing job env: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

if (-not $DatabaseUrl) {
    try {
        $svc = Invoke-Gcloud -GcloudArgs @(
            'run', 'services', 'describe', $ServiceName,
            '--region', $Region,
            '--project', $activeProject
        ) -CaptureJson
        $DatabaseUrl = ($svc.spec.template.spec.containers[0].env |
            Where-Object { $_.name -eq 'DATABASE_URL' } |
            Select-Object -First 1).value
    }
    catch {
        Write-Host "Could not read service DATABASE_URL: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

if (-not $DirectUrl) {
    Write-Error "DIRECT_URL is required for migrate deploy. Set env var, pass -DirectUrl, or ensure the job already has DIRECT_URL."
}

if ($SupabaseProjectRef) {
    $DirectUrl = Add-TenantToUser -Url $DirectUrl -ProjectRef $SupabaseProjectRef
    if ($DatabaseUrl) {
        $DatabaseUrl = Add-TenantToUser -Url $DatabaseUrl -ProjectRef $SupabaseProjectRef
        # Ensure pooler flags on runtime URL
        if ($DatabaseUrl -notmatch 'pgbouncer=true') {
            if ($DatabaseUrl -match '\?') { $DatabaseUrl += '&pgbouncer=true' }
            else { $DatabaseUrl += '?pgbouncer=true' }
        }
    }
    Write-Host "Applied Supabase project ref tenant to connection usernames." -ForegroundColor Green
}

$envVarsFile = Write-JobEnvVarsFile -DirectUrl $DirectUrl -DatabaseUrl $DatabaseUrl

# Use pinned Prisma 6 via npx (image has schema; avoid broken partial prisma CLI copy / Prisma 7)
$jobCommand = "cd /app/backend && npx --yes prisma@6.19.3 migrate deploy --schema=./prisma/schema.prisma && npx --yes prisma@6.19.3 db seed --schema=./prisma/schema.prisma"

try {
    if ($Image) {
        Write-Host "Creating/updating job $JobName with image $Image ..."
        [void](Invoke-Gcloud -GcloudArgs @(
            'run', 'jobs', 'deploy', $JobName,
            '--image', $Image,
            '--region', $Region,
            '--memory', '1Gi',
            '--cpu', '1',
            '--env-vars-file', $envVarsFile,
            '--command', 'sh',
            '--args', "-c,$jobCommand"
        ))
    }
    else {
        # Prefer reusing the currently serving API image so we don't rebuild from source
        $svc = Invoke-Gcloud -GcloudArgs @(
            'run', 'services', 'describe', $ServiceName,
            '--region', $Region,
            '--project', $activeProject
        ) -CaptureJson
        $imageUri = $svc.spec.template.spec.containers[0].image
        Write-Host "Creating/updating job $JobName with service image ..."
        [void](Invoke-Gcloud -GcloudArgs @(
            'run', 'jobs', 'deploy', $JobName,
            '--image', $imageUri,
            '--region', $Region,
            '--memory', '1Gi',
            '--cpu', '1',
            '--env-vars-file', $envVarsFile,
            '--command', 'sh',
            '--args', "-c,$jobCommand"
        ))
    }
}
finally {
    Remove-Item -LiteralPath $envVarsFile -Force -ErrorAction SilentlyContinue
}

if ($CreateOnly) {
    Write-Host "Job $JobName created/updated. Run with -ExecuteOnly to migrate + seed."
    exit 0
}

Write-Host "Executing job ..."
[void](Invoke-Gcloud -GcloudArgs @('run', 'jobs', 'execute', $JobName, '--region', $Region, '--wait'))
Write-Host "DB init job completed." -ForegroundColor Green
