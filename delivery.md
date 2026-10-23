# Delivery

## Current state (2026-10-22)

- Phase 0 (scaffold) done.
- Phase 1 (map, spec `01-map`) built. Typecheck, lint, unit tests, e2e and build pass. Not yet through code-reviewer or content-writer. Nothing committed.

## Next action

1. Owner looks at the map (`npm run dev`) and checks pin positions.
2. Run code-reviewer, then commit on a branch.
3. Write `docs/specs/02-radar/spec.md`.

## Decisions

- Docs replaced: old screensaver plan and specs deleted.
- No Supabase, no auth. Netlify adapter installed, no deploy until all phases are done.
- Pins mark municipalities only. Boundary from Natural Earth, coordinates from CGNDB.
- Agents copied from `docs/Agents/` to `.claude/agents/`.

## Open questions

- Dawson and Head, Clara, Maria coordinates are the least certain matches.
