# CONTACTS-FRAGILITY-FIXES-20261007 — Worklog

## Goal
Close four fragility findings on the Contactos stack with surgical, evidence-backed fixes. No schema, no Auth, no deploy, no foreign scope. All four items build on the prior approved `CONTACTS-CORRELATIVE-DEV-20261007` and `CONTACTS-CREATE-STABILITY-20261007` packages.

## Implemented

### Item 5 — Coordinator legacy role mapping
- `src/lib/services/contact.service.ts` (createContact): when the form creates a contact with `groupSlugs` including `coordinadores` and a general `role` of `interno`, the primary `ContactCompanyLink` is persisted with `role: 'coordinator'` (matching `surgery.service.findFirst({ role: 'coordinator' })`) while `roles: ['interno']` keeps the maestro role filter working. Existing callers that pass `coordinator`/`proveedor`/`cliente`/`admin` are not affected.
- Test: `src/__tests__/unit/contact-coordinator-legacy.test.ts` — 5 tests covering the interno+coordinadores pair, non-matching cases, and end-to-end surgery.service lookup.

### Item 6 — PATCH audit inside the same transaction
- `src/lib/services/contact.service.ts` (updateContact): added optional 5th parameter `auditOptions` (backwards compatible — 4-arg callers still work). When provided, both `updated` (only when fields other than isActive change) and `reactivated`/`deactivated` actions are emitted inside the same `prisma.$transaction` as the update. An optional `auditDelegate` test-only injection hook lets the test force a failure.
- `src/app/api/companies/[companyId]/contacts/[contactId]/route.ts` (PATCH): now passes `auditOptions` to `updateContact` and drops the separate `createAuditEvent` calls. Audit failure aborts the mutation.
- Test: `src/__tests__/unit/contact-update-audit-in-tx.test.ts` — 6 tests covering both audits, isActive-only toggle, no-op updates, forced audit-delegate failure, default audit delegate, and 4-arg backwards compatibility.

### Item 3 — Institution address helper (selected contact path)
- `src/hooks/useCirugiaActions.ts`: new exported helper `resolveSurgeryInstitutionLocationForManualCheck` with cascade:
  1. No manual geography → ok
  2. Store resolves the institution → compare manual against store (prev-compat path)
  3. Store empty + dialog pre-loaded `selectedInstitution` with matching id → compare manual against selected (new path)
  4. Otherwise → not-resolved reason
- The existing strict check at the top of `handleNewSurgery` now delegates to the helper. The hook signature is unchanged. The 34-test `useCirugiaActions-create-backend-only` suite keeps passing.
- Test: `src/__tests__/unit/useCirugiaActions-institution-helper.test.ts` — 10 tests covering all paths and the prev-compat store-based resolution.

### Item 1 — Stale manual search invalidation
- `src/components/contactos/ContactLookupField.tsx` (foreign dirty, targeted change): added `invalidateManualLookup` helper that bumps `requestRef` and clears `feedback`/`lookingUp`. Wired into:
  - the input's onChange handler (every keystroke)
  - the search modal's onOpenChange (when opening, clear stale feedback)
  - the search modal's onSelect (selection clears feedback)
- The existing `lookupByCode` already gates on `requestId !== requestRef.current`, so the bump cancels any in-flight request.
- Test: `src/__tests__/components/ContactLookupField-stale-search.test.tsx` — 3 tests covering the A-then-B case, no-fire-on-type, and feedback-clear on new keystroke.

### Item 7 — Last + next correlative badge in master page
- `src/app/contactos/page.tsx`: compact `data-testid="contactos-correlative-badge"` pill in the header that derives the last + next code from the in-memory list (no extra request). Includes inactive links so the displayed last code never regresses on deactivation. `getContactCodePreviewApi` is preserved for the form's advisory copy.
- Test: `src/__tests__/components/ContactosCorrelativeBadge.test.tsx` — 2 tests covering the populated and empty-list cases.

## Validations
- `node knowledge/specs/CONTACTS-FRAGILITY-FIXES-20261007/run-checks.mjs`: **19 suites / 194 tests PASS** (prior 15-suite correlative baseline + own 5 new suites).
- `node --max-old-space-size=6144 knowledge/specs/CONTACTS-FRAGILITY-FIXES-20261007/typecheck.mjs`: **14 entries / 599 resolved files / 0 diagnostics**.
- Focused ESLint on owned files: **0 errors** (1 preexisting warning in `ContactLookupField.tsx` useEffect deps, unchanged from prior correlative package).
- Scoped `git diff --check` on owned files: PASS (only LF/CRLF platform warnings).
- Pre-existing `useCirugiaActions-change-date` foreign test isolation failure: not run in this package (excluded from run-checks like the prior correlative run-checks already excluded it).

## Risks
- Independent sibling review not available: harness subagent depth limit at 1. Did a focused self-review by re-reading the four key source paths.
- No browser/Playwright (per parent instruction).
- No production build/global clean claim.
- `useCirugiaActions-change-date` foreign test isolation failure is pre-existing and not in scope.
- New `Contacto` shape returned from the helper test relies on the existing `Contacto` type; the helper itself does not modify the public type.
- The badge in `contactos/page.tsx` is a single text node to avoid colliding with the existing tests that use `findByText("C-0042")` to find contact rows.

## Next
- Keep the implementation available for manual DEV use; validate against an explicitly confirmed disposable DEV database via the prior correlative `run-real-db.mjs` if desired.
- Resolve the `useCirugiaActions-change-date` foreign test isolation issue in its owning work package.
- Commit/publication requires a separate explicit request.
