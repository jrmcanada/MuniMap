# Spec 05: Kiosk

Phase 5 of `docs/masterplan.md`. Owner answers are in Resolved questions at the end.

## Goal

The wall display runs for weeks with nobody touching it. It starts and goes full screen on its own at boot, keeps the screen awake, hides the mouse cursor, fits any screen size, and recovers from a dropped connection and from a stuck page.

## Decisions (owner, 2026-10-23)

- The display is a **Windows PC running Edge**, at **varying resolutions**.
- The app is served **from the PC itself** for now. The owner will move it to Netlify later (Phase 6). Nothing here depends on the internet except the live weather and radar, and nothing depends on where the app is served from: the start script takes an address, so Netlify is one setting.
- The page refreshes itself at **4:00 am** every day.
- The cursor hides after **3 idle seconds**.
- Radar frames are capped at **1600 pixels wide**.

## What the app can and can't do

A web page can't switch itself to full screen. Browsers only allow it after a click or key press. So full screen comes from how Edge is launched, and a start script does that. Everything else the app does itself.

## Starting at boot

- `scripts/start-kiosk.ps1` starts the app's local server (`vite preview` on port 4183, bound to `127.0.0.1`), waits up to 60 seconds for it to answer, then opens Edge full screen on `http://localhost:4173` with `--kiosk --edge-kiosk-type=fullscreen --no-first-run`. A `-NoBrowser` switch starts only the server, for testing.
- `docs/kiosk-setup.md` is a short, numbered guide for the display PC:
  1. Install Node and get the project onto the PC, then `npm install` and `npm run build`.
  2. Put a shortcut to the start script in the Windows Startup folder (`shell:startup`), and set the PC to sign in on its own.
  3. Power settings: never sleep, never turn the screen off.
  4. Stop Windows Update from restarting the PC in office hours, and turn off notifications and pop ups.
  5. To update the app: pull the new version, `npm run build`, restart the PC. The server reads the build once at start.
  6. F11 toggles full screen in Edge if someone needs a normal window.
- Because the app files are on the PC, a boot before the network is up still opens the map, the census facts and the clock. Weather and radar fill in when the network returns. No service worker is needed.

## What the app does

- **Cursor:** hidden after 3 seconds without movement, and back as soon as the mouse moves. Clicking a pin still works, and the hand still shows over a pin while the mouse is moving. Touch is unaffected. The hiding is a class on the page root and wins over the hand.
- **Screen stays awake:** the app asks for the browser's screen wake lock on load, and again whenever the tab comes back to the front. If the browser refuses, nothing happens and nothing shows.
- **Daily refresh:** at 4:00 am Toronto time the page reloads itself. That clears any slow memory growth and loads whatever build the server holds. If a pin is held at that moment, it waits for the hold to end and checks every 5 seconds. The time is worked out so daylight saving can't skip it or fire it twice.
- **Stall watchdog:** the map's animation loop leaves a heartbeat. If it hasn't moved for 2 minutes while the tab is in front, the page reloads. A watchdog reload happens at most once every 10 minutes (the time of the last one is kept in `sessionStorage`, which survives a reload), so a page that crashes on start can't reload itself in a loop. Under reduced motion the map doesn't animate, so a timer leaves the heartbeat instead.
- **Frame loop safety:** the map's frame loop schedules its next frame before it draws, and a draw that throws is caught and logged, so one bad frame can't stop the map for good.
- **Lost connection:** already handled by the earlier phases. Radar is hidden after 1 hour without a new frame, weather after 2 hours, and the ticker skips live facts it can't state. Nothing shows an error. This phase adds no screen text for it.
- **Any screen size:** the panel scales its text by the smaller of its width and its height, so the card fits on tall, short, wide and ultrawide screens alike. Sizes stay in one unit, `--u`, defined once on the panel. The map already fits any size. The status bar already sizes from its height.
- **Memory on big screens:** radar frames are requested at most 1600 pixels wide (height in proportion) and drawn stretched to fit. At 3840 pixels wide this cuts 31 frames from about 1 GB to about 180 MB, and the radar is soft anyway. The cap applies to CSS pixels, not device pixels, so a 4K screen at 150% scaling (2560 CSS pixels wide) is capped too, and a 1920 wide screen at 100% is not.

## Technical notes

- Plain TypeScript with tests under `#lib/kiosk/`:
  - `msUntilNextRefresh(now)`: time to the next 4:00 am Toronto time, correct across daylight saving.
  - `shouldReloadForStall(lastBeat, now, lastReload)`: the watchdog rule.
  - `radarRequestSize(width, height)`: the 1600 pixel cap, with the aspect ratio kept.
  - `heartbeat.ts`: `beat()` and `lastBeat()`.
- A small Svelte component, `Kiosk.svelte`, mounts the cursor, wake lock, refresh and watchdog, and renders nothing. `+page.svelte` includes it once and tells it whether a pin is held.
- `RadarView` gets a request size that can differ from the canvas size. `MapView.svelte` sends the heartbeat from its loop.
- Panel sizing: `container-type: size` on the panel (its width and height come from fixed grid tracks, so this is safe), and `--u: min(1cqw, 0.38cqh)` on the card's wrapper. Every size in the card is `calc(var(--u) * N)`. The `0.38cqh` factor comes from the tallest card measured (3 line name, 2 warnings, full forecast), which needed about 248 units of height.
- No new dependencies.
- Tests: the refresh time across both daylight saving changes, the watchdog rule and its 10 minute guard, the radar size cap at 4K and below the cap, an e2e check that the cursor hides after 3 idle seconds and returns on movement, and an e2e check at 8 screen sizes (1024×768, 1280×720, 1366×768, 1920×1080, 1920×1200, 2560×1080, 2560×1440, 3840×2160) that the panel card and status bar don't clip.

## Out of scope

A hidden diagnostics screen, remote monitoring or alerts when the display goes down, a service worker, a version check, a Windows `.scr` screensaver, and the Netlify deploy (Phase 6).

## Defaults from spec review (change if you disagree)

Checked on 2026-10-23: `vite preview` serves the Netlify adapter's build on `127.0.0.1`, the app runs from it, `localhost` and `127.0.0.1` both count as secure contexts, and the wake lock API is present. The app has no server routes (the page is client only), so no adapter change is needed.

**Serving and keeping it running**

- `vite preview` is a developer tool, so nothing restarts it. `scripts/start-kiosk.ps1` therefore stays running as a small supervisor in a hidden window. Every 30 seconds it checks that the server answers and that Edge is running, and restarts whichever is down. It never writes a log, so nothing grows on disk.
- The server starts with `--host 127.0.0.1 --port 4183 --strictPort`, and Edge opens `http://127.0.0.1:4183`, so the host, port and address always agree. Port 4183 is not Vite's usual 4173, so dev tools and the e2e tests can't collide with it. It runs `node` on Vite directly from the project folder, so it doesn't depend on `npm.cmd` or on where a Startup shortcut runs from.
- If there is no build, the script builds one first. If the server isn't answering after 60 seconds, the supervisor loop tries again rather than opening a dead page.
- `-Url <address>` skips the local server and opens that address instead (the Netlify move). `-NoBrowser` starts only the server, for testing.
- To update the app: stop the script, pull, `npm run build`, start the script again (or restart the PC). Never build while the server is running.
- Edge flags: `--kiosk <address> --edge-kiosk-type=fullscreen --no-first-run --user-data-dir=<a folder of its own> --disable-session-crash-bubble --hide-crash-restore-bubble --noerrdialogs --disable-infobars --disable-features=Translate --disable-pinch --overscroll-history-navigation=0`. The separate profile stops an ordinary Edge window on the same account from taking over the launch, and keeps the kiosk's cache apart. Some of these flags change between Edge versions, so the setup guide says to try the kiosk once on the real PC.
- Edge's own memory can still grow over weeks. A weekly Edge restart is left out and listed as accepted risk, since the supervisor already brings Edge back if it dies.

**Page behaviour**

- **Wake lock:** a bonus. The power settings in the setup guide carry the real load. The app handles the lock being released and asks again.
- **Heartbeat:** a plain number in memory (not storage), written by the map's frame loop after each successful draw. Under reduced motion the map doesn't animate, so the kiosk's own 5 second timer writes it instead, which shows the page's scripts are alive. It starts when the page mounts, so a 2 minute stall means 2 minutes after start. A slow boot that takes longer reloads once, and the 10 minute guard then holds.
- **Hidden window:** the watchdog only counts while the page is visible. If Edge is minimised or covered, it waits. When the page becomes visible again the heartbeat restarts, so it doesn't reload at once.
- **Guard storage:** the time of the last watchdog reload is kept in `sessionStorage` inside a try and catch. If storage fails, the watchdog treats it as a reload that just happened and does nothing, which can't loop. The 4:00 am reload is a separate path, not blocked by the guard.
- **The 4:00 am timer:** one 5 second timer checks the clock against the 4:00 am instant worked out when the page started, so a sleep, resume or clock change can't miss it. If the PC wakes after 4:00 am, the page reloads at once. A held pin delays the reload for at most 5 minutes.
- **Frame loop safety:** the first failed draw is logged once, not 60 times a second. A map that keeps failing stops beating, so the watchdog reloads it.
- **Cursor:** the hiding rule is `html.cursor-hidden, html.cursor-hidden * { cursor: none !important }`, which beats the hand's inline style. Only mouse movement on the whole document resets the 3 second timer. Taps and pen strokes don't show a cursor.
- **Radar sizing:** the request size is also the size frames are decoded at, so it is what saves the memory. `MapView` passes `radarRequestSize(width, height)` as the radar width and height. The bounding box is unchanged.
- **Panel sizing:** `--u` is set on the card's wrapper, a direct child of the panel, with a comment that no nested container may be added. The `0.38` factor and the 248 unit estimate are starting points: the tallest card is re-measured at all 8 screen sizes and the factor tuned until each has headroom.
- **Credit text size:** the status bar credits are the same size as the panel footer, with no minimum (owner request, 2026-10-23). On a small screen such as 1024 by 768 that is about 8.6px.
- **Windows steps:** auto sign in stores a password on the PC, so use a dedicated account with no other access, and the guide says so.

## Resolved questions (owner, 2026-10-23)

1. Windows PC running Edge, at varying resolutions.
2. The app is served from the PC itself for now.
3. 4:00 am for the daily refresh.
4. The cursor hides after 3 idle seconds.
5. Radar at most 1600 pixels wide is fine.
