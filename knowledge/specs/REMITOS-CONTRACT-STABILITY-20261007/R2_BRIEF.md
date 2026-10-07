# R2 — hydrated response contract

- Task/risk/owner: R2 bounded existing-API contract repair, high-risk backend file under sole GPT-6.1 Sol ownership; follow R1 with no parallel writers.
- Approval: current request requires correct frontend/API/backend Remitos contracts; repair promised `RemitoApiRow`, no new feature/domain state/security/persistence.
- Why: POST currently returns item `id/description/quantity` only, while `OperationalRemitoWorkspace.fromRemito` immediately reads item SKU/unit/trace/metadata. State PATCH drops entire items array and snapshot/branch fields. Both clients declare full rows. Mock tests previously ignored Prisma select.
- Minimal fix: reuse the already-existing `remitoReadSelect` in create and state update, exactly like GET/edit/emit; no new DTO model/adapter/hydration layer or extra request. Same transactions and projections exposed by existing authorized GET.
- Allowed files: exact two select blocks in `src/lib/services/remito.service.ts`; new `src/__tests__/unit/remito-response-contract.test.ts`; own evidence/config/lock. All other service business logic untouched.
- Validation: select-aware Prisma doubles passed through real service and `created`/`ok` serialization, compare JSON shape/values with GET. New checks fail before fix then pass; existing service/routes/consumers; scoped TypeScript.
- Forbidden: schema/DB/Auth/roles/audit policy/state transitions/return quantities/stock/permissions/dependencies/other UI/browser/commit/push.
- Stop: new data exposure absent in existing authorized GET, overlapping writer, required domain/DB change.
