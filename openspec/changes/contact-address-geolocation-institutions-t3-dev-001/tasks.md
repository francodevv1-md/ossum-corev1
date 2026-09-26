# Tasks: Contact Address Geolocation — Institutions T3 DEV

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 500–700 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Internal slice 1 (backend/contracts/audit/tests) → isolated slice 2 (institution UI/preview/tests/browser) |
| Delivery strategy | auto-chain |
| Chain strategy | pending (internal only; no PR) |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Server contract, mutation defense, audit, tests | Internal only | Independently reviewable; no commit/PR. |
| 2 | Institution-only form and fixed preview | Internal only | Isolated UI slice; consumes the specified contract. |

## Visible Locks

| Slice | Owner | Files/folders | Status |
|---|---|---|---|
| 1 | Diagnose remediation executor | `src/lib/{services,api}`, unit tests | released |
| 2 | Diagnose remediation executor | `src/components/contactos/ContactoFormDialog.tsx`, component tests | released |

**Forbidden:** `prisma/schema.prisma`, `prisma/migrations/**`, Prisma inspection/commands, global permission/Auth changes, `src/components/logistica/**`, fixtures/imports, GPS/vehicles/tracking, commits, and PRs.

## Phase 1: Slice 1 — Backend, Contracts, Audit, Tests

- [x] 1.1 Create `src/lib/georef/georef-address.adapter.ts`: injected `fetchImpl`, encoded `/direcciones` request (`max=10`), finite WGS84 normalization, and `georef_lookup_unavailable` failures.
- [x] 1.2 Extend `src/lib/validators/contact.ts` and `src/lib/api/contact-adapter.ts` for `mainAddress.geo`: institution gate, paired bounds, CRS/source/type/status invariants, and admin-only verified/manual statuses.
- [x] 1.3 Add typed lookup client in `src/lib/api/contacts.ts` and guarded `src/app/api/companies/[companyId]/contacts/georef/lookup/route.ts`; reuse existing company mutation access only.
- [x] 1.4 Update contact create/PATCH routes and `src/lib/services/contact.service.ts` to preserve validated data pending explicit resolution, persist changed geo only, and emit exactly one required `AuditEvent`.
- [x] 1.5 Add adapter and contact-geo tests for provider failures, tenant denial, non-institution rejection, operator/admin transitions, protected validated data, and audit old/new/source metadata.

## Phase 2: Slice 2 — Institution Form, Preview, Tests, Browser

- [x] 2.1 Create `InstitutionGeographySection.tsx` with explicit candidate/manual selection and role-gated status controls; mount it from `ContactoFormDialog.tsx` only for `instituciones`.
- [x] 2.2 Create `ContactAddressMapPreview.tsx` with one fixed, non-draggable marker, coordinate-type label, responsive layout, and no Logistics imports/endpoints.
- [x] 2.3 Add `InstitutionGeographySection.test.tsx`: institution gate, explicit selection, operator cannot validate, preview valid coordinates, and narrow/wide usability.

## Exact Validation Checklist

- [x] `npm run test -- src/__tests__/unit/georef-address.adapter.test.ts src/__tests__/unit/contact-geography.test.ts`
- [x] `npm run test -- src/__tests__/components/InstitutionGeographySection.test.tsx`
- [ ] `npm run typecheck`, `npm run lint`, `npm run build` (test/typecheck/build passed; full lint remains pre-existing repository failure)
- [ ] Browser: authenticated admin/operator institution flow; lookup → explicit selection → save/audit → fixed preview; non-institution hidden/rejected; no Logistics change. Stop at 20 minutes, close browser, report blocker.
- [x] Review diff confirms forbidden paths untouched; release both locks; Caveman handoff. No commit or PR.

### Slice 1 validation record

- [x] Focused adapter/contract/route tests (7 assertions) and `npm run typecheck`.
- [x] Targeted ESLint on all Slice 1 files and `git diff --check`.
- [ ] Full-repository lint/build and Slice 2 browser validation remain outside this backend slice.

### Slice 2 validation record

- [x] `npm run test -- src/__tests__/components/InstitutionGeographySection.test.tsx` (3 tests), `npm run typecheck`, targeted ESLint, `npm run build`, and `git diff --check`.
- [ ] Full `npm run lint` remains blocked by 319 pre-existing repository errors / 721 warnings; no Slice 2 targeted lint violations.
- [ ] Authenticated browser validation at 1366/1024/390 was not started: Playwright has no persisted `storageState` or configured authenticated Contact flow. No browser session was opened.

### Independent-review Diagnose remediation

- [x] Persisted ContactAddress geography now maps into the editable contact contract and initializes the reopened institution form.
- [x] Focused contracts cover candidate-to-admin validation/audit and foreign-tenant rejection before mutation/audit.
- [x] Focused tests (16), typecheck, targeted ESLint, production build, and `git diff --check` passed.
- [x] Focused component coverage proves ambiguous and empty lookups preserve existing geo until explicit candidate selection or manual coordinate entry.
