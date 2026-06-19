param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$FilePath
)

if (-not (Test-Path -LiteralPath $FilePath)) {
  Write-Error "File not found: $FilePath"
  exit 1
}

if (-not $env:WINDOWS_CERTIFICATE) {
  Write-Host "Skip signing (WINDOWS_CERTIFICATE not set): $FilePath"
  exit 0
}

$certPath = Join-Path $env:RUNNER_TEMP "tmp3-sign.pfx"
if (-not $env:RUNNER_TEMP) {
  $certPath = Join-Path ([System.IO.Path]::GetTempPath()) "tmp3-sign.pfx"
}

try {
  [IO.File]::WriteAllBytes($certPath, [Convert]::FromBase64String($env:WINDOWS_CERTIFICATE))

  $password = $env:WINDOWS_CERTIFICATE_PASSWORD
  $timestamp = if ($env:WINDOWS_TIMESTAMP_URL) {
    $env:WINDOWS_TIMESTAMP_URL
  } else {
    "http://timestamp.digicert.com"
  }

  & signtool sign /f $certPath /p $password /tr $timestamp /td sha256 /fd sha256 $FilePath
  if ($LASTEXITCODE -ne 0) {
    Write-Error "signtool failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
  }

  Write-Host "Signed: $FilePath"
}
finally {
  if (Test-Path -LiteralPath $certPath) {
    Remove-Item -LiteralPath $certPath -Force
  }
}
