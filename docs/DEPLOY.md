# Deployment guide

The API is already live. Web and PayBridge wait for the owner's Atlas URI; this guide is the
exact path once it exists. Deploy only after `pnpm lint && pnpm typecheck && pnpm test &&
pnpm build` are green.

## 0. Prerequisites

- Node 24 and pnpm 12.
- A Vercel Hobby account linked to this repository (`vercel whoami`).
- A free MongoDB Atlas M0 cluster (steps 1–7 in `docs/OWNER_TODO.md`). Put the URI only in
  `private/.env.local`; never in chat, a commit or a shell history you share.
- Optional: Stripe sandbox keys, Google OAuth client and a Resend key. The app runs without
  them and hides the corresponding UI.

## 1. Database

1. Create the M0 cluster and database user as described in `docs/OWNER_TODO.md`.
2. Allow Vercel's serverless egress with `0.0.0.0/0`. This is a portfolio trade-off; the
   database password is the boundary.
3. From this repository, seed Atlas once:

   ```bash
   MONGODB_URI="$(grep '^MONGODB_URI=' private/.env.local | cut -d= -f2-)" pnpm db:seed
   ```

   The seed is idempotent. Run it again only when the demo data must be refreshed.

## 2. API (already live)

Project: `pathshala-api` at `https://pathshala-api-lake.vercel.app`.

```bash
gh secret set MONGODB_URI                       # paste the Atlas URI when prompted
vercel env add MONGODB_URI production           # paste the Atlas URI when prompted
vercel --prod --cwd apps/api
curl -s https://pathshala-api-lake.vercel.app/health
curl -s 'https://pathshala-api-lake.vercel.app/courses?limit=2'
```

The second request becomes a 200 after Atlas exists; before that it honestly returns 503
`database_unavailable`. Set `WEB_ORIGIN` to the final web origin plus the preview origin.

## 3. Web

```bash
cd apps/web
vercel link --project pathshala-web
vercel env add MONGODB_URI production
vercel env add AUTH_SECRET production          # openssl rand -base64 32
vercel env add AUTH_TRUST_HOST production      # true
vercel env add APP_URL production              # https://<web-domain>
vercel env add PAYBRIDGE_BASE_URL production   # https://<paybridge-domain>
vercel env add PAYBRIDGE_API_KEY production
vercel env add PAYBRIDGE_WEBHOOK_SECRET production
```

Optional variables: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `REMINDER_EMAIL_FROM`. Keep `DEMO_AUTH` unset in
production; the seeded accounts are already in Atlas.

Build with the repository's default `pnpm build` and root directory `apps/web`. Then:

```bash
vercel --prod
curl -sI https://<web-domain>/en | head -1
```

Add `https://<web-domain>/api/auth/callback/google` to the Google OAuth client if Google
sign-in is enabled.

## 4. PayBridge

The gateway is a separate Next.js project with its own merchant boundary:

```bash
cd apps/paybridge
vercel link --project pathshala-paybridge
vercel env add MONGODB_URI production
vercel env add PAYBRIDGE_API_KEY production
vercel env add PAYBRIDGE_WEBHOOK_SECRET production
vercel env add PAYBRIDGE_ALLOW_BOOTSTRAP production   # true only for the first call
vercel env add PAYBRIDGE_DASHBOARD_PASSWORD production
vercel env add PAYBRIDGE_DASHBOARD_SECRET production
vercel env add PAYBRIDGE_PUBLIC_URL production        # https://<paybridge-domain>
vercel --prod
```

Use a distinct merchant API key from local development. The first authenticated call creates
the merchant when `PAYBRIDGE_ALLOW_BOOTSTRAP=true`; switch that variable off afterwards.
Point the web app's `PAYBRIDGE_*` variables at this project.

## 5. Post-deploy verification

1. `GET /health` on the API is 200 and `GET /courses` is 200 with real course rows.
2. Sign in with a seeded account; refresh the page and confirm the session persists.
3. Complete a free lesson; progress changes and survives a reload.
4. Run one PayBridge test order with `4242 4242 4242 4242`; the return page shows a receipt
   and the order is paid only after the delivery is marked delivered.
5. Open `/en/live/<course-slug>`, check the Jitsi embed or fallback link, check in once.
6. Complete a course and open its certificate in a private window (no login).
7. Point the browser suite at production and run it:

   ```bash
   E2E_BASE_URL=https://<web-domain> pnpm test:e2e
   ```

   The suite signs in with the demo accounts, so set `DEMO_AUTH=true` on a staging deployment
   or substitute seeded test accounts before running it against production.

8. Download the admin audit CSV; confirm `text/csv`, a BOM and the new rows.

## 6. Rollback

- Vercel keeps every deployment: **Deployments → previous → Promote to Production**.
- Never delete Atlas data to roll back code. The schema is additive; the previous build keeps
  working with the same collections.
- If webhooks fail, inspect the PayBridge delivery row and retry from its dashboard; the
  receiver is idempotent by `(provider, eventId)`.

## Free-tier notes

- Atlas M0, Vercel Hobby and Jitsi's public service are free at the time of this build
  (2026-11-16). Re-check the pricing pages before relying on them.
- Vercel Hobby has a daily deployment cap; batch a slice into one production deploy.
- Jitsi's public rooms have no waiting room. Never print a room name on a public page.
- The in-process rate limiter is per function instance; a shared store is the next hardening
  step if traffic justifies it.
