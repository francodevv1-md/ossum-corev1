# Diagnose

## Baseline reproduced blockers
See prior FINDINGS and TASK_BRIEF: actual creation404 visible-ID leak; absent edit/token/hydration; real invoice500 raw void decode. User approved only these fixes; helper callers createInvoiceFromSource and createInvoice inspected before changing execute method, with identical key/SQL/order/transaction.

## Incremental checks
- Reproduce: focused form/invoice/connected-journey/liquidation run and tsc/scoped ESLint.
- Scope/Evidence: existing manual-invoice/caller mocks and liquidation tx omitted executeRaw; production actual Prisma client exposes it. Added same method to narrow mocks, kept all policy/assertions intact. No domain or permission fix.
- Form test found duplicate description in free-description/observation input; trace showed hydrated descripcionLibre would override later edits to item.name in the existing payload builder. Fix root cause: hydrate persisted description into name, leave free override empty; retain original metadata separately. Added rename assertion; do not weaken multi-row metadata checks.
- TypeScript test-only option exact is unsupported by RTL ByRoleOptions; remove invalid option (string name match remains exact). No assertion removed.
- React compiler lint rejected manual memoization dependencies. Event-only submit handler needs no memoization; remove useCallback from this one handler rather than adding suppression/changing behavior.
- Validate/Regression: focused checks rerun, final results in HANDOFF.
- Subsequent metadata-row test: deletion uses the existing native window.confirm; jsdom does not implement it, so both rows correctly remained. Mock only the user's confirmation response as true, retain all post-delete row identity/metadata assertions. No application confirmation bypass added.
- Actual recovery UI completed create/edit/reload/emit/approve/invoice201, then duplicate request returned500 even though DB correctly retained one invoice. Reproduce: real existing-authenticated request replay; scope only duplicate conflict translation in owned helper. Evidence invoice helper throws InvoiceError, while shared errorResponse recognizes only ApiError and maps others to500. Minimal fix: use the existing conflict ApiError factory for ONLY this duplicate rejection, preserving message/code409, exact lock/key/predicate/transaction. No broad InvoiceError inheritance or shared mapper/route change. Added actual service-to-errorResponse regression requiring409/code and no create; rerun relevant checks before final snapshot.
