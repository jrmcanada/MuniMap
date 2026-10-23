# Spec 03: Municipality panel

Phase 3 of `docs/masterplan.md`. Owner answers are in Resolved questions at the end.

## Goal

A panel in the right 20% of the screen that cycles through the 54 municipalities, 20 seconds each. Each one shows live weather and a few census facts. The matching pin is marked on the map, so the panel and the map read as one thing.

## Sources

- **Weather:** Environment Canada's open `citypageweather-realtime` API, `https://api.weather.gc.ca/collections/citypageweather-realtime/items`. No key, Open Government Licence, Canada. It covers 844 forecast sites, and none of the 54 municipalities is a site itself. Each uses its **nearest site**: the median distance is 22 km and the farthest are Dawson (Sioux Narrows, 78 km) and Matachewan (Kirkland Lake, 53 km). The panel names the site it used ("Weather from Sault Ste. Marie") so nothing claims more than it knows.
- **Census facts:** Statistics Canada table 98-10-0002-01 (2021 Census, population and dwelling counts by census subdivision), a small CSV. Open Government Licence, Canada. Read once into a static file in the repo, never fetched at runtime. Most names match a census subdivision directly; 7 are mapped by hand in the script, and the 5 the census renames are: Hilton Township (Hilton), MacDonald, Meredith and Aberdeen (Macdonald, Meredith and Aberdeen Additional), Nairn (Nairn and Hyman), Plummer (Plummer Additional) and Tarbutt (Tarbutt and Tarbutt Additional). The district name comes from the census division in the same file.
- **Sunrise and sunset:** computed from the municipality's coordinates. No source.

## What the panel shows

Top to bottom:

1. Municipality name, and its district (for example "Algoma District").
2. Current conditions: temperature, feels like, weather icon and short text, wind, humidity.
3. Next 3 forecast periods, with the high or low and a short text.
4. Sunrise and sunset today (local time).
5. Census: population (2021), change since 2016, land area, density.
6. Small footer: "Weather from {site}. Environment Canada." and when it was observed.

Weather warnings from Environment Canada show as a banner at the top of the panel when one is active for the site.

## Card layout (owner request, 2026-10-23)

The panel is a stack of rounded cards on the panel background, in the existing colours. A card is a slightly lighter blue grey with the panel's border colour. Top to bottom:

1. **Name card:** municipality and district.
2. **Alert banners**, when there are any, as before.
3. **Weather card:** icon, temperature, condition, feels like and humidity on the left, and a **wind compass** on the right. The arrow points where the wind is going (it comes from the named side) and is the map's pin colour. The speed and gusts sit under it. Calm wind shows "Calm" and no arrow. With no wind reading the compass is left out.
4. **Forecast card:** the next 3 periods.
5. **Sun card:** an arc from sunrise to sunset with the sun at its place now (pin colour for the stretch it has travelled, the highlight colour for the sun). When the sun is down the arc shows "Sun is down". Sunrise and sunset times sit under it.
6. **Census card:** population and land area.
7. Credit line at the foot, as before.

Sizes use the same unit as before, now `--u: min(1cqw, 0.36cqh)`. The factor went from 0.38 to 0.36 so the tallest card (a three line name, two alerts, a full forecast, the compass and the arc) keeps at least 10% spare at the eight screen sizes. The card logic is in `WindCompass.svelte` and `SunArc.svelte`, with the direction to bearing rule in `#lib/weather/compass.ts` and the sun position in `#lib/weather/sunArc.ts`.

## Behaviour

- **Order:** a fixed shuffled order, reshuffled each full lap, so neighbours on the map don't always follow each other and a long running screen doesn't feel on rails.
- **Timing:** 20 seconds each (changed from 30 by the owner, 2026-10-23), a short crossfade between municipalities. A lap is 18 minutes.
- **Click a pin:** clicking or tapping a pin on the map jumps the panel to that municipality and rings it on the map. It stays for 60 seconds, and clicking another pin restarts the 60 seconds on that one. Then the rotation resumes with the next municipality in its order, and gives it a full 20 seconds. A click counts if it lands within 16 pixels of a pin; where pins crowd together the nearest one wins. The pointer turns into a hand over a pin. This is a pointer shortcut: the rotation still shows every municipality with no input.
- **Map link:** the current municipality's pin gets a larger, brighter ring and its name label. All other pins stay as they are. Only one label is ever on the map, so labels can't overlap each other. The label goes to the right of the pin, flips to the left near the right edge of the map, and nudges up or down to stay inside it.
- **Fetching:** weather for the next municipality is fetched about 5 seconds before it appears (15 seconds into the current 20), then refreshed whenever the municipality comes round again. Sites shared by several municipalities (Sault Ste. Marie serves at least 5) are fetched once and cached for 10 minutes.
- **Failures:** if weather can't be fetched, the panel keeps showing the census facts and the sunrise and sunset and drops the weather block, with no error text. If cached weather is less than 2 hours old it stays, with its observation time shown. Older than that, it is dropped.
- **Reduced motion:** no crossfade, and the pin ring doesn't pulse.
- **Language:** English only.

## Technical notes

- The district and census figures are in the generated `src/lib/data/municipality-facts.json`, keyed by municipality name and typed in `src/lib/data/facts.ts`. `municipalities.ts` is unchanged.
- Logic under `#lib/weather/` (nearest site, API response parsing, cache) and `#lib/panel/` (rotation order, timing). The Svelte panel only renders what they give it.
- The nearest site for each municipality is worked out once at build time and stored, so the app never downloads the full site list.
- The route's layout becomes map (75%), panel (20%) and a reserved strip for the Phase 4 status bar (7%, raised from 5% by the owner on 2026-10-23 to give the logo room).
- No new dependencies expected.
- Tests: rotation covers every municipality once per lap, the nearest site table has an entry for every municipality within 100 km, the parser handles a missing field, the cache expires correctly, and sunrise and sunset match a known date and place.

## Out of scope

Status bar and ticker (Phase 4). Forecast charts. Historical weather. French.

## Defaults from spec review (change if you disagree)

- **Layout:** a 7% strip along the bottom is reserved for the Phase 4 status bar. Above it, the map and the panel share the width 75 to 20, so the map is about 79% of the width and the panel about 21%. Grid tracks are fixed, and panel content is clipped (`overflow: hidden`), so nothing in the panel can resize the map and trigger a radar refetch. Panel text sizes scale with the panel's width.
- **Clock:** the rotation steps on a monotonic clock (`performance.now`), checked once a second, so clock changes and daylight saving never skip or repeat a municipality. In a hidden tab the rotation catches up on return by jumping to the right municipality. A new lap never starts with the municipality that ended the last one.
- **Map highlight:** `MapView` takes a `highlight` prop (the municipality name). The ring snaps to the new pin, with no fade, and is a static larger ring under reduced motion. The label has its own colour tokens. Placement is a pure function (right of the pin, flipped left near the right edge, nudged to stay inside the map). It may cover a neighbouring pin where several sit close together, which is accepted.
- **Scripts:** `scripts/build-municipality-data.mjs` writes `src/lib/data/municipality-facts.json` (district, census figures, nearest forecast site). The output is committed. The census CSV is downloaded by hand (instructions are at the top of the script) and not committed. The 7 name mappings between our names and the census names live in the script. The script stops if any name has no unique Ontario match or a site is farther than 100 km.
- **Sunrise and sunset:** a small NOAA algorithm in `#lib/weather/sun.ts`, no library, tested against a known date and place.
- **Time zone:** the panel shows times in the municipality's zone (Central for longitudes west of -90, Eastern otherwise).
- **Warnings:** watches and warnings both show, all active ones, most severe colour first (red, orange, yellow). Text is the feed's `description`, as given. Expired ones are dropped. A site's warning shows on every municipality that uses that site.
- **Forecast rows:** the next 3 periods, each with its name, high or low, and the short text (`abbreviatedForecast`).
- **Missing data:** a missing field leaves out that row, never a dash. If a site has no temperature, the current conditions block is hidden.
- **Staleness:** a site's weather is dropped when it was fetched more than 2 hours ago. A reading observed more than 2 hours ago loses only the current conditions block, because the forecast and warnings fetched with it are still good (Deep River's station can go quiet for hours). The cache is in memory only.
- **Fetch rules:** each request has a 10 second timeout and is cancelled on failure. A failed prefetch is retried when the municipality comes up.
- **Icon:** the feed's icon image is hot linked from weather.gc.ca and hidden if it fails to load.
- **No server rendering for this page.** `src/routes/+page.ts` sets `ssr = false`: the page needs `window`, and the shuffled order differs on every load, so server HTML would never match the browser's.
- **Out of scope, to keep it small:** pressure, dewpoint, hourly forecast, links on warnings.

## Resolved questions (owner, 2026-10-22)

1. The facts are the proposed set: census numbers, forecast, sun times.
2. Census figures come from Statistics Canada, as above.
3. Order is shuffled, reshuffled each lap.
4. The name also appears on the map next to the highlighted pin, as long as labels don't overlap.
5. Weather warnings show as a banner.
