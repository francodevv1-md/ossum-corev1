# Proposal — CX-STATUS-PREPARATION-SEPARATION-001

Status: proposed
Change: `CX-STATUS-PREPARATION-SEPARATION-001`
Phase: domain correction, contract alignment, and safe normalization planning
Decision required: approve this scope before design/spec/tasks or implementation.

---

## Summary

`En preparación` is exclusively a **Preparación** substatus. It is not, and must never be, a general CX status.

General CX status and preparation status are independent dimensions. A preparation update must not transition the general CX state. Where UI/prototype data currently represents a case's general state as `En preparación`, the general-status presentation and normalization target is `Pendiente`; the preparation condition must be shown independently.

The existing backend direction already separates `cxStatus` from `prepStatus`. This change removes residual UI/prototype and documentation conflation without assuming that persisted historical values can be mutated safely.

## Why

The read-only audit found residual legacy modeling in which `En preparación` is included as a general `SurgeryState`, filtered as a CX state, and produced by the API-to-UI adapter for scheduled cases. It also found canonical-document conflict: `knowledge/domain/SURGERY_EXPEDIENTE.md` still lists `En preparación` among primary CX statuses, despite separately stating that CX and preparation/material must not be mixed.

This ambiguity can falsely communicate a CX transition when only preparation changed, distort filters and coordinator views, and preserve an unsafe historical data interpretation.

## Approved Domain Rule

1. General CX state is independent from preparation/material state.
2. `En preparación` belongs only to the preparation family (for example, `prepStatus = preparing`).
3. Changing preparation must not create, infer, persist, or display a transition of the general CX state.
4. A legacy/current UI-prototype general value of `En preparación` normalizes to the general CX display/state `Pendiente`; its preparation value remains independently visible when available.
5. The rule does not infer a historical CX transition from a preparation value.

## Proposed Scope

### 1. CX/preparation contract alignment

- Define the approved mapping table for API adapters, UI types, constants, labels, status controls, list/ficha rendering, filters, automations, fixtures, and tests.
- Remove `En preparación` from every general CX-status vocabulary, selector, filter, badge, macro-state resolver, and state-transition input/output.
- Keep `En preparación` only in the preparation-status vocabulary and presentation family.
- Normalize legacy/prototype general-state representations of `En preparación` to general `Pendiente`, while preserving independent preparation information where it exists.
- Explicitly prohibit preparation-driven CX transitions in client and server behavior.

### 2. Impacted functional surfaces

- Surgery API-to-UI adapters and status mapping.
- Shared surgery types, general-state constants, labels, and color maps.
- Cirugías list/table status rendering, general-status filters, advanced filters, and operation presets.
- Expediente/Ficha status controls, chips, macro timeline, and derived header models.
- Coordinator queue/view mapping and any derived buckets that currently treat `En preparación` as a CX state.
- Legacy prototype/store paths, local fixtures, test factories, and assertions that classify it as general CX status.
- Any automation or action handler that could couple preparation changes to a general CX transition.

### 3. Canonical-document conflict remediation

The implementation phase must update the authoritative documentation that conflicts with this approved rule, without treating archive material as current authority:

- `knowledge/domain/SURGERY_EXPEDIENTE.md`: remove `En preparación` from primary CX statuses and include it in preparation substates; retain the independent-dimensions rule.
- `knowledge/specs/COORDINADOR-VIEW-MAPPING-DESIGN/DESIGN.md`: replace rules whose general `state` is `En preparación` with rules based on general `Pendiente` plus the independent preparation value, or explicitly mark obsolete rules as superseded.
- Review current, non-archive specs that reproduce the obsolete general-state vocabulary and correct them where they remain authoritative or implementation-facing.

Historical files under `knowledge/archive` remain historical evidence and must not be used as a current contract; they need no retroactive semantic rewrite unless separately approved.

### 4. Historical persisted data: inspect before mutation

Phase 1 assumes **no schema change and no data migration**. The prior migration copied a legacy `status` value into `cxStatus`; therefore persisted `cxStatus = preparing` may exist.

Before any DEV or production mutation, a separately approved safe-data plan must:

1. Inspect DEV and production separately for the count, company distribution, related `prepStatus`, audit history, and active workflow usage of persisted `cxStatus = preparing`.
2. Establish an approved, evidence-based normalization plan. It must not infer an undocumented CX transition from preparation data.
3. Define preview/dry-run evidence, rollback, auditability, company isolation, and validation criteria.
4. Receive Franco approval before any mutation, migration, or backfill.

Until then, implementation may provide safe display/adapter normalization only as specified by the later design/spec; persisted records remain untouched.

## Explicitly Out of Scope

- Prisma schema changes, migrations, database writes, backfills, seeds, imports, or production/DEV data mutation.
- New CX statuses, new preparation statuses, or redefinition of unrelated lifecycle transitions.
- Changes to authorization, permissions, multi-company policy, or audit policy.
- A decision that `prepStatus` alone authorizes a general CX transition.
- Reconstructing historical CX state from `preparing`, `frozen`, shipment, delivery, or return signals.
- Archive rewrites, dependency installation, and unrelated UI redesign.

## Acceptance Criteria

1. The approved spec contains separate exhaustive CX and preparation vocabularies; `En preparación` appears only in the latter.
2. The mapping contract maps any legacy/prototype general `En preparación` representation to general `Pendiente` and keeps preparation separate.
3. No preparation action, adapter, automation, or UI control can transition the general CX state merely because preparation changed.
4. General CX filters, rendering, coordinator derivations, and macro timeline no longer classify `En preparación` as a CX state.
5. Current authoritative documentation is corrected or explicitly superseded for the conflict identified above.
6. No schema or persisted-data mutation is included in Phase 1.
7. Any future historical-data mutation is blocked on separate DEV/prod inspection, safe-plan approval, and Franco approval.

## Risks and Guardrails

| Risk | Guardrail |
| --- | --- |
| Historical `cxStatus = preparing` records have ambiguous general-state meaning. | Do not mutate or infer state; inspect each environment and obtain an approved safe plan first. |
| UI normalization could hide available preparation detail. | Render preparation independently whenever its source exists; never substitute it into the CX badge. |
| Coordinator mappings may retain stale mixed-state predicates. | Review all derived queues/buckets against the separate-dimensions mapping table. |
| Broad Cirugías files are sensitive. | Design/tasks must declare serialized ownership locks and minimal target files before implementation. |
| Documentation correction could be mistaken for a data-migration authorization. | Keep canonical-doc remediation and persisted-data planning explicitly separate. |

## Proposed Next Step

Proceed to `sdd-design` / `sdd-spec` to freeze the dual-status mapping table, target-file inventory, normalization boundary, coordinator derivations, documentation edits, test matrix, and a separate inspection-only task brief for historical persisted `cxStatus = preparing` values. No implementation or data mutation is authorized by this proposal.
