<#
Stops the TMM Map display: the supervisor, the local server and the kiosk Edge window.
Run this before updating the app, then build, then start the display again.
#>
$ErrorActionPreference = 'SilentlyContinue'

$port = 4173
$edgeProfile = Join-Path $env:LOCALAPPDATA 'TMMMapKiosk'

# The supervisor first, so it doesn't restart what we are about to stop. It is started with -File,
# which keeps this from matching anything else that merely mentions the script.
Get-CimInstance Win32_Process |
	Where-Object { $_.CommandLine -like '*-File*start-kiosk.ps1*' -and $_.ProcessId -ne $PID } |
	ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

Get-NetTCPConnection -LocalPort $port -State Listen |
	ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" |
	Where-Object { $_.CommandLine -like "*$edgeProfile*" } |
	ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
