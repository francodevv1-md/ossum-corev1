# CONTACTS-CUIT-LOOKUP-INSTRUMENT-20261007 — Task Brief

## Goal

Bounded INSTRUMENT-only package on top of `CONTACTS-CUIT-LOOKUP-DEV-20261007` and `CONTACTS-CUIT-LOOKUP-FOLLOWUP-20261007`. Implements the operational instrumentation required by ADR-027H (rate limit, log redaction, daily budget, audit emission) in the `cuit-lookup` wrapper. No schema migration, no Auth/roles change, no persistent cache, no commit/push/deploy, no real DB writes, no ARCA smoke.

Parent approval: ADR-027G + ADR-027H both approved 2026-10-07 by Franco (Engram #9254 / HACELO #ADRs-027G/027H).

## Scope (finite)

### 1. Server-side log redaction — `src/lib/log/redacted.ts` (new)

- Exposes `logLookupEvent({ provider, responseCode, errorCode, requestId, actorUserId, companyId, durationMs, maskedCuit })`.
- Accepts a custom logger via `setLoggerSink(fn)` (test seam). Default implementation writes to `console` with structured fields (single line JSON or key=value; chosen `console.info` with a single object payload for sanity).
- **Never** logs: `apikey`, `apitoken`, `usertoken`, `fullBody`, `neverCuit` (a placeholder we will not use), or raw JSON payloads.
- `maskedCuit` formatter: first 4 + "******" + last 2 digits of the 11-digit CUIT.
- Exports `__setLoggerSink`, `__resetLoggerSink`, `__maskCuit(cuit)`, `__getLastLogCall` (test seams).

### 2. In-process rate limit + budget — `src/lib/services/cuit-lookup.governance.ts` (new sibling module)

- **Per-actor** (`actorUserId`): X = 30 req/min sliding window. Reject with `ApiError(429, 'cuit_actor_rate_limit', ...)` when exceeded. `windowSeconds = 60`.
- **Per-company** (`companyId`): Y = 600 req/hour sliding window. Reject with `ApiError(429, 'cuit_company_rate_limit', ...)` when exceeded. `windowSeconds = 3600`.
- **Per-company daily budget** (UTC day): T = 2000 req/day. Reject with `ApiError(429, 'cuit_budget_exceeded', ...)` when reached.
- Implementation: rolling counters with `timestamps: number[]` arrays. **No** persistent cache.
- Test seams: `__clearGovernanceCounters()`, `__setGovernanceLimits(n, y, t)` (allow tests to override limits to 1/1/1 etc.).
- Order inside `lookupCuit`: governance check first → dedupe (in-flight Map) → driver. A rejected lookup **must not** count against the in-flight map.

### 3. Audit emission — `src/lib/services/cuit-lookup.governance.ts` (same module, sibling function)

- Exports `emitCuitLookupAudit({ prisma, companyId, actorUserId, maskedCuit, provider, responseCode, errorCode, durationMs, requestId, vatCondition?, legalNamePresent?, addressPresent? })`.
- **Reuses** `createAuditEvent` from `src/lib/audit.ts` (no new audit helper, no new prisma column).
- Shape:
  - `entityType = "ContactCuitLookup"`
  - `entityId = maskedCuit` (first 4 + "******" + last 2)
  - `action = "cuit_lookup"`
  - `module = "contacts-fiscal"`
  - `companyId`, `userId = actorUserId` (mapped to AuditEvent.userId)
  - `detail` is a sanitized string composed of `vatCondition` + boolean flags (`legalNamePresent`, `addressPresent`) only. Never include full legalName or full address.
  - `metadata = { requestId, durationMs, errorCode? }`. Never include full body, never include PII, never include credentials.
- Test seam: `__setAuditSink(fn)` so tests can capture emissions without prisma. Default uses `createAuditEvent` if no sink.
- Called at the end of every top-level lookup path (success or error) **after** dedupe; **never** on the rejected-by-governance path.
- Fire-and-forget pattern: collect audit promises during the try block, await them all just before returning, so dedupe semantic is preserved (audit still happens once per top-level call, not per in-flight subscriber).
- **Note**: for in-flight de-dup, audit is emitted by the **leader** (the one that ran the driver) exactly once.

### 4. Wire instrumentation into `src/lib/services/cuit-lookup.service.ts`

- Extend `CuitLookupOptions` to accept optional `actorUserId?`, `companyId?`, `requestId?` (backward compatible).
- `lookupCuit` flow:
  1. Format CUIT.
  2. Validate modulo 11 (throw `invalid_cuit_format` if invalid — no log, no audit, no governance counters; per ADR-027H §4).
  3. **Governance check** (per-actor rate limit, per-company rate limit, per-company daily budget). If any rejects, throw immediately. **No log emitted by service for the rejected path; the redaction logger is only invoked on the success/error path of the lookup that reached the driver** (per parent instruction §1: "exactly once per top-level lookup"; per §3: do NOT audit on rejected-by-governance path).
  4. In-flight de-dup Map check.
  5. If new: start a wall-clock timer; call driver. If error from driver, log + audit. If success, log + audit.
  6. If in-flight subscriber: return the existing promise. **Do not** log or audit in the subscriber path; the leader does it once.
  7. At the end of the leader's try block, await all collected audit promises, then return the parsed result.
- Logger invocation: exactly once per leader (success or error), after the driver resolves/rejects.
- Log fields: `provider` (resolved driver), `responseCode` (mapped from result.estado when found, or `"N/A"` when not found, or `"ERROR"` when driver threw), `errorCode` (only when error), `requestId` (uuid generated at top of `lookupCuit`), `actorUserId` (from opts or "unknown"), `companyId` (from opts or "unknown"), `durationMs` (number), `maskedCuit` (from raw CUIT).
- `provider` literal: `"stub"` or `"tusfacturas"`.
- Log call is wrapped in try/catch — a logging failure must never break the lookup.

### 5. Update `src/app/api/companies/[companyId]/contacts/cuit-lookup/route.ts`

- After `getApiAuthContext`, pass `actorUserId: ctx.actorUserId`, `companyId: ctx.companyId`, `requestId: generated-uuid` to `lookupCuit`.
- No new prisma call sites in the route.
- Public API of the route remains identical: same response shape, same status codes, same headers.

### 6. Public API backward compatibility

- `lookupCuit(rawCuit, opts?)` where `opts` may include `driver`, `actorUserId`, `companyId`, `requestId`. All new params are optional.
- Existing tests (`cuit-lookup.service.test.ts`, `cuit-lookup-route.test.ts`) must still pass without modification.

### 7. Tests

- `src/__tests__/unit/cuit-lookup-governance.test.ts` (new, **12+ tests**):
  - 31st request from same actor within 60s rejects with `cuit_actor_rate_limit`, does NOT call driver, does NOT emit audit.
  - 601st request from same company within 3600s rejects with `cuit_company_rate_limit`.
  - 2001st request from same company within UTC day rejects with `cuit_budget_exceeded`.
  - Different actors share the same company budget counter.
  - Reset windows deterministically with `__setGovernanceLimits` to small values.
  - Overlapping in-flight requests share a single governance count (the second subscriber does not increment).
  - Invalid CUIT format does NOT consume governance counters.
  - `__clearGovernanceCounters` between tests.
  - Successful call increments all three counters (per-actor, per-company hourly, per-company daily).
  - Provider error increments all three counters.
  - Two different companies have independent budget counters.

- `src/__tests__/unit/cuit-lookup-audit.test.ts` (new, **8+ tests**):
  - Successful lookup emits audit with `maskedCuit` (first 4 + "******" + last 2).
  - Provider conflict emits audit including `errorCode`.
  - Audit `detail` never contains full `legalName` or full `address`.
  - Audit `module = "contacts-fiscal"`, `action = "cuit_lookup"`, `entityType = "ContactCuitLookup"`.
  - Audit `metadata.requestId` matches the wrapper's generated UUID.
  - Rejected-by-governance path does NOT emit audit.
  - In-flight dedupe emits audit only once (from the leader).
  - In-flight dedupe: all subscribers receive the same result.

- `src/__tests__/unit/cuit-lookup-log.test.ts` (new, **6+ tests**):
  - Logger never receives `apikey`, `apitoken`, `usertoken`, `json`, `body`, `neverCuit` keys.
  - Logger receives `maskedCuit`, `responseCode`, `errorCode`, `durationMs`.
  - Sanitization: `maskedCuit` only first 4 + "******" + last 2 digits (e.g. `3071******40`).
  - Logger called exactly once per leader (not per in-flight subscriber).
  - Logger called with `provider: "stub"` for stub driver.
  - Logger is called even on error path (driver threw).

### 8. Update `run-checks` and `typecheck` to cover new files

- `knowledge/specs/CONTACTS-CUIT-LOOKUP-INSTRUMENT-20261007/run-checks.mjs`: include the 3 new test files plus the 23 prior suites. Must reach **all green**.
- `knowledge/specs/CONTACTS-CUIT-LOOKUP-INSTRUMENT-20261007/typecheck.mjs`: scoped typecheck over the new files plus existing CUIT lookup files.
- ESLint on owned files: must remain **0 errors** (same pre-existing warnings allowed).

### 9. Independent sibling review

- Spawn a subagent (read-only) to review the diff and surface concrete findings. Fix concrete findings within scope (instrumentation only). Re-run validations after fixes.

### 10. Session close

- Update `knowledge/specs/CONTACTS-CUIT-LOOKUP-DEV-20261007/HANDOFF.md` with a one-line note that instrumentation package is complete and links to the new spec.
- Create `knowledge/worklog/CONTACTS_CUIT_LOOKUP_INSTRUMENT_2026-10-07.md`.
- Update lock to `status: released`.
- Engram `mem_save` and `mem_session_summary`.
- Return Caveman handoff with concrete test counts.

## Out of scope

- Schema migration. Auth/roles change. Persistent cache. Persisting extras.
- ARCA `estado → isActive` mapping. Other providers. Real ARCA smoke.
- Commit, push, PR, merge, deploy.
- Browser/Playwright.
- Real DB writes.
- Foreign files (Surgery, Remitos, lookup field, prior contact packages).
- `prisma/schema.prisma`, `src/lib/db.ts`, `src/lib/store.ts`, `src/types/index.ts`.

## Allowed files

- `src/lib/log/redacted.ts` (new)
- `src/lib/services/cuit-lookup.governance.ts` (new — rate limit + budget + audit)
- `src/lib/services/cuit-lookup.service.ts` (instrumented)
- `src/app/api/companies/[companyId]/contacts/cuit-lookup/route.ts` (pass actor/company/requestId)
- `src/__tests__/unit/cuit-lookup-governance.test.ts` (new)
- `src/__tests__/unit/cuit-lookup-audit.test.ts` (new)
- `src/__tests__/unit/cuit-lookup-log.test.ts` (new)
- `knowledge/specs/CONTACTS-CUIT-LOOKUP-INSTRUMENT-20261007/`
- `knowledge/specs/CONTACTS-CUIT-LOOKUP-DEV-20261007/HANDOFF.md` (one-line note)
- `knowledge/worklog/CONTACTS_CUIT_LOOKUP_INSTRUMENT_2026-10-07.md` (new)
- `.opencode/locks/CONTACTS-CUIT-LOOKUP-INSTRUMENT-20261007.lock.md`

## Forbidden

- Anything not listed in Allowed files.
- `prisma/schema.prisma`, `src/lib/db.ts`, `src/lib/store.ts`, `src/types/index.ts`.
- New npm dependencies.
- `git commit`, `git push`, `git reset --hard`, `git checkout --` on foreign files.
- Browser/Playwright, real DB writes, real ARCA calls.
- Persistent cache TTL.
- Persisting `apoc_existe`/`actividad`/`constancia_full_datos`.
- ARCA `estado` → `linkIsActive`/`isActive` mapping.
- Other providers.

## Constraints

- All prior 23 suites / 259 tests must still pass.
- `lookupCuit` signature is backward compatible (existing call sites still work).
- Public API of `lookupCuit` does not change.
- Audit shape uses **existing** `createAuditEvent` — no new audit helper, no new prisma column.
- Log redaction: never `apikey/apitoken/usertoken/fullBody/neverCuit/json` keys in the log payload.
- `maskedCuit`: first 4 + "******" + last 2 digits of the 11-digit CUIT.
- Rate limits default: X=30/min, Y=600/h, T=2000/day, but `__setGovernanceLimits(n, y, t)` is the test seam.
- Per-actor + per-company counters are in-memory; process restart resets them. This is per ADR-027H §1 explicit decision.
- In-flight de-dup is preserved; a rejected-by-governance path **must not** enter the in-flight map.
- No production deploy. No real DB. No real ARCA.
- No commit, no push, no PR.

## Validation gates

- `node knowledge/specs/CONTACTS-CUIT-LOOKUP-INSTRUMENT-20261007/run-checks.mjs`: must show **23 prior suites + 3 new suites = 26 suites total** with all tests green.
- `node --max-old-space-size=6144 knowledge/specs/CONTACTS-CUIT-LOOKUP-INSTRUMENT-20261007/typecheck.mjs`: 0 diagnostics.
- ESLint on owned files: 0 errors.
- `git diff --check` on owned files: PASS.
- Independent sibling review subagent: PASS or concrete actionable findings (then fix).

## Handoff

Caveman `Done / Changed / Files / Validations / Risks / Next` with concrete test counts.
