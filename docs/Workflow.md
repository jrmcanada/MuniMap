# WORKFLOW.md

How to run a project from empty repo to shipped feature, using the docs and agents in this repo. Read alongside `CLAUDE.md`, `writing.md`, and the agents in `.claude/agents/`.

## One-time setup per project

1. Scaffold the app: `npx sv create` (SvelteKit + Svelte 5, TypeScript strict).
2. Add Tailwind, then shadcn-svelte (`npx shadcn-svelte@latest init`).
3. Wire up Supabase (`@supabase/supabase-js`, env vars for the keys) and the Netlify adapter (`@sveltejs/adapter-netlify`).
4. Set up Vitest (unit/component) and Playwright (e2e).
5. Push to GitHub.
6. Confirm the scripts in `CLAUDE.md` match `package.json`.

## One-time setup per machine

Install the official Svelte plugin in Claude Code:

```
/plugin marketplace add sveltejs/ai-tools
/plugin install svelte
```

This gives you the Svelte MCP server, Svelte 5 skills, and the official Svelte editing agent.

## Master plan (once per app)

Before any feature, there's a `masterplan.md` for the whole app in the context folder. This is the big-picture source of truth: what the app does, who it's for, the major pieces (pages, features, data model), and the rough order to build them in. Every `spec.md` is carved out of this plan.

Keep it living. As the app's direction shifts, update `masterplan.md` first, then let the next specs follow from it.

## Every session

Start with **delivery-tracker**. It reads `delivery.md` (repo root) and restores state: what feature is in flight, its status, decisions made, open questions, and the next action. If `delivery.md` doesn't exist yet, it creates it. It also updates `delivery.md` as work moves through the pipeline below, so the next session picks up where this one left off.

## Per feature

Pick the next feature from `masterplan.md` and write a `spec.md` for it. One feature per spec, kept small. The spec says what you're building and the plan of action, and it's the source of truth every agent reads for that feature. When the plan changes mid-build, edit the spec (and the master plan if the change is bigger than one feature), don't just say it in chat.

Then run the agents in order:

1. **spec-reviewer** reads `spec.md` and returns open questions. Answer them and tighten the spec before any code.
2. **frontend-lead** turns the spec into a front-end plan: routes, component tree, where state lives, what's server-loaded vs. client, and the boundary with the backend. Skip for backend-only features.
3. **ui-ux-designer** designs the screens and flows the plan calls for: layout, interaction, accessibility (WCAG AA), and the states specs skip (loading, empty, error, first-run), all against shadcn-svelte tokens. Hands a design brief to the builder.
4. **svelte-builder** implements to the spec and the design, delegating `.svelte` / `.svelte.*` edits to the official Svelte agent and owning the rest (server routes, config, data access, orchestration).
5. **supabase-guardian** handles anything touching the backend: schema, RLS, migrations, key handling, and the database-design rules in `CLAUDE.md`. It pauses for your OK before any schema or policy change. Auth (Google sign-in) stays deferred until you're ready to deploy — build features unauthenticated locally until then.
6. **content-writer** writes the user-facing copy against `writing.md`, then self-audits for banned patterns.
7. **code-reviewer** reviews the diff against the rules in `CLAUDE.md`.
8. **verify-gate** runs typecheck, lint, and tests. It returns DONE only if all pass.

**delivery-tracker** records each step in `delivery.md` as it lands — spec resolved, built, reviewed, verified — and logs decisions and open questions along the way.

Front-end features run the full chain; backend-only features skip frontend-lead and ui-ux-designer.

## Ship it

Work on a branch, open a PR, merge to `main` once verify-gate is green. Never push straight to `main`.

**No Netlify deployment until every phase in `masterplan.md` is done, unless I ask.** Test locally with `npm run dev` in the meantime. Don't set up, trigger, or enable a Netlify deploy — including deploy previews on PRs — before then without checking with me first. When the phases are complete (or I say so), deployment goes through the Netlify adapter on a merge to `main`.

## Rules that keep this honest

- The master plan drives the specs, and the specs drive the code. Every feature traces back to `masterplan.md`.
- Specs are the source of truth for a feature. Change the spec, not just the conversation, or the docs and code drift apart.
- Don't skip spec-reviewer, even on an obvious feature. Cheap questions up front beat expensive rewrites.
- verify-gate is non-negotiable. NOT DONE means the work isn't done, however good the diff looks.
- delivery-tracker is how context survives a new session. Keep `delivery.md` current, or the next session starts blind.

## Commands

| Task       | Command             |
| ---------- | ------------------- |
| Install    | `npm install`       |
| Dev server | `npm run dev`       |
| Build      | `npm run build`     |
| Typecheck  | `npm run check`     |
| Lint       | `npm run lint`      |
| Unit tests | `npm run test:unit` |
| E2e tests  | `npm run test:e2e`  |
