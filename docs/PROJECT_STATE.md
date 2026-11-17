# Project state

Snapshot: 2026-11-17. The first ten phases are complete and three expansion slices are live:
course depth (P9), the learner account slice (P10, item 1) and discovery (P11, item 2). 78/78
features carry production evidence, the three apps run on Atlas and Vercel, and
`node scripts/check-done.mjs` exits 0.

## Live deployment

| App | URL | Notes |
| --- | --- | --- |
| Web | https://pathshala-web-eight.vercel.app | Next.js 16 on Vercel Hobby, Atlas data |
| API | https://pathshala-api-lake.vercel.app | NestJS bundle, `/courses` 200 from Atlas |
| Gateway | https://pathshala-paybridge.vercel.app | PayBridge sandbox, own Vercel project |
| Database | Atlas M0, `AP_SOUTHEAST_1` | project `Pathshala`, user `pathshala_app` |

The plain `pathshala-web.vercel.app` name belongs to another account, so the web app uses the
`-eight` alias everywhere, including `APP_URL`, `WEB_ORIGIN` and the Stripe endpoint.

## Phase status

| Phase | Scope | Status |
| --- | --- | --- |
| Intake | Owner questions, environment audit, documentation system | done — 2026-11-16 |
| P0 | Repo hygiene, hooks, CI, workspace, check-done | done — 2026-11-16 |
| P1 | Design system, i18n, models, auth, registration, API hardening | done — 2026-11-17 |
| P1 | API hosting | done — 2026-11-17, Mongo-backed 200 in production |
| P2 | Categories, courses, sections, lessons, authoring, catalog | done — 2026-11-17 |
| P3 | Enrolment, progress, quizzes, Q&A, notes, reviews, wishlist | done — 2026-11-17 |
| P4 | Stripe test mode, PayBridge gateway, coupons, ledgers | done — 2026-11-17, both rails verified live |
| P5 | Live classes, attendance, reminders, calendar files | done — 2026-11-17 |
| P6 | Certificates, analytics, admin area, audit log | done — 2026-11-17 |
| P7 | Seed data, production e2e, a11y, performance, security review | done — 2026-11-17 |
| P8 | Portfolio README, demo script, deploy guide | done — 2026-11-17 |
| P9 | Course detail depth, preview lessons, refund policy, studio fields | done — 2026-11-17, 14/14 production journeys |
| P10 | Cart and multi-course orders, invoices, settings, notifications, wishlist, notes, streaks and badges | done — 2026-11-17, 17/17 production journeys |
| P11 | Both-script search, price buckets, sorting, best-rated shelf, learner recommendations | done — 2026-11-17, 20/20 production journeys |
| P12 | Private and public profiles, role desks, platform revenue share, sticky masthead, motion | done — 2026-11-17, 26/26 production journeys |
| P13 | Statements, order/coupon ops, palette, lesson keys, moderation, measured perf pass | done — 2026-11-17, 31/31 production journeys |

`docs/features.json` is authoritative; this table is the summary.

## What exists

- `packages/tokens`: warm paper palette, one deep-teal accent, light and dark roles, a
  4/8 point spacing grid, type scale, radii, shadows and motion durations.
- `packages/shared`: money in integer paisa with Bangla and English formatting.
- `packages/db`: Mongoose models plus catalogue, commerce, learning, live, certificate, admin
  and analytics modules. `scripts/dev-db.ts` starts a throwaway MongoDB for local work;
  `MONGODB_URI` switches the same code to Atlas.
- Catalogue: search, subject/level/language/price filters, bounded pagination and a public
  detail view. API `/courses` and `/courses/:slug` call the same query module.
- Authoring: instructor studio at `/studio` with course create/edit, sections, lessons,
  sanitized HTML, https video slots, validated attachment metadata, draft/publish and a quiz
  builder per quiz lesson.
- Learning: `/learn/[slug]` shows the curriculum, progress, sanitized lesson body, video,
  attachments, notes, Q&A and quiz attempts. Free enrolment is idempotent; paid courses are
  fulfilled by a signed webhook. Access comes from an enrolment, course ownership or admin.
- Accounts: credentials sign-in at `/sign-in`, public learner registration at `/register`,
  a private profile at `/dashboard/profile` and public teacher pages at `/instructors/[id]`,
  each a single centred form sharing one layout stylesheet under `(auth)/` (zod validation,
  bcrypt cost 12, student-only role, duplicate-email handling). Demo account passwords are
  listed only when `DEMO_AUTH=true`.
- Certificates: completion issues one certificate per learner/course with a random public
  code and printed number. `/verify/[code]` is public and renders a QR code pointing at the
  same page.
- Analytics and admin: `/studio` shows revenue, sales, students, completion, attendance and
  a per-course table. `/admin` reports operating counts, approves course status, grants or
  revokes instructor access and lists the audit trail. The CSV export is quoted and
  formula-safe.
- Live classes: the studio schedules a session with a generated Jitsi room; `/live/[slug]`
  embeds the next room with a new-tab fallback, records one attendance row per learner and
  offers `.ics` downloads. A min-heap drains due reminders into in-app notifications;
  `pnpm reminders:dispatch` is the cron entry point and email needs `RESEND_API_KEY`.
- Payments: `/checkout/[orderNumber]` shows an order summary, coupon form and both test rails.
  `markOrderPaid` and `markOrderRefunded` are idempotent through unique webhook events,
  payment references and order status guards. Stripe creates a BDT Checkout Session and its
  hosted page is filled in the production test; PayBridge is our own gateway with a merchant
  API key, hosted checkout, HMAC webhooks, retries, refunds and a ledger. Every paid sale
  splits 80/20: the order records the platform's 20% and the admin overview shows it beside
  gross sales, refunds and average order.
- Theme: a server-read cookie renders `data-theme` on `<html>` before paint; the toggle writes
  the cookie. There is no boot script, so soft navigation cannot drop the theme.
- Fonts: Inter for Latin, Noto Sans Bengali for Bangla, self-hosted by `next/font`.

## Course depth (P9, 2026-11-17)

- A course now stores a short and a long description, six or more bilingual outcomes,
  requirements, an audience list and up to six FAQ pairs. The page renders an accordion
  syllabus with per-lesson durations, an instructor card with a localized bio, a rating
  histogram, related courses (same subject first, then the best of the rest) and a sticky
  buy panel with a coupon field and the money-back note.
- Publishing from the studio now requires at least six outcomes; the editor exposes every
  field the public page shows, plus a duration per lesson.
- Preview lessons are public through `/courses/[slug]/preview/[lessonId]` and resolve only
  when the lesson belongs to a published course and carries the preview flag.
- `/refund-policy` states the 14-day, under-a-quarter rule the buy panel links to.
- `scripts/cleanup-e2e.ts` (`pnpm db:cleanup-e2e`) removes the `e2e-` users, courses and
  their dependent rows, so the demo catalogue stays clean after a suite.

## Verification recorded 2026-11-17 (production)

- `pnpm lint`, `pnpm typecheck`, `pnpm test` (142 tests: 12 tokens, 13 shared, 42 database,
  58 web, 17 API) and `pnpm build` all exit 0 locally.
- `E2E_BASE_URL=https://pathshala-web-eight.vercel.app pnpm test:e2e`: **31/31 pass** on
  2026-11-17 after the auth split. The
  depth test opens a course page, counts at least six outcomes, checks the FAQ, instructor
  card, related courses and refund link, then reads a free preview lesson. The
  journeys register a learner, enrol in the free course, finish all three lessons, pass the
  quiz, earn a certificate and verify it in a signed-out context; buy one course through
  PayBridge with `EARLYBIRD`; buy another through a real Stripe Checkout with the 4242 card;
  publish a course in the studio; and unpublish/republish it as the admin with audit rows.
  Other tests cover catalogue search, the student/admin boundary, the live room, the audit
  CSV and axe passes on landing, catalogue, course detail, refund policy, sign-in and the
  student dashboard.
- axe: zero violations on landing, catalogue, sign-in and the student dashboard.
- Lighthouse mobile on the deployed origin: landing **100/100/100/100**, catalogue
  **99/100/100/100**, course page **97/100/100/100** (performance/accessibility/best-practices/
  SEO); LCP 0.9-1.0 s, CLS 0, TBT 50-110 ms. The measured scores are in
  `docs/screenshots/lighthouse-production.json`.
- API: `/health` 200, `/courses` 200 with Atlas rows, `limit=99` 400, unknown route 404.
- Response time after moving the web functions to `sin1` next to Atlas: warm TTFB 0.26–0.31 s
  on home, catalogue and course pages (was 1.10/1.07/2.70 s); cold start about 1.7 s. Measured
  with curl on 2026-11-17; the production suite runs in 2.2 minutes.
- PayBridge: `/login` 200 and a hosted checkout that fulfilled a real order.
- `pnpm audit --prod --audit-level high` reports no known vulnerabilities.

## Environment facts

- Node 24.22.1, pnpm 12.15.0, git 2.56.0, gh signed in as `ibrahimSumon47`.
- Vercel functions run in `sin1` (`apps/web/vercel.json`), matched to the Atlas region.
- Vercel CLI 65.4.0 on Hobby; Atlas CLI authenticated; Stripe CLI on the owner's sandbox;
  gcloud signed in.
- gitleaks 8.30.1 under gitignored `tools/gitleaks/`; Docker is not installed.

## Known risks

- Vercel Hobby has a daily deployment cap, and env-var changes need a redeploy. Batch changes.
- Playwright writes real rows to Atlas: a fresh learner and a temporary instructor course per
  run. The suites are idempotent by unique data, but the demo catalogue should be cleaned
  after a run (see `docs/DEPLOY.md`).
- The demo live class is seeded two hours ahead so an upcoming room exists during a full
  suite; reseed when it passes.
- The in-process rate limit is per function instance, not global.
- A full dev-dependency `pnpm audit` still flags the known moderate minimatch advisory through
  typescript-eslint; the production tree is clean.
- Next.js downloads the two fonts at build time, so CI needs network access.

## Next action

Deployment is finished. The only remaining work is optional and owner-gated: Google OAuth, a
transactional email sender, and any live-mode payment work. See `docs/OWNER_TODO.md` and
`docs/HANDOFF.md`.
