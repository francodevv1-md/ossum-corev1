# Proposal / Task Brief — CX-OPERATIONS-UI-SAFE-P1

Status: proposed  
Change: `CX-OPERATIONS-UI-SAFE-P1`  
Phase: UI-safe, read-only presentation and filtering  
Decision required: approve this scope before design/spec/tasks or implementation.

---

## Summary

Deliver a first operational-CX UI pass that improves scanability without creating any domain data. It will make the existing case timeline readable in human terms, reinforce the established visual hierarchy between CX status, preparation, and secondary signals, expose compact presets from fields already available in the UI, and show a derived (non-authoritative) next action and responsible area.

`CX-####` remains the primary operational identifier. Existing administrative/foreign references (for example, `Expediente`, PR, NR, FV, authorization) remain secondary context, never a replacement case identifier.

## Why

The surgery/expediente is the product's operational center. Existing code already has timeline, status, preparation, documentation, billing, coordinator-queue, and reference data, but their meaning is distributed. This phase improves the reading of those existing signals while preserving their current domain source and semantics.

## In Scope

1. **Human-readable operational timeline**
   - Reuse the existing six-stage macro timeline (`Sin autorizar`, `Autorizado`, `Pendiente`, `Tránsito`, `Realizada`, `Finalizada`) and its present derivation.
   - Present dates using the existing Argentine date formatter; contextual labels may be used only as a complement, never instead of the exact date.
   - Do not add a workflow step or alter the existing timeline resolver.

2. **Consistent visual semantics**
   - Preserve **Estado CX** as the dominant case-status signal.
   - Preserve **Preparación** as a visually subordinate, separate operational family.
   - Keep documentation, consumption, and billing as secondary neutral indicators; use their existing color/status maps rather than new semantic colors.
   - Make urgency/priority readable through existing data only: `urgente` on the surgery and `alta` / `media` / `baja` on Seguimiento notes where that note is already rendered. This does not create a case-level priority field or priority algorithm.

3. **Explicit separation of CX / preparation / pending novelty**
   - Visually separate the three concepts in list and/or expediente surfaces.
   - “Pending novelty” in this phase is a read-only **derived attention marker**, not a status, queue, task, ownership record, or persisted novelty.
   - Its permitted basis is the existing coordinator-queue incident signals only: SLA warning/overdue, no coordinator, undefined material availability, and urgency (`getIncidentReasons`). If no such derivable signal is available in a target surface, show no marker; do not infer from free text or synthetic fixtures.

4. **Useful preset filters from existing fields**
   - Add or surface preset combinations exclusively through existing filter state and derived helpers. Candidate presets: `Needs attention` (the derived attention marker), `Urgent`, `No CX date`, `Preparation pending`, `Documentation incomplete`, `Without PR`, `Without consumption`, and `Without invoice`.
   - A preset must be explainable as the same predicate already available in the filter hook or coordinator helper. It must clear through the existing clear-filter behavior and must not be persisted as a new saved view.

5. **Identifier and reference hierarchy**
   - Display `visibleNumber` / `CX-####` as primary when available, with the current UI fallback only where legacy data lacks it.
   - Render existing `expedienteNumber`, administrative references, PR, NR, FV, and authorization number as secondary labels/references.
   - Never expose a backend technical ID as the intended display identifier.

6. **Derived next action and responsible area**
   - Reuse the existing local next-action ordering from coordinator views; it remains advisory/read-only.
   - Show exactly one derived area label: **Coordinación**, **Administración**, or **Preparación/Logística**.
   - The design phase must document a deterministic, ordered mapping using only existing fields: coordinator bucket/subgroup and incident signals first; preparation/transit signals second; documentation/facturation completion signals third. The label is a UI aid, not assignment, permission, SLA ownership, or audit evidence.
   - Synthetic fixture actors such as `coordinador`, `deposito`, and `ingresos` are test labels only. They must not be mapped to a real user, responsible area, or ownership record.

## Existing Capability Map

| Requested outcome | Existing capability / source | Phase-1 treatment |
| --- | --- | --- |
| Human-readable timeline | `src/components/expediente/expediente-macro-timeline.ts`; `ExpedienteMacroTimeline.tsx`; `src/lib/formatters.ts` | Reuse derived macro stage and formatted date; presentation only. |
| CX vs preparation semantics | `src/lib/shared-constants.ts`; `src/components/cirugias/CirugiaStatusCell.tsx`; `CirugiaPreparationCell.tsx` | Preserve existing primary/subordinate styles; consolidate usage where needed. |
| Secondary operational signals | `CirugiaOperationalBadges.tsx`; `ExpedienteStatusChips.tsx`; `expediente-header.model.ts` | Keep documentation/consumption/billing distinct and secondary. |
| Pending novelty / attention | `src/components/coordinadores/coordinator-queue.helpers.ts#getIncidentReasons` | Derived, read-only attention marker only; no novelty state exists. |
| Existing filters | `src/hooks/useCirugiasFilters.ts`; `CirugiasToolbar.tsx`; `CirugiasAdvancedFilters.tsx` | Compose existing fields/predicates only. |
| CX primary ID and references | `Surgery.visibleNumber` contract in `src/types/index.ts`; `surgery-adapter.ts`; header model | CX visible number primary; existing references secondary. |
| Next action | `CoordinatorInboxView.tsx#getNextActionLabel`; `src/app/coordinadores/page.tsx#getGlobalNextActionLabel` | Extract/reuse as a display derivation; not persisted. |
| Responsible area | Existing bucket/subgroup, preparation, documentation and billing signals | New display-only mapping; must be specified and unit-tested before use. |

## Explicitly Out of Scope

- Prisma schema, migrations, seed/fixtures/import scripts, database operations, or new persisted fields.
- API routes/contracts, server services, adapters that change contracts, Auth, permissions, roles, multi-company policy, or audit policy.
- Persistence of next action, responsible area, pending novelty, priority, filters, or saved views.
- Redefinition, renaming, reordering, or transition changes for CX, preparation, documentation, consumption, billing, or Seguimiento statuses.
- Creating a canonical task, assignment, novelty, incident, owner, SLA, or escalation domain model.
- Treating a synthetic actor as a real owner, user, authorization subject, or permission principal.
- Changes to fixture data or importing DEV records.

## Acceptance Criteria

1. A CX case shows the current macro timeline with its current derived stage and an exact human-readable date where a date exists.
2. Estado CX, Preparación, and the derived attention marker are visually and textually distinguishable; the attention marker explains its derivable reason(s).
3. A case with no coordinator-queue incident signal does not show a fabricated pending-novelty marker.
4. Preset filters use only existing values/predicates, compose predictably with existing filters, display active-filter feedback, and clear completely.
5. `CX-####` / `visibleNumber` is the primary display identifier; backend IDs are not presented as operational IDs; existing references are secondary.
6. Each shown next action and area is explicitly labeled `Derived` or equivalent UI copy and can be traced to the approved mapping table.
7. No UI action in this phase writes a next action, area, priority, novelty, assignment, or status.
8. Existing expediente actions and status transitions retain their current behavior.

## Ownership Boundaries and Safe Decomposition

Implementation must be serialized around sensitive Cirugías files. One owner holds one write lock at a time.

1. **Design/spec owner (docs only):** define the approved area/action decision table, preset predicate table, copy, and target surfaces. No source edits.
2. **Cirugías owner (single implementation task):** owns all changes required in `src/app/cirugias/page.tsx`, `src/hooks/useCirugiasFilters.ts`, `src/components/cirugias/*`, and any directly related tests. No concurrent writer may touch the page, filter hook, constants, store, or Cirugías components.
3. **Expediente/coordinator owner (sequential after task 2):** owns only the approved presentation targets under `src/components/expediente/*` and `src/components/coordinadores/*` (and one coordinator page only if unavoidable). Reuses the approved derivation; does not alter source-domain logic.
4. **QA owner (read-only):** runs typecheck, targeted tests, and browser QA after both implementation tasks release their locks. No source edits.

The fixture-import agent retains exclusive ownership of fixtures, scripts, and DEV records; this phase does not touch them.

## Validation Plan

- Static/type validation required for every implementation task.
- Targeted unit tests for: macro-timeline unchanged mapping, preset predicate equivalence, area/action mapping order, no attention marker without a source signal, and primary/secondary identifier rendering.
- Existing Cirugías and expediente component tests must remain green.
- Browser QA in desktop and mobile widths: list presets, active/clear filter feedback, CX/preparation/attention differentiation, expediente identifier hierarchy, and no accidental write action.
- Review the final diff to confirm no changes under Prisma, API, Auth/permissions, fixture/import, or status-domain files outside the approved UI scope.

## Risks and Guardrails

- **Derived is not authoritative:** the proposed area/action/attention display can become misleading if presented as an assignment or persistent task. UI copy and tests must keep its derived/read-only label.
- **Duplicate derivations:** next-action logic currently exists separately in two coordinator surfaces. The design phase must nominate one shared display helper or an exact equivalent test contract before any reuse.
- **Cross-domain color drift:** preserve existing CX and preparation maps; do not introduce a competing color vocabulary.
- **Working-tree overlap:** the repository already contains broad unrelated edits. Implementation must acquire locks and change only the approved target files.
- **Undefined semantics:** if a requested preset or area cannot be expressed from the cited existing data, omit it and escalate rather than inventing a rule.

## Proposed Next Step

Proceed to `sdd-design` / `sdd-spec` for `CX-OPERATIONS-UI-SAFE-P1` to freeze: (1) the ordered next-action/area mapping, (2) the exact preset predicate table, (3) target list versus expediente/coordinator surfaces, (4) derived-label copy, and (5) a serialized implementation task list with explicit file locks.
