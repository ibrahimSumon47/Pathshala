# Deployment guide

The three apps are live on Vercel against a free MongoDB Atlas M0 cluster. This guide records
the working path, including the two behaviours that cost deployments the first time: the API
must ship prebuilt from the repository root, and a linked project's `rootDirectory` is
resolved relative to the directory you deploy from.

| App | Vercel project | Production URL |
| --- | --- | --- |
| Web | `pathshala-web` | https://pathshala-web-eight.vercel.app |
| API | `pathshala-api` | https://pathshala-api-lake.vercel.app |
| Gateway | `pathshala-paybridge` | https://pathshala-paybridge.vercel.app |

`pathshala-web.vercel.app` is owned by another account, which is why the web app runs on the
`-eight` alias. Use this exact host in `APP_URL`, `WEB_ORIGIN` and the Stripe endpoint.

## 0. Prerequisites

- Node 24 and pnpm 12.
- A Vercel Hobby account linked to this repository (`vercel whoami`).
- The Atlas M0 cluster from `docs/OWNER_TODO.md`; the URI only ever lives in ignored
  `.env.local` files, Vercel and GitHub secrets.
- Optional: Stripe sandbox keys, Google OAuth client and a Resend key. The app runs without
  them and hides the corresponding UI.

## 1. Database

1. Atlas project `Pathshala`, M0 on AWS `AP_SOUTHEAST_1`, user `pathshala_app` with
   `readWriteAnyDatabase`, network access `0.0.0.0/0` (serverless has no fixed egress).
2. Seed once from the repository root. Passing the value through the environment keeps it out
   of shell history:

   ```bash
   export MONGODB_URI="$(node -e 'const fs=require("fs");const m=fs.readFileSync(".env.local","utf8").match(/^MONGODB_URI=(.*)$/m);process.stdout.write(m[1]??"")')"
   pnpm db:seed
   unset MONGODB_URI
   ```

   The seed is idempotent: it upserts six bilingual courses, three demo accounts, a quiz, a
   review, a note, a wishlist row, a live class two hours ahead, its reminders and one
   certificate.

## 2. API

Project `pathshala-api`, root directory `apps/api`, framework preset "Other". The function is
one self-contained esbuild bundle; deploy it prebuilt **from the repository root**, because
the CLI resolves the project's root directory against the current directory:

```bash
pnpm --filter @pathshala/api bundle
vercel pull --yes --environment production --cwd apps/api
vercel build --prod --cwd apps/api
vercel deploy --prebuilt --prod --project pathshala-api --yes
curl -s https://pathshala-api-lake.vercel.app/health
curl -s 'https://pathshala-api-lake.vercel.app/courses?limit=2'
```

Environment: `MONGODB_URI` and `WEB_ORIGIN` (web plus gateway origins, comma separated).
The second request must be a 200 with course rows; before Atlas it was an honest 503
`database_unavailable`.

## 3. Web

Project `pathshala-web`, root directory `apps/web`, Next.js preset, Node 24. Deploy from the
repository root:

```bash
vercel deploy --prod --project pathshala-web --yes
```

Production variables:

| Name | Value |
| --- | --- |
| `MONGODB_URI` | Atlas URI |
| `AUTH_SECRET` | 32 random bytes, base64 |
| `AUTH_TRUST_HOST` | `true` |
| `APP_URL` | `https://pathshala-web-eight.vercel.app` |
| `DEMO_AUTH` | `false` (registration is public instead) |
| `PAYBRIDGE_BASE_URL` | `https://pathshala-paybridge.vercel.app` |
| `PAYBRIDGE_API_KEY` | merchant key shared with the gateway |
| `PAYBRIDGE_WEBHOOK_SECRET` | HMAC secret shared with the gateway |
| `STRIPE_SECRET_KEY` | `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from the endpoint created in step 5 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` |

Optional: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `RESEND_API_KEY`,
`REMINDER_EMAIL_FROM`. Add `https://pathshala-web-eight.vercel.app/api/auth/callback/google`
to the OAuth client when Google sign-in is enabled.

## 4. PayBridge

Project `pathshala-paybridge`, root directory `apps/paybridge`, Next.js preset. Deploy from
the repository root with `vercel deploy --prod --project pathshala-paybridge --yes`.

| Name | Value |
| --- | --- |
| `MONGODB_URI` | Atlas URI |
| `PAYBRIDGE_API_KEY` | merchant key |
| `PAYBRIDGE_WEBHOOK_SECRET` | HMAC secret |
| `PAYBRIDGE_ALLOW_BOOTSTRAP` | `true` until the merchant row exists, then remove |
| `PAYBRIDGE_DASHBOARD_PASSWORD` | generated dashboard password |
| `PAYBRIDGE_DASHBOARD_SECRET` | 48 random bytes, base64url |
| `PAYBRIDGE_PUBLIC_URL` | `https://pathshala-paybridge.vercel.app` |

The first authenticated session call creates the merchant while bootstrap is on. Remove the
variable afterwards so a leaked key cannot mint a new merchant.

## 5. Stripe webhook

Create the endpoint once, either in the dashboard or through the API:

```bash
stripe webhook_endpoints create \
  --url https://pathshala-web-eight.vercel.app/api/payments/stripe/webhook \
  -d 'enabled_events[]=checkout.session.completed' \
  -d 'enabled_events[]=checkout.session.async_payment_succeeded'
```

The Stripe CLI reads the key from its own login, so the secret never reaches a shell
argument. The same endpoint can be created in the dashboard under Developers → Webhooks;
the signing secret is shown once and belongs in Vercel and the ignored env files only.

Store `secret` as `STRIPE_WEBHOOK_SECRET` in Vercel and in ignored env files, then redeploy
the web app. Checkout sessions must not send `payment_method_types`: current Stripe rejects
that parameter and expects payment methods to come from the dashboard.

## 6. Post-deploy verification

1. `GET /health` 200 and `GET /courses` 200 with real course rows.
2. Sign in with a seeded account; refresh and confirm the session persists.
3. Register a new learner from `/en/sign-in`, enrol in the free JavaScript course, finish all
   three lessons including the quiz, then open the certificate in a private window.
4. Buy a paid course with PayBridge (`4242 4242 4242 4242`); the return page shows a receipt
   only after the signed webhook.
5. Buy another paid course with Stripe test mode; the hosted page must accept the same card
   and return to a paid order.
6. Publish a course as the instructor, then unpublish and republish it as the admin and check
   the audit rows and the CSV export.
7. Run the suites against the deployed origin:

   ```bash
   E2E_BASE_URL=https://pathshala-web-eight.vercel.app pnpm test:e2e
   pnpm exec lighthouse https://pathshala-web-eight.vercel.app/en --output=json --output-path=report.json --quiet
   ```

   Playwright creates a fresh learner and a temporary instructor course on every run. Delete
   those rows afterwards if the demo catalogue should stay clean.

## 7. Rollback

- Vercel keeps every deployment: **Deployments → previous → Promote to Production**.
- Never delete Atlas data to roll back code. The schema is additive; the previous build keeps
  working with the same collections.
- If webhooks fail, inspect the PayBridge delivery row and retry from its dashboard; the
  receiver is idempotent by `(provider, eventId)`.

## Free-tier notes

- Atlas M0, Vercel Hobby and Jitsi's public service are free at the time of this build
  (2026-11-17). Re-check the pricing pages before relying on them.
- Vercel Hobby has a daily deployment cap; batch a slice into one production deploy. Env-var
  changes need a redeploy before they take effect.
- Jitsi's public rooms have no waiting room. Never print a room name on a public page.
- The in-process rate limiter is per function instance; a shared store is the next hardening
  step if traffic justifies it.
