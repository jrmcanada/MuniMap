# Spec 04: Status bar

Phase 4 of `docs/masterplan.md`. Owner answers are in Resolved questions at the end.

## Goal

Fill the 5% strip along the bottom of the screen: the date and time, how many municipalities we cover, a rotating ticker, and the data credits. The strip is already reserved in `src/routes/+page.svelte`.

## What the bar shows

Left to right:

0. **Logo** (added by the owner, 2026-10-23): the Managed Municipality logo in the lower left corner of the screen, from `src/lib/assets/tmm-logo.png`. It lives in the strip below the map, so it never overlaps the map, its borders or the radar. Its height is 80% of the strip.
1. **Date and time**, in Toronto time, without seconds: "Thursday, October 22, 2026" and "10:48 pm".
2. **Municipalities:** "54 municipalities". The count comes from the list, never typed in.
3. **Ticker:** one fact at a time, 8 seconds each, with a short fade. A fact is a single line that fits the bar.
4. **Credits**, small, at the right, on two lines: "Weather and radar: Environment Canada. Census: Statistics Canada." and "Map: Natural Earth. Open Government Licence, Canada." This replaces the radar credit that sits on the map today. The radar time label stays on the map.

## Ticker facts

Everything below comes from data the app already has, so there are no new sources.

**From the census file (static):**

- Largest and smallest: "Clearview is our largest municipality, with 14,814 people in the 2021 census." and "Cockburn Island is our smallest, with 16 people in the 2021 census."
- Fastest growing since 2016: "Lake of the Woods grew fastest since 2016, up 33.9%."
- Biggest by land: "Fauquier-Strickland covers 1,010 km², the most of any municipality we serve."
- Reach: "We serve 54 municipalities across 12 districts and counties, home to 70,225 people."

**From live weather (needs data for every forecast site (23 today)):**

- Warmest and coldest right now: "Right now it's warmest in Wawa at 6° and coldest in Matachewan at 1°."
- Warnings: "Weather warnings are in effect for 4 of our municipalities." Shown only when there is at least one. When there are none: "No weather warnings for any of our municipalities."

**Your own lines:** a plain list in `src/lib/data/tickerMessages.ts`, one string per line, for things like company news. Each shows as written, in the rotation after the built in facts. The list starts empty.

**Fixed:**

- "The radar on the map shows the last 3 hours and updates every 6 minutes."

The numbers in each line are worked out when the line is about to show, so they stay current. Copy follows `docs/Writing.md`.

## Behaviour

- **Order:** the facts rotate in a fixed order. A fact that can't be worked out (no weather data yet) is skipped, so the ticker never shows a blank or a placeholder. There are always at least 5 static facts.
- **Weather for the whole map:** the app fetches every forecast site (23 today) at start, one at a time, and refreshes each once its cached copy is 10 minutes old. It uses the same cache as the panel, so a site is never fetched twice at once. Weather older than 2 hours is dropped, as in the panel.
- **Warmest and coldest** use only municipalities with a current temperature. The line is skipped if fewer than 10 municipalities have one, so a partial load can't name a "coldest" that is really just the first one loaded.
- **Warnings count** counts municipalities, not warnings, since one site's warning applies to every municipality that uses it. It is skipped until every site has loaded at least once, so it never says "no warnings" because data is missing.
- **Clock:** reads the wall clock every second, so the minute changes on time. It follows clock changes and daylight saving.
- **Reduced motion:** the ticker cuts between facts without a fade.
- **Hidden tab:** nothing special. The clock and ticker catch up when the tab returns.

## Technical notes

- `StatusBar.svelte` in `src/lib/statusBar/`, with the fact list built by plain TypeScript (`#lib/statusBar/facts.ts`) so it can be tested. The component only renders the current text.
- `facts.ts` takes the municipality list, the census facts and a read-only view of the weather cache, and returns the facts in order. A fact is `{ id, text }`, or null when it can't be worked out.
- The weather cache gains a method to list what it holds, and the page starts the warm up of every forecast site. Site ids come from `municipality-facts.json`.
- Bar text sizes scale with the bar's height, so the bar stays readable at any screen size, the same approach as the panel.
- The map caption keeps the radar time and drops the credit. The credit moves to the bar.
- No new dependencies.
- Tests: each fact's text for known input, skipped when data is missing, the warmest and coldest threshold, the warnings count counting municipalities once, and the rotation cycling through the available facts in order.

## Out of scope

News, company announcements, a scrolling marquee, sound, anything needing a new data source. Phase 5 handles full screen, the hidden cursor and long run recovery.

## Defaults from spec review (change if you disagree)

- **Fit:** ticker facts and the credits may use two lines in the bar. Text is sized from the bar's height (`container-type: size`, `cqh` units) with a floor of 11px. A fact longer than two lines, including your own lines, is cut off with an ellipsis. The largest and smallest municipalities are two separate facts so each stays short.
- **Temperatures name forecast sites, not municipalities.** 54 municipalities share 23 sites, so ties are certain and a municipality can't claim a reading it doesn't have. Example: "Warmest reading right now: Wawa, 6°. Coldest: Kirkland Lake, 1°." The site list is the 23 sites in `municipality-facts.json`. The fact needs readings from at least 8 sites, each observed within the last hour. It is skipped when the warmest and coldest round to the same number. Ties go to the first site alphabetically. A true minus sign is used for negatives ("−3°"), never a hyphen, and a reading that rounds to zero shows "0°".
- **Alerts, not just warnings.** The count includes watches and warnings (red, orange or yellow), not statements. It reads "Weather alerts are in effect for 4 of our municipalities." and "No weather alerts for any of our municipalities." It counts municipalities, through each one's site. It is skipped unless every forecast site were fetched within the last hour.
- **Warm up:** the page fetches the forecast sites one at a time at start, and again every 5 minutes. The cache only refetches a site once its copy is 10 minutes old, so that is a refresh every 10 to 15 minutes, and a failed site is retried every 5 minutes. It runs beside the panel and never delays the first card. A site that keeps failing only costs the alerts fact and a place in the temperature reading.
- **Rotation:** the ticker advances every 8 seconds on a timer and tracks its position by slot, so facts that appear or disappear as data arrives don't make it skip or repeat. A hidden tab simply resumes. Order: size (largest, smallest), growth, area, reach, temperatures, alerts, radar, then your own lines.
- **Wording:** "across N districts and counties" (Renfrew is a county), "2021 census" and "between the 2016 and 2021 censuses" where it matters. Figures are rounded as follows: people as whole numbers with a thousands separator, land area to whole km², growth to 1 decimal.
- **Own lines:** `tickerMessages.ts` exports `string[]`. Blank lines are ignored. Ids are positional. Lines should follow `docs/Writing.md`.
- **If no live fact is available** the ticker shows the census facts, the radar line and your own lines.
- **Clock:** always Toronto time, whatever the municipality on the panel, formatted like the radar label ("10:48 pm"). Checked once a second.
- **Credits:** two lines, broken before "Map": "Weather and radar: Environment Canada. Census: Statistics Canada." then "Map: Natural Earth. Open Government Licence, Canada." The credits column is as wide as its text needs, and the ticker takes the rest. The map caption keeps only the radar time, and hides when there is none.
- **Root element:** `StatusBar.svelte` is the page's footer element and sets its own grid placement across both columns.

## Resolved questions (owner, 2026-10-22)

1. The ticker facts are right as listed, and a list of your own lines is wanted.
2. No seconds on the clock.
3. The credits move into the bar.
