# Project state

Snapshot: 2026-11-19. The first ten phases are complete and the expansion slices are live:
course depth (P9), the learner account slice (P10, item 1), discovery (P11, item 2), the
P12-P15 polish slices, the P16 studio/operations slice, P17's classroom/commerce slice,
P18's waitlist/commerce follow-through, P19's teacher/data loop, the P20 polish round,
P21's confirmation, notification-state and audit-filter round, and P22's course-media round.
122/122 features carry production evidence, the three apps run on Atlas and Vercel, and
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
| P14 | Review replies, payout settlement, bulk moderation, announcements, search limit, palette close | done — 2026-11-17, 32/32 production journeys |
| P15 | Refund requests, quiz explanations, teacher promo codes, question desk, saved searches, price-drop notes | done — 2026-11-17, 33/33 production journeys |
| P16 | Student roster, lesson reordering, certificate desk, question bank, coupon timeline, automatic saved searches, completion surveys | done — 2026-11-17, 36/36 production journeys |
| P17 | Live waitlist and capacity, per-learner coupon limit, moderated survey comments, zero-result catalogue help with saved search | done — 2026-11-17, 38/38 production journeys |
| P18 | Seat-opening notifications, leaving a waitlist, live attendance CSV, per-learner cap impact | done — 2026-11-17, 38/38 production journeys |
| P19 | Studio seat release, stale waitlist cleanup, roster CSV, coupon cap note | done — 2026-11-17, 38/38 production journeys |
| P20 | Exact-session notifications, seat-release audit, filtered roster CSV, recent cap marker | done — 2026-11-17, 38/38 production journeys |
| P21 | Seat-release confirmation, seat-note read state, notification-linked session highlight, audit action filter | done — 2026-11-19, 38/38 production journeys |
| P22 | Uploaded course covers, preview gallery, preview video, per-lesson video/preview, media store | done — 2026-11-19, 39/39 production journeys |

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
  revokes instructor access and lists the audit trail, filtered by one exact action with the
  CSV following the same filter. The CSV export is quoted and formula-safe.
- Live classes: the studio schedules a session with a generated Jitsi room and an optional
  seat cap; `/live/[slug]` embeds the next room with a new-tab fallback, checks a learner in
  while a seat remains and otherwise adds one waitlist row with a stable position. Learners
  see their place on the dashboard, can leave it in one click, and get an in-app note when
  the teacher raises the cap enough to reach them. The studio schedule shows
  attendance/capacity/waiting, updates the cap in place and can release a seat behind a
  confirmation step; the next learner is notified, and the release writes an audit row. Seat
  and reminder notes link to the exact session, the selected room says a note opened it, and
  claiming the seat marks that note read. Queue rows for a started session are cleared on the
  next dashboard visit and hidden from reads in the meantime. Attendance is one row per learner and `.ics`
  downloads are offered. A min-heap drains due
  reminders into in-app notifications; `pnpm reminders:dispatch` is the cron entry point and
  email needs `RESEND_API_KEY`.
- Payments: `/checkout/[orderNumber]` shows an order summary, coupon form and both test rails.
  `markOrderPaid` and `markOrderRefunded` are idempotent through unique webhook events,
  payment references and order status guards. Stripe creates a BDT Checkout Session and its
  hosted page is filled in the production test; PayBridge is our own gateway with a merchant
  API key, hosted checkout, HMAC webhooks, retries, refunds and a ledger. Every paid sale
  splits 80/20: the order records the platform's 20% and the admin overview shows it beside
  gross sales, refunds and average order.
- Community and payouts: a teacher answers reviews and sends one inbox announcement from
  `/studio/community`; an operator settles each teacher/month from `/admin/payouts`, and the
  teacher’s statement shows the paid state. Bulk moderation hides or restores selected rows.
- Refunds: `/dashboard/orders` lets a learner ask once per paid order inside the 14-day,
  under-a-quarter window. `/admin/refunds` approves (the shared signed-refund path reverses the
  ledger and closes access) or declines, and the learner gets an inbox note either way.
- Teaching tools: `/studio/promotions` makes percent or fixed codes scoped to one owned course,
  with a uses-per-learner cap (0 = unlimited) enforced against paid orders, an At limit
  count of distinct buyers who reached that cap, one in-app note to the code's creator
  each time a learner uses up their allowance, and a Recent cap marker for the last 30 days;
  `/studio/questions` lists lesson questions unanswered first and writes answers into the same
  public thread. Quiz questions carry an explanation, and a finished attempt shows per-question
  chosen and correct answers.
- Learner discovery: `/dashboard/saved-searches` stores up to ten filter sets and writes one
  inbox note per search when new matching courses are published. The dashboard now checks a
  stale search automatically on load, at most once every 24 hours, so no cron is required.
  A real price cut on a saved course notifies everyone who wishlisted it.
- Course pictures: the studio course page has an Images and preview panel. A teacher or admin
  uploads one cover (PNG, JPEG or WebP up to 1.5 MB) and up to three preview pictures; each
  upload is sniffed from its bytes, stored in the `Media` collection and served by
  `GET /api/media/[id]` with an immutable one-year cache. Covers appear on catalogue cards,
  the landing shelf, the studio list and the course hero; previews and the https preview video
  sit under an Inside the course heading. Every lesson row also reopens its own video link and
  free-preview flag. `scripts/seed.ts` gives the six demo courses generated covers and gives
  the JavaScript course two preview pictures.
- Studio operations: `/studio/[id]/roster` lists the real class with progress, completion,
  certificate links and survey answers, and downloads the course's live attendance/waitlist
  and full roster as two formula-safe CSVs. The roster filters by status and enrolment date,
  and the roster download follows the same filters. Lessons can be moved up or down inside a section,
  and the quiz builder saves questions to a reusable bank or appends one to another quiz.
- Completion surveys: `/dashboard/surveys` asks three 1-5 questions and one optional comment
  for each finished course. Answers are editable, one per course, and only anonymous averages
  and up to ten comment excerpts reach the teacher roster. `/admin` adds a third bulk form
  that hides or restores survey comments, and hidden rows leave both the averages and excerpts.
- Certificate operations: `/admin/certificates` lists every issued certificate and can revoke
  or restore one. The public `/verify/[code]` page reads the same `revokedAt` field.
- Coupons: `/admin/coupons` keeps the per-code cost/revenue table and adds the paid-order
  redemption timeline with date, buyer, course and discount. Checkout, cart and coupon
  application all pass the buyer, so a one-use code cannot be reused on another course.
- Empty catalogue results: `/courses` lists up to six other subjects with published courses
  and counts, and a signed-in learner can store the current query and filters as a saved
  search in one click.
- Search is limited to 30 requests a minute per client address, and the palette has a close
  control with a Tab trap.
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

## Verification recorded 2026-11-19 (production)

- `pnpm lint`, `pnpm typecheck`, `pnpm test` (231 tests: 12 tokens, 13 shared, 117 database,
  72 web, 17 API) and `pnpm build` all exit 0 locally.
- `E2E_BASE_URL=https://pathshala-web-eight.vercel.app pnpm test:e2e`: **39/39 pass** on
  2026-11-19 after the P22 slice, including a new media test that counts the six seeded covers
  on the catalogue, checks their 16:9 box and image/jpeg response, then reads the course hero
  and the two preview pictures under Inside the course. The admin journey filters the audit trail by `audit.export`
  and checks the filtered CSV; the live journey opens the class by its session id and reads
  the notification badge. The teacher journey downloads both CSVs, applies the
  completed/active roster filters and clears them; the promotions journey checks the At limit
  column. Earlier
  journeys cover an empty catalogue search saving and removing its search, a survey comment
  reaching the roster before moderation, the roster, a lesson moved down and back up, saving a
  question to the bank, the completion survey, certificate revoke/restore and the coupon
  timeline. The
  depth test opens a course page, counts at least six outcomes, checks the FAQ, instructor
  card, related courses and refund link, then reads a free preview lesson. The
  journeys register a learner, enrol in the free course, finish all three lessons, pass the
  quiz, earn a certificate and verify it in a signed-out context; buy one course through
  PayBridge with `EARLYBIRD`; buy another through a real Stripe Checkout with the 4242 card;
  publish a course in the studio; and unpublish/republish it as the admin with audit rows.
  Other tests cover catalogue search, review replies, course announcements, payout marking,
  bulk moderation controls, the student/admin boundary, the live room, the audit CSV and axe passes on landing, catalogue, course detail, refund policy, sign-in and the
  student dashboard.
- axe: zero violations on landing, catalogue, course detail, refund policy, sign-in,
  registration, the learner pages (including saved searches and surveys), the operator pages
  (including the moderation desk, refunds, certificates and coupons) and the teacher studio
  pages, including the course roster and the quiz question bank.
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
- Course images are stored in MongoDB, so uploaded media counts against the Atlas M0 storage.
  The six seeded covers ship as static files instead and cost the database nothing; the 1.5 MB
  per-file cap keeps a demo upload in the low kilobytes.

## Next action

Deployment is finished. The only remaining work is optional and owner-gated: Google OAuth, a
transactional email sender, and any live-mode payment work. See `docs/OWNER_TODO.md` and
`docs/HANDOFF.md`.
