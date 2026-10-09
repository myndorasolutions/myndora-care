# Deploy web/dist to Firebase Hosting via REST API (gcloud access token).
#
# Usage:
#   powershell -File scripts\deploy-hosting-api.ps1
#   powershell -File scripts\deploy-hosting-api.ps1 -SiteId myndora-care-simulation -CloudRunService myndora-backend-api-sim
#   powershell -File scripts\deploy-hosting-api.ps1 -SiteId project-681c9d16-2470-459b-8a1 -CloudRunService myndora-backend-api

param(
    [string]$ProjectId = "project-681c9d16-2470-459b-8a1",
    [string]$SiteId = "project-681c9d16-2470-459b-8a1",
    [string]$DistPath = "",
    [string]$CloudRunService = "myndora-backend-api",
    [string]$CloudRunRegion = "europe-west3"
)

$ErrorActionPreference = "Stop"

function Resolve-GcloudExe {
    $cmd = Get-Command gcloud.cmd -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $fallback = Join-Path $env:LOCALAPPDATA "Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
    if (Test-Path $fallback) { return $fallback }
    throw "gcloud not found"
}

$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not $DistPath) { $DistPath = Join-Path $RepoRoot "web\dist" }
if (-not (Test-Path (Join-Path $DistPath "index.html"))) {
    throw "Missing $DistPath\index.html - build the SPA first"
}

$gcloud = Resolve-GcloudExe
$token = (& $gcloud auth print-access-token).Trim()
$headers = @{
    Authorization = "Bearer $token"
    'Content-Type' = 'application/json'
    'x-goog-user-project' = $ProjectId
}

function Get-GzipSha256Hex([byte[]]$bytes) {
    $ms = New-Object System.IO.MemoryStream
    $gzip = New-Object System.IO.Compression.GzipStream($ms, [System.IO.Compression.CompressionMode]::Compress)
    $gzip.Write($bytes, 0, $bytes.Length)
    $gzip.Dispose()
    $compressed = $ms.ToArray()
    $ms.Dispose()
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $hash = $sha.ComputeHash($compressed)
    $sha.Dispose()
    $hex = ([BitConverter]::ToString($hash) -replace '-', '').ToLowerInvariant()
    return @{ Hex = $hex; GzipBytes = $compressed }
}

Write-Host "Creating Hosting version for site $SiteId (API -> $CloudRunService / $CloudRunRegion) ..." -ForegroundColor Cyan

function New-HostingVersionBody {
    param([switch]$IncludeCloudRun)
    $rewrites = @()
    if ($IncludeCloudRun -and $CloudRunService) {
        $rewrites += [ordered]@{
            glob = '/api/v1/**'
            run  = [ordered]@{
                serviceId = $CloudRunService
                region    = $CloudRunRegion
            }
        }
    }
    $rewrites += [ordered]@{
        glob = '**'
        path = '/index.html'
    }
    $configObj = [ordered]@{
        rewrites = $rewrites
        headers = @(
            [ordered]@{
                glob    = '/robots.txt'
                headers = [ordered]@{ 'Cache-Control' = 'no-cache' }
            }
        )
    }
    return (@{ config = $configObj } | ConvertTo-Json -Compress -Depth 8)
}

$versionBody = New-HostingVersionBody -IncludeCloudRun
try {
    $version = Invoke-RestMethod -Method POST `
        -Uri "https://firebasehosting.googleapis.com/v1beta1/sites/${SiteId}/versions" `
        -Headers $headers `
        -Body $versionBody
} catch {
    $errText = ""
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errText = $reader.ReadToEnd()
    }
    Write-Host "Cloud Run rewrite rejected ($errText). Falling back to SPA-only rewrites." -ForegroundColor Yellow
    $versionBody = New-HostingVersionBody
    $version = Invoke-RestMethod -Method POST `
        -Uri "https://firebasehosting.googleapis.com/v1beta1/sites/${SiteId}/versions" `
        -Headers $headers `
        -Body $versionBody
}
$versionName = $version.name
Write-Host "Version: $versionName"

$files = Get-ChildItem -Path $DistPath -Recurse -File
$configFiles = @{}
$filePayloads = @{}

foreach ($file in $files) {
    $rel = $file.FullName.Substring($DistPath.Length).Replace('\', '/')
    if (-not $rel.StartsWith('/')) { $rel = "/$rel" }
    $raw = [System.IO.File]::ReadAllBytes($file.FullName)
    $hashed = Get-GzipSha256Hex $raw
    $configFiles[$rel] = $hashed.Hex
    $filePayloads[$hashed.Hex] = $hashed.GzipBytes
}

Write-Host "Populating $($configFiles.Count) files ..." -ForegroundColor Cyan
$populateBody = @{ files = $configFiles } | ConvertTo-Json -Compress -Depth 5
$populate = Invoke-RestMethod -Method POST `
    -Uri "https://firebasehosting.googleapis.com/v1beta1/${versionName}:populateFiles" `
    -Headers $headers `
    -Body $populateBody

$uploadUrl = $populate.uploadUrl
$required = @($populate.uploadRequiredHashes)
if (-not $required) { $required = @() }
Write-Host "Uploading $($required.Count) new objects ..."

foreach ($hash in $required) {
    $bytes = $filePayloads[$hash]
    if (-not $bytes) { throw "Missing gzip payload for hash $hash" }
    $uploadHeaders = @{
        Authorization = "Bearer $token"
        'Content-Type' = 'application/octet-stream'
        'Content-Length' = $bytes.Length
        'x-goog-content-length-range' = '0,10485760'
        'x-goog-user-project' = $ProjectId
    }
    Invoke-RestMethod -Method POST -Uri "$uploadUrl/$hash" -Headers $uploadHeaders -Body $bytes | Out-Null
}

Write-Host "Finalizing version ..." -ForegroundColor Cyan
$finalizeBody = @{ status = 'FINALIZED' } | ConvertTo-Json -Compress
Invoke-RestMethod -Method PATCH `
    -Uri "https://firebasehosting.googleapis.com/v1beta1/${versionName}?updateMask=status" `
    -Headers $headers `
    -Body $finalizeBody | Out-Null

Write-Host "Creating release ..." -ForegroundColor Cyan
$release = Invoke-RestMethod -Method POST `
    -Uri "https://firebasehosting.googleapis.com/v1beta1/sites/${SiteId}/releases?versionName=$versionName" `
    -Headers $headers `
    -Body '{}'

Write-Host "Hosting release complete." -ForegroundColor Green
Write-Host "Site: https://$SiteId.web.app"
Write-Host "Release: $($release.name)"
