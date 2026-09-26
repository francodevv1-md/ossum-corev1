# Ownership Lock

- task: `CORE-FLOW-E2E-DEV-001`
- agent role: Backend / QA
- selected model: `openai/gpt-5.6-sol`
- owned files: `e2e/core-flow-dev.spec.ts`, `src/lib/services/surgery.service.ts`, `src/lib/services/preparation.service.ts`, `src/lib/services/c14/bundles/wcb-06.ts`, `src/__tests__/unit/surgery.service-visible-number.test.ts`, `src/__tests__/unit/preparation.service.test.ts`, `src/__tests__/unit/c14-wcb-06.test.ts`, `src/__tests__/integration/cajas-dispatch-ceiling-columns.test.ts`, `prisma/migrations/20260903195000_fix_preparation_reservation_contracts/**`, `prisma/migrations/20260903200000_fix_cajas_dispatch_ceiling_columns/**`, `knowledge/specs/CORE-FLOW-E2E-DEV-001/**`
- status: released
- forbidden: unrelated application source, schema, unrelated migrations, Auth, permissions, production/staging, deploy, push, PR
