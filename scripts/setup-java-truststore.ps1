# Builds a Java truststore that includes the Avast (or other AV) HTTPS scanning root
# so Gradle can reach plugins.gradle.org and Maven repositories.
#
# Usage:
#   powershell -File scripts\setup-java-truststore.ps1

$ErrorActionPreference = "Stop"

$trustStore = "C:\dev\myndora-care\scripts\gradle-truststore.jks"
$storePass = "changeit"
$keytool = "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe"

if (-not (Test-Path $keytool)) {
    $keytool = "keytool"
}

function Export-RemoteCertificate {
    param([string]$HostName, [int]$Port = 443)
    $client = New-Object System.Net.Sockets.TcpClient($HostName, $Port)
    try {
        $callback = [System.Net.Security.RemoteCertificateValidationCallback] { param($s,$c,$ch,$e) $true }
        $ssl = New-Object System.Net.Security.SslStream($client.GetStream(), $false, $callback)
        $ssl.AuthenticateAsClient($HostName)
        return New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($ssl.RemoteCertificate)
    }
    finally {
        $client.Close()
    }
}

if (Test-Path $trustStore) {
    Remove-Item $trustStore -Force
}

Write-Host "Seeding truststore from Android Studio JBR cacerts ..."
& $keytool -importkeystore -noprompt `
    -srckeystore "C:\Program Files\Android\Android Studio\jbr\lib\security\cacerts" `
    -srcstorepass $storePass `
    -destkeystore $trustStore `
    -deststorepass $storePass | Out-Null

$hosts = @("plugins.gradle.org", "repo.maven.apache.org", "dl.google.com", "services.gradle.org", "storage.googleapis.com")
$index = 0
foreach ($hostName in $hosts) {
    Write-Host "Importing certificate chain from $hostName ..."
    $cert = Export-RemoteCertificate -HostName $hostName
    $cerPath = Join-Path $env:TEMP "gradle-trust-$index.cer"
    [IO.File]::WriteAllBytes($cerPath, $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert))
    & $keytool -importcert -noprompt -alias "scanned-$hostName" -file $cerPath -keystore $trustStore -storepass $storePass | Out-Null
    Remove-Item $cerPath -Force
    $index++
}

$gradleUserProps = Join-Path $env:USERPROFILE ".gradle\gradle.properties"
$gradlePropsDir = Split-Path $gradleUserProps -Parent
New-Item -ItemType Directory -Force -Path $gradlePropsDir | Out-Null
@(
    "systemProp.com.sun.net.ssl.checkRevocation=false",
    "systemProp.javax.net.ssl.trustStore=$trustStore",
    "systemProp.javax.net.ssl.trustStorePassword=$storePass"
) | Set-Content -Path $gradleUserProps -Encoding utf8

Write-Host ""
Write-Host "Truststore written to $trustStore"
Write-Host "Updated $gradleUserProps"
Write-Host "Restart Gradle daemons: cd mobile\android && .\gradlew.bat --stop"
