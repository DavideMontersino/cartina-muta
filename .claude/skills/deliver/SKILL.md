---
name: deliver
description: "Self-improving delivery pipeline: self-review, local health checks, commit, push, babysit CI & deployment, close the originating GitHub issue once live, and post-mortem learning from failures. Use after finishing a feature or fix, before considering work done — including work started from a GitHub issue. Examples: '/deliver'."
---

# Deliver

A self-improving delivery pipeline that ensures changes reach production safely. It mirrors the CI pipeline locally, babysits remote verification, and learns from every failure to prevent recurrence.

Repo: `DavideMontersino/cartina-muta` · Production: https://cartina-muta.pages.dev

## When to invoke

Call `/deliver` (or invoke this skill) every time you finish working on a feature or fix and are ready to push to main. The skill handles everything from self-review through deployment verification. This project is **trunk-based**: develop and push directly to `main`, no feature branches or PRs unless the user explicitly asks.

## Pipeline

### Phase 1: Pre-flight — Load guardrails

1. Read `.claude/guardrails.md`. This file contains lessons learned from past CI/deploy failures. Each guardrail describes a pattern that has caused failures and a local check to prevent it.
2. Keep the guardrails in mind throughout all subsequent phases — they inform both the self-review and the health checks.

### Phase 2: Self-review

Before running any automated checks, review the changes for correctness.

1. Get the diff being delivered:
   - `git diff` (unstaged), `git diff --cached` (staged)
   - `git log --oneline origin/main..HEAD` and `git diff origin/main..HEAD`
2. Commit any pending changes as semantic commits (feat:, fix:, chore:, refactor:, test:, docs:), grouping related changes. **Never add Claude as a collaborator.**
3. **Spawn a review agent** (NOT in background — wait for the result):

```
Read the file .claude/self-review-instructions.md and follow it exactly.

Additionally, check these guardrails from .claude/guardrails.md:
<paste guardrails content here>

## Git diff (origin/main..HEAD)
<paste the full diff>

Review the changes and respond with APPROVE or REQUEST CHANGES.
Pay special attention to any guardrail patterns that match the current changes.
```

4. **If REQUEST CHANGES:** Fix each issue, amend the commit, re-review. Max 2 rounds.
5. **If APPROVE:** Continue to Phase 3.

### Phase 3: Local health checks — Mirror CI exactly

Run the **exact same checks** that CI runs, in the same order. This is the core defense against red CI.

```bash
# 1. Lint — auto-fix deterministic issues first, then check for remaining errors
npm run lint:fix
npm run lint

# 2. Type check (matches CI: npx tsc -b)
npx tsc -b

# 3. Test (matches CI: npm run test → vitest run)
npm run test

# 4. Build (matches CI: npm run build → vite build)
npm run build
```

**All four must pass.** If any fails: fix immediately, amend the commit, re-run all checks from the beginning (a fix to one may break another). Max 3 cycles, then stop and report.

**Guardrail checks:** After the standard four, run any additional checks specified in `.claude/guardrails.md` under "Active guardrails".

### Phase 4: Push

1. `git push origin main`
2. If rejected (remote ahead): `git pull --rebase origin main` and retry. Up to 4 retries.
3. If rebase conflicts: abort, report to the user.
4. Record the pushed SHA: `git rev-parse --short HEAD`

### Phase 5: Babysit CI

1. Find the run: `gh run list --branch main --limit 5`, then `gh run view RUN_ID`.
2. Poll every 30 seconds, max 10 minutes.
3. **If CI passes:** continue to Phase 6.
4. **If CI fails:** go to **Phase 7 (Post-mortem)** immediately, then fix and retry. Max 3 attempts before reverting.

### Phase 6: Babysit deployment

1. The Deploy workflow posts/log-reports `**Deploy ✅** <sha> verified live` once the live `<meta name="build-sha">` matches the pushed SHA.
2. Verify directly: `curl -s "https://cartina-muta.pages.dev?_nocache=$(date +%s)" | grep build-sha` and confirm it matches `git rev-parse --short HEAD`.
3. Poll every 30 seconds, max 15 minutes (CDN propagation can be slow).
4. **If deploy passes:** continue to Phase 6.5, then report success. Delivery is complete!
5. **If deploy fails:** go to **Phase 7 (Post-mortem)**.

### Phase 6.5: Close the originating issue (if applicable)

If this work was picked up from a GitHub issue, close it now that the fix is verified live — don't leave it open for the user to close by hand.

1. Identify the issue number from context: the branch name (e.g. `claude/issue-5-...`), a `Fixes #N` / `Closes #N` / `Resolves #N` reference in the commit message, or explicit issue context earlier in the conversation. If no issue is identifiable, skip this phase silently.
2. Confirm the issue is still open (`issue_read` → `get`) before touching it — it may already be closed.
3. Close it with `issue_write` → `update`: `state: closed`, `state_reason: completed`, and append (don't replace) a short note in the body with the fix commit SHA and a one-line root cause + fix summary — enough for someone reading later without re-deriving it.
4. Only close if CI **and** deploy both passed and the fix is verified live. If the fix is partial or you're unsure it fully addresses the issue, leave it open and say why instead of closing.
5. If in doubt about whether an issue is really the one this work resolves, ask the user rather than closing the wrong one.

### Phase 7: Post-mortem — The self-improving loop

**This is the most important phase.** When CI or deployment fails, don't just fix and move on — learn from it.

#### Step 1: Deep analysis

1. Get failure details: `gh run view RUN_ID --log-failed`.
2. Classify: `lint` / `typecheck` / `test` / `build` / `deploy` / `env`.
3. Root cause: What failed (exact error)? Why didn't local health checks catch it? Is there a pattern? What local check would have prevented it?

#### Step 2: Update guardrails

1. Read `.claude/guardrails.md`.
2. Add a new guardrail under the appropriate category with: pattern name, date, failure (one line), root cause, prevention, check command.
3. If the failure matches an existing guardrail that didn't prevent it, **strengthen** it.

#### Step 3: Fix and retry

1. Fix the issue.
2. Re-run the full Phase 3 pipeline, including the new guardrail.
3. Amend and push (`git push --force-with-lease` if you amended).
4. Return to Phase 5. Max 3 cycles; after that, `git revert` and report a full post-mortem. The guardrails learned still persist.

## Guardrails file format

See `.claude/guardrails.md`. Categories: Lint, Type check, Test, Build, Deploy, Environment. Each entry: `**[pattern-name]** (date): description. Check: \`command\``.

## Rules

- **Never skip the self-review or the local health checks** — even for "trivial"/"just formatting" changes.
- **Always update guardrails on failure.** The whole point is to learn.
- **Be honest in post-mortems.** Don't blame CI flakiness if the code was wrong.
- **Every fix or feature should include a regression test** where there's testable logic (see self-review-instructions.md).
- Never add Claude as a collaborator on git commits. Commit messages must be semantic.
