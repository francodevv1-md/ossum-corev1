# CONTACTS-CUIT-LOOKUP-FOLLOWUP-20261007 — Worklog

## Goal

Bounded follow-up on the Contacts CUIT lookup MVP: close the three non-blocking nits raised in the prior sibling review (CONTACTS-CUIT-LOOKUP-DEV-20261007), draft ADR-027H binding the operational use of the lookup against the productive TusFacturasAPP account, and close the session. No commit/push/deploy, no schema, no Auth.

Parent approval: Engram #9272. ADR-027G already approved 2026-10-07.

## Implemented

### Nit A — static import in route

`src/app/api/companies/[companyId]/contacts/cuit-lookup/route.ts`:
- Replaced both `await import("@/lib/api/errors")` calls (used solely for `badRequest`) with a top-level static import: `import { badRequest } from "../../../../../../lib/api/errors";`.
- Behavior unchanged: same error codes (`invalid_json_body`, `invalid_cuit_format`, `validation_failed`), same messages, same `errorResponse` wrapping.

### Nit B — extract `__`-prefixed test seams

- New file `src/lib/services/cuit-lookup.service.internal.ts` owns:
  - The in-flight de-dup `Map<string, Promise<ContactLookupResult>>` (exposed as `getInFlightMap()`).
  - The `__testFetchOverride` slot (exposed as `getTestFetchOverride()` / `__setTestFetchOverride()`).
  - The test seam `__tusFacturasLookupCuit(rawCuit, deps)` that delegates to a driver registered by the service at module load.
  - The `__inFlightClearForTest()` seam.
- `src/lib/services/cuit-lookup.service.ts`:
  - Removed the three `__`-prefixed exports, the `__testFetchOverride` module-local state, and the module-local `inFlight` Map.
  - Now imports `getInFlightMap`, `getTestFetchOverride`, `setTusFacturasDriver` from the internal module.
  - Calls `setTusFacturasDriver(runTusFacturasDriver)` at module load so the seam in the internal module can invoke the production driver without a circular import.
  - Public API of `lookupCuit` is unchanged (signature, dedupe, driver resolution, error mapping, 15s timeout, 240-char truncation, `extra` payload).
- `src/__tests__/unit/cuit-lookup.service.test.ts`:
  - Imports `__inFlightClearForTest`, `__setTestFetchOverride`, `__tusFacturasLookupCuit` from the new internal module.
  - Imports `lookupCuit`, `mergeVatConditionText` from the service (unchanged).
  - Removed all `await import("@/lib/services/cuit-lookup.service")` dynamic re-imports of the seams (no longer needed; top-level static imports work).

### Nit C — wrap `fireEvent.change` with `act`

`src/__tests__/components/ContactoFormDialog-cuit-lookup.test.tsx`:
- The three `fireEvent.change` calls inside the test "button is enabled only when CUIT is module-11 valid" are now wrapped in `await act(async () => { fireEvent.change(...) })` (cosmetic; the 8 component tests were already passing).
- `act` was already imported at the top of the file.

### ADR-027H draft

- `knowledge/architecture/ADR-027H-FISCAL-CONSULTA-CUIT-USO-PRODUCTIVO.md` (new, **DRAFT**).
- Style mirrors ADR-027G and ADR-027E (Contexto / Decisión / Capa UI / Límite del MVP / Consecuencias / Reglas derivadas / Validación / Próximos pasos / Aprobación).
- Covers every required bullet from the parent instruction: rate limits (X req/min per actor, Y req/hora per company, marked DRAFT), log redaction, credit consumption logging, audit policy (entityType `ContactCuitLookup`, action `cuit_lookup`, module `contacts-fiscal`, no new columns), provider error matrix (`cuit_provider_timeout`, `cuit_provider_conflict`, `cuit_no_iva_condition`, `cuit_dev_config_missing`), cost ceiling T (DRAFT), gate of smoke + Franco approval, and reaffirmed out-of-scope items.
- `knowledge/KNOWLEDGE_INDEX.md` updated: new entry under `architecture/` listing ADR-027H.

### Session close

- `knowledge/specs/CONTACTS-CUIT-LOOKUP-DEV-20261007/HANDOFF.md` updated with a one-line note in the `Risks` section recording that the three nits were closed in this follow-up package.
- This worklog.

## Validations

- `node knowledge/specs/CONTACTS-CUIT-LOOKUP-FOLLOWUP-20261007/run-checks.mjs`: **23 suites / 259 tests PASS** (identical to the prior package; the modified test files imported from the new internal module without any test-count delta).
- `node --max-old-space-size=6144 knowledge/specs/CONTACTS-CUIT-LOOKUP-FOLLOWUP-20261007/typecheck.mjs`: **16 entries / 536 resolved files / 0 diagnostics** (includes the new `cuit-lookup.service.internal.ts`).
- ESLint focal sobre los 5 archivos propios (`cuit-lookup.service.ts`, `cuit-lookup.service.internal.ts`, `route.ts`, el test de servicio, el test del componente): **0 errors / 0 warnings** (silently PASS — `EXIT: 0`).
- `git diff --check` scoped to owned files: **PASS** (only platform LF/CRLF warnings, no semantic whitespace issues).
- Focused self-review of the refactor (sibling review subagent unavailable at depth limit): verified (a) no behavior change in `lookupCuit`, (b) no circular import between service and internal module, (c) test seams correctly delegate to the production driver via the registration call, (d) component test `act` wraps are syntactically correct, (e) no foreign files touched (Surgery, Remitos, lookup field, schema, Auth).

## Riesgos

- This follow-up package is **DEV-only**: no production deployment, no real-DB writes, no schema, no Auth, no new npm dependencies.
- ADR-027H is **DRAFT**. It does NOT enable productive use of the lookup. Production enablement requires the controlled PROD smoke with synthetic CUITs plus Franco explicit approval (ADR-027H §7).
- `lookupCuit`'s in-flight Map and `__testFetchOverride` slot moved to a sibling module. Any future import that pulls the seam by a path other than `@/lib/services/cuit-lookup.service.internal` will not see them. The service's `lookupCuit` and the new internal module share the same `Map` instance via `getInFlightMap()`.
- The service registers its TusFacturas driver at module load via `setTusFacturasDriver(runTusFacturasDriver)`. If a future test imports the internal module before the service, `__tusFacturasLookupCuit` will throw with the "called before setTusFacturasDriver" sentinel. The current test file imports the service first (via `lookupCuit`), so the registration happens.
- No browser/Playwright per explicit instruction.
- No production build/global clean claim.
- Masked CUIT in `AuditEvent.entityId` means audit drill-downs need to join on `metadata.requestId` to reconstruct the exact request; the constraint is intentional (PII minimization).

## Próximos pasos

- If Franco requests implementation of the wrapper instrumentation (rate limit, redaction, budget, audit emission) specified in ADR-027H, open a separate spec outside the scope of this follow-up package.
- The smoke controlled with synthetic CUITs is gated by Franco and a synthetic-CUIT agreement with TusFacturasAPP.
- ADR-027H values X, Y, T are DRAFT and may be hardened post-smoke without reopening; loosening them requires reopening the ADR.
- Commit / publication requires a separate explicit request.
