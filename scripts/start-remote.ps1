<#
.SYNOPSIS
Starts Expo Go through a temporary Cloudflare Quick Tunnel.

.DESCRIPTION
Creates a public trycloudflare.com URL for Metro on port 8081, injects that URL
into Expo for the current process, and shuts the tunnel down when Expo exits.
#>

$ErrorActionPreference = 'Stop'

$cloudflaredProcess = $null
$cloudflaredStdout = Join-Path ([System.IO.Path]::GetTempPath()) "prompt-wing-cloudflared-$PID.stdout.log"
$cloudflaredStderr = Join-Path ([System.IO.Path]::GetTempPath()) "prompt-wing-cloudflared-$PID.stderr.log"
$previousProxyUrl = $env:EXPO_PACKAGER_PROXY_URL
$previousNodeOptions = $env:NODE_OPTIONS
$exitCode = 0

try {
  $cloudflared = Get-Command cloudflared -CommandType Application -ErrorAction SilentlyContinue
  if (-not $cloudflared) {
    throw 'cloudflared was not found in PATH. Install Cloudflare Tunnel before running npm run remote.'
  }

  $npx = Get-Command npx.cmd -CommandType Application -ErrorAction SilentlyContinue
  if (-not $npx) {
    throw 'npx.cmd was not found in PATH. Install Node.js before running npm run remote.'
  }

  $portInUse = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() |
    Where-Object { $_.Port -eq 8081 } |
    Select-Object -First 1
  if ($portInUse) {
    throw 'Port 8081 is already in use. Stop the existing Expo/Metro process, then run npm run remote again.'
  }

  Write-Host 'Creating Cloudflare Quick Tunnel...'
  $cloudflaredStart = @{
    FilePath = $cloudflared.Source
    ArgumentList = @(
      'tunnel',
      '--url', 'http://127.0.0.1:8081',
      '--no-autoupdate'
    )
    WindowStyle = 'Hidden'
    RedirectStandardOutput = $cloudflaredStdout
    RedirectStandardError = $cloudflaredStderr
    PassThru = $true
  }
  $cloudflaredProcess = Start-Process @cloudflaredStart

  $publicUrl = $null
  $tunnelConnected = $false
  $deadline = [DateTime]::UtcNow.AddSeconds(60)
  while ([DateTime]::UtcNow -lt $deadline -and -not $tunnelConnected) {
    if ($cloudflaredProcess.HasExited) {
      throw "Cloudflare Tunnel exited before creating a URL (exit $($cloudflaredProcess.ExitCode))."
    }

    $logs = @(
      Get-Content -LiteralPath $cloudflaredStdout -Raw -ErrorAction SilentlyContinue
      Get-Content -LiteralPath $cloudflaredStderr -Raw -ErrorAction SilentlyContinue
    ) -join "`n"

    $match = [regex]::Match($logs, 'https://[a-z0-9-]+\.trycloudflare\.com')
    if ($match.Success) {
      $publicUrl = $match.Value
    }

    # The Quick Tunnel URL is printed before its edge connection is ready.
    # Showing it at that point leaves Expo Go with a Cloudflare 1033 link.
    if ($publicUrl -and $logs -match 'Registered tunnel connection') {
      $tunnelConnected = $true
      break
    }

    Start-Sleep -Milliseconds 250
  }

  if (-not $tunnelConnected) {
    throw 'Cloudflare Quick Tunnel did not connect to the edge within 60 seconds. No Expo Go URL was published.'
  }

  $env:EXPO_PACKAGER_PROXY_URL = $publicUrl
  # Node may resolve localhost to ::1 on Windows while cloudflared targets
  # 127.0.0.1. Force Expo/Metro to prefer IPv4 so both ends use the same host.
  if ([string]::IsNullOrWhiteSpace($previousNodeOptions)) {
    $env:NODE_OPTIONS = '--dns-result-order=ipv4first'
  } elseif ($previousNodeOptions -notmatch '--dns-result-order=') {
    $env:NODE_OPTIONS = "$previousNodeOptions --dns-result-order=ipv4first"
  }
  $expoGoUrl = $publicUrl -replace '^https://', 'exp://'

  Write-Host ''
  Write-Host 'Remote Expo Go is ready' -ForegroundColor Green
  Write-Host "Public tunnel: $publicUrl"
  Write-Host "Expo Go:       $expoGoUrl"
  Write-Host 'Expo Go must be signed in with the same Expo account shown by: npx expo whoami' -ForegroundColor Yellow
  Write-Host 'Press Ctrl+C once to stop both Expo and Cloudflare Tunnel.'
  Write-Host ''

  & $npx.Source expo start --go --clear --port 8081
  $exitCode = $LASTEXITCODE
} catch {
  Write-Error $_.Exception.Message
  $exitCode = 1
} finally {
  if ($null -eq $previousProxyUrl) {
    Remove-Item Env:EXPO_PACKAGER_PROXY_URL -ErrorAction SilentlyContinue
  } else {
    $env:EXPO_PACKAGER_PROXY_URL = $previousProxyUrl
  }

  if ($null -eq $previousNodeOptions) {
    Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
  } else {
    $env:NODE_OPTIONS = $previousNodeOptions
  }

  if ($cloudflaredProcess -and -not $cloudflaredProcess.HasExited) {
    Write-Host ''
    Write-Host 'Stopping Cloudflare Tunnel...'
    Stop-Process -Id $cloudflaredProcess.Id -ErrorAction SilentlyContinue
    Wait-Process -Id $cloudflaredProcess.Id -Timeout 5 -ErrorAction SilentlyContinue
  }

  Remove-Item -LiteralPath $cloudflaredStdout -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $cloudflaredStderr -ErrorAction SilentlyContinue
}

exit $exitCode
