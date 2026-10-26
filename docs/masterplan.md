# MuniMap: master plan

A live map of our clients across Ontario for the big screen at the office. Source notes: `MuniMap.md` (repo root).

## Purpose and audience

We're a software development and IT company with about 80 clients in Ontario. The screen sits in our office, so clients, visitors and staff all see it. It has to change often enough that someone watching for 20 seconds notices it's alive. Every data source has to be public domain or openly licensed, since outsiders will see the screen.

It runs on its own. Someone can click a pin to jump the panel to that municipality (see spec `03`), and that is the only input. Single owner, no accounts.

## Screen layout

| Area       | Share of screen | Contents                                                                                                  |
| ---------- | --------------- | --------------------------------------------------------------------------------------------------------- |
| Main map   | 75%             | Map of Ontario, client pins, animated weather radar overlaid (subtle enough to keep the pins easy to see) |
| Info panel | 20%             | One municipality at a time, 20 seconds each: weather, population and other facts                          |
| Status bar | 7%              | Current date and time, number of municipalities represented, rotating ticker                              |

## Features

1. **Map.** Ontario base map with a pin for each client municipality.
2. **Radar overlay.** Animated weather radar over the map at low opacity.
3. **Municipality panel.** Cycles through the municipalities, 20 seconds each. Clicking a pin jumps to that municipality. Current weather, population, and other facts worth showing.
4. **Status bar.** Clock, municipality count, rotating ticker.
5. **Kiosk behaviour.** Full screen, hidden cursor, runs unattended for days, recovers from a dropped connection.

## Data model

No database. The client list is a typed file in the repo (about 80 entries). Pins are placed by municipality, so one pin can stand for several clients. Live data (radar, weather) is fetched at runtime; slow changing facts (population) are static files.

## Decisions

- 2026-10-22: The screensaver masterplan and specs 01 to 10 that came in the docs folder were stale template leftovers. Deleted. Agents, `Workflow.md` and `Writing.md` stay.
- 2026-10-22: **No Supabase and no Google auth.** The client list is a static file. Parts of `CLAUDE.md` and `Workflow.md` about them don't apply, and `supabase-guardian` isn't used.
- 2026-10-22: `@sveltejs/adapter-netlify` is installed per `CLAUDE.md`, but nothing deploys until every phase is done.
- 2026-10-22: shadcn-svelte is installed (style `vega`, neutral base). The visuals are custom (scoped CSS); add components only when a real need shows up.

- 2026-10-22: The base map is Web Mercator so Environment Canada radar frames line up with it (spec `02-radar`).
- 2026-10-22: Pins mark the municipality only. Data sources are Environment Canada (radar, weather) and Statistics Canada (population). The base map is self drawn from open boundary data.

## Open questions (for the owner, before the specs)

Questions 3 to 5 below are answered; see the decisions above.

1. **Client list.** `municipalities.md` lists 54 municipalities, mostly small ones in Northern Ontario (Algoma, Timiskaming, Cochrane, Sudbury and Manitoulin districts, Kenora), plus two in southern Ontario (Clearview and Georgian Bluffs). It's names only, so each one needs a coordinate, and some are unclear (see below). Client company names stay off the screen unless you say otherwise.
2. **Ambiguous names.** "Hilton Beach" and "Hilton Township", "James", "Prince", "Hudson", "Laird", "Johnson" and "Gordon-Barrie Island" appear in more than one place or are combined entries. "Head, Clara, Maria", "MacDonald, Meredith and Aberdeen" and "Burpee and Mills" are single municipalities with long names. I'd confirm the district for each when I build the data file.
3. **Pin precision.** One pin per municipality is the proposal. Exact addresses would put client locations on a public screen.
4. **Data sources.** Proposed: Environment Canada GeoMet for radar and current conditions (open licence), Statistics Canada census for population. Facts beyond that need a source each.
5. **Map tiles.** A public domain base map. OpenStreetMap tiles need attribution and have usage limits for a screen running all day; a self drawn Ontario outline from open boundary data avoids that.

## Build order (phases)

1. **Phase 0, scaffold.** SvelteKit, TypeScript strict, Tailwind, shadcn-svelte, Vitest, Playwright. _(Done 2026-10-22.)_
2. **Phase 1, map.** Ontario base map and client pins. _(Built and reviewed 2026-10-22.)_
3. **Phase 2, radar.** Animated overlay. _(Built and reviewed 2026-10-22.)_
4. **Phase 3, municipality panel.** Rotation, weather, population, facts. _(Built and reviewed 2026-10-22.)_
5. **Phase 4, status bar.** Clock, count, ticker. _(Built and reviewed 2026-10-23.)_
6. **Phase 5, kiosk polish.** Full screen, long run stability, error recovery. _(Built 2026-10-23, review pending.)_
7. **Phase 6, deploy.** Netlify, once everything above is done.

Each phase becomes one or more `spec.md` files under `docs/specs/` as it is picked up. This plan sets order and boundaries, not implementation detail.
