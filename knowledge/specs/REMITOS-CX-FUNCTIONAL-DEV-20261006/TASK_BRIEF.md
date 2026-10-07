# Remitos / Surgery DEV functional acceptance

## Task / risk / approval
- Task: `REMITOS-CX-FUNCTIONAL-DEV-20261006`; T3 bounded DEV acceptance.
- Franco requested a functional Remitos backend ready for connection, confirmed the connected Antigravity database as disposable DEV, and approved synthetic surgery/remito creation, issuance, persistence and applicable stock verification. The prior Sol1 DB hold is excepted only for this validation; its historical incident is not reopened.
- Worktree: `E:/OSSUM_COR_ANTIGRAVITY/ux-ui`, branch `ux/antigravity-redesign`.
- Parent: orchestrator/QA, `openai/gpt-6.1-sol`; source writer: delegated frontend implementation, actual model reported in handoff.

## Contract
- A Surgery may have multiple Remitos. Use the technical Surgery ID for backend relations, never the visible number.
- Remito records actual outgoing material; it need not equal the Presupuesto. Creation remains an editable Borrador; issuance is explicit and allocates its number and timestamp on the server.
- Company scoping, existing permissions, audit, Decimal quantities and snapshots remain authoritative on the server.
- Consumption and Return refer to the appropriate Remito. No new consumption/return feature is included.
- Cajas dispatch requires the existing control/reservation/trace intent. Its stock effect is atomic with issuance and must not duplicate on replay. Generic manual issuance is not evidence of stock dispatch.
- Errors/loading/missing backend identity must not masquerade as an authoritative empty result. A bounded list must not claim an exact unbounded total.

## Scope / ownership
- Frontend writer: `src/components/expediente/FichaTabContent.tsx`, `src/components/expediente/RemitosSummaryCard.tsx`, new `src/__tests__/components/RemitosSummaryCard.backend.test.tsx`.
- Parent: this task directory; `.opencode/locks/REMITOS-CX-FUNCTIONAL-DEV-20261006.lock.md`; new `scripts/qa/remitos-functional-dev.ts`; task-specific worklog/handoff.
- Existing backend service/API/validators are initially read-only. Reserve a minimal file explicitly before any reproduced backend fix; no speculative repair.
- Existing dirty/untracked work and other agents' files must be preserved.

## Allowed / forbidden commands
- Allowed: read-only git inspection; inspected explicit unit/component test files; nonincremental TypeScript; bounded reviewed DEV script after secure effective-target verification; isolated local build/browser validation.
- Forbidden: whole-directory/implicit test selections, legacy integration seeding/cleanup, historic DB investigation, resets, deletion of other records, migrations/schema, Auth/roles/security changes, dependency installs, provider changes, production/staging/real data, commit/push/PR/deploy.
- Synthetic records created by this acceptance remain identifiable; do not delete them without separate scope.

## Validation / stop conditions
- Reproduce technical-ID bug before fixes; regression checks for missing ID, API failure, loading, bounded count, latest number/state and navigation.
- Prove real server validation, creation, draft update, explicit issuance, number/date persistence, reload/list/detail, second Remito and company isolation with only synthetic records; inspect audit.
- Verify applicable stock dispatch and replay if achievable with the existing Cajas services without unrelated changes.
- Browser QA has a hard 20-minute budget; stop rather than bypass authentication.
- Stop/escalate for effective target mismatch, critical file overlap, destructive action, new business rule or excluded change.
- Independent read-only review; exact Done / Changed / Files / Validations / Risks / Next handoff distinguishing real DB, mocked HTTP and browser evidence.
