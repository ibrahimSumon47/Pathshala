# Decisions

Short ADRs. Newest last. Each entry: date, decision, why, and what would make us revisit.

## 2026-11-16 — Work on `main` only, from an empty remote

The remote contained no commits, so `main` was created locally and will be pushed with the
first slice. One trunk keeps the portfolio history readable and matches the owner's rule
against branches and pull requests.
Revisit: never.

## 2026-11-16 — pnpm workspaces without a build-graph tool

`apps/web`, `apps/api`, `apps/paybridge` and shared packages live in one pnpm workspace.
Turbo is skipped: the repo is small, `pnpm -r` is enough, and fewer moving parts mean fewer
things to explain in a portfolio review.
Revisit if CI gets slow enough that caching pays for the extra config.

## 2026-11-16 — Next.js App Router on Vercel Hobby

The web app is server-rendered for SEO and built-in image/font handling. Hobby has a daily
deployment cap, so deploys are batched per finished slice.
Revisit: never for hosting; only the deployment cadence.

## 2026-11-16 — NestJS API: Vercel serverless first, free host as fallback (open spike)

NestJS gives the OOP/SOLID structure the brief asks for. It is wrapped as a single
serverless handler on Vercel first. If cold starts or request limits make that unsuitable,
the fallback is another free-forever host with a persistent process; Render is excluded
because its free instance hours are already committed elsewhere. The spike result and its
date are recorded here in P1.
Revisit: end of P1.

## 2026-11-16 — MongoDB Atlas M0 with Mongoose

Document model suits courses with nested sections and lessons, quiz attempts and flexible
lesson bodies. M0 is free forever with no card. Mongoose keeps schema and validation close
to the data. Atlas CLI session was expired at intake; the owner re-authenticates.
Revisit: if M0 limits (storage/connections) are hit in P7 with seed data.

## 2026-11-16 — Auth.js v5, JWT sessions, Google + credentials

Google sign-in for real users, seeded credentials accounts for the demo (student,
instructor, admin). JWT sessions because the credentials provider requires them and the
API verifies the same token. Roles ride in the token and are re-checked server-side on
every privileged mutation.
Revisit: if we add magic-link email and database sessions become worth it.

## 2026-11-16 — next-intl, Bangla default, English at `/en`

The product is Bangladesh-first, so `/` serves Bangla and `/en` serves English; the switch
is always visible and the choice persists in a cookie. Bangla uses a real Bangla web font
and is reviewed by a second pass for natural phrasing.
Revisit: if portfolio reviewers consistently need English first — then flip the default.

## 2026-11-16 — Currency: BDT as integer poisa

Prices are stored as integer minor units to avoid floating-point money bugs. Display is
`৳1,200`. Stripe presentment in BDT is verified in P4; if the sandbox cannot present BDT,
the Stripe flow shows a documented USD equivalent while PayBridge keeps BDT.
Revisit: P4, with the Stripe finding recorded.

## 2026-11-16 — Two payment rails, one order model

Stripe test mode proves we can integrate a real PSP (checkout, signed webhooks,
idempotency). PayBridge is our own sandbox gateway as a separate Vercel project and
database: hosted checkout, merchant API keys, HMAC-signed webhooks with retries,
idempotency keys, refunds, a ledger and a merchant dashboard. Both write into the same
order/payment state machine. Every screen states test mode.
Revisit: never; this is a portfolio centrepiece.

## 2026-11-16 — Seed content spans unrelated subjects

Owner wants a general marketplace. Seed data covers programming, spoken English, Excel and
office skills, academics, design, music and exam prep — each in Bangla and English — rather
than a programming-only catalog.
Revisit: never.

## 2026-11-16 — Search stays inside MongoDB

Catalog search uses a Mongo text index plus category, level, price and language filters.
No external search service: another free-tier dependency buys nothing at this scale.
Revisit: if result quality is visibly poor with seed data.

## 2026-11-16 — Reminders use a binary min-heap

Scheduled reminders sit in a binary min-heap keyed by due time, so the next due item is
`O(1)` to peek and `O(log n)` to insert or pop, instead of sorting the whole list on every
tick. Chosen because it is the natural structure and worth documenting in code.
Revisit: never at this scale.

## 2026-11-16 — Email is optional, in-app notifications are the baseline

No free sender is set up yet. P5 delivers reminders in-app and by `.ics` first; email is
added only if a sender's free tier is verified on the day, with the pricing page and date
recorded here.
Revisit: P5.

## 2026-11-16 — Design tokens before screens

Warm paper background, one deep-teal accent, a real type scale and 8-pt spacing land in
`packages/tokens` before any page. This prevents a pile of one-off styles that would need
rewriting later.
Revisit: never.
