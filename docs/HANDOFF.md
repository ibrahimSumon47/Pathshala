# Handoff

Updated: 2026-11-16, after the P6 trust slice.

## Where we are

P6 is complete. Completed courses issue a verifiable certificate with a QR code, the
instructor studio reports revenue, students, completion and attendance, and the admin area
approves courses, manages instructor access and exports a formula-safe audit CSV.

P5 remains complete. The studio schedules a live session with a generated Jitsi room; the course
live page embeds the next room (with a new-tab fallback), checks attendance once per learner
and downloads a stable `.ics`. A binary min-heap drains due reminders into in-app dashboard
notifications; `pnpm reminders:dispatch` is the cron path and email stays off until a sender
key and domain exist.

P4 remains complete. A paid course opens `/checkout/[orderNumber]` with an order summary, coupon
and two test rails. PayBridge is a fully local sandbox gateway in `apps/paybridge` on
`:59801`: merchant API key, hosted checkout, signed webhook with three attempts and a manual
retry, refunds, ledger and a password-gated dashboard. Stripe checkout and signature
verification are implemented; the real redirect waits on the owner's sandbox keys and is
proven by recorded fixtures until then. Orders create enrolments only after a signed event.

P3 remains complete: a signed-in reader can enrol in a free course, open `/learn/[slug]`,
mark lessons complete, take a sourced quiz, keep private notes, ask lesson questions and
review an enrolled course; instructors build quizzes from the studio.

P2 remains complete: the studio creates, edits and publishes bilingual courses; the public
catalogue searches the Mongo text index and filters by subject, level, language and price.
A local `mongodb-memory-server` (`pnpm db:dev`) seeds three users, six categories, six
courses, a learning path with a quiz, an enrolment, a review, a saved course and the
`EARLYBIRD` coupon. `scripts/seed.ts` is safe to rerun against the running memory server.

P1 remains complete: Auth.js v5 signs in three demo roles with bcrypt-checked passwords,
carries roles in a JWT and protects `/dashboard`, `/admin`, `/studio` and `/learn`. The
NestJS API is live at `https://pathshala-api-lake.vercel.app`; `/courses` still returns the
honest 503 `database_unavailable` until Atlas exists because the deployed function has no
`MONGODB_URI`.

## Demo access (public by design)

| Role | Email | Password |
| --- | --- | --- |
| Student | `student@pathshala.dev` | `student-demo-2026` |
| Instructor | `instructor@pathshala.dev` | `instructor-demo-2026` |
| Admin | `admin@pathshala.dev` | `admin-demo-2026` |

Demo accounts are on by default in development and off in production unless
`DEMO_AUTH=true`. Set `DEMO_AUTH=false` to remove them anywhere. They are bcrypt-hashed in
`apps/web/src/lib/auth/accounts.ts`; no plain passwords are stored for auth.

## Exact next step

Start P7 in this order; no owner key is required:

1. Turn the existing realistic bilingual seed into the documented demo dataset and prove
   `pnpm db:seed` is idempotent.
2. Keep the Playwright suite running against `next start` and, once Atlas exists, point
   `E2E_BASE_URL` at the deployed origin without editing the tests.
3. Keep axe at zero violations on landing, catalogue, sign-in and dashboard; fix contrast
   and naming at the component, never with a disable comment.
4. Record Lighthouse mobile scores for landing and catalogue after every performance change.
5. Follow `docs/SECURITY.md`, add negative webhook and IDOR checks, then update
   `features.json`, `PROJECT_STATE` and this file before the P8 package.

## Local commands

```bash
pnpm install
pnpm db:dev                          # memory MongoDB on :27018, seeds and stays up
MONGODB_URI=mongodb://127.0.0.1:27018/pathshala pnpm --filter @pathshala/web exec next dev -p 59800
MONGODB_URI=mongodb://127.0.0.1:27018/pathshala pnpm --filter @pathshala/api dev
pnpm --filter @pathshala/paybridge dev   # gateway on :59801, reads apps/paybridge/.env.local
MONGODB_URI=mongodb://127.0.0.1:27018/pathshala pnpm db:seed   # rerun against the live memory server
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm run audit                       # production dependency audit used by CI
node scripts/check-done.mjs
```

Payment environment lives only in gitignored `apps/web/.env.local` and
`apps/paybridge/.env.local`: `APP_URL`, `PAYBRIDGE_BASE_URL`, `PAYBRIDGE_API_KEY`,
`PAYBRIDGE_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET` on the web side; the same PayBridge
key/webhook secret, `PAYBRIDGE_DASHBOARD_PASSWORD` and `PAYBRIDGE_DASHBOARD_SECRET` on the
gateway side. The local dashboard test password is in `apps/paybridge/.env.local`, never in
git. All local origins use `127.0.0.1`, not `localhost`, because session cookies are
host-scoped.

Environment for the web app: copy `apps/web/.env.example` to `apps/web/.env.local` and set
`AUTH_SECRET` (required in production). Google is optional; the button only appears when
both `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` exist. The API reads `apps/api/.env.example`.

## Files worth knowing

- `packages/db/src/certificates.ts` — eligibility, issuance, public lookup and codes.
- `packages/db/src/analytics.ts` — instructor revenue, completion and attendance aggregates.
- `packages/db/src/admin.ts` — approvals, access changes, reports and audit writes.
- `apps/web/src/lib/csv.ts` — quoted, formula-safe CSV cells.
- `apps/web/src/app/[locale]/verify/[code]/page.tsx` — public certificate and QR page.
- `packages/db/src/live.ts` — scheduling, access checks, attendance, reminders and notifications.
- `packages/shared/src/min-heap.ts` — the binary heap behind reminder dispatch.
- `apps/web/src/app/[locale]/live/[slug]/*` — the live room, check-in and calendar links.
- `apps/web/src/app/api/sessions/[id]/calendar/route.ts` — authenticated `.ics` download.
- `packages/db/src/commerce.ts` — orders, coupons, paid/refund state machine and ledger.
- `apps/paybridge` — merchant API, hosted checkout, signed deliveries, dashboard.
- `apps/web/src/lib/payments/*` — Stripe body/signature and PayBridge client/signature.
- `apps/web/src/app/api/payments/*/webhook/route.ts` — public signed webhook receivers.
- `apps/web/src/lib/learning.ts` — learning access, dashboard, quiz, notes, Q&A and review reads.
- `apps/web/src/app/[locale]/learn/[slug]/*` — the learning room and its server actions.
- `apps/web/src/app/[locale]/courses/[slug]/page.tsx` — enrol, wishlist and review surfaces.
- `apps/web/src/app/[locale]/studio/[id]/lesson/[lessonId]/page.tsx` — quiz builder.
- `packages/db/src/models/{quiz,review,note,question,wishlist}.ts` — P3 models and `scoreQuiz`.
- `packages/shared/src/progress.ts` — clamped whole-number progress with tests.
- `packages/db/src/catalog.ts` — catalogue query used by web and API.
- `apps/api/src/courses/*` — repository seam, service, Zod query schema and controller.
- `apps/web/src/auth.ts` — providers, JWT callbacks and role claims.
- `packages/db/src/connection.ts` — cached Mongo connection used by web auth and the API.

## Current gate

`node scripts/check-done.mjs` exits non-zero while features remain open. P1–P6 are complete
and the project is 39/47, with 8 features still to build (P7–P8). The gate must exit 0 before
the final handover, which also means every later phase's evidence exists.
