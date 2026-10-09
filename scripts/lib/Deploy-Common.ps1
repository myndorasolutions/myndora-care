# Shared dual-deploy helpers. Dot-source from other scripts:
#   . "$PSScriptRoot\lib\Deploy-Common.ps1"

function Resolve-GcloudExe {
    $cmd = Get-Command gcloud.cmd -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $cmd = Get-Command gcloud.exe -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $fallback = Join-Path $env:LOCALAPPDATA "Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
    if (Test-Path $fallback) { return $fallback }
    throw "gcloud executable not found on PATH"
}

function Get-GitShortSha {
    param([string]$RepoRoot)
    Push-Location $RepoRoot
    try {
        $sha = (git rev-parse --short HEAD 2>$null)
        if (-not $sha) { return (Get-Date -Format 'yyyyMMddHHmm') }
        return "$sha".Trim()
    } finally {
        Pop-Location
    }
}

function Get-EnvFingerprint {
    param([string]$DatabaseUrl)
    if (-not $DatabaseUrl) { return 'missing' }
    # Host + db name + user prefix only (never password)
    if ($DatabaseUrl -match '^postgresql://([^:]+):[^@]+@([^/]+)/([^?]+)') {
        return "$($Matches[1])@$($Matches[2])/$($Matches[3])"
    }
    return 'unparsed'
}

function Assert-DistinctDatabaseUrls {
    param(
        [string]$SimulationUrl,
        [string]$ProductionUrl
    )
    if (-not $SimulationUrl) {
        throw "SIMULATION_DATABASE_URL is required and must differ from production."
    }
    if (-not $ProductionUrl) {
        throw "Production DATABASE_URL is required for isolation checks."
    }
    $simFp = Get-EnvFingerprint $SimulationUrl
    $prodFp = Get-EnvFingerprint $ProductionUrl
    if ($simFp -eq $prodFp) {
        throw "Refusing deploy: simulation DB fingerprint matches production ($simFp). Use a separate Supabase project."
    }
    Write-Host "DB isolation OK: sim=$simFp | prod=$prodFp" -ForegroundColor Green
}

function Get-DualDeployDefaults {
    param([ValidateSet('simulation', 'production')][string]$Environment)

    if ($Environment -eq 'simulation') {
        return @{
            Environment     = 'simulation'
            ServiceName     = 'myndora-backend-api-sim'
            JobName         = 'myndora-db-init-sim'
            HostingSiteId   = 'myndora-care-simulation'
            DatabaseUrlEnv  = 'SIMULATION_DATABASE_URL'
            DirectUrlEnv    = 'SIMULATION_DIRECT_URL'
            SupabaseRefEnv  = 'SIMULATION_SUPABASE_PROJECT_REF'
            MockPaystack    = 'true'
            MockAt          = 'true'
            CorsOrigins     = 'https://simulation.myndoracare.com,https://myndora-care-simulation.web.app,http://localhost:5173'
        }
    }

    return @{
        Environment     = 'production'
        ServiceName     = 'myndora-backend-api'
        JobName         = 'myndora-db-init'
        HostingSiteId   = 'project-681c9d16-2470-459b-8a1'
        DatabaseUrlEnv  = 'PRODUCTION_DATABASE_URL'
        DirectUrlEnv    = 'PRODUCTION_DIRECT_URL'
        SupabaseRefEnv  = 'PRODUCTION_SUPABASE_PROJECT_REF'
        MockPaystack    = 'true'
        MockAt          = 'true'
        CorsOrigins     = 'https://project-681c9d16-2470-459b-8a1.web.app,https://simulation.myndoracare.com,http://localhost:5173'
    }
}
