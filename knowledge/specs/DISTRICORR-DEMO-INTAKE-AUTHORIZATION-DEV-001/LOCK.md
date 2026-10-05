# File Locks — DISTRICORR-DEMO-INTAKE-AUTHORIZATION-DEV-001

- **Task**: `DISTRICORR-DEMO-INTAKE-AUTHORIZATION-DEV-001`
- **Agent Role**: Implementation Owner
- **Selected Model**: Gemini 2.5 Pro / Antigravity
- **Status**: `released`
- **Owned Files**:
  - `src/components/cirugias/dialogs/NewSurgeryDialog.tsx`
  - `src/components/cirugias/dialogs/ChangeStateDialog.tsx`
  - `src/components/expediente/PresupuestoPanel.tsx`
  - `src/components/expediente/ExpedienteHeader.tsx`
  - `src/components/expediente/ExpedienteFullView.tsx`
  - `src/components/expediente/ComercialTabContent.tsx`
  - `src/hooks/useCirugiaActions.ts`
  - `src/lib/api/backend-surgeries.ts`
  - `src/lib/services/surgery.service.ts`
  - `src/lib/services/seguimiento.service.ts`
  - `src/lib/services/internal-notifications.service.ts`
  - `src/lib/validators/surgery.validator.ts`
  - `src/app/api/companies/[companyId]/surgeries/route.ts`
  - `src/app/api/companies/[companyId]/surgeries/[surgeryId]/route.ts`
  - `src/app/api/companies/[companyId]/surgeries/[surgeryId]/status/route.ts`
  - `src/__tests__/unit/surgeries-intake-authorization.test.ts`

- **Forbidden Files**:
  - Sol's files and blocked preparation/cajas suites (`SOL1-BASELINE-PREPARATION-REMITO-20261002/DB_TESTS_BLOCKED.md`)
  - Any Auth, migration, or fiscal configuration
