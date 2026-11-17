# Expansion plan

The owner's expansion brief numbers fourteen product items. Slices are built one at a time,
each with a UI, an API or data path, tests, a production check and documentation, and one push
when it is green. This file exists so the order and the agreed scope survive a runner restart.

## Agreed order

`9, 1, 2, 13, 4, 3, 5, 6, 12, 11, 10, 7, 8`

## Status

| Item | Scope as agreed | Slice | Commit | Status |
| --- | --- | --- | --- | --- |
| 9 | Course page depth: outcomes, requirements, audience, FAQ, syllabus durations, instructor card, rating histogram, related courses, preview lesson, refund policy, studio fields | P9 | `2dde7f3` | done, production verified |
| 1 | Learner account: settings (name, photo, language, theme, password, notification preferences, delete account), notification centre, wishlist, cart with multi-course checkout, order history with PDF invoices, continue-learning position, streaks and badges, bookmarks and notes, lesson resources | P10 | `fb23227` | done, production verified |
| 2 | Discovery: both-script search, subject/level/language/price filters, price buckets, rating and recency sorting, URL-backed query parameters, best-rated home shelf, learner recommendations | P11 | `383d02c` | done, production verified |
| 13 | Not recorded yet | — | — | **next** |
| 4 | Not recorded yet | — | — | queued |
| 3 | Not recorded yet | — | — | queued |
| 5 | Not recorded yet | — | — | queued |
| 6 | Not recorded yet | — | — | queued |
| 12 | Not recorded yet | — | — | queued |
| 11 | Not recorded yet | — | — | queued |
| 10 | Not recorded yet | — | — | queued |
| 7 | Not recorded yet | — | — | queued |
| 8 | Not recorded yet | — | — | queued |

The wording for items 13, 4, 3, 5, 6, 12, 11, 10, 7 and 8 is not in the repository. Replace
"Not recorded yet" with the brief's own sentence before starting that slice; do not guess the
scope from the item number.

## Rules that apply to every item

- Bilingual Bangla and English copy, written rather than machine-translated.
- A `docs/features.json` entry per shipped capability, with evidence that can be checked.
- Owner-blocked steps go to `docs/OWNER_TODO.md` and never block the slice.
- Video lessons stay off in production; the model stays ready for YouTube and the public site
  never announces video readiness.
- Payments and live classes stay in test mode and say so.
- Free forever: no trial, card or expiring credit.
- Owner identity only in commits, `main` only, one push per finished slice, contributor check
  after every push.
