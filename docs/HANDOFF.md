# Handoff

Updated: 2026-11-16, end of P0.

## Where we are

The workspace, guards, CI and feature gate are in place. `apps/web` is a bilingual
holding page, not the product; `packages/shared` holds the money primitives. Nothing is
deployed.

## Exact next step — start Phase 1

1. Ask the owner to finish the first two items in `docs/OWNER_TODO.md` (Atlas re-login and
   M0 cluster, Google OAuth client). They block the database and sign-in work, not the
   design system; start on the design system while waiting.
2. Add `packages/tokens`: warm paper palette, one accent, real type scale, 8-pt spacing,
   radii, motion durations, and a matching dark set. Then the first primitives (Button,
   Field, Select, Card, EmptyState, Skeleton, Toast) with Vitest tests where behaviour is
   non-trivial.
3. Add next-intl with Bangla as the default locale and English at `/en`; self-host Noto
   Sans Bengali (and a Latin companion) through `next/font`; move the holding page copy
   into message files.
4. Add the MongoDB connection and Mongoose models: User (roles), Category, Course,
   Section, Lesson (rich text body, attachments, `videoUrl` reserved), Enrolment, Order,
   AuditEvent. Indexes and validation included.
5. Add Auth.js v5 (Google + seeded credentials, JWT sessions), role checks and route
   protection. Seeded demo accounts cover student, instructor and admin.
6. Spike the API hosting decision: wrap NestJS as one Vercel serverless handler with a
   health route and one course read, measure cold start, and record the verdict in
   `DECISIONS.md`. If it fails, choose a free host that is not Render and record why.
7. Update docs, run every gate below, commit and push once.

Do not begin P2 (course authoring) before P1 gates are green.

## Work already done that should not be repeated

- Hooks, gitleaks, CI, CodeQL and the feature gate.
- Money handling and its tests.
- The Next.js build pipeline (Turbopack, Next 16.4.6).

## Current gate

`node scripts/check-done.mjs` exits non-zero while features remain open. Run it for the
live count; it must exit 0 before the final handover.

## Useful commands

```bash
pnpm install
pnpm dev
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm audit
pnpm check:commits
node scripts/check-done.mjs
git config --get core.hooksPath        # expect .githooks
```
