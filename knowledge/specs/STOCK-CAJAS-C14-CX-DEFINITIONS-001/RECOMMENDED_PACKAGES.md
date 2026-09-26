# C14 D3/D4 Conservative Recommendation Packages

Status: **PROPOSED / HUMAN APPROVAL REQUIRED / NON-EXECUTABLE**

## 1. Decision request and binding

This document converts every D4 row and the remaining D3 disposition-dependent cells from `MATRICES_PROPOSAL.md` Git blob `4f8536560fd94ba0af92091739a333986ee75eee` into one joint semantic package, J1, and one separate structural-only package, P3. J1 must be approved as one unit because evidence lineage and Cajas owner/sign/remainder semantics are mutually dependent. Publication does **not** approve any recommendation.

Already-approved authority is not reopened: Engram #4754, #4758, #4759, #4760, #4761, and #4762. In particular, custody is occupancy at `EXTERNAL_CUSTODY`; reservation, assignment, and occupancy base predicates are fixed; correlated same-unit R–A coexistence is fixed; active-assignment occupancy may move among `DEPOSIT`, `TRANSIT`, and `EXTERNAL_CUSTODY` only with accepted Stock evidence; and `ex_sab_position_window` is `NOT DEFERRABLE`.

Structural binding: C13 commit `0faf2f55e178f1b111c5ae108380a505a68c8feb`, schema blob `47313a8a85ac71ac56df93ce212593820cb95a13`. The conservative rule is fail-closed: when an owner lacks a dedicated lineage link or field needed to distinguish a shared enum value, CX validation rejects that value for that owner. No other link is repurposed and no schema is added.

The only final D4 dispositions used below are:

- `APPROVE AS-IS`: retain the proposal's already-complete shape.
- `APPROVE RECOMMENDED SHAPE`: accept the exact shape stated here.
- `REJECT FOR THIS OWNER/CONTEXT`: the enum remains structural, but this owner/context may not accept it.
- `DEFER TO C19/C31`: retain only existing structural validity in C14; authorize no CX semantic predicate for the row.

## 2. Shared proposed algebra

These definitions are recommendations, not approvals.

1. **Immutable authority.** Acceptance uses immutable Stock/Cajas evidence under the approved D5 locked business scope. Projections and labels are rebuildable acceleration only.
2. **Signed records.** `ORIGINAL=+1`; `REVERSAL=-1` and requires its owner's dedicated neutralization/reversal link. Unsupported `CORRECTION` or `ANNULMENT` values are rejected for that owner. Quantity fields stay positive; sign is carried only by `accountingSign` where that field exists or by the event algebra stated below.
3. **Depth-one StockEvidence adjustment lineage.** Adjustment acceptance validates under every affected existing `(companyId, positionId)` acceptance scope from rule 7; no new lock scope or primitive is introduced. An adjustment is accepted only in one of two exact shapes: `(recordKind=CORRECTION, kind=CORRECTION, correctsEvidenceId=base.id, reversesEvidenceId=null)` or `(recordKind=REVERSAL, kind=REVERSAL, reversesEvidenceId=base.id, correctsEvidenceId=null)`. The target must be a different already-accepted base with `recordKind=ORIGINAL`, `kind` in the J1-accepted non-adjustment StockEvidence kinds, and both lineage IDs null. Child and base must share `(companyId, sourceDomain, sourceEntityType, sourceEntityId)` and every line-owned Article/position/reservation/unit/scale ownership scope; snapshot correspondence follows rule 4. `child.acceptedAt >= base.acceptedAt`. Across all accepted StockEvidence, a base may have at most one accepted child total where either `correctsEvidenceId=base.id` or `reversesEvidenceId=base.id`. Therefore a second child, mixed correction plus reversal children, repeated neutralization, self-target, cross-company/cross-owner-scope target, rejected target kind, non-accepted target, adjustment target, or adjustment child that targets another adjustment is rejected. `StockEvidence` has no lifecycle status field, so no projection/status label may qualify a target. An adjustment can never itself be targeted. The depth-one rule makes cycles impossible by acceptance semantics without a new field or enum.
4. **StockEvidence line correspondence and deterministic effective fold.** A correction/reversal child has exactly one positive-quantity line for every base line and no extras, matched by existing `lineNumber` within the respective evidence headers. All corresponding lines keep `articleId`, `reservationId`, `stockUnit`, `scaleSnapshot`, and `sourceLineId`. A `CORRECTION` also keeps the base `fromPositionId`/`toPositionId` shape and IDs, but may replace quantity and captured lot/expiration/serial/identified facts; its lines are evaluated using the base's accepted StockEvidence kind and position sign, not the child's `CORRECTION` kind. A `REVERSAL` line must equal the base quantity and all captured facts; for movement bases it swaps `fromPositionId` and `toPositionId`, while for `COUNT_OBSERVATION|REVIEW_HOLD|REVIEW_RELEASE` it retains the same source position and validates inverse semantic scope. Reversal lines are **validation-only** and are never independently folded. For each accepted base `B`, define exactly one contribution: no adjustment child → fold `B.lines`; one accepted correction `C` → suppress `B.lines` and fold only `C.lines` under `B.kind`; one accepted reversal `V` → suppress both `B.lines` and `V.lines`, contributing zero. Adjustment headers are never separate fold roots. Thus base plus correction or base plus inverse reversal can never be double counted.
5. **Current dispatch header and dispatch-line quantity.** A dispatch correction is a full replacement header. For one `(companyId, assignmentId, remitoId)` correction chain, CX requires one linear acyclic chain, at most one correcting child per header, exactly one non-superseded leaf, `correction.sequence = target.sequence + 1`, and `correction.acceptedAt >= target.acceptedAt`. Only that leaf is current. When the current leaf is a `CORRECTION` header, its full replacement lines must all be `ORIGINAL`, `accountingSign=+1`, and `neutralizesDispatchLineId=null`; they never target a prior header's lines. An `ORIGINAL` current header may use the supported same-header `ORIGINAL`/`REVERSAL` line algebra from T02-R13/R15. In both cases, `netDispatch = Σ(accountingSign × quantity)` over accepted lines of the unique current leaf for each line lineage. A correction is rejected after the superseded header has any Return confirmation, Consumption confirmation, disposition, or difference, because the final schema has no cross-header downstream-line remapping. Historical header accounting remains historical; current remainder uses only the unique leaf header and its own downstream records.
6. **Disposition quantities.** `final = Σ(accountingSign × quantity)` for `returned|consumed|missing|damaged`; `hold = Σ(accountingSign × quantity)` for `underReview`; `remainder = netDispatch - final - hold`. Each aggregate and `remainder` must remain nonnegative. A reversal must match the target's company, dispatch line, owner tuple, kind, Article, Stock unit/scale, position shape, and quantity, and a target may be neutralized once.
7. **Reservation authority, scope, ceiling, and fold.** The locked business scope is exactly `(StockReservation.companyId, StockReservation.positionId)`; `identifiedUnitId`, when non-null, is already coherent through the identified-position FK and does not create a second pool. The later concurrency design must serialize acceptance for this scope but this package chooses no lock primitive. At accepted command time `t`, derive `physical(companyId,positionId,t)` only from the depth-one effective base contributions in rule 4 whose Article, `stockUnit`, `scaleSnapshot`, and trace/identified snapshots are coherent with that position scope: add positive quantity when the effective base kind is `OPENING|RECEIPT|RETURN` and effective `toPositionId=positionId`; subtract it when the effective base kind is `DISPATCH|CONSUMPTION` and effective `fromPositionId=positionId`; `COUNT_OBSERVATION|REVIEW_HOLD|REVIEW_RELEASE` have zero physical sign; rejected transfer kinds contribute nothing. Incoherent units/scales/scopes are rejected, never converted implicitly. Derive `reviewHold` from the same effective-base rule as `REVIEW_HOLD - REVIEW_RELEASE` quantity at the same company/Article/source-position/trace scope; a corrected hold/release uses correction replacement lines and a reversed hold/release contributes zero. The immutable reservation ceiling is `ceiling = physical - reviewHold`, and acceptance requires `ceiling >= 0` and `Σ live(reservation)` across all reservations in the locked scope `<= ceiling` after every event.
8. **Reservation replacement-chain fold.** Per reservation, events are evaluated by increasing `sequence`. `RESERVE` is an acquisition leaf with contribution `+q`. `REPLACE` may target only one different same-reservation acquisition (`RESERVE` or `REPLACE`), and each acquisition may have at most one replacing child; the chain must be acyclic. Only the terminal acquisition in each replacement chain contributes `+q`, so accepting `REPLACE(new)` changes live balance by `new.quantity - replacedEffective.quantity`. `RELEASE`, `CANCEL`, and `APPLY_TO_DISPATCH` contribute `-q` and may not be replacement targets. Every sequence prefix requires `0 <= live <= ceiling`. The first event that makes live zero is terminal and forbids every later event for that reservation; a later acquisition requires a new reservation root.
9. **Cancellation and dispatch application.** `CANCEL.quantity` must equal live balance immediately before acceptance and makes live zero with terminal reason cancellation. `APPLY_TO_DISPATCH` is accepted only when one command acceptance owns: (a) the exact reservation event; (b) one `OperationalCommandEffect` with target `STOCK_RESERVATION_EVIDENCE` and that event ID; (c) one effect with target `STOCK_EVIDENCE` and the exact `DISPATCH` evidence ID; and (d) both effects carry the same `resultEntityType` and `resultEntityId` as each other and the command result identity. The dispatch evidence's source-only lines must name the reservation, match its company/position/Article/unit/scale scope, and total exactly the applied quantity. Otherwise `APPLY_TO_DISPATCH` is rejected.
10. **No implicit occupancy effect.** A disposition changes occupancy only when its same-command accepted Stock evidence expresses a supported movement. A source-only effect that would require an identified unit to have no current position is rejected because the final schema has no absence/terminal occupancy state.

## 3. J1 — Joint evidence and operational semantics

### 3.1 Proposed decision summary

Approve T01–T12 as one non-severable package: owner-native lineage, depth-one single-child StockEvidence correction/reversal, deterministic effective evidence folding, audited command outcomes, exact Stock position shapes, evidence-authoritative reservation algebra, mutually exclusive Cajas shapes, owner XOR, signed dispositions, and one shared remainder. `MATCH` identifies a canonical lot. Unsupported lineage branches fail closed. `underReview` is a reversible hold, never a terminal label. There is no `CajasConsumptionLineKind`.

**Rejected alternatives:** separate evidence and operational approvals; optional canonical identity for `MATCH`; reusing correction links for reversal/annulment; auditless failures; free-form position nullability; projection-authoritative reservation state; unproven dispatch application; mixed composition deltas; label-only holds; cross-header line neutralization; and any invented Consumption line kind.

**Exact consequences:** T01–T12 become complete together; record kind, single adjustment-child lineage, effective evidence fold, sign, owner, reservation ceiling, final/hold aggregates, and shared remainder cannot be approved separately; J1 closes the package-dependent D3 R–D, A–D, D–D, and D–O recommendations.

**Affected CX:** CX02, CX03, CX04, CX06, CX07, CX08, CX09, CX11, CX12, CX13.

**Count-family implications:** no object count is frozen. D1 remains dedicated per invariant family. D9 will count the rendered adjustment-lineage/fold, owner-kind, outcome, position, reservation, composition, Return, owner, disposition, and remainder arms; rejected arms are explicit reject branches, not omitted fallbacks. No Consumption-kind family exists.

**Rollback/revision trigger:** revise J1 only if a later approved schema adds a dedicated lineage, transfer pair, cross-header downstream mapping, occupancy absence state, or Consumption kind, or approved Stock semantics prove a different immutable balance formula. Until then, rejected arms remain rejected.

**Exact J1 approval sentence:** `I approve proposed joint Package J1 in RECOMMENDED_PACKAGES.md as one non-severable decision for every row T01-R01 through T12-R05, including each stated APPROVE AS-IS, APPROVE RECOMMENDED SHAPE, and REJECT FOR THIS OWNER/CONTEXT disposition; this approval jointly covers all shared record-kind, depth-one StockEvidence correction/reversal lineage with at most one accepted adjustment child total, deterministic base/correction/reversal effective folding and no double counting, command/effect/result identity, Stock position, reservation ceiling/event algebra, dispatch-header replacement, Cajas shape, owner, accounting-sign, final/hold, movement, and shared-remainder semantics, confirms that no CajasConsumptionLineKind exists or is authorized, and does not approve P3, the integrated D3 matrix, SQL, schema, migration, implementation, or CX vectors.`

### 3.2 J1 crosswalk — T01 Lot review result (4/4)

| Row | Final proposed disposition | Exact proposed shape |
| --- | --- | --- |
| T01-R01 `MATCH` | APPROVE RECOMMENDED SHAPE | Require coherent ordered pair and `canonicalLotId`; canonical lot has the same company, Article, and normalized lot code; `resolutionObservationId=null`. |
| T01-R02 `DISCREPANCY` | APPROVE RECOMMENDED SHAPE | Coherent pair; `canonicalLotId=null`; `resolutionObservationId=null`. |
| T01-R03 `RESOLVED_EQUIVALENT` | APPROVE AS-IS | Require coherent pair and `resolutionObservationId`; `canonicalLotId` may be null or name a coherent canonical lot. |
| T01-R04 `REJECTED` | APPROVE RECOMMENDED SHAPE | Coherent pair; `canonicalLotId=null`; `resolutionObservationId=null`. |

### 3.3 J1 crosswalk — T02 EvidenceRecordKind by owner (28/28)

| Row | Final proposed disposition | Exact proposed shape |
| --- | --- | --- |
| T02-R01 `ORIGINAL` / lot observation | APPROVE AS-IS | `correctsObservationId=null`. |
| T02-R02 `CORRECTION` / lot observation | APPROVE AS-IS | Require a different same-company/same-Article correction target. |
| T02-R03 `REVERSAL` / lot observation | REJECT FOR THIS OWNER/CONTEXT | No dedicated reversal link; do not reuse `correctsObservationId`. |
| T02-R04 `ANNULMENT` / lot observation | REJECT FOR THIS OWNER/CONTEXT | No dedicated annulment link; do not reuse `correctsObservationId`. |
| T02-R05 `ORIGINAL` / StockEvidence | APPROVE AS-IS | Both lineage links null. |
| T02-R06 `CORRECTION` / StockEvidence | APPROVE RECOMMENDED SHAPE | Require `(recordKind=CORRECTION, kind=CORRECTION)`, only `correctsEvidenceId`, and the depth-one same-owner accepted ORIGINAL base plus single-adjustment-child rule in §2. The correction is a replacement, never an additional fold contribution. |
| T02-R07 `REVERSAL` / StockEvidence | APPROVE RECOMMENDED SHAPE | Require `(recordKind=REVERSAL, kind=REVERSAL)`, only `reversesEvidenceId`, and the depth-one same-owner accepted ORIGINAL base plus single-adjustment-child rule in §2. Reversal lines validate exact neutralization and are not independently folded. |
| T02-R08 `ANNULMENT` / StockEvidence | REJECT FOR THIS OWNER/CONTEXT | No dedicated annulment link; neither correction nor reversal link is repurposed. |
| T02-R09 `ORIGINAL` / dispatch | APPROVE AS-IS | `correctsDispatchId=null`. |
| T02-R10 `CORRECTION` / dispatch | APPROVE RECOMMENDED SHAPE | Full replacement header only: require coherent same-assignment/same-remito `correctsDispatchId`; target is the unique current leaf, has no Return/Consumption/disposition/difference dependents, and correction uses next sequence with nondecreasing acceptance time. Chain stays linear/acyclic. Corrected-header lines are only `ORIGINAL +1` and never neutralize prior-header lines; the new unique leaf becomes current for accounting/remainder. |
| T02-R11 `REVERSAL` / dispatch | REJECT FOR THIS OWNER/CONTEXT | No dedicated reversal link. |
| T02-R12 `ANNULMENT` / dispatch | REJECT FOR THIS OWNER/CONTEXT | No dedicated annulment link. |
| T02-R13 `ORIGINAL` / dispatch line | APPROVE RECOMMENDED SHAPE | `accountingSign=+1`; `neutralizesDispatchLineId=null`; positive quantity and coherent Stock evidence source position. |
| T02-R14 `CORRECTION` / dispatch line | REJECT FOR THIS OWNER/CONTEXT | No correction-specific line link; neutralization is reserved for reversal. |
| T02-R15 `REVERSAL` / dispatch line | APPROVE RECOMMENDED SHAPE | `accountingSign=-1`; require one compatible `neutralizesDispatchLineId`; exact inverse quantity/owner/Article/unit/position shape; target neutralized once. |
| T02-R16 `ANNULMENT` / dispatch line | REJECT FOR THIS OWNER/CONTEXT | No annulment-specific line link. |
| T02-R17 `ORIGINAL` / Return confirmation | APPROVE RECOMMENDED SHAPE | `originalSlot=1`; `correctsConfirmationId=null`. |
| T02-R18 `CORRECTION` / Return confirmation | APPROVE RECOMMENDED SHAPE | Require coherent `correctsConfirmationId`; `originalSlot=null`. |
| T02-R19 `REVERSAL` / Return confirmation | REJECT FOR THIS OWNER/CONTEXT | No dedicated reversal link. |
| T02-R20 `ANNULMENT` / Return confirmation | REJECT FOR THIS OWNER/CONTEXT | No dedicated annulment link. |
| T02-R21 `ORIGINAL` / Consumption confirmation | APPROVE RECOMMENDED SHAPE | `originalSlot=1`; `correctsConfirmationId=null`. |
| T02-R22 `CORRECTION` / Consumption confirmation | APPROVE RECOMMENDED SHAPE | Require coherent `correctsConfirmationId`; `originalSlot=null`. |
| T02-R23 `REVERSAL` / Consumption confirmation | REJECT FOR THIS OWNER/CONTEXT | No dedicated reversal link. |
| T02-R24 `ANNULMENT` / Consumption confirmation | REJECT FOR THIS OWNER/CONTEXT | No dedicated annulment link. |
| T02-R25 `ORIGINAL` / disposition | APPROVE RECOMMENDED SHAPE | `accountingSign=+1`; `neutralizesDispositionId=null`; exact owner and kind shape from T11/T12. |
| T02-R26 `CORRECTION` / disposition | REJECT FOR THIS OWNER/CONTEXT | No correction-specific disposition link. |
| T02-R27 `REVERSAL` / disposition | APPROVE RECOMMENDED SHAPE | `accountingSign=-1`; require one compatible `neutralizesDispositionId`; exact inverse under shared algebra §2. |
| T02-R28 `ANNULMENT` / disposition | REJECT FOR THIS OWNER/CONTEXT | No annulment-specific disposition link. |

### 3.4 J1 crosswalk — T03 Command attempt outcome (6/6)

| Row | Final proposed disposition | Exact proposed shape |
| --- | --- | --- |
| T03-R01 `ACCEPTED` | APPROVE AS-IS | Require `commandAcceptanceId` and `auditEventId`. |
| T03-R02 `DENIED` | APPROVE AS-IS | Require `auditEventId`; `commandAcceptanceId=null`. |
| T03-R03 `VALIDATION_FAILED` | APPROVE RECOMMENDED SHAPE | Require `auditEventId`; `commandAcceptanceId=null`. |
| T03-R04 `CONFLICT` | APPROVE RECOMMENDED SHAPE | Require `auditEventId`; `commandAcceptanceId=null`. |
| T03-R05 `FAILED` | APPROVE RECOMMENDED SHAPE | Require `auditEventId`; `commandAcceptanceId=null`. |
| T03-R06 `UNKNOWN` | APPROVE RECOMMENDED SHAPE | Require `auditEventId`; `commandAcceptanceId=null`; the audit detail records why outcome is unknown. |

### 3.5 J1 crosswalk — T04 Operational effect target (3/3)

| Row | Final proposed disposition | Exact proposed shape |
| --- | --- | --- |
| T04-R01 `DOMAIN_ONLY` | APPROVE AS-IS | Both Stock evidence target links null. |
| T04-R02 `STOCK_EVIDENCE` | APPROVE AS-IS | Require only `stockEvidenceId`. |
| T04-R03 `STOCK_RESERVATION_EVIDENCE` | APPROVE AS-IS | Require only `stockReservationEvidenceId`. |

### 3.6 J1 crosswalk — T05 StockEvidenceKind position shape (12/12)

For every accepted line, positions, Article, company, quantity, Stock unit/scale, lot/serial/identified snapshots, and optional reservation are coherent. A “same-command” relation means equal company and `commandAcceptanceId`; it does not invent a new FK.

| Row | Final proposed disposition | Exact proposed shape |
| --- | --- | --- |
| T05-R01 `OPENING` | APPROVE RECOMMENDED SHAPE | Destination-only; require coherent activation boundary; `StockEvidence.acceptedAt >= cutoffAt`. |
| T05-R02 `RECEIPT` | APPROVE AS-IS | Destination-only. |
| T05-R03 `DISPATCH` | APPROVE RECOMMENDED SHAPE | Source-only. `reservationId` is optional; when present it names the same-company reservation at that source position and same identified unit, and same-command `APPLY_TO_DISPATCH` must cover the dispatched reserved quantity. |
| T05-R04 `RETURN` | APPROVE RECOMMENDED SHAPE | Destination-only. |
| T05-R05 `CONSUMPTION` | APPROVE AS-IS | Source-only. |
| T05-R06 `TRANSFER_DISPATCH` | REJECT FOR THIS OWNER/CONTEXT | Although both positions can be populated, no dedicated transfer-pair/link/state distinguishes and joins the dispatch half safely; do not reinterpret it as a standalone full movement. |
| T05-R07 `TRANSFER_RECEIPT` | REJECT FOR THIS OWNER/CONTEXT | Although both positions can be populated, no dedicated transfer-pair/link/state distinguishes and joins the receipt half safely; do not reinterpret it as a standalone full movement. |
| T05-R08 `COUNT_OBSERVATION` | APPROVE RECOMMENDED SHAPE | Require source position only; quantity is the observed quantity and has no movement sign. |
| T05-R09 `REVIEW_HOLD` | APPROVE RECOMMENDED SHAPE | Require source position only; positive quantity increases the evidence-derived hold aggregate at the exact company/Article/position/trace scope and cannot exceed physical unheld quantity. |
| T05-R10 `REVIEW_RELEASE` | APPROVE RECOMMENDED SHAPE | Require source position only; positive quantity decreases that exact hold aggregate without crossing zero. No unrelated hold scope may be released. |
| T05-R11 `CORRECTION` | APPROVE RECOMMENDED SHAPE | Require the depth-one `correctsEvidenceId` header shape in §2 and an exact line-number bijection with no extras. Keep Article, from/to positions, reservation, unit/scale, and owned scope; positive replacement quantity and captured facts may differ. Suppress base lines and fold only correction lines under the base kind/sign. |
| T05-R12 `REVERSAL` | APPROVE RECOMMENDED SHAPE | Require the depth-one `reversesEvidenceId` header shape in §2 and an exact line-number bijection with no extras. Quantity and owned scope equal the base; movement lines swap source/destination, while non-movement lines retain source scope. Reversal lines are validation-only; suppress base and reversal lines so the base contributes zero exactly once. |

### 3.7 J1 crosswalk — T06 Reservation event (5/5)

| Row | Final proposed disposition | Exact proposed shape |
| --- | --- | --- |
| T06-R01 `RESERVE` | APPROVE RECOMMENDED SHAPE | `q>0`; `replacesEvidenceId=null`; acquisition contribution `+q`; post-event scope total must not exceed the evidence-derived ceiling in §2. |
| T06-R02 `RELEASE` | APPROVE RECOMMENDED SHAPE | `q>0`; `replacesEvidenceId=null`; contribution `-q`; post-event reservation live balance and locked-scope total remain nonnegative. If live becomes zero, the reservation is terminal and accepts no later event. |
| T06-R03 `REPLACE` | APPROVE RECOMMENDED SHAPE | `q>0`; target one different same-reservation terminal acquisition leaf; one replacing child maximum and acyclic chain. Substitute the target contribution with `q`, producing acceptance delta `q-target.quantity`; every sequence prefix satisfies §2. |
| T06-R04 `CANCEL` | APPROVE RECOMMENDED SHAPE | `q>0`; `replacesEvidenceId=null`; `q` equals full immediately preceding live balance; contribution `-q`, resulting live zero; no later reservation event is accepted. |
| T06-R05 `APPLY_TO_DISPATCH` | APPROVE RECOMMENDED SHAPE | `q>0`; `replacesEvidenceId=null`; contribution `-q` and applied `+q`. Require the exact shared command acceptance, paired OperationalCommandEffect targets, common command result identity, and source-only reservation-naming DISPATCH evidence total defined in §2; otherwise reject. If live becomes zero, the reservation is terminal and accepts no later event. |

Projection labels follow the fold only: positive live with zero applied is `ACTIVE`; positive live with positive applied is `PARTIALLY_APPLIED`; zero after full `RELEASE` is `RELEASED`; zero after `CANCEL` is `CANCELLED`; zero after full `APPLY_TO_DISPATCH` is `EXHAUSTED`. Mixed terminal histories use the last event that makes live quantity zero. Labels never authorize acceptance.

### 3.8 J1 crosswalk — T07 Reservation source scope (2/2)

| Row | Final proposed disposition | Exact proposed shape |
| --- | --- | --- |
| T07-R01 `HEADER` | APPROVE AS-IS | Require `sourceEntityId`, `sourceLineId=null`, and `sourceScopeKey="H:" + sourceEntityId`. |
| T07-R02 `LINE` | APPROVE AS-IS | Require `sourceLineId` and `sourceScopeKey="L:" + sourceLineId`. |

### 3.9 J1 crosswalk — T08 Composition change kind (5/5)

A present side requires its preparation-line ID, Article ID, and positive quantity; position and trace capture may be null, but if present are coherent with that side. An absent side has all five side fields null. Unit and scale are common to both sides.

| Row | Final proposed disposition | Exact proposed shape |
| --- | --- | --- |
| T08-R01 `ADD` | APPROVE RECOMMENDED SHAPE | Prior side absent; result side present. |
| T08-R02 `REMOVE` | APPROVE RECOMMENDED SHAPE | Prior side present; result side absent. |
| T08-R03 `REPLACE` | APPROVE RECOMMENDED SHAPE | Both sides present; Article or position must differ; quantity and trace capture must be equal. Combined quantity/trace changes use separate rows. |
| T08-R04 `QUANTITY` | APPROVE RECOMMENDED SHAPE | Both sides present; preparation-line lineage, Article, position, and trace capture equal; quantity differs. |
| T08-R05 `TRACEABILITY` | APPROVE RECOMMENDED SHAPE | Both sides present; preparation-line lineage, Article, position, and quantity equal; trace capture differs. |

### 3.10 J1 crosswalk — T09 Difference origin (3/3)

| Row | Final proposed disposition | Exact proposed shape |
| --- | --- | --- |
| T09-R01 `CONTROL` | APPROVE AS-IS | Require only coherent `controlLineId`. |
| T09-R02 `DISPATCH` | APPROVE AS-IS | Require complete coherent dispatch origin tuple only. |
| T09-R03 `RETURN` | APPROVE AS-IS | Require complete coherent Return origin tuple only. |

### 3.11 J1 crosswalk — T10 Return line kind (7/7)

Same-command Stock evidence is correlated through existing command acceptance and source fields. A dispatch-linked final branch consumes the dispatch line's shared remainder through a `+1` Return-owned disposition of the same quantity. Its reversal follows T02-R27.

| Row | Final proposed disposition | Exact proposed shape |
| --- | --- | --- |
| T10-R01 `unchanged` | APPROVE RECOMMENDED SHAPE | Require `dispatchLineId`; no replacement pair; require `returned` disposition and destination-only `RETURN` evidence for the returned quantity/Article/trace. The disposition has `stockPositionId=null`; destination is verified only through its required `stockEvidenceLineId -> StockEvidenceLine.toPositionId`. |
| T10-R02 `consumed` | APPROVE RECOMMENDED SHAPE | Require `dispatchLineId`; no replacement pair; require `consumed` disposition and source-only `CONSUMPTION` evidence. |
| T10-R03 `missing` | APPROVE RECOMMENDED SHAPE | Require `dispatchLineId`; no replacement pair; require `missing` disposition. Its mandatory Stock evidence is source-only `COUNT_OBSERVATION` at the dispatch source scope; no movement is invented. |
| T10-R04 `damaged` | APPROVE RECOMMENDED SHAPE | Require `dispatchLineId`; no replacement pair; require `damaged` disposition. Its mandatory Stock evidence is source-only `COUNT_OBSERVATION` at the reviewed dispatch source scope; no movement or continuing hold is invented. |
| T10-R05 `added` | APPROVE RECOMMENDED SHAPE | `dispatchLineId=null`; no replacement pair or disposition; require coherent added Article/quantity facts and same-command destination-only `RECEIPT` evidence. It does not consume dispatch remainder. |
| T10-R06 `replacement` | APPROVE RECOMMENDED SHAPE | `dispatchLineId=null`; require exactly one `CajasReplacementPair`; the pair's `originalDispatchLineId` is the original branch and the Return line is the received branch. Received Article/position match the pair and use destination-only `RECEIPT` evidence. The original dispatch remainder is unchanged unless a separate supported disposition row is accepted. |
| T10-R07 `underReview` | APPROVE RECOMMENDED SHAPE | Require `dispatchLineId`; no replacement pair; require `underReview` disposition and source-only `REVIEW_HOLD` evidence for the same quantity/scope. It consumes hold remainder, not final remainder; reversal releases both. |

### 3.12 J1 crosswalk — T11 Disposition owner (2/2)

| Row | Final proposed disposition | Exact proposed shape |
| --- | --- | --- |
| T11-R01 `RETURN` | APPROVE RECOMMENDED SHAPE | Require coherent Return confirmation/line tuple and mandatory same-tenant `stockEvidenceLineId`; all Consumption IDs null. For `returned` with destination-only `RETURN` evidence, require `CajasDisposition.stockPositionId=null` because the optional position guard targets evidence `fromPositionId`; verify destination only through the required evidence line's non-null `toPositionId`. Other Return-owned source-position kinds follow T12. |
| T11-R02 `CONSUMPTION` | APPROVE AS-IS | Require coherent Consumption confirmation/line tuple and mandatory same-tenant Stock evidence-line owner; all Return IDs null. |

### 3.13 J1 crosswalk — T12 Disposition kind (5/5)

| Row | Final proposed disposition | Exact proposed shape |
| --- | --- | --- |
| T12-R01 `returned` | APPROVE RECOMMENDED SHAPE | `ORIGINAL=+1`; final aggregate; require destination-only `RETURN` evidence. `CajasDisposition.stockPositionId` must be null. Derive and verify the Return destination exclusively through required `stockEvidenceLineId -> StockEvidenceLine.toPositionId`; never populate the optional source-position guard. |
| T12-R02 `consumed` | APPROVE RECOMMENDED SHAPE | `ORIGINAL=+1`; final aggregate; compatible source-only `CONSUMPTION` evidence; position is the consumed source. |
| T12-R03 `missing` | APPROVE RECOMMENDED SHAPE | `ORIGINAL=+1`; final aggregate; compatible source-only `COUNT_OBSERVATION` evidence; no occupancy removal is inferred. |
| T12-R04 `damaged` | APPROVE RECOMMENDED SHAPE | `ORIGINAL=+1`; final aggregate; compatible source-only `COUNT_OBSERVATION` evidence at the reviewed dispatch source scope; no occupancy removal is inferred. |
| T12-R05 `underReview` | APPROVE RECOMMENDED SHAPE | `ORIGINAL=+1`; hold aggregate only; require compatible source-only `REVIEW_HOLD` evidence. Only a matching `REVERSAL=-1` with same-command `REVIEW_RELEASE` releases it; it is not terminal and does not by itself end assignment. |

### 3.14 Consumption-line confirmation

The final schema has **no `CajasConsumptionLineKind` enum and no Consumption line `kind` field**. Consumption meaning is derived only from required dispatch lineage, optional `recognizedReturnDispositionId`, and linked Consumption-owned dispositions. J1 authorizes no substitute discriminator.

## 4. P3 — Condition projection structural boundary

### 4.1 Proposed decision summary

Choose the conservative C14 structural-only boundary. C14 validates only facts expressible without projection/fold vocabulary: `openDifferenceCount >= 0`, `pendingDispatchScopeCount >= 0`, `version > 0`, the existing same-company/same-unit optional assignment FK, native enum/Boolean/JSON types, and basic scalar/nullability ranges. The projection is never acceptance authority.

**Rejected alternatives:** inventing a classification checkpoint; assigning precedence to `available`, `withDifferences`, or null; defining `eligibilityReasons` tokens; deriving dispatch/reuse eligibility; or enforcing projection lifecycle/fold semantics in C14.

**Exact consequences:** T13 closes by explicit deferral, with no open C14 branch. C14 adds no CX predicate that relates `condition`, eligibility flags, `eligibilityReasons`, assignment phase, operation end, or null lifecycle. C19/C31 must define those semantics before any such predicate or fold authority exists.

**Affected CX:** CX09 only for structural row-local checks. CX03/CX11/CX12 may not use condition or eligibility projection fields as acceptance authority.

**Count-family implications:** C14 has zero condition-lifecycle outcome arms, zero condition-precedence predicates, and zero projection-fold function/trigger identities. Existing structural checks remain counted only where their later canonical rendering places them; no T13 semantic branch count is created.

**Rollback/revision trigger:** revise P3 only through approved C19/C31 projection/fold semantics that name exact evidence checkpoints, reason vocabulary, precedence, lifecycle, and eligibility rules. That later approval does not retroactively change this C14 boundary.

**Exact P3 approval sentence:** `I approve proposed Package P3 in RECOMMENDED_PACKAGES.md for every row T13-R01 through T13-R03 with disposition DEFER TO C19/C31: C14 enforces only existing nonnegative counts, positive version, assignment-owner FK, native types, and basic scalar/nullability ranges; C14 enforces no condition, dispatch/reuse eligibility, eligibilityReasons, classification-checkpoint, precedence, null-lifecycle, or projection-fold semantic predicate, and this approval grants no SQL, schema, migration, implementation, or CX-vector authority.`

### 4.2 P3 crosswalk — T13 Condition state (3/3)

| Row | Final proposed disposition | Exact proposed shape |
| --- | --- | --- |
| T13-R01 `available` | DEFER TO C19/C31 | Structurally permitted enum value only. C14 defines no count, eligibility, reason, precedence, checkpoint, or lifecycle implication for it. |
| T13-R02 `withDifferences` | DEFER TO C19/C31 | Structurally permitted enum value only. C14 defines no count, eligibility, reason, precedence, checkpoint, or lifecycle implication for it. |
| T13-R03 `null` | DEFER TO C19/C31 | Structurally permitted nullable state only. C14 defines no meaning, eligibility, precedence, checkpoint, or lifecycle implication for null. |

## 5. Final proposed D3 15-cell matrix

All entries are **proposed** unless explicitly cited as already approved. `C` is not independently counted: it is `O` whose position context is `EXTERNAL_CUSTODY`. Therefore the five custody cells collapse to their occupancy counterpart or to one fact, with zero independent custody branches.

| # | Cell | Final proposed compatibility and active/terminal rule | Same-transaction behavior | Package dependency | Affected CX / count-family implication |
| ---: | --- | --- | --- | --- | --- |
| 1 | R–R | Approved base: positive evidence-derived live quantities conflict for the same unit/scope; zero-live history coexists. | Reduce old live quantity before acquiring replacement live quantity. | Approved #4759; J1 supplies final event algebra. | CX03/CX04/CX08; reservation pair outcomes count after rendering. |
| 2 | R–A | Approved #4760: coexist only through coherent `CajasReservationCorrelation` for the same assignment, reservation, reserved position, and identified box unit; otherwise conflict. | Release/end before an uncorrelated acquire; correlated transitions remain one locked scope. | Approved #4760. | CX03/CX04/CX08/CX11; one correlated accept arm plus reject arm. |
| 3 | R–C | Collapse to R–O at external context; no C claim. | Follow R–O movement ordering. | Approved #4758 plus row 5. | No independent C predicate/object/branch. |
| 4 | R–D | Active reservation quantity and a disposition against the same reserved unit/quantity conflict. Coexistence is allowed only after J1-proven same-command `APPLY_TO_DISPATCH` or `RELEASE` reduces the affected live reservation first; D reversal does not recreate reservation implicitly. | Apply/release R, then accept D and its Stock evidence; any new reserve occurs last. | J1. | CX03/CX04/CX08/CX12; correlation, ordering, and reject outcomes become countable. |
| 5 | R–O | Approved base coherence: active reservation position equals current occupancy position for an identified unit. | Release/replace old reservation, accept movement evidence and update O, then reserve at new position. | Approved #4759; J1 fixes movement shapes. | CX03/CX04/CX08; coherence and movement outcomes. |
| 6 | A–A | Approved base: one active slot; terminal history coexists. | Complete old end tuple before new active assignment. | Approved #4759. | CX03/CX04/CX11; lifecycle branch remains dedicated. |
| 7 | A–C | Collapse to A–O at `EXTERNAL_CUSTODY`; no C claim. | Assignment stays active under approved A–O movement rule. | Approved #4758/#4761. | No independent C predicate/object/branch. |
| 8 | A–D | Same-assignment dispositions coexist with active A. D never automatically ends A. Assignment may end only after accepted evidence leaves shared remainder and hold at zero and all required operation closure predicates hold; foreign-assignment D conflicts. | Accept final D/reversal first; close A only after zero remainder/hold. | J1. | CX03/CX04/CX11/CX12; owner, zero-balance, and reject outcomes. |
| 9 | A–O | Approved #4761: active A coexists with same-unit O in `DEPOSIT`, `TRANSIT`, or `EXTERNAL_CUSTODY`; accepted Stock evidence is mandatory for movement and A need not end. | Accept movement evidence and guarded pointer update in one scope. | Approved #4761; J1 supplies evidence shapes. | CX03/CX04/CX11; three allowed contexts plus movement outcomes. |
| 10 | C–C | Duplicate of one O at external context. | One occupancy pointer update only. | Approved #4758. | Zero independent C–C branches. |
| 11 | C–D | Collapse to D–O while O is at external context. | Follow D–O; no custody release row. | Approved #4758 plus row 14. | Zero independent C branch. |
| 12 | C–O | One fact: C is O at `EXTERNAL_CUSTODY`. | Occupancy movement alone changes custody. | Approved #4758. | Zero independent compatibility branch. |
| 13 | D–D | Compatible only while owner XOR, native reversal lineage, kind/evidence shapes, final/hold aggregates, and remainder in §2 remain valid. `underReview` is active hold, not terminal; reversed effects are terminal history. | Neutralize before replacement; each intermediate aggregate remains nonnegative. | J1. | CX03/CX04/CX12; owner/kind/sign/remainder accept and reject arms. |
| 14 | D–O | D has no implicit occupancy authority. For `returned`, require `CajasDisposition.stockPositionId=null`; verify destination only through required `stockEvidenceLineId -> StockEvidenceLine.toPositionId`, then update O through that destination movement evidence. Source-only final removal of an identified unit is rejected if it would require no current position; missing/damaged observations and review holds retain O. | Accept destination evidence and guarded O update together; otherwise retain O. | J1. | CX03/CX04/CX12; supported move, retain, and reject outcomes. |
| 15 | O–O | Approved base: one current occupancy row/pointer; simultaneous current positions conflict. | One guarded pointer update backed by accepted evidence. | Approved #4759/#4761. | CX03/CX04; no second-row acquire branch. |

**D3 proposed closure sentence after J1 and P3:** `I approve the final proposed 15-cell D3 matrix in RECOMMENDED_PACKAGES.md, rows 1 through 15, incorporating approved custody, base predicate, R–A, and A–O decisions and approved joint J1 rules for R–D, A–D, D–D, and D–O, including returned-disposition stockPositionId=null and destination verification only through stockEvidenceLineId to StockEvidenceLine.toPositionId; custody remains derived occupancy with no independent claim count, and this approval grants no SQL, schema, migration, implementation, or CX-vector authority.`

## 6. Approval order, mechanical completeness, and non-authority

Approval order is mandatory and non-transitive: **joint J1 → P3 → integrated D3**. J1 approval does not approve P3 or D3; P3 approval does not approve J1 or D3; integrated D3 is considered only after both package decisions.

| Check | Result |
| --- | --- |
| D3 unordered cells | 15/15, IDs 1–15 exactly once |
| D4 tables | 13/13, T01–T13 |
| D4 rows | 85/85: joint J1 82, P3 3 |
| Remaining D4 state | Every row has one of the four final proposed dispositions; rejection or deferral is explicit where C14 cannot safely express semantic enforcement |
| Consumption kind | Confirmed absent; no `CajasConsumptionLineKind` invented |
| Package authority | Joint J1 and P3 are separate decisions; integrated D3 is last; approval is non-transitive |

This document authorizes **no SQL, schema or migration change, database/Prisma/runner command, seed/backfill, manifest/template/fixture or vector update, implementation, Git mutation, remote action, deployment, staging, or production action**. Exact CX object identities and counts remain unfrozen until applicable packages and the D3 matrix are approved, canonical artifacts are rendered under separate authority, D1/D9 are applied, and independent review passes.
