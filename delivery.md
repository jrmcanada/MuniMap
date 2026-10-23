# Delivery

## Current state (2026-10-22)

- Phase 0 (scaffold) done.
- Phase 1 (map, spec ) built, reviewed, fixes applied. Branch , PR not yet opened or merged. holds the scaffold commit only.
- Phase 2 (radar, spec ) built on branch (off ). Typecheck, lint, 20 unit tests, e2e and build pass; checked live against GeoMet. Not yet through code-reviewer. Not pushed.

## Next action

1. Open the PR for on GitHub and merge it, then rebase or retarget .
2. Run code-reviewer on .
3. Write .

## Decisions

- Docs replaced: old screensaver plan and specs deleted.
- No Supabase, no auth. Netlify adapter installed, no deploy until all phases are done.
- Pins mark municipalities only. Boundary from Natural Earth, coordinates from CGNDB.
- Base map is Web Mercator for radar alignment. GeoMet takes one layer per request, so rain and snow are fetched separately and composited.
- Radar older than 1 hour (by newest frame) is hidden. Label is Toronto time.
- Agents copied from to . They load as agent types only in a new session; this session ran them through a general-purpose agent.

## Open questions

- Dawson and Head, Clara, Maria coordinates are the least certain matches.
- Radar colours are GeoMet defaults; tuning to the blue and gold palette is a later pass.
