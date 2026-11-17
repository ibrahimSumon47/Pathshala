# Owner todo

Only the owner can do these: they need a browser session, an OAuth console or a captcha.
Each item says exactly where the resulting value goes. Never paste a secret into chat; put
it in `private/.env.local` (gitignored). Check items off as they are done.

## 1. MongoDB Atlas — done 2026-11-17

Created with the Atlas CLI: project `Pathshala` (`6afb4e8ab5ac3f005bc29444`), free M0
cluster `Pathshala` on AWS `AP_SOUTHEAST_1`, database user `pathshala_app` with
`readWriteAnyDatabase`, network access `0.0.0.0/0` for Vercel. `pnpm db:seed` populated six
bilingual courses, three demo accounts, a quiz, a live session and one certificate. The URI
lives only in gitignored `.env.local` and in Vercel/GitHub secrets.

Owner action: none. If the cluster is ever recreated, update `MONGODB_URI` in all three
Vercel projects and the GitHub secret, then redeploy.

## 2. Stripe — sandbox keys are in place (done 2026-11-17)

`STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` come from the owner's sandbox
and are set in Vercel. The webhook endpoint
`https://pathshala-web-eight.vercel.app/api/payments/stripe/webhook` was created through the
Stripe API for `checkout.session.completed` and
`checkout.session.async_payment_succeeded`; its signing secret is in Vercel and gitignored
env files. A real test checkout with `4242 4242 4242 4242` was verified on production.

Owner action: none for test mode. Real money would need a live-mode account, a review of
Stripe's BDT support and a live webhook — deliberately out of scope.


## 3. Google Cloud — OAuth client for sign-in (optional; credentials sign-in works)

1. https://console.cloud.google.com → project selector → **New project** → `pathshala-auth`
   → **Create**.
2. **APIs & Services → OAuth consent screen** → **External** → app name `Pathshala`,
   support email and developer email = your address → save.
3. **Scopes** → add `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`.
4. **Test users** → add your own Google address (keeps the app in testing without
   verification).
5. **Credentials → Create credentials → OAuth client ID → Web application**, name
   `Pathshala web`. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `http://localhost:59800/api/auth/callback/google` (the preview server used this session)
   - `https://pathshala-web-eight.vercel.app/api/auth/callback/google` (production)
6. Copy the client ID and client secret into `private/.env.local` as `AUTH_GOOGLE_ID` and
   `AUTH_GOOGLE_SECRET`, then add both to Vercel project `pathshala-web`. The Google button
   appears only when both are set. Email/password accounts and registration work without it.

## 4. Email sender (optional; in-app reminders already ship)

No sender is configured. To turn on the optional email leg, sign up for a free transactional
sender (Resend is the current candidate) with no card, create an API key named `pathshala`,
verify one sender domain, and put both values in `private/.env.local` as `RESEND_API_KEY`
and `REMINDER_EMAIL_FROM`. The free tier has to be rechecked before relying on it; without
it, in-app reminders and `.ics` files work fully.

## 5. Vercel — web, API and PayBridge deployed (done 2026-11-17)

| App | Project | Production URL |
| --- | --- | --- |
| Web | `pathshala-web` | https://pathshala-web-eight.vercel.app |
| API | `pathshala-api` | https://pathshala-api-lake.vercel.app |
| Gateway | `pathshala-paybridge` | https://pathshala-paybridge.vercel.app |

`pathshala-web.vercel.app` was already taken, so the web project keeps the
`pathshala-web-eight` alias; every environment variable and the Stripe endpoint use that
host. The API is deployed prebuilt from the repository root (see `docs/DEPLOY.md`) because
its project root directory is `apps/api`. Production checks: `/health` 200, `/courses` 200
from Atlas, and 13/13 Playwright journeys.

Owner action: none.

## 6. Secrets distribution (I do this, not you)

GitHub secrets are `MONGODB_URI`, `AUTH_SECRET`, `STRIPE_SECRET_KEY` and
`STRIPE_WEBHOOK_SECRET`. Vercel holds the same values plus the PayBridge merchant key,
webhook secret, dashboard password and dashboard secret. All were written by path from
ignored files with `gh secret set` and `vercel env add`, so no value appears in chat or logs.

Owner action: rotate the Stripe keys or the PayBridge merchant key in both places if one is
ever exposed.

## Email digests (optional, needs an account)

In-app notifications and teacher sale alerts are live. Outward email is not wired because it needs a provider account and API key chosen by the owner. When one is picked, check its current pricing against the free-forever rule before adding it, then set the key through Vercel and document the sender address. No account has been created.
