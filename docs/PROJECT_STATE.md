# Project state

Snapshot: 2026-11-16, end of P0. Update this file at the end of every slice.

## Phase status

| Phase | Scope | Status |
| --- | --- | --- |
| Intake | Owner questions, environment audit, documentation system | done — 2026-11-16 |
| P0 | Repo hygiene, hooks, CI, workspace, check-done | done — 2026-11-16 |
| P1 | Monorepo breadth, design system, i18n, auth, models, API | next |
| P2 | Categories, courses, sections, lessons, authoring, catalog | not started |
| P3 | Enrolment, progress, quizzes, Q&A, notes, reviews, wishlist | not started |
| P4 | Stripe test mode, PayBridge gateway, coupons, ledgers | not started |
| P5 | Live classes, attendance, reminders, calendar files | not started |
| P6 | Certificates, analytics, admin area, audit log | not started |
| P7 | Seed data, production e2e, a11y, performance, security review | not started |
| P8 | Portfolio README, demo script, deploy guide | not started |

`docs/features.json` is authoritative; this table is the summary.

## What exists

- pnpm workspace (`pnpm-workspace.yaml`) with `apps/web` and `packages/shared`.
- `packages/shared`: money in integer paisa (`toPaisa`, `formatPaisa`), Bangla and English
  formatting, 7 Vitest cases.
- `apps/web`: Next.js 16 shell with a bilingual holding page and a warm paper palette.
  This is a placeholder; the real design system, fonts and routing arrive in P1.
- Shared strict TypeScript baseline (`tsconfig.base.json`) and one flat ESLint config.
- Guards: `.githooks/commit-msg` (message credits), `.githooks/pre-push` (author and
  trailer check through `scripts/check-commits.mjs`), `.githooks/pre-commit` (gitleaks on
  staged content, fails closed), `core.hooksPath=.githooks`.
- CI: `.github/workflows/ci.yml` with commit identity, secret scan, quality (lint, types,
  tests, build) and dependency audit jobs; `.github/workflows/codeql.yml` on push and a
  weekly schedule.
- Feature gate: `node scripts/check-done.mjs`.

## Verification recorded 2026-11-16

- `pnpm lint`, `pnpm typecheck`, `pnpm test` (7 passing), `pnpm build`, `pnpm audit --prod
  --audit-level high` all exit 0 locally.
- `gitleaks git` over the full history: no leaks.
- Hook self-tests: a fake Stripe key was blocked by pre-commit; a commit by a foreign
  author and a commit with a co-author trailer were both blocked by the shared checker;
  the owner's real history passed.
- No app has been deployed yet, so nothing is live.

## Environment facts

- Node 24.22.1, pnpm 12.15.0, git 2.56.0, gh 2.103.3 signed in as `ibrahimSumon47`.
- Vercel CLI 65.4.0 on the Hobby plan; Stripe CLI 1.55.2 against another project's
  sandbox; gcloud 590.0.0 signed in; `atlas` 1.59.3 installed with an expired session.
- gitleaks 8.30.1 installed locally under `tools/gitleaks/` (gitignored) because winget has
  no package for it.
- Docker is not installed, so anything that needs it must be re-planned.

## Known risks

- Vercel Hobby daily deployment cap — batch deploys per finished slice.
- Atlas, Google OAuth and a dedicated Stripe sandbox need the owner; see `OWNER_TODO.md`.
- The NestJS-on-Vercel decision is still a spike in P1.
- TypeScript is pinned to 6.0.3 because typescript-eslint does not support 7 yet.
- The CodeQL action major version is worth re-checking on the first scheduled run.

## Next action

See `docs/HANDOFF.md`.
