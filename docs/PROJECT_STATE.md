# Project state

Snapshot: 2026-11-16, Phase 5 complete. Learners can pay through a signed test-mode checkout and join scheduled live classes with attendance, reminders and calendar files. Update this file at the end of every slice.

## Phase status

| Phase | Scope | Status |
| --- | --- | --- |
| Intake | Owner questions, environment audit, documentation system | done — 2026-11-16 |
| P0 | Repo hygiene, hooks, CI, workspace, check-done | done — 2026-11-16 |
| P1 | Design system, i18n, models | done — 2026-11-16 |
| P1 | Auth with roles, API hardening | done — 2026-11-16 |
| P1 | API hosting spike | done — 2026-11-16, cold 1.411s, warm 0.674s |
| P2 | Categories, courses, sections, lessons, authoring, catalog | done — 2026-11-16 |
| P3 | Enrolment, progress, quizzes, Q&A, notes, reviews, wishlist | done — 2026-11-16 |
| P4 | Stripe test mode, PayBridge gateway, coupons, ledgers | done — 2026-11-16 (real Stripe redirect waits on owner keys) |
| P5 | Live classes, attendance, reminders, calendar files | done — 2026-11-16 (optional email waits on a sender key) |
| P6 | Certificates, analytics, admin area, audit log | not started |
| P7 | Seed data, production e2e, a11y, performance, security review | not started |
| P8 | Portfolio README, demo script, deploy guide | not started |

`docs/features.json` is authoritative; this table is the summary.

## What exists

- `packages/tokens`: warm paper palette, one deep-teal accent, light and dark roles, a
  4/8 point spacing grid, type scale, radii, shadows and motion durations.
- `packages/shared`: money in integer paisa with Bangla and English formatting.
- `packages/db`: Mongoose models plus the catalogue query module. `scripts/dev-db.ts`
  starts a throwaway MongoDB with `mongodb-memory-server` and seeds six bilingual courses;
  `MONGODB_URI` switches the same code to Atlas when the owner provides it.
- Catalogue: search, subject/level/language/price filters, bounded pagination and a public
  detail view. API `/courses` and `/courses/:slug` call the same query module.
- Authoring: instructor studio at `/studio` with course create/edit, sections, lessons,
  sanitized HTML, https video slots, validated attachment metadata and draft/publish, plus
  a quiz builder per quiz lesson with single, multiple and true/false questions.
- Learning: `/learn/[slug]` shows the curriculum, progress, sanitized lesson body, video,
  attachments, notes, Q&A and quiz attempts. Free enrolment is idempotent; paid courses wait
  for P4 checkout. Access comes from an enrolment, course ownership or the admin role.
- Learner surfaces: course detail has enrol, wishlist and review forms; the dashboard lists
  enrolled courses with progress, saved courses, receipts and orders. Models: Enrolment,
  QuizQuestion, QuizAttempt, Note, Question, Review, Wishlist, Order, Coupon, Payment,
  LedgerEntry, WebhookEvent.
- Live classes: the studio schedules a session with a generated Jitsi room; `/live/[slug]`
  embeds the next room with a new-tab fallback, records one attendance row per learner and
  offers `.ics` downloads. A min-heap drains due reminders into in-app notifications with
  an idempotent status guard; `pnpm reminders:dispatch` is the cron entry point and email
  is attempted only when `RESEND_API_KEY` and `REMINDER_EMAIL_FROM` exist.
- Payments: `/checkout/[orderNumber]` shows an order summary, coupon form and both test
  rails. `markOrderPaid` and `markOrderRefunded` are idempotent through unique webhook
  events, payment references and order status guards. Signed webhooks live at
  `/api/payments/stripe/webhook` and `/api/payments/paybridge/webhook`.
- `apps/paybridge`: a separate Next.js sandbox gateway with merchant API keys, hosted
  checkout, signed webhooks with retry, refunds, a ledger and a password-gated dashboard.
  It reads the same local memory MongoDB; its deployment waits on Atlas.
- `apps/web`: Next.js 16 with next-intl. Bangla lives at `/` and English at `/en`; pages
  are server-rendered because the header reads the session. Routes: landing, catalogue,
  sign-in, dashboard, admin and the Auth.js handler.
- Auth.js v5 with credentials plus optional Google, JWT sessions and roles in the token.
  Demo accounts are bcrypt-hashed in code; setting `MONGODB_URI` switches the same account
  functions to Mongo. `/dashboard` needs a session and `/admin` needs the admin role.
- `apps/api`: NestJS with health and `GET /courses`, a repository seam, Zod validation, a
  single error envelope and a per-instance rate limit. It ships as one self-contained
  esbuild CJS bundle and is live at `https://pathshala-api-lake.vercel.app`; the function
  runs in `iad1`.
- Theme: `apps/web/src/lib/theme.ts` owns a cookie name; the layout reads it and renders
  `data-theme` on `<html>`, and the toggle writes the cookie. There is no boot script, so a
  soft navigation cannot drop the theme.
- Primitives in `apps/web/src/components/ui`: Button, Field, Select, Card, Badge, Skeleton,
  EmptyState. Header adds account state, a language switch and a cookie-backed toggle.
- Fonts: Inter for Latin, Noto Sans Bengali for Bangla, self-hosted by `next/font`.
- Guards, CI and the feature gate from P0 are unchanged and still green.

## Verification recorded 2026-11-16

- `pnpm lint`, `pnpm typecheck`, `pnpm test` (116 tests: 12 tokens, 30 db, 13 shared,
  44 web, 17 API) and `pnpm build` all exit 0 locally, including the PayBridge build. The
  API and live integration tests boot `mongodb-memory-server`; no Atlas credentials are needed.
- Visual pass on 2026-11-16: landing (Bangla and English), courses, sign-in, dashboard and
  admin at 1440px in light and dark; earlier phone pass at 390px and a 320px overflow
  check. This pass found and fixed two real theme defects: a soft language switch dropped
  `data-theme` and reverted dark to light, and the `next/script` boot still warned because
  the locale layout is not the true root layout. The theme now comes from a server-read
  cookie and the warning is gone.
- Browser auth flow: student signs in, gets the student dashboard and a 404 on `/admin`;
  sign-out works; admin signs in and sees the account table; a wrong password returns to
  the form with an accessible error.
- API on `http://localhost:4000`: health 200, courses 503 `database_unavailable`, invalid
  query 400, missing route 404, the 61st request in a minute 429.
- Deployed API on 2026-11-16: `/health` 200; idle first request 1.411s total (`uptime: 0`,
  so a fresh process), warm second request 0.674s; `/courses` 503
  `database_unavailable`; `limit=99` 400 `validation_failed`; unknown route 404
  `not_found`. Three Hobby deployments were used: two failed on module resolution and the
  third, a self-contained bundle, is live.
- Phase 2 browser flow: instructor sign-in from the seeded Mongo user, studio list,
  course create, section and lesson add, publish, public detail 200 and catalogue search
  hit. Admin category form is wired and available.
- Phase 2 API on the seeded memory DB: `/courses?limit=2&price=free` 200, course detail 200,
  limit 99 400, unknown slug 404. Catalogue integration tests cover published-only,
  filters, search and detail.
- Phase 3 browser flow as `student@pathshala.dev` against the seeded memory DB: dashboard
  listed the enrolled course at 33% and a saved course; marking a lesson moved progress to
  67%; the quiz scored 3/3, showed the last score and completed the course at 100%; a Bangla
  note persisted after redirect; a lesson question appeared in the thread; updating a review
  changed the text and kept the rating count; wishlist toggled both ways. Quiz scoring has
  four unit tests and progress rounding has three.
- Phase 4 browser flow: EARLYBIRD took a ৳1,200 course to ৳960; PayBridge hosted checkout
  accepted the 4242 card, delivered a signed webhook and Pathshala showed receipt
  RCPT-20261116-52EE67 with an active enrolment. The ledger had ৳768 instructor and ৳192
  platform; a refund reversed both and set the enrolment to refunded. The failed delivery
  retry moved to delivered. A signed Stripe fixture event fulfilled another order and the
  replay returned `duplicate: true`.
- Phase 5 browser flow: the instructor scheduled "Debugging clinic" for 2026-11-20, 90
  minutes; the enrolled student opened the seeded room with the Jitsi iframe and a new-tab
  fallback, checked in, saw "You are marked present" and appeared in the studio attendance
  log. The dashboard delivered one in-app reminder and listed the upcoming class; the
  authenticated `.ics` download returned a valid VCALENDAR with DTSTART and SUMMARY.
  `pnpm reminders:dispatch` exited 0 against the seeded memory DB.
- Not verified yet: a real Stripe redirect and signature (test keys absent; fixture path is
  proven), a deployed Mongo-backed catalogue (no Atlas URI), Google sign-in, optional email
  delivery (no Resend key and no owned sender domain), cross-instance rate limiting, and
  axe / Lighthouse passes.

## Environment facts

- Node 24.22.1, pnpm 12.15.0, git 2.56.0, gh 2.103.3 signed in as `ibrahimSumon47`.
- Vercel CLI 65.4.0 on Hobby; Stripe CLI against another sandbox; gcloud signed in;
  `atlas` installed but its session expired.
- gitleaks 8.30.1 under gitignored `tools/gitleaks/`.
- Docker is not installed.

## Known risks

- Vercel Hobby daily deployment cap — this slice used three deployments, two of them
  failed attempts, so batch the next ones.
- Atlas, Google OAuth and a dedicated Stripe sandbox need the owner; see `OWNER_TODO.md`.
  Local development uses the memory server and resets on restart.
- The deployed function has never connected to Mongo, so its bundled Mongoose path is not
  proven at runtime. `/courses` stays 503 until `MONGODB_URI` is set and redeployed.
- The in-process rate limit is per function instance, not global; it is not a security
  boundary across scale-out.
- A full dev-dependency `pnpm audit` flags the known moderate minimatch 10.2.6 advisory
  (`GHSA-g3hv-75wg-m249`) through typescript-eslint. It is not in the production tree, and
  `pnpm audit --prod --audit-level high` (the CI gate) is clean. Revisit when
  typescript-eslint moves to minimatch 11.
- Demo accounts are off in production unless `DEMO_AUTH=true`; while enabled their
  credentials are public and admin is read-only. Seed real accounts when Atlas lands, then
  remove the demo flag before any destructive admin action ships.
- Google sign-in without Mongo creates a session with the student role and no stored user.
- Next.js downloads the two fonts at build time; CI needs network access to Google Fonts.
- Tailwind is not installed yet. Tokens are CSS variables, so the P2 mapping is additive.

## Next action

See `docs/HANDOFF.md`.
