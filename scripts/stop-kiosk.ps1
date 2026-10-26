<#
Stops the MuniMap display: the supervisor, the local server and the kiosk Edge window.
Run this before updating the app, then build, then start the display again.
#>
$ErrorActionPreference = 'SilentlyContinue'

$root = Split-Path -Parent $PSScriptRoot
$port = 4183
$vite = Join-Path $root 'node_modules\vite\bin\vite.js'
$edgeProfile = Join-Path $env:LOCALAPPDATA 'MuniMapKiosk'

# The supervisor first, so it doesn't restart what we are about to stop. It is started with -File,
# which keeps this from matching anything else that merely mentions the script.
Get-CimInstance Win32_Process |
	Where-Object { $_.CommandLine -like '*-File*start-kiosk.ps1*' -and $_.ProcessId -ne $PID } |
	ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

# Only a server this project started, not anything else that happens to use the port.
Get-NetTCPConnection -LocalPort $port -State Listen |
	ForEach-Object { Get-CimInstance Win32_Process -Filter "ProcessId = $($_.OwningProcess)" } |
	Where-Object { $_.CommandLine -and $_.CommandLine.Contains($vite) } |
	ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" |
	Where-Object { $_.CommandLine -and $_.CommandLine.Contains($edgeProfile) } |
	ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
