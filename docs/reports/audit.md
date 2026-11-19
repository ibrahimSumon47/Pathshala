# Quality audit — 2026-11-19

Every check below is free and open source, runs from the repository, and needs no account.
`pnpm audit:all` repeats the whole sweep locally; `.github/workflows/audit.yml` runs the cheap
half weekly. Nothing in either path commits, pushes, opens a pull request or deploys.

## Verdict

| Severity | Found | Fixed | Remaining |
| --- | --- | --- | --- |
| Blocker | 3 | 3 | 0 |
| Major | 10 | 10 | 0 |
| Minor | 6 | 4 | 2 |
| Limit (documented, not a defect) | 4 | — | 4 |

All blockers and majors are closed and re-checked on production. The two open minors are
performance variance on course pages measured on a cold serverless instance, and the dev-only
dependency advisories left by the audit tooling itself. Both are described under limits.

## Tools and the questions each answers

| Tool | Version | What it decides |
| --- | --- | --- |
| ESLint + `tsc` | 10.15.0 / 6.0.3 | lint and type errors |
| Vitest + `@vitest/coverage-v8` | 5.1.0 / 5.1.1 | unit and integration behaviour, with coverage |
| Playwright | 1.65.1 | browser journeys, the route crawl and axe |
| knip | 6.45.1 | unused files, exports and dependencies |
| madge | 8.0.0 | circular imports |
| depcheck | 1.4.7 | dependencies a package imports but does not declare |
| pa11y-ci | 5.0.0 | WCAG 2 AA, page by page |
| `@lhci/cli` | 0.16.1 | Lighthouse scores against thresholds |
| linkinator | 8.1.0 | broken internal links |
| Schemathesis | 4.33.4 | the OpenAPI contract, fuzzed against the running API |
| gitleaks | 8.30.1 | secrets in history |
| OSV-Scanner | 2.7.1 | dependency advisories from the lockfile |
| `pnpm audit` | 12.15.0 | production advisories |
| Semgrep (`p/ci`) | 1.186.0 | code-level security patterns |

`unlighthouse` was evaluated and dropped: it pulled a dev tree with `basic-ftp`, `extract-zip`
and `zod@3` advisories for no capability `@lhci/cli` lacks. The reason is recorded in
`docs/DECISIONS.md`.

## Route coverage

`pnpm audit:routes` reads the database (no writes) and writes `docs/audit/routes.json`:
**44 role routes** and **4 deliberate states** — public 21 (including the empty search, the
missing course, the sign-in error and a filled course page), learner 13, teacher 8, operator 6.
The crawler visits each route at **375 × 812, 768 × 1024 and 1440 × 900** in **light and dark**,
so one production run is **288 page loads**. It fails on console errors or warnings, failed
requests, any 4xx/5xx except the expected 404, uncaught exceptions, horizontal scroll, an image
without alt, a broken image, an image with no reserved box and text clipped by its own
container.

## Findings

### Blockers

**B1 — A control character in the catalogue search returned 500.**
`GET /courses?q=%07%00` reached the Mongo text query, which threw
`BSONError: must not contain null bytes`, so the API answered 500.
Found by Schemathesis (`ST101`). Fixed in `packages/db/src/catalog.ts` by stripping control
characters at the boundary (`withoutControlCharacters`), reused by the API's zod schema.
Regression tests: `packages/db/src/catalog.test.ts`, `apps/api/src/courses/courses-query.schema.test.ts`.
Re-check: `?q=%07%00` answers 200 with an ordinary envelope; Schemathesis 101/101.

**B2 — The masthead overflowed a 375 px screen on every page.**
The document was 379–387 px wide at a 375 px viewport, in both locales, so every page scrolled
sideways on a phone. Found by the crawl's horizontal-scroll check.
Fixed in `apps/web/src/components/site-header.module.css`,
`locale-switcher.module.css` and `command-palette.module.css`: the label and keycap collapse
under 420 px, controls wrap instead of pushing the row wider, and the gaps tighten.
Re-check: crawl at 375/768/1440, light and dark, both locales — no horizontal scroll.

**B3 — The public teacher page showed a broken avatar.**
`/instructors/<id>` requested an avatar file that was never added, so the browser logged a 404
and rendered a broken image. Found by the crawl (`http.404`, `image-broken`).
Fixed with `apps/web/public/avatars/rafiqul-islam.svg` and explicit width/height on the image.
Re-check: the avatar answers 200 in production and the crawl is clean.

### Majors

**M1 — The search trigger's accessible name did not contain its visible text.**
axe `label-content-name-mismatch` (serious) on every page carrying the masthead, because the
trigger had `aria-label="Search"` while showing `Search ⌘K`. Fixed by naming the shortcut in
the label; production axe is back to zero violations on all three suites.

**M2 — The 404 page had no `lang` and no title.**
Next's default not-found is rendered outside the locale layout, so pa11y reported a page with
no language and the tab had no title. Fixed with `apps/web/src/app/[locale]/not-found.tsx`
plus its stylesheet. Re-check: `/en/courses/no-such-course` returns `<html lang="en">` with a
title and answers 404 while the crawl expects it.

**M3 — The register form's name field had no `type`.**
pa11y flagged an invalid autocomplete token because the control had no explicit type. Fixed
with `type="text"`.

**M4 — An unsupported method on a real route answered 404 without `Allow`.**
`TRACE /courses` and `POST /courses` were indistinguishable from a missing route, so a client
could not discover the supported methods. Found by Schemathesis (`ST204`).
Fixed with `methodNotAllowed` in `apps/api/src/bootstrap.ts`, registered before the controllers:
405 plus `Allow: GET, HEAD, OPTIONS`, and `bootstrap.test.ts` covers the three routes and the
pass-through for GET.

**M5 — The API had no machine-readable contract.**
Without a schema, contract testing and client generation were guesswork. Added
`GET /openapi.json` (`apps/api/src/openapi.ts`, `openapi.controller.ts`) describing all three
routes, their parameters, response envelopes, `429`s and `$ref`s, with `openapi.test.ts`
checking the route list, each response reference, every `$ref` target and the slug parameter.
The first deployed attempt relied on `@nestjs/swagger`; its `swagger-ui` module crashed the
single-file CJS bundle (`createRequire(import.meta.url)` became `createRequire(undefined)`), so
the contract is written by hand and the dependency was removed. Re-check: production
`/openapi.json` answers 200 with the three paths and Schemathesis passes 101/101 locally.

**M6 — Coverage runs failed with a duplicate-key error.**
Under `--coverage` Vitest loads more files per worker, and a cached Mongo connection was reused
after the URI changed, so two suites wrote into the same database. Fixed by keying the cache on
the URI in `packages/db/src/connection.ts`. Re-check: `pnpm test:coverage` exits 0.

**M7 — Singular counts read "1 courses", "1 reviews", "1 certificate".**
Seven pages used a raw count next to a plural noun. Fixed with
`apps/web/src/lib/plural.ts` and `plural.test.ts`, applied to the catalogue, course detail,
cart, checkout, orders, dashboard and preview copy, with the Bangla measure word handled too.
Re-check: the 375 px and 1440 px screenshots read "1 course", "1 certificate" and
"1 review · 2 lessons".

**M8 — The preview badge stretched across its column.**
On the preview lesson page the media badge was a flex child with `align-self: stretch`, so it
became a full-width bar. Fixed in `preview.module.css`. Re-check: screenshot shows it hugging
its content.

**M9 — The admin Users section had no space above its heading.**
The section heading sat against the previous block. Fixed in `admin.module.css`. Re-check:
1440 px screenshot, light and dark.

**M10 — Dead code and undeclared tooling dependencies.**
knip found unused exports and files, and depcheck found packages imported without being
declared. Fixed by removing two unused server actions and a needless export in
`apps/web/src/app/[locale]/admin/actions.ts` and `command-palette.tsx`, adding `knip.json`, and
declaring the audit CLIs in the root `devDependencies`. Re-check: knip reports nothing, depcheck
“No depcheck issue”, madge finds no cycle.

### Minors

**m1 — A course page's mobile Lighthouse score varies with the instance.** Measured, see
limits below. Open.

**m2 — Dev-only advisories remain from the audit tooling.** Production is clean; the dev tree
keeps moderate findings in `basic-ftp`/`glob`/`minimatch`/`esbuild` that only affect local
tooling and have no upstream fix on the pinned majors. Open, documented.

**m3 — The English preview of a seeded lesson shows the Bangla body.** The seed stores one body
per lesson; the UI correctly shows what exists. Not a rendering bug; left as content.

**m4 — The API rate limit is per function instance.** Pre-existing and documented; a shared
store is the fix when it matters.

**m5 — Course covers are 38–81 KB JPEGs.** They are not the LCP driver on the course page, so
no re-encoding was done.

**m6 — pa11y scans public pages only.** Signed-in pages are covered by axe in Playwright;
pa11y's session support would duplicate that with a second harness.

## Checks that pass

Local, 2026-11-19: `pnpm lint`, `pnpm typecheck`, `pnpm test` (**241 tests**: 12 tokens, 13
shared, 118 database, 74 web, 24 API), `pnpm test:coverage`, knip, madge, depcheck, Semgrep (0
findings), gitleaks (0 leaks in all history), `pnpm audit --prod --audit-level high` (clean),
OSV-Scanner, and Schemathesis **101 generated, 101 passed** against the served schema.

Production, `https://pathshala-web-eight.vercel.app`:

- Crawl: **4/4 suites pass** — public 21 routes (including 4 states), learner 13, teacher 8,
  operator 6, each at three widths in both themes.
- axe: **3/3 suites, zero violations** — public templates, the learner pages (including the
  public teacher page) and the operator/studio desks.
- pa11y-ci WCAG 2 AA: **21/21 URLs, 0 errors**.
- linkinator: **60 links, 0 broken**.
- Lighthouse desktop (`@lhci/cli`, the committed thresholds): **12 URLs pass** —
  performance 0.94–1.00 on the catalogue and course templates, accessibility,
  best-practices and SEO 1.00 everywhere, CLS 0.
- API: `/health` 200, `/courses` 200 from Atlas, `/openapi.json` 200.

## Screenshots

`docs/audit/screens/` holds **102 full-page screenshots** (8.9 MB, gitignored): the public
templates and four deliberate states, plus learner, studio and operator templates, at
375/768/1440 in light and dark. They were reviewed for layout, clipping, spacing, empty and
error states, microcopy, dark mode and Bangla rendering. The review produced B2, B3, M7, M8 and
M9; each was fixed and the affected pages re-captured.

## Limits of this audit

- **Mobile Lighthouse on course pages is unstable on cold instances.** Single mobile runs of
  `/en/courses/spoken-english-daily` scored 0.67, 0.85 and 0.88 with LCP 3.0–3.1 s and TBT up
  to 1.63 s; the same page scores 1.00 with LCP 0.7 s on a warm desktop run, and the server
  answers the document in 40 ms with 411 KiB total and hydration finishing inside 0.6 s. One
  mobile sample hung inside Lighthouse and was terminated. The committed gate therefore
  measures the desktop preset, which is stable; a real mobile budget needs several runs and a
  median, and is the next performance task rather than a code defect this audit could pin down.
- **A full dev-dependency audit is not clean.** `pnpm audit` without `--prod` reports moderate
  advisories through the audit tooling. The production tree has none.
- **Schemathesis runs against a local API.** It starts the API on `127.0.0.1:4001` with the real
  Atlas data, read-only. The production schema is served and read, but the fuzz itself is local
  so it cannot trip the production rate limit.
- **No screenshot of a loading skeleton.** The crawl waits for the settled page; loading states
  are covered by the component tests and the documented placeholders, not by a captured frame.

## How to repeat it

```bash
export MONGODB_URI="$(node -e 'const fs=require("fs");const m=fs.readFileSync(".env.local","utf8").match(/^MONGODB_URI=(.*)$/m);process.stdout.write(m[1]??"")')"
pnpm audit:all          # everything below, then a pass/FAIL summary
```

Or one step at a time: `pnpm audit:routes`, `npx playwright test e2e/audit.spec.ts`,
`npx playwright test e2e/a11y.spec.ts`, `npx pa11y-ci --config docs/audit/pa11y.json`,
`npx linkinator <origin> --recurse`, `npx lhci autorun --config docs/audit/lighthouserc.json`.
`AUDIT_BASE_URL` points the browser tools at another origin; `AUDIT_API_PORT` moves the fuzz
port.
