# Handoff

Updated: 2026-11-17, after the production deployment.

## Where we are

All ten phases are complete and the product is live with real data. `docs/features.json`
tracks 48 features and `node scripts/check-done.mjs` exits 0.

| App | URL |
| --- | --- |
| Web | https://pathshala-web-eight.vercel.app |
| API | https://pathshala-api-lake.vercel.app |
| PayBridge | https://pathshala-paybridge.vercel.app |

The web project cannot use `pathshala-web.vercel.app` because that name belongs to another
account; every variable and the Stripe endpoint use the `-eight` host instead.

## What was verified on production (2026-11-17)

- 13/13 Playwright journeys against the deployed web origin, including a fresh registration,
  a completed free course with a certificate verified while signed out, a PayBridge purchase
  with `EARLYBIRD`, a real Stripe Checkout purchase with the 4242 card, instructor publishing
  and admin publish/unpublish with audit rows.
- axe: zero violations on landing, catalogue, sign-in and dashboard.
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
- `apps/paybridge` — merchant API, hosted checkout, signed deliveries, dashboard.
- `packages/db/src/certificates.ts` — eligibility, issuance, public lookup and codes.
- `packages/db/src/live.ts` — scheduling, access checks, attendance, reminders.
- `apps/web/src/app/[locale]/studio/*` — authoring and publishing.
- `apps/web/src/app/[locale]/admin/*` — approvals, access changes, reports, CSV export.
- `e2e/journey.spec.ts` — the production journey that proves the whole product.

## Current gate

`node scripts/check-done.mjs` reports **48/48 — every feature is done with evidence**.
