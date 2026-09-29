# Handoff — FISCAL-DEV-HARDENING-001

## Handoff

### Done
- Webhook fails closed when its secret is absent and accepts only the documented `TF-WebhookToken` header with constant-time comparison.
- Fiscal snapshots, hashes, issuance attempts, and webhook evidence strip `apikey`, `apitoken`, `usertoken`, authorization, token, secret, and equivalent snake_case keys.
- Credentials exist only in the in-memory payload passed to the provider client.
- Existing fiscal snapshots are never overwritten; business payload drift returns `fiscal_snapshot_mismatch` before any provider call.
- Replayed webhook events return an ignored result without adding an attempt or mutating fiscal state.

### Changed
- Added sanitized fiscal payload construction, stable recursive hashing, snapshot immutability enforcement, and `correlationId` replay lookup.
- Added focused regressions for missing/header-only webhook auth, secret sanitization, immutable drift rejection, and replay dedupe.
- Removed the trailing blank line in `.env.example` and documented that the webhook token is mandatory.

### Files
- `src/app/api/webhooks/tusfacturas/route.ts`
- `src/lib/services/fiscal-tusfacturas.service.ts`
- `src/lib/services/fiscal-issuance.service.ts`
- `src/lib/validators/fiscal-tusfacturas.ts`
- `src/__tests__/unit/tusfacturas-webhook.test.ts`
- `src/__tests__/unit/fiscal-tusfacturas.service.test.ts`
- `src/__tests__/unit/fiscal-issuance.service.test.ts`
- `.env.example`

### Validations
- Focused fiscal suite: 28 tests passed in 9 files.
- Scoped ESLint: passed with no output.
- `prisma validate` and `prisma generate`: passed.
- `git diff --check`: passed.
- Full `npm run typecheck`: blocked by pre-existing unrelated workspace errors, including stale fiscal route guard/auth imports and broader surgery/PDF/stock type errors; none are in this hardening diff.

### Risks
- TusFacturas transport semantics were verified from its webhook documentation: `TF-WebhookToken` is the documented header and `hook_id` is supplied in payloads. No provider configuration, credentials, or calls were made.
- Replay dedupe is source-only and sequential, using the existing non-unique `correlationId`; concurrent duplicate deliveries would need a schema-level unique constraint/transactional design, which is excluded from this task.
- Historical rows that may already contain credentials are intentionally not rewritten because snapshots are immutable and database mutation is out of scope.

### Next
- Configure no credentials until a separate approved DEV configuration task.
- If concurrent webhook delivery guarantees are required, approve a schema-backed dedupe constraint.
