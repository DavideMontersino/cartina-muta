# CLAUDE.md

Campanilismi (repo: cartina-muta) — a blind-map geography game. Click the named municipality on a map.
React 19 + TypeScript + Vite, static SPA deployed to **Cloudflare Pages**.

## Workflow

- **Local work ALWAYS happens in a git worktree.** Any session running on the owner's laptop must create and work in a dedicated git worktree (e.g. `git worktree add ../cartina-muta-<task> -b <task>`), never directly in the primary checkout. Cloud Claude Code sessions run in their own isolated environments, so multiple agents can otherwise clash on the same working tree at the same time — the worktree keeps local edits from colliding with a concurrent cloud session. Merge/push from the worktree when the work is done.
- **Trunk-based development.** Develop and push directly to `main`. No feature branches or PRs unless the user explicitly asks. (The worktree rule above is about isolating the *working directory*, not about long-lived feature branches — land on `main`.)
- **After every fix or feature, run `/deliver`** — self-review, local health checks (mirroring CI), commit, push, then babysit CI + deployment until green. Work isn't done until the deploy is confirmed live. The deliver skill reads `.claude/guardrails.md` (a living log of CI/deploy lessons) and updates it on any new failure.
- **Before every commit to `main`, add a changelog entry** to `src/data/changelog.json` — prepend one object `{ "date": "YYYY-MM-DD", "sha": "<full commit sha>", "description": "<one-line summary of what changed>" }`. The sha is the commit being pushed (run `git rev-parse HEAD` after committing). The description should be written for a player, not a developer — plain Italian, no jargon. This file powers the `/changelog` page visible to users.
- **Every change with testable logic should include a regression test.** The game engine (`src/game/engine.ts`) is a pure reducer tested in `src/game/engine.test.ts` with an injectable RNG — cover new engine behavior there.
- **No page scroll — every screen must fit the viewport.** This is a game; `<body>` is `overflow: hidden`, so anything that spills past the viewport is silently clipped and becomes unreachable (a control off the bottom edge can't be tapped). Design each screen to fit; split long flows into wizard steps rather than stacking a tall page. A dev-only guard (`src/dev/useNoScrollGuard.ts`) warns in the console and paints a badge whenever content overflows — watch for it while working. Internal scroll *inside a bounded panel* (a leaderboard list, the map canvas) is fine; page-level scroll is not.
- **Lint: auto-fix before checking.** Run `npm run lint:fix` before `npm run lint`.
- **Fix pre-existing errors — never skip them.** If lint/typecheck/tests show errors (even ones that predate your change), fix them.
- **Never add Claude as a collaborator** on git commits. Use semantic commit messages (feat:, fix:, chore:, refactor:, test:, docs:).

## Commands

```bash
npm run dev          # local dev server
npm run test         # vitest (engine unit tests)
npm run lint:fix     # biome auto-fix, then:
npm run lint         # biome check
npx tsc -b           # typecheck
npm run build        # production build -> dist/
npm run deploy       # manual: wrangler pages deploy dist/ --project-name=cartina-muta
npm run extract-map  # regenerate per-province comuni.json from the ISTAT source
```

## Deploy

CI (`.github/workflows/ci.yml`) runs lint/typecheck/test/build on every push and PR.
Deploy (`.github/workflows/deploy.yml`) deploys the multiplayer Worker, applies pending
D1 migrations, builds and ships to Cloudflare Pages on push to `main`, then verifies the
live `<meta name="build-sha">` matches the pushed commit.

Required GitHub Actions secrets: `CLOUDFLARE_API_TOKEN` (scopes: **Cloudflare Pages: Edit**,
**Account > D1 > Edit**, AND **Account > Workers Scripts: Edit**) and `CLOUDFLARE_ACCOUNT_ID`.
Required GitHub Actions **variables** (public URLs, not secrets): `VITE_ROOMS_HTTP_BASE` and
`VITE_ROOMS_WS_BASE` — the deployed rooms-Worker origin, e.g.
`https://cartina-muta-rooms.<subdomain>.workers.dev` and its `wss://` form. The frontend bakes
these in at build time to reach the multiplayer backend (see Multiplayer).

## Auth (Better Auth)

Email + magic-link auth on a D1 database (`cartina-muta-auth`), mirroring the Peak setup.
Backend lives in `src/auth/*` (config/email/client) and `functions/api/auth/[[route]].ts`;
schema in `migrations/`. Runtime secrets are **Cloudflare Pages secrets** on the
`cartina-muta` project (not GitHub secrets): `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
`RESEND_API_KEY`. For local dev, copy `.dev.vars.example` to `.dev.vars` (gitignored) and
run `wrangler pages dev` (with `EMAIL_DEV_STUB=1`, magic links print to the console).
`EMAIL_FROM` in `src/auth/email.ts` must stay on a Resend-verified domain.

## Maps

All 107 Italian provinces are playable. `npm run extract-map` regenerates everything
from the ISTAT source: one lazy-loaded `src/maps/data/<id>.json` per province (id =
lowercased 2-letter province acronym, e.g. Cuneo → `cn`), the small always-loaded
`src/maps/provinces.json` index, and `src/maps/overview.json` (municipalities dissolved
per province via a topojson merge) for the national picker map on the home screen.
`src/maps/registry.ts` exposes the index and an async `loadMap(id)` (code-split per
province). The picker renders with a planar `geoIdentity` projection — the merged
overview's ring winding isn't consistent for d3's spherical geometry.

## Multiplayer (Sfida)

Real-time blind-map rooms: a host creates a room, shares a **code / link / QR**, friends
join (guests or signed-in), everyone gets the **same comune at once**, up to **3 guesses**
each; a round reveals when all connected players finish or the 25s timer expires. Scoring
rewards accuracy + speed; animated standings show every 3rd round and at the end.

- **Backend is a separate Worker** (`workers/rooms/`, deployed as `cartina-muta-rooms`):
  Cloudflare Pages can't host a Durable Object class (no DO migrations in Pages config), so
  the `Room` DO lives here. One DO instance per room code; state persisted to DO storage with
  the **WebSocket Hibernation API**; the round clock uses DO **alarms**. `npm run rooms:dev`
  to run locally, `npm run rooms:deploy` to ship.
- **Shared, testable logic in `src/multiplayer/`** — imported by *both* the Worker and the
  React client: `protocol.ts` (wire types), `room.ts` (lobby reducer), `game.ts` (round order,
  scoring, resolution), `code.ts` (room codes). Pure and unit-tested (`*.test.ts`), mirroring
  the engine. Tunables live in `ROOM_CONFIG` (game.ts).
- **Client**: `useRoom` (WS hook, backoff reconnect) drives `RoomView` → lobby / game / standings
  / results. Reuses `MapCanvas`. The frontend reaches the Worker via `VITE_ROOMS_HTTP_BASE` /
  `VITE_ROOMS_WS_BASE`; unset → same-origin `/api`. For local dev, copy `.env.example` to
  `.env.local` pointing at `localhost:8799`.
- **Auth optional**: guests play with a name only; the Worker holds no user data (permissive
  CORS is therefore fine). A `/room/CODE` deep link opens straight into the join flow.

## Data & attribution

Any third-party data/assets must be credited in `CREDIT.md` (source, license, usage).
Boundaries are ISTAT data via openpolis (ODbL).
