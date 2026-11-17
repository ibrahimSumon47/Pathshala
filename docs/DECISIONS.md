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

## 2026-11-16 — NestJS API: Vercel serverless first, free host as fallback (closed: Vercel)

NestJS gives the OOP/SOLID structure the brief asks for. It is wrapped as a single
serverless handler on Vercel first. If cold starts or request limits make that unsuitable,
the fallback is another free-forever host with a persistent process; Render is excluded
because its free instance hours are already committed elsewhere.
Result: Vercel stays. The live function answered `/health` in 1.411s on an idle first
request and 0.674s warm. The result is recorded again below with its deployment evidence.
Revisit: if a Mongo-backed route pushes cold or warm latency past the budget in P7.

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

## 2026-11-16 — The document is the theme store (superseded by the cookie entry below)

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
prefix, so the same controllers answer at `/health` locally and behind the rewrite. The
first prebuilt attempt shipped the source tree and failed to resolve workspace modules, so
the final function is a self-contained esbuild CJS bundle (see the bundle entry below).
Decorator metadata is not needed because controller dependencies use explicit `@Inject`.
Revisit: if the bundle or cold start fails in practice; both are now measured.

## 2026-11-16 — Theme boot moves to next/script (superseded by the cookie entry below)

An inline `<script>` in the root layout produced React's "scripts inside components are never
executed" error on client navigation. `<Script strategy="beforeInteractive">` kept the
pre-hydration theme read, but it still warned on soft navigation because the locale layout
is not the true root layout, and React dropped the script-set `data-theme` attribute.
Revisit: never in this form; the cookie entry below replaces it.

## 2026-11-16 — Vercel hosting spike result: keep the serverless API

The deployed adapter is one function at `https://pathshala-api-lake.vercel.app`, region
`iad1`. On 2026-11-16 from Dhaka, an idle `/health` request took 1.411s total with
`uptime: 0` (a fresh process), and the next request took 0.674s. `/courses` returns 503
`database_unavailable`, `limit=99` returns the 400 envelope and an unknown route returns
404, so routing, validation and error handling survive the platform. Three Hobby
deployments were used: two failed on module resolution and the third is live. The Mongo
runtime path is still unproven because Atlas is blocked on the owner.
Revisit: if a real catalogue read makes cold start or p95 unusable, or if a shared rate
limit is needed across instances.

## 2026-11-16 — The API ships as a self-contained esbuild CJS bundle

A prebuilt Vercel function does not install the workspace's `node_modules`; the first
deploy failed on an extensionless ESM import and the second on `reflect-metadata` imported
from the copied source tree. The API now bundles `api/index.ts` into `api/index.cjs` with
esbuild (6.3 MB), leaving only optional Nest and Mongo natives external. `vercel.json`
builds that file, and the bundle is gitignored and regenerated before every deploy. This
keeps local `tsx`, tests and the deployed runtime on one source file.
Revisit: if the bundle outgrows the function limit or a native dependency cannot be
externalised safely.

## 2026-11-16 — The theme is a server-read cookie

React owns `<html>`, so on a soft navigation it re-applied its own props and removed the
`data-theme` attribute that a script had set; the page reverted to light. A `next/script`
boot in `[locale]/layout.tsx` also still produced React's script warning because that is
not the true root layout. The layout now reads the `pathshala-theme` cookie, renders
`data-theme` itself before paint, and the toggle updates the attribute and the cookie. This
keeps the no-flash result, survives soft navigation and removes the boot script entirely.
Revisit: if themes become per-account settings, store the preference on the user instead.

## 2026-11-16 — Authenticated app writes live in web server actions; public reads and payments in NestJS

The Next.js app already owns the session cookie and guards every page. Authoring, enrolment,
progress and other signed-in writes run as server actions with `requireUser`/`requireRole`,
so there is no second auth protocol between web and API. NestJS owns the public catalogue,
health, checkout and webhook surfaces where a stable HTTP contract matters. Both use the
same `packages/db` models and catalogue module.
Revisit: if the web and API are deployed independently and the API needs user-scoped routes;
then add a signed service token rather than trusting a client header.

## 2026-11-16 — mongodb-memory-server is the local database

Atlas is owner-blocked and Docker is not installed. `pnpm db:dev` runs MongoDB 8.2 from
`mongodb-memory-server` on port 27018, seeds the demo catalogue and exits cleanly. API
integration tests boot their own instance. A real `MONGODB_URI` switches every path to
Atlas without a code branch; memory data is disposable and never used in production.
Revisit: when Atlas exists, use it for the deployed app and keep the memory server only
for tests and fresh clones.

## 2026-11-16 — Quiz correctness stays on the server

`getLessonQuiz` returns prompts, options and points but never `correctIndexes`; scoring runs
in the server action through `scoreQuiz` and stores the attempt. A learner can inspect the
page HTML without learning the answers, and every attempt is auditable. Submissions require
the same course access as the lesson.
Revisit: never for graded quizzes; a practice mode could reveal answers after an attempt.

## 2026-11-16 — Learning writes stay in Next.js server actions

Enrolment, progress, notes, Q&A, reviews and wishlist all use server actions guarded by
`requireUser` and course access, following the P2 authoring decision. The NestJS API stays
on public catalogue, health and the coming payment webhooks. This avoids inventing a second
session protocol for user-scoped writes before there is an independent consumer.
Revisit: if a mobile client needs the learning endpoints.

## 2026-11-16 — Orders fulfil only after a signed webhook

A browser return is a hint, not proof of payment. Both rails redirect back with `paid=1`, but
orders move to paid only inside `markOrderPaid`, called from a raw-body signature-verified
webhook. Unique `(provider, eventId)` and `(provider, providerRef)` rows plus a guarded
`status: {$ne: 'paid'}` update make replays harmless. Receipts are generated at that moment.
Revisit: never; a redirect-only fulfilment is a fraud hole.

## 2026-11-16 — Certificates are public by random code, not by enrolment id

A certificate stores a 16-character code drawn from an alphabet without I, O, 0 or 1,
plus a printed number with the UTC issue year. The public `/verify/[code]` page joins the
learner name, course and instructor and never exposes an email. Codes are generated with
`crypto.randomBytes`; the unique indexes on code and `(student, course)` make reissuance
idempotent. A QR code is rendered server-side by `qrcode` as a data URL, so verification
works without a third-party image service.
Revisit: signed PDFs if a certificate must be printed at scale; the public page stays.

## 2026-11-16 — Admin actions are audited; audit exports are formula-safe

Admin approval and instructor-access changes write an append-only `AuditEvent` with actor,
action, entity and non-secret metadata. Users cannot change admins or their own roles.
CSV export quotes every cell and prefixes `=`, `+`, `-`, `@`, tab and CR with an apostrophe,
because a spreadsheet opening an export is an execution surface. The export is capped at
2000 rows and is audited too.
Revisit: if an external SIEM consumes the log, stream events instead of exporting.

## 2026-11-16 — Live rooms are Jitsi rooms keyed by a generated name

A live session stores an unguessable room name derived from a UUID; the page embeds
`meet.jit.si` in an iframe and always renders a new-tab link for browsers that block the
embed. Access is checked against the course enrolment before the room name reaches the
page, because a Jitsi room name is the only secret. Jitsi's free public service needs no
account or key and keeps the project free forever; the trade-off is that anyone with a
leaked room name can join, so names are never printed on the public course page.
Revisit: move to JaaS or a self-hosted Jitsi if a room needs waiting lists or recording.

## 2026-11-16 — Reminders use a binary min-heap and idempotent claims

Due reminder rows are pushed into a binary min-heap ordered by `dueAt`: building from N rows
is O(N), each pop is O(log N), and the dispatcher drains only the due prefix. Before
sending, a guarded `findOneAndUpdate({status: 'pending'})` claims the row, so two workers or a
retry cannot notify twice; the notification has a unique `(user, kind, session)` key. In-app
delivery is the primary channel. Email is optional and runs only when `RESEND_API_KEY` and a
verified `REMINDER_EMAIL_FROM` exist; a failed email is recorded on the reminder without
losing the in-app message. `pnpm reminders:dispatch` is the cron entry point.
Revisit: a durable queue if delivery volume outgrows one process; the heap itself stays.

## 2026-11-16 — PayBridge is a separate app with its own merchant boundary

`apps/paybridge` runs on its own port and Vercel project. It stores hashed merchant API keys,
hosted checkout sessions, a gateway ledger and webhook deliveries; the Pathshala order never
trusts the browser return. The gateway uses the same MongoDB locally but its own collections
prefixed `PayBridge`. It is deliberately a sandbox: the only accepted card is 4242 4242 4242
4242 and every screen says test mode.
Revisit: if the gateway needs its own database in production; Atlas can hold a separate one.

## 2026-11-17 — Production runs on Atlas M0, the web alias is `-eight`

The free M0 cluster (AWS `AP_SOUTHEAST_1`) is created through the Atlas CLI with a generated
`pathshala_app` password and `0.0.0.0/0` egress for serverless. `pathshala-web.vercel.app` was
already taken, so the web project keeps the auto-assigned `pathshala-web-eight.vercel.app`
alias, and `APP_URL`, `WEB_ORIGIN`, the Stripe endpoint and the README all use it. Aliases are
global, so a deployment must never assume its preferred name is free.
Revisit: if a custom domain is added, point it at the same project and update `APP_URL`.

## 2026-11-17 — Stripe Checkout no longer accepts `payment_method_types`

Current Stripe rejects a Checkout Session that pins `payment_method_types`; payment methods
now come from the dashboard's dynamic configuration. The request body drops the field, and a
unit test asserts it stays out so a future refactor cannot reintroduce a 400 at checkout.
Revisit: never; the dashboard owns payment methods.

## 2026-11-17 — The API is deployed prebuilt from the repository root

`pathshala-api` sets its root directory to `apps/api`, but the CLI resolves that setting
against the directory it is run from. Deploying with `--cwd apps/api` looked for
`apps/api/apps/api` and also auto-created an unrelated project once. `vercel build` inside
`apps/api` writes the output where the project expects it, and `vercel deploy --prebuilt
--project pathshala-api` from the repository root uploads it correctly.
Revisit: if the API moves to a repository root of its own.

## 2026-11-17 — Public registration replaces the demo account list in production

Visitors need a way in without the seeded passwords. A zod-validated, rate-limited-by-auth
server action creates a student-only account with a bcrypt hash and folds duplicate emails
into one message. `DEMO_AUTH` stays `false` in production, so the seeded role list is a local
demo tool only.
Revisit: when email verification is added, gate the account until the address is confirmed.

## 2026-11-17 — Course depth is stored per language, not as one shared list

Outcomes, requirements, audience and FAQ pairs are bilingual documents, because a Bangla
course that lists English bullet points reads like a half-translated page. The studio keeps
two textareas (one line per item) and merges them by position, so an instructor can write
only the language they know and the page falls back to the side that exists. Older rows that
stored plain strings are normalised on read by `toLocalizedList`.
Revisit: if the editor moves to a block editor, the storage shape stays the same.

## 2026-11-17 — Related courses fall back beyond the same subject

`programming` holds one seeded course, so a same-category-only query returned an empty row
under a heading that promised more. The detail query now takes up to three same-subject
courses and fills the remainder with the best-rated courses elsewhere. The heading stays
honest because the cards name their own subject and teacher.
Revisit: when every subject has several courses and the fallback never triggers.

## 2026-11-17 — One order for a cart, priced in minor units

A cart can hold several courses, so an order now stores `items[]` with a title, slug and price
per course instead of a single `courseSlug`. The total is the sum of payable prices minus the
coupon, and the net is allocated across items by largest remainder so the per-instructor ledger
always adds back to the payment. A refund reverses the same shares, and the dashboard derives a
course list from the items, which keeps one payment and one receipt per checkout.

Revisit: if partial refunds per course are ever offered, each item needs its own refund state.

## 2026-11-17 — Invoices are written directly, with ASCII text

A PDF library would add an unaudited dependency for a single page. `apps/web/src/lib/invoice.ts`
writes the PDF objects itself and escapes text; the base-14 fonts cannot render Bangla, so
invoice content is ASCII with the Bangla course title falling back to English. The invoice is
served only to the learner who owns the order, and only after the order is paid.

Revisit: when a Bangla invoice is legally required, embed a subset font and revisit the licence.

## 2026-11-17 — Deleting an account also ends the session

The JWT session can outlive its user row. `requireUser` and the sign-in page both check that the
record still exists, and account deletion signs the cookie out before redirecting. Without the
sign-out, a deleted learner bounced between the dashboard and sign-in forever because each page
trusted a different half of the state.

Revisit: nothing; a deleted account never gets a session again.

## 2026-11-17 — Search by escaped regular expression, not a text index

Atlas text indexes tokenise words and handle neither Bangla partials nor a reader typing
`c++`. The catalogue now builds an escaped, case-insensitive pattern over the Bangla and
English title and subtitle, which matches either script and a mid-word fragment. The query is
trimmed to 80 characters and escaped, so a reader's punctuation cannot become a regular
expression. The trade-off is that a very large catalogue will want a dedicated search service;
Atlas Search is billed, so this stays free until the catalogue outgrows it.

Revisit: past a few thousand courses, measure the query before changing anything.

## 2026-11-17 — Price buckets are ranges in paisa, with the old API contract kept

Four buckets — free, under ৳500, ৳500–1500, above ৳1500 — each map to an explicit paisa range
with no gaps or overlaps. The public API still accepts `price=paid` because it is documented;
the site never offers a bucket that hides a course by rounding.

Revisit: when regional currencies arrive, buckets become per-currency.

## 2026-11-17 — Sign-in and registration are separate pages

Stacking a sign-up form under the sign-in form made one screen carry two jobs, and the page
read as a demo page rather than an account door. `/sign-in` now holds one centred sign-in
form with the optional Google button and the demo list; `/register` holds one centred
registration form with a link back. Registration still returns to sign-in with a success
note instead of creating a session, so the two pages stay honest about what each does.

Revisit: if registration ever auto-signs-in, the success note and the second form disappear.

## 2026-11-17 — Auth pages share one stylesheet through a route group

Sign-in and registration carried near-identical centred-column CSS, which is exactly how two
pages drift apart. Both now live under `(auth)/` with one `auth.module.css` holding the page,
column, intro, panel, form, error and switch styles; only sign-in's demo list and Google block,
and the register panel's stacking, stay local. The route group changes no URL.

Revisit: if a third auth step arrives, give the shared module a small shell component too.

## 2026-11-17 — Web functions run in Singapore, beside Atlas

The Atlas M0 cluster is in `AP_SOUTHEAST_1` while the Vercel functions defaulted to `iad1`, so
every page paid a transatlantic round trip for each of its three to six queries. `apps/web/vercel.json`
now pins the functions to `sin1`. Measured with curl on production: warm TTFB fell from
1.10 s / 1.07 s / 2.70 s (home, catalogue, course page) to 0.26–0.31 s, and the 21-journey
production suite dropped from 4.4 to 2.2 minutes. The first request to a fresh deployment still
costs about 1.7 s because serverless has to start the function; that is a cold start, not a query.

A 60-second data cache for the catalogue was measured against the region-only deployment and
made no difference (0.15–0.22 s warm on both), so it was removed rather than shipping stale
course pages for no gain. Revisit both decisions if traffic or the catalogue grows.

Revisit: a paid always-warm instance, or a cache with tag-based invalidation, only if measured.

## 2026-11-17 — Profiles are bilingual fields on the user, public only for teachers

A profile is not a separate document: the name, photo, one-line headline and introduction live
on the user record as Bangla and English fields, with empty sides stored as absent so a page can
fall back. `/dashboard/profile` is private and shows the email and learning counts;
`/instructors/[id]` is public for instructor and admin accounts only and never selects the email.
Learner profiles stay private, because a learner never agreed to a public page.
The header carries Profile and a log out button for signed-in readers; logging out is a form
post to the existing Auth.js action, not a link, so it cannot be triggered by prefetching.

Revisit: a slug or handle instead of the ObjectId once people share profile links widely.

## 2026-11-17 — The platform’s 20% is ledger money, not a number on a page

Pathshala already split every payment 80/20 between instructor and platform. That split was
real in the ledger but invisible: an operator opening their profile saw the same fields as a
teacher. The share is now a named constant used by payment and refund, written to the order as
`platformFeePaisa` when the webhook is signed, and reported from paid orders rather than the
ledger: a removed test order can leave ledger rows behind, and adding them pushed the reported
share above gross sales. Orders written before the field existed fall back to the same integer
20% rule. Admins get an operator desk with the platform share, gross
sales, refunds, paid orders and average order; teachers get their own earnings desk; learners
get a completion trail instead of money they will never see.

The masthead moved from a flat row of equal text links to a sticky bar with a monogram, a pill
navigation that marks the current section, and one account menu. On small screens the links
move to their own scrollable row instead of disappearing.

Motion is CSS only and always optional: translate/fade entrances, a growing progress bar and
hover lifts, all removed by the existing reduced-motion rule. No animation is load-bearing.

## 2026-11-17 — Money views read orders, statements read the ledger

Admin money is read from paid orders, not from an unfiltered ledger sum: orphaned test rows once pushed the platform share above gross sales, so the report now sums the share recorded on orders (20% fallback for older rows) and excludes refunded orders. A teacher's statements do read the ledger, because those rows carry the signed sale and refund amounts and are scoped to one instructor. The CSV exports reuse the formula-safe builder.

Email notifications are deliberately not wired. In-app sale alerts are created when a payment is signed; sending mail needs an owner-chosen provider, an account and a key, so the rest of the notifications work stays free and self-contained.

A performance sample was taken before and after parallelising the course page: warm TTFB was 0.273–0.299 s before and 0.274–0.329 s after. The difference is noise, so the page is simpler but the project makes no speedup claim.

Moderation hides rather than deletes: reviews and questions keep their rows for the audit trail, public queries exclude them, and hiding a review recomputes the course rating from the visible set. The course rating therefore cannot drift from what readers can see.

## 2026-11-17 — Community tools stay inside the existing records

A review reply is two fields on the review, not a new thread: it keeps the public course query one read and makes hiding the review hide its reply with it. Announcements reuse the notification inbox instead of introducing email; the action verifies course ownership and writes at most 5,000 notifications so one request cannot fan out without bound.

Payout settlement is a separate `PayoutBatch` keyed by instructor and `YYYY-MM`, marked by an operator after the transfer. It deliberately does not move money or mutate the ledger. Reopening deletes that marker, so the statement returns to its computed state. The unique index makes a repeated mark an update, not a second payout.

Bulk moderation updates a bounded list (200 ids) in one write, then refreshes each affected course rating once. Hiding remains reversible; no review or question row is deleted.

The search limiter is a fixed window in process memory. Vercel may run several instances, so it raises the cost of a burst rather than promising a global quota; the same honest limitation already applies to the auth limiter.

## 2026-11-17 — Refunds are a request queue, not a learner-side switch

A learner can ask once per paid order, and only inside the published policy: 14 days from payment and under a quarter of the lessons. The request row is separate from the order because the decision is an operator act with its own state. Approval calls the same `markOrderRefunded` path a gateway event uses, so the ledger, payment row, enrolment status and coupon count reconcile exactly as they do for a real refund; declining leaves the order paid. The unique per-order request keeps a declined order out of the queue instead of letting duplicates accumulate.

Teacher promo codes reuse `Coupon` with its existing `course` scope rather than a parallel discount model. The code is always attached to a course the teacher owns, so the checkout quote already enforces the course, cap and expiry. A teacher cannot mint a platform-wide code; the admin coupon desk keeps that power. Fixed amounts are stored in integer paisa like every other price.

The instructor question desk reads the same `Question` threads learners write. Answering adds to that thread instead of creating a teacher-only copy, so there is one public history. Hidden threads are excluded from the desk, and ownership is checked against the course, not the question's author.

A saved search stores only the filters the catalogue already understands, and "new" means published after that search's previous check. The check writes at most one inbox note per search per run, then moves the timestamp; there is no background job and no email, so the feature stays free. Wishlist price notes are emitted only on a real price cut in the studio and link to the course page.

Quiz explanations live on the question row and are returned only with an attempt. Before submitting, the quiz payload still has no correct indexes; after submitting, `reviewQuiz` pairs each question with the learner's selection, the correct set and the explanation. The helper is pure so the rules are tested without a database.

## 2026-11-17 — P16 keeps teacher tools on the records learners already see

The roster reads enrolments, users, certificates and surveys rather than adding a class table. Refunded enrolments are excluded because they no longer have access. Survey answers are stored once per learner and course, and a resubmission edits that row: a learner who misread a scale can correct it, while the teacher still sees one honest average and never a named answer.

Lesson order is the one place where a naive swap cannot work. `Section` and `Lesson` carry unique `(course, section, order)` indexes, so changing two rows one at a time would collide halfway. Reordering rewrites every sibling to a temporary band first, then to `1..n`. The operation normalises the whole section, which also repairs gaps left by earlier deletes.

The question bank is a separate collection owned by the instructor, not a flag on a quiz question: a question is reusable after its source lesson is edited or deleted. Saving checks ownership through the source course; adding checks the target course and refuses a prompt already present in that quiz, so a double click cannot duplicate a question. The prompt, options, correct set and explanation are copied at save time; later edits in one place do not silently change the other.

Certificate revocation changes `revokedAt` on the existing certificate. Deleting it would break a printed code and the audit trail; the public verification page already reports the revoked state. The admin action writes an audit row like every other operator decision.

The coupon timeline reads paid orders, not the ledger or the denormalised redemption counter: it can show the buyer and the discount that was actually charged, and a refunded order drops out because its status is no longer paid.

Saved searches check themselves when a learner opens the dashboard, guarded by the stored `lastCheckedAt` and a 24-hour interval. That keeps the feature free and needs no scheduler; the trade-off is that a learner who never returns gets no notification, which is acceptable because the inbox only exists for them anyway. The manual check stays available.

Surveys are five-point integers with an optional 500-character comment. The scales are deliberately consistent so averages are comparable; the page words both ends of each scale instead of labelling only the middle. Only the teacher roster reads them, and only as averages and a count.

## 2026-11-17 — P17 caps the room, the code and the empty result

A waitlist is a separate row keyed by session and student, not a status on attendance. That keeps the existing check-in path and its tests intact, and it lets the queue survive a learner who leaves and returns. Position is derived from `createdAt` rather than stored, so removing the head cannot leave stale numbers behind. Capacity defaults to 0 (no cap), which means every existing session keeps its old behaviour without a data migration. When a seat opens, the waiting learner can claim it: `joinSession` takes the capped path, `checkInToSession` writes attendance, and the queue row is deleted in the same request.

The per-learner coupon cap counts only paid orders. A refund therefore frees the use, which is the same rule the public redemption counter already follows. `0` is an explicit unlimited value rather than a missing field, so a teacher can deliberately make a code reusable. Every quote path now receives the buyer; enforcing only at final checkout would let the cart show a discount that checkout then refuses.

Survey comments are read through the same visible set as the averages. Hiding is applied in the query, so a hidden comment cannot linger in one view after disappearing from another. The roster returns anonymous text and a timestamp only, and the admin bulk form reuses the bounded 200-id moderation pattern.

An empty catalogue result does not guess at similar titles. It aggregates published course counts per subject, excludes the subject already being viewed, and lists up to six subjects that actually have courses. Saving from that state reuses `createSavedSearch`, including its validation and ten-search limit, so the shortcut cannot create a record the dashboard could not create itself.

## 2026-11-17 — P18 closes the waitlist loop with bounded writes

A seat-opening note is written only for the learners who now fit: `capacity - attendance` people, capped at 50, and everyone in line when the cap becomes unlimited. Each learner gets at most one `seat_open` note per session. The unique index uses a different key order (`kind, session, user`) from the reminder guard so MongoDB accepts both indexes; the notification is an in-app row, not email, so the feature stays free.

Leaving a waitlist deletes only the caller's row. Position is derived again on the next read, so the next learner moves to #1 without a renumber pass. The action is idempotent because stale dashboard rows are normal when a session has already started or a previous request completed twice.

Attendance export is a teacher/admin read scoped through the course, not a public session endpoint. Rows carry both attended and waiting learners with a derived queue position; the existing formula-safe CSV builder handles names and emails. The export is bounded to 100 sessions per course, which is well beyond a classroom's real use.

The per-learner cap impact counts distinct buyers whose paid orders with that code reached `maxPerLearner`. It uses the same paid-order definition as the cap itself, so a refunded order cannot keep a learner in the "at limit" count. Unlimited codes show a dash because a count against zero would be meaningless.
