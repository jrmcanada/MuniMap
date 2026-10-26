<#
Starts MuniMap in the background if it isn't running, then opens it in your default browser.
For a laptop or desk: the wall display uses start-kiosk.ps1 instead, which opens full screen Edge.

Needs a build first (npm run build). Stop it with scripts\stop-kiosk.ps1.
Make a desktop shortcut to it with docs\desktop-shortcut.md.
#>
$ErrorActionPreference = 'Stop'

$url = 'http://127.0.0.1:4183'
$kiosk = Join-Path $PSScriptRoot 'start-kiosk.ps1'

# The kiosk script allows one copy at a time, so starting it again is harmless.
Start-Process -FilePath powershell.exe -WindowStyle Hidden `
	-ArgumentList @('-ExecutionPolicy', 'Bypass', '-File', $kiosk, '-NoBrowser')

$deadline = (Get-Date).AddSeconds(90)
do {
	Start-Sleep -Seconds 1
	try {
		$request = [System.Net.WebRequest]::Create($url)
		$request.Proxy = $null
		$request.Timeout = 5000
		$response = $request.GetResponse()
		$ready = [int]$response.StatusCode -eq 200
		$response.Close()
	} catch {
		$ready = $false
	}
} until ($ready -or (Get-Date) -gt $deadline)

Start-Process $url
