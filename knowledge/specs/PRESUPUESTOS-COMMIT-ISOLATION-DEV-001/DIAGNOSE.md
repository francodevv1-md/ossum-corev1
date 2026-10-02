# Diagnose: inherited TypeScript failures

## Reproduce
- Run `node node_modules/typescript/bin/tsc --noEmit --incremental false` independently on isolated candidate and archived base HEAD.

## Scope
- Eight diagnostics in existing Stock/Cirugias files, outside the authorized commit package.

## Evidence
- Missing `@/lib/stock/stock-ui-model` in `StockArticleSheet.boxes.test.tsx` and `CajasFormulaSection.tsx`.
- Non-exported `FichaCtx` imported by `CajasFormulaSection.tsx`.
- Four missing `Surgery` type references and one nullable `ConsumoState` argument in `src/app/cirugias/page.tsx`.
- Base and candidate diagnostic logs match exactly; no Presupuestos/invoice diagnostics added.

## Hypothesis
- Base HEAD is incomplete without unrelated uncommitted Stock/Cirugias fixes. The candidate did not cause these diagnostics.

## Minimal Fix
- None: including unrelated fixes would violate the explicit package exclusions. Do not weaken checks or change configuration to hide failures.

## Validate
- Compare the two actual compiler outputs; identical diagnostic set.

## Regression Check
- Candidate's eight focused suites / 79 tests pass; scoped lint passes; original source/index preservation passes.

## Handoff
- Report inherited global gate failures honestly. This commit certifies isolation and focused regressions, not a globally green ERP/build.
