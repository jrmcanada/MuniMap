# Spec 05: Kiosk

Phase 5 of `docs/masterplan.md`. Draft for owner review. No code until the open questions are answered.

## Goal

The wall display runs for weeks with nobody touching it. It goes full screen on its own at boot, keeps the screen awake, hides the mouse cursor, and recovers from a dropped connection, a stuck page and a new version of the app.

## What the app can and can't do

A web page can't switch itself to full screen. Browsers only allow it after a click or key press. So full screen comes from how the browser is launched, and that goes in a setup note (`docs/kiosk-setup.md`). Everything else the app does itself.

## Setup note (`docs/kiosk-setup.md`)

A short, numbered guide for the display PC:

1. Launch the browser in kiosk mode with the app's address, for example `msedge.exe --kiosk <address> --edge-kiosk-type=fullscreen` or `chrome.exe --kiosk <address>`.
2. Put that shortcut in the Windows Startup folder (`shell:startup`), and set the PC to sign in on its own.
3. Power settings: never sleep, never turn the screen off.
4. Stop Windows Update from restarting the PC in office hours, and turn off notifications and pop ups.
5. Fallback: F11 toggles full screen in any browser.

## What the app does

- **Cursor:** hidden after 3 seconds without movement, and back as soon as the mouse moves. Clicking a pin still works, and the hand still shows over a pin while the mouse is moving. Touch is unaffected.
- **Screen stays awake:** the app asks for the browser's screen wake lock on load, and again whenever the tab comes back to the front. If the browser refuses or doesn't support it, nothing happens and nothing shows.
- **Daily refresh:** at 4:00 am Toronto time the page reloads itself. That clears any slow memory growth and picks up a new version of the app. If someone has a pin held at that moment, it waits for the hold to end.
- **Stall watchdog:** the animation loop leaves a heartbeat. If it hasn't moved for 2 minutes while the tab is in front, the page reloads. A watchdog reload happens at most once every 10 minutes, so a page that crashes on start can't reload itself in a loop.
- **New versions:** the app checks for a new deploy every 10 minutes (SvelteKit's version check). It doesn't reload at once. It waits for the 4:00 am refresh. Until the Netlify deploy exists (Phase 6) this does nothing.
- **Lost connection:** already handled by the earlier phases. Radar is hidden after 1 hour without a new frame, weather after 2 hours, and the ticker skips live facts it can't state. Nothing shows an error. This phase adds no screen text for it.
- **Starting without a connection:** the PC may boot before the network is up. A service worker (`src/service-worker.ts`) saves the app's own files, so a reload with no connection still opens the map, the census facts and the clock, and the weather and radar fill in when the network returns. This needs the app to be served over https or from localhost, which Netlify and the dev server both are.
- **Memory on big screens:** radar frames are requested at most 1600 pixels wide, and drawn stretched to fit. At 4K this cuts 31 frames from about 750 MB to about 200 MB, and the radar is soft anyway. Below 1600 pixels nothing changes.

## Technical notes

- Plain TypeScript with tests under `#lib/kiosk/`:
  - `msUntilNextRefresh(now)`: time to the next 4:00 am Toronto time, correct across daylight saving.
  - `shouldReloadForStall(lastBeat, now, lastReload)`: the watchdog rule.
  - `radarRequestSize(width, height)`: the 1600 pixel cap, with the aspect ratio kept.
- A small Svelte component, `Kiosk.svelte`, mounts these behaviours (cursor, wake lock, timers) and renders nothing. `+page.svelte` includes it once.
- The radar loop in `MapView.svelte` sends its heartbeat. `RadarView` gets a request size that can differ from the canvas size.
- The cursor rule is one CSS class on the page root, toggled by a timer.
- The version check is `kit.version.pollInterval` in `svelte.config.js` and `updated` from `$app/state`.
- No new dependencies.
- Tests: the refresh time across a daylight saving change, the watchdog rule and its 10 minute guard, the radar size cap at 4K and below the cap, and an e2e check that the cursor hides after 3 idle seconds and returns on movement.

## Out of scope

A hidden diagnostics screen, remote monitoring or alerts when the display goes down, a Windows `.scr` screensaver, and the Netlify deploy itself (Phase 6).

## Open questions

1. **What runs the display?** Which PC, which browser and what screen resolution? I've assumed Windows and Edge or Chrome.
2. **Where does the display load the app from?** Netlify over the internet (Phase 6), or a copy running on the PC itself? It decides whether the offline start is worth building.
3. **Is 4:00 am the right time for the daily refresh?** Any quiet hour works.
4. **Cursor hidden after 3 idle seconds.** That keeps pin clicking usable with a mouse. Hide it for good instead, and mouse users lose the hand over a pin?
5. **Radar at most 1600 pixels wide.** OK on a 4K screen?
