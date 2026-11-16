# AGENTS.md

Pathshala is a bilingual (Bangla/English) course marketplace. This file is the contract
for anyone — human or agent — working in the repository. `CLAUDE.md` and `GEMINI.md`
point here; do not duplicate these rules elsewhere.

## Read before touching code

1. `docs/PROJECT_STATE.md` — where the build actually is.
2. `docs/HANDOFF.md` — the one next step.
3. `docs/DECISIONS.md` — why the stack looks like this.
4. `docs/OWNER_TODO.md` — what is blocked on the owner.
5. `docs/features.json` — the checklist that `node scripts/check-done.mjs` enforces.

Update `PROJECT_STATE`, `features.json` (with evidence), `HANDOFF` and `LESSONS` after
every slice. A slice is not finished until the docs say so.

## Non-negotiable rules

### Identity and history

- Only the owner's global identity may author commits:
  `Md Ibrahim Hossain Sumon <ibrahimsumon005@gmail.com>`. Verify with
  `git config user.name` / `git config user.email`; never change them.
- Never use `--author`, `--trailer`, `Co-authored-by`, `Signed-off-by`, "Generated with"
  or any tool, bot or AI name in commits, file headers, code comments or the README.
- One branch: `main`. No feature branches, pull requests, forks, dependabot, renovate, or
  workflows that commit/push. Hooks in `.githooks/` must stay enabled
  (`git config core.hooksPath .githooks`) and must never be bypassed with `--no-verify`.
- After every push: `git log --format='%h %an <%ae>' -5` and
  `gh api repos/ibrahimSumon47/Pathshala/contributors --jq '.[].login'` must show only
  `ibrahimSumon47`. Anything else stops feature work until history is clean.

### Secrets

- `.env*`, keys, tokens, service accounts, `private/`, dumps and uploads never enter git.
  `.gitignore` is the first line of defence; gitleaks runs in pre-commit and CI.
- Secrets are copied from `private/.env.local` into GitHub (`gh secret set`) and Vercel
  (`vercel env add`) — by path, never echoed to chat or logs.
- Check `git status` and `git diff --cached --stat` before every commit.

### Free forever

- No trials, cards, expiring credits or watermarks. Before relying on a service, read its
  current pricing page and record the date and finding in `docs/DECISIONS.md`.
- Render's free tier is used by another project and is banned here.
- If a service stops being free, say so and propose a replacement.

### CLI first

- Do the work through `gh`, `vercel`, `atlas`, `stripe`, `gcloud`, `pnpm` and `node`.
- If something genuinely needs a browser (account creation, OAuth console, captcha,
  payment page), write click-by-click steps in `docs/OWNER_TODO.md` and continue with
  unblocked work. Do not invent credentials.

## Product rules

- Bilingual by default: Bangla and English are both first-class. Bangla copy must read
  like a person wrote it, using a real Bangla font; run a second pass on it.
- Calm, warm design: one accent colour, real type scale, 8-pt spacing, light default and
  a proper dark theme, matching skeletons, honest empty and error states, motion that
  respects `prefers-reduced-motion`.
- Banned: gradient text, neon glow, glassmorphism, sparkle icons, "AI-powered" badges,
  identical icon-card grids, invented testimonials/logos/metrics, emoji as design,
  generic marketing filler.
- The shipped site never explains how it was built. GitHub links, test counts and credits
  belong in `README.md` and `docs/` only.
- Payments are test mode and every payment screen says so.

## Engineering rules

- pnpm workspace. One small, single-purpose module or component at a time.
- Readable code. Every function gets a short comment, and every non-obvious step explains
  *why*, not what.
- API follows OOP and SOLID: thin controllers, services behind interfaces, dependency
  injection, no business logic in route handlers.
- Validation at boundaries (zod or class-validator), typed DTOs, a single error envelope,
  rate limits on auth and payment routes.
- Money is integer minor units. Never floats.
- Use a real data structure where it fits (reminder scheduling uses a binary min-heap,
  complexity recorded in `docs/DECISIONS.md`).
- Tests: Vitest for units, Playwright for end-to-end. Never weaken a test to make it pass.
- Conventional, specific commit subjects in the owner's voice. One push per finished
  slice, at most 10 pushes per session, only with green tests and CI. Vercel Hobby has a
  daily deployment cap, so batch deploys per slice.

## Definition of done (per slice)

1. Behaviour works locally and the checks for the touched package pass.
2. New or changed logic has a test; existing tests are untouched or strengthened.
3. `node scripts/check-done.mjs` status is updated honestly for the features touched.
4. `PROJECT_STATE`, `HANDOFF` and `DECISIONS` reflect the new reality; surprises go in
   `LESSONS`.
5. Commit authored by the owner, hooks enabled, then the contributor check after push.

`node scripts/check-done.mjs` exits non-zero until every feature is `done` with evidence.
That is expected during the build and must not be worked around.

## Planned layout

```
apps/web        Next.js app (catalog, learning, instructor, admin, i18n)
apps/api        NestJS API
apps/paybridge  Standalone sandbox payment gateway (own Vercel project + database)
packages/*      Shared types, design tokens, config
docs/           Project memory (state, handoff, decisions, lessons, features)
scripts/        Repository tooling, including check-done
```

Exact commands are added here as each package lands.
