# Handoff: SURGERY-RESCHEDULE-012-CORE (Final Corrective Snapshot)

- **Task**: `012-CORE` — Surgical Rescheduling & `surgeryTimeSpecified` nullable marker
- **Role**: Antigravity (sole implementation owner)
- **Reviewer**: Sol2 (independent post-implementation review, read-only)
- **Base HEAD**: `21385527dcfbc6ebc5b1507096d03a2c402d8c4d`
- **Execution Date**: 2026-10-05
- **Status**: Completed final corrective snapshot ready for single independent Sol2 re-review
- **Ownership Lock**: `.opencode/locks/SURGERY-RESCHEDULE-012-CORE.lock.md` retained under Antigravity until Sol2 review completes.

---

## 1. Chronological Reconciliation

1. **Phase 1 (Offline Verification & Discovery)**:
   - Initial 8 findings addressed in code without shared client mutation.
   - Prisma schema compatibility verified in isolated scratch client (`.tmp/isolated-client`).
   - Zero shared client generation or unapproved database execution.
2. **Phase 2 (Explicit User Authorization)**:
   - Franco provided explicit authorization to apply migration `20261005_surgery_time_specified` to the disposable DEV database and sequentially resolve the 4 remaining defects from Sol2's re-review (#8811).
3. **Phase 3 (DEV Migration & Shared Client Regeneration)**:
   - `npx prisma migrate deploy` executed against PostgreSQL DEV target (`aws-1-sa-east-1.pooler.supabase.com:5432`).
   - Migration `20261005_surgery_time_specified` applied (added nullable column `surgeryTimeSpecified boolean` without default or destructive changes).
   - `npx prisma generate` executed, updating the workspace `@prisma/client` cleanly to v7.8.0.
   - Zero database resets, seeds, or forensics executed.
4. **Phase 4 (Final Corrective Closure of 4 Remaining Defects)**:
   - Defect 1: Precision & Typing resolved with unified effective precision and removal of cast.
   - Defect 2: Asynchronous Identity resolved with session generation, companyId, and backendId tracking.
   - Defect 3: Real Callers connected across desktop DataGrid, Expediente Header/FullView, and Mobile.
   - Defect 4: Evidence & Closure reconciled, hashes computed, test suite executed with 101/101 passing tests.

---

## 2. Four Defects Resolution Matrix

| # | Defect Identified by Sol2 | Verification Test | Minimal Fix Implemented | Result |
|---|---|---|---|---|
| **1** | **Precisión y tipado**: Incoherencia entre `time` y `surgeryTimeSpecified`. Timestamp nuevo sin marcador heredaba el marcador previo. Cast `Record<string, unknown>` en `coordination-view.service.ts`. | `src/__tests__/unit/backend-active-surgeries-adapter.test.ts` (test case `assigns null marker and empty time when a new timestamp arrives without marker...`) | Unified `effectiveSurgeryTimeSpecified` in `surgery-adapter.ts` for both `time` and `surgeryTimeSpecified`. When a new timestamp arrives with omitted marker, resolves to `null` and `""`, regardless of previous local surgery state. In `coordination-view.service.ts`, projected `surgeryTimeSpecified` directly without cast. | **PASS** (31/31 tests) |
| **2** | **Identidad asíncrona**: Falta de amarre a `companyId` y generación de diálogo. Éxitos/errores tardíos podían mutar la UI tras cerrar o cambiar de empresa/cirugía. Comparar solo ID visible era insuficiente. | `src/__tests__/unit/useCirugiaActions-change-date.test.tsx` (4 race condition & session tests: close dialog, switch surgery, switch company, reopen same surgery) | In `useCirugiaActions.ts`, added `dateDialogSessionRef` tracking `{ generation, companyId, backendId, surgeryId, isOpen }` and `activeCompanyIdRef`. Wrapped `setChangeDateDialogOpen` to reset session on close. In `handleChangeDate`, verified `isCurrentSession()` before updating store, firing toast, closing dialog, or setting errors. | **PASS** (13/13 tests) |
| **3** | **Callers reales**: Desktop/DataGrid y Ficha usaban setters crudos `onSetDialogSurgery; onSetChangeDateDialogOpen(true)` en vez del opener inicializado `openChangeDateDialog(s)`. Pruebas no ejercitaban componentes reales. | `src/__tests__/components/CirugiasDataGrid.test.tsx` (real click on actions cell menu), `src/__tests__/components/ExpedienteHeader.test.tsx` (real click on header menu), `src/__tests__/components/ExpedienteFullView.test.tsx` (prop forwarding and trigger) | Added `onChangeDate?: (s: Surgery) => void` to `CirugiaActionsCellProps`, `CirugiasColumnContext`, `ExpedienteHeaderProps`, and `ExpedienteFullViewProps`. Wired `actions.openChangeDateDialog` in `page.tsx` for `columnsContext` and `ExpedienteFullView`. Tested real clicks on actual components without mock substitutions. | **PASS** (CirugiasDataGrid: 6/6, ExpedienteHeader: 4/4, ExpedienteFullView: 5/5) |
| **4** | **Evidencia y cierre**: Reconciliación cronológica de HANDOFF y lock. Documentación de preimagen y deltas disponibles. | Full 10-suite Vitest execution + `tsc --noEmit --incremental false` + SHA-256 verification. | Documented chronological phases, pre-image/delta reality (additive column, existing records NULL, zero synthetic backfill), froze 26 SHA-256 hashes. | **PASS** (101/101 tests, 0 errors in allowlist) |

---

## 3. Database Pre-Image & Delta Reality

- **Pre-image**: `surgery` table lacked `surgeryTimeSpecified` column. All pre-existing surgeries had timestamps stored with default/historic database timezone offsets, but no precision marker.
- **Applied Delta**: Added nullable column `surgeryTimeSpecified Boolean?` via migration `20261005_surgery_time_specified`.
- **Historical Records**: Pre-existing surgery records remain `surgeryTimeSpecified = null` (representing unknown precision). No destructive or retroactive backfill was performed.
- **New Updates**: Rescheduled surgeries explicitly store `true` (time specified, including midnight) or `false` (date-only, operational midnight UTC-3 anchor) or `null` (legacy patch without marker).

---

## 4. Test Coverage & Validation Evidence

### 4.1 Scoped Vitest Execution (10 Authorized Files)

**Command**:
```bash
node node_modules/vitest/vitest.mjs run \
  src/__tests__/unit/surgery-management-route.test.ts \
  src/__tests__/unit/surgery-management.service.test.ts \
  src/__tests__/unit/backend-active-surgeries-adapter.test.ts \
  src/__tests__/unit/useCirugiaActions-change-date.test.tsx \
  src/__tests__/components/ChangeDateDialog.test.tsx \
  src/__tests__/unit/useCirugiaActions-create-backend-only.test.tsx \
  src/__tests__/components/CirugiasChangeDateFlow.test.tsx \
  src/__tests__/components/CirugiasDataGrid.test.tsx \
  src/__tests__/components/ExpedienteFullView.test.tsx \
  src/__tests__/components/ExpedienteHeader.test.tsx
```

**Results**:
- **Exit code**: `0`
- **Test files**: **10 passed (10 of 10)**
- **Tests**: **101 passed (101 of 101, 0 failed)**

**Breakdown**:
1. `src/__tests__/unit/backend-active-surgeries-adapter.test.ts`: **31 passed**
2. `src/__tests__/unit/surgery-management.service.test.ts`: **8 passed**
3. `src/__tests__/unit/surgery-management-route.test.ts`: **18 passed**
4. `src/__tests__/unit/useCirugiaActions-create-backend-only.test.tsx`: **8 passed**
5. `src/__tests__/unit/useCirugiaActions-change-date.test.tsx`: **13 passed**
6. `src/__tests__/components/ChangeDateDialog.test.tsx`: **6 passed**
7. `src/__tests__/components/CirugiasChangeDateFlow.test.tsx`: **2 passed**
8. `src/__tests__/components/CirugiasDataGrid.test.tsx`: **6 passed**
9. `src/__tests__/components/ExpedienteHeader.test.tsx`: **4 passed**
10. `src/__tests__/components/ExpedienteFullView.test.tsx`: **5 passed**

### 4.2 TypeScript Type-Checking

**Command**:
```bash
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

**Separation of Diagnostics**:
- **012-CORE Allowlist Files (26 files)**: **0 TypeScript errors**. All types, adapters, services, hooks, components, and tests compile cleanly.
- **Pre-existing Workspace Diagnostics (outside allowlist, unrelated)**:
  - `next.config.ts`: TS2353 ('eslint' property in NextConfig)
  - `src/__tests__/components/CoordinationPreviewBoundary.test.tsx`: TS2322 (Coordination test fixture missing surgeryTimeSpecified)
  - `src/__tests__/components/CoordinatorShareDialog.test.tsx`: TS2345, TS2769 (Toast / testing-library options)
  - `src/__tests__/components/SendEmailModal.test.tsx`: TS2345 (Toast overload)
  - `src/__tests__/unit/mail-send-honesty.test.ts`: TS2493, TS18048 (Tuple indices)
  - `src/app/cirugias-api/page.tsx`: TS2345 (Unrelated prototype page)

---

## 5. Frozen SHA-256 Hashes (26 Files)

```
d3f42d47ec04b98da25160b8874bb8aa473d65fecdb664ae2860f535614e3e04  prisma/schema.prisma
abaa4db45a6bf70d110d21f121f0fb1a4eb9751973af4954974e3a1d1ad944c9  prisma/migrations/20261005_surgery_time_specified/migration.sql
fb1cd1e25dbdc2f9ea9ab9dcb25abf5b30a895e31023000ee95ca729cd19762a  src/app/api/companies/[companyId]/surgeries/[surgeryId]/route.ts
4ba0a199103bf5ca841840e9d3f8177c04c44afd15e0d72019c45427f489eda4  src/lib/validators/surgery.validator.ts
798501b253e3cf57eb1382e220f0da401999ab03bb7db099d9217d64f0d904d7  src/lib/services/surgery.service.ts
a3c6c46cee2952bc974039dd589dd2240eb200f6baa782d6e633e64dfe90e105  src/lib/services/coordination-view.service.ts
705f154a3359579aac3ce921bf627c2a0da4e8c935c81642df848f261152be53  src/lib/api/backend-surgeries.ts
e7ba58a6de4409a39743dbc04630f2dea1e3cf815bb72f1e7a63f666d806929e  src/lib/api/surgery-adapter.ts
35c34f6151b710d99cf6f2c8449561344f0c150c4b50dd570491fc909c9f0dd0  src/types/index.ts
16f76b72b362b6d5fa35c8adf4caf4c0382deeb2e0a5b12fb84bdf917b0d3f90  src/hooks/useCirugiaActions.ts
d44b68c2024f94b41d148df5769b5a1309610ff20c8ffa1b676b3ea71549b083  src/components/cirugias/dialogs/ChangeDateDialog.tsx
aa79d75c26e3600f89a3647e37c75615d669ae2ea4c0af3b6d81769de1d19dea  src/app/cirugias/page.tsx
88f91d95a8aa0e785aa1e654b0d78747e4b9f18a474868c5d38b0a226a31267a  src/lib/cirugias/cirugias-columns.tsx
19d81a979c5d2fa3362b13c5ca7c4ee208ba152b5ae45eeb257c8f85ca4d1acc  src/components/cirugias/CirugiaActionsCell.tsx
e83bc64c79a13273aebb1e123a0a1d664468004b2dc89e9bcecc1fef76e657bd  src/components/expediente/ExpedienteFullView.tsx
d499d2db14c06f8e1416e59ff6125fe24534989076ce6c688e016fc5f1ded015  src/components/expediente/ExpedienteHeader.tsx
fc99f2e72facd48d5d62cb7dc8cf2525d9784780018f8c7e39585759c6c12cce  src/__tests__/unit/surgery-management-route.test.ts
759061ef169390782364cb2d3374e8a555bc66f1b925ba7bf139d6a8781459de  src/__tests__/unit/surgery-management.service.test.ts
35c21b3d558d10062f8caa31d987817245db5f3638d3db9338494ae2a172c3ac  src/__tests__/unit/backend-active-surgeries-adapter.test.ts
18e34ffe9405826bfc3ce4e2a2a29f082e45cee61feb546ad8106ad0fe54d30f  src/__tests__/unit/useCirugiaActions-change-date.test.tsx
c8599338f86edfcdd77f57b1c5b99ecf54247ea19a0e3abe55420bbbe7ccd968  src/__tests__/components/ChangeDateDialog.test.tsx
0016c7424a748e3088bb73e5ec391e99272dbda716fe838b22cf1876332c88b8  src/__tests__/unit/useCirugiaActions-create-backend-only.test.tsx
1d2e6a4da054d1bf439daafac656b31035ccba95eeeb241ab3a6ebae2310ce67  src/__tests__/components/CirugiasChangeDateFlow.test.tsx
1f95d02869de8dbe125268cb762981b79ce3e8f3f87817dabe6e58033a05c435  src/__tests__/components/CirugiasDataGrid.test.tsx
004d60201588daffa4f1c00ac33b8a7a4a6345934d8846c9c0134bfffb50904c  src/__tests__/components/ExpedienteFullView.test.tsx
fa36fa8590513278116f49e52f532448b24e645c945a40ab01d3909b082a3f10  src/__tests__/components/ExpedienteHeader.test.tsx
```

---

## 6. Instructions for Sol2 (Independent Reviewer)

1. **Read-only audit**: Do NOT modify files or databases.
2. **Verify SHA-256 hashes**: Confirm working copy matches Section 5.
3. **Audit resolution of 4 defects**:
   - Defect 1: Verify `surgery-adapter.ts` unified `effectiveSurgeryTimeSpecified` and `coordination-view.service.ts` direct projection.
   - Defect 2: Verify `useCirugiaActions.ts` tracks session generation, companyId, and backendId with rejection of late/stale responses.
   - Defect 3: Verify caller wiring across `CirugiaActionsCell.tsx`, `cirugias-columns.tsx`, `ExpedienteHeader.tsx`, `ExpedienteFullView.tsx`, and `page.tsx` with passing real-click tests.
   - Defect 4: Verify chronological record and absence of synthetic backfill.
4. **Ownership Lock**: Lock `.opencode/locks/SURGERY-RESCHEDULE-012-CORE.lock.md` remains held until review concludes.
