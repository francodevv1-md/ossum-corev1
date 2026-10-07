# Contact correlativo + actual DEV persistence

## Done
- Implemented bounded approved DEV package and actual console PostgreSQL validation. Parent arranged sibling independent read-only review after nested delegation hit the harness depth limit: **PASS**, no actionable findings.
- Real configured Supabase password login, existing company membership, actual auth-context/GET/POST/PATCH/preview handlers and Prisma/PostgreSQL exercised. No mocked Auth or invented actor/company.

## Changed
- Shared numeric-max allocation/preview includes inactive links, ignores legacy nonnumeric formats, guards unsafe integers and retries the entire transaction up to five times only for the company/code unique constraint. Removed the retry-index offset; explicit legacy codes and public listing array retained.
- Installed PrismaPg emits P2002 metadata under `driverAdapterError.cause.constraint.fields` with quoted `companyId`, rather than `meta.target`. Both supported, unrelated uniqueness propagates.
- Added authenticated company-scoped, no-store `GET /api/companies/[companyId]/contacts/code-preview`, typed/validated client, and compact shared-form advisory copy. Estimated code never enters create payload; failed saves refresh preview; reopening fetches anew; stale requests are discarded and unavailable preview does not block save.
- No optional master extra request or code-copy polish: foreign dirty `ContactLookupField.tsx` remains owned elsewhere.

## Files
Own changes layered over preserved preceding stability package:
- `src/lib/services/contact.service.ts`
- `src/lib/validators/contact.ts` (preview response schema only)
- `src/lib/api/contacts.ts` (preview API only)
- `src/app/api/companies/[companyId]/contacts/code-preview/route.ts` (new)
- `src/components/contactos/ContactoFormDialog.tsx` (preview only)
- `src/__tests__/unit/contact-correlative.test.ts` (new)
- `src/__tests__/unit/contacts-create-route.test.ts` (preview + realistic conflict metadata)
- `src/__tests__/components/ContactsBackendAuthorityUI.test.tsx` (preview cases/mock)
- `src/__tests__/components/ContactosCrud.backend.test.tsx` (preview mock)
- `src/__tests__/integration/contact-correlative-postgres.test.ts` (new, opt-in)
- This spec directory, own lock and `knowledge/worklog/CONTACTS_CORRELATIVE_DEV_20261007.md`.

## Validations
- `node knowledge/specs/CONTACTS-CORRELATIVE-DEV-20261007/run-checks.mjs`: **16 suites / 228 tests PASS** (prior 15-suite command now 221 tests plus new 7). The previously reported 196 baseline also grew through concurrent foreign surgery tests; do not attribute all additions to this package.
- Prior scoped compiler: **25 entries / 610 resolved files / 0 diagnostics**.
- `node --max-old-space-size=6144 knowledge/specs/CONTACTS-CORRELATIVE-DEV-20261007/typecheck.mjs`: **3 entries / 436 resolved files / 0 diagnostics**.
- Focused ESLint: **0 errors / 9 preexisting unused-import warnings**. Scoped `git diff --check` PASS.
- `node knowledge/specs/CONTACTS-CORRELATIVE-DEV-20261007/run-real-db.mjs --confirmed-disposable-dev`: **1 real integration test PASS** on third run; first two runs exposed the actual adapter metadata shape. Successful run `QA-CONTACT-CORRELATIVE-97bbd8c8-5f4c-4f8a-ad4f-affaed2cff41`.
- Real race: two first allocation reads synchronized on **2 independent PostgreSQL connections**, **3 transaction attempts**, **POST 201 + 201**, distinct **C-0007 / C-0008**. No artificial rejection or serialization of the competing writes.
- Real code search, edit, deactivate/reactivate, Decimal response, created/updated/deactivated/reactivated audit, explicit duplicate 409 without orphan contact, and injected audit-delegate failure rolling back the actual DB transaction PASS.
- Read-only `inspect-db.mjs`: required unique indexes already existed; initial **36 links / 32 legacy-format codes / numeric max 4**. Final **40 links / unchanged 32 legacy-format codes / max 8**. Across all three runs **4 own synthetic contacts retained inactive, 0 active, 0 deleted**, 11 audit rows. C-0005 and C-0006 are failed-run winners, each successfully inactivated; C-0007/C-0008 are successful-run fixtures.
- Transport distinction: real password login/network Auth verification and real DB; contact routes invoked in-process, not an HTTP listener. Existing offline suite covers actual client/route/adapter contract with staged DB; real integration does not certify browser or deployed HTTP transport.

### Diagnose evidence
1. Unit reproduction: allocation retried C-0010 as C-0012 instead of C-0011; unrelated P2002 became misleading allocation 409. Corrected offset and conflict classification.
2. Actual PostgreSQL reproduction after initial narrow classifier: race yielded 201/500 because installed adapter omits `meta.target`. Safe metadata-only diagnostic identified quoted constraint fields; supported actual shape, then real race/lifecycle passed.
3. Scoped compiler identified untyped empty test array inferred as never[]; annotated with existing ContactResponse. Lint rejected synchronous effect reset; moved reset into failed-save event path. Both gates pass.

## Risks
- Independent sibling review completed: allocation boundaries, supported/unknown conflict metadata, authorization, public contracts and stale-safe preview checked. In-memory actual-source boundary probes passed; reviewer did not repeat real DB writes. Five total transaction attempts means at most four retries.
- No Browser QA per explicit instruction; responsive viewports not certified. No production build/global clean claim; known unrelated global compiler failures remain outside scope.
- Preview is advisory, not a reservation or gapless sequence guarantee. Existing max scan is O(number of company C-prefixed links), unchanged scale characteristic.
- Existing PATCH audit remains outside update transaction; not expanded into this package.
- No schema/migration, renumbering, auth/roles, foreign selector/UI edits, reset/delete, commit/push/deploy.

## Next
- Independent review closed PASS; implementation ready for DEV use within the stated validation limits.
- Synthetic fixtures remain identifiable/inactive as evidence. Future reruns create two more fixtures per successful run and must retain the explicit disposable DEV gate.
