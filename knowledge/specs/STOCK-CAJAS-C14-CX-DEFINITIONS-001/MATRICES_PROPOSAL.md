# C14 D3/D4 Matrices and D8a Proposal

Status: **DRAFT / HUMAN DECISIONS REQUIRED / NON-EXECUTABLE**

## Decision request

Approve, revise, or reject the explicit D3 claim ontology/matrix, the unresolved D4 branches, and D8a. This document is decision support only. **Approved evidence** is distinguished from **recommendations**; no recommendation in this document is approved by its publication.

Mechanical scope: **15 D3 unordered cells; 13 D4 named tables; 85 D4 context/value rows; 1 D8a decision.**

## Authority, bindings, and scope

| Source | Exact binding | Authority used here |
| --- | --- | --- |
| Preparation | Engram **#4750** | Authorizes documentary CX definition preparation only; excludes implementation and execution. |
| Current recommendation approvals | Engram **#4754** | Approves only the concrete recommendations already present in the reviewed packet. D3/D4 outcomes and D8a remain unapproved. |
| Reviewed decision packet | `knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/DECISION_PACKET.md`; Git blob `fcaa6460fa96a032d4e803bd1c393d965a03d6d1` | Governing decision framing and approval boundaries. |
| Matrix exploration | Engram **#4755**, revision 1 | Read-only derivation supplying the complete D3/D4 inventory and new D8a recommendation. |
| Inventory exploration | Engram **#4751** | CX ownership and unresolved-object inventory. |
| C04 physical design | #4318 revision 1 plus governing #4319 revision 2; closure #4321 revision 1 | Approved invariant evidence. |
| C05 migration design | #4324 revision 3; closure #4329 revision 1 | Approved sequencing and custom-object boundaries. |
| C13 final schema | Commit `0faf2f55e178f1b111c5ae108380a505a68c8feb`; schema blob `47313a8a85ac71ac56df93ce212593820cb95a13`; manifest #4389; closure #4720; independent PASS #4721 | Exact final structural evidence. The root worktree schema is stale/quarantined relative to this immutable binding. |
| C14 topology | `knowledge/specs/STOCK-CAJAS-C14-TOPOLOGY-AMENDMENT-001/CHANGE_PACK.md`; blob `b8608a922d2d9adf5d776673252f709c52d4a518` | CX01–CX13 ownership. |
| Estimation binding set | Detached root `ba6c2633ae77d062b90ce405f0c4a92eb2f401954db421aaf54060b5300de3e0` | Reproducibility boundary only. |
| Amendments | #4563 and #4689/#4692/#4693 | Correlation and mandatory disposition evidence-owner structural evidence. |

**In scope:** documentary D3 ontology/matrix, exhaustive D4 truth tables, grouped human questions, D8a alternatives/recommendation, and dependency/approval plan.

**Out of scope:** SQL syntax or bodies; schema, migration, seed, database, Prisma, runner, vector, manifest, catalog, external-estimation, deployment, production, staging, or commit changes.

## Reading key

- **Approved evidence** means the cited authorities already establish that fact.
- **Recommendation** means technically supported but still requires Franco's substantive product/data approval.
- D4 dispositions are: `APPROVED`, `RECOMMENDED`, `UNRESOLVED`, or `BLOCKED`.
- **PS** means Prisma-supported enum, field, nullability, FK, unique, or index structure already present in the bound final schema.
- **CX** means a custom kind-dependent, cross-row, signed-aggregate, or implication rule that cannot be treated as Prisma-supported structure.
- “Same transaction” describes ordering, not implementation or concurrency authorization.

## D3 — claim ontology before compatibility

### Five observed families

| Family | Observed representation and approved evidence | Candidate active/terminal predicate | Proposal |
| --- | --- | --- | --- |
| **R — reservation** | `StockReservation`; immutable `StockReservationEvidence.kind` = `RESERVE`, `RELEASE`, `REPLACE`, `CANCEL`, `APPLY_TO_DISPATCH`; rebuildable projection status and quantities. Immutable evidence, not projection, is acceptance authority. | Active: evidence-derived live quantity `> 0`, with projection labels `ACTIVE`/`PARTIALLY_APPLIED` only as acceleration. Terminal: live quantity `= 0`; projection labels `RELEASED`/`CANCELLED`/`EXHAUSTED` only as acceleration. | **RECOMMENDED**, not approved. Approve event algebra and mapping; never promote projection status to authority. |
| **A — assignment** | `CajasAssignment.activeSlot`, `endedAt`, `endedById`, `endCause`, `endCommandAcceptanceId`; active slot is null or 1; end tuple is all-null/all-set; unique `(companyId, boxIdentifiedUnitId, activeSlot)`. | Active: `activeSlot=1` and all end fields null. Terminal: `activeSlot=null` and all end fields set. | **RECOMMENDED**, directly aligned with approved row shape; no pending enum exists. |
| **C — custody** | **No independent claim, status, release field, unique, or terminal predicate exists.** `StockContext.kind=EXTERNAL_CUSTODY` describes context; occupancy points to a current position. | No independent predicate can be derived without inventing semantics. | **BLOCKED as an independent family.** |
| **D — disposition** | Immutable `CajasDisposition` has `recordKind`, `accountingSign`, `kind`, quantity, owner links, neutralization link, and Stock evidence. No status/terminal field exists. | Active effect: only a signed authoritative evidence aggregate after D4 closes kind/sign semantics. Terminal cannot be inferred from `underReview`. | **UNRESOLVED.** |
| **O — occupancy** | `StockIdentifiedUnitOccupancy` has one row per company/unit, `currentPositionId`, version, and watermark. It is a current projection, not immutable acceptance authority. | Current: the unique row points to current position. No terminal/release predicate exists; movement updates the pointer. | **RECOMMENDED** as current-position fact, not a separately active claim lifecycle. |

### Custody decision

**Alternative A — collapse custody into occupancy context.** Custody is true exactly when the unit's current occupancy position belongs to a `StockContext` whose kind is `EXTERNAL_CUSTODY`. There is no second claim, release row, or independent terminal state.

- Consequences: the ontology used for exclusivity has four independently represented families (`R`, `A`, `D`, `O`); the five D3 cells containing `C` become derived-context questions or duplicates rather than independent claim conflicts; no double-counting; custody changes when occupancy moves.
- Limitation: this does not preserve a distinct custody episode, custodian-specific lifecycle, or custody claim independent of physical/current position.

**Alternative B — add a distinct custody claim representation.** A separately approved model must name its owner, status, active/terminal predicates, acquisition/release evidence, uniqueness, lineage, and relation to occupancy.

- Consequences: all five custody-containing D3 cells must be classified against the new representation; counts and CX manifests remain open; this requires **separate schema and business-rule approval** and cannot be authorized by this proposal.

**Recommendation: Alternative A.** The bound schema represents external custody only as occupancy context. Alternative A uses observed facts and avoids inventing a fifth lifecycle or counting one fact twice.

**Exact approval clause:** `I approve D3 custody Alternative A: custody is not an independent claim family; it is derived exactly from current occupancy at a position whose StockContext.kind is EXTERNAL_CUSTODY, and no separate custody lifecycle, release state, or claim count is inferred.`

### Exact 15-cell unordered matrix

| # | Cell | Observed fields/status evidence | Candidate active/terminal predicate | Recommendation / state | Same-transaction release/acquire behavior | Affected CX | Count impact | Exact approval clause where decidable |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **R–R** | Reservation root + immutable events; no oversubscription; optional unit must match identified position. | Active while evidence-derived live quantity `>0`; terminal at `0`. | Conflict only where both claims have positive live aggregates; terminal history compatible. **RECOMMENDED.** | Apply release/cancel/dispatch-use to old claim before accepting new reserve, in one future approved locked business scope. | CX03, CX04, CX08 | Named guards unchanged; predicates/branches remain unfrozen until event algebra approval. | `I approve D3 R–R: reservations for the same identified unit conflict only while both authoritative evidence-derived live quantities are positive; terminal history remains compatible, and replacement releases the old live claim before acquiring the new claim in the same transaction.` |
| 2 | **R–A** | Assignment guard names incompatible reservation/assignment claims; correlation alone proves workflow relation, not compatibility. | R active as above; A active by active slot/open end tuple. | **BLOCKED / NO DEFAULT.** Ownership key for coexistence is absent. | Release reservation first, then activate assignment; reverse order would require separately approved deferral. | CX03, CX04, CX08, CX11 | One pair branch remains unresolved; no count freezes. | No safe clause until Franco decides whether same-unit coexistence is allowed and names its ownership key. |
| 3 | **R–C** | No independent custody predicate exists. | C has no independent active/terminal predicate. | Under custody Alternative A, evaluate R–O plus external-context rule; otherwise **BLOCKED**. | Undefined for independent C; under A, release/replace R around occupancy movement as in R–O. | CX03, CX04, CX08 | Under A, no independent C branch; under B, new branches/objects remain unknown. | Covered by the custody Alternative A clause; Alternative B requires a separate approved model and later cell clause. |
| 4 | **R–D** | Both affect no-double-use; disposition sign/kind semantics remain open. | R live aggregate; D signed effect only after D4. | **BLOCKED / NO DEFAULT** until reservation event and disposition sign tables close. | If later approved, apply/release reservation before accepting disposition in the same locked scope. | CX03, CX04, CX08, CX12 | Pair predicates/branches unresolved; D4 affects exact count. | No safe clause until Franco classifies which disposition kinds consume, hold, or release reserved scope and how lineage is proven. |
| 5 | **R–O** | Reservation is position-bound; occupancy is current-position projection. | R live aggregate; O current pointer. | Require same-position coherence; movement compatibility remains **UNRESOLVED**. | Release old reservation before occupancy move; move; reserve at new position. Atomic sequence is possible; deferral is not shown necessary. | CX03, CX04, CX08 | At least coherence and movement outcome predicates; exact occurrences remain unfrozen. | `I approve D3 R–O: an active reservation and current occupancy for the same identified unit must reference the same position; moving occupancy requires the old reservation to be released or replaced before the move and any new-position reservation to be accepted after the move in the same transaction.` |
| 6 | **A–A** | Partial active-slot uniqueness; lifecycle tuple all-null/all-set. | Active slot/open tuple versus null slot/complete end tuple. | Two active rows conflict; terminal history coexists. **RECOMMENDED.** | End old assignment completely before inserting new active assignment. | CX03, CX04, CX11 | Existing unique supports part; lifecycle/order CX predicates remain countable only after approval. | `I approve D3 A–A: one identified unit may have at most one active assignment; terminal assignment history is compatible, and reassignment completes the old end tuple and clears its active slot before creating the new active assignment in the same transaction.` |
| 7 | **A–C** | No independent custody predicate. | C undefined independently. | Under A, evaluate A–O with external context; otherwise **BLOCKED**. | Undefined independently; under A, follow approved A–O movement policy. | CX03, CX04, CX11 | Under A, no C branch; under B, unknown new count. | Covered by custody Alternative A; assignment/external-context compatibility still requires the A–O clause or a revision. |
| 8 | **A–D** | Disposition is assignment-owned operational history; no generic identified-unit disposition predicate exists. | A active by slot/end tuple; D signed effect after D4. | No global conflict: same-assignment history coexists, but terminating kinds remain **UNRESOLVED**. | End timing relative to final dispositions is a product rule; do not infer order. | CX03, CX04, CX11, CX12 | Kind-specific D4 branches determine predicates and counts. | No safe clause until Franco identifies which disposition kinds terminate or block assignment reuse. |
| 9 | **A–O** | Both reference identified unit; assignment has no direct position field. | A active; O current pointer/context. | Compatibility expected, but valid contexts/movement policy are **UNRESOLVED**. | If movement is allowed, update occupancy in the same locked scope; otherwise end assignment first. | CX03, CX04, CX11 | Context allow-list and movement branches unresolved. | No safe clause until Franco approves the occupancy contexts and movement policy valid during an active assignment. |
| 10 | **C–C** | No custody row, status, release, or unique. | None independently. | Under A, duplicate of single current occupancy; otherwise **BLOCKED**. | Under A, one occupancy pointer update; no separate custody release/acquire. | CX03, CX04 | Under A, zero independent C–C branch; under B, unknown. | Covered by custody Alternative A. |
| 11 | **C–D** | Custody predicate absent; disposition owner/sign open. | C none independently; D unresolved. | Under A, evaluate D–O at external context; otherwise **BLOCKED**. | Undefined until D4 and occupancy transition semantics close. | CX03, CX04, CX12 | Under A, no independent C branch; D–O still unresolved. | Covered by custody Alternative A; a separate D–O decision remains required. |
| 12 | **C–O** | `EXTERNAL_CUSTODY` is a context kind and occupancy points to a current position. | Under A, custody is exactly O at external context. | Treat as one fact, not two claims. **RECOMMENDED.** | Occupancy movement changes derived custody; no second acquire/release row exists. | CX03, CX04 | Under A, zero independent compatibility branch; only occupancy/context predicate. | `I approve D3 C–O under custody Alternative A: external custody and current occupancy at an EXTERNAL_CUSTODY context are one fact, not two simultaneous claims; occupancy movement alone changes the derived custody state.` |
| 13 | **D–D** | Partial dispositions and slices exist; signed shared remainder cannot become negative or double-disposed; neutralization target is unique. | Active effect is authoritative signed aggregate; terminal/final behavior is kind-specific. | Compatible while signed algebra and owner/link truth tables preserve nonnegative remainder; otherwise conflict. `underReview` remains unresolved. | Neutralize before replacement in one locked transaction; every immediate state stays valid unless separately approved deferral is demonstrated. | CX03, CX04, CX12 | D4 record/sign/kind arms determine exact predicates/branches. | `I approve D3 D–D: multiple disposition slices are compatible only when approved owner, record/sign, neutralization, and kind rules keep the authoritative signed shared remainder nonnegative and prevent double disposition; neutralization precedes replacement in the same transaction.` |
| 14 | **D–O** | D is immutable effect evidence; O is current projection; exact position link may be optional. | D after D4 signed semantics; O current pointer. | **BLOCKED / NO DEFAULT.** | If a disposition changes occupancy, evidence acceptance and pointer update must share one transaction; order and authority remain open. | CX03, CX04, CX12 | Kind-to-movement branches unresolved. | No safe clause until Franco maps each disposition kind to required occupancy retention, movement, or removal and target context. |
| 15 | **O–O** | Unique company/unit occupancy and unique current position enforce one current row per unit/position. | Current row/pointer; no terminal state. | Two simultaneous current rows conflict; use one guarded pointer update. **RECOMMENDED.** | Move through one guarded update in the evidence transaction; do not create a second current row. | CX03, CX04 | Existing uniques are PS; any absence/share policy adds CX branches still open. | `I approve D3 O–O: an identified unit has at most one current occupancy row and movement uses one guarded current-position update in the evidence transaction; a second simultaneous current row is forbidden.` |

**D3 consequence:** with custody Alternative A, the matrix remains a complete review ledger of 15 originally requested cells, but only four independently represented families enter exclusivity counts. The five cells containing `C` are explicitly resolved as derived-context/duplicate cells or remain dependent on their corresponding occupancy cell. Approval does not authorize concurrency primitives, functions, triggers, or vectors.

## D4 — exhaustive truth tables

Every context/value row below is explicit. A row with any unresolved semantic branch is not marked `APPROVED`, even when some structural facts are approved.

### T01 — Lot review result (4 rows)

| Row | Enum/value/context | Required fields/links | Forbidden/null fields | Sign/position/record shape | PS portion | CX-only portion | Disposition | Concise decision clause |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T01-R01 | `MATCH` / `StockLotReview` | Left/right observations: same company, Article, normalized code; canonical ID order; canonical lot permitted | `resolutionObservationId=null` | No sign/position effect; matching review pair | Enum, links, pair unique | Order, code/coherence, result shape; whether canonical lot is required | UNRESOLVED | Approve whether `canonicalLotId` is required or merely permitted for `MATCH`; keep resolution null. |
| T01-R02 | `DISCREPANCY` / review | Left/right coherent review pair | `canonicalLotId=null`; recommend `resolutionObservationId=null` | No sign/position effect | Enum, links | Pair coherence and result null-shape | RECOMMENDED | Approve discrepancy with no canonical lot and no resolution observation. |
| T01-R03 | `RESOLVED_EQUIVALENT` / review | Coherent pair; `resolutionObservationId` required; canonical lot permitted | None beyond unrelated fields | Resolved-equivalence record | Enum and links | Required/result/coherence implications | APPROVED | Retain required resolution observation and permitted canonical lot. |
| T01-R04 | `REJECTED` / review | Coherent pair | `canonicalLotId=null`; recommend `resolutionObservationId=null` | Rejected review record | Enum and links | Result null-shape | RECOMMENDED | Approve rejected result with neither canonical lot nor resolution observation. |

### T02 — EvidenceRecordKind by owner context (28 rows)

| Row | Enum/value/context | Required fields/links | Forbidden/null fields | Sign/position/record shape | PS portion | CX-only portion | Disposition | Concise decision clause |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T02-R01 | `ORIGINAL` / `StockLotObservation` | Base owner fields | `correctsObservationId=null` | Original, no sign/position effect | Enum, nullable FK | Kind/link iff | APPROVED | Original lot observation has no correction target. |
| T02-R02 | `CORRECTION` / `StockLotObservation` | Correction target; same company/Article; not self | No unrelated lineage | Correction preserves original | Enum/FK | Requiredness and owner coherence | APPROVED | Correction must target a different same-company/same-Article observation. |
| T02-R03 | `REVERSAL` / `StockLotObservation` | No dedicated link exists | Cannot safely map correction link | Record shape undefined | Enum and nullable FK | Entire semantic mapping | BLOCKED | Reject or add separately approved lineage; do not reuse correction link by inference. |
| T02-R04 | `ANNULMENT` / `StockLotObservation` | No dedicated link exists | Cannot safely map correction link | Record shape undefined | Enum and nullable FK | Entire semantic mapping | BLOCKED | Reject or add separately approved lineage; do not infer annulment target. |
| T02-R05 | `ORIGINAL` / `StockEvidence` | Base evidence fields | Both `correctsEvidenceId` and `reversesEvidenceId` null | Original header | Enum/FKs | Kind/link iff | APPROVED | Original Stock evidence has neither lineage link. |
| T02-R06 | `CORRECTION` / `StockEvidence` | `correctsEvidenceId` required | `reversesEvidenceId=null` | Correction header | Enum/FKs | Exclusive requiredness/coherence | APPROVED | Correction uses only the correction link. |
| T02-R07 | `REVERSAL` / `StockEvidence` | `reversesEvidenceId` required | `correctsEvidenceId=null` | Reversal header | Enum/FKs | Exclusive requiredness and inverse semantics | RECOMMENDED | Approve reversal through only the reversal link and inverse parent semantics. |
| T02-R08 | `ANNULMENT` / `StockEvidence` | Mapping not selected | Correction/reversal exclusivity cannot close | Undefined header mapping | Enum/FKs | Link choice and semantics | UNRESOLVED | Choose reversal link, correction link, or reject `ANNULMENT` for this owner. |
| T02-R09 | `ORIGINAL` / `CajasDispatch` | Base dispatch owner fields | `correctsDispatchId=null` | Original dispatch header | Enum/FK | Kind/link iff | APPROVED | Original dispatch has no correction target. |
| T02-R10 | `CORRECTION` / `CajasDispatch` | `correctsDispatchId`; same assignment/remito | No unrelated lineage | Correction header | Enum/FK | Requiredness and owner coherence | APPROVED | Correction targets a dispatch under the same assignment and remito. |
| T02-R11 | `REVERSAL` / `CajasDispatch` | No dedicated reversal link | Do not infer correction-link reuse | Undefined header mapping | Enum/FK | Entire semantic mapping | BLOCKED | Reject or separately define reversal lineage for dispatch headers. |
| T02-R12 | `ANNULMENT` / `CajasDispatch` | No dedicated annulment link | Do not infer correction-link reuse | Undefined header mapping | Enum/FK | Entire semantic mapping | BLOCKED | Reject or separately define annulment lineage for dispatch headers. |
| T02-R13 | `ORIGINAL` / `CajasDispatchLine` | Base line fields | `neutralizesDispatchLineId=null` | Recommend `accountingSign=+1`; position follows dispatch semantics | Enum/FK/sign field | Link/sign iff | RECOMMENDED | Approve original dispatch line as positive with no neutralization target. |
| T02-R14 | `CORRECTION` / `CajasDispatchLine` | Exact lineage target not selected | Exact sign/null pattern unresolved | Undefined correction line | Enum/FK/sign field | Complete link/sign mapping | UNRESOLVED | Define correction target and sign, or reject correction for line owner. |
| T02-R15 | `REVERSAL` / `CajasDispatchLine` | `neutralizesDispatchLineId` required | No other lineage | Recommend `accountingSign=-1`; inverse linked line | Enum/FK/sign field | Link/sign/owner coherence | RECOMMENDED | Approve reversal as a negative neutralization of one compatible dispatch line. |
| T02-R16 | `ANNULMENT` / `CajasDispatchLine` | Exact lineage target not selected | Exact sign/null pattern unresolved | Undefined annulment line | Enum/FK/sign field | Complete link/sign mapping | UNRESOLVED | Define annulment target/sign or reject the value for line owner. |
| T02-R17 | `ORIGINAL` / `CajasReturnConfirmation` | Base confirmation fields; recommend `originalSlot=1` | `correctsConfirmationId=null` | Original header slot | Enum/FK/slot | Kind/link/slot iff | RECOMMENDED | Approve original Return confirmation with slot 1 and no correction target. |
| T02-R18 | `CORRECTION` / `CajasReturnConfirmation` | `correctsConfirmationId` required | Recommend `originalSlot=null` | Correction header | Enum/FK/slot | Kind/link/slot coherence | RECOMMENDED | Approve correction target required and original slot absent. |
| T02-R19 | `REVERSAL` / `CajasReturnConfirmation` | No dedicated link | Do not infer correction-link reuse | Undefined confirmation shape | Enum/FK/slot | Semantic mapping | BLOCKED | Reject or separately define Return reversal lineage and slot behavior. |
| T02-R20 | `ANNULMENT` / `CajasReturnConfirmation` | No dedicated link | Do not infer correction-link reuse | Undefined confirmation shape | Enum/FK/slot | Semantic mapping | BLOCKED | Reject or separately define Return annulment lineage and slot behavior. |
| T02-R21 | `ORIGINAL` / `CajasConsumptionConfirmation` | Base confirmation fields; recommend `originalSlot=1` | `correctsConfirmationId=null` | Original header slot | Enum/FK/slot | Kind/link/slot iff | RECOMMENDED | Approve original Consumption confirmation with slot 1 and no correction target. |
| T02-R22 | `CORRECTION` / `CajasConsumptionConfirmation` | `correctsConfirmationId` required | Recommend `originalSlot=null` | Correction header | Enum/FK/slot | Kind/link/slot coherence | RECOMMENDED | Approve correction target required and original slot absent. |
| T02-R23 | `REVERSAL` / `CajasConsumptionConfirmation` | No dedicated link | Do not infer correction-link reuse | Undefined confirmation shape | Enum/FK/slot | Semantic mapping | BLOCKED | Reject or separately define Consumption reversal lineage and slot behavior. |
| T02-R24 | `ANNULMENT` / `CajasConsumptionConfirmation` | No dedicated link | Do not infer correction-link reuse | Undefined confirmation shape | Enum/FK/slot | Semantic mapping | BLOCKED | Reject or separately define Consumption annulment lineage and slot behavior. |
| T02-R25 | `ORIGINAL` / `CajasDisposition` | Return or Consumption owner tuple per T11 | `neutralizesDispositionId=null` | Recommend `accountingSign=+1`; kind semantics per T12 | Enum/FKs/sign | Owner/link/sign iff | RECOMMENDED | Approve original disposition as positive with no neutralization target. |
| T02-R26 | `CORRECTION` / `CajasDisposition` | Exact lineage target not selected | Exact sign/null pattern unresolved | Undefined correction disposition | Enum/FKs/sign | Complete link/sign mapping | UNRESOLVED | Define correction target/sign or reject correction for disposition owner. |
| T02-R27 | `REVERSAL` / `CajasDisposition` | `neutralizesDispositionId` required | No other lineage | Recommend `accountingSign=-1`; inverse compatible disposition | Enum/FKs/sign | Link/sign/owner/kind coherence | RECOMMENDED | Approve reversal as negative neutralization of one compatible disposition. |
| T02-R28 | `ANNULMENT` / `CajasDisposition` | Exact lineage target not selected | Exact sign/null pattern unresolved | Undefined annulment disposition | Enum/FKs/sign | Complete link/sign mapping | UNRESOLVED | Define annulment target/sign or reject annulment for disposition owner. |

### T03 — Command attempt outcome (6 rows)

| Row | Enum/value/context | Required fields/links | Forbidden/null fields | Sign/position/record shape | PS portion | CX-only portion | Disposition | Concise decision clause |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T03-R01 | `ACCEPTED` / command attempt | `commandAcceptanceId`, `auditEventId` | Neither may be null | Accepted attempt | Enum/FKs | Outcome/link iff | APPROVED | Accepted requires command acceptance and audit event. |
| T03-R02 | `DENIED` / command attempt | `auditEventId` | `commandAcceptanceId=null` | Denied attempt | Enum/FKs | Outcome/link iff | APPROVED | Denied requires audit and forbids command acceptance. |
| T03-R03 | `VALIDATION_FAILED` / attempt | Audit requirement unresolved | `commandAcceptanceId=null` | Failed-before-acceptance | Enum/FKs | Audit optionality implication | UNRESOLVED | Decide whether audit is required; command acceptance remains forbidden. |
| T03-R04 | `CONFLICT` / attempt | Audit requirement unresolved | `commandAcceptanceId=null` | Conflict-before-acceptance | Enum/FKs | Audit optionality implication | UNRESOLVED | Decide whether audit is required; command acceptance remains forbidden. |
| T03-R05 | `FAILED` / attempt | Audit requirement unresolved | `commandAcceptanceId=null` | Failed attempt | Enum/FKs | Audit optionality implication | UNRESOLVED | Decide whether audit is required; command acceptance remains forbidden. |
| T03-R06 | `UNKNOWN` / attempt | Audit requirement unresolved | `commandAcceptanceId=null` | Unknown attempt | Enum/FKs | Audit optionality implication | UNRESOLVED | Decide whether audit is required; command acceptance remains forbidden. |

### T04 — Operational effect target (3 rows)

| Row | Enum/value/context | Required fields/links | Forbidden/null fields | Sign/position/record shape | PS portion | CX-only portion | Disposition | Concise decision clause |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T04-R01 | `DOMAIN_ONLY` / operational effect | Domain owner fields | Both Stock evidence links null | Domain-only effect | Enum/FKs | Target/link iff | APPROVED | Domain-only effect has no Stock evidence target. |
| T04-R02 | `STOCK_EVIDENCE` / effect | `stockEvidenceId` | `stockReservationEvidenceId=null` | Stock evidence effect | Enum/FKs | Target/link iff | APPROVED | Stock-evidence target requires exactly that link. |
| T04-R03 | `STOCK_RESERVATION_EVIDENCE` / effect | `stockReservationEvidenceId` | `stockEvidenceId=null` | Reservation evidence effect | Enum/FKs | Target/link iff | APPROVED | Reservation-evidence target requires exactly that link. |

### T05 — StockEvidenceKind position shape (12 rows)

| Row | Enum/value/context | Required fields/links | Forbidden/null fields | Sign/position/record shape | PS portion | CX-only portion | Disposition | Concise decision clause |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T05-R01 | `OPENING` / Stock evidence | `toPositionId`; activation boundary; same boundary/company/position; accepted at or after cutoff | `fromPositionId=null` | Destination-only; no sign mapping here | Enum/FKs; D8b timestamp field exists | Kind-position and boundary/time coherence | RECOMMENDED | Approve destination-only opening with required coherent boundary; D8b `StockEvidence.acceptedAt` remains already approved. |
| T05-R02 | `RECEIPT` | `toPositionId` | `fromPositionId=null` | Destination-only | Enum/FKs | Kind-position iff | APPROVED | Receipt is destination-only. |
| T05-R03 | `DISPATCH` | `fromPositionId` | `toPositionId=null` | Source-only; reservation compatibility open | Enum/FKs | Kind-position and reservation lineage | UNRESOLVED | Retain source-only shape and approve exact reservation linkage compatibility. |
| T05-R04 | `RETURN` | `toPositionId` | `fromPositionId=null` | Destination-only | Enum/FKs | Kind-position iff | RECOMMENDED | Approve Return as destination-only. |
| T05-R05 | `CONSUMPTION` | `fromPositionId` | `toPositionId=null` | Source-only | Enum/FKs | Kind-position iff | APPROVED | Consumption is source-only. |
| T05-R06 | `TRANSFER_DISPATCH` | Both positions, distinct | Neither null; equality forbidden | Source and destination; pair semantics open | Enum/FKs | Distinctness and paired-kind lineage | UNRESOLVED | Retain both-distinct shape and define pairing semantics. |
| T05-R07 | `TRANSFER_RECEIPT` | Both positions, distinct | Neither null; equality forbidden | Source and destination; pair semantics open | Enum/FKs | Distinctness and paired-kind lineage | UNRESOLVED | Retain both-distinct shape and define pairing semantics. |
| T05-R08 | `COUNT_OBSERVATION` | Exact position allowance unresolved | Exact null-forbid matrix unresolved | May carry neither effect; exact shape open | Enum/FKs | Complete kind-position mapping | UNRESOLVED | Decide whether from/to are forbidden, permitted, or conditionally required. |
| T05-R09 | `REVIEW_HOLD` | Exact position and held-scope links unresolved | Exact null-forbid matrix unresolved | Hold effect unresolved | Enum/FKs | Position and held-quantity semantics | UNRESOLVED | Define position shape and whether/how quantity is held. |
| T05-R10 | `REVIEW_RELEASE` | Exact position and released-scope links unresolved | Exact null-forbid matrix unresolved | Release effect unresolved | Enum/FKs | Position and release semantics | UNRESOLVED | Define position shape and inverse relation to review hold. |
| T05-R11 | `CORRECTION` | Corrected evidence lineage | Position shape must match approved corrected semantics | Correction preserves original | Enum/FKs | Parent-derived position compatibility | UNRESOLVED | Define how correction position shape is derived from its target. |
| T05-R12 | `REVERSAL` | Reversed evidence lineage | Position shape must inverse approved target semantics | Reversal preserves original | Enum/FKs | Parent-derived inverse position compatibility | UNRESOLVED | Define exact inverse position shape from the reversed target. |

### T06 — Reservation event (5 rows)

| Row | Enum/value/context | Required fields/links | Forbidden/null fields | Sign/position/record shape | PS portion | CX-only portion | Disposition | Concise decision clause |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T06-R01 | `RESERVE` / reservation evidence | Quantity `>0`; reservation owner | Replacement/dispatch lineage absent unless separately defined | Positive increase of live aggregate; position inherited/coherent | Enum, quantity, FKs | Aggregate ceiling and event algebra | RECOMMENDED | Approve positive reserve increasing live quantity without exceeding ceiling. |
| T06-R02 | `RELEASE` | Quantity `>0`; reservation owner | Replacement/dispatch lineage absent unless separately defined | Positive event quantity decreases live aggregate, never below zero | Enum, quantity, FKs | Signed interpretation and floor | RECOMMENDED | Approve positive release decreasing live quantity without crossing zero. |
| T06-R03 | `REPLACE` | Quantity `>0`; same-reservation `replacesEvidenceId` candidate | Cross-reservation/self target forbidden | Net replacement algebra unresolved | Enum/FK; same-owner evidence exists | Link requiredness and net algebra | UNRESOLVED | Require same-reservation replacement target and define exact old/new net effect. |
| T06-R04 | `CANCEL` | Schema quantity `>0`; reservation owner | Exact full/partial rule unresolved | Cancellation quantity and terminal mapping unresolved | Enum, quantity, FKs | Event algebra/status implication | UNRESOLVED | Decide whether cancellation must consume the full live balance and when it is terminal. |
| T06-R05 | `APPLY_TO_DISPATCH` | Quantity `>0`; exact dispatch lineage required | Unrelated dispatch/reservation links forbidden | Decrease active; increase applied | Enum, quantity, FKs | Lineage, aggregate, status mapping | UNRESOLVED | Approve active-to-applied effect and name exact dispatch lineage fields. |

### T07 — Reservation source scope (2 rows)

| Row | Enum/value/context | Required fields/links | Forbidden/null fields | Sign/position/record shape | PS portion | CX-only portion | Disposition | Concise decision clause |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T07-R01 | `HEADER` / reservation source | `sourceEntityId`; `sourceScopeKey="H:" + sourceEntityId` | `sourceLineId=null` | Header-scoped record | Fields/unique/index | Canonical key iff | APPROVED | Header scope forbids line ID and uses canonical header key. |
| T07-R02 | `LINE` / reservation source | `sourceLineId`; `sourceScopeKey="L:" + sourceLineId` | Header-only key shape forbidden | Line-scoped record | Fields/unique/index | Canonical key iff | APPROVED | Line scope requires line ID and uses canonical line key. |

### T08 — Cajas composition change kind (5 rows)

For this table, a “side” is the coherent preparation-line, Article, position, quantity, and trace capture. A present position requires its Article; present quantities are positive with scale 0..4.

| Row | Enum/value/context | Required fields/links | Forbidden/null fields | Sign/position/record shape | PS portion | CX-only portion | Disposition | Concise decision clause |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T08-R01 | `ADD` / composition line | Result side | Prior side null | New positive quantity introduced | Optional fields/FKs | Exact side tuple and kind-delta iff | UNRESOLVED | Approve result-only ADD and define the complete required result tuple. |
| T08-R02 | `REMOVE` | Prior side | Result side null | Prior positive quantity removed | Optional fields/FKs | Exact side tuple and kind-delta iff | UNRESOLVED | Approve prior-only REMOVE and define the complete required prior tuple. |
| T08-R03 | `REPLACE` | Prior and result sides | Neither side absent | Article and/or position changes; quantity-change permission open | Optional fields/FKs | Tuple coherence and exact delta | UNRESOLVED | Define which attributes must change and whether quantity may also change. |
| T08-R04 | `QUANTITY` | Prior and result sides | Article/position changes forbidden | Same Article/position; quantity differs; trace equality open | Optional fields/FKs | Equality/difference/trace implications | UNRESOLVED | Approve quantity-only delta and define required trace equality. |
| T08-R05 | `TRACEABILITY` | Prior and result sides | Article/quantity changes forbidden | Same Article/quantity; exact trace/position change open | Optional fields/FKs | Equality/difference implications | UNRESOLVED | Define the exact traceability/position delta while Article and quantity remain equal. |

### T09 — CajasDifference origin (3 rows)

| Row | Enum/value/context | Required fields/links | Forbidden/null fields | Sign/position/record shape | PS portion | CX-only portion | Disposition | Concise decision clause |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T09-R01 | `CONTROL` / Difference | `controlLineId` | Dispatch-origin tuple and Return-origin tuple null | Control-origin record | Optional FKs | Origin XOR and owner coherence | APPROVED | Control origin requires only its control line. |
| T09-R02 | `DISPATCH` / Difference | `originDispatchId`, `originRemitoId`, `dispatchLineId` | Control and Return tuples null | Dispatch-origin record | Owner-qualified FKs | Origin XOR and tuple coherence | APPROVED | Dispatch origin requires the complete dispatch tuple only. |
| T09-R03 | `RETURN` / Difference | `returnConfirmationId`, `originDispatchId`, `returnLineId`; coherent owner | Control and standalone dispatch-origin tuple null | Return-origin record | Owner-qualified FKs | Origin XOR and owner coherence | APPROVED | Return origin requires the complete coherent Return tuple only. |

### T10 — Return line kind (7 rows)

| Row | Enum/value/context | Required fields/links | Forbidden/null fields | Sign/position/record shape | PS portion | CX-only portion | Disposition | Concise decision clause |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T10-R01 | `unchanged` / Return line | `dispatchLineId` | Replacement pair forbidden | Returned unchanged; Stock consequence mapping pending D4 evidence kinds | Enum/FKs | Kind/link and Stock semantic compatibility | RECOMMENDED | Approve dispatch-linked unchanged Return with no replacement pair. |
| T10-R02 | `consumed` | `dispatchLineId` | Replacement pair forbidden | Consumed disposition | Enum/FKs | Kind/link and Stock semantic compatibility | RECOMMENDED | Approve dispatch-linked consumed Return with no replacement pair. |
| T10-R03 | `missing` | `dispatchLineId` | Replacement pair forbidden | Missing disposition | Enum/FKs | Kind/link and Stock semantic compatibility | RECOMMENDED | Approve dispatch-linked missing Return with no replacement pair. |
| T10-R04 | `damaged` | `dispatchLineId` | Replacement pair forbidden | Damaged disposition | Enum/FKs | Kind/link and Stock semantic compatibility | RECOMMENDED | Approve dispatch-linked damaged Return with no replacement pair. |
| T10-R05 | `added` | Added-item owner/Article/quantity facts | `dispatchLineId=null`; replacement pair forbidden | Received added item; exact Stock effect open | Enum/FKs | Kind/link and Stock effect | UNRESOLVED | Retain no dispatch/replacement link and define exact Stock effect. |
| T10-R06 | `replacement` | Replacement pair for received replacement; original branch requires exact source | Dispatch link nullable only on received replacement branch | Relationship itself has no Stock effect; original/received branches open | Enum/FKs | Branch, pair, link, and consequence semantics | UNRESOLVED | Define original and received replacement branches and their dispatch-link shapes. |
| T10-R07 | `underReview` | Recommend `dispatchLineId`; pending reason/scope as existing fields permit | Replacement pair forbidden | Hold/pending; consumption of remainder unresolved | Enum/FKs | Kind/link and remainder effect | UNRESOLVED | Decide whether under-review consumes, holds, or only labels shared remainder. |

**Consumption-line constraint:** the bound final schema has **no `CajasConsumptionLineKind` enum or kind field**. Consumption-line semantics derive from required dispatch lineage, optional `recognizedReturnDispositionId`, and linked dispositions. No consumption line kind may be invented.

### T11 — Disposition owner (2 rows)

| Row | Enum/value/context | Required fields/links | Forbidden/null fields | Sign/position/record shape | PS portion | CX-only portion | Disposition | Concise decision clause |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T11-R01 | `RETURN` / CajasDisposition owner | `returnConfirmationId`, `returnLineId`; mandatory same-tenant Stock evidence-line owner | Both Consumption IDs null | Return-owned record; sign per T02; Article/from-position guard conditional | Owner-qualified FKs including approved #4689 evidence owner | Owner XOR, semantic compatibility, sign/remainder | APPROVED | Return disposition uses only the coherent Return owner tuple. |
| T11-R02 | `CONSUMPTION` / disposition owner | `consumptionConfirmationId`, `consumptionLineId`; mandatory same-tenant Stock evidence-line owner | Both Return IDs null | Consumption-owned record; sign per T02; Article/from-position guard conditional | Owner-qualified FKs including approved #4689 evidence owner | Owner XOR, semantic compatibility, sign/remainder | APPROVED | Consumption disposition uses only the coherent Consumption owner tuple. |

### T12 — Disposition kind (5 rows)

| Row | Enum/value/context | Required fields/links | Forbidden/null fields | Sign/position/record shape | PS portion | CX-only portion | Disposition | Concise decision clause |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T12-R01 | `returned` / disposition | Owner tuple and compatible Stock evidence line | Incompatible owner/Stock links | Recommend positive final returned effect; reversal per T02 | Enum/FKs | Kind-to-Stock/remainder/sign compatibility | RECOMMENDED | Approve returned as a positive final disposition subject to approved reversal. |
| T12-R02 | `consumed` | Owner tuple and compatible Stock evidence line | Incompatible owner/Stock links | Recommend positive final consumed effect | Enum/FKs | Kind-to-Stock/remainder/sign compatibility | RECOMMENDED | Approve consumed as a positive final disposition subject to approved reversal. |
| T12-R03 | `missing` | Owner tuple and compatible Stock evidence line | Incompatible owner/Stock links | Recommend positive final missing effect | Enum/FKs | Kind-to-Stock/remainder/sign compatibility | RECOMMENDED | Approve missing as a positive final disposition subject to approved reversal. |
| T12-R04 | `damaged` | Owner tuple and compatible Stock evidence line | Incompatible owner/Stock links | Recommend positive final damaged effect | Enum/FKs | Kind-to-Stock/remainder/sign compatibility | RECOMMENDED | Approve damaged as a positive final disposition subject to approved reversal. |
| T12-R05 | `underReview` | Owner tuple; exact hold scope unresolved | Final-effect inference forbidden | Pending/hold candidate, not automatically final | Enum/FKs | Remainder, Stock, release, and sign semantics | UNRESOLVED | Decide whether under-review consumes, reserves/holds, or merely labels remainder and how it is released. |

### T13 — Condition state (3 rows)

| Row | Enum/value/context | Required fields/links | Forbidden/null fields | Sign/position/record shape | PS portion | CX-only portion | Disposition | Concise decision clause |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T13-R01 | `available` / condition projection | Candidate: counts `=0`, `requiresRecontrol=false`, coherent operation/reuse eligibility | Open-difference/pending reasons candidate forbidden | Projection state, not acceptance authority | Enum, nonnegative counts, version, optional assignment FK | Count/state/eligibility implications | UNRESOLVED | Define exact available predicate; C04's label alone does not establish full lifecycle semantics. |
| T13-R02 | `withDifferences` | Candidate: open difference count `>0` and/or recontrol/pending reason | Exact mutually exclusive nulls unresolved | Projection state | Enum, fields/FK | Count/reason/state implications | UNRESOLVED | Define whether any listed signal suffices and its precedence. |
| T13-R03 | `null` / condition state | Projection row may exist; exact lifecycle points unresolved | No condition value | Unassigned projection condition | Nullable enum, fields/FK | Lifecycle permission and eligibility implications | UNRESOLVED | Name lifecycle points where a projection may have no condition. |

### D4 mechanical accounting

| Table | Rows |
| --- | ---: |
| T01 Lot review result | 4 |
| T02 EvidenceRecordKind by owner context | 28 |
| T03 Command attempt outcome | 6 |
| T04 Operational effect target | 3 |
| T05 StockEvidenceKind position shape | 12 |
| T06 Reservation event | 5 |
| T07 Reservation source scope | 2 |
| T08 Cajas composition change kind | 5 |
| T09 CajasDifference origin | 3 |
| T10 Return line kind | 7 |
| T11 Disposition owner | 2 |
| T12 Disposition kind | 5 |
| T13 Condition state | 3 |
| **Total** | **85** |

## Fewest coherent unresolved D4 questions

The unresolved rows reduce to three questions without merging incompatible domains:

1. **Evidence lineage, event algebra, and Stock effects:** approve owner-specific `EvidenceRecordKind` mappings for all seven owners; Stock evidence position shapes; reservation event/status algebra; command-failure audit requirements; and lot-review result nullability. These share correction/reversal/effect authority but must retain owner-specific rows.
2. **Operational Cajas record shapes:** approve composition side/delta tuples, Return replacement/added/under-review branches, disposition kind/sign/remainder behavior, and confirm the absence of any Consumption line kind. These share operational owner and remainder semantics.
3. **Condition projection semantics:** define `available`, `withDifferences`, and null lifecycle predicates independently from immutable acceptance authority.

Approval of a grouped question is valid only if the reviewer explicitly accepts or revises every row named by that group; a broad “approve the group” must not fill unspecified branches.

## D8a — exclusion deferrability

Approved evidence: equal `(companyId, positionId)` windows must not overlap under half-open intervals `[cutoffAt, validUntil)`; no authority requires temporary overlap.

| Alternative | Consequence | Exact approval clause |
| --- | --- | --- |
| **A — NOT DEFERRABLE** | Earliest failure; no temporary overlap. Boundary replacement remains valid statement-by-statement by first closing the old interval at the successor cutoff, then inserting the successor. Touching half-open intervals do not overlap. | `I approve D8a Alternative A: ex_sab_position_window is NOT DEFERRABLE.` |
| **B — DEFERRABLE INITIALLY IMMEDIATE** | Immediate by default; an explicitly authorized transaction may defer for order-independent or multi-row reshaping that temporarily overlaps. | `I approve D8a Alternative B: ex_sab_position_window is DEFERRABLE INITIALLY IMMEDIATE.` |
| **C — DEFERRABLE INITIALLY DEFERRED** | Every transaction may carry invalid overlap until commit; maximizes reshaping flexibility but delays failure. No current evidence justifies this default. | `I approve D8a Alternative C: ex_sab_position_window is DEFERRABLE INITIALLY DEFERRED.` |

**Recommendation: Alternative A — NOT DEFERRABLE.** It minimizes invalid transaction state and caller obligations, while the known replacement path needs no temporary overlap.

**Fallback condition:** choose Alternative B, never C by default, only if Franco separately approves an exact workflow that must insert first or reshape multiple rows with temporary overlap and also approves that workflow's transaction contract. Without that evidence, retain Alternative A.

## Dependency and freeze plan

```text
1. Approve claim ontology, including custody Alternative A or a separately scoped model.
2. Approve all 15 D3 cells and all 85 D4 rows; approve D8a independently.
3. Close exact invariant families, then apply approved D1 dedicated function-family policy.
4. Apply approved D9 occurrence definitions to canonical rendered artifacts.
5. Derive counts; never estimate or infer them from this proposal.
6. Derive all 13 CX vectors from approved manifests/templates/fixtures.
7. Independent Migration/DB review, then Franco substantive approval under separate authority.
```

Short form: **ontology decision → matrices → D1 function families → D9 counts → CX vectors**.

## No-authority boundary and exact next approval process

This proposal authorizes **no SQL; schema edit; migration file/directory; Prisma command; database/catalog access; seed/backfill; runner execution; manifest/template/fixture creation; CX vector or catalog constant update; external estimation; staging; commit; remote action; deployment; or production action**. It does not approve D3/D4 outcomes or D8a merely by recommending them. All 13 vectors remain unresolved and null.

Next approval must occur in this order:

1. Franco reviews and explicitly approves or revises the custody clause.
2. Franco approves each decidable D3 clause and answers each `NO DEFAULT` cell question; revised clauses are rendered for confirmation.
3. Franco answers the three grouped D4 questions with an explicit disposition for every affected row; no unspecified value receives a fallback.
4. Franco chooses one D8a clause. Alternative B additionally requires the exact temporary-overlap workflow and transaction contract.
5. An independent reviewer verifies the resulting matrices against the bound final schema and authorities.
6. A separate authorization may then permit function-family definitions, canonical artifacts, D9 counts, and derived vectors. Implementation remains separately gated.

## Completeness checklist

- [x] Status is DRAFT / HUMAN DECISIONS REQUIRED / NON-EXECUTABLE.
- [x] Exact packet, topology, final schema, and estimation bindings are stated.
- [x] Five observed D3 families are described before compatibility.
- [x] Custody has no independent representation; Alternatives A/B and recommendation A are explicit.
- [x] Exactly **15** unordered D3 cells are rendered.
- [x] Every D3 cell states evidence, candidate predicate, disposition, transaction behavior, affected CX, count impact, and approval handling.
- [x] Exactly **13** named D4 tables are rendered.
- [x] Exactly **85** D4 context/value rows are rendered.
- [x] Every D4 row states required/forbidden shape, PS/CX boundary, disposition, and decision clause.
- [x] No `CajasConsumptionLineKind` is invented.
- [x] Unresolved D4 rows are grouped into three coherent human questions.
- [x] D8a alternatives, `NOT DEFERRABLE` recommendation, exact clauses, and fallback condition are explicit.
- [x] Dependency order is ontology → matrices → D1 → D9 → vectors.
- [x] No SQL syntax or body is included.
- [x] No implementation authority is claimed.
