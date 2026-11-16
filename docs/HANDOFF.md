# Handoff

Updated: 2026-11-16, after the API hosting and desktop visual slice.

## Where we are

Phase 1 is complete. Auth.js v5 signs in three demo roles with bcrypt-checked passwords,
carries roles in a JWT, protects `/dashboard` and `/admin`, and switches to MongoDB
automatically once `MONGODB_URI` exists. The NestJS API is live at
`https://pathshala-api-lake.vercel.app` as one self-contained bundle: `/health` answered in
1.411s on an idle first request (`uptime: 0`) and 0.674s warm, measured from Dhaka against
the `iad1` function region. `/courses` returns the honest 503 `database_unavailable` until
Atlas exists. Two earlier deployments failed on module resolution, so three Hobby
deployments were used to get this one live.

The theme is now a server-read cookie rendered as `data-theme` on `<html>`; a 1440px
light/dark pass found that a soft language switch used to drop the attribute, and this
change keeps dark across navigation without a boot script or React warning.

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

1. Owner: finish `OWNER_TODO.md` items 1 and 3 (Atlas cluster, Google OAuth client). Add
   the Google redirect URI for port 59800 as well as 3000; the API domain is not an OAuth
   callback, so the production web callback waits for a web deployment.
2. Once `MONGODB_URI` is in `private/.env.local`, set it on the Vercel project, redeploy the
   API and verify a Mongo-backed `/courses` 200. That redeploy is the next allowed
   deployment; do not spend one before the URI exists.
3. Start P2: categories, course/section/lesson authoring, instructor UI and the catalogue
   with search, filters and pagination. The API contract is already deployed and can grow
   with the catalogue.

## Local commands

```bash
pnpm install
pnpm dev                             # web on the configured Next port
pnpm --filter @pathshala/api dev     # API on :4000 (ignores PORT=0)
pnpm --filter @pathshala/api bundle  # generated, gitignored api/index.cjs for Vercel
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm run audit                       # production dependency audit used by CI
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
- `apps/api/api/index.cjs` — generated bundle; `vercel.json` builds it and rewrites to it.
- `apps/api/src/courses/*` — repository seam, service, Zod query schema and controller.
- `apps/web/src/lib/theme.ts` and `components/theme-toggle.tsx` — the cookie theme contract.
- `packages/db/src/connection.ts` — cached Mongo connection used by web auth and the API.
- `packages/tokens/theme.css` — colour and spacing source of truth.

## Current gate

`node scripts/check-done.mjs` exits non-zero while features remain open. P1 is 6/6 and the
project is 13/47, with 34 features still to build. The gate must exit 0 before the final
handover, which also means every later phase's evidence exists.
