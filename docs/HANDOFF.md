# Handoff

Updated: 2026-11-16, after the design, i18n and model slice.

## Where we are

The bilingual shell is real: tokens, primitives, next-intl routing, fonts and the Mongoose
models all exist and pass 37 tests. The catalogue page is an honest empty state because no
course authoring exists yet. There is no auth, no API service and no database connection.

## Exact next step — finish Phase 1

1. Ask the owner to finish `OWNER_TODO.md` items 1 and 3 (Atlas cluster, Google OAuth
   client). They block the database connection and Google sign-in, not the code below.
2. Add Auth.js v5:
   - `apps/web/src/auth.ts` with Google and credentials providers, JWT sessions;
   - argon2 password hashing for seeded demo accounts; never store plain text;
   - role helpers (`requireRole`) used by server components and route handlers;
   - sign-in and sign-up pages using the Field and Button primitives;
   - session-aware header state (name, sign out) and protected `/(dashboard)` group.
3. Add `apps/api` (NestJS):
   - health route plus one course read behind DI and a service interface;
   - global validation pipe, exception filter with one error envelope, rate limiting;
   - wrap it as a single Vercel serverless handler and measure cold start;
   - record the hosting verdict in `DECISIONS.md`; if Vercel is unsuitable, choose a
     verified free host that is not Render.
4. Add a Mongo connection helper with a serverless-safe cached promise, and seed three
   demo accounts (student, instructor, admin) without committing their passwords.
5. Update docs and `features.json`, run every gate, then push once.

Do not start P2 (course authoring) until P1 is green.

## Files worth knowing

- `apps/web/src/i18n/{routing,request,navigation}.ts` — locale contract.
- `apps/web/src/components/ui/*` — primitives and their tests.
- `packages/tokens/theme.css` — colour and spacing source of truth.
- `packages/db/src/models/*` — schemas; `Lesson.video` is the reserved video slot.

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
```
