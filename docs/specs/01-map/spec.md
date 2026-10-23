# Spec 01: Map

Phase 1 of `docs/masterplan.md`.

## Goal

A full-screen map of Ontario with one pin for each of the 50 client municipalities in `municipalities.md`. No radar, panel or status bar yet; the map area is laid out at 75% of the screen so later phases slot in.

## Decisions (owner, 2026-10-22)

- Pins mark the **municipality only**, never a street address.
- The base map is **self drawn from open boundary data**, not map tiles.

## Look

- Dark background, land in a slightly lighter tone, municipal pins in one bright accent. All colours are CSS custom properties defined once in `src/routes/layout.css`; no hex values in components or drawing code.
- Ontario's outline with the Great Lakes visible as water. Neighbouring provinces and states are shown faintly for context, or left blank (open question 3).
- Pins pulse softly, staggered, so the map is never static. Respects `prefers-reduced-motion`.
- Labels: none in this phase. Names appear in the Phase 3 panel.

## Behaviour

- `/` renders the map filling the left 75% of the viewport width, full height.
- The map is fitted to the area and keeps its aspect ratio. It redraws on resize and on high DPI screens without blurring.
- Every municipality in the data file gets a pin.
- No user interaction.

## Data

- `src/lib/data/municipalities.ts`: one typed list with `name`, `longitude`, `latitude`. Adding a municipality is a one line change.
- Ontario boundary: one static TopoJSON/GeoJSON file in the repo, simplified for screen use. Imported at build time, so no network request at runtime.
- Coordinates and boundary both come from open sources (open question 1). Each source and its licence is noted in a comment at the top of the data file.

## Technical notes

- Route `/`, no server code, no database.
- Drawing logic lives in plain TypeScript under `#lib/map/` (projection, draw functions), separate from the Svelte component so it can be unit tested.
- Map is drawn on an HTML canvas with `d3-geo`. One shared `requestAnimationFrame` loop; land is cached on an offscreen canvas and only pins redraw per frame.
- New dependencies, need approval: `d3-geo`, `@types/d3-geo` (plus `topojson-client` and its types if the boundary is TopoJSON).
- Unit tests: the list has 50 entries, names are unique, coordinates fall inside Ontario's bounding box, and the projection returns finite points for every entry.

## Out of scope

Radar (Phase 2), municipality panel (Phase 3), status bar (Phase 4), kiosk behaviour (Phase 5).

## Resolved questions (owner, 2026-10-22)

1. Coordinates come from the Canadian Geographical Names Database.
2. Ambiguous names: resolved by searching "municipality of X" and taking the first hit. Not hand checked; Dawson (Rainy River district) and Head, Clara, Maria (Renfrew County) are the least certain.
3. Neighbouring provinces and states show faintly.
4. The view crops to where the pins are.
5. Dependencies approved: `d3-geo`, `@types/d3-geo`. The boundary is GeoJSON from Natural Earth (public domain), so `topojson-client` was not needed.
