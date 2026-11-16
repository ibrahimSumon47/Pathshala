# Owner todo

Only the owner can do these: they need a browser session, an OAuth console or a captcha.
Each item says exactly where the resulting value goes. Never paste a secret into chat; put
it in `private/.env.local` (gitignored). Check items off as they are done.

## 1. MongoDB Atlas — re-authenticate and create the free cluster (needed for real data)

1. In a terminal on this PC run `atlas auth login` and finish the browser step. The CLI
   session expired on 2026-11-16.
2. Go to https://cloud.mongodb.com → **Create** (new project) → name it `Pathshala`.
3. **Build a Database** → **M0 / Free** → provider AWS → region `Singapore (ap-southeast-1)`
   → **Create**.
4. **Database Access** → **Add New Database User** → password authentication → user
   `pathshala_app`, generate a password, role **Read and write to any database**.
5. **Network Access** → **Add IP Address** → `0.0.0.0/0`, comment `Vercel serverless`.
   (Serverless functions have no fixed IP; this is acceptable for a portfolio database and
   is documented as a limitation.)
6. **Connect** → **Drivers** → Node.js → copy the `mongodb+srv://…` string, replace
   `<password>` with the real one.
7. Put it in `private/.env.local` as `MONGODB_URI=…` and tell me it is there. I will copy
   it into `apps/web/.env.local` and the API environment; auth then reads Mongo users and the
   catalogue stops returning `database_unavailable`. Seeded demo users replace the public
   demo list at that point.

## 2. Stripe — a dedicated sandbox (implemented with fixtures; real redirect waits)

1. https://dashboard.stripe.com → **Sandboxes** → **Create sandbox** → name `Pathshala`.
2. Open the sandbox → **Developers → API keys** → copy the **secret key** (`sk_test_…`)
   and the **publishable key** (`pk_test_…`).
3. In `private/.env.local` add `STRIPE_SECRET_KEY=…` and
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=…`.
4. Do not add a payment method. Test mode needs no card and takes no real money.
5. The webhook signing secret (`STRIPE_WEBHOOK_SECRET`) comes later, once the endpoint
   exists; the CLI can create it and I will read it from there.

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
   - the production web callback, which I will give you once the web app is deployed
     (the API domain is not an OAuth callback).
6. Copy the client ID and client secret into `private/.env.local` as `AUTH_GOOGLE_ID` and
   `AUTH_GOOGLE_SECRET`. The Google button appears only when both are set; without Atlas the
   session gets the student role and no stored user, so connect Atlas first for real accounts.

## 4. Email sender (optional; in-app reminders already ship)

No sender is configured. To turn on the optional email leg, sign up for a free transactional
sender (Resend is the current candidate) with no card, create an API key named `pathshala`,
verify one sender domain, and put both values in `private/.env.local` as `RESEND_API_KEY`
and `REMINDER_EMAIL_FROM`. The free tier has to be rechecked before relying on it; without
it, in-app reminders and `.ics` files work fully.

## 5. Vercel — API deployed (done 2026-11-16)

The API is live at `https://pathshala-api-lake.vercel.app` in project `pathshala-api`
(Hobby, function region `iad1`). `/health` is verified, including a 1.411s cold start and a
0.674s warm request. `/courses` correctly returns 503 `database_unavailable` until Atlas is
configured. Three Hobby deployments were used: the first two failed on module resolution
and the third, a self-contained bundle, is live.

Remaining owner action: item 1 (Atlas). Once `MONGODB_URI` is in `private/.env.local`, the
web, API and PayBridge deployments follow `docs/DEPLOY.md`, then I will verify a Mongo-backed
`/courses` 200, a complete sign-in/checkout flow and the production Playwright suite. Do not
spend another deployment before the URI exists.

## 6. Secrets distribution (I do this, not you)

Once the values are in `private/.env.local` I will push them to GitHub with
`gh secret set` and to Vercel with `vercel env add`, reading the file directly so no value
appears in chat or logs.
