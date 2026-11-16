# Project state

Snapshot: 2026-11-16, Phase 1 in progress. Update this file at the end of every slice.

## Phase status

| Phase | Scope | Status |
| --- | --- | --- |
| Intake | Owner questions, environment audit, documentation system | done — 2026-11-16 |
| P0 | Repo hygiene, hooks, CI, workspace, check-done | done — 2026-11-16 |
| P1 | Design system, i18n, models | done — 2026-11-16 |
| P1 | Auth with roles, API hardening, API hosting spike | next |
| P2 | Categories, courses, sections, lessons, authoring, catalog | not started |
| P3 | Enrolment, progress, quizzes, Q&A, notes, reviews, wishlist | not started |
| P4 | Stripe test mode, PayBridge gateway, coupons, ledgers | not started |
| P5 | Live classes, attendance, reminders, calendar files | not started |
| P6 | Certificates, analytics, admin area, audit log | not started |
| P7 | Seed data, production e2e, a11y, performance, security review | not started |
| P8 | Portfolio README, demo script, deploy guide | not started |

`docs/features.json` is authoritative; this table is the summary.

## What exists

- `packages/tokens`: warm paper palette, one deep-teal accent, light and dark roles, a
  4/8 point spacing grid, type scale, radii, shadows and motion durations.
- `packages/shared`: money in integer paisa with Bangla and English formatting.
- `packages/db`: Mongoose models for User, Category, Course, Section, Lesson, Enrolment,
  Order and AuditEvent, with catalogue, ordering and idempotency indexes. No database
  connection exists yet: Atlas is waiting on the owner.
- `apps/web`: Next.js 16 with next-intl. Bangla lives at `/` and English at `/en`; both
  languages are prerendered. Pages: landing and catalogue (honest empty state).
- Primitives in `apps/web/src/components/ui`: Button, Field, Select, Card, Badge, Skeleton,
  EmptyState. Header adds a language switch and a stored light/dark toggle.
- Fonts: Inter for Latin, Noto Sans Bengali for Bangla, self-hosted by `next/font`.
- Guards, CI and the feature gate from P0 are unchanged and still green.

## Verification recorded 2026-11-16

- `pnpm lint`, `pnpm typecheck`, `pnpm test` (37 tests: 12 tokens, 17 models, 8
  components) and `pnpm build` all exit 0 locally.
- Build output prerenders `/bn`, `/en`, `/bn/courses` and `/en/courses`; the proxy
  negotiates locale.
- Not verified yet: a deployed preview, sign-in, any database read or write, and axe /
  Lighthouse passes. There is no auth and no API service.

## Environment facts

- Node 24.22.1, pnpm 12.15.0, git 2.56.0, gh 2.103.3 signed in as `ibrahimSumon47`.
- Vercel CLI 65.4.0 on Hobby; Stripe CLI against another sandbox; gcloud signed in;
  `atlas` installed but its session expired.
- gitleaks 8.30.1 under gitignored `tools/gitleaks/`.
- Docker is not installed.

## Known risks

- Vercel Hobby daily deployment cap — batch deploys per finished slice.
- Atlas, Google OAuth and a dedicated Stripe sandbox need the owner; see `OWNER_TODO.md`.
- The NestJS-on-Vercel decision is still a spike.
- Next.js downloads the two fonts at build time; CI needs network access to Google Fonts.
- Tailwind is not installed yet. Tokens are CSS variables, so the P2 mapping is additive.

## Next action

See `docs/HANDOFF.md`.
