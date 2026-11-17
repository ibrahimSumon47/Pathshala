# Lessons

## 2026-11-16 — The remote was empty, not README-only

The brief said `main` already had a README commit. `git fetch` produced no refs and
`gh api repos/ibrahimSumon47/Pathshala/commits` returned HTTP 409 ("Git Repository is
empty"). Lesson: verify remote state through the API before planning around it; a
described repo is not evidence of one.

## 2026-11-16 — Atlas CLI login expires between sessions

`atlas auth whoami` reported a signed-in email while `atlas organizations list` returned
"session expired". Lesson: `whoami` is not proof; run one real read command before
trusting a CLI login. Re-authentication is an owner action and lives in `OWNER_TODO.md`.

## 2026-11-16 — winget does not carry gitleaks

`winget install zricethezav.gitleaks` reports "No package found". The release zip from
GitHub is the reliable route; it now lives in gitignored `tools/gitleaks/` and CI
installs the same pinned version. Lesson: check the package exists before writing install
steps into docs.

## 2026-11-16 — Flat ESLint config needs node globals for .mjs

The first lint run failed on `console` and `process` in `scripts/*.mjs`, because the
TypeScript block only applied browser/node globals to `.ts`/`.tsx`. A dedicated `*.mjs`
block fixed it. Lesson: lint the tooling, not just the app.

## 2026-11-16 — Next 16 renamed middleware to proxy

`middleware.ts` is `proxy.ts` in Next 16. next-intl's docs and examples reflect the rename;
the handler still comes from `next-intl/middleware`. Lesson: check the framework's file
conventions against the installed major before copying an older example.

## 2026-11-16 — pnpm 12 uses allowBuilds, not onlyBuiltDependencies

Adding `onlyBuiltDependencies` to `pnpm-workspace.yaml` was ignored and install failed with
`ERR_PNPM_IGNORED_BUILDS`. `pnpm approve-builds --all` wrote the correct `allowBuilds` map.
Lesson: let the tool write its own config instead of guessing the current key name.

## 2026-11-16 — Mongoose 9 dropped the second hook argument

`pre('validate', function (next) { ... })` fails to typecheck because the hook no longer
receives `next`, and `validateSync()` is deprecated and returns `undefined` on success.
Both are signs to move to the async APIs now rather than at the Mongoose 10 upgrade.

## 2026-11-16 — Vite 8 reads jsx: preserve from the Next tsconfig

Vitest 5 uses oxc, not esbuild; setting `esbuild.jsx` produced a warning and left the test
file untransformed. `oxc: { jsx: { runtime: 'automatic' } }` in a `.mts` config fixed it.

## 2026-11-16 — exactOptionalPropertyTypes applies to component props

Passing a CSS module class that may be undefined into `className?: string` fails under
`exactOptionalPropertyTypes`. Optional presentation props declare `string | undefined`.

## 2026-11-16 — A Stripe CLI can point at another project's sandbox

The Stripe CLI is configured against a sandbox named for a different project. Lesson:
never assume a configured CLI belongs to this project; check the sandbox name in the
response before creating prices, products or webhooks.

## 2026-11-16 — Checksums verify filenames, not just bytes

The CI secret job saved the gitleaks tarball as `/tmp/gitleaks.tar.gz` while the checksums
file lists `gitleaks_8.30.1_linux_x64.tar.gz`, so `sha256sum -c` failed before any scan
ran. Keep the release filename when verifying a checksum.

## 2026-11-16 — setup-node caches pnpm before pnpm exists

The commit-identity job failed with "Unable to locate executable file: pnpm": setup-node v5
reads the packageManager field and prepares a pnpm cache before pnpm is installed. That job
only reads git history, so package-manager caching is disabled there.

## 2026-11-16 — Nest 12 ESM + CommonJS throttler broke Reflector identity

`@nestjs/throttler` declares Nest 12 support, but its CommonJS build loaded a `Reflector`
class that the ESM-only Nest 12 container did not recognise; startup failed with
`UnknownDependenciesException`. Providing Reflector again did not help. Lesson: a peer range
is not proof of runtime identity on an ESM-only major; test the guard at boot, and prefer a
dependency-free guard when the interop cost exceeds the feature.

## 2026-11-16 — PORT=0 is a real value in this environment

The API logged "listening on http://localhost:0" because the shell exports `PORT=0`.
`Number.parseInt(process.env.PORT ?? '4000')` accepted it and Node chose a random port.
Lesson: treat zero and non-numeric ports as missing when a fixed local port is intended.

## 2026-11-16 — Next 16 warns about inline scripts rendered by components

The pre-paint theme script worked visually but logged "Encountered a script tag while
rendering React component" on client navigation and raised a dev issue badge.
`next/script` with `beforeInteractive` in the root layout is the supported home for it.
Lesson: check the console after navigations, not just the first paint.

## 2026-11-16 — tsx and bundlers do not emit decorator metadata

Nest's `design:paramtypes` is absent under esbuild/tsx, so a global ValidationPipe had no
DTO metatype and class-validator would have passed everything. Explicit `@Inject` and
schema-based zod pipes make dependencies and validation runtime-explicit.
Lesson: in a metadata-free runtime, never rely on implicit type reflection for security.

## 2026-11-16 — Screenshot scroll capture is unreliable in the local browser

After a programmatic scroll the capture surface stayed on the first frame or cropped to the
old phone width. Layout measurements (rects, `scrollWidth`) and accessibility snapshots were
reliable evidence; screenshots were only trusted at the top of a page. Lesson: choose the
instrument that matches the question instead of repeating a flaky capture.

## 2026-11-16 — A prebuilt Vercel function carries no workspace node_modules

The first deployed function failed on an extensionless ESM import. After adding `.js`
extensions it failed again, this time on `reflect-metadata` from
`/var/task/apps/api/src/serverless.js`. A local copied-output harness passed only because a
parent `node_modules` happened to resolve it. The prebuilt layout contained no dependency
tree the function could use. Bundling the handler into one CJS file with esbuild removed the
resolution surface entirely. Lesson: test a serverless artifact in a directory with no
ancestor `node_modules`, or bundle it so the question cannot arise.

## 2026-11-16 — React owns <html>; script-set attributes do not survive navigation

The dark theme looked correct on first paint, then a language switch reset it to light.
The boot script had set `data-theme` on `<html>`, but React re-rendered the layout with its
own props and removed the attribute. The `next/script` boot also still warned because the
locale layout is not the true root layout. A server-read cookie rendered as a React prop
fixed both. Lesson: if an attribute must survive client navigation, React must own it, not
a boot script.

## 2026-11-16 — Generated deploy output poisons lint

`pnpm lint` suddenly reported 1859 problems from `.vercel/output` and the 6.3 MB
`apps/api/api/index.cjs` bundle. Neither is source, but ESLint does not read `.gitignore`.
Explicit ignores for `**/.vercel/**` and the generated bundle restored a clean run. Lesson:
lint configuration needs the same exclusions as the repository.

## 2026-11-16 — A field named `language` becomes a MongoDB text-index override

Seeding a course failed with `language override unsupported: bn`. MongoDB text indexes read
a field named `language` as the stemming language by default, and the Course model uses
`language` for the UI locale. The index now sets `language_override: 'textLanguage'` and
`default_language: 'none'`. Lesson: any schema with a `language` field and a text index needs
the override named explicitly.

## 2026-11-16 — Mongoose named exports fail under tsx ESM

The API crashed on boot with `The requested module 'mongoose' does not provide an export
named 'models'`; Vitest had hidden this through its CJS interop. Importing mongoose's
default export and destructuring `Schema`, `model` and `models` works in both tsx and the
bundle. Lesson: exercise the real runtime entry point, not only the test runner.

## 2026-11-16 — Memory MongoDB is a 780 MB one-time download

`mongodb-memory-server` postinstall fetched MongoDB 8.2.6 (781 MB) and pnpm blocked the
script until `allowBuilds` included it. Once cached it starts in under a second. Lesson:
budget for the binary on a fresh clone and document that `pnpm db:dev` is the only local
database step.

## 2026-11-16 — $toObjectId is not accepted inside an aggregation $match

Saving a review failed with `MongoServerError: unknown operator: $toObjectId`. Mongoose casts
object ids in ordinary queries, but an aggregation pipeline receives raw BSON, and this
MongoDB build rejects `$toObjectId` in `$match`. The average now reads the small rating list
and computes it in JavaScript, which also removes the cast question entirely.
Lesson: aggregation bypasses schema casting; convert ids before the pipeline or stay in the
query API when the set is small.

## 2026-11-16 — A quiz pass test must use the real pass fraction

A test expected a 5/10 quiz to pass, but `scoreQuiz` requires 60 percent. The code was right
and the test was wrong. Lesson: assert the boundary with numbers that actually sit on it
(6/10), not numbers that merely feel close.

## 2026-11-16 — Session cookies are host-scoped; keep local origins identical

The PayBridge return URL used `localhost` while the browser session was opened on
`127.0.0.1`. The return page lost the session even though both names reach the same dev
server. Local origins are now consistently `127.0.0.1` in `APP_URL`, `PAYBRIDGE_BASE_URL`
and `PAYBRIDGE_PUBLIC_URL`. Lesson: a redirect between hostnames is a different cookie jar.

## 2026-11-16 — React's purity lint rejects `Date.now()` inside a server component

The live page split sessions into upcoming and past with `Date.now()`, and `eslint` failed
with `react-hooks/purity`. The fix was not a disable comment: the database query now takes
an explicit `upcoming | past | all` window, so the page receives already-split rows.
Lesson: push time-dependent selection into the query boundary rather than hiding impurity.

## 2026-11-16 — axe finds what sighted review misses

The first axe run found a brand link whose aria-label hid its visible text, unnamed
progress bars and low-contrast meta text. All were fixed at the component/token level;
zero violations now hold on four pages. Lesson: run axe before calling a visual pass done.

## 2026-11-16 — A webhook that creates its dedupe row before failing blocks the retry

The first PayBridge delivery was accepted by signature verification but the handler looked up
`PS-…` with `findById`, which expects an ObjectId. It recorded the webhook event id and then
failed, so the retry was treated as a duplicate. `markOrderPaid` now resolves either a Mongo
id or our order number, and the event row is written in the same guarded path as the order
update. Lesson: write the idempotency marker and the state change as one unit, or make the
marker lookup tolerant of both gateway and local identifiers.

## 2026-11-17 — Echoing a connection string into a shell command leaks it

A diagnostic `node -e` script interpolated the Atlas URI into a Windows `cmd` argument. The
shell rejected the syntax and printed the whole string, password included, into the log. The
database password was rotated immediately, and the three ignored env files plus the Vercel
projects and the GitHub secret were updated. Lesson: never interpolate a secret into a shell
argument; pass it through the child process environment and read it inside the script.

## 2026-11-17 — A Vercel project's rootDirectory is relative to the deploy directory

Running `vercel --prod --cwd apps/paybridge` failed with "The specified Root Directory
apps/paybridge does not exist" because the CLI joined the two paths. Deploy monorepo projects
with `--cwd .` and `--project <name>`; for a prebuilt output, build inside the app directory
and deploy from the repository root. The same mistake created a stray `api` project, which is
a reminder to pass `--project` explicitly.

## 2026-11-17 — Stripe's hosted Checkout is an iframe form now

The production Stripe test failed on `#cardNumber` because current Checkout renders its card
fields inside an iframe and exposes them by role and label. Playwright has to use
`page.frameLocator('iframe').first()` with `getByRole('textbox', { name: 'Card number' })`.
Lesson: locate hosted payment fields by their accessible names, and re-check the page snapshot
rather than assuming the legacy element ids.

## 2026-11-17 — A demo fixture 30 minutes out expires mid-suite

The seeded live class started 30 minutes after seeding, so the later tests in a three-minute
production run found no upcoming room. Anchoring it two hours ahead keeps the room upcoming
for a full run and still reads as a real class. Lesson: fixtures that other tests depend on
need a window longer than the suite, not just longer than the next page load.

## 2026-11-17 — Playwright writes to the real database

The journey suite registers a learner and publishes a course on every run, so Atlas
accumulates `e2e-*` rows. That is the right trade-off for production proof, but the demo needs
a cleanup step and the seed must stay idempotent. Lesson: end-to-end tests against production
should own a recognisable namespace that can be deleted safely.

## 2026-11-17 — Muted grey text fails axe on the page it was copied onto

The course page reused `--color-ink-subtle` for meta lines, lesson durations and the FAQ
eyebrow. That token is around 3.6:1 on the paper background, so axe reported 14 contrast
failures that the landing page had never exposed, because there the same colour sat on larger
text. Lesson: run axe on every new page, and reserve `ink-subtle` for decoration rather than
body-sized text.

## 2026-11-17 — Next.js puts the page title into the route announcer

After adding a heading assertion, `getByText('Certificate of completion')` matched both the
`h1` and the hidden `#__next-route-announcer__` element, so the test failed in strict mode.
Assert on the heading role instead. Lesson: locate visible landmarks by role, not by text that
the framework also mirrors for screen readers.

## 2026-11-17 — Journey rows leak into public "related" sections

The production suite creates temporary courses, and the new related-courses row surfaced them
on a seeded course page. The seed already owned the catalogue, but nothing removed the test
rows. `pnpm db:cleanup-e2e` now deletes the `e2e-` namespace and its dependants; run it after a
suite when the demo should look like the screenshots.

## 2026-11-17 — A redirect loop looks like a blank page

After account deletion, the dashboard sent the stale token to sign-in and the sign-in page sent
the session straight back, so production rendered a header, a footer and nothing else. The trace
network log named both URLs and settled it in a minute. Clear the cookie in the deleting action,
and have each page verify the record it is about to trust.

## 2026-11-17 — Use the heading role when the route announcer repeats text

`getByText('2 courses')` matched both the cart heading and Next.js's route announcer. Assertions
that name a heading or a landmark survive navigation announcements; plain text does not.

## 2026-11-17 — The header repeats the page's own link

The sign-in link exists in the masthead, so a page-level "Sign in" link makes
`getByRole('link', { name: 'Sign in' })` match twice. Scope the assertion to `#main`; the
same fix applies to any label that also appears in navigation.

## Axe measures the frame it is given

Entrance fades make text translucent for a few hundred milliseconds, and axe reports the
blended colour as a contrast failure. The scan now waits for the settle instead of removing the
motion. Separately, a `<summary>` with an `aria-label` failed label-content-name-mismatch
because the visible initials were not in the label; the menu now lets its own text name it, and
the brand link no longer overrides its visible bilingual wordmark.

## Measure the page, not the intention

Parallelising three reads on the course page looked obviously faster, but production TTFB did not move outside noise. Keep the code, drop the claim. A performance change without a measured delta is a readability change.

A summary element is announced as a disclosure, not a button, so tests should target the element rather than a role Chromium may not expose.

## A public reply needs the same visibility as its review

The reply lives on the review row so hiding a review cannot leave an orphan answer on the course page. That is also why the public query returns the reply fields directly instead of joining a second collection.

A payout marker is not a payment. Naming the action "Mark paid" and showing the date keeps the record honest while the actual transfer stays outside the product.

## 2026-11-17 — Test names that read like UI labels collide with aria-labelledby

A Playwright label lookup is substring-based by default, so `getByLabel('Code')` matched both the code input and the two `<section aria-labelledby>` regions whose names contained "code". Use `{ exact: true }` for a short label when nearby headings share its word. The same run also showed that an in-memory Mongo can accept a duplicate before its unique index is built; application-level existence checks make the first request win deterministically, and the index stays as the race guard.
