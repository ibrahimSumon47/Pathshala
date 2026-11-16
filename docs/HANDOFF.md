# Handoff

Updated: 2026-11-16, after the P3 learning slice.

## Where we are

P3 is complete. A signed-in reader can enrol in a free course, open the learning room at
`/learn/[slug]`, mark lessons complete, take a sourced quiz, keep private notes, ask lesson
questions and review an enrolled course. Instructors add quiz questions from
`/studio/[id]/lesson/[lessonId]`. The dashboard lists enrolled courses with progress and the
wishlist. Paid courses deliberately wait for P4 checkout.

P2 remains complete: the studio creates, edits and publishes bilingual courses; the public
catalogue searches the Mongo text index and filters by subject, level, language and price.
A local `mongodb-memory-server` (`pnpm db:dev`) seeds three users, six categories, six
courses, a three-lesson learning path with a quiz, an enrolment, a review and a saved course.
`scripts/seed.ts` is safe to rerun against the running memory server.

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

Start P4 in this order; no owner key is required to begin:

1. Check for Stripe test keys in `private/.env.local` and `apps/web/.env.local`. If absent,
   write the click-by-click Stripe sandbox steps once in `docs/OWNER_TODO.md` and continue
   with recorded fixtures and signature verification. Do not invent keys.
2. Add the order, payment, coupon and ledger models in `packages/db`, with integer paisa and
   a single state machine shared by Stripe and PayBridge.
3. Build `apps/paybridge` as its own free Vercel project: hosted test-mode checkout, merchant
   API keys, HMAC-signed webhooks with retry, idempotency keys, refunds, ledger and merchant
   dashboard. Build it fully before waiting on Stripe.
4. Wire paid enrolment in the web app through the order service, then the Stripe checkout
   route and signature-verified webhook. Every payment screen says test mode.
5. Test with recorded fixtures, then the browser, then update `features.json`, this file,
   `PROJECT_STATE` and `DECISIONS`; run the full gate and push one slice.

## Local commands

```bash
pnpm install
pnpm db:dev                          # memory MongoDB on :27018, seeds and stays up
MONGODB_URI=mongodb://127.0.0.1:27018/pathshala pnpm --filter @pathshala/web exec next dev -p 59800
MONGODB_URI=mongodb://127.0.0.1:27018/pathshala pnpm --filter @pathshala/api dev
MONGODB_URI=mongodb://127.0.0.1:27018/pathshala pnpm db:seed   # rerun against the live memory server
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm run audit                       # production dependency audit used by CI
node scripts/check-done.mjs
```

Environment for the web app: copy `apps/web/.env.example` to `apps/web/.env.local` and set
`AUTH_SECRET` (required in production). Google is optional; the button only appears when
both `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` exist. The API reads `apps/api/.env.example`.

## Files worth knowing

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

`node scripts/check-done.mjs` exits non-zero while features remain open. P1, P2 and P3 are
complete and the project is 25/47, with 22 features still to build. The gate must exit 0
before the final handover, which also means every later phase's evidence exists.
