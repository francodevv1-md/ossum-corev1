# CONTACTS-CUIT-LOOKUP-FOLLOWUP-20261007 — Task Brief

## Goal

Bounded follow-up on the Contacts CUIT lookup MVP: (1) apply three non-blocking nits raised in the prior sibling review, (2) draft ADR-027H binding the operational use of the lookup against the productive TusFacturasAPP account, (3) close the session with worklog and HANDOFF update. No scope expansion, no commit/push/deploy, no schema, no Auth.

## Scope (finite)

### Nit A — static import in route

`src/app/api/companies/[companyId]/contacts/cuit-lookup/route.ts`:
- Replace both `await import("@/lib/api/errors")` calls (used solely to grab `badRequest`) with a top-level static import using the same relative depth the file already uses for siblings:
  `import { badRequest } from "../../../../../../lib/api/errors";`
- Do not change behavior. Do not change the error codes or messages.

### Nit B — extract `__`-prefixed test seams

- Move `__tusFacturasLookupCuit`, `__inFlightClearForTest`, `__setTestFetchOverride` (and the `__testFetchOverride` slot it manages) out of `src/lib/services/cuit-lookup.service.ts` into a new sibling module `src/lib/services/cuit-lookup.service.internal.ts`.
- Re-export the three names from the new module with identical signatures and behavior.
- The runtime `lookupCuit` must still consult the override via the internal module (so tests keep their current effect through the new module).
- `src/__tests__/unit/cuit-lookup.service.test.ts` must import the seams from the new module.
- Public API of `lookupCuit` is unchanged: same signature, same in-flight dedupe, same driver resolution, same error mapping, same 15s timeout, same 240-char truncation, same mapping of `extra`.

### Nit C — wrap two `fireEvent.change` blocks with `act`

In `src/__tests__/components/ContactoFormDialog-cuit-lookup.test.tsx`:
- Wrap the two `fireEvent.change` blocks at L57-65 (the test `button is enabled only when CUIT is module-11 valid`) with `await act(async () => { fireEvent.change(...) })` so React stops emitting "not wrapped in act(...)" warnings.
- Cosmetic only; tests already pass.

### Deliverable D — draft ADR-027H

Author `knowledge/architecture/ADR-027H-FISCAL-CONSULTA-CUIT-USO-PRODUCTIVO.md` following the ADR-027G and ADR-027E style. It binds the operational use of the lookup against the productive TusFacturasAPP account.

Required sections (no code, no implementation details):
- Contexto
- Decisión
  - Authorization and rate limits per company/actor (proposed: X req/min per actor, Y req/hour per company; reuse sensible defaults; mark numbers as DRAFT pending validation).
  - Required redaction in server logs: never log `apiFactory` (sic — meant `apiFactory` placeholder for the auth triple; redact `apikey`/`apitoken`/`usertoken`), never log full addressable personal data; only provider, business ID, error code, business input response code, sanitized request_id.
  - Credit consumption logging per company/actor.
  - Audit policy: every business lookup MUST emit an `AuditEvent` (reuse existing table; no new columns) with:
    - `entityType = "ContactCuitLookup"`
    - `action = "cuit_lookup"`
    - `module = "contacts-fiscal"`
    - `companyId`
    - `actorUserId`
    - `requestId` (sanitized)
    - `maskedCuit` (first 4 + last 2 digits)
    - `provider`
    - `responseCode`
    - `errorCode`
  - Provider error handling matrix:
    - `cuit_provider_timeout` (502): surface sanitized code only.
    - `cuit_provider_conflict` (422): surface sanitized code; the original TusFacturas error string stays in server logs at WARN level.
    - `cuit_no_iva_condition` (422): surface sanitized code; keep an internal note that ARCA does not register VAT for the CUIT.
    - `cuit_dev_config_missing` (422): surface sanitized code; never expose config keys.
  - Cost and budget ceilings (per company/day).
- Capa UI (no changes; reaffirm current behavior)
- Límite del MVP (reaffirm)
- Consecuencias (positivas / negativas)
- Reglas derivadas (no new schema columns; no persistence; no estado→isActive; no cache; no other providers)
- Validación (mark ADR as DRAFT, not approved)
- Próximos pasos
- Aprobación (Franco explicit approval required AFTER a PROD smoke with synthetic CUITs only)

Explicit out of scope (reaffirm):
- Persistent cache (deferred).
- Persisting `apoc/actividad/constancia_full_datos` (deferred).
- ARCA `estado` → `isActive`/`linkIsActive` (deferred).
- Integration with other providers (deferred).
- Smoke against real ARCA outside the controlled PROD smoke (forbidden).

Update `knowledge/KNOWLEDGE_INDEX.md` to add ADR-027H in the architecture list (alphabetic-ish placement after ADR-027G).

### Deliverable E — close session

- Write `knowledge/worklog/CONTACTS_CUIT_LOOKUP_FOLLOWUP_2026-10-07.md` referencing the prior `CONTACTS_CUIT_LOOKUP_DEV_2026-10-07` worklog and the HANDOFF update notes.
- Update `knowledge/specs/CONTACTS-CUIT-LOOKUP-DEV-20261007/HANDOFF.md` with a one-line note in `Risks` saying the three nits have been closed in the follow-up package.

## Out of scope

- Real DB writes, schema migrations, Auth/roles changes.
- Dependency changes (no new npm packages).
- Browser/Playwright.
- Persistent cache, persisting extras, ARCA `estado`→isActive, other providers.
- Smoke against real ARCA.
- Commit, push, PR, merge, deploy.
- Editing foreign files (Surgery, Remitos, lookup field, prior contact packages).

## Allowed files

- `src/app/api/companies/[companyId]/contacts/cuit-lookup/route.ts` (static import only)
- `src/lib/services/cuit-lookup.service.ts` (remove test seams; reference internal module)
- `src/lib/services/cuit-lookup.service.internal.ts` (new — holds the seams)
- `src/__tests__/unit/cuit-lookup.service.test.ts` (update import path)
- `src/__tests__/components/ContactoFormDialog-cuit-lookup.test.tsx` (wrap 2 fireEvent.change with act)
- `knowledge/architecture/ADR-027H-FISCAL-CONSULTA-CUIT-USO-PRODUCTIVO.md` (new)
- `knowledge/KNOWLEDGE_INDEX.md` (add ADR-027H entry)
- `knowledge/worklog/CONTACTS_CUIT_LOOKUP_FOLLOWUP_2026-10-07.md` (new)
- `knowledge/specs/CONTACTS-CUIT-LOOKUP-DEV-20261007/HANDOFF.md` (one-line note)
- `.opencode/locks/CONTACTS-CUIT-LOOKUP-FOLLOWUP-20261007.lock.md`
- `knowledge/specs/CONTACTS-CUIT-LOOKUP-FOLLOWUP-20261007/`

## Forbidden

- Anything not listed in Allowed files.
- Foreign surgery/remito/lookup field.
- `prisma/schema.prisma`, `src/lib/db.ts`, `src/lib/store.ts`, `src/types/index.ts`.
- New npm dependencies.
- `git commit`, `git push`, `git reset --hard`, `git checkout --` on foreign files.
- Browser/Playwright, real DB writes, real ARCA calls.
- Persistent cache TTL.
- Persisting `apoc_existe`/`actividad`/`constancia_full_datos`.
- ARCA `estado` → `linkIsActive`/`isActive` mapping.
- Other providers.

## Constraints

- Preserve all 23 suites / 259 tests from the prior package.
- No behavioral change in `lookupCuit` (signature, dedupe, driver resolution, error mapping, timeout, truncation, `extra` payload).
- ADR-027H is a DRAFT; it is not approval-ready.
- No commit/push/deploy.
- All `await act(async () => ...)` wraps in component tests already used as `act`; keep the same style for the new wrap.

## Validation gates

- `node knowledge/specs/CONTACTS-CUIT-LOOKUP-FOLLOWUP-20261007/run-checks.mjs` (own check script; must include the prior 23 suites + the 2 modified test files for regression).
- `node --max-old-space-size=6144 knowledge/specs/CONTACTS-CUIT-LOOKUP-FOLLOWUP-20261007/typecheck.mjs` (scoped to owned files + the new internal module + the route).
- ESLint on owned files only.
- Scoped `git diff --check` on owned files only.
- Independent sibling review via subagent; if unavailable, focused self-review covering: (i) all 3 nits closed; (ii) zero behavior change; (iii) ADR-027H covers every required bullet; (iv) no scope creep.

## Handoff

Caveman `Done / Changed / Files / Validations / Risks / Next` with exact test counts and ADR-027H draft path.
