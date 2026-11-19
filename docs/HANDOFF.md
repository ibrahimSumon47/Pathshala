# Handoff

Updated: 2026-11-19, after the P22 course-media round.

## Where we are

The ten original phases are complete and the expansion slices have begun. Course depth (item 9)
the learner account slice (item 1: settings, notifications, wishlist, cart, invoices, bookmarks,
streaks and badges), discovery (item 2: both-script search, price buckets, sorting, best-rated
shelf, learner recommendations), the P12-P15 polish slices, P16's studio and operations work
P17's classroom and commerce work, P18's waitlist/commerce follow-through, P19's teacher data
loop, P20's polish round, P21's confirmation/state/filter round and P22's course-media round
are live and verified; `docs/features.json` tracks 122 features and
`node scripts/check-done.mjs` exits 0.

| App | URL |
| --- | --- |
| Web | https://pathshala-web-eight.vercel.app |
| API | https://pathshala-api-lake.vercel.app |
| PayBridge | https://pathshala-paybridge.vercel.app |

The web project cannot use `pathshala-web.vercel.app` because that name belongs to another
account; every variable and the Stripe endpoint use the `-eight` host instead.

## What was verified on production (2026-11-19)

- Warm TTFB is 0.26–0.31 s after the web functions moved to `sin1` beside Atlas; the 39/39
  Playwright journeys finish in about 4.2 minutes, and the five loading placeholders mirror
  the catalogue, course, dashboard, lesson and cart grids.
- The media test counts the six seeded covers on `/en/courses`, asserts a 16:9 box and a
  200 `image/jpeg` response, and opens the JavaScript course to read its hero, the Inside the
  course heading and both preview pictures. `scripts/seed.ts` is what gives every demo course
  a cover; rerun it after a fresh database.
- Uploading through the studio was exercised locally against the memory database (cover
  upload, `/api/media/<id>` 200 `image/jpeg` with immutable caching, cover replaced on the
  course page). Production has no demo sign-in, so that action is covered by
  `packages/db/src/p22.integration.test.ts` plus this manual pass rather than a production
  journey.
- 39/39 Playwright journeys against the deployed web origin, including the admin audit filter
  with its filtered CSV and the notification-linked live session badge, the private profile edit,
  the public teacher page, statements and notes CSV downloads, review replies, course announcements, payout marking, bulk moderation, the command palette, order search, separate sign-in and
  registration pages with centred forms, a fresh registration,
  a two-course cart paid once through PayBridge with an invoice PDF download, a settings
  round-trip (rename, password change, delete account), a completed free course with a
  certificate verified while signed out, a real Stripe Checkout purchase with the 4242 card,
  instructor publishing and admin publish/unpublish with audit rows, a Bangla catalogue search,
  URL-backed filters and both recommendation rails, plus a new promo code, a saved-search
  round-trip, the operator refund desk, a roster read, a lesson moved down and back up, a
  question saved to the bank, the completion survey, certificate revoke/restore, the coupon
  redemption timeline, saving and removing a search from an empty catalogue result, a survey
  comment read on the roster then hidden and restored by the admin, the live attendance and
  roster CSV downloads, the completed/active roster filters, a seat-cap update from the studio
  and the At limit promo column.
- axe: zero violations on landing, catalogue, course page, sign-in, dashboard, settings,
  notes, wishlist, cart, notifications, saved searches, surveys, the admin overview and
  orders/coupons/payouts/refunds/certificates, and the studio earnings, community, questions,
  promotions, roster and quiz-bank pages.
- Lighthouse mobile: 100/100/100/100 on landing, 99/100/100/100 on the catalogue, FCP/LCP
  0.9 s, CLS 0, TBT under 120 ms. JSON reports sit in `docs/screenshots`.
- API `/health` and `/courses` are 200 from Atlas; `/courses?limit=99` is 400; unknown routes
  are 404.

## What is deliberately not done

- Google sign-in: the provider code path exists, but the OAuth client is an owner console
  step. Email/password and registration cover every role.
- Reminder email: in-app notifications and `.ics` files ship; email needs a verified sender
  key and domain.
- Live-mode payments: both rails are sandboxes. Stripe test mode is fully exercised, and a
  live account would need a fresh review of BDT support and a live webhook.
- Shared rate limiting: the limiter is per function instance.

## Next step in the expansion

P22 is live: a teacher or admin uploads a course cover, up to three preview pictures and an
https preview video from the studio, and can set a lesson's video link and free-preview flag
in place. Item 13 of
the agreed expansion order is still next; its wording is not in the repository yet, so
`docs/EXPANSION_PLAN.md` carries the order, the finished items and an explicit placeholder for
every remaining item. Replace the placeholder with the brief's sentence before writing code.

## Exact next step

Nothing is blocked. If the demo data needs refreshing after a test run:

```bash
export MONGODB_URI="$(node -e 'const fs=require("fs");const m=fs.readFileSync(".env.local","utf8").match(/^MONGODB_URI=(.*)$/m);process.stdout.write(m[1]??"")')"
pnpm db:seed
unset MONGODB_URI
```

Playwright leaves one learner account and one `e2e-studio-*` course behind per run; delete
those rows if the catalogue should look like the seed screenshot. Then rerun
`E2E_BASE_URL=https://pathshala-web-eight.vercel.app pnpm test:e2e` to confirm nothing drifted.

## Local commands

```bash
pnpm install
pnpm db:dev                          # memory MongoDB on :27018, seeds and stays up
MONGODB_URI=mongodb://127.0.0.1:27018/pathshala pnpm --filter @pathshala/web exec next dev -p 59800
MONGODB_URI=mongodb://127.0.0.1:27018/pathshala pnpm --filter @pathshala/api dev
pnpm --filter @pathshala/paybridge dev   # gateway on :59801
MONGODB_URI=mongodb://127.0.0.1:27018/pathshala pnpm db:seed
pnpm lint && pnpm typecheck && pnpm test && pnpm build
node scripts/check-done.mjs
```

Payment environment lives only in gitignored `.env.local` files. All local origins use
`127.0.0.1`, not `localhost`, because session cookies are host-scoped.

## Files worth knowing

- `apps/web/src/lib/auth/registration.ts` — public learner registration.
- `apps/web/src/lib/payments/stripe.ts` — the Checkout Session body and event parsing.
- `apps/web/src/app/api/payments/*/webhook/route.ts` — signed webhook receivers.
- `packages/db/src/commerce.ts` — orders, coupons, paid/refund state machine and ledger.
- `packages/db/src/refunds.ts` — refund window, request queue and the approval path.
- `packages/db/src/promotions.ts` — course-scoped teacher codes.
- `packages/db/src/roster.ts` — the per-course class list and survey averages.
- `packages/db/src/curriculum.ts` — two-pass lesson reordering.
- `packages/db/src/question-bank.ts` — save and reuse quiz questions.
- `packages/db/src/surveys.ts` — completion survey rules and averages.
- `packages/db/src/saved-searches.ts` — stored filters, the new-course check and the daily due check.
- `apps/paybridge` — merchant API, hosted checkout, signed deliveries, dashboard.
- `packages/db/src/certificates.ts` — eligibility, issuance, public lookup and codes.
- `packages/db/src/live.ts` — scheduling, access checks, attendance, reminders.
- `apps/web/src/app/[locale]/studio/*` — authoring and publishing.
- `apps/web/src/app/[locale]/admin/*` — approvals, access changes, reports, CSV export.
- `e2e/journey.spec.ts` — the production journey that proves the whole product.

## Current gate

`node scripts/check-done.mjs` reports **113/113 — every feature is done with evidence**.
