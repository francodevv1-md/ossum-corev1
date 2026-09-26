# C14 CX01–CX13 Decision Packet

Status: **DRAFT / DECISIONS REQUIRED / NON-EXECUTABLE**

## Decision summary

This packet separates nine architecture decisions needed before exact CX manifests can be authored. Each decision is independently approvable and revisable; approving one does not approve any other decision, object manifest, vector, SQL, migration, database action, or execution.

| ID | Decision | Recommended disposition | Attention |
| --- | --- | --- | --- |
| D6 | CX09 no-fold disposition | Checks only; reserve the fold-trigger name for C19/C31 | Confirmation |
| D7 | Deferred minimum-line placements | Formula in CX10, control in CX11, remaining three in CX13 | Confirmation |
| D2 | Future-pointer ordering | Contiguous version chain with no gaps; timestamps are evidence only | Medium |
| D3 | Pending/incompatible-claim matrix | **No default recommended**; require a separately reviewed explicit matrix | **Highest** |
| D4 | Truth-table families | **No default recommended**; require exhaustive enum-by-shape tables | **Highest** |
| D5 | Aggregate source/concurrency boundary | Immutable evidence aggregates; projections are not acceptance authority | **Highest** |
| D8 | Exclusion/opening/policy ordering | **No default recommended** for the complete bundle; decide its three axes explicitly | **Highest** |
| D1 | Function-sharing policy | Dedicated functions per invariant family, after families close | Medium |
| D9 | Catalog occurrence definitions | Count rendered semantic occurrences using the definitions below | High |

## Bound evidence and current gate

| Source | Exact binding |
| --- | --- |
| C04 physical design | #4318 revision 1 plus governing #4319 revision 2, approved by closure #4321 revision 1 |
| C05 migration design | #4324 revision 3, approved by closure #4329 revision 1 |
| Final C13 schema | Manifest #4389; closure #4720; independent PASS #4721; commit `0faf2f55e178f1b111c5ae108380a505a68c8feb`; schema blob `47313a8a85ac71ac56df93ce212593820cb95a13` |
| C14 topology | `knowledge/specs/STOCK-CAJAS-C14-TOPOLOGY-AMENDMENT-001/CHANGE_PACK.md`; blob `b8608a922d2d9adf5d776673252f709c52d4a518` |
| Estimation binding set | Detached root `ba6c2633ae77d062b90ce405f0c4a92eb2f401954db421aaf54060b5300de3e0` |
| Preparation authority | #4750 |
| Exploration inventory | #4751 |

All **13/13 CX vectors remain unresolved**. For every CX row, `extension`, `check`, `function`, `trigger`, `exclusion`, `constraintTrigger`, `predicate`, `branch`, `dependency`, `event`, `lowerLines`, `pointLines`, and `upperLines` remain `null`; `unresolved=true` and `splitRequired=true`. A consequence stated below is a decision-local delta or formula, not a frozen vector.

## Dependency and review order

```text
D6 -> D7 -> D2 -> D3/D4 -> D5/D8
                         └-> exact invariant families and truth tables close
                             -> D1 sharing and exact function identities
                             -> D9 reproducible counts
                             -> 13 manifests -> independent review
```

D9 may be approved early as a counting contract, but no count can freeze until the applicable semantics and object identities close. D1 is deliberately late: function sharing cannot be applied until D3/D4 and every other affected decision establish the exact invariant families. Recommended human review sequence: **D6, D7, D2, D3, D4, D5, D8, D1, D9**.

## D6 — CX09 no-fold disposition

**Problem.** A trigger named `trg_stock_projection_fold_guard` would imply folding even though fold/rebuild is deferred to C19/C31.

**Approved constraints.** CX09 is structural only; it may not derive, mutate, repair, or rebuild projections.

| Alternative | Technical tradeoff | Count consequence |
| --- | --- | --- |
| A — Checks only; reserve name | Honest boundary and smaller CX09 | For the fold skeleton: exactly `0` functions, `0` triggers, `0` trigger events. |
| B — Parent-context skeleton trigger | Earlier parent validation, but misleading identity and future replacement risk | Adds exactly `1` function, `1` ordinary trigger, and `2` events (`INSERT`, `UPDATE`) to CX09; predicates/branches remain null. |

**Recommendation.** Alternative A.

**Affected CX IDs.** CX09; D5 projection alternative is also constrained.

**Approval sentence.** `I approve D6 Alternative A: CX09 installs row-local checks only, creates no projection fold function or trigger, and reserves trg_stock_projection_fold_guard for C19/C31.`

## D7 — Deferred minimum-line placements

**Problem.** Five header/line families require transaction-end minimum-one-line validation without duplicating ownership across CX children.

**Approved constraints.** Formula, control, dispatch, Return, and Consumption each require at least one line; validation is deferred to transaction end; CX attachments must not overlap.

| Alternative | Technical tradeoff | Count consequence |
| --- | --- | --- |
| A — Approved staged placement | Local formula/control ownership; final three remain reconciled in CX13 | Exactly 5 family functions + 10 constraint triggers total: CX10 `1+2`, CX11 `1+2`, CX13 `3+6`. Under D1 generic sharing, only function count changes. |
| B — Put all five in CX13 | One deferred-constraint bundle; weaker attachment locality | Same total `5+10`; shifts CX10 `-1 function/-2 constraint triggers`, CX11 likewise, and CX13 to `5+10`. |
| C — Immediate validation | Simpler failure timing, but rejects valid header-then-line transactions | Object total can remain `5+10`; deferrability changes, not object count. |

**Recommendation.** Alternative A with `DEFERRABLE INITIALLY DEFERRED` for all five families. Exact trigger event occurrences are counted only after D9 is approved and the header/line event matrix is rendered.

**Affected CX IDs.** CX10, CX11, CX12, CX13.

**Approval sentence.** `I approve D7 Alternative A: minimum-line guards are DEFERRABLE INITIALLY DEFERRED, with formula in CX10, control in CX11, and dispatch, Return, and Consumption in CX13.`

## D2 — Future-pointer ordering

**Problem.** “Future”, “later”, “highest”, and “prospective” require one deterministic ordering axis for configuration, formula, and policy pointers.

**Approved constraints.** Pointer targets belong to the same owner/company; history is append-only; pointers only advance; timestamps remain accepted evidence and cannot rewrite prior bindings.

| Alternative | Technical tradeoff | Count consequence |
| --- | --- | --- |
| A — Contiguous version chain | Require same-owner predecessor linkage and `new.versionNumber = previous.versionNumber + 1`; gaps are rejected | No object-count delta. Adds one contiguity predicate per pointer family relative to B. |
| B — Increasing chain with gaps | Require same-owner predecessor linkage and `new.versionNumber > previous.versionNumber`; gaps are permitted | No object-count delta. Uses one strict-increase predicate per pointer family without contiguity. |
| C — Timestamp ordering | Supports backdated numbering, but ties and accepted/effective-time disagreement require extra policy | No object-count delta. Requires tie and backdating branches; exact predicate/branch counts remain null. |

**Recommendation.** Alternative A: the version chain is contiguous, each new version is exactly previous plus one, and gaps are rejected; timestamps remain evidence, not ordering authority.

**Affected CX IDs.** CX03, CX10, CX13.

**Approval sentences — choose exactly one.**

- A: `I approve D2 Alternative A: identified-unit configuration, formula, and current-policy versions require same-owner predecessor linkage and new.versionNumber = previous.versionNumber + 1; gaps are rejected and timestamps do not determine order.`
- B: `I approve D2 Alternative B: identified-unit configuration, formula, and current-policy versions require same-owner predecessor linkage and new.versionNumber > previous.versionNumber; gaps are permitted and timestamps do not determine order.`
- C: `I approve D2 Alternative C: identified-unit configuration, formula, and current-policy pointer order is determined by the separately approved timestamp and tie/backdating rules, not by version-number continuity.`

## D3 — Pending/incompatible-claim matrix

**Problem.** CX03, CX04, and CX11 cannot define exact guards until reservation, assignment, custody, disposition, and occupancy conflicts have explicit active/pending/terminal predicates and same-transaction release behavior.

**Approved constraints.** Company and Article scope must agree; incompatible live claims cannot coexist; historical/terminal evidence is preserved; concurrency mechanics cannot be guessed here.

| Alternative | Technical tradeoff | Count consequence |
| --- | --- | --- |
| A — Conservative nonterminal conflict | Every nonterminal claim blocks every other claim for the same identified unit | Named guard objects remain unchanged; matrix has 25 directed cells before symmetry reduction. Predicate/branch/dependency counts remain null until terminal predicates are approved. |
| B — Explicit pairwise matrix | Each claim pair and status set is decided independently; precise but review-heavy | Named guard objects remain unchanged; exactly 15 unordered self/pair cells across five claim families must be classified. Counts depend on approved cell predicates. |
| C — Defer cross-family enforcement | Keep local owner checks now and defer global exclusivity | Removes no already approved invariant; affected CX definitions remain unresolved and cannot freeze. |

**Recommendation.** **No default recommended.** Existing authority requires incompatibility but does not define the business-valid status matrix or same-transaction release semantics. Use Alternative B only after a dedicated matrix receives product/data approval.

**Affected CX IDs.** CX03, CX04, CX08, CX11, CX12.

**Approval sentence.** `I do not approve a default for D3; prepare and independently review an explicit 15-cell unordered claim matrix with terminal predicates and same-transaction release behavior before CX03, CX04, CX08, CX11, or CX12 is frozen.`

## D4 — Truth-table families

**Problem.** Approved authorities name invariant families but do not close every enum branch for lot review, command outcomes, Stock evidence, Cajas changes, dispatch/Return/Consumption corrections, signs, and links.

**Approved constraints.** Every enum value must have one explicit allowed shape; correction/reversal preserves originals; no silent fallback, implicit “other”, or invented Stock effect is permitted.

| Alternative | Technical tradeoff | Count consequence |
| --- | --- | --- |
| A — One exhaustive table per enum family | Most reviewable and fail-closed; larger decision surface | Object counts cannot freeze until tables show whether existing checks suffice. Vector branch count becomes exactly the number of rendered mutually exclusive outcome arms under D9. |
| B — Normalize shared record-shape tables | Reduces repetition across domains; risks hiding domain exceptions | May reduce repeated predicates/functions, but no exact delta is supported before equivalence is approved. |
| C — Reject unspecified values at runtime only | Smaller DB surface; violates the requested exact CX database definition boundary | Affected CX checks/guards remain unresolved; vectors cannot freeze. |

**Recommendation.** **No default recommended** for branch content. Alternative A is the required documentation form, but the allowed outcomes require Franco’s product/data decisions.

**Affected CX IDs.** CX02, CX06, CX07, CX08, CX09, CX12.

**Approval sentence.** `I do not approve inferred D4 branches; prepare exhaustive, independently reviewed truth tables for every listed enum value and shape before the affected CX manifests are frozen.`

## D5 — Aggregate source and concurrency boundary

**Problem.** Reservation ceiling, dispatch ceiling, and the shared Return/Consumption remainder need one acceptance-time source of truth and a defined concurrency boundary.

**Approved constraints.** Immutable evidence is authoritative; projections are rebuildable acceleration; no fold/rebuild algorithm is authorized in C14; no negative, oversubscribed, or double-disposed accepted state is allowed.

| Alternative | Technical tradeoff | Count consequence |
| --- | --- | --- |
| A — Evidence aggregate under one locked scope | Correct without projection freshness; heavier reads and explicit lock ordering required later | Keeps the three named guards: reservation ceiling, dispatch ceiling, disposition remainder. Under dedicated D1: exactly 3 functions + 3 triggers for these guards; source choice adds no objects. |
| B — Locked mutable projection | Faster reads; correctness depends on an authorized fresh fold, which C14 lacks | Same nominal 3 + 3 guards, but also requires a projection-advance authority incompatible with D6/C19/C31 deferral; therefore counts cannot freeze. |
| C — Runtime precheck plus constraints | Simpler database logic; races remain without a database serialization point | Does not satisfy the approved no-oversubscription/no-double-disposition invariant. |

**Recommendation.** Alternative A. Lock primitive, order, isolation, and retry remain a later separately approved concurrency design.

**Affected CX IDs.** CX08, CX09, CX12.

**Approval sentence.** `I approve D5 Alternative A: reservation ceiling, dispatch ceiling, and shared Return/Consumption remainder validate authoritative immutable evidence aggregates within one locked business scope; projections are not acceptance authority.`

## D8 — Exclusion, opening, and policy ordering

**Problem.** CX13 still needs three independently answerable clauses: exclusion deferrability, the opening checkpoint timestamp, and current-policy highest/gap behavior. D8a, D8b, and D8c may be answered or revised separately without approving the other D8 clauses.

**Approved constraints.** Position windows cannot overlap; opening evidence is `OPENING`, same boundary/company/position, and not before cutoff; policy pointers are same-owner, accepted, prospective, and only advance.

### D8a — Exclusion deferrability

| Alternative | Technical tradeoff |
| --- | --- |
| A — `NOT DEFERRABLE` | Earliest failure; temporary overlap inside one transaction is impossible. |
| B — `DEFERRABLE INITIALLY IMMEDIATE` | Immediate by default, but an authorized transaction may defer it. |
| C — `DEFERRABLE INITIALLY DEFERRED` | Supports boundary reshaping; overlap failure moves to transaction end. |

**Recommendation.** **No default recommended.** Existing authority does not define whether temporary intra-transaction overlap is required.

**Approval clauses — choose exactly one.**

- A: `I approve D8a Alternative A: ex_sab_position_window is NOT DEFERRABLE.`
- B: `I approve D8a Alternative B: ex_sab_position_window is DEFERRABLE INITIALLY IMMEDIATE.`
- C: `I approve D8a Alternative C: ex_sab_position_window is DEFERRABLE INITIALLY DEFERRED.`

### D8b — Opening authoritative checkpoint timestamp

| Alternative | Technical tradeoff |
| --- | --- |
| A — `StockEvidence.acceptedAt` | Uses authoritative evidence acceptance time; strongest current structural support. |
| B — `StockOpeningPosition.acceptedAt` | Uses opening-row acceptance time; permits divergence from evidence acceptance unless separately constrained. |
| C — Another exact approved field | Supports a different business checkpoint, but requires that field and semantics to be named and approved before CX13. |

**Recommendation.** Alternative A; no new field or timestamp authority is invented.

**Approval clauses — choose exactly one.**

- A: `I approve D8b Alternative A: StockEvidence.acceptedAt is the authoritative opening checkpoint timestamp and must be greater than or equal to the boundary cutoff.`
- B: `I approve D8b Alternative B: StockOpeningPosition.acceptedAt is the authoritative opening checkpoint timestamp and must be greater than or equal to the boundary cutoff.`
- C: `I approve D8b Alternative C only through a later approval that names the exact authoritative checkpoint field and its cutoff semantics; CX13 remains unresolved until then.`

### D8c — Current-policy highest ordering and gaps

| Alternative | Technical tradeoff |
| --- | --- |
| A — Contiguous version chain | Same-owner predecessor and `new.versionNumber = previous.versionNumber + 1`; gaps rejected. |
| B — Increasing version chain with gaps | Same-owner predecessor and `new.versionNumber > previous.versionNumber`; gaps permitted. |
| C — Timestamp ordering | Requires a separately approved timestamp plus tie/backdating rules. |

**Recommendation.** Apply the D2 choice uniformly; D8c has no independent default if D2 remains open.

**Approval clauses — choose exactly one.**

- A: `I approve D8c Alternative A: the current-policy pointer selects the highest accepted contiguous same-owner version, new.versionNumber = previous.versionNumber + 1, and gaps are rejected.`
- B: `I approve D8c Alternative B: the current-policy pointer selects the highest accepted same-owner version, new.versionNumber > previous.versionNumber, and gaps are permitted.`
- C: `I approve D8c Alternative C: current-policy highest order is determined by the separately approved timestamp and tie/backdating rules, not by version-number continuity.`

**Count consequence.** Every D8a–D8c combination keeps exactly one exclusion plus the already named opening and policy guard pairs. Under dedicated D1 this is `1` exclusion, `2` function identities, and `2` ordinary-trigger attachments. D8a changes deferrability metadata; D8b/D8c change predicates and branches, whose vector values remain null.

**Affected CX IDs.** CX13; D2 governs the policy ordering axis.

## D1 — Function-sharing policy

**Problem.** Function identities belong to approved invariant families, while triggers are separate table/event attachments. Sharing changes `functionCount`, never the number of required trigger attachments.

**Counting contract for D1.** `functionCount` is the exact number of approved canonical function identities. `triggerCount` is the exact number of approved ordinary-trigger identities attached to owner tables; one function may serve multiple triggers. Let `U` be function-backed invariant families outside append-only/minimum-line mechanics, `A` the approved append-only invariant families, and `T` all approved ordinary-trigger attachments across `U` and `A`. The five minimum-line families have `10` separately counted constraint-trigger attachments under D7. `U`, `A`, and `T` remain unresolved until the invariant inventory and truth tables close.

| Alternative | Technical tradeoff | Exact consequence after `U`, `A`, `T` close |
| --- | --- | --- |
| A — Dedicated per invariant family | Clearest ownership and definition hashes; more functions | `functionCount = U + A + 5`; `triggerCount = T`. The five minimum-line families use five functions even though they have ten constraint-trigger attachments. |
| B — Generic per mechanic class | Fewer functions; append-only and minimum-line branching/coupling concentrate in two identities | `functionCount = U + 2`; `triggerCount = T`; delta from A is `-(A + 3)` functions and `0` triggers. |
| C — Generic append-only, dedicated minimum-line | Reduces append-only repetition while preserving deferred-family isolation | `functionCount = U + 6`; `triggerCount = T`; delta from A is `-(A - 1)` functions and `0` triggers. |

Any generic identity may cover only the exact approved manifest families; D1 does not choose its implementation mechanism.

**Recommendation.** Alternative A, after D3/D4 and the remaining semantic decisions close the exact family inventory.

**Affected CX IDs.** CX02, CX03, CX04, CX06, CX07, CX08, CX10, CX11, CX12, CX13.

**Approval sentence.** `I approve D1 Alternative A after the exact invariant families are closed: each invariant family has one dedicated canonical function identity; functionCount counts those identities, triggerCount separately counts trigger attachments, and no generic append-only or minimum-line function is approved.`

## D9 — Catalog occurrence definitions

**Problem.** Vectors are not reproducible until branch, dependency, event, and predicate occurrences have exact counting units.

**Approved constraints.** Counts derive from canonical rendered UTF-8/LF templates and fixtures; no prose estimate, optimizer-dependent count, or ad hoc child adjustment is allowed.

| Term | Recommended occurrence definition |
| --- | --- |
| Predicate | One rendered atomic Boolean test over catalog fields or values; repeated rendered tests count repeatedly. Parentheses and Boolean connectors do not count. |
| Branch | One rendered mutually exclusive outcome arm with a distinct accept/reject/action result; `ELSE` counts only when rendered with its own result. |
| Dependency | One directed rendered object reference from a manifest object to another catalog object; repeated references to the same target within one object count once. |
| Event | One trigger event keyword attached to one trigger identity; `INSERT OR UPDATE` counts as 2. Timing and row/statement scope are metadata, not events. |
| Object | One canonical catalog identity in its declared class. A function referenced by multiple triggers counts once as an object. |

Alternatives are: **A**, the definitions above; **B**, count source-code lexical occurrences, which is formatting-sensitive; or **C**, count conceptual invariants, which is not mechanically reproducible.

**Recommendation.** Alternative A. It makes object sharing visible: sharing reduces function objects but not trigger events or directed dependencies.

**Count consequence.** D9 creates no database object and changes no manifest scope. It converts the four affected vector dimensions from non-reproducible to mechanically countable after D1–D8 close; all values remain null until canonical templates, fixtures, and independent review exist.

**Affected CX IDs.** CX01–CX13.

**Approval sentence.** `I approve D9 Alternative A and its exact predicate, branch, dependency, event, and object occurrence definitions as the mandatory counting contract for every CX vector.`

## CX impact matrix

| CX | Decisions that affect its exact definition or vector |
| --- | --- |
| CX01 | D9 |
| CX02 | D1, D4, D9 |
| CX03 | D1, D2, D3, D9 |
| CX04 | D1, D3, D9 |
| CX05 | D9 |
| CX06 | D1, D4, D9 |
| CX07 | D1, D4, D9 |
| CX08 | D1, D3, D4, D5, D9 |
| CX09 | D4, D5, D6, D9 |
| CX10 | D1, D2, D7, D9 |
| CX11 | D1, D3, D7, D9 |
| CX12 | D1, D3, D4, D5, D7, D9 |
| CX13 | D1, D2, D7, D8, D9 |

## Non-authority and closure condition

This packet is decision support only. It authorizes **no SQL, schema edit, migration file or directory, Prisma command, database or catalog access, runner execution, external evidence root, CX vector update, catalog constant, staging, commit, remote action, deployment, or production action**.

After D1–D9 close, exact CX manifests and canonical templates/fixtures must be authored under separate authority, all 13 vectors must be derived rather than inferred, and the complete manifests must receive independent Migration/DB review plus Franco’s substantive approval. Until then, every vector remains null and execution remains blocked.
