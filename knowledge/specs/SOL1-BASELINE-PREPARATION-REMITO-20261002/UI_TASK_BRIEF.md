# Preparation → Remito UI contracts (no DB)

## Approved outcome
Franco explicitly requests selection/reservation/control/recontrol/resolution UI callers and Remito dispatch intent wiring, using backend IDs, observed versions and stable command identities. Keep input on errors; successful UI acceptance only after accepted HTTP response. Overall status remains PARTIAL while real journey acceptance is blocked.

## Ownership preflight
- Read current Antigravity COORDINATION-NOTIFICATIONS-CALENDAR-DEMO-DEV-001/LOCK.md: Editing; enumerated Coordinación/calendar/notification/navigation files. It explicitly excludes Sol's Preparation/Remito/Stock/Cajas scope.
- No overlap with the exact writer sets below. PDF lock released; Compras/adjustment locks remain excluded. Dirty Stock host/services/schema/state/hooks are not owned or touched.
- Current HEAD73e3e1b; targeted UI/helper source files are not dirty at preflight. Existing cajas-assignments client contains Sol's earlier transport patch; no foreign takeover.
- Do not edit Antigravity coordination files, backend-surgeries client, states, core Cirugías/store/hooks, Auth/permissions, Stock host/services, schema/dependencies or Movimientos.

## Declaration
- Task: SOL1-UI-CALLERS-NO-DB-20261002; riskT2/T3 protected UI; approval is the explicit user request, no architectural/core-flow refactor.
- Orchestrator model: openai/gpt-6.1-sol; role coordination/QA/docs. Owns UI_TASK_BRIEF.md, UI_VALIDATION.md, UI_REVIEW.md, UI_HANDOFF.md only in this task directory and external offline QA scratch runner.
- Preparation writer: exact UI_PREPARATION_LOCK.md; emission writer: exact UI_REMITO_LOCK.md. Separate UI modules, no shared writable paths/services. No agent may execute tests/Node/npm/scripts/DB commands; orchestrator alone executes inspected allowlisted unit/component files.
- Allowed source integration: reuse existing apiFetch/Cajas clients/schemas, existing dispatch builder and current rendering surfaces. No new subsystem or host relocation.
- Validation: HTTP-simulated component/contract tests, narrow inspected regressions, nonincremental TypeScript, Diagnose before minimal fixes, independent read-only review.
- Forbidden commands: general suites, integration files, DB scripts/queries/cleanup, dotenv/config loading, browser authenticated state, build/typegen without exclusive window, server restart, Git mutations.
- Incident stays closed. DB_TESTS_BLOCKED.md remains in force; no reopening investigation or inferred fixture IDs.

## Acceptance boundaries
- Selection supports existing physical-unit/sourceMovementId/quantity/append/remove contract (not fabricated stock-position identifiers).
- Reserve/control carry preparation.version as observed in displayed detail; resolution carries observed latest resolution sequence. A retry of identical intent preserves key/version/payload; edits or explicit refreshed intent start a new command. Never silently replace stale versions on retry.
- After accepted mutation refresh read state. Read refresh failure must not falsely label an accepted write as rejected or silently repeat it with a new identity.
- Assign existing surgery selectors using backendId, not visible CX IDs. No changes to backend-surgeries or coordination status policies.
- Emission callers preserve explicit metadata.cajas.assignmentId, backend Remito/item/preparation IDs and lot/serial checks. Linked/ambiguous/unavailable preparation must not fall back to ordinary emission. Legacy genuinely unlinked documents remain compatible.
- Build deferred without exclusive window; no productive stop for that gate. No real DB/browser acceptance claimed from mocks.
