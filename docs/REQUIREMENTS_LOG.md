# Requirements log

## Intake — 2026-11-16

The owner answered the four intake questions. Sensitive details stay in the private,
gitignored intake file; this is the public summary.

| Question | Answer | Effect on the build |
| --- | --- | --- |
| Existing accounts | None assumed; owner asked for a check and setup steps | CLIs were audited. Missing logins and consoles get click-by-click steps in `docs/OWNER_TODO.md`. |
| Brand direction | Warm, educational, light by default | Warm paper surfaces, one calm accent, real dark theme, no gradient/neon/glass. |
| Seed topics | Any subject — people teach and learn anything | Catalog and seed data span unrelated subjects; categories are not programming-only. |
| Anything else | Nothing; build exactly the spec | No scope additions, no features beyond the phase list. |

## Product intent

Pathshala is a bilingual (Bangla/English) online learning marketplace: instructors
publish courses with sections, lessons, quizzes and live sessions; students enrol, learn,
take quizzes, ask questions and earn verifiable certificates; admins moderate courses and
users. Payments run through Stripe test mode and through PayBridge, our own sandbox
payment gateway.

The site ships as a portfolio piece, so the visible product must read as a finished
platform. Build details, test numbers and credits live only in README and docs.

## Fixed constraints

1. One branch (`main`), one author, no pull requests, no automation that commits.
2. No secrets, private notes, dumps or uploads in git.
3. Only services that are free forever — no trials, cards or expiring credits. No Render.
4. CLI first; owner-only browser steps are written down once and not repeated.
5. Everything is recoverable from `AGENTS.md` and `docs/` alone.

## Assumptions made (changeable, tracked in DECISIONS.md)

- Primary currency is BDT (৳), stored as integer poisa; USD is shown secondarily where a
  gateway requires it.
- Default locale is Bangla, with an always-visible switch to English. The product is
  Bangladesh-first; reviewers can switch in one click.
- An email sender is optional. In-app notifications are the baseline; email is added only
  if a free sender is verified at the time (P5).
- The owner's existing accounts are reused rather than new ones created.

## Phase scope

P0 setup · P1 foundation · P2 courses · P3 learning · P4 payments · P5 live classes ·
P6 trust · P7 quality · P8 portfolio package. Each phase ends with tests, a docs update
and one push. `docs/features.json` is the authoritative checklist.
