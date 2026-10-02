# PREPARATION-A handoff

## Done
- Bounded approved correctness block in E:/OSSUM_COR_ANTIGRAVITY/ux-ui. Own lock released; parent and foreign ownership documents untouched.
- Reproduced baseline with focused runnable source-path suite before production edits: 12/12 failed. False-clean shortfall/removed/excess, incomplete selection rejection instead of evidence, append/sequence transport rejected, removed-line reactivation rejected, control retry after closure rejected, post-dispatch control falsely clean. For stale resolution, baseline test reproduced missing watermark contract; source inspection established absence of freshness comparison.

## Changed
- Control includes every preparation line and immutable preparation.formulaVersion.lines (actual existing schema uses expectedFormulaLineId). Checks selected aggregate quantities, article/unit, missing/unselected/deactivated allocations, physical quantity-one and duplicate identified scopes. Acceptance records withDifferences plus individually resolvable immutable observedFacts carrying control/formula/version and expected/selected quantities. Inactive/unselected control snapshots record zero selected quantity and original declared quantity/activity. No historical control edits; closing differences cannot override current composition; fresh explicit recontrol can become clean only after matching composition and all open differences closed.
- Optional append transport creates a separate stable child allocation with inherited formula/article/unit and unique lineKey. Original allocation remains; accepted-command replay returns original immutable change. Revalidates unit exclusivity, duplicates and selected sibling lot capacity; carries explicit reservations forward through existing reserveCajasComponent when assignment already reserved. Removed original can be explicitly reselected/reactivated. No article replacement policy added.
- Required expectedResolutionSequence compares latest sequence under assignment lock. Exact accepted replay precedes freshness and active-state checks. Permissions unchanged.
- Company-scoped accepted control replay precedes active-state check for new commands; altered payload conflicts. Assignment closure untouched.
- Post-dispatch controls explicitly conflict with cajas_return_control_not_supported: return/consumption reconciliation boundary exposed rather than subtracting legitimate consumption from initial formula or inventing return policy.

## Files
Final SHA256 (baseline hashes retained in PREP_A_LOCK):
- src/lib/services/cajas-component-selection.service.ts: 14460F3AA7CEF31AC6BC5C5E1D001861DDA74825D2B7ED4DB44E84860CE1104A
- src/lib/services/cajas-control.service.ts: 633179A80FED5F6B66076BA3B7C3BEE5096CD188566F8EB3D15A62FC796C010D
- src/lib/services/cajas-difference.service.ts: E13BDFAC091FCA1010BC728F5E84C5DE8A95DA6AB6C884E010AE17F4348D2D3E
- src/lib/validators/cajas-assignment.ts: 940177A4CB51B51A8271F67A4D8114CFF16A207060A779A037D9D416613E9B7E
- src/__tests__/unit/cajas-prep-correctness.test.ts (new): 08F9AA73A8E2E8779C88BE01AAEF8C6CC6E9EF7107C8600161A7B65AD3412B4D
- Own PREP_A_LOCK.md / PREP_A_HANDOFF.md only additional writes.

## Validations
- Final: npx vitest run src/__tests__/unit/cajas-prep-correctness.test.ts src/__tests__/unit/cajas-slice1-formula.test.ts — 28/28 PASS (new 16, formula 12).
- New proofs: shortfall, removed, missing, unselected, excess, unit mismatch; two distinct identified units with replay; lots with available quantities 2+2 selected as 2+1 clean and 2+2 excess; duplicate/non-unit quantity and sibling capacity rejection; manual-close cannot hide shortfall; corrected explicit recontrol/history; reactivation; stale close after reject plus accepted replay; control replay after closed assignment/payload conflict/new-command rejection; return boundary.
- Existing recovery run: 9/14 PASS; five outdated fixtures separately identified, not edited: identified/lot/fungible selection missing cajasPreparationLine.findMany (3); rejection missing required expectedResolutionSequence (1); clean recontrol missing formulaVersion.lines (1). No optional production fallbacks.
- Own test fixture Diagnose: new valid lot split initially failed because double retained old identifiedUnit relation after scope update. Updated only new fixture to track scope relations; rerun 28/28 passed.
- npx tsc --noEmit --incremental false — timeout at 45 seconds, no output; NOT verified. No build, generate, DB, Git or unfiltered tests executed.

## Risks
- Prisma boundary doubles only; neither prior prep41/dispatch42 nor these results prove PostgreSQL rollback/concurrency/capacity.
- Existing recovery/original assignment test callers require watermark and richer mocks; concurrent original test never written.
- Out-of-scope route/client/UI consumers must transport append and expectedResolutionSequence and explicit control/recontrol intent. Existing legacy control route drops command input; not changed here.
- Initial-formula control deliberately unavailable after any dispatch; approved accounting/return correctness belongs to subsequent block.
- Global typecheck incomplete. New additions use existing schema/client and helpers; schema remains released to Antigravity.

## Next
- Owner integrates required client watermark/intent and updates own fixtures; verifies typecheck and PostgreSQL proofs separately. Cancellation/release/closure refinements remain separate; no expansion in this block.
