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

## 2026-11-17 — A unique order index needs a two-pass move

Swapping two lessons' `order` values one update at a time hits the unique `(course, section, order)` index on the first write, because the second row still holds the target value. Parking every sibling above the real range and then writing `1..n` avoids the collision and normalises gaps. Lesson: an ordering feature is a schema constraint problem before it is a UI one.

## 2026-11-17 — Automatic can mean "on the next visit"

A saved-search cron would need a scheduler and an owner account. The dashboard already runs a due check on load and the stored timestamp limits it to once a day, which is enough for an in-app inbox. Lesson: define what “automatic” has to guarantee before adding infrastructure; here it only had to mean “without pressing a button”.

## 2026-11-17 — A revocation is a field, not a delete

Deleting a certificate would break a printed verification code and erase the reason it was issued. `revokedAt` keeps the record, the public page reports it, and the operator can restore it. Lesson: when the artefact may exist offline, removal is a state change.

## 2026-11-17 — Test names that read like UI labels collide with aria-labelledby

A Playwright label lookup is substring-based by default, so `getByLabel('Code')` matched both the code input and the two `<section aria-labelledby>` regions whose names contained "code". Use `{ exact: true }` for a short label when nearby headings share its word. The same run also showed that an in-memory Mongo can accept a duplicate before its unique index is built; application-level existence checks make the first request win deterministically, and the index stays as the race guard.

## 2026-11-17 — Derive a queue position; do not store it

A stored waitlist position needs renumbering whenever someone leaves, and a failed renumber leaves two learners at #1. Deriving the place from `createdAt` keeps every read consistent and makes removal a single delete. The trade-off is a small count per read, which is cheap at classroom scale.

A Playwright text locator can match both the title and the metadata of the same card. When asserting that a removed row is gone, count the row itself (`li` filtered by text) instead of the text; otherwise strict mode fails before the assertion can tell you whether the row survived.

Logging out through a server action is a navigation. Call `signIn` only after the masthead shows its signed-out state, or the next `goto` can race the logout redirect and land back on the old account's dashboard.

## 2026-11-17 — A second partial index needs a different key order

Two Mongoose `schema.index()` calls on the same fields with different partial filters trigger a duplicate-index warning, and the second filter is ignored. Using `kind, session, user` for the seat-opening guard keeps the index genuinely distinct from the reminder guard. Lesson: when two uniqueness rules share fields, distinguish the key pattern, not just the filter.

A queue notification must be bounded by the number of seats actually opened. Telling every waiter whenever capacity is saved makes a routine edit look like a mass invitation. Compute `capacity - attendance` first, and let the notification query filter the rest.

An export route is an authorization boundary even when the page already checks the role. Resolve the course through the signed-in instructor (or admin) inside the data function, so a copied URL cannot export another teacher's class.

## 2026-11-17 — Match a localized subdocument by its dotted path

`Notification.findOne({ title: { en: 'Coupon use limit reached' } })` returned null because the stored title also has a `bn` field; Mongo compared the whole subdocument. Use `'title.en'` for a single field. Lesson: a localized label is a subdocument, not a scalar.

A queue read should defend itself even when a cleanup job exists. The dashboard purge handles accumulated rows, but `getWaitlistForStudent` also deletes the caller's rows for sessions that are no longer live, so a race or a missed dashboard visit cannot show a dead queue.

Two exports that look similar can still deserve separate routes. Attendance answers “who came and who waited”; the roster answers “how far did each learner get”. Splitting them keeps each file's columns and authorization intent obvious.

## 2026-11-17 — A filter must travel with its export

A filtered table and an unfiltered CSV are a trust bug. Parse the query once, pass the parsed values to both reads, and build the download URL from the same normalized values. Testing the empty-result filter and the status filter caught the difference immediately.

An audit helper is infrastructure, not an admin feature. Moving it into its own module made it usable from the live service without a circular import, while a re-export kept the public import path stable. Lesson: extract the dependency, not a copy.

Notification text is presentation. When another screen needs to group by an event, add a stable `ref` field and index it; matching on body strings would break the first time the copy is translated or reworded.

## 2026-11-19 — Confirm with a disclosure; clear on the event, not the glance

A native `<details>` is enough for a one-step confirmation. It keeps the server action untouched, needs no client bundle, and still gives keyboard users a visible summary. The open panel has to name the person and the consequence, or the confirmation is just an extra click.

Unread state should follow the action the note asked for. Clearing a seat note when the learner merely opens the live page would hide the prompt without freeing a seat; clearing it inside check-in makes the badge tell the truth. Scope the update by owner and session, then a shared helper cannot leak across rooms.

A filter that is not on the export is a reporting bug waiting for an audit. The audit desk and its CSV now share one query builder, and the export row stores the action it filtered by. When the two reads are separate functions, compare them in a test; the parity assertion caught nothing here, but it will catch the next divergence.

## 2026-11-19 — A save validates the whole document, including old rows

Adding a cover image exposed a dormant schema bug. The studio action loaded the course and
called `course.save()`, which re-validated every field; the seeded description was 432
characters long against a 200-character `localizedTextSchema`, so a picture upload failed with
500 "Course validation failed". The seed had written that text with `findOneAndUpdate`, which
does not run validators by default, and the studio's own save path had the same latent 500.
Two fixes: prose fields now use `localizedProseSchema`, and media actions write one field with
a scoped `updateOne`. Lesson: a small feature can be the first code path that ever validated a
document; check the whole schema, not just the field being touched.

## 2026-11-19 — `height` beats `aspect-ratio` on an img

The course cover markup passes `width` and `height` attributes so the browser can reserve the
box before the file loads. With only `width: 100%` in CSS, the presentational height attribute
is what applies: one revealed render measured the hero at 473×720 instead of 473×266, which
crops a 16:9 picture. Adding `height: auto` next to `aspect-ratio: 16 / 9` fixes it, and the
production journey now asserts the 16:9 box so the ratio cannot regress silently.

## 2026-11-19 — The preview browser's hidden Suspense boundary is not a page bug

Every streamed page measured 0×0 with a `<div hidden id="S:0">` wrapper while the loading
skeleton stayed on screen, including pages this slice never touched and the already-deployed
origin. That was the local browser panel, not the app: `curl` showed the content in the
streamed HTML with its reveal scripts, and Playwright against production read the same page
normally in the passes before and after. Lesson: when layout measurements contradict the HTML
and the same thing happens on a known-good deployment, check the harness before changing
application code.

## 2026-11-19 — A 200 from an image URL is not proof the row exists

The upload journey's last check asserted that a removed picture's URL returns 404. It returned
200, and the collection held no row for it: the edge cache was answering because the route is
served as immutable for a year. Deleting and long-caching the same URL are separate promises,
and the test was written against the wrong one.

Lesson: when a test asserts that a resource is gone, ask which layer could still answer —
browser cache, edge cache, service worker or a second copy of the data — and give the request a
cache-busting URL when the point is to test the origin. Assert the user-visible outcome (the
page no longer shows it) at the level the user sees it, and keep the underlying deletion check
separate.

## 2026-11-19 — A page loaded right after a save can show the old render

Two journeys failed intermittently on the first assertion after a studio save: the badge said
Draft while the course in Atlas was published, and the public page omitted a free-preview link
whose lesson already carried the flag. The writes were fine — a second load showed the change,
and the same steps pass locally against the memory MongoDB. The read that raced the write was
the problem, and a form that still holds the values typed into it made the studio look correct
even when the stored row disagreed.

The journey now reloads, up to eight times, until the persisted value appears, and reads stored
inputs from that fresh page instead of trusting the DOM right after an action. Lesson: an E2E
assertion made immediately after a mutation must name what it is testing — the write or the
render — and when the platform can serve a stale render, poll a fresh load with a bound rather
than either guessing or silently retrying forever.

## 2026-11-19 — Nothing inside a closed `<details>` reaches getByRole

The lesson video and free-preview controls sit in a collapsed disclosure, which is right for the
page. After a reload the inputs are not in the accessibility tree, so `getByRole('checkbox', …)`
reported "element(s) not found" while the input was in the DOM. Addressing the stored input by
its name (`input[name="isPreview"]`) also makes the assertion independent of whether the panel
is open. Lesson: for a persisted-value check, use the DOM selector; keep role locators for
things a reader actually interacts with.

The same run also showed that `getByLabel('Type')` matches "File type" too, so a select with a
short label needs `{ exact: true }` in a form that also asks for a file MIME type.

## 2026-11-19 — Next's route announcer is a second `role="alert"`

The refusal journey asserted the page's error alert with `getByRole('alert')` and failed in
strict mode with two matches: the form alert and `<div role="alert" id="__next-route-announcer__">`,
which announces the new page title after the redirect. Both are correct accessibility, so the
test was the thing to narrow. `p[role="alert"]` names the product's own feedback and stays
independent of the framework's announcement. Lesson: after a redirect, a role query that the
framework also uses is ambiguous; anchor it to the element the page renders.

## 2026-11-19 — A second refusal lands on the same URL as the first

The preview-video journey refuses an http link and then a relative path. Both failures redirect
to the same `?error=Preview%20video…` URL with the same sentence, so asserting the URL and the
alert after the second submit would pass even if nothing was posted a second time. The journey
now navigates to the clean studio URL between the two attempts, which makes the redirect itself
proof that the form ran. Lesson: an assertion about a repeated failure needs a starting state
that differs from the failed one, or it only re-reads the first result.

## 2026-11-19 — A bundled CJS function cannot carry swagger-ui

`@nestjs/swagger` looks small, but its `swagger-ui` module calls `createRequire(import.meta.url)`
at load. esbuild's CJS output stubs `import.meta` to `{}`, so the deployed function threw
`createRequire(undefined)` while the provider's own tests passed. The API now writes its three
routes' contract by hand and serves it, which also removed a dependency from the function.
Lesson: bundle the production artifact and require it in a bare directory before believing a
library is serverless-safe.

## 2026-11-19 — A prebuilt deploy from the repository root uses the root `.vercel/output`

The API's project root directory is `apps/api`, so `vercel build --cwd apps/api` writes
`apps/api/.vercel/output`. Running `vercel deploy --prebuilt` from the repository root uploads
`.vercel/output` next to the CLI, which was a stale copy from an earlier slice — production kept
answering with old code while every deploy reported Ready. Copying the fresh app output to the
root output fixed it. Lesson: after a prebuilt deploy, request the new route and check the
response, not just the deployment status.

## 2026-11-19 — A 250 MB upload is the local audit tooling, not the app

After adding a Python virtualenv and scanner binaries under `tools/`, the web deploy failed with
"File size limit exceeded (100 MB)" because the CLI uploads ignored-but-present files. A
`.vercelignore` with `tools`, `docs/audit`, `test-results` and `**/.vercel` brought the upload
back under the limit. Lesson: a new local tool directory belongs in `.vercelignore` the same day
it is created.

## 2026-11-19 — Overflow and clipped text are measured, not eyeballed

A 375 px viewport produced a 379–387 px document on every page, which no desktop screenshot
would ever show, and the Search label collapsed to 1 px behind an `overflow: hidden`. The crawl
now compares `scrollWidth` with `clientWidth` and each leaf's `scrollWidth` with its
`clientWidth`, skipping the 1 px visually-hidden pattern. Lesson: responsive bugs need a
measurement at the narrow width, in both themes and both locales.

## 2026-11-19 — An aria-label must contain the visible words

Hiding the visible "Search ⌘K" text on small screens and adding `aria-label="Search"` broke
axe's `label-content-name-mismatch`: the accessible name has to start with the visible label.
Naming the shortcut in the label fixed it. Lesson: when a control's visible text changes by
breakpoint, the label has to account for the widest version.

## 2026-11-19 — A single Lighthouse run on a cold function is not a measurement

Three mobile runs of the same course page scored 0.67, 0.85 and 0.88 with 3.0–3.1 s LCP, while a
warm desktop run scored 1.00 at 0.7 s; the document itself took 40 ms and hydration finished in
0.6 s. One more run hung inside Lighthouse. The gate now uses the stable desktop preset, and a
mobile budget needs a median of several runs before it means anything. Lesson: report the
conditions a score was taken under, and never tune a page against one noisy sample.

## 2026-11-19 — One page can hold two `videoUrl` fields

The lesson-video refusal first asserted the stored value with a page-level
`input[name="videoUrl"]` and failed: the add-lesson disclosure on the same studio page has its
own `videoUrl` field, so the locator matched two inputs, and a per-lesson check could have
filled the add form instead of the row. Binding the locator to the lesson row fixes both the
strict-mode failure and the ambiguity. Lesson: scope a control to the record it belongs to
before asserting on it, especially when a create form and an edit form share field names.
