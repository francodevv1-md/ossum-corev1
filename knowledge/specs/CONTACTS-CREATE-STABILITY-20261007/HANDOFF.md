# Contact creation stability — console validation handoff

## Done
- Bounded DEV implementation and independent review completed; console gates pass. Global build/runtime certification remains open.
- Preserved configured authenticated company resolution, API authorization, global contact identity/address semantics and company-specific commercial links.
- No browser, real DB mutation, schema/migration, Auth/role changes, dependency installation, commit or publication.

## Changed
- Inferred create/update request types and validated serialized response contracts replace loose contact HTTP records.
- Form payload validation reuses existing API schema limits. No new mandatory document, role or group requirements.
- Mapper preserves explicit legal identity for creation; explicit update mode uses the edited denomination and omits immutable codes.
- Shared drafts are pinned to their opening company; company changes close/block reuse. Pending duplicate submits and stale mutation callbacks are rejected; failures permit retry.
- Lists/search are company-tagged and stop stale pagination. Save retains the canonical record and refreshes the complete company list; failed refresh keeps existing/saved rows and permits retry.
- Existing created-contact audit executes inside the service transaction. Optional actor argument preserves existing internal resolver callers; audit/read-back failure aborts creation.

## Files
- `src/lib/validators/contact.ts`
- `src/lib/api/contacts.ts`
- `src/lib/api/contact-adapter.ts`
- `src/lib/services/contact.service.ts`
- `src/app/api/companies/[companyId]/contacts/route.ts`
- `src/app/contactos/page.tsx`
- `src/components/contactos/ContactoFormDialog.tsx`
- `src/components/contactos/ContactSearchModal.tsx`
- Added `src/__tests__/unit/contacts-api-contract.test.ts` and `contacts-create-route.test.ts`.
- Updated `src/__tests__/components/ContactsBackendAuthorityUI.test.tsx`, `ContactosCrud.backend.test.tsx` and `src/__tests__/unit/contact-backend-authority-validator-adapter.test.ts`.
- This brief/handoff, `qa/run-checks.mjs`, `qa/typecheck.mjs`, own ownership lock and worklog.
- Foreign dirty ContactLookupField, Nueva Cirugía, Expediente, Remitos and infrastructure files were not edited by this package.

## Validations
Run from the repository root:

```powershell
node knowledge/specs/CONTACTS-CREATE-STABILITY-20261007/qa/run-checks.mjs
node --max-old-space-size=6144 knowledge/specs/CONTACTS-CREATE-STABILITY-20261007/qa/typecheck.mjs
```

- Final checks: **15 suites / 196 tests PASS**; **24 compiler entries / 607 resolved files / 0 diagnostics**.
- Covers client → actual POST/service → actual GET → frontend mapper round-trip; physical/legal creation; code conflicts; existing role/company rejection; malformed requests/responses; company draft/result isolation; duplicate submits; create/edit/status/list/selectors; pending-list reconciliation; error retries; AuthProvider and Nueva Cirugía regressions.
- Focused ESLint: **0 errors**, 9 existing unused-import warnings in the form. Scoped `git diff --check`: PASS; Git emits line-ending notices only.
- Diagnose evidence before fixes: completed creation followed by audit failure returned 500; new actual-route/service checks reproduced persisted rows after failure. Duplicate-submit and company-draft checks failed before safeguards.
- Independent read-only review: P2 initial-list truncation found despite passing tests. Replaced empty-list fixture with nonempty pending/fresh responses; added authoritative refresh. Reviewer recheck **PASS**, no remaining concrete issue in reviewed scope.
- Actual global `node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit --incremental false`: **FAIL (exit 2)**, diagnostics outside owned Contactos files. Examples: foreign `NewSurgeryDialog.tsx`/`AiLateralRailProps.onToggleOpen`, unrelated Compras/Comparativa contracts and ambient Cloudflare DOM/Response types.
- Global pre-task/current in-memory comparison exceeded 180s; narrower comparison exceeded 90s. Neither certifies a global no-regression result. Removed the package's unsuccessful comparison helper rather than leave an unusable check.

## Risks
- Transaction tests use explicitly labeled staged database doubles: they prove callback/rollback boundaries, not PostgreSQL isolation, actual constraints or authenticated persistence.
- Actual available/configured company count was not queried from the database.
- Browser QA was explicitly excluded; 1366×768, 1920×1080 and 390×844 visual/runtime gates are **not certified**.
- No production build was run. Existing `next.config.ts` ignores build-time TypeScript errors; a successful build would not establish globally clean types.
- Existing PATCH audit remains outside its update transaction; this new-create package did not expand into editing persistence.

## Next
- Keep the implementation available for manual DEV use; validate authenticated persistence separately against an explicitly confirmed disposable DEV database.
- Address global compiler failures in their owning work packages before claiming repository-wide readiness. Commit/publication requires a separate explicit request.
