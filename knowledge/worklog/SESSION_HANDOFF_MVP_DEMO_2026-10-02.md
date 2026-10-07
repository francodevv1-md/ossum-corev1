# Session handoff — MVP demo delivery, 2026-10-02

## Done
- Budget connected-journey package has recorded real DEV persistence, concurrent-write rejection, UI acceptance, duplicate invoice-source rejection, and a successful build.
- Local package commits exist: budgets `73e3e1b4b930fa0bc4bf44636c78529d73b33208`; documentation `2d8d61799290ee20c6280b58fdb980254601e83a`.
- Documentation checklist has recorded real persistence, stale-write conflict recovery and surgery-switch acceptance. Wider company/read-only acceptance remains separately scoped.
- MiniMax Movements correction was independently inspected: five reported hashes matched and 24/24 focused tests passed. Real runtime acceptance remains pending.
- Latest Sol 1 handoff reports Cajas preparation/remito UI wiring complete, 153/153 tests, TypeScript and independent review passing. This final result was supplied by Franco, not independently rerun in this closing step.

## Changed
- Sol 1 reports selection, reservation, control/recontrol, difference resolution and dispatch use backend IDs, versions and retained attempt identity; failed requests preserve input.
- Cajas delivery remains PARTIAL: no real persistence/browser acceptance and build deferred. Ownership is reported released; no commit was requested for this delivery.
- Antigravity owns the Coordination/state, notifications and personal-calendar implementation. MiniMax reviewed it as Calendar BLOCKED, Coordination PARTIAL, Notifications PARTIAL; do not reuse the initial READY claims.

## Files
- `knowledge/specs/SOL1-BASELINE-PREPARATION-REMITO-20261002/` — Cajas implementation and unresolved DB-test incident, including `DB_TESTS_BLOCKED.md` and `READ_ONLY_INCIDENT_AUDIT.md`.
- `knowledge/specs/PRESUPUESTOS-CONNECTED-JOURNEY-FIXES-DEV-001/` — budget real acceptance and build evidence.
- `knowledge/specs/PRESUPUESTOS-FINAL-VALIDATION-DEV-001/` — original real concurrency validation and reproduced blockers subsequently corrected.
- `knowledge/specs/DOCUMENTATION-CHECKLIST-BACKEND-UI-DEV-001/` — checklist implementation and runtime evidence.
- `knowledge/specs/COMPRAS-STOCK-CONTRACT-CLOSURE-MAP-001/` — corrected investigation and Movements closeout.
- `knowledge/specs/COORDINATION-NOTIFICATIONS-CALENDAR-INDEPENDENT-REVIEW-001/` — independent findings requiring owner revalidation and corrections.
- `knowledge/specs/MVP-DEMO-RUNBOOK-001/DEMO_RUNBOOK.md` — initial runbook contained unsupported routes/upload steps and unverified fixtures; correction requested, not yet verified.

## Validations
- Never substitute mocked service journeys for PostgreSQL or browser acceptance.
- Preserve point-in-time validation evidence only while relevant source hashes remain unchanged.
- Engram diagnostic: this OpenCode instance logged MCP startup failure; local HTTP health and an independent MCP initialize/tools-list probe subsequently passed. The current assistant tool catalog still lacks mem_* tools. No session summary was saved to Engram from this closing step.

## Risks
- Cajas incident: an unintended DB-connected integration test performed setup before a 403. Original fixture IDs/transcript were not recovered. Historical target, residue and real dependencies remain indeterminate; no absence claim, cleanup or broad DB search is authorized. Offline search is closed; do not reopen it automatically.
- The worktree retains unrelated and residual uncommitted changes. Never restore or stage the entire tree indiscriminately.
- Personal calendar migration/application and real acceptance are pending per review. Use a versioned additive migration, not db push. User identity and contact identity must not be conflated; do not invent coordinator-access or notification-recipient rules.
- Existing shared dev/build output requires an exclusive validation window. Do not stop another session's server or mutate Auth/permissions to unblock QA.

## Next
1. Reconnect Engram MCP or restart OpenCode, then recover this file and current package handoffs before resuming.
2. Keep Sol 1 Cajas DB tests blocked; resume only safe independent work until an explicitly approved acceptance path is established. Do not infer that general DEV disposability removes this incident-specific block.
3. Have Antigravity finish the bounded review corrections and truthful per-block handoff; MiniMax reviews only the new stable diff.
4. Perform a short Movements runtime smoke in a separately confirmed safe context; do not automatically include blocked Cajas integration tests.
5. Coordinate one final build window and rehearse the corrected demo on actual synthetic records. No commit, push or deploy without a new explicit request.
