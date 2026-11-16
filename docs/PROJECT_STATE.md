# Project state

Snapshot: 2026-11-16, Phase 1 complete except the API hosting spike. Update this file at the end of every slice.

## Phase status

| Phase | Scope | Status |
| --- | --- | --- |
| Intake | Owner questions, environment audit, documentation system | done — 2026-11-16 |
| P0 | Repo hygiene, hooks, CI, workspace, check-done | done — 2026-11-16 |
| P1 | Design system, i18n, models | done — 2026-11-16 |
| P1 | Auth with roles, API hardening | done — 2026-11-16 |
| P1 | API hosting spike | in progress — adapter built, deploy awaits owner |
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
- `apps/web`: Next.js 16 with next-intl. Bangla lives at `/` and English at `/en`; pages
  are server-rendered because the header reads the session. Routes: landing, catalogue,
  sign-in, dashboard, admin and the Auth.js handler.
- Auth.js v5 with credentials plus optional Google, JWT sessions and roles in the token.
  Demo accounts are bcrypt-hashed in code; setting `MONGODB_URI` switches the same account
  functions to Mongo. `/dashboard` needs a session and `/admin` needs the admin role.
- `apps/api`: NestJS with health and `GET /courses`, a repository seam, Zod validation, a
  single error envelope, a per-instance rate limit and one Vercel function adapter.
- Primitives in `apps/web/src/components/ui`: Button, Field, Select, Card, Badge, Skeleton,
  EmptyState. Header adds account state, a language switch and a stored light/dark toggle.
- Fonts: Inter for Latin, Noto Sans Bengali for Bangla, self-hosted by `next/font`.
- Guards, CI and the feature gate from P0 are unchanged and still green.

## Verification recorded 2026-11-16

- `pnpm lint`, `pnpm typecheck`, `pnpm test` (62 tests: 12 tokens, 17 models, 21 web, 12
  API) and `pnpm build` all exit 0 locally.
- Visual pass on 2026-11-16: landing, sign-in, dashboard and admin at 390px and 1440px in
  light and dark; no horizontal overflow at 320px; one React warning from the inline theme
  script was found and fixed by moving the boot to `next/script`.
- Browser auth flow: student signs in, gets the student dashboard and a 404 on `/admin`;
  sign-out works; admin signs in and sees the account table; a wrong password returns to
  the form with an accessible error.
- API on `http://localhost:4000`: health 200, courses 503 `database_unavailable`, invalid
  query 400, missing route 404, the 61st request in a minute 429.
- Not verified yet: a deployed preview, any database read or write, Google sign-in, API
  cold start on Vercel, and axe / Lighthouse passes.

## Environment facts

- Node 24.22.1, pnpm 12.15.0, git 2.56.0, gh 2.103.3 signed in as `ibrahimSumon47`.
- Vercel CLI 65.4.0 on Hobby; Stripe CLI against another sandbox; gcloud signed in;
  `atlas` installed but its session expired.
- gitleaks 8.30.1 under gitignored `tools/gitleaks/`.
- Docker is not installed.

## Known risks

- Vercel Hobby daily deployment cap — batch deploys per finished slice.
- Atlas, Google OAuth and a dedicated Stripe sandbox need the owner; see `OWNER_TODO.md`.
- The NestJS-on-Vercel decision is still a spike; deployment and cold start are unmeasured.
- Demo accounts are off in production unless `DEMO_AUTH=true`; while enabled their
  credentials are public and admin is read-only. Seed real accounts when Atlas lands, then
  remove the demo flag before any destructive admin action ships.
- Google sign-in without Mongo creates a session with the student role and no stored user.
- Next.js downloads the two fonts at build time; CI needs network access to Google Fonts.
- Tailwind is not installed yet. Tokens are CSS variables, so the P2 mapping is additive.

## Next action

See `docs/HANDOFF.md`.
