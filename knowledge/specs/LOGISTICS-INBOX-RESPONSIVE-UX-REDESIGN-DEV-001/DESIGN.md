# Design — Logistics Inbox Responsive UX Redesign

**Change:** `LOGISTICS-INBOX-RESPONSIVE-UX-REDESIGN-DEV-001`  
**Status:** Ready for apply

## Architecture

```text
LogisticsGlobalInbox
  existing useLogisticsGlobalInbox(filters)
  -> summary + visible filters + Más filtros
  -> desktop semantic table | mobile operational cards
  -> existing selectedSurgeryId / back restoration
  -> existing LogisticsOperationsWorkspace(companyId, surgeryId, onOperationComplete=refresh)
```

No route, hook, request, response, data transformation, or persistence changes are introduced.

## Package Design

### P1 — Hierarchy and filters
- Recompose the existing header/count buttons into compact published summary signals.
- Keep search, preparation, logistics state, blockers, and supported date controls visible.
- Put existing secondary controls in a native accessible disclosure; reuse the current `set`, `clear`, and `NativeSelect` behavior.
- Do not add an overdue control or metric; `counts.overdue` remains unsupported.

### P2 — Responsive Inbox
- Replace the 14-column `min-w-[1800px]` permanent table with the eight approved columns at desktop.
- Retain lower-priority facts only in an expandable complement where needed, never by client recomposition.
- Make direct opening explicit in row/card JSX rather than effect-installed DOM listeners; avoid nested interactive elements.
- Keep three status pills separate. Mobile cards put exception/next-task before secondary facts and expose one 44px opening control.

### P3 — Detail presentation
- The Inbox supplies the light contextual header/back affordance.
- `LogisticsOperationsWorkspace` receives presentation-only section hierarchy: identity/context, published next-task/blockers, physical facts, remitos/differences, consumption/returns/reconciliation, traceability, then existing actions.
- Reuse current published labels, action buttons, scanner, dialog, and `onOperationComplete`; do not refactor `runAction`, `resolveScan`, descriptor types, or `apiFetch` calls.

### P4 — Quality
- Use existing OSSUM blue-gray surfaces, navy section/table headers, and text-plus-color state cues.
- Retain table-region scrolling only if a narrow table region genuinely needs it; prevent document overflow.
- Capture named viewport evidence and inspect console/network for unintended calls.

## File Plan

| File | P1 | P2 | P3 | P4 |
| --- | --- | --- | --- | --- |
| `src/components/logistica/LogisticsGlobalInbox.tsx` | summary/filter layout | table/cards/open affordance | context shell only | state/focus polish |
| `src/components/expediente/LogisticsOperationsWorkspace.tsx` | — | — | layout/classes only | responsive/focus polish |
| `src/__tests__/unit/logistics-global-inbox-ui.test.tsx` | filters | rows/cards/open-return | host props | regression coverage |
| `src/__tests__/components/LogisticsOperationsWorkspace.test.tsx` | — | — | existing protocol regressions | responsive states |

## Validation Design

- Run focused Inbox and workspace tests first, then `npm run typecheck`.
- Browser smoke: Inbox filters → row/card open → detail load → return at 1920, 1366, 1024, 390.
- Do not execute a mutation unless an already-existing, explicitly eligible disposable DEV case is available; otherwise report fixture debt.
- On any failed test/typecheck, use Diagnose before changing code.
