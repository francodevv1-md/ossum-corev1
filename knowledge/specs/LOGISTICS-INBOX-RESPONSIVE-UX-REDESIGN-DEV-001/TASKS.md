# Tasks — Logistics Inbox Responsive UX Redesign

**Change:** `LOGISTICS-INBOX-RESPONSIVE-UX-REDESIGN-DEV-001`  
**Status:** Ready for apply

## Review Workload Strategy

- Decision needed before apply: No
- Chained PRs recommended: No
- 400-line budget risk: Medium
- Delivery strategy: approved working-tree DEV package; four sequential, independently reviewable slices, each targeted below 400 changed lines. No commit, push, or PR is in scope.

P1/P2 share `LogisticsGlobalInbox.tsx`; P3 exclusively owns `LogisticsOperationsWorkspace.tsx`; P4 is validation/correction only. Do not parallelize source edits. Reserve → edit → review → release each sensitive file per slice.

## Global guardrails

- Allowed source files: the two components named below. The hook is read-only unless a documented presentation typing issue blocks compilation; request semantics remain immutable.
- Forbidden: API/services/validators, Prisma/schema/migrations, Auth/RLS/permissions, dependencies, C14, data creation, and any authority contract.
- Stop for scope expansion, file-lock overlap, contract/action-body change, or a request for live mutation without a pre-existing eligible DEV case.

## T0 — Lock and baseline

- [ ] Lock `src/components/logistica/LogisticsGlobalInbox.tsx` and `src/components/expediente/LogisticsOperationsWorkspace.tsx`; verify no overlap.
- [ ] Record baseline focused-test result and current screenshots/overflow behavior.

## T1 — P1: hierarchy and filters

**Files:** `LogisticsGlobalInbox.tsx`, `logistics-global-inbox-ui.test.tsx`  
**Work:** compact published summary; visible filters plus accessible “Más filtros”; preserve `set`, `clear`, request parameters, counts, and unavailable overdue behavior.  
**Validate:** focused Inbox test; 1920/1024/390 screenshots; keyboard access to secondary filters.

## T2 — P2: responsive Inbox

**Files:** `LogisticsGlobalInbox.tsx`, `logistics-global-inbox-ui.test.tsx`  
**Work:** eight-column desktop table, tablet priority reduction, mobile cards, explicit direct-open semantics, no nested-control activation, preserved return context.  
**Validate:** focused Inbox test; 1920/1366/1024/390 screenshots; pointer/Enter/Space open-return; no document horizontal overflow.

## T3 — P3: detail visual integration

**Files:** `LogisticsGlobalInbox.tsx`, `LogisticsOperationsWorkspace.tsx`, `LogisticsOperationsWorkspace.test.tsx`  
**Work:** visual hierarchy and responsive surfaces only; retain E1, scanner, descriptors, dialog, bodies, focus trap, and `onOperationComplete → refresh`.  
**Validate:** focused workspace and Inbox tests; partial/blocked/unavailable/permitted-action states; detail screenshots at all four viewports.

## T4 — P4: quality gate and corrections

**Files:** only the above source/tests if a validated visual defect requires a minimal correction.  
**Work:** loading/error/empty/focus polish, semantic text-plus-color review, console/network and overflow checks.  
**Validate:** `npm run typecheck`; focused tests; independent review; Inbox → detail → return smoke; named screenshots `1920`, `1366`, `1024`, `390`; Caveman handoff.

## Completion

- [ ] Release locks after passing validation.
- [ ] Report fixture debt if no safe real descriptor mutation was available; do not manufacture one.
- [ ] Save the session summary and handoff with Done / Changed / Files / Validations / Risks / Next.
