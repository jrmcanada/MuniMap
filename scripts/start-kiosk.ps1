<#
Starts the TMM Map display on this PC, then keeps it running.

It serves the built app on 127.0.0.1, opens it full screen in Edge, and every 30 seconds
restarts the server or Edge if either has stopped. It writes no log files.

  -Url <address>  Open this address instead of serving the app here (for example the Netlify site).
  -NoBrowser      Start only the server. For testing.

Put a shortcut to this file in the Startup folder (shell:startup). See docs/kiosk-setup.md.
#>
param(
	[string]$Url,
	[switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$port = 4173
$localUrl = "http://127.0.0.1:$port"
$address = if ($Url) { $Url } else { $localUrl }
$edgeProfile = Join-Path $env:LOCALAPPDATA 'TMMMapKiosk'
$vite = Join-Path $root 'node_modules\vite\bin\vite.js'
$checkSeconds = 30
$startupSeconds = 60

function Test-App {
	try {
		(Invoke-WebRequest -Uri $localUrl -UseBasicParsing -TimeoutSec 5).StatusCode -eq 200
	} catch {
		$false
	}
}

function Stop-Server {
	Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
		ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

function Start-Server {
	# Build once if there is no build yet. Never build while the server is running.
	if (-not (Test-Path (Join-Path $root '.svelte-kit\output'))) {
		Push-Location $root
		& node $vite build
		Pop-Location
	}
	Start-Process -FilePath node -WorkingDirectory $root -WindowStyle Hidden `
		-ArgumentList @($vite, 'preview', '--host', '127.0.0.1', '--port', $port, '--strictPort') | Out-Null

	# If the server isn't up in time, the loop below tries again.
	$deadline = (Get-Date).AddSeconds($startupSeconds)
	while ((Get-Date) -lt $deadline) {
		if (Test-App) { return }
		Start-Sleep -Seconds 1
	}
}

function Test-Edge {
	$running = Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" |
		Where-Object { $_.CommandLine -like "*$edgeProfile*" }
	[bool]$running
}

function Start-Edge {
	# A profile of its own stops an ordinary Edge window from taking over the launch.
	$flags = @(
		'--kiosk', $address,
		'--edge-kiosk-type=fullscreen',
		'--no-first-run',
		"--user-data-dir=`"$edgeProfile`"",
		'--disable-session-crash-bubble',
		'--hide-crash-restore-bubble',
		'--noerrdialogs',
		'--disable-infobars',
		'--disable-features=Translate',
		'--disable-pinch',
		'--overscroll-history-navigation=0'
	)
	Start-Process -FilePath 'msedge.exe' -ArgumentList $flags | Out-Null
}

while ($true) {
	if (-not $Url -and -not (Test-App)) {
		Stop-Server
		Start-Server
	}
	$ready = [bool]$Url -or (Test-App)
	if (-not $NoBrowser -and $ready -and -not (Test-Edge)) {
		Start-Edge
	}
	Start-Sleep -Seconds $checkSeconds
}
