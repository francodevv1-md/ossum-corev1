# Tasks: Remito–Stock Atomic Dispatch Runtime

Status: **APPROVED RUNTIME PLAN**. Persistence and disposable-DEV application are complete. Execution is sequential, one writer, no Git operations; each unit releases its exclusive lock before the next starts.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 1,600–2,300 |
| Delivery strategy | auto-chain |
| Suggested split | WU1 → WU2A → WU2B → WU2C → WU3 → WU4 → WU5 |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

No commits/PRs are authorized; “stacked-to-main” means sequential review slices only. Target ≤400 changed lines per unit; split a unit before editing if feasible, keeping its tests with code.

## Common Controls

- **Owner:** one Backend/DB writer exclusively; lock lifecycle `reserved → editing → review → released`.
- **Forbidden:** files outside the exact sets below; schema/migrations, dependencies, Auth/RLS/provider changes, UI, production/staging, unrelated dirty work, and Git operations.
- **Stop:** ownership overlap, canonical hash/count drift, inferred business rule, non-disposable DB access, or a slice that cannot be bounded safely.

## WU1 — Authorization, activation, durable audit

- [x] 1.1 Own `src/lib/permissions/c14/authorize-insert-writer.ts`, `src/lib/services/c14/{activation,durable-attempt-audit,reconcile-durable-attempts}.ts`, and matching `src/__tests__/unit/c14-{authorization,activation,durable-attempt-audit,reconciliation}.test.ts`; implement approved roles/company proof, WCB-06-only enablement, append-only V3 events, and 60-second reconciliation.
- [x] 1.2 Validate: `npx vitest run src/__tests__/unit/c14-authorization.test.ts src/__tests__/unit/c14-activation.test.ts src/__tests__/unit/c14-durable-attempt-audit.test.ts src/__tests__/unit/c14-reconciliation.test.ts`.

## WU2A — Canonical registry and scanner

- [x] 2.1 Own `src/lib/services/c14/{writer-registry-v4,scanner-input-v2}.ts` and `src/__tests__/unit/c14-topology.test.ts`; encode exact RegistryV4/ScannerV2 identities, hashes, counts, source sets, and fail-closed conformance.
- [x] 2.2 Validate: `npx vitest run src/__tests__/unit/c14-topology.test.ts`.

## WU2B — Canonical contract-owner topology

- [x] 2.3 Own service/validator pairs under `src/lib/{services,validators}/c14/insert-serialization/isw-{cx03-01,cx07-01,cx11-01,cx11-02,cx11-03,cx12-01,cx12-02,cx12-03,cx12-04,cx12-05,cx12-06,cx12-07,cx12-08,cx12-09,cx12-10,cx08-01,cx08-02,cx06-01}.ts` and `src/__tests__/unit/c14-contract-topology.test.ts`; add 18 inert complete-command identities with no production importers or row-writer exports.
- [x] 2.4 Validate: `npx vitest run src/__tests__/unit/c14-contract-topology.test.ts src/__tests__/unit/c14-topology.test.ts`.

## WU2C — Canonical bundle-owner topology

- [x] 2.5 Own `src/lib/{services,validators}/c14/bundles/wcb-{01..11}.ts` and `src/__tests__/unit/c14-bundle-topology.test.ts`; add exact 11 bundle identities, keeping WCB-01..05/07..11 product-inert and WCB-06 as the sole activation candidate.
- [x] 2.6 Validate 11/18/21/29 counts and zero bypass/import/DML violations: `npx vitest run src/__tests__/unit/c14-bundle-topology.test.ts src/__tests__/unit/c14-contract-topology.test.ts src/__tests__/unit/c14-topology.test.ts`.

## WU3 — WCB-06 runtime

- [x] 3.1 Own `src/lib/services/c14/bundles/private-writer-runtime.ts`, WU2C’s `wcb-06.ts` pair, and `src/__tests__/unit/c14-wcb-06.test.ts`; implement supplied-TransactionClient execution, frozen locks, seven ordered sections, idempotency, audit/acceptance prefix, forced checks, reread, rollback, and approved error mapping.
- [x] 3.2 Validate canonical CX08 T17–T44 scenarios: `npx vitest run src/__tests__/unit/c14-wcb-06.test.ts src/__tests__/unit/c14-topology.test.ts`.

## WU4 — Remito orchestration and route

- [x] 4.1 Own `src/lib/services/remito.service.ts`, `src/app/api/companies/[companyId]/remitos/[remitoId]/emitir/route.ts`, `src/__tests__/unit/remito-service.test.ts`, `src/__tests__/unit/remito-issuance-retry.test.ts`, and new `src/__tests__/unit/remito-emitir-route.test.ts`; authorize before transaction, accept only transport idempotency, derive single-box surgical lineage server-side, execute WCB-06 inside existing Serializable issuance, and preserve non-surgical/QR behavior.
- [x] 4.2 Validate: `npx vitest run src/__tests__/unit/remito-service.test.ts src/__tests__/unit/remito-issuance-retry.test.ts src/__tests__/unit/remito-emitir-route.test.ts`.

## WU5 — Integration and verification

- [x] 5.1 Own `src/__tests__/integration/remito-stock-atomic-dispatch.test.ts`; prove happy path, every-section rollback, bijection/totals, stale control, tenant isolation, retry/key conflict, no duplicates, durable recovery, and Consumption/Return non-regression.
- [x] 5.2 Run exactly: `npx vitest run src/__tests__/unit/c14-*.test.ts src/__tests__/unit/remito-service.test.ts src/__tests__/unit/remito-issuance-retry.test.ts src/__tests__/unit/remito-emitir-route.test.ts src/__tests__/unit/consumo-service.test.ts src/__tests__/unit/devolucion-service.test.ts src/__tests__/integration/remito-stock-atomic-dispatch.test.ts`; then `npm run typecheck`; `npm run build`; independent read-only diff review.
