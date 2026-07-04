# Guardrails

Lessons learned from CI/deploy failures. Read by the `/deliver` skill before every push.
Each guardrail should be born from a real failure — but this file is **seeded** with
transferable lessons carried over from the sibling `peek` project's same
Vite + Cloudflare Pages setup, so we don't have to re-learn them the hard way.

## Active guardrails

### Lint

- **Biome formatting drift** (seeded): CI runs `npm run lint` (`biome check`) on the whole `src/`+`scripts/` tree, not just the files you touched. Local editors may auto-format only open files. **Check:** always run `npm run lint:fix` first (deterministic auto-fix of formatting + import order), then `npm run lint`. If `lint:fix` changes files, stage and commit them.

### Type check

- **tsbuildinfo staleness** (seeded): the incremental `tsc -b` cache can report phantom errors or miss real ones after branch switches / dependency changes. CI starts fresh. **Check:** run `npx tsc -b` before pushing; if you see phantom errors, delete `tsconfig.tsbuildinfo` and re-run.

### Test

- (none yet)

### Build

- **Untracked asset/data imports** (seeded): code that imports a file which exists locally but was never `git add`ed builds fine locally and fails on CI's fresh clone. Relevant here: extracted `src/maps/**/comuni.json` map data. **Check:** after adding a map or asset import, run `git status --short` and confirm every imported file is tracked/staged. Note the raw `italy-municipalities.geojson` is intentionally gitignored — only the extracted per-province JSON is committed.

### Deploy

- **wrangler-action installs latest wrangler in CI** (seeded): `cloudflare/wrangler-action@v3` without a pinned `wranglerVersion` tries `npx wrangler@<latest>`, which npx cannot auto-install non-interactively in CI, so the step exits 1. **Check:** the Deploy step in `.github/workflows/deploy.yml` must pin `wranglerVersion: "3.90.0"`.
- **Shallow clone truncates git history** (seeded): GitHub Actions defaults to `fetch-depth: 1`, so build-time `git rev-parse`/`git log` see only one commit. **Check:** every workflow that builds the app must set `fetch-depth: 50` on `actions/checkout@v4`.
- **Build SHA injection** (seeded): the Deploy workflow verifies the live site by matching `<meta name="build-sha">` in the HTML against the pushed SHA. If the build stops injecting the SHA, verification always reports a mismatch. **Check:** after `npm run build`, confirm `grep 'build-sha' dist/index.html` shows the real short SHA (not `__BUILD_SHA_PLACEHOLDER__`).
- **wrangler.toml ignored without `pages_build_output_dir`** (seeded): `wrangler pages deploy dist/` silently ignores `wrangler.toml` (compat flags, etc.) unless the file declares `pages_build_output_dir`; the log prints "Ignoring configuration file". Only matters if we later add Pages Functions or compat flags. **Check:** if the deploy needs anything from `wrangler.toml`, confirm `pages_build_output_dir = "dist"` is set and the deploy log has no "Ignoring configuration file".
- **Cloudflare API token expiry / scope** (seeded, updated 2026-07-04): CI passes but the Deploy step fails with `Authentication error [code: 10000]` when `CLOUDFLARE_API_TOKEN` is expired or lacks scope. Since auth was added, the token needs **BOTH `Cloudflare Pages: Edit` AND `Account > D1 > Edit`** — the "Run D1 migrations" step calls the remote D1 API (and fails without D1 scope even when there are no pending migrations). **Fix (manual, owner):** regenerate/edit the token (Cloudflare dashboard → My Profile → API Tokens) and update the GitHub secret.
- **D1 migration step must not be `continue-on-error`** (seeded from Peak's 4-day outage): the "Run D1 migrations" step in deploy.yml is deliberately NOT `continue-on-error` and pins `wranglerVersion: "3.90.0"` — an un-pinned wrangler-action `npx wrangler@latest` cannot install in CI and exits 1, and a silently-skipped migration ships code against a missing schema (every D1-backed endpoint then 500s / error 1101). **Check:** after any deploy that adds a migration, curl a D1-backed path and confirm it isn't 500; a migration that dies right after the wrangler banner (no "Migrations to be applied" table) is a token-permission failure on the remote call, not a config problem.
- **Verify step false-negative** (seeded): the deploy verify/report step runs *after* a successful deploy; a transient GitHub API error there must not fail the job. It is wrapped in try/catch and downgrades to `core.warning`. **Check:** if the Deploy job is red, look at which step failed first — if only "Verify deployment and report" is red, the site is live; confirm with `curl -s "https://cartina-muta.pages.dev?_nocache=$(date +%s)" | grep build-sha`.

### Environment

- (none yet)

## Retired guardrails

(none)
