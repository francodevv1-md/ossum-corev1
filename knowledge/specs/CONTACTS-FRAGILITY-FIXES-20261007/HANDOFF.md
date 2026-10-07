# Contacts fragility fixes — 2026-10-07 handoff

## Done
- Implemented four surgical fragility fixes (items 1, 3, 5, 6, 7 of the verified map) over the prior approved `CONTACTS-CORRELATIVE-DEV-20261007` and `CONTACTS-CREATE-STABILITY-20261007` packages. All four prior package tests still pass; new tests cover each item.
- Independent sibling review completed after parent escalation: 0 actionable defects. Two defensive notes recorded (potential null result in updateContact return path; audit `newValue` carries raw validator `undefined`s). All four fragility fixes (items 1/3/5/6/7) verified as scoped.
- No browser/Playwright (per parent instruction). No schema/migration, Auth/roles, provider, secret, commit, push, deploy.

## Changed
- `src/lib/services/contact.service.ts`: `createContact` now maps `groupSlugs: coordinadores` + `role: interno` to `linkRole: 'coordinator'` while keeping `roles: ['interno']`; `updateContact` accepts an optional 5th `auditOptions` parameter (backwards compatible) and emits both `updated` and `reactivated`/`deactivated` audits inside the same `prisma.$transaction` as the update, with a test-only `auditDelegate` injection hook.
- `src/app/api/companies/[companyId]/contacts/[contactId]/route.ts` (PATCH): now passes `auditOptions` to `updateContact` and drops the separate `createAuditEvent` calls. Audit failure aborts the mutation.
- `src/hooks/useCirugiaActions.ts`: new exported helper `resolveSurgeryInstitutionLocationForManualCheck` with store-preloaded prev-compat + new pre-loaded `selectedInstitution` path. The existing strict check at the top of `handleNewSurgery` now delegates to the helper. Public hook signature unchanged.
- `src/components/contactos/ContactLookupField.tsx` (foreign dirty, targeted change): added `invalidateManualLookup` helper (bumps `requestRef`, clears feedback/lookingUp) wired into onChange, modal onOpenChange, and modal onSelect. Stale `lookupByCode` responses are now discarded.
- `src/app/contactos/page.tsx`: compact `data-testid="contactos-correlative-badge"` pill in the header that derives last + next code from the in-memory list (no extra request). Includes inactive links so the displayed last code never regresses.

## Files
- `src/lib/services/contact.service.ts`
- `src/app/api/companies/[companyId]/contacts/[contactId]/route.ts`
- `src/hooks/useCirugiaActions.ts`
- `src/components/contactos/ContactLookupField.tsx` (limited targeted change)
- `src/app/contactos/page.tsx`
- New: `src/__tests__/unit/contact-coordinator-legacy.test.ts` (5 tests)
- New: `src/__tests__/unit/contact-update-audit-in-tx.test.ts` (6 tests)
- New: `src/__tests__/unit/useCirugiaActions-institution-helper.test.ts` (10 tests)
- New: `src/__tests__/components/ContactLookupField-stale-search.test.tsx` (3 tests)
- New: `src/__tests__/components/ContactosCorrelativeBadge.test.tsx` (2 tests)
- `knowledge/specs/CONTACTS-FRAGILITY-FIXES-20261007/TASK_BRIEF.md`
- `knowledge/specs/CONTACTS-FRAGILITY-FIXES-20261007/run-checks.mjs`
- `knowledge/specs/CONTACTS-FRAGILITY-FIXES-20261007/typecheck.mjs`
- `knowledge/specs/CONTACTS-FRAGILITY-FIXES-20261007/HANDOFF.md`
- `knowledge/worklog/CONTACTS_FRAGILITY_FIXES_20261007.md`
- `.opencode/locks/CONTACTS-FRAGILITY-FIXES-20261007.lock.md`

## Validations
- `node knowledge/specs/CONTACTS-FRAGILITY-FIXES-20261007/run-checks.mjs`: **19 suites / 194 tests PASS**.
- `node --max-old-space-size=6144 knowledge/specs/CONTACTS-FRAGILITY-FIXES-20261007/typecheck.mjs`: **14 entries / 599 resolved files / 0 diagnostics**.
- Focused ESLint on owned files: **0 errors** (1 preexisting `useEffect` deps warning in `ContactLookupField.tsx`).
- Scoped `git diff --check` on owned files: PASS (only LF/CRLF platform line-ending warnings).
- No browser QA, no real DB mutation, no schema/migration, no Auth/roles.

## Risks
- Independent sibling review closed; two defensive notes (potential null result in updateContact return path; audit `newValue` carrying raw validator `undefined`s) are not in any reachable execution path under current data flow.
- No production build/global clean claim.
- Pre-existing `useCirugiaActions-change-date` foreign test isolation failure is excluded from this package's run-checks (same exclusion as the prior correlative run-checks).
- The `useCirugiaActions` change relies on `Contacto` from `@/types`; no public type changes.
- The badge text is a single string to avoid colliding with existing `findByText("C-0042")` queries in `ContactsBackendAuthorityUI.test.tsx`.

## Next
- Validate against an explicitly confirmed disposable DEV database via the prior correlative `run-real-db.mjs --confirmed-disposable-dev` if needed.
- Resolve the `useCirugiaActions-change-date` foreign test isolation issue in its owning work package.
- Commit/publication requires a separate explicit request.
