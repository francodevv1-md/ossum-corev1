# Task Plan — LOGISTICS-CONTROL-ATOMIC-DISPATCH-T3-DEV-001

## Review Workload Forecast

- Delivery strategy: working-tree DEV package, no PR
- Decision needed before apply: No
- Chained PRs recommended: No
- 400-line budget risk: Not applicable (no PR requested or allowed)
- Chain strategy: not applicable

## Tasks

- [x] 1. Create the narrow Phase-C action policy, command validators, and transport routes for control and individual difference decisions.
- [x] 2. Implement server-authoritative control snapshots, difference opening/resolution audit, composition invalidation, and dispatch eligibility projection.
- [x] 3. Supersede WCB-06's single-reservation contract with multi-reservation evidence/effect handling and replay validation.
- [x] 4. Adapt surgical Remito dispatch derivation to consolidate commercial lines by Article while retaining allocation-level lineage.
- [x] 5. Add focused service, WCB-06, route, atomicity, replay, concurrency, lineage, tenant-isolation, and Phase-B regression coverage.

## Apply state

Reverification fixes applied: WCB-06 authorization is admin/operator only and the emit route invokes the named dispatch policy; split allocation quantities no longer require equality with the whole expected line; dispatch trace is captured-control evidence only. Typecheck and focused suite pass.
