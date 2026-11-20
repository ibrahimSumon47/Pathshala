# Handoff

Updated: 2026-11-19, after the P23 quality audit.

## Where we are

The ten original phases are complete and the expansion slices have begun. Course depth (item 9)
the learner account slice (item 1: settings, notifications, wishlist, cart, invoices, bookmarks,
streaks and badges), discovery (item 2: both-script search, price buckets, sorting, best-rated
shelf, learner recommendations), the P12-P15 polish slices, P16's studio and operations work
P17's classroom and commerce work, P18's waitlist/commerce follow-through, P19's teacher data
loop, P20's polish round, P21's confirmation/state/filter round, P22's course-media round and
P23's quality audit are live and verified; `docs/features.json` tracks 123 features and
`node scripts/check-done.mjs` exits 0.

| App | URL |
| --- | --- |
| Web | https://pathshala-web-eight.vercel.app |
| API | https://pathshala-api-lake.vercel.app |
| PayBridge | https://pathshala-paybridge.vercel.app |

The web project cannot use `pathshala-web.vercel.app` because that name belongs to another
account; every variable and the Stripe endpoint use the `-eight` host instead.

## What was verified on production (2026-11-19)

- Warm TTFB is 0.26–0.31 s after the web functions moved to `sin1` beside Atlas; the 44/44
  Playwright journeys finish in about 4.5 minutes, and the five loading placeholders mirror
  the catalogue, course, dashboard, lesson and cart grids.
- The media test counts the six seeded covers on `/en/courses`, asserts a 16:9 box and a
  200 `image/jpeg` response, and opens the JavaScript course to read its hero, the Inside the
  course heading and both preview pictures. `scripts/seed.ts` is what gives every demo course
  a cover; rerun it after a fresh database.
- Uploading is now a production journey: `e2e/studio-media.spec.ts` creates a course as the
  seeded instructor, uploads a real PNG cover and a preview PNG through the studio forms,
  reads both `/api/media/<id>` URLs (the cover `image/webp`, the preview `image/png`, both with
  the immutable cache header), finds the cover in the
  published hero and the picture under Inside the course, removes the picture and asserts the
  page and a fresh media request both drop it, then clears the cover. The run adds about
  thirteen seconds.
- The media route is cached for a year at the edge, so a removed image URL can still answer
  from that cache even though its row is gone; the journey asks a cache-busted URL to check the
  deletion, and the page-level assertions are the real behaviour check. This trade-off is
  recorded in `docs/DECISIONS.md`, and `pnpm db:cleanup-e2e` now deletes the media rows that
  `e2e-` courses referenced.
- `e2e/studio-media.spec.ts` also covers the two video features: an https mp4 course preview
  video plays inline on the published page (and becomes a Watch the preview video button when
  the link is not a media file), and a lesson's video link plus Free to preview flag set from
  its curriculum row reach the public preview page and the learning room. Clearing the flag
  removes the public Preview link. This test runs on its own 90-second budget because it makes
  five studio saves and four page visits.
- The refusal path is a journey too: `e2e/studio-media.spec.ts` stores a working cover, then
  uploads a renamed HTML file and a PNG padded past 1.5 MB through the same form. It reads
  "Upload a PNG, JPEG or WebP image." and "Each image must be under 1.5 MB." from the page
  alert and proves the refusal changed nothing — the same cover URL on the page, one media
  figure only, and the stored image still answering 200 `image/webp` after a fresh load (the
  cover field re-encodes the pick in the browser before submitting).
- A seeded cover cannot lose its twins silently: `apps/web/src/lib/course-cover.test.ts` walks
  `apps/web/public/images/courses`, requires a real 1024 px and full WebP twin for every cover
  JPEG (the two lesson-body screenshots are the only exemptions), checks each twin is smaller
  than its JPEG, and resolves the course page's `<source>` mapping for every cover. Removing one
  twin fails the run on the named file. The guard no longer pins how many covers exist, so a new
  seeded course with its twins keeps the suite green.
- Verified on production on 2026-11-20: after deploying the cover field, the studio e2e ran
  against `https://pathshala-web-eight.vercel.app`, uploaded a cover through the real form and
  read it back from `/api/media/<id>` as 200 `image/webp`, while the undecodable oversized file
  still produced "Each image must be under 1.5 MB."
- The same file refuses a bad preview video: after saving an https mp4 link, it submits an
  http link and a relative path, reads "Preview video links need https." from the alert each
  time, and finds the stored field plus a freshly loaded studio page still holding the https
  link. The second submission starts from the clean studio URL, so its `?error=` redirect is
  evidence the form ran instead of the assertion repeating the first render.
- The lesson refusal follows the same shape one level down: it creates a section and a lesson,
  saves an https video from that row's Video and preview disclosure, then submits an http link
  and a relative path, reads "Video links need https." both times, and proves the row input and
  a freshly loaded studio page still hold the saved link. The row scoping matters — the
  add-lesson form above carries its own `videoUrl` field.
- A just-saved studio page can answer the first request with the previous render, so the
  journey reloads (bounded, eight attempts) until the stored value appears rather than
  trusting the first paint. The form itself keeps typed values, which is why the assertions
  read a fresh page instead of the DOM right after submitting.
- 44/44 Playwright journeys against the deployed web origin, including the admin audit filter
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
- API `/health`, `/courses` and `/openapi.json` are 200 from Atlas; `/courses?limit=99` is 400;
  unknown routes are 404; a known route with another method is 405 with `Allow`.
- The audit crawl is 4/4 on production at three widths in both themes, axe 3/3, pa11y 20/20,
  linkinator 61 links clean, Lighthouse desktop 12 URLs passing its thresholds and a mobile
  budget of 0.80 on the median of three runs for the catalogue and course pages in both locales
  (medians 0.86–0.98 across two sessions, after the course cover moved to WebP twins: 66.4 KB
  JPEG → 19.2 KB on a phone).

## What is deliberately not done

- Google sign-in: the provider code path exists, but the OAuth client is an owner console
  step. Email/password and registration cover every role.
- Reminder email: in-app notifications and `.ics` files ship; email needs a verified sender
  key and domain.
- Live-mode payments: both rails are sandboxes. Stripe test mode is fully exercised, and a
  live account would need a fresh review of BDT support and a live webhook.
- Shared rate limiting: the limiter is per function instance.

## What the audit left behind

`pnpm audit:all` repeats the whole sweep locally with a pass/FAIL summary, and
`.github/workflows/audit.yml` runs the cheap checks weekly and on demand without writing
anything. `docs/reports/audit.md` is the record: three blockers and ten majors found and fixed
with regression tests, two open minors (mobile Lighthouse variance on cold instances, dev-only
advisories) and four documented limits.

Two deployment facts worth remembering: the API must be deployed with a fresh
`apps/api/.vercel/output` copied to the repository root's `.vercel/output` (or the root deploy
ships a stale bundle), and `.vercelignore` keeps the local audit tooling out of the upload —
without it the web deploy exceeds Vercel's 100 MB file limit.

## Next step in the expansion

Item 13 of the agreed expansion order is still next; its wording is not in the repository yet,
so `docs/EXPANSION_PLAN.md` carries the order, the finished items and an explicit placeholder
for every remaining item. Replace the placeholder with the brief's sentence before writing code.

## Exact next step

Nothing is blocked. If the demo data needs refreshing after a test run:

```bash
export MONGODB_URI="$(node -e 'const fs=require("fs");const m=fs.readFileSync(".env.local","utf8").match(/^MONGODB_URI=(.*)$/m);process.stdout.write(m[1]??"")')"
pnpm db:seed
unset MONGODB_URI
```

Playwright leaves one learner account and two `e2e-` courses (plus the media rows they
uploaded) behind per run; `pnpm db:cleanup-e2e` removes all of it if the catalogue should look
like the seed screenshot. Then rerun
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

`node scripts/check-done.mjs` reports **123/123 — every feature is done with evidence**.
