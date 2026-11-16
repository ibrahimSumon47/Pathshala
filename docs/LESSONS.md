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
