# R4 — Remito request typing, decimal boundary and error contracts

- Approved outcome: user's `continua con la tarea` continues R4 announced in R3 handoff. T3 bounded existing request integration; sole writer GPT-6.1 Sol (`openai/gpt-6.1-sol`), implementation/testing; reviewer read-only.
- Scope: partial/null client PATCH types; preserve enum literals in existing Zod schemas; validate base-10 Decimal(18,4) representability before service/DB; malformed emission JSON and canonical Devolucion error serialization.
- Owned sources: `src/lib/api/remitos.ts`; `src/lib/validators/remito.ts`; `src/app/api/companies/[companyId]/remitos/[remitoId]/emitir/route.ts`; `src/lib/services/devolucion.service.ts` (error class/import only).
- Owned checks: new `src/__tests__/unit/remito-request-validation.test.ts`, `remito-request-errors.test.ts`, `src/__tests__/types/remito-request-contracts.ts`; exact R4 docs/config/lock/worklog; audit R4 status only.
- Forbidden: UI/layout, schema/migrations, Auth/roles/guards, stock/state/return transactions or quantities projection, other sources, dependencies, real DB, browser, commit/push/deploy. Existing R1–R3 and unrelated dirty files preserved.
- Allowed commands: read-only Git/source/docs; focused Vitest and scoped TypeScript/diff diagnostics. No server/database commands.
- Existing authority: Remito declaredValue/quantity/returnedQuantity columns are Decimal(18,4); PATCH schema already allows omitted fields and nullable surgery; catalog tuples already `as const`; RemitoError already inherits ApiError; DevolucionError does not.
- Numeric contract: strings preserve precision; trim surrounding whitespace; accept ordinary signed base-10/scientific forms already usable by Decimal; reject blank/radix/nonfinite/negative amounts, nonpositive quantities, values requiring rounding or exceeding 14 integer digits. Trailing zeros that do not change the value are valid. No money arithmetic or rounding-policy change.
- Diagnose: failing runtime schema/route checks and compile-time contracts before edits; trace clients→validators→routes→existing services; one shared Remito decimal schema and incumbent ApiError inheritance, not route-by-route mappings or generic error duck typing.
- Gates: red→green focused checks; R1–R3 and Devolucion regressions; scoped typing; independent review; released lock and Caveman handoff. No global/app/DB certification.
- Stop: active ownership overlap, required domain/schema/Auth/stock change, real-data access or materially ambiguous business policy.
