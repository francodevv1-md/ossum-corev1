# C14 Trigger Error Identity Addendum

Status: **PROPOSED / HUMAN APPROVAL REQUIRED / NON-EXECUTABLE**

## 1. Decision first

**Recommendation:** select `TEI01-B`, `TEI02-A`, `TEI03-A`, and `TEI04-A` as one non-severable decision. Each C14 raised invariant keeps a function-specific stable `messageId`; trigger identity and owner context come from exact runtime trigger variables; invariant identity remains the literal function `ObjectId`; and each raise site carries a deterministic branch token. Identity is normalized as **ERROR × trigger × scalar operation**. The closed trigger/event matrix first emits exactly 113 trigger-operation outcomes; each ERROR then binds every and only outcome reachable through its calling trigger EVENT rows. `TG_OP` selects exactly one row.

This revision closes the independent blocker in the prior blob `fb1361372a579d5f0b0aada22c763148c6127727`: a scalar operation no longer hangs directly under ERROR × trigger when that trigger owns multiple EVENT rows. This addendum resolves Engram #4902. Continuous documentary authorization #4842 permits this proposal and review but does not approve its new semantics. It binds canonical proposal blob `b1045fd3f66defcbb0bac7a1cc0adcadf783b81a` with approved `P16-B/U01-A/U02-A`, SFO01-B blob `1e5a4df989b9831343a54cd3c62237e4c8916614`, Capacity V2 ERROR/BRANCH/ACTION/LOCATOR contracts, and ISW2 blob `09408f21b209cda10068d60fe5ee546b460a3f06`.

It authorizes no SQL authoring or execution, code, Prisma, schema, migration, database/catalog/network access, provider or permission change, proposal/root materialization, Git publication, deployment, staging, production, or estimation.

## 2. Alternatives

| Cell | Alternative | Trade-off | Recommendation/status |
|---|---|---|---|
| `TEI01` stable identity granularity | A: one generic message ID for all raised invariants; B: one ID per function plus exact ERROR × trigger × scalar-operation binding, runtime trigger context, literal function ObjectId, and branch token; C: one message ID and constraint identity per rule/branch | A cannot localize or observe a specific invariant. C couples clients to control-flow refactors. B keeps client identity stable while representing every trigger event without a set-valued operation. | **B / UNRESOLVED** |
| `TEI02` PostgreSQL diagnostics | A: exact closed MESSAGE/DETAIL/HINT/CONSTRAINT plus SCHEMA/TABLE for triggers; B: message text or partial fields | A is mechanically parseable and anti-substitution auditable. B is ambiguous. | **A / UNRESOLVED** |
| `TEI03` service mapping | A: strict structured mapping with closed native-constraint handling and fail-closed malformed/unknown behavior; B: classify by SQLSTATE/message text only | A separates raised `23514` from native `23514` without guessing. | **A / UNRESOLVED** |
| `TEI04` proposal serialization | A: revise ERROR, add closed trigger-operation outcomes and ERROR bindings, and retain BRANCH/ACTION/LOCATOR ownership; B: keep one scalar operation under ERROR × trigger | A removes the independently found multi-event ambiguity without adding a catch-all proposal row kind. | **A / UNRESOLVED** |

The four cells are non-severable. A recommendation is not approval.

## 3. Closed inventory and derivation

The selected parent inventory is exactly **169 DB objects**: 1 extension, 55 checks, 53 functions, 49 ordinary triggers, 10 constraint triggers, and 1 exclusion. The trigger-function graph is exactly **53 functions / 59 triggers / 59 `EXECUTES` edges**: 47 dedicated functions each called by one trigger, plus the six SFO01-B functions called by twelve triggers. The exact EVENT projection is **113 trigger-operation outcomes: INSERT 25, UPDATE 54, DELETE 34**. No generic future family is admitted.

### 3.1 Exact 53-function universe

Only these function ObjectIds may produce a TEI1 trigger-raised identity. A function enters the affected error set iff complete parsing of its exact approved `.sqlfrag` finds at least one source-backed `RAISE EXCEPTION USING ERRCODE = '23514'` classified in one of the four U01 families. A function with zero such sites emits zero raised-invariant ERROR bindings. Fixture constants are never authority.

| CX | Exact function ObjectIds |
|---|---|
| CX02 | `function:fn_stock_lot_append_only`; `function:fn_stock_lot_observation_append_only`; `function:fn_stock_lot_review_append_only`; `function:fn_stock_lot_review_coherence` |
| CX03 | `function:fn_stock_unit_config_append_only`; `function:fn_stock_unit_config_current_guard` |
| CX04 | `function:fn_stock_position_parent_guard`; `function:fn_stock_identified_unit_exclusivity`; `function:fn_stock_position_append_only` |
| CX06 | `function:fn_operational_acceptance_append_only`; `function:fn_operational_effect_append_only`; `function:fn_operational_semantic_intent_guard` |
| CX07 | `function:fn_stock_evidence_append_only`; `function:fn_stock_evidence_line_append_only`; `function:fn_stock_evidence_line_parent_guard`; `function:fn_stock_quantity_scale_guard` |
| CX08 | `function:fn_stock_reservation_append_only`; `function:fn_stock_reservation_evidence_append_only`; `function:fn_stock_reservation_position_guard`; `function:fn_stock_reservation_ceiling` |
| CX10 | `function:fn_cajas_formula_current_guard`; `function:fn_cajas_formula_version_append_only`; `function:fn_cajas_formula_line_append_only`; `function:fn_cajas_formula_version_min_line` |
| CX11 | `function:fn_cajas_assignment_unit_guard`; `function:fn_cajas_preparation_box_guard`; `function:fn_cajas_preparation_pointer_guard`; `function:fn_cajas_correlation_append_only`; `function:fn_cajas_control_append_only`; `function:fn_cajas_control_line_append_only`; `function:fn_cajas_control_min_line` |
| CX12 | `function:fn_cajas_composition_append_only`; `function:fn_cajas_composition_line_append_only`; `function:fn_cajas_difference_append_only`; `function:fn_cajas_difference_resolution_append_only`; `function:fn_cajas_dispatch_append_only`; `function:fn_cajas_dispatch_line_append_only`; `function:fn_cajas_return_append_only`; `function:fn_cajas_return_line_append_only`; `function:fn_cajas_replacement_append_only`; `function:fn_cajas_consumption_append_only`; `function:fn_cajas_consumption_line_append_only`; `function:fn_cajas_disposition_append_only`; `function:fn_cajas_dispatch_ceiling`; `function:fn_cajas_stock_link_guard`; `function:fn_cajas_disposition_fold_guard`; `function:fn_cajas_condition_assignment_guard` |
| CX13 | `function:fn_stock_opening_guard`; `function:fn_stock_opening_append_only`; `function:fn_stock_policy_current_guard`; `function:fn_cajas_dispatch_min_line`; `function:fn_cajas_return_min_line`; `function:fn_cajas_consumption_min_line` |

The four closed raised families remain exactly `APPEND_ONLY`, `ROW_OR_CROSS_ROW_GUARD`, `AGGREGATE_OR_SERIALIZATION_GUARD`, and `MINIMUM_LINE`.

### 3.2 Exact 59-trigger / 113-operation matrix

Each displayed trigger ObjectId has exactly the displayed scalar operations in `INSERT,UPDATE,DELETE` rank order. These groups are disjoint and their union is the selected 59-trigger inventory.

| Trigger family / count | Exact trigger ObjectIds | Operations per trigger | Outcome count |
|---|---|---|---:|
| Append-only / 29 | `trigger:trg_stock_lot_append_only`; `trigger:trg_stock_lot_observation_append_only`; `trigger:trg_stock_lot_review_append_only`; `trigger:trg_stock_unit_config_append_only`; `trigger:trg_stock_position_append_only`; `trigger:trg_operational_acceptance_append_only`; `trigger:trg_operational_effect_append_only`; `trigger:trg_stock_evidence_append_only`; `trigger:trg_stock_evidence_line_append_only`; `trigger:trg_stock_reservation_append_only`; `trigger:trg_stock_reservation_evidence_append_only`; `trigger:trg_cajas_formula_version_append_only`; `trigger:trg_cajas_formula_line_append_only`; `trigger:trg_cajas_correlation_append_only`; `trigger:trg_cajas_control_append_only`; `trigger:trg_cajas_control_line_append_only`; `trigger:trg_cajas_composition_append_only`; `trigger:trg_cajas_composition_line_append_only`; `trigger:trg_cajas_difference_append_only`; `trigger:trg_cajas_difference_resolution_append_only`; `trigger:trg_cajas_dispatch_append_only`; `trigger:trg_cajas_dispatch_line_append_only`; `trigger:trg_cajas_return_append_only`; `trigger:trg_cajas_return_line_append_only`; `trigger:trg_cajas_replacement_append_only`; `trigger:trg_cajas_consumption_append_only`; `trigger:trg_cajas_consumption_line_append_only`; `trigger:trg_cajas_disposition_append_only`; `trigger:trg_stock_opening_append_only` | `UPDATE`,`DELETE` | 58 |
| Ordinary guard / 20 | `trigger:trg_stock_lot_review_coherence`; `trigger:trg_stock_unit_config_current_guard`; `trigger:trg_stock_position_parent_guard`; `trigger:trg_stock_identified_unit_exclusivity`; `trigger:trg_operational_semantic_intent_guard`; `trigger:trg_stock_evidence_line_parent_guard`; `trigger:trg_stock_quantity_scale_guard`; `trigger:trg_stock_reservation_position_guard`; `trigger:trg_stock_reservation_ceiling`; `trigger:trg_cajas_formula_current_guard`; `trigger:trg_cajas_assignment_unit_guard`; `trigger:trg_cajas_preparation_box_guard`; `trigger:trg_cajas_preparation_pointer_guard`; `trigger:trg_cajas_dispatch_ceiling`; `trigger:trg_cajas_dispatch_line_stock_link_guard`; `trigger:trg_cajas_disposition_stock_link_guard`; `trigger:trg_cajas_disposition_fold_guard`; `trigger:trg_cajas_condition_assignment_guard`; `trigger:trg_stock_opening_guard`; `trigger:trg_stock_policy_current_guard` | `INSERT`,`UPDATE` | 40 |
| Minimum-line header / 5 | `constraintTrigger:ctrg_cajas_formula_version_min_line_on_version`; `constraintTrigger:ctrg_cajas_control_min_line_on_control`; `constraintTrigger:ctrg_cajas_dispatch_min_line_on_dispatch`; `constraintTrigger:ctrg_cajas_return_min_line_on_return`; `constraintTrigger:ctrg_cajas_consumption_min_line_on_consumption` | `INSERT` | 5 |
| Minimum-line line / 5 | `constraintTrigger:ctrg_cajas_formula_version_min_line_on_line`; `constraintTrigger:ctrg_cajas_control_min_line_on_line`; `constraintTrigger:ctrg_cajas_dispatch_min_line_on_line`; `constraintTrigger:ctrg_cajas_return_min_line_on_line`; `constraintTrigger:ctrg_cajas_consumption_min_line_on_line` | `UPDATE`,`DELETE` | 10 |

The arithmetic is exact: `29×2 + 20×2 + 5×1 + 5×2 = 113`; event projections are `INSERT=20+5=25`, `UPDATE=29+20+5=54`, and `DELETE=29+5=34`. Every matrix member resolves exactly one OBJECT, ATTACHMENT, EXECUTES DEPENDENCY, and one EVENT row for each listed operation. Missing, extra, duplicate, set-valued, or differently ordered operations fail.

### 3.3 Exact shared-function outcomes

| Function | Trigger-operation outcomes (`CONSTRAINT = TG_NAME`) | Count |
|---|---|---:|
| `function:fn_cajas_formula_version_min_line` | line UPDATE; line DELETE; version INSERT | 3 |
| `function:fn_cajas_control_min_line` | control INSERT; line UPDATE; line DELETE | 3 |
| `function:fn_cajas_dispatch_min_line` | dispatch INSERT; line UPDATE; line DELETE | 3 |
| `function:fn_cajas_return_min_line` | return INSERT; line UPDATE; line DELETE | 3 |
| `function:fn_cajas_consumption_min_line` | consumption INSERT; line UPDATE; line DELETE | 3 |
| `function:fn_cajas_stock_link_guard` | dispatch-line INSERT; dispatch-line UPDATE; disposition INSERT; disposition UPDATE | 4 |

The six shared functions therefore own exactly **19 of 113 trigger-operation outcomes** (`INSERT=7, UPDATE=7, DELETE=5`); the 47 dedicated functions own the other **94**. One source raise site still owns one ERROR, one RAISE ACTION, one containing BRANCH/outcome, and one locator. Those semantic rows are not duplicated. The ERROR instead references every exact trigger-operation outcome of its function, and the binding inventory emits one ERROR × outcome row. Set equality against SFO01-B `CallingTriggers(f)` and each trigger's EVENT rows is mandatory.

### 3.4 Native and non-trigger inventory

- The 55 exact CHECK objects retain native SQLSTATE `23514`, native server MESSAGE/DETAIL, and native `constraint_name`; no C14 RAISE fields are injected.
- `exclusion:ex_sab_position_window` retains native SQLSTATE `23P01` and native diagnostics.
- FK and unique errors remain PostgreSQL-native and outside the 169 added-object identity count.
- No non-trigger PostgreSQL function exists in the selected 53-function universe. A future callable function without `TG_*` is outside TEI1 and requires a new approved version; it must not fake trigger context.
- The exact CX01 `extension:btree_gist` wrapper has five already-closed non-trigger failure bindings. It uses SQLSTATE `23514`, invariant ID `extension:btree_gist`, literal constraint `c14_inv_extension_btree_gist`, scalar operation `CREATE_EXTENSION`, and the five exact branch tokens `CATALOG_OR_VERSION_MISMATCH`, `PRIVILEGE_OR_TRUST_FAILURE`, `OWNER_OR_NAMESPACE_MISMATCH`, `REQUIRES_OR_POSTCONDITION_MISMATCH`, and `OPCLASS_MEMBERSHIP_MISMATCH`. These five are outside the 113 trigger-operation outcomes. SCHEMA/TABLE/COLUMN diagnostics are omitted. Its message ID is `C14_INV_EXTENSION_BTREE_GIST`.

## 4. Stable identity grammar

### 4.1 Function message ID

For exact `function:<localName>`:

```text
messageId = "C14_INV_FN_" + ASCII_UPPER(localName)
```

`localName` must match `^[a-z][a-z0-9_]{0,62}$`; `messageId` therefore matches `^C14_INV_FN_[A-Z][A-Z0-9_]{0,62}$` and is **12..74 ASCII bytes**. `ASCII_UPPER` changes only `a..z`; Unicode folding is forbidden. The suffix must equal the FUNCTION `PHYSICAL_IDENTIFIER.localName`, and `function:<localName>` must equal the ERROR's literal `invariantId`. All 53 current names satisfy the grammar and produce 53 pairwise-distinct IDs.

The extension message ID is the sole non-function literal exception stated in §3.4. Native identities, when exposed to clients, derive as `C14_NATIVE_CHECK_` or `C14_NATIVE_EXCLUSION_` plus ASCII uppercase local name; they are a separate namespace and never satisfy the raised-invariant grammar.

### 4.2 Collision, rename, and version rules

The verifier proves a bijection across `(invariantId,messageId)`, case-conversion injectivity, namespace disjointness, and maximum length. A function rename creates a new ObjectId and messageId and requires new fragments, rows, root version, independent PASS, and Franco approval. An old message ID is never reassigned. A trigger rename changes runtime constraint identity and trigger ObjectId but leaves the function message ID stable; it still requires a new approved root. Body-only refactoring leaves the message ID stable. Adding, deleting, or reordering a raise site may change branch tokens and requires a new root, but clients continue to key localization and behavior on the function message ID.

### 4.3 Branch token

For a function, source-backed U01 raise sites are ordered by `(ERROR span startByte,endByte,ERROR rowId bytes)` after complete body bytes are frozen. Tokens are contiguous `R0001..R9999`. The literal token in SQL and ERROR must equal that order. Tokens are diagnostic, version-bound, and not client localization keys. The five extension tokens are the exact literals in §3.4.

## 5. Exact PostgreSQL diagnostic contract

Every trigger-raised U01-A site uses exactly:

```sql
RAISE EXCEPTION USING
  ERRCODE = '23514',
  MESSAGE = 'C14 invariant violation',
  DETAIL = 'c14e1;schema=' || TG_TABLE_SCHEMA ||
           ';table=' || TG_TABLE_NAME ||
           ';operation=' || TG_OP ||
           ';invariant=<literal function ObjectId>' ||
           ';function=<literal localName>' ||
           ';branch=<literal Rdddd>' ||
           ';family=<literal family>',
  HINT = 'messageId=<literal messageId>',
  CONSTRAINT = TG_NAME,
  SCHEMA = TG_TABLE_SCHEMA,
  TABLE = TG_TABLE_NAME;
```

`<...>` denotes author-time literal substitution, not angle-bracket output. The final DETAIL grammar is exactly:

```text
^c14e1;schema=([A-Za-z_][A-Za-z0-9_]{0,62});table=([A-Za-z_][A-Za-z0-9_]{0,62});operation=(INSERT|UPDATE|DELETE);invariant=(function:[a-z][a-z0-9_]{0,62});function=([a-z][a-z0-9_]{0,62});branch=(R[0-9]{4});family=(APPEND_ONLY|ROW_OR_CROSS_ROW_GUARD|AGGREGATE_OR_SERIALIZATION_GUARD|MINIMUM_LINE)$
```

All selected schemas, relations, triggers, and functions must satisfy the displayed ASCII identifier grammar before TEI1 authoring; current schema is exactly `public`. Because no value can contain `;`, `=`, whitespace, quote, reverse solidus, control, or non-ASCII bytes, concatenation is bijective and uses **no escaping**. No row value, actor/company/entity ID, SQL text, free text, secret, or caller-controlled value participates. If a future physical identifier falls outside this grammar, authoring fails; replacement escaping requires a new approved contract version.

`TG_OP`, `TG_NAME`, `TG_TABLE_SCHEMA`, and `TG_TABLE_NAME` are read directly from PostgreSQL trigger context. The renderer must not shadow them. `CONSTRAINT`, `SCHEMA`, and `TABLE` must byte-equal their DETAIL counterparts and the selected trigger attachment. `COLUMN` is always omitted because these invariants may be row- or cross-row-wide. MESSAGE is the fixed non-localized sentence; `messageId` exists only as exact HINT payload `^messageId=<messageId>$`. No other HINT content or omission is valid for a TEI1 raised invariant.

For the extension wrapper, DETAIL is exactly `c14e1;schema=public;table=NONE;operation=CREATE_EXTENSION;invariant=extension:btree_gist;function=NONE;branch=<exact §3.4 token>;family=ROW_OR_CROSS_ROW_GUARD`; HINT is exactly `messageId=C14_INV_EXTENSION_BTREE_GIST`; CONSTRAINT is exactly `c14_inv_extension_btree_gist`; SCHEMA/TABLE/COLUMN are omitted. Native constraints use only server-native fields and never emit `c14e1` or TEI1 HINT.

## 6. Proposal rows, hashes, and deterministic identity inventory

TEI1 adds no proposal row kind: the count remains **26 kinds / 27 closed variants**.

`ERROR` retains every Capacity V2 field and adds exactly:

```text
errorContractVersion:"C14-TRIGGER-ERROR-IDENTITY-V1"|null,
invariantId:ObjectId|null,
messageIdSource:"FUNCTION_OBJECT_ID"|"EXTENSION_OBJECT_ID"|"NATIVE_OBJECT_ID"|null,
constraintIdentitySource:"TG_NAME"|"LITERAL"|"NATIVE_SERVER"|null,
detailGrammarVersion:"C14E1"|null,
branchToken:NString|null,
runtimeTriggerOperationOutcomeIds:NString[]
```

For trigger-backed `RAISED_INVARIANT`, all fields are non-null and `runtimeTriggerOperationOutcomeIds` is the exact non-empty ordered projection of all EVENT rows of all calling triggers. Thus an append-only ERROR has two outcome IDs, an ordinary single-trigger guard has two, a minimum-line shared ERROR has three, and the shared Stock-link ERROR has four. Extension errors use `LITERAL` and an empty array. For `NATIVE_CONSTRAINT`, source is `NATIVE_OBJECT_ID/NATIVE_SERVER`, detail version and branch are null, and the array is empty. For `RETHROW`, all additions are null except the required empty array. An operation set, one arbitrary scalar operation per trigger, or trigger-only reference is schema-invalid.

BRANCH, ACTION, and LOCATOR key sets do not change. Their exact existing equations remain: the BRANCH points to the outcome and ERROR; the RAISE ACTION points to the same ERROR; ACTION- and ERROR-kind spans remain distinct even with equal bytes; one LOCATOR may cover those equal spans; and the ERROR is owner-contained by the same function BODY. Shared invocation creates no duplicate semantic row.

`TriggerOperationOutcomeRowV1Core` is exactly:

```text
{schemaVersion:"C14-TRIGGER-OPERATION-OUTCOME-ROW-V1",outcomeId:NString,
 cx:Cx,functionObjectRowId:ProposalRowId,functionObjectId:ObjectId,functionOrdinal:Ordinal4,
 triggerObjectRowId:ProposalRowId,triggerObjectId:ObjectId,triggerOrdinal:Ordinal4,
 dependencyRowId:ProposalRowId,attachmentRowId:ProposalRowId,eventRowId:ProposalRowId,
 triggerLocatorRowId:ProposalRowId,eventRank:1|2|3,
 operation:"INSERT"|"UPDATE"|"DELETE",constraintName:PgName,
 schemaName:PgName,tableName:PgName}
```

`functionOrdinal` and `triggerOrdinal` are the exact parent selected-P16-B OBJECT ordinals within the CX, not discovery order. `eventRank` is `INSERT=1, UPDATE=2, DELETE=3`. `outcomeId` is exactly `C14TEO-CXnn-Fffff-Ttttt-<OP>`, where `ffff` and `tttt` are four decimal ordinal values and `<OP>` is the full literal `INSERT|UPDATE|DELETE`; regex is `^C14TEO-CX(02|03|04|06|07|08|10|11|12|13)-F[0-9]{4}-T[0-9]{4}-(INSERT|UPDATE|DELETE)$`. Full row adds only `rowSha256=SHA256(ASCII("C14-TRIGGER-OPERATION-OUTCOME-ROW-V1")||NUL||CJ1(core))`.

The **113 full outcome rows** order by `(CX rank,functionOrdinal,triggerOrdinal,eventRank,outcomeId bytes)`. Their direct CJL1 concatenation is `TriggerOperationOutcomeInventoryBytes`; `triggerOperationOutcomeInventorySha256=SHA256(ASCII("C14-TRIGGER-OPERATION-OUTCOME-INVENTORY-V1")||NUL||bytes)`. IDs, `(triggerObjectRowId,eventRowId)`, and `(triggerObjectId,operation)` are each globally unique. Every FK resolves exactly one existing same-CX row of the named kind; DEPENDENCY must be `trigger -> function / EXECUTES`; ATTACHMENT/EVENT/LOCATOR must belong to that trigger; operation and rank must equal EVENT. There are exactly six FK/evidence references per outcome, hence **678 references**, with no new per-outcome EVIDENCE row.

`TriggerErrorBindingRowV1Core` is exactly:

```text
{schemaVersion:"C14-TRIGGER-ERROR-BINDING-ROW-V1",bindingId:NString,
 errorRowId:ProposalRowId,errorOrdinal:Ordinal4,actionRowId:ProposalRowId,
 branchRowId:ProposalRowId,locatorRowId:ProposalRowId,outcomeId:NString|null,
 invariantId:ObjectId,messageId:NString,
 failureFamily:"APPEND_ONLY"|"ROW_OR_CROSS_ROW_GUARD"|"AGGREGATE_OR_SERIALIZATION_GUARD"|"MINIMUM_LINE",
 branchToken:NString,operation:"INSERT"|"UPDATE"|"DELETE"|"CREATE_EXTENSION",
 detailUtf8:NString,hintUtf8:NString}
```

For trigger-backed errors, `bindingId` is `C14TEB-CXnn-Fffff-Ttttt-<OP>-Eeeee`, where `eeee` is the ERROR ordinal and regex is `^C14TEB-CX(02|03|04|06|07|08|10|11|12|13)-F[0-9]{4}-T[0-9]{4}-(INSERT|UPDATE|DELETE)-E[0-9]{4}$`; `outcomeId` is non-null and its function/trigger/operation segments must byte-equal the binding. Extension binding IDs are `C14TEB-CX01-EXTENSION-CREATE_EXTENSION-Eeeee`, operation `CREATE_EXTENSION`, and require `outcomeId=null`. Full row adds only `rowSha256=SHA256(ASCII("C14-TRIGGER-ERROR-BINDING-ROW-V1")||NUL||CJ1(core))`. Rows order by `(CX rank,functionOrdinal or CX01 extension object ordinal,triggerOrdinal or 0000,eventRank or 4,errorOrdinal,bindingId bytes)`. Direct CJL1 bytes hash as `triggerErrorBindingInventorySha256=SHA256(ASCII("C14-TRIGGER-ERROR-BINDING-INVENTORY-V1")||NUL||bytes)`.

ERROR cardinality remains exact parser output. Outcome cardinality is exactly 113 before body authoring. Binding cardinality is deterministic after complete ERROR extraction: each trigger-backed ERROR contributes the cardinality of its `runtimeTriggerOperationOutcomeIds`; each of the five extension errors contributes one. No fixture error count is authority. The closed derivation is:

```text
TriggerOperationOutcomes = exact 113-row expansion of §3.2 EVENT matrix
RaisedErrorSites = all parsed source-backed U01 RAISE sites in the exact 53-function universe
Outcomes(error) = TriggerOperationOutcomes filtered by exact calling trigger->function DEPENDENCY
Bindings(error) = one row per member of Outcomes(error), with one scalar operation
ExtensionBindings = the exact five §3.4 failures
TriggerErrorBindingInventory = ordered union(Bindings(error), ExtensionBindings)
```

For every runtime trigger failure, the mapper selects by exact `(TG_TABLE_SCHEMA,TG_TABLE_NAME,TG_NAME,TG_OP)` against the 113-row outcome inventory, requires cardinality exactly one, then requires exactly one binding for `(ERROR,outcomeId)`. Zero or multiple matches, operation fallback, “first event,” operation-set membership, or coercion is malformed `500`. Set equality, not aggregate arithmetic alone, is authoritative.

TEI1 revises the common proposal row schema/domain suffix to `-TEI1`; therefore every proposal row hash is recomputed under the revised closed schema. Changed RAISE bytes also recompute owning function fragment, SOURCE_SPAN, LOCATOR, BODY, ERROR, ACTION, BRANCH/outcome, seed-output, row-set, fragment-inventory, decision-inventory, profile, artifact-set, transition, and root hashes. The dependency DAG remains acyclic: approved parents/addendum evidence + exact trigger/event graph → 113 outcome rows/inventory; exact fragment bytes → spans/semantic ERROR graph; both branches → ERROR bindings → profile/root → independent PASS → Franco approval.

## 7. Service, client, and audit mapping

The adapter may inspect only an independently frozen own-data-property allowlist proving origin from PostgreSQL `code`, `message`, `detail`, `hint`, `constraint`, `schema`, `table`, and `column`. Prototype getters, stack, regex over arbitrary message text, JSON search, and guessed cause traversal are forbidden.

A valid structured trigger error requires simultaneous equality of SQLSTATE `23514`, fixed MESSAGE, exact DETAIL parse, exact HINT, absent COLUMN, diagnostic SCHEMA/TABLE/CONSTRAINT, exactly one of the 113 operation outcomes selected by runtime `TG_OP`, exactly one ERROR binding, trigger→function edge, trigger attachment/event, invariant/local-name/message mapping, branch/family, and scalar operation. A valid extension error requires its exact literal binding. Any disagreement is spoofing/substitution and maps as malformed.

`triggerOperationOutcomeId` is a server-derived projection, never trusted input. Its only currently valid non-null producer is a valid TEI1 trigger invariant satisfying the preceding full equality. A future trigger category may produce it only when this contract explicitly enumerates that category and its closed outcome inventory; no such additional category exists in TEI1. Caller, adapter, cause/meta, prior envelope, audit replay, or diagnostic payload values named `triggerOperationOutcomeId` are untrusted. If present, they must byte-equal the uniquely derived outcome ID; absence is permitted because the server derives it, but mismatch, multiple candidates, or an ID on a null-required category is spoofing and maps to the generic failure projection below. The untrusted value is discarded before constructing service/audit output and cannot survive remapping.

The closed service envelope is:

```text
C14IntegrityErrorV1={schemaVersion:"C14-INTEGRITY-ERROR-V1",
 code:"C14_INVARIANT_VIOLATION"|"C14_NATIVE_CHECK_VIOLATION"|"C14_NATIVE_EXCLUSION_CONFLICT"|"C14_DATABASE_FAILURE",
 httpStatus:409|422|500,correlationId:UuidV7,bundleId:BundleId|null,contractIds:ContractId[],
 sqlstate:"23514"|"23P01"|null,messageId:NString|null,invariantId:ObjectId|null,
 constraintName:PgName|null,schemaName:PgName|null,tableName:PgName|null,triggerOperationOutcomeId:NString|null,
 operation:"INSERT"|"UPDATE"|"DELETE"|"CREATE_EXTENSION"|null,branchToken:NString|null,
 retryable:false,attemptCount:1}
```

Mapping is exact:

| Source | Envelope |
|---|---|
| Valid TEI1 trigger invariant | `C14_INVARIANT_VIOLATION`, HTTP 409; `triggerOperationOutcomeId` equals the exact uniquely selected 113-inventory ID; other structured fields equal its ERROR binding |
| Valid extension invariant | `C14_INVARIANT_VIOLATION`, HTTP 409; extension structured fields populated; `triggerOperationOutcomeId=null` |
| Exact known CHECK object, native `23514`, no TEI1 signature | `C14_NATIVE_CHECK_VIOLATION`, HTTP 422; derived native messageId/object identity and native constraint populated; `triggerOperationOutcomeId=null` |
| Exact known exclusion object, native `23P01` | `C14_NATIVE_EXCLUSION_CONFLICT`, HTTP 409; `triggerOperationOutcomeId=null` |
| Generic `C14_DATABASE_FAILURE`, malformed/partial TEI1 signature, unknown constraint, conflicting outcome-ID candidate, unknown trigger/function/branch, unavailable diagnostic path, or any other non-trigger failure | HTTP 500; `sqlstate/messageId/invariantId/constraint/schema/table/triggerOperationOutcomeId/operation/branch=null` |

The null projection is exhaustive: extension, native CHECK, native exclusion, generic database failure, malformed/unknown input, and every non-trigger failure have `triggerOperationOutcomeId=null` unless a later approved contract explicitly enumerates another valid trigger category. All mappings are non-retryable and bypass the ISW2 `55P03/40P01/40001` retry set. No raw PostgreSQL message/detail/hint, row value, SQL, credential, or stack is returned. Clients localize only by `messageId`; unknown IDs use a generic safe UI string. Clients may display neither branch token nor trigger-operation outcome ID as user copy.

ISW2 audit becomes `C14-INSERT-AUDIT-EVENT-V3`: it adds event kind `INTEGRITY_REJECTED`, admits `23514|23P01` in `sqlstate`, and adds nullable `messageId`, `invariantId`, `constraintName`, `operation`, and `triggerOperationOutcomeId`. Audit projects `triggerOperationOutcomeId` byte-equal to the service envelope: exact selected ID only for a valid TEI1 trigger invariant, otherwise null for extension, native CHECK, exclusion, generic database failure, malformed/unknown, and non-trigger failures. A conflicting incoming ID is never copied to either projection. The correlation ID is created before authorization and is byte-equal in audit and envelope. The rejection event is appended only after rollback is confirmed; no retry event follows. Raw diagnostics are excluded.

## 8. Validation and anti-substitution

Required tests/audits are:

1. enumerate exactly 53 functions, 59 triggers, 59 EXECUTES edges, 47 dedicated pairs, the SFO01-B 6/12 graph, and exactly 113 outcomes split `25/54/34`;
2. parse every complete function body and prove exact RAISE-site ↔ ERROR ↔ ACTION ↔ outcome/BRANCH ↔ spans/LOCATOR bijections;
3. prove all message IDs match grammar/length, map bijectively to ObjectIds/local names, and collide with neither extension nor native namespaces;
4. execute every one of the 113 trigger-operation outcomes and prove `TG_OP` selects exactly one scalar row; execute five extension paths, one native CHECK, and the native exclusion path;
5. mutate each diagnostic/FK field independently, delete/duplicate an operation row, replace scalar operation with a set, swap trigger/event/function/owner/branch/family, inject delimiter/non-ASCII identifiers, and prove fail-closed `500` mapping;
6. prove no business-row/caller value reaches diagnostics and COLUMN is absent;
7. prove rename/version rules, old-ID non-reuse, exact inventory ordering/hashes, and row/profile/root DAG acyclicity;
8. prove `23514/23P01` never retry, rollback precedes audit, and envelope/audit correlation and outcome-ID equality;
9. prove fixture `C14_INVARIANT_VIOLATION` is rejected as authority and no fixture constant enters production rows;
10. verify exactly **242 closed documentary test rows**: two per 113 trigger outcomes (`01` exact non-null projection, `02` zero/duplicate/mismatch/spoof rejection) = 226; two per five extension bindings, each proving null outcome ID = 10; and six global tests for counts/hashes, 53-message collision/length, exhaustive native/generic/non-trigger null projection, ERROR/BRANCH/ACTION/LOCATOR closure, service/audit byte equality and conflicting-ID erasure, and version/non-reuse. IDs are `TEST-<outcomeId>-01|02`, `TEST-<extensionBindingId>-01|02`, and `TEST-C14TEI-GLOBAL-01..06`. Later source-site conformance adds exactly one generated test per ERROR binding and is countable only after authoritative fragment parsing.

Worked outcomes:

- **Dedicated multi-event:** `fn_stock_lot_append_only` derives `C14_INV_FN_FN_STOCK_LOT_APPEND_ONLY`; its trigger has separate UPDATE and DELETE outcome IDs. Runtime UPDATE cannot select DELETE and no trigger-only fallback exists. This is a grammar example until its real ERROR site is approved.
- **Shared multi-trigger/multi-event:** one `fn_cajas_stock_link_guard` ERROR references four outcomes: dispatch-line INSERT/UPDATE and disposition INSERT/UPDATE. The semantic ERROR/ACTION/BRANCH/LOCATOR stays singular; runtime trigger plus `TG_OP` selects one binding.
- **Deferred line:** `fn_cajas_dispatch_min_line` has dispatch INSERT plus line UPDATE and line DELETE outcomes; commit-time DELETE resolves only the line/DELETE row.
- **Service/audit trigger projection:** a valid dispatch-line UPDATE rejection returns and audits the exact dispatch-line/UPDATE outcome ID. An injected disposition/UPDATE ID conflicts, is discarded, and yields generic `500` with null outcome ID in both projections.
- **Non-trigger:** the exact extension `OPCLASS_MEMBERSHIP_MISMATCH` path uses its literal §3.4 identity, omits SCHEMA/TABLE diagnostic fields, and returns/audits `triggerOperationOutcomeId=null`.
- **Native/generic:** `check:ck_slo_correction_shape`, the native exclusion, and malformed/unknown failures always return/audit null outcome ID; absence of `c14e1` and TEI1 HINT prevents trigger classification.

## 9. Counts, profiles, roots, and authority impact

- DB object identities/counts remain exactly **169**; class counts remain `1/55/53/49/10/1`; no helper function, trigger, check, or migration is added.
- Fragment paths/counts remain **169 materialized** and **168 concrete + one deferred CX01** staged. Every affected function fragment changes bytes but not identity/path; exact affected-fragment count is the closed set projection of `RaisedErrorSites`, not a fixture number.
- Row kinds/variants remain **26/27**. TEI standalone rows add exactly **113 trigger-operation outcomes** plus parser-derived ERROR bindings. Existing semantic cardinalities remain parser-derived. Proposal decision rows increase by exactly **4 PROPOSED_DECISION + 9 DECISION_ALTERNATIVE**; outcome rows add zero EVIDENCE rows and exactly 678 existing-row evidence/FK references. Approval/evidence rows follow existing EAV1 machinery and are not guessed.
- Profile adds exactly seven fields: `triggerErrorIdentityAddendumBlob`, `triggerErrorIdentityApprovalObservation`, `triggerErrorIdentityDecisionIds:["TEI01","TEI02","TEI03","TEI04"]`, `triggerOperationOutcomeSchemaVersion:"C14-TRIGGER-OPERATION-OUTCOME-V1"`, `triggerOperationOutcomeInventorySha256`, `triggerErrorBindingSchemaVersion:"C14-TRIGGER-ERROR-BINDING-V1"`, and `triggerErrorBindingInventorySha256`. ISW2 base/staged/materialized profile counts become **42/46/52** from 35/39/45.
- Root core adds those seven fields plus `triggerOperationOutcomes:TriggerOperationOutcomeRowV1[113]` and `triggerErrorBindings:TriggerErrorBindingRowV1[]`. ISW2 root core/total counts become base **71/72**, staged **83/84**, and materialized **86/87** from 62/63, 74/75, and 77/78.
- Schema/profile/root/serialization/artifact/transition/catalog identities gain suffix `-TEI1`; the existing 20 downstream ISW2 cascade domains remain a 20-member changed set under that suffix. The two proposal row schema domains and audit V3 are additionally revised. Six new standalone domains are `C14-TRIGGER-OPERATION-OUTCOME-ROW-V1`, `C14-TRIGGER-OPERATION-OUTCOME-INVENTORY-V1`, `C14-TRIGGER-ERROR-BINDING-ROW-V1`, `C14-TRIGGER-ERROR-BINDING-INVENTORY-V1`, `C14-TRIGGER-ERROR-IDENTITY-DECISION-INVENTORY-V1`, and `C14-TRIGGER-ERROR-IDENTITY-APPROVAL-ENVELOPE-V1`.
- This focused projection clarification changes this addendum's blob and therefore future evidence/profile/root hash values, but it changes no field set, domain identity, row/test/evidence count, hash preimage rule, profile count, root count, or DAG edge stated above.
- The external approval envelope records exact addendum blob, independent PASS observation, Franco approval observation, all four selections, both inventory hashes, exact outcome count/breakdown `113/25/54/34`, and `executionAuthority:false`. Before both external observations exist, no `-TEI1` profile or root may be instantiated.

## 10. Approval boundary

| Cell | Exact recommended selection |
|---|---|
| `TEI01` | B — function-specific stable message ID plus exact ERROR × trigger × scalar-operation binding, runtime owner/operation, literal function ObjectId, branch token |
| `TEI02` | A — exact `23514` structured diagnostic fields and native/non-trigger separation |
| `TEI03` | A — strict ErrorEnvelope/audit mapping, non-retry, malformed fail-closed |
| `TEI04` | A — revised ERROR, 113-row operation outcome, binding inventory, hash/profile/root contract |

**Exact approval question after independent PASS:** Does Franco approve this exact addendum blob and select `TEI01-B`, `TEI02-A`, `TEI03-A`, and `TEI04-A` as one non-severable decision, binding the exact 53-function/59-trigger universe, exact 113 trigger-operation outcomes (`INSERT=25`, `UPDATE=54`, `DELETE=34`), ERROR × trigger × scalar-operation bindings, six shared-function 19-outcome projection, message/DETAIL/HINT/CONSTRAINT grammar, native and non-trigger handling, strict service/audit mapping, both deterministic inventories, unchanged 169 DB objects, and the exact `-TEI1` profile/root/hash/DAG impact, solely to authorize later non-executable proposal reserialization and independent review?

Until that exact approval, Engram #4902 remains an implementation/authoring blocker and no recommendation, generated hash, fixture, or this document grants execution authority.
