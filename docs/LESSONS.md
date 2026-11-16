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
