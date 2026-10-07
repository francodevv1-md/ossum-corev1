# Preparation → Remito — traced boundary and blocked implementation

## Active chain and established behavior
- StockArticleSheet → CajasPhysicalUnitsSection → cajas-assignments client → assignment preparation APIs/services.
- OperationalRemitoWorkspace and LogisticaTabContent → cajas-intent → remitos client → emitir route → emitirRemito → acceptCajasDispatch in the owner's Serializable transaction.
- Existing dispatch preserves trace snapshots, enforces item totals/current clean control/reservations/capacity, retains remaining reservations on partial dispatch, replays identical intent and rejects changed payload. Legacy unlinked Remitos retain generic emission.
- Surgery preparation PATCH changes prepStatus only, not physical prepared material. PreparationOperationalWorkspace has no application caller and requests unsupported GET/POST/reserve endpoints; it is not a usable physical-preparation implementation.

## Proven contract gaps (read-only evidence)
- Client sends `kind: recontrol`; control route forwards only `cause`, silently invoking ordinary control.
- Difference resolution client omits `expectedResolutionSequence` required by the validator.
- Reservation route ignores explicit request intent; service already supports intent/version/replay/conflict.
- Existing physical-unit adapter forces quantity one; general selection service already supports quantity/position/version/intent. Reuse it rather than implementing another subsystem.
- Independent review additionally confirms the control transport must carry caller freshness/identity (`expectedVersion`, `idempotencyKey`), not merely `kind`.
- Separate resource-binding finding: difference resolution route ignores parent `assignmentId`, while the service resolves by company/difference ID. A same-company difference can be addressed under another assignment URL. No cross-company access was demonstrated. This is recorded for explicit security/resource-binding scope review; no permission or security fix is attempted in this blocked package.

## Preserved distinctions
- Partial Cajas dispatch is not partial receiving. Commercial OrdenCompra receiving applies deltas without request identity; ceilings alone do not prevent repeat deltas. This is a separate actively owned Compras chain, not a Sol 1 change.
- Receipt confirmation has movement keys/confirmed replay; scan requests have independent identities. No receiving semantics are changed here.
- Surgery trace.service derives document quantities and reports hasStockMovements=false; it is not complete physical-stock trace evidence.
- Canonical operation-context hosting is surgery Cajas, not new mutations in the dirty shared Stock host. Protected UI ownership is a prerequisite.

## Ownership stop
`CAJAS-END-TO-END-DEV-001/ORCHESTRATOR_OWNERSHIP_PAUSE.md:28` prohibits further critical-source/DB mutation until exclusive services/tests ownership is reconciled. No documented later reconciliation was found by the independent trace. Cajas lock releases therefore identify candidate scope, not unconditional edit permission. Shared schema is also claimed by active Compras and adjustment-document locks; neither is released or altered by Sol 1.

No Phase B source implementation or synthetic persistent end-to-end closure is claimed. The exact candidate contract scope is declared in TASK_BRIEF.md for coordinated continuation.

Continuation: Franco's `dale metele` lifts the hold for the exact TASK_BRIEF client/API/test scope. Implementation proceeds under PHASE_B_LOCK.md; other shared/critical files and DB prerequisites remain excluded or pending. This supersedes the stopped status for that exact scope only, not historical records or persistent acceptance.

Current result: bounded transport implementation is complete and statically independently reviewed; exact released hashes match. IMPLEMENTATION.md records 30 contract checks and final 184 passing unit tests/10 skipped. Protected UI caller upgrades are not implemented; deprecated overloads preserve compilation, not functional recovery of incomplete recontrol/resolution. Overall persistent journey remains NOT READY.

Execution incident: implementation owner accidentally included unguarded Remito DB integration despite no-DB scope. Synthetic seed/cleanup hooks ran; Remito POST failed403. No independent target/residual audit, further DB query or cleanup was performed. This was outside approval and is not persistent Cajas evidence. Further DB work is stopped pending explicit read-only incident audit; see IMPLEMENTATION.md and HANDOFF.md.

## Evidence prerequisites
- Existing opt-in cajas-preparation-postgres.test.ts includes real reservation contention, isolation, rollback, replay and partial owner dispatch scenarios. Its existence/skipped checks are not proof of persisted acceptance.
- Current target/schema/client and synthetic create/delete permissions must be confirmed before running. Previous Cajas timeout cleanup remains unconfirmed; no prefix deletion/reset is permitted.
- Process has no CORE_FLOW_STORAGE_STATE or explicit DB test prerequisites. Port 5000 responds, but reachability is neither authentication nor a disposable-target confirmation.
- Historical documentation runtime confirms a disposable DEV context for that task; it does not prove current Cajas target/schema or current session freshness.
- Build requires an exclusive shared-output window; no build or server restart attempted.
- Existing PostgreSQL partial owner-dispatch proof can run independently of route corrections once ownership/target/schema/cleanup prerequisites pass. Do not require every API/UI gap to be fixed before running that service-level proof; it does not certify API/UI recovery.
