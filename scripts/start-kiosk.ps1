<#
Starts the MuniMap display on this PC, then keeps it running.

It serves the built app on 127.0.0.1, opens it full screen in Edge, and every 30 seconds
restarts the server or Edge if either has stopped. It writes no log files.

  -Url <address>  Open this address instead of serving the app here (for example the Netlify site).
  -NoBrowser      Start only the server. For testing.

Put a shortcut to this file in the Startup folder (shell:startup). See docs/kiosk-setup.md.
Start it with -File, because stop-kiosk.ps1 finds it that way.
#>
param(
	[string]$Url,
	[switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
# Not Vite's usual 4173, which dev tools and the e2e tests also use.
$port = 4183
$localUrl = "http://127.0.0.1:$port"
$address = if ($Url) { $Url } else { $localUrl }
$edgeProfile = Join-Path $env:LOCALAPPDATA 'MuniMapKiosk'
$vite = Join-Path $root 'node_modules\vite\bin\vite.js'
$checkSeconds = 30
$startupSeconds = 60

# One supervisor at a time: a second copy (a shortcut run twice, or step 2 of the guide left
# running) would fight the first.
$mutex = New-Object System.Threading.Mutex($false, 'Global\MuniMapKiosk')
if (-not $mutex.WaitOne(0)) { exit }

function Test-App {
	try {
		# Not Invoke-WebRequest: it can go through a system proxy, and this address is local.
		$request = [System.Net.WebRequest]::Create($localUrl)
		$request.Proxy = $null
		$request.Timeout = 5000
		$response = $request.GetResponse()
		$ok = [int]$response.StatusCode -eq 200
		$response.Close()
		$ok
	} catch {
		$false
	}
}

# Only a server this project started: whatever listens on the port and runs this project's Vite.
function Get-ServerProcess {
	Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
		ForEach-Object { Get-CimInstance Win32_Process -Filter "ProcessId = $($_.OwningProcess)" } |
		Where-Object { $_.CommandLine -and $_.CommandLine.Contains($vite) }
}

function Stop-Server {
	Get-ServerProcess | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

function Start-Server {
	# Build once if there is no build yet. Never build while the server is running.
	if (-not (Test-Path (Join-Path $root '.svelte-kit\output'))) {
		Push-Location $root
		try { & node $vite build } finally { Pop-Location }
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
		Where-Object { $_.CommandLine -and $_.CommandLine.Contains($edgeProfile) }
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

$missedChecks = 0
while ($true) {
	# Anything that throws (node missing, a failed build, Edge not found) must not end the
	# supervisor: on a wall display that means a black screen until someone reboots.
	try {
		if (-not $Url) {
			# One slow answer on a busy PC isn't a dead server. Two in a row is.
			if (Test-App) { $missedChecks = 0 } else { $missedChecks++ }
			if ($missedChecks -ge 2 -or -not (Get-ServerProcess)) {
				Stop-Server
				Start-Server
				$missedChecks = 0
			}
		}
		$ready = [bool]$Url -or (Test-App)
		if (-not $NoBrowser -and $ready -and -not (Test-Edge)) {
			Start-Edge
		}
	} catch {
		# Try again at the next check.
	}
	Start-Sleep -Seconds $checkSeconds
}
