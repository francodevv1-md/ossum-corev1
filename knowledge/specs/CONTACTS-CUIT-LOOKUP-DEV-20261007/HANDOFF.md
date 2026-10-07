# Contact CUIT lookup MVP — 2026-10-07 handoff

## Done

- Implemented bounded approved DEV package (Engram #9254) with strict mapeo to existing Contactos fields (`documentType`, `documentNumber`, `legalName`, `vatCondition`, `mainAddress`). Extra info (`apoc_existe`, `actividad`, `constancia_full_datos`) is informational only and never persisted.
- All prior approved Contactos packages preserved (CONTACTS-CREATE-STABILITY-20261007, CONTACTS-CORRELATIVE-DEV-20261007, CONTACTS-FRAGILITY-FIXES-20261007). Foreign files (Surgery, Remitos, lookup field) untouched.
- DEV stub driver default in non-production. TusFacturas driver implemented and tested with mocked fetchFn — not exercised against ARCA real (no productive account linked in DEV).
- No browser/Playwright (per parent instruction). No real DB writes, schema migration, Auth/roles changes, commit/push/deploy.

## Changed

- `src/lib/services/cuit-lookup.service.ts` (new). `CuitLookupDriver`, `lookupCuit`, `mergeVatConditionText`, in-flight de-dup Map, stub driver (deterministic per last-5-digits bucket), TusFacturas driver (POST `clientes/afip-info` with apikey+apitoken+usertoken from `getTusFacturasDevConfig()`, 15s timeout, error mapping, razon_social 240 trim).
- `src/lib/utils/cuit-validation.ts` (new). `validateCuitFormat` (módulo 11), `normalizeCuit`.
- `src/lib/validators/cuit-lookup.ts` (new). zod schemas: `cuitLookupRequestSchema` (strict, regex 11), `contactLookupResultSchema` (subset mapped + `extra` optional), `cuitLookupVatConditionSchema`, `cuitLookupMainAddressSchema`, `cuitLookupExtraSchema`, `cuitLookupSourceSchema`. `optionalText(max)` shared pattern.
- `src/lib/api/contacts.ts` (additive). `cuitLookupApi(companyId, cuit)` export.
- `src/app/api/companies/[companyId]/contacts/cuit-lookup/route.ts` (new). POST authenticated via `getApiAuthContext + requireCompanyReadAccess`, body parsed via zod, headers `Cache-Control: no-store`, errors via `errorResponse`. service `await` per request; dedupe in-flight shared in service Map.
- `src/components/contactos/ContactoFormDialog.tsx` (additive minimal). New state: `cuitResult`, `cuitLookupError`, `cuitLookupLoading`, `cuitSuggestion` (per-field ticked set), `cuitPreviewApocOpen`, `cuitLookupInFlightRef`. New `SuggestionRow` helper component. New "Buscar por CUIT" button gated by `validateCuitFormat` + `cuitLookupInFlightRef`. Double-column diff with checkboxes for `legalName` / `vatCondition` / `mainAddress` (street/city/state/zipCode). `mapVatToFormCondition` aligns canonical `Monotributo` to form's `Responsable Monotributo`. `applyCuitSuggestion` calls existing setters (`setNombre`, `setCondicionIva`, `setDomicilio`, etc.). Discard closes panel. Errors surface via display path; never autoapply. Collapsible extra info (apoc/actividad/constancia) shown only when present, never persisted.

## Files

Own changes:
- `src/lib/services/cuit-lookup.service.ts` (new)
- `src/lib/utils/cuit-validation.ts` (new)
- `src/lib/validators/cuit-lookup.ts` (new)
- `src/lib/api/contacts.ts` (additive export only)
- `src/app/api/companies/[companyId]/contacts/cuit-lookup/route.ts` (new)
- `src/components/contactos/ContactoFormDialog.tsx` (additive minimal)
- `src/__tests__/unit/cuit-lookup.service.test.ts` (new, 29 tests)
- `src/__tests__/unit/cuit-lookup-validator.test.ts` (new, 20 tests)
- `src/__tests__/unit/cuit-lookup-route.test.ts` (new, 8 tests)
- `src/__tests__/components/ContactoFormDialog-cuit-lookup.test.tsx` (new, 8 tests)
- `.opencode/locks/CONTACTS-CUIT-LOOKUP-DEV-20261007.lock.md`
- `knowledge/specs/CONTACTS-CUIT-LOOKUP-DEV-20261007/TASK_BRIEF.md`
- `knowledge/specs/CONTACTS-CUIT-LOOKUP-DEV-20261007/run-checks.mjs`
- `knowledge/specs/CONTACTS-CUIT-LOOKUP-DEV-20261007/typecheck.mjs`
- `knowledge/specs/CONTACTS-CUIT-LOOKUP-DEV-20261007/HANDOFF.md`
- `knowledge/worklog/CONTACTS_CUIT_LOOKUP_DEV_2026-10-07.md`

Foreign unchanged:
- All Surgery/Remitos/Coordination packages
- `ContactLookupField.tsx` (foreign dirty from prior fragility-fixes package)
- `ContactSearchModal.tsx`
- `useCirugiaActions.ts`
- `prisma/schema.prisma`, `src/lib/db.ts`, `src/lib/store.ts`

## Validations

- `node knowledge/specs/CONTACTS-CUIT-LOOKUP-DEV-20261007/run-checks.mjs`: **23 suites / 259 tests PASS** (4 new suites totaling 65 new tests on top of 194 prior fragility-fixes tests).
  - `unit/cuit-lookup.service` (29 tests)
  - `unit/cuit-lookup-validator` (20 tests)
  - `unit/cuit-lookup-route` (8 tests)
  - `components/ContactoFormDialog-cuit-lookup` (8 tests)
- `node --max-old-space-size=6144 knowledge/specs/CONTACTS-CUIT-LOOKUP-DEV-20261007/typecheck.mjs`: **15 entries / 535 resolved files / 0 diagnostics**.
- Focused ESLint on owned files: **0 errors / 9 preexisting warnings** (all pre-existing unused-import warnings in `ContactoFormDialog.tsx` — same 9 reported in prior fragility-fixes handoff).
- Scoped `git diff --check` on owned files: PASS (only LF/CRLF platform line-ending warnings).
- All prior fragility-fixes tests (`useCirugiaActions-institution-helper` etc.) still pass with no regressions.
- All prior correlative tests + create-stability tests preserved.
- No real DB, no Auth/roles changes, no commit/push/deploy.

## Risks

- Three non-blocking nits (redundant dynamic import, exposed `__`-prefixed test seams, missing `act(...)` in 2 component tests) closed in `CONTACTS-CUIT-LOOKUP-FOLLOWUP-20261007`. See that spec's HANDOFF for details.
- Independent sibling review completed after parent escalation: **PASS — no actionable defect**. Three non-blocking nit-level observations recorded: redundant dynamic imports of `@/lib/api/errors` in the route (use static); `__`-prefixed test seams exposed on production module (consider future `_internal/test-seams`); 2 `act(...)` wraps missing in 2 component tests (cosmetic, tests pass). Not applied this run.
- **Cleanup applied 2026-10-07** in `CONTACTS-CUIT-LOOKUP-FOLLOWUP-20261007` (Engram #9272, ADR-027H DRAFT): the three nits above are now closed (static import in route, test seams moved to `cuit-lookup.service.internal.ts`, `act` wraps added in the component test). See `knowledge/worklog/CONTACTS_CUIT_LOOKUP_FOLLOWUP_2026-10-07.md` and `knowledge/architecture/ADR-027H-FISCAL-CONSULTA-CUIT-USO-PRODUCTIVO.md`.

- Independent sibling review not available at depth limit. Parent then delegated sibling review: **PASS — no actionable defect**; three nit-level observations recorded for transparency (redundant dynamic import, exposed `__`-prefixed test seams, missing `act(...)` wraps in 2 component tests).
- No browser QA per explicit instruction; 1366×768, 1920×1080, 390×844 responsive viewports not certified.
- No production build/global clean claim.
- `Contacto` form `condicionIva` enum (`Responsable Inscripto` / `Responsable Monotributo` / `Exento` / `Consumidor Final` / `No Responsable`) does not 1:1 match the lookup canonical (`Monotributo` is in canonical, `Responsable Monotributo` in form). `mapVatToFormCondition` bridges them. If Franco prefers a different mapping, the helper is local in `ContactoFormDialog.tsx` and trivial to invert.
- `applyCuitSuggestion` calls existing form setters. Save flow is preserved; the "Buscar por CUIT" button is purely a draft assistant, not a submit.
- The `extra` payload could include `apoc_info` strings up to provider format; the UI shows them as plain text (informational only).
- TusFacturas driver was implemented but never executed against ARCA. Behavior is verified by mocked `fetchFn` returning canonical-shape responses.
- No persistent cache (intentionally out of scope).
- No mapping `estado ARCA -> linkIsActive` (intentionally out of scope).

## Next

- Validate against an explicitly confirmed disposable DEV database when Franco requests it (no real DB was exercised in this package).
- If Franco wants ARCA real verification, separate ADR fiscal + approval required (out of this package per AGENTS.md §11 + `FISCAL_BOUNDARY_TUSFACTURAS.md`).
- Independent sibling review can re-run via parent's main session; this subagent did focused self-review only.
- Commit / publication requires a separate explicit request.