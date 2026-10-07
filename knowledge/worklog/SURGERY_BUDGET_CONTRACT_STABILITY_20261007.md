# Surgery / budget contract stabilization — 2026-10-07

## Scope and authorization
Franco authorized the bounded DEV stabilization of Nueva Cirugía, Presupuestos and combined creation. Task declaration, ownership and evidence live in `knowledge/specs/SURGERY-BUDGET-CONTRACT-STABILITY-20261007/` and its matching `.opencode/locks/` file. Existing unrelated dirty changes are preserved.

## Completed intake checkpoints
- Optional budget creation uses the shared backend payload/client and persisted surgery ID.
- Partial attachment/budget/refresh outcomes retain recovery context and report actual results.
- Unknown write outcomes cannot be blindly replayed in the current wizard session.
- Date/time precision, shipping date, contact identities, notes and supported assignments round-trip through backend contracts.
- Unsupported intake fields reject explicitly instead of being silently discarded.
- Sparse PATCH responses preserve omitted fields; explicit null clears. Institution changes clear obsolete derived geography.
- Independent reviewer approved corrective intake changes. Focused corrective run: 129 passing tests.

## Completed budget checkpoint
Four failing route/service/readback regressions corrected: general discount, repeated edit/revision totals, optional clearing and distinct VAT treatment. Real commercial references are checked against company records. Review corrections preserve legacy recalculation and prevent display placeholders from entering editable metadata. Independent re-review passed.

## Gate status
Final joint regression: 239 tests passed across 13 suites. Broader intake gate previously passed 166 tests. Scoped TypeScript and diff check pass. Global TypeScript retains recorded pre-existing failures. Current-source isolated build passed in 83.507 seconds (66/66 static pages), with unrelated missing-export warnings. No Browser QA, deployment, schema changes or operational data writes performed. Ownership released; handoff records remaining limitations.
