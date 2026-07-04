# CLAUDE.md

Cartina Muta — a blind-map geography game. Click the named municipality on a map.
React 19 + TypeScript + Vite, static SPA deployed to **Cloudflare Pages**.

## Workflow

- **Trunk-based development.** Develop and push directly to `main`. No feature branches or PRs unless the user explicitly asks.
- **After every fix or feature, run `/deliver`** — self-review, local health checks (mirroring CI), commit, push, then babysit CI + deployment until green. Work isn't done until the deploy is confirmed live. The deliver skill reads `.claude/guardrails.md` (a living log of CI/deploy lessons) and updates it on any new failure.
- **Every change with testable logic should include a regression test.** The game engine (`src/game/engine.ts`) is a pure reducer tested in `src/game/engine.test.ts` with an injectable RNG — cover new engine behavior there.
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
Deploy (`.github/workflows/deploy.yml`) builds and ships to Cloudflare Pages on push to
`main`, then verifies the live `<meta name="build-sha">` matches the pushed commit.

Required GitHub Actions secrets: `CLOUDFLARE_API_TOKEN` (scope: Cloudflare Pages: Edit)
and `CLOUDFLARE_ACCOUNT_ID`.

## Adding a map

See `README.md` — add the province to `scripts/extract-map.ts`, run `npm run extract-map`,
create `src/maps/<id>/index.ts`, and register it in `src/maps/registry.ts`.

## Data & attribution

Any third-party data/assets must be credited in `CREDIT.md` (source, license, usage).
Boundaries are ISTAT data via openpolis (ODbL).
