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

## 2. Stripe — a dedicated sandbox (needed in P4)

1. https://dashboard.stripe.com → **Sandboxes** → **Create sandbox** → name `Pathshala`.
2. Open the sandbox → **Developers → API keys** → copy the **secret key** (`sk_test_…`)
   and the **publishable key** (`pk_test_…`).
3. In `private/.env.local` add `STRIPE_SECRET_KEY=…` and
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=…`.
4. Do not add a payment method. Test mode needs no card and takes no real money.
5. The webhook signing secret (`STRIPE_WEBHOOK_SECRET`) comes later, once the endpoint
   exists; the CLI can create it and I will read it from there.

## 3. Google Cloud — OAuth client for sign-in (needed in P1)

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
   - the production callback, which I will give you once the Vercel domain exists.
6. Copy the client ID and client secret into `private/.env.local` as `AUTH_GOOGLE_ID` and
   `AUTH_GOOGLE_SECRET`. The Google button appears only when both are set; without Atlas the
   session gets the student role and no stored user, so connect Atlas first for real accounts.

## 4. Email sender (optional, P5)

No sender is configured. When P5 starts, sign up for a free transactional sender (Resend
is the current candidate) with no card, create an API key named `pathshala`, and put it in
`private/.env.local` as `RESEND_API_KEY`. I will verify the free tier and record the date
in `DECISIONS.md` before anything depends on it. If it is not free at that moment, P5
ships with in-app reminders and `.ics` files only.

## 5. Vercel — approve the API deploy (needed to close P1 hosting)

The CLI is already signed in on the Hobby plan. The NestJS adapter is ready at
`apps/api/api/index.ts`; I have not deployed it because that creates an external project and
spends Hobby deployment quota. Tell me to deploy and I will create the API project, set
`MONGODB_URI` and `WEB_ORIGIN`, verify `/health` and `/courses`, and record cold start in
`DECISIONS.md`. Hobby caps deployments per day, and the production domain must be added to
the Google redirect URIs from item 3 once it exists.

## 6. Secrets distribution (I do this, not you)

Once the values are in `private/.env.local` I will push them to GitHub with
`gh secret set` and to Vercel with `vercel env add`, reading the file directly so no value
appears in chat or logs.
