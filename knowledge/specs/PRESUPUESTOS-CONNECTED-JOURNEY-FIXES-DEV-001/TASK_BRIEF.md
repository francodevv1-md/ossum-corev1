# Connected journey fixes DEV

- Task/owner: PRESUPUESTOS-CONNECTED-JOURNEY-FIXES-DEV-001, implementation owner openai/gpt-6.1-sol; mode implementation/testing/QA.
- Approval: user explicitly approved ONLY prior FINDINGS three blockers: backend surgery identity, persisted draft edit hydration/token/input preservation, execute-only invoice advisory lock. No intermediate approvals needed.
- Exact owned files: src/components/presupuestos/PresupuestoFormDialog.tsx; src/app/ventas/presupuestos/page.tsx; src/lib/api/presupuestos.ts (existing conversion boundary); src/lib/services/invoice.service.ts (advisory statement only); src/__tests__/unit/invoice-service.test.ts (focused lock regression); src/__tests__/components/PresupuestoConnectedForm.test.tsx (new); src/__tests__/integration/presupuesto-revision-postgres.test.ts (extend existing gated actual invoice/dedup check); this task folder.
- Forbidden: schema, core surgery/hooks/store/types, Auth/roles/permissions/secrets, production/staging/real data, fiscal/payment operations, Documentación/Stock/Compras, shared config/dependencies, commits/deploy, server5000 stop/restart or shared .next build without explicit exclusive window.
- Reuse: existing form sections/usePresupuestoForm setter, toLegacyPresupuestoProjection and technical surgery.backendId convention, apiFetch/ApiClientError, existing DEV gate and exact-owned synthetic data; do not rebuild form/concurrency backend.
- Validation: HTTP-boundary actual form/client tests, existing seven suites + broader relevant form tests, TypeScript, strict real PostgreSQL invoice create/duplicate regression on exact-owned fixture, actual full browser journey max20min/single context/preflight, independent read-only review/final hashes. Build only with coordinated output.
- Handoff: Done/Changed/Files/Validations/Risks/Next. READY only all gates executed; missing exclusive build means PARTIAL.

## Diagnose carried forward / revalidated source
- Actual linked-create POST404/surgery_not_found with visible ID; current form104 sends UI surgeryId unchanged. Fix only API identity boundary, reject missing backendId.
- No sales edit action; current form108 omits revision and no backend hydration. Add action + GET/hydrate + displayed revision on PATCH; retain drafts on failure, never refetch token silently at save.
- Real invoicePOST500 and reproduced queryRaw P2010/UnsupportedNativeDataType/void; same SQL executeRaw succeeds. Keep key/order/transaction/duplicate guard unchanged; inspect all helper callers before one-line change.
- Prior package lock released; existing billing UI lock released, active adjustment lock does not own these paths. All pre-existing dirty changes preserved; no shared lock overwritten.
