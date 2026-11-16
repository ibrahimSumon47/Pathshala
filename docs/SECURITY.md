# Security review

Recorded 2026-11-16 for P7 against the OWASP Top 10 and the project's own boundaries.
This is a small marketplace, not a payment processor: test mode is the only mode shipped.

## Access control

- Every signed-in surface calls `requireUser` or `requireRole` from
  `apps/web/src/lib/auth/guard.ts`; `/admin` requires the admin role and `/studio` accepts
  instructor or admin.
- Course reads and writes use the enrolment record, course ownership or the admin role.
  `getSessionForViewer` and `checkInToSession` repeat that check in the database layer, so a
  crafted session id cannot bypass the page guard. The outsider case is covered by
  `packages/db/src/live.integration.test.ts`.
- Admin mutations forbid changing admins and the acting account, and every change writes an
  `AuditEvent`. Course status changes are validated against the enum.
- Public certificate lookup is by random 16-character code only. Learner email is never
  rendered on the certificate page.

## Injection and output

- All Mongo access goes through Mongoose models with typed filters; no raw query string or
  `$where` is built from request data.
- Boundary input is parsed with Zod in server actions and API DTOs. Lesson HTML is sanitized
  with an allowlist before storage and render.
- CSV export quotes every cell and prefixes `=`, `+`, `-`, `@`, tab and CR with an apostrophe,
  blocking spreadsheet formula injection. Unit-tested in `apps/web/src/lib/csv.test.ts`.
- The only HTML rendered without React escaping is the sanitized lesson body.

## Payments and webhooks

- Fulfilment happens only after a raw-body HMAC-SHA256 signature check with a five-minute
  replay window and constant-time comparison. Stripe and PayBridge share the parser in
  `apps/web/src/lib/payments/signatures.ts`; tests cover a changed body, an old signature and
  a missing header.
- Unique `(provider, eventId)` and `(provider, providerRef)` rows plus guarded order status
  updates make replay harmless. A browser return never marks an order paid.
- Merchant API keys are stored as SHA-256 hashes. PayBridge is test-only: the single accepted
  card is 4242 4242 4242 4242 and every screen says so.

## Uploads and external content

- The product stores attachment metadata, not files. URLs must be `https://`, MIME types are
  allowlisted and sizes are capped at 20 MB; `apps/web/src/lib/attachments.test.ts` proves the
  rejection paths. There is no server-side fetch of a user URL, so no SSRF pivot.
- The live room is an external Jitsi iframe. It is only rendered after an access check; the
  room name is generated from a UUID and never printed on a public catalogue page.
- Google sign-in is optional and only enabled when both OAuth values exist.

## Secrets and supply chain

- `.env*`, dumps, uploads and private keys are gitignored; gitleaks runs in pre-commit and CI.
- `.env.example` contains names, never values. No secret reaches a client bundle.
- `pnpm audit --prod --audit-level high` is the CI gate. The known moderate minimatch
  advisory is a dev-only transitive dependency of typescript-eslint; it is recorded in
  `PROJECT_STATE.md` rather than silently ignored.

## Residual risks

- The rate limiter is per function instance, not global, until a shared store exists.
- Demo accounts are public while `DEMO_AUTH=true`; they are off in production unless enabled.
- Jitsi's free public service has no waiting-room guarantee; a leaked room name is joinable
  for the session's lifetime.
- A deployed Mongo-backed verification still needs the owner's Atlas URI; see
  `OWNER_TODO.md`.
