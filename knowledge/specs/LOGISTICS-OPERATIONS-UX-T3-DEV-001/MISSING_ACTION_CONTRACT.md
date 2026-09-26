# Missing Action Contract — Phase E Logistics Operations UX

## E2 Update

E2 independently passed and resolves the original Phase B/C gap. The E1 projection now supplies exact, server-authoritative descriptors for `RELEASE_ALLOCATION`, `ACCEPT_CONTROL`, `RESOLVE_DIFFERENCE`, and `EMIT_REMITO_DISPATCH`, including routes, targets, allowed inputs, idempotency, and concurrency metadata.

## Remaining Finding

The approved UI still requires contextual **Prepare → Control → Dispatch → Receive → Reconcile** actions. E2 supplies descriptors only for Phase B/C work. Phase D is still represented by capability booleans/reasons and persisted identifiers rather than descriptors, so a frontend would have to construct Phase-D command payloads itself.

## Evidence

| Action | Existing mutation | Required authoritative input | E1 availability | Result |
|---|---|---|---|---|
| Prepare / Control / Dispatch | B/C mutation routes | route, immutable targets, allowed human fields, idempotency/concurrency | E2 action descriptors | Available; frontend can reuse exactly |
| Receive / Reconcile | `POST /surgeries/:surgeryId/logistics/phase-d` | operation action, dispatch IDs, dispatch-line IDs, quantity limits, eligible source-operation IDs, allowed receipt outcomes/reasons, command-key policy | E2 exposes capabilities and some identifiers only; no descriptor | Cannot call safely |

## Required Follow-up

An approved E2 extension must expose server-authoritative descriptors for every currently allowed Phase-D operation. Each descriptor needs the mutation route/action, immutable target IDs, valid payload fields/defaults, permitted quantities, eligible source-operation IDs/outcomes where applicable, idempotency policy, blockers, and capability reason. The frontend must render and submit only those descriptors; it must not derive them from allocation state.

## Scope Decision

No source code or component test was added. Implementing only the visual/read-only portions would leave the approved contextual action rail incomplete, while fabricating Phase-D payloads would violate the task boundary.
