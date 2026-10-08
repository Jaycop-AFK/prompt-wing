<#
.SYNOPSIS
Starts Expo Go on the physical Wi-Fi/LAN address instead of a VPN adapter.
#>

$ErrorActionPreference = 'Stop'

$wifi = Get-NetIPConfiguration |
  Where-Object {
    $_.NetAdapter.Status -eq 'Up' -and
    $_.IPv4Address -and
    $_.InterfaceAlias -match 'Wi-Fi|WLAN|Wireless'
  } |
  Select-Object -First 1

if (-not $wifi) {
  $wifi = Get-NetIPConfiguration |
    Where-Object {
      $_.NetAdapter.Status -eq 'Up' -and
      $_.IPv4Address -and
      $_.IPv4DefaultGateway -and
      $_.InterfaceAlias -notmatch 'Radmin|Tailscale|VMware|vEthernet|Loopback'
    } |
    Select-Object -First 1
}

if (-not $wifi) {
  throw 'No active Wi-Fi or LAN adapter was found. Connect the computer and phone to the same network.'
}

$env:REACT_NATIVE_PACKAGER_HOSTNAME = $wifi.IPv4Address.IPAddress
Write-Host "Expo Go LAN address: $env:REACT_NATIVE_PACKAGER_HOSTNAME"

$npx = Get-Command npx.cmd -CommandType Application -ErrorAction Stop
& $npx.Source expo start --go --lan --clear
exit $LASTEXITCODE
