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

## 2026-11-16 — TypeScript 6.0.3, not 7

TypeScript 7.0.2 is the latest, but typescript-eslint 8.72 declares `>=4.8.4 <6.1.0`, so a
7.x compiler would leave linting unsupported. The workspace pins 6.0.3 until the lint
toolchain catches up. Revisit monthly; the pin is one line.

## 2026-11-16 — ESLint 10 flat config, one file

One `eslint.config.mjs` covers apps, packages and repository scripts, with node globals
for `.mjs` and React hook rules only for `apps/web`. Formatting is left to review rather
than adding Prettier in this phase.
Revisit: if formatting churn appears in diffs.

## 2026-11-16 — gitleaks as a portable binary

winget has no gitleaks package. The release binary lives in gitignored `tools/gitleaks/`
and the pre-commit hook resolves it after checking PATH. CI downloads the pinned release
and verifies its checksum, so both sides scan with the same version.

## 2026-11-16 — One implementation of the author rule

`scripts/check-commits.mjs` owns the author and trailer checks; the pre-push hook calls it
with the outgoing ranges and CI calls it with `--all`. A separate shell copy would drift.
The checker was tested against throwaway repositories with a foreign author and a
trailer-bearing message; both were rejected.

## 2026-11-16 — Workspace grows when a feature needs it

P0 creates only `apps/web` and `packages/shared`. `apps/api` arrives with the first real
API route in P1 and `apps/paybridge` with the gateway in P4, so no empty shells sit in the
repository. Shared tooling is already configured for new packages.

## 2026-11-16 — Verified tool versions

Next 16.4.6, React 19.3.1, Vitest 5.1.0, Vite 8.3.8, ESLint 10.15.0, typescript-eslint
8.72.2, gitleaks 8.30.1, pnpm 12.15.0, Node 24. All were resolved from the registry on
2026-11-16; the lockfile pins the resolution.

## 2026-11-16 — Money as integer paisa, formatted by locale

Prices and ledger entries are integer paisa (`PAISA_PER_TAKA = 100`). `toPaisa` rounds
once at the boundary and rejects unsafe values; `formatPaisa` shows whole taka without
decimals and uses Bengali digits for Bangla. No floating-point arithmetic anywhere in the
money path.

## 2026-11-16 — Tokens are CSS custom properties; Tailwind waits for P2

The design system ships as CSS variables in `packages/tokens/theme.css`, consumed directly
by CSS modules. Tailwind 4 is CSS-first, so when the catalogue adds many layouts it can map
the same variables through `@theme inline` without a second source of truth or a rewrite.
Revisit: P2, when the catalogue needs utility-scale layout work.

## 2026-11-16 — Bangla at `/`, English at `/en`

next-intl uses `localePrefix: 'as-needed'` with `bn` as the default. The Bangla site keeps
clean URLs, English stays shareable, and every page is prerendered. `next/root-params`
keeps static rendering working on Next 16 instead of the legacy `setRequestLocale` path.
Revisit: if analytics show reviewers need English first; the default is one line.

## 2026-11-16 — Two self-hosted fonts, one stack

Inter carries Latin and punctuation; Noto Sans Bengali covers Bangla glyphs and the taka
sign. Both are downloaded at build by `next/font` and served from our own origin, so there
is no third-party font request at runtime.
Revisit: only if the build environment loses access to Google Fonts.

## 2026-11-16 — The document is the theme store

An inline boot script applies `data-theme` before paint; the toggle writes the changed
attribute and localStorage, and React reads it through `useSyncExternalStore`. This avoids
the white flash and the cascading render that a state-setting effect causes.
Revisit: if themes become per-account settings, then the user record leads.

## 2026-11-16 — Course content in separate collections

Courses, sections and lessons are separate collections keyed by ordered references rather
than one large embedded document. Authoring, reordering and progress updates touch small
documents, and the unique `(course, section, order)` index prevents duplicate positions.
Lesson carries a reserved `video` subdocument, so adding video does not require migrating
existing lessons.
Revisit: if read latency demands an embedded table of contents; measure first.

## 2026-11-16 — Async validation in model tests

Mongoose 9 deprecates `validateSync` and returns `undefined` rather than `null` on success.
The tests use `document.validate()` and assert on the returned error map, which is the API
that survives into Mongoose 10.

## 2026-11-16 — pnpm build approvals are explicit

pnpm 12 blocks dependency install scripts and calls the allow-list `allowBuilds` (an object),
not `onlyBuiltDependencies`. Only `@swc/core`, `@parcel/watcher` and `esbuild` (tsx) may
run scripts; the approval was written by `pnpm approve-builds --all` and is committed in
`pnpm-workspace.yaml`.

## 2026-11-16 — Vitest transforms JSX through oxc

Vitest 5 uses Vite 8's oxc pipeline and Vite reads `jsx: preserve` from the Next tsconfig,
which leaves JSX untransformed. `vitest.config.mts` sets `oxc.jsx.runtime` to `automatic`
and aliases `@` to `src`, so component tests run without a DOM or extra plugin.

## 2026-11-16 — Design tokens before screens

Warm paper background, one deep-teal accent, a real type scale and 8-pt spacing land in
`packages/tokens` before any page. This prevents a pile of one-off styles that would need
rewriting later.
Revisit: never.

## 2026-11-16 — Demo accounts behind a real account seam

Three credentials accounts (student, instructor, admin) exist in code with bcrypt hashes so
every role is reviewable without Atlas. The same module reads users and password hashes from
Mongo when `MONGODB_URI` is set; the demo list is the fallback, not a second auth system.
Passwords appear on the sign-in page because they are public demo credentials. The list is
on by default in development and off in production unless `DEMO_AUTH=true`; `DEMO_AUTH=false`
removes it anywhere. Admin is read-only until P6.
Revisit: replace the demo list with seeded Mongo users when Atlas lands; turn demo auth off
before any destructive admin action ships.

## 2026-11-16 — JWT sessions carry roles, pages re-check them

Auth.js JWT sessions are required by the credentials provider, so roles ride in the signed
token and every protected page calls `requireRole` on the server. No client component trusts
a role from the DOM. Google users default to the student role until their Mongo record exists.
Revisit: database sessions if magic-link email arrives and per-request revocation matters.

## 2026-11-16 — bcryptjs, not native argon2

bcryptjs is pure JavaScript with no install script, so it works unchanged on Vercel and CI.
Cost 10 keeps demo sign-in fast; the demo passwords are public anyway. Argon2id would be
stronger but adds a native build the deployment spike does not need.
Revisit: P7 security review, with a native-capable host or prebuilt binary.

## 2026-11-16 — Zod pipes instead of class-validator

The API runs through tsx locally and through one bundled Vercel function, neither of which
emits `design:paramtypes` metadata. A global ValidationPipe would silently skip validation.
A small `ZodValidationPipe` takes the schema explicitly, so validation is real in every
runtime, and the schema is unit-tested without booting Nest.
Revisit: if class-validator becomes metadata-safe on this toolchain.

## 2026-11-16 — Our rate limit guard replaces @nestjs/throttler

With Nest 12 (ESM-only) and the CommonJS throttler, the guard's `Reflector` token did not
match the provider, and startup failed with UnknownDependenciesException. A dependency-free
guard over a per-process window is honest for one instance and easy to test. It is not a
global limit across serverless instances; that needs a shared store.
Revisit: when the API gets a shared Redis/Upstash store, or Nest and the throttler settle
their module identity.

## 2026-11-16 — API as one Vercel function, run locally by tsx

`apps/api/api/index.ts` boots Nest once per function instance and strips Vercel's `/api`
prefix, so the same controllers answer at `/health` locally and behind the rewrite. There is
no compiled dist: the function bundles workspace TypeScript, and decorator metadata is not
needed because controller dependencies use explicit `@Inject`.
Revisit: if Vercel cold start or the workspace TS bundle fails, move to a persistent Node
host; the hosting spike stays open until measured.

## 2026-11-16 — Theme boot moves to next/script

An inline `<script>` in the root layout produced React's "scripts inside components are never
executed" error on client navigation. `<Script strategy="beforeInteractive">` keeps the
pre-hydration theme read without the warning; the toggle and localStorage contract are
unchanged.
Revisit: if themes become server-rendered per account, replace localStorage with a cookie.
