# Proposal — Logistics Inbox Responsive UX Redesign

**Change:** `LOGISTICS-INBOX-RESPONSIVE-UX-REDESIGN-DEV-001`  
**Status:** Ready for apply  
**Artifact store:** filesystem primary, Engram secondary

## Intent

Make `/logistica` scannable as an operational desk at desktop and mobile widths without changing its server-authoritative Inbox, E1/E2/E3 detail, or B/C/D execution.

## Scope

### In scope
- P1: compact summary and visible/secondary filter hierarchy.
- P2: prioritized responsive table/cards and direct detail affordance.
- P3: light visual shell and progressive disclosure around the existing detail workspace.
- P4: accessibility, states, responsive QA, and visual corrections.

### Out of scope
- API, hook request semantics, schema, Auth, permissions, descriptors, mutations, client sorting, new fields/filters, dependencies, URL-state work, and E2/E3 protocol changes.
- Invented next actions, priorities, counts, permissions, or overdue state.
- Creating/mutating DEV data for E2E; live mutation remains fixture debt.

## Capabilities

### New Capabilities
- None. This is a presentation-only change over existing capabilities.

### Modified Capabilities
- `logistics-inbox-responsive-presentation`: Inbox and selected-detail presentation, responsive hierarchy, and accessibility requirements change; authority contracts do not.

## Approach

Keep `LogisticsGlobalInbox` as the only Inbox consumer and keep its local selection, filters, cursor, and refresh flow intact. Reduce permanent list facts to the approved operational hierarchy; use cards below `md`; visually integrate the existing `LogisticsOperationsWorkspace` without altering its projection, action construction, or execution.

## Affected Areas

| Area | Impact | Description |
| --- | --- | --- |
| `src/components/logistica/LogisticsGlobalInbox.tsx` | Modified | P1/P2 hierarchy, filters, list/card density, selected-detail shell. |
| `src/components/expediente/LogisticsOperationsWorkspace.tsx` | Modified | P3 presentation only; preserve protocol and interactions. |
| `src/__tests__/unit/logistics-global-inbox-ui.test.tsx` | Modified | Presentation and direct-open regressions. |
| `src/__tests__/components/LogisticsOperationsWorkspace.test.tsx` | Modified | Workspace visual-host regressions. |

## Risks and Rollback

| Risk | Mitigation |
| --- | --- |
| Visual work obscures published unavailable facts | Render explicit unavailable text; test it. |
| Responsive change breaks focus or return context | Preserve current selection/filter/cursor state; browser-check keyboard and back flow. |
| Workspace styling leaks into mutation protocol | Keep P3 limited to JSX classes/layout and existing labels; no action/body changes. |

Rollback is a UI-only revert of the two components and their focused tests; no persisted data or server contract requires repair.

## Success Criteria

- [ ] All four viewports meet the Task Brief acceptance matrix without page-level horizontal overflow.
- [ ] Inbox/detail contracts and existing action protocol remain unchanged by diff and regression tests.
- [ ] Focused tests, typecheck, browser evidence, and independent review pass; fixture-debt mutation is reported, not fabricated.
