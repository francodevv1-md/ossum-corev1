# Proposal — COORDINATION-EZEQUIEL-DEV-QA-002

Status: approved by Franco for the current bounded productive path; implementation remains separately gated.

## Intent

Keep eight synthetic DEV overlay cases active in Ezequiel DEV’s productive personal inbox and validate pending disclosure without altering the bootstrap.

## Evidence and invariants

- The protected baseline is the original exact 21 active records and 8 Ezequiel assignments (also 8 Nelson/5 unassigned). Franco fixed `N=8`; temporary totals are 29 active and 16 Ezequiel-assigned. All overlay cases remain active; original identities, records, and assignments remain unchanged.
- Personal resolution is fail-closed and company-scoped: exactly one active personal contact linked as `coordinator`; zero/multiple matches never guess.
- The current local `ClipboardList` disclosure is named `Cierre pendiente: N requisito(s) faltante(s)` and lists `Documentación`, `Consumo`, `Facturación`. Franco authorized it on active overlay cases as an orthogonal QA/display fact—not lifecycle finalization, a command, mutation, or network write.

## Scope

### New capabilities
- `coordination-ezequiel-dev-fixtures`: additive, deterministic, reversible synthetic cases assigned to the exact resolved Ezequiel DEV contact through an approved audited domain path.

### Modified capabilities
- `coordination-pending-disclosure-qa`: active synthetic overlay cases may expose the existing read-only disclosure without changing general lifecycle semantics.

### Non-goals
No Remitos, schema, Auth, API, permissions, new pending category, preview/useCoordinationView change, or product-wide lifecycle rule. This amendment executes nothing. Implementation follows separately approved DESIGN/TASKS/APPLY.

### Bounded productive files
- `src/components/coordinadores/CoordinatorInboxView.tsx`
- `src/components/coordinadores/coordination-filtering.ts`
- `src/lib/api/surgery-adapter.ts`
- Specific tests for this contract only

All other productive files are forbidden. The mechanism is a DESIGN decision; this proposal records behavior, not architecture.

## Proposed contract

- The matrix covers all four metrics, advanced filters, AND, contradictory/ordinary filtered-empty, true-empty, and current pending-category combinations.
- Before any future write, fail closed unless approved local DEV tier/environment, exact project/workspace, exact company, approved provenance/baseline, and Ezequiel resolved through the authorized company-scoped resolver all match. Any ambiguity/mismatch stops pre-write; dynamic IDs are neither exposed nor hardcoded.
- Each fixture has a deterministic package external key, synthetic ownership/provenance, idempotent rerun/no-op, no duplicate assignment, and fail-closed collisions. Stop if this requires schema invention.
- The fixture executor owns creation manifest and cleanup. Audited actor identity and each created record/assignment require evidence. Independent post-cleanup reconciliation must prove exact 21/8 restoration and unchanged originals. Never broad-delete.

## Remitos decision gate

Remitos remains unresolved and excluded; no rule, category, or implementation is assumed.

## QA direction and success

At desktop/mobile, verify active overlay visibility, accessible count/name, keyboard/touch disclosure, exact categories, zero writes, case-action separation, 29/16 overlay totals, and cleanup restoration to 21/8.

## Risks, alternatives, and gates

Risks: collisions, tenant leakage, stale manifests, accidental lifecycle coupling, and writes. Fail closed. Authorization is limited to Franco’s bounded expansion; no unrelated implementation is approved.
