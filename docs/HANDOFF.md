# Handoff

Updated: 2026-11-16, after the auth and API slice.

## Where we are

Phase 1 is complete except the API hosting spike. Auth.js v5 signs in three demo roles with
bcrypt-checked passwords, carries roles in a JWT, protects `/dashboard` and `/admin`, and
switches to MongoDB automatically once `MONGODB_URI` exists. The NestJS API serves health and
a validated catalogue read, uses one error envelope, and limits each address to 60 requests a
minute. The Vercel function adapter exists but has not been deployed or measured.

The catalogue is still an honest empty state: there is no course authoring and no database
connection yet. Atlas and Google OAuth remain owner tasks.

## Demo access (public by design)

| Role | Email | Password |
| --- | --- | --- |
| Student | `student@pathshala.dev` | `student-demo-2026` |
| Instructor | `instructor@pathshala.dev` | `instructor-demo-2026` |
| Admin | `admin@pathshala.dev` | `admin-demo-2026` |

Demo accounts are on by default in development and off in production unless
`DEMO_AUTH=true`. Set `DEMO_AUTH=false` to remove them anywhere. They are bcrypt-hashed in
`apps/web/src/lib/auth/accounts.ts`; no plain passwords are stored for auth.

## Exact next step

1. Owner: finish `OWNER_TODO.md` items 1 and 3 (Atlas cluster, Google OAuth client). Once
   `MONGODB_URI` is present, auth reads users from Mongo and the catalogue stops returning
   503; no code change is needed. Add the Google redirect URI for port 59800 as well as 3000.
2. Owner: approve an API deploy. Then create the Vercel project for `apps/api`, set
   `MONGODB_URI` and `WEB_ORIGIN`, deploy and record cold-start numbers in `DECISIONS.md`.
   The one-function adapter is `apps/api/api/index.ts`; verify `/health` and `/courses` on
   the deployed origin before marking `p1.api-hosting` done.
3. Then start P2: categories, course/section/lesson authoring, instructor UI and the
   catalogue with search, filters and pagination. Do not start P2 while hosting is open if
   the catalogue would depend on a deployed API.

## Local commands

```bash
pnpm install
pnpm dev                             # web on the configured Next port
pnpm --filter @pathshala/api dev     # API on :4000 (ignores PORT=0)
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm audit
node scripts/check-done.mjs
```

Environment for the web app: copy `apps/web/.env.example` to `apps/web/.env.local` and set
`AUTH_SECRET` (required in production). Google is optional; the button only appears when
both `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` exist. The API reads `apps/api/.env.example`.

## Files worth knowing

- `apps/web/src/auth.ts` — providers, JWT callbacks, role claims.
- `apps/web/src/lib/auth/{accounts,guard,roles}.ts` — account seam, page guards, pure checks.
- `apps/web/src/app/[locale]/{sign-in,dashboard,admin}` — the visible auth surfaces.
- `apps/api/src/{app.module,bootstrap,serverless}.ts` — Nest wiring and shared runtime config.
- `apps/api/src/courses/*` — repository seam, service, Zod query schema and controller.
- `packages/db/src/connection.ts` — cached Mongo connection used by web auth and the API.
- `packages/tokens/theme.css` — colour and spacing source of truth.

## Current gate

`node scripts/check-done.mjs` exits non-zero while features remain open. Auth and API
hardening are done; API hosting is in progress. It must exit 0 before the final handover,
which also means every later phase's evidence exists.
