# Handoff

Updated: 2026-11-16

## Where we are

Intake is complete and the documentation system is committed. The remote was empty, so
`main` was created from scratch. No application code exists yet.

## Exact next step

1. Wait for the owner to type **START**.
2. Start Phase 0:
   - install `gitleaks` (winget) and verify it runs;
   - add `.gitleaks.toml`, the gitleaks pre-commit hook and a hook smoke test;
   - add `.github/workflows/ci.yml` with lint, typecheck, unit tests, build, gitleaks,
     CodeQL, dependency audit and an author/commit-message guard job;
   - scaffold the pnpm workspace (`apps/web`, `apps/api`, `apps/paybridge`, `packages/*`)
     with strict TypeScript, ESLint and Vitest wired to `pnpm -r` scripts;
   - verify `git config core.hooksPath` is `.githooks` and that both hooks reject a
     deliberately bad test commit (then remove that commit);
   - update docs and push once.
3. Then Phase 1 per `docs/features.json`.

## Before that, the owner must

Nothing, to start Phase 0. Account work in `docs/OWNER_TODO.md` only becomes blocking at
P1 (Atlas cluster, Google OAuth client) and P4 (dedicated Stripe sandbox, PayBridge
database).

## Current gate

`node scripts/check-done.mjs` exits non-zero by design: 1 of 44 features is done. It must
exit 0 before the final message of the whole project.

## Useful commands

```bash
git config --get core.hooksPath        # expect .githooks
git log --format='%h %an <%ae>' -5
gh api repos/ibrahimSumon47/Pathshala/contributors --jq '.[].login'
node scripts/check-done.mjs
```
