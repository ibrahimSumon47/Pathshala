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

## 2026-11-16 — A Stripe CLI can point at another project's sandbox

The Stripe CLI is configured against a sandbox named for a different project. Lesson:
never assume a configured CLI belongs to this project; check the sandbox name in the
response before creating prices, products or webhooks.

## 2026-11-16 — Checksums verify filenames, not just bytes

The CI secret job saved the gitleaks tarball as `/tmp/gitleaks.tar.gz` while the checksums
file lists `gitleaks_8.30.1_linux_x64.tar.gz`, so `sha256sum -c` failed before any scan
ran. Keep the release filename when verifying a checksum.
