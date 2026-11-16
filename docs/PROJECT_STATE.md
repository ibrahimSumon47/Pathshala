# Project state

Snapshot: 2026-11-16. Update this file at the end of every slice.

## Phase status

| Phase | Scope | Status |
| --- | --- | --- |
| Intake | Owner questions, environment audit, documentation system | done — 2026-11-16 |
| P0 | Repo hygiene, hooks, CI skeleton, check-done | in progress |
| P1 | Monorepo, design system, i18n, auth, models, API hardening | not started |
| P2 | Categories, courses, sections, lessons, authoring, catalog | not started |
| P3 | Enrolment, progress, quizzes, Q&A, notes, reviews, wishlist | not started |
| P4 | Stripe test mode, PayBridge gateway, coupons, ledgers | not started |
| P5 | Live classes, attendance, reminders, calendar files | not started |
| P6 | Certificates, analytics, admin area, audit log | not started |
| P7 | Seed data, production e2e, a11y, performance, security review | not started |
| P8 | Portfolio README, demo script, deploy guide | not started |

`docs/features.json` is authoritative; this table is the summary.

## What exists today

- Repository initialised on `main` with `.gitignore`, `README.md`, `AGENTS.md` and the
  `docs/` memory system. Remote was empty when work started.
- `private/` (gitignored) holds the owner's intake answers.
- `scripts/check-done.mjs` gates the feature list.

Nothing runnable exists yet: no packages, no app, no CI.

## Environment facts (verified 2026-11-16)

- Git identity: `Md Ibrahim Hossain Sumon <ibrahimsumon005@gmail.com>` (global, untouched).
- `gh` 2.103.3 signed in as `ibrahimSumon47`; scopes include `repo` and `workflow`.
- `vercel` 65.4.0 signed in on the Hobby account; many unrelated projects exist.
- `stripe` 1.55.2 talks to sandbox `starViewCinemaNextJs`; no Pathshala sandbox yet.
- `gcloud` 590.0.0 signed in; no Pathshala OAuth client yet.
- `atlas` 1.59.3 is installed but its session expired; no Pathshala cluster yet.
- Node 24.22.1, pnpm 12.15.0, npm 11.19.1. Missing: `gitleaks`, `docker`.
- Repository is public and was empty (`gh api .../commits` returned 409) despite the brief
  mentioning a README commit. Recorded in `LESSONS.md`.

## Known risks

- Vercel Hobby daily deployment cap — deploy once per finished slice.
- Atlas and Google consoles need the owner; see `OWNER_TODO.md`.
- The NestJS-on-Vercel decision is still a spike; fallback must be a free host that is not
  Render.
- Stripe may not support BDT presentment from a Bangladesh sandbox; checked in P4.

## Next action

See `docs/HANDOFF.md`.
