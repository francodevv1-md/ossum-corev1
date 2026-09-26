# FISCAL-03 Handoff — TusFacturas DEV issuance/reconciliation

## Done
- Added a backend-only TusFacturas DEV client for explicit issuance and lookup by `external_reference`.
- Normalized provider requests exclude credentials before FISCAL-02 persistence; success, provider-error, timeout, and lookup results update the existing fiscal attempt/document records.
- Ran exactly one explicit fictitious DEV_ONLY issuance request after direct/runtime/backend target confirmation.

## Changed
- Emission uses `POST /nuevo`; reconciliation uses `POST /consulta_avanzada` with `EXT_REF`.
- Missing configuration safely returns only required variable names. Provider error and timeout outcomes remain `UNKNOWN`; no automatic or blind retry exists.
- The provider returned an error classified as `TFC-8002`: fiscal status is `UNKNOWN`, CAE/PDF are absent, normalized response is persisted, and reconciliation by the stable `external_reference` is required before any future action.

## Files
- `src/lib/services/fiscal-tusfacturas.service.ts`
- `src/lib/validators/fiscal-tusfacturas.ts`
- `src/__tests__/unit/fiscal-tusfacturas.service.test.ts`
- `knowledge/specs/FISCAL-TUSFACTURAS-DEV-001/LOCK.md`

## Validations
- `npm run test -- --run src/__tests__/unit/fiscal-tusfacturas.service.test.ts` — 5 passed.
- `npm run typecheck` — fiscal code clean; unrelated existing ContactAddress `companyId` errors remain in seed, contact service, and contact concurrency test.
- Focused fiscal tests — 9 passed; focused ESLint passed.
- Target confirmation — direct/runtime/backend all resolved to `ossum_fiscal_reconciliation_dev_fixed_20260924` before emission.
- Credentials gate — all three required names loaded through the application's `@next/env` mechanism without reading or outputting values.
- Real probe — one request only; `UNKNOWN` / `TFC-8002`; request redacted=true, response persisted=true, CAE=false, PDF=false, lookup required=true. No retry or lookup ran.
- Queryable DEV_ONLY evidence (read-only, identifiers/secrets omitted) — `documents=1; environment=DEV_ONLY; document-state=UNKNOWN; attempt-count=1; attempt-numbers=1; attempt-states=UNKNOWN`. This corroborates one persisted issuance attempt and one reconciliation lifecycle without provider activity.

## Risks
- The provider PDF URL is temporary and is preserved as provider response evidence only. Download/persistent file storage is intentionally out of scope.
- The client must only be wired to a controlled explicit server action after DEV credentials and an eligible persisted DEV_ONLY fiscal document are available.
- Diagnose reconciliation found no provider document for the stable external reference (`error=N`, `total=0`, `matches=0`). Official TusFacturas documentation classifies `TFC-8002` as invalid characters in `external_reference`; no CAE/PDF exists and a new reference must satisfy the provider format before any separately authorized fiscal action.

## Diagnose
- Reproduce: focused zero-match reconciliation test returned `PENDING` when `error=N`, `total=0`, and `comprobantes=[]`.
- Scope: backend reconciliation state mapping and the single isolated persisted fiscal attempt; no provider, policy, account, webhook, UI, schema, or DB-target change.
- Evidence: source mapped every successful lookup without a CAE to `PENDING`; the persisted isolated record had `state=PENDING; lookup-error=N; total=0; matches=0`.
- Hypothesis: the fallback branch conflated a zero-match result with an in-progress provider document. A provider error is weaker because it has a separate `UNKNOWN` branch.
- Minimal Fix: successful lookups now authorize only when a CAE is present; zero-match responses remain `UNKNOWN`. Corrected the existing isolated zero-match record and attempt to `UNKNOWN` without a provider call.
- Validate: focused fiscal tests 8 passed; focused ESLint passed. Read-only final verification: `state=UNKNOWN; lookup-error=N; total=0; matches=0`.
- Regression check: authorized lookup remains `AUTHORIZED`; provider-error lookup remains `UNKNOWN`; issue path and no-retry guard are unchanged. No new issuance, retry, or provider call occurred.

## Security Diagnose
- Reproduce: focused tests proved provider `usertoken`, `apitoken`, `apikey`, and nested `user_token`, `api_token`, `api_key` values were stored unredacted; a lookup record with a foreign `external_reference` and CAE became `AUTHORIZED`.
- Scope: `fiscal-tusfacturas.service.ts` persistence boundary and lookup authorization only.
- Evidence: the validator is deliberately `.passthrough()`, and all four provider-response persistence paths passed raw provider JSON to `updateAttempt`; authorization used the first returned CAE without comparing its reference.
- Hypothesis: raw passthrough and CAE-only authorization bypassed the persistence redaction boundary and stable-reference invariant.
- Minimal Fix: centralized recursive response sanitization in `updateAttempt` removes credential/token/authorization/secret fields before every `responsePayload` persistence; lookup authorization now requires a CAE and exact returned `external_reference`, otherwise it persists `UNKNOWN` with `tusfacturas_external_reference_mismatch` audit evidence.
- Validate: focused fiscal tests 10 passed; focused ESLint passed.
- Regression check: CAE, external reference, PDF/status/error fields remain available when non-sensitive; matching-reference CAE lookup still authorizes. No provider call, issuance, reconciliation network call, or DB history change occurred.

## P0 fiscal safety correction — 2026-09-24
- Reproduce: focused tests showed issuance responses with `error: "N"` but either no CAE or a foreign `external_reference` transitioned the document and attempt to `AUTHORIZED`.
- Scope: the `POST /nuevo` response authorization guard only; provider transport, validators, reconciliation, persistence schema, API routes, Auth, UI, webhooks and fixtures were not changed.
- Evidence: `issueTusFacturasDev` authorized every `error: "N"` response without inspecting authorization evidence or the stable request reference.
- Minimal Fix: authorization now requires `response.cae?.trim()` and an exact `response.external_reference === document.externalReference`. Failed evidence gates persist sanitized issuance evidence and leave both records `UNKNOWN` with `tusfacturas_missing_cae` or `tusfacturas_external_reference_mismatch`.
- Validate: focused fiscal tests 14 passed; focused ESLint and diff checks passed. Matching CAE/reference issuance remains `AUTHORIZED`; missing-CAE and mismatched-reference issuance remain `UNKNOWN`.
- Regression check: no provider call, issuance/retry, reconciliation, DB-history mutation, schema, validator, route, Auth, UI, webhook, environment, dependency or fixture change occurred.

## P0 validation rerun — 2026-09-24
- Confirmed the existing minimal guard and focused coverage: `error: "N"` missing CAE and mismatched `external_reference` remain `UNKNOWN`; matching CAE/reference remains `AUTHORIZED`.
- Validation: focused fiscal Vitest 14 passed; focused ESLint and scoped diff check passed. No provider call, issuance, retry, reconciliation, DB mutation, or out-of-scope file change occurred.

## Next
- Do not issue again, retry, start webhooks, or build UI until the external-reference correction and a new explicit fiscal action are separately authorized.

## Fiscal state decision — 2026-09-24
- `NOT_REQUESTED` is not persisted: its later UI meaning is the absence of both fiscal document and issuance-attempt evidence.
- A definitive received issuance rejection (`response.error !== "N"`) now persists `REJECTED` with sanitized provider evidence and error.
- Timeout, transport, HTTP failure, lost response, or missing/mismatched CAE/reference remain `UNKNOWN`; no retry behavior changed.

## DEV simulated presentation state — 2026-09-24
- Reverted the unapplied `SIMULATED` schema/migration addition. Qualifying `DEV_ONLY` issuance evidence now persists `UNKNOWN` and derives `SIMULATED` only for presentation.
- The derivation requires `error=N`, exact `external_reference`, non-empty `comprobante_nro` and `comprobante_pdf_url`, and blank/missing CAE. `AUTHORIZED` still requires non-empty CAE and exact reference; incomplete evidence remains `UNKNOWN`; definitive provider errors remain `REJECTED`.
- Cancellation guard and provider/no-retry flow are unchanged. `SIMULATED` may be persisted only after Prisma migration history is stabilized and a separately approved migration exists.

## SIMULATED reversal validation — 2026-09-24
- Focused fiscal tests cover qualifying DEV evidence persisting `UNKNOWN` while deriving `SIMULATED`, missing PDF/number remaining `UNKNOWN`, non-DEV never deriving `SIMULATED`, and matching CAE/reference remaining `AUTHORIZED`.
- No provider call, DB mutation, migration apply/reset/resolve, issuance, retry, or automatic action occurred.

## DEV fixture correction — 2026-09-24
- Official documentation confirms that `punto_venta` is a numeric integer of up to five digits; configured PDV `00004` is sent as numeric `4`.
- For `FACTURA B` from a Responsable Inscripto to Consumidor Final, the DEV request uses documented `documento_tipo=OTRO`, `documento_nro=0`, `condicion_iva=CF`, and `condicion_iva_operacion=CF`; it does not invent a CUIT.
- The configured `Productos y servicios` activity requires `periodo_facturado_desde` and `periodo_facturado_hasta`; the DEV-only builder now supplies the fixture date to both fields.
- Attempt evidence is now structured as separate `issuance` and `reconciliation` sections. Legacy lookup evidence is migrated on its next reconciliation; the already overwritten original TFC-8002 text cannot be recovered.
- The mandatory existing-reference reconciliation was sent once after the original `TFC-8002` issuance result. Official documentation identifies `TFC-8002` as invalid characters in `external_reference`; no new fiscal intent, no new issuance, retry, or secret output occurred.
