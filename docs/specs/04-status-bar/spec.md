# Spec 04: Status bar

Phase 4 of `docs/masterplan.md`. Owner answers are in Resolved questions at the end.

## Goal

Fill the 5% strip along the bottom of the screen: the date and time, how many municipalities we cover, a rotating ticker, and the data credits. The strip is already reserved in `src/routes/+page.svelte`.

## What the bar shows

Left to right:

1. **Date and time**, in Toronto time, without seconds: "Thursday, October 22, 2026" and "10:48 pm".
2. **Municipalities:** "50 municipalities". The count comes from the list, never typed in.
3. **Ticker:** one fact at a time, 8 seconds each, with a short fade. A fact is a single line that fits the bar.
4. **Credits**, small, at the right: "Weather and radar: Environment Canada. Census: Statistics Canada. Open Government Licence, Canada." This replaces the radar credit that sits on the map today. The radar time label stays on the map.

## Ticker facts

Everything below comes from data the app already has, so there are no new sources.

**From the census file (static):**

- Largest and smallest: "Espanola is our largest municipality at 5,185 people. Cockburn Island is our smallest at 16."
- Fastest growing since 2016: "Lake of the Woods grew fastest since 2016, up 33.9%."
- Biggest by land: "Fauquier-Strickland covers 1,010 km², the most of any municipality we serve."
- Reach: "We serve 50 municipalities across 10 districts, home to 41,025 people."

**From live weather (needs data for all 21 forecast sites):**

- Warmest and coldest right now: "Right now it's warmest in Wawa at 6° and coldest in Matachewan at 1°."
- Warnings: "Weather warnings are in effect for 4 of our municipalities." Shown only when there is at least one. When there are none: "No weather warnings for any of our municipalities."

**Your own lines:** a plain list in `src/lib/data/tickerMessages.ts`, one string per line, for things like company news. Each shows as written, in the rotation after the built in facts. The list starts empty.

**Fixed:**

- "The radar on the map shows the last 3 hours and updates every 6 minutes."

The numbers in each line are worked out when the line is about to show, so they stay current. Copy follows `docs/Writing.md`.

## Behaviour

- **Order:** the facts rotate in a fixed order. A fact that can't be worked out (no weather data yet) is skipped, so the ticker never shows a blank or a placeholder. There are always at least 5 static facts.
- **Weather for the whole map:** the app fetches all 21 forecast sites at start, one at a time, and refreshes each once its cached copy is 10 minutes old. It uses the same cache as the panel, so a site is never fetched twice at once. Weather older than 2 hours is dropped, as in the panel.
- **Warmest and coldest** use only municipalities with a current temperature. The line is skipped if fewer than 10 municipalities have one, so a partial load can't name a "coldest" that is really just the first one loaded.
- **Warnings count** counts municipalities, not warnings, since one site's warning applies to every municipality that uses it. It is skipped until every site has loaded at least once, so it never says "no warnings" because data is missing.
- **Clock:** reads the wall clock every second, so the minute changes on time. It follows clock changes and daylight saving.
- **Reduced motion:** the ticker cuts between facts without a fade.
- **Hidden tab:** nothing special. The clock and ticker catch up when the tab returns.

## Technical notes

- `StatusBar.svelte` in `src/lib/statusBar/`, with the fact list built by plain TypeScript (`#lib/statusBar/facts.ts`) so it can be tested. The component only renders the current text.
- `facts.ts` takes the municipality list, the census facts and a read-only view of the weather cache, and returns the facts in order. A fact is `{ id, text }`, or null when it can't be worked out.
- The weather cache gains a method to list what it holds, and the page starts the warm up of all 21 sites. Site ids come from `municipality-facts.json`.
- Bar text sizes scale with the bar's height, so the bar stays readable at any screen size, the same approach as the panel.
- The map caption keeps the radar time and drops the credit. The credit moves to the bar.
- No new dependencies.
- Tests: each fact's text for known input, skipped when data is missing, the warmest and coldest threshold, the warnings count counting municipalities once, and the rotation cycling through the available facts in order.

## Out of scope

News, company announcements, a scrolling marquee, sound, anything needing a new data source. Phase 5 handles full screen, the hidden cursor and long run recovery.

## Resolved questions (owner, 2026-10-22)

1. The ticker facts are right as listed, and a list of your own lines is wanted.
2. No seconds on the clock.
3. The credits move into the bar.
