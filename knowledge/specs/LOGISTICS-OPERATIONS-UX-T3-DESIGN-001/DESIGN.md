# Design: Phase E — Logistics Operations UX

## Technical Approach

Place one **Logistics Operations** workspace inside the existing Ficha CX **Logística** tab and its single refresh boundary. It replaces no authority: it composes the compact shell, `RemitosPanel` commercial/physical detail and print pattern, `TrazabilidadPanel` read-only history pattern, `CajasTabContent` availability language, and `RemitoScanWorkspace` camera/manual/USB fallback. It is dispatch-centric: the Surgery/Expediente identifies the case; the board makes the next safe action and exceptions immediately visible.

The dark treatment is local to this workspace: blue-black ground, graphite bordered panels, cyan filter/selection/focus, slate history, amber pending/control, emerald consumed or accepted return, and red blockers/differences. Keep semantic text/icons alongside color. Use compact type, monospace document/lot/serial identifiers, sticky navy table headers, no decorative cards or shadows.

## Architecture Decisions

| Option | Trade-off | Decision |
|---|---|---|
| Separate preparation, remito, consumption and trace panels | Lowest displacement; forces tab hopping and hides physical lineage | One composed logistics workspace under **Logística** |
| Treat derived Trace or legacy panels as physical truth | Available now; aggregates commercial items and misstates Phase-D state | Label Trace as derived/read-only; actions require the future projection |
| Role-derived action buttons | Convenient; contradicts per-action grants | Render actions only from explicit capability data; retain denied read access with reason |

## Operating Surface and Flow

1. **Header / quick signals:** expediente, Caja, Remito, freshness, and counters for expected, assigned, dispatched, consumed, returned, pending, quarantine, blockers and differences. A primary “next task” strip links to the affected allocation.
2. **Central dispatch map:** compact horizontal flow `Prepare → Control → Dispatch → Receive → Reconcile`; each stage shows state, actor/time and its blocking reason. It is a navigation/control map, not a fabricated state machine.
3. **Allocation control table:** filter by state, Remito, Caja, article/lot/serial and exception. One physical allocation per row: expected, assigned, dispatched, consumed, returned, pending, held/quarantine, position, lot, serial, unit and status. Expand to the inspector: immutable snapshots, commercial Remito parent, physical dispatch detail, differences, actors, timestamps and command/audit lineage. Group the consolidated commercial Remito above—not instead of—physical rows.
4. **Inspector / action rail:** contextual **Prepare**, **Control**, **Dispatch**, **Receive**, **Reconcile** only when the selected row and capability allow it. Dispatch has an explicit blocker list; never imply that a Remito is dispatchable. Confirm mutations in a bordered header/body/footer dialog: target, physical quantities, consequence, cancellation and a clear final action. Close/reopen visibility depends on projected capability; reopen remains visibly restricted.
5. **Scanner:** persistent scanner entry opens camera or autofocuses a manual/USB-wedge field. Resolve the code to an eligible dispatch allocation, show identity/lot/serial/unit and permitted action, then require review and confirmation. A scan never submits a mutation itself.

## Responsive and State Design

Desktop keeps the map beside signals and the dense, horizontally scrollable table. Mobile keeps signals, next task and scanner first; table rows become allocation cards with the same quantity hierarchy, 44px scan/action targets, and an audit-table overflow escape hatch. Toolbars wrap safely.

Show explicit loading skeletons; no-dispatch and filtered-empty explanations; no-company/no-server-surgery unavailable state; API error with retry; stale/derived banner; camera-denied/manual fallback; and denied action with its capability reason. During mutation, lock that action, preserve the record, announce progress/result, refresh the workspace, and return focus to the changed allocation.

## Implementation Dependencies and Acceptance Criteria

**Existing authoritative facts:** Phase-C/Phase-D POST commands; Remito commercial plus physical details; derived Trace sent/consumed/returned/pending, warnings, source references and actor IDs; read-only Remito scan.

**Required read contracts (dependencies, not proposals):** one Phase-D operational projection with physical dispatch/allocation IDs; expected-versus-assigned and dispatch eligibility/blockers; consumed/returned/pending/quarantine and receipt/unidentified-return outcomes; reconciliation/close state; immutable lineage/history with actor display data; explicit per-action capabilities; and barcode-to-dispatch-allocation resolution. Until available, render only existing facts with their source label and an unavailable projection state—never synthesized rows or buttons.

Acceptance: an operator can locate one allocation, distinguish commercial from physical detail, see every real blocker/difference and its trace, use keyboard/manual/camera scan fallback, and understand why an action is unavailable. The workspace must preserve Ficha CX navigation, accessible focus/live feedback, semantic non-color cues, and the existing mobile/table behavior.

## File Changes

| File | Action | Description |
|---|---|---|
| `knowledge/specs/LOGISTICS-OPERATIONS-UX-T3-DESIGN-001/DESIGN.md` | Create | Design-only Phase E UX contract. |

## Open Questions

None. Required backend reads are implementation dependencies, not product decisions.
