# Guidance for Claude Code

Full-stack TypeScript app. SvelteKit (Svelte 5) across the stack, shadcn-svelte for UI.

## Tech stack

- **Language:** TypeScript (strict)
- **Framework:** SvelteKit (Svelte 5)
  - Refer to this link if you have confusion over the framework: https://svelte.dev/docs/kit/introduction
- **UI:** shadcn-svelte (Tailwind + Bits UI)
- **Backend:** Supabase (Postgres, Auth, Storage) via `@supabase/supabase-js`; SvelteKit server routes (`+server.ts`, `+page.server.ts`) for server logic
- **Deploy:** Netlify (`@sveltejs/adapter-netlify`) · **VCS:** GitHub · **Package manager:** npm
- **Tests:** Vitest (unit/component) + Playwright (e2e)

## Project structure

```
/src
  /routes              # SvelteKit routes
    demo/               # sv-create sample routes — remove once real routes exist
  /lib                  # Shared code (#lib subpath import)
    /components/ui       # shadcn-svelte (generated; avoid hand-editing)
    /server               # Server-only code (db, auth) — never imported client-side
    /supabase             # Client-side Supabase client helper (anon key)
  /app.html
/static                 # Static assets
components.json         # shadcn-svelte config
```

Tests live next to the code they cover (`*.spec.ts`, `*.svelte.spec.ts`), not in a separate `/tests` folder. E2e specs live under the relevant route (see `src/routes/demo/playwright`).

## Commands

| Task       | Command             |
| ---------- | ------------------- |
| Install    | `npm install`       |
| Dev        | `npm run dev`       |
| Build      | `npm run build`     |
| Typecheck  | `npm run check`     |
| Lint       | `npm run lint`      |
| Format     | `npm run format`    |
| Unit tests | `npm run test:unit` |
| E2e tests  | `npm run test:e2e`  |
| All tests  | `npm run test`      |

## Master plan and specs

`masterplan.md` defines the whole app (purpose, pieces, data model, build order); each feature has a `spec.md` derived from it. Read `masterplan.md` for context, treat the feature's `spec.md` as the source of truth. Build to the spec — no added scope. If the spec is ambiguous, contradictory, incomplete, out of step with `masterplan.md`, or needs to diverge, ask me before writing code.

## How to work here (firm expectations)

- **Verify before declaring done.** Run typecheck, lint, and relevant tests. Never report work finished if any fail.
- **Ask before big changes:** multi-file refactors, adding/upgrading dependencies, any database or schema change. Small contained edits don't need a check-in.
- **Match existing patterns** — file layout, naming, component structure, state management. Don't rewrite or restyle code outside the request.
- **Keep code minimal.** No filler or over-commenting; comment only where intent isn't obvious. Smallest change that solves the problem.
- **Write for the next developer.** Code has to be extendable by a human, or it's useless. Favour clear, conventional, boring solutions over clever ones. Readable names, small focused files and functions, typed boundaries, no hidden coupling or magic. If intent isn't obvious from the code, leave a short comment saying why. A developer who hasn't seen this code should be able to find, understand, and extend a feature without reverse-engineering it.

## Conventions

- **TypeScript:** no `any` unless unavoidable; explicit types at boundaries.
- **Components:** Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`); PascalCase files (`UserCard.svelte`).
- **UI:** add shadcn-svelte via CLI (`npx shadcn-svelte@latest add <name>`), not by hand; customize the generated files in `#lib/components/ui`.
- **Imports:** `#lib` subpath import (not `$lib`, removed in SvelteKit 3) for shared code; imports need the file extension, with `.js` for TypeScript files (`#lib/map/draw.js`); server-only code under `#lib/server`.
- **Styling:** prefer component-scoped CSS in `<style>` blocks with semantic class names over long Tailwind strings. Reserve Tailwind for generated UI components; write custom styling as real CSS. Use shadcn-svelte design tokens / CSS variables, not hard-coded colors.
- **Supabase:** create the client via a shared helper, not inline. Anon key client-side only (`#lib/supabase/client.ts`); service-role key server-only (`#lib/server/supabase.ts`), never in the browser. Read keys from env (`$env/static/public`, `$env/static/private`), never hard-coded.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`).

## Backend & deployment

- **Supabase:** Postgres, Auth, Storage. Prefer RLS over trusting the client. Schema/policy changes go through migrations — confirm first.
- **Auth:** Google sign-in via Supabase Auth (Google OAuth). **Don't set up auth until we're ready to deploy to Netlify (i.e. masterplan phases done), unless I ask** — build features unauthenticated locally until then. When we do build it: use Supabase's OAuth flow, gate protected routes server-side, and rely on RLS for data access.
- **Netlify** deploys via `@sveltejs/adapter-netlify`. **Do not deploy until every phase in `masterplan.md` is done, unless I ask** — no deploys, no PR deploy previews, no enabling the Netlify integration before then. Test locally with `npm run dev`. Once phases are complete (or I say so), deploys run on merge to `main`. Don't change build settings or env vars without checking.
- **GitHub:** work on a branch and open a PR; never push directly to `main`.

## Database design

I'm a beginner — hold the line on these (principles from _Database Design for Mere Mortals_, adapted for Postgres/Supabase). If a spec or request breaks one, flag it and explain the trade-off before building. Schema changes go through a migration and a check-in first.

- **One subject per table.** Split a table collecting facts about two subjects.
- **One fact in one place.** Store data once and join; no redundant copies (keys excepted).
- **Atomic fields.** One indivisible value per column — no comma-separated lists, no combined `address` or `name`.
- **No repeating groups.** `phone1/phone2/phone3` → a related table, one row per value.
- **Proper primary key.** Surrogate `id uuid default gen_random_uuid()` — unique, never null, never changes, no business meaning. Don't key on email/phone.
- **Real foreign keys**, enforced in the DB. One-to-many: FK on the "many" side. Many-to-many: junction table with two FKs. One-to-one usually means one table — justify a split.
- **Deletion rule per FK.** Default `ON DELETE RESTRICT` unless cascade is clearly correct.
- **Integrity in the DB:** `NOT NULL`, `UNIQUE`, `CHECK`. RLS controls access, not data integrity.
- **Don't store calculated values.** Derive in a query/view. Exception: documented denormalization for a measured need, confirmed first.
- **Normalize first, optimize later.** Denormalize only for a proven performance problem, and write down why.
- **Naming:** tables plural snake_case (`order_items`); columns singular snake_case (`created_at`); PK `id`; FKs `<singular_table>_id` (`customer_id`).
- **Postgres types:** `uuid` keys, `timestamptz` for time, `numeric` for money (never float), `text` for strings, real booleans. Add `created_at timestamptz default now()` to most tables; `updated_at` where rows change.
- **Check design against the data.** Confirm the model can answer the app's questions and store every required fact before building the migration.

## Svelte tooling

Uses the official Svelte plugin for Claude Code. Install once per machine:

```
/plugin marketplace add sveltejs/ai-tools
/plugin install svelte
```

Provides the Svelte MCP server, skills that keep code valid Svelte 5, and an official agent for Svelte files. Delegate `.svelte`, `.svelte.ts`, and `.svelte.js` edits and Svelte MCP calls to that agent. Our conventions here (scoped CSS, `#lib` structure, no `any`, shadcn-svelte via CLI) still apply.

## Agents

In `.claude/agents/`, each scoped to a job, pulling rules from this file and `writing.md`. Structure: **Front End** (frontend-lead → ui-ux-designer + svelte-builder), **Back End** (supabase-guardian), plus review, verification, and a **delivery-tracker** that carries state across sessions.

Typical order per feature:

- **spec-reviewer** (read-only) — runs first on a new `spec.md`; flags ambiguity, contradictions, missing scope; returns questions to resolve before code.
- **frontend-lead** — front-end owner/planner. Turns the spec into a build plan (routes, component tree, state boundaries) and coordinates the design and build specialists. Plans; doesn't hand-write Svelte.
- **ui-ux-designer** — design authority: layout, interaction, accessibility (WCAG AA), visual consistency against shadcn-svelte tokens. Covers loading/empty/error/first-run states. Designs; svelte-builder implements.
- **svelte-builder** — main implementer. Builds to spec with Svelte 5 runes, shadcn-svelte via CLI, scoped CSS, strict TS. Delegates `.svelte` edits to the official Svelte agent. Confirms before multi-file refactors, new deps, or schema changes.
- **supabase-guardian** — back end: schema, RLS, migrations, Google auth, key handling. Enforces the database-design rules above. Confirms before any schema/policy change.
- **content-writer** — user-facing copy (UI strings, empty states, errors, onboarding, landing, docs) against `writing.md`, then self-audits for banned patterns.
- **code-reviewer** (read-only) — reviews the diff: unused code, `any`, pattern drift, styling, leaked secrets, committed `.env`/`.md` files, migrations, scope creep.
- **verify-gate** — runs typecheck, lint, tests last. Returns DONE only if all pass; else NOT DONE with the failures.
- **delivery-tracker** — maintains `delivery.md` (root) so context survives across sessions. Read it at session start to restore state; update it as work moves through spec → build → review → verify.

## Do not

- Commit secrets, `.env` files, or credentials.
- Commit scratch/working notes (e.g. ad hoc `.md` files you create for your own use). Intentional project docs — `CLAUDE.md`, `masterplan.md`, `spec.md`, `writing.md`, `delivery.md`, files under `docs/` and `.claude/agents/` — are meant to be committed; they're the project's source of truth and need to survive across sessions and machines.
- Add a library when an existing one covers the need.
- Leave unused imports, variables, or dead code.
- Use the default AI blockquote (gray left-border callout); match the app's design or use a plain element.
- Leave failing tests, type errors, or lint errors.
- Make unrelated changes in the same diff.
