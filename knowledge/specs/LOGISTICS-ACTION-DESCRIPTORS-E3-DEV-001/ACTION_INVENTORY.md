# E3 UX Action Inventory

| UX phase | Descriptor type | Existing command | Descriptor source | Status |
|---|---|---|---|---|
| Prepare | `RELEASE_ALLOCATION` | existing Phase B route | E2 projection | Covered |
| Control | `ACCEPT_CONTROL`, `RESOLVE_DIFFERENCE` | existing Phase C routes | E2 projection | Covered |
| Dispatch | `EMIT_REMITO_DISPATCH` | existing Remito emission route | E2 projection | Covered |
| Receive | `RECORD_CONSUMPTION`, `REGISTER_RETURN`, `REGISTER_UNIDENTIFIED_RETURN` | `consume`, `return`, `return_unidentified` | E3 allocation actions | Covered |
| Receive | `RECEIVE_RETURN`, `RESOLVE_UNIDENTIFIED_RETURN` | `receive_return`, `resolve_unidentified_return` | E3 return actions | Covered |
| Reconcile | `CLOSE_RECONCILIATION`, `REOPEN_RECONCILIATION` | `close_reconciliation`, `reopen_reconciliation` | E3 dispatch-scoped reconciliation snapshot | Covered |

`REGISTER_UNIDENTIFIED_RETURN` has no physical-line ceiling or pending-quantity predicate in the existing Phase D service. Its descriptor therefore reports the exact existing validator contract: positive decimal with four decimal places and no server-derived business maximum. Mutation validation remains authoritative.
