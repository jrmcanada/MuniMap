# Spec 02: Radar

Phase 2 of `docs/masterplan.md`.

## Goal

Animated weather radar over the Ontario map. It loops the last 3 hours of precipitation, faint enough that every pin stays easy to see.

## Source

Environment Canada's GeoMet WMS, `https://geo.weather.gc.ca/geomet`. Checked 2026-10-22:

- Layers `RADAR_1KM_RRAI` (rain rate) and `RADAR_1KM_RSNO` (snow rate). Each has a rolling 3 hour time dimension at 6 minute steps, so about 31 frames per layer.
- **One layer per request.** A GetMap with `layers=RRAI,RSNO` returns an error, so each frame is two requests (rain, snow) drawn on top of each other.
- Returns transparent PNG. Sends `Access-Control-Allow-Origin: *`, so the browser fetches it directly. No key, no server code.
- **Errors come back as HTTP 200 with `text/xml`.** The loader must check the content type, not only the status. A time outside the dimension also returns XML.
- A 2880 wide request (a 4K wall display) works. Responses are cached for 6 minutes.
- Open Government Licence, Canada. It requires an attribution line.

## Resolved decisions (owner, 2026-10-22)

- The base map switches to **Web Mercator** (`geoMercator`, no rotate, no center) so one WMS request lines up with the canvas.
- Radar opacity about 45%, loop at 2 frames per second.
- Rain and snow both shown.

## Defaults from spec review (change if you disagree)

- Time label shows **America/Toronto** time, format "6:48 pm". The label stays visible even when the radar is blank, so a clear sky doesn't look like a broken feed.
- If no new frame has arrived for **1 hour**, the radar is dropped and the map looks like Phase 1, so a day old loop never plays as if it were live.
- Satellite cloud cover is a possible later phase, not part of this one.

## Look

- Draw order on the animated canvas each frame: cached base map, radar, pins.
- Opacity set by one CSS custom property, `--map-radar-opacity`.
- Neutral GeoMet default styles for both layers. Colour tuning to suit the blue and gold palette is a later pass.
- Attribution and time label are DOM text over the map's bottom right corner, styled with tokens: "Radar: Environment Canada. Open Government Licence, Canada." The Phase 4 status bar can take them over.

## Behaviour

- **Start:** list frame times, then fetch newest first, 6 requests at a time. The loop starts as soon as at least 1 frame has loaded and grows as more arrive. Until then the map shows with no radar.
- **Loop:** 2 frames per second, then hold the newest frame for 2 seconds and restart. A refresh only changes the frame list at that restart, never mid lap.
- **Refresh every 6 minutes:** read the time list again and fetch **only the times not already held**. Frames older than 3 hours are dropped and their bitmaps closed.
- **Frame storage:** each frame is fetched as a blob, decoded with `createImageBitmap`, and closed (`bitmap.close()`) when it leaves the window. No `<img>` elements or object URLs.
- **Failures:**
  - A frame that fails to load is skipped. The loop plays the frames it has.
  - If the time list request fails, the held frames stay and the next try follows the backoff below.
  - Retry delays after a failure: 10 s, 30 s, 60 s, then every 6 minutes. The wall display may boot before the network is up.
  - Never show an error on screen.
- **Resize:** frames are tied to one canvas size and bounding box, so a resize (debounced, same as the base map) discards them, aborts requests in flight (`AbortController`), and starts again. A late response for the old size can't land in the new set.
- **Reduced motion:** show only the newest frame, no loop. The 6 minute refresh still runs.

## Technical notes

- **Request:** WMS 1.3.0 GetMap, `crs=EPSG:3857`, `format=image/png`, `transparent=true`, empty `styles`, one `time`. Bbox order for EPSG:3857 is x,y (the axis flip only applies to EPSG:4326).
- **Bounding box:** comes from the whole canvas, not from the pin extent. With `k = projection.scale()`, `[tx, ty] = projection.translate()`, `R = 6378137`, and canvas size `W × H`: `minX = R(0 − tx)/k`, `maxX = R(W − tx)/k`, `minY = R(ty − H)/k`, `maxY = R·ty/k`. This only holds for `geoMercator` with no rotate and no center.
- **Sizes:** WMS `width` and `height` are the same integers the bbox was computed from (CSS pixels, rounded once). The canvas is scaled to match, and `drawImage(bitmap, 0, 0, width, height)` runs under the device pixel ratio transform.
- **Frame times** come from GetCapabilities (one small XML request per refresh), not from the clock. The parser accepts `start/end/PT6M`, comma lists, and several intervals, and derives the frame count rather than hard coding 31. Rain and snow use the same list; the rain layer supplies it.
- **Memory:** at 4K a decoded frame is about 25 MB, so holding 31 is a real cost. Fetching only new frames avoids doubling it on each refresh. If memory is still a problem on the wall PC, request at half size and let the canvas scale.
- Logic is plain TypeScript under `#lib/radar/`: capabilities parsing, bbox maths, URL builder, frame store. Svelte code only drives the loop.
- Phase 1 tests that change with the projection: the pin bounds check still applies; Mercator replaces the conic fitted extent.
- No new dependencies.
- Unit tests: time dimension parser (several formats, count derived), URL builder, bbox round trip (project a known lon/lat, convert to metres, check it lands on the same pixel), frame store eviction closes bitmaps, and the "drop after 1 hour" rule.

## Out of scope

Radar legend, colour tuning, satellite cloud cover, municipality panel (Phase 3), status bar (Phase 4).
