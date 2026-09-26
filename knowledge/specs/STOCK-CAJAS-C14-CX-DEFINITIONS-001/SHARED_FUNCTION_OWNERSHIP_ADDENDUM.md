# C14 CX Shared Function Ownership Addendum

Status: **PROPOSED / HUMAN APPROVAL REQUIRED / NON-EXECUTABLE**

## 1. Authority, scope, and non-authority

This addendum resolves only the architecture gap in Engram #4844. Continuous documentary authorization #4842 permits preparation and review, but does not approve this new choice. The immutable inputs are:

| Input | Exact identity | Approval/evidence |
|---|---|---|
| Canonical P01-P19 proposal | Git blob `b1045fd3f66defcbb0bac7a1cc0adcadf783b81a` | #4801 PASS; #4802 approval with P16-B/U01-A/U02-A |
| Proposal serialization A01-A06 | Git blob `bdc0fd13f3126567ade7e13c8f65f6e376a9940f` | #4815 PASS; #4816 approval |
| Proposal capacity C01-C06 | Git blob `1304c0911e858a4995f0621a5c478650f4fe4ccd` | #4830 PASS; #4831 approval |
| Binding A-D | Git blob `a860049af04a6ff07fbe9fae6ddb512a8ef0adc8` | #4777 PASS |
| `btree_gist` catalog binding CB01-C/CB02-B/CB03-A/CB04-A/CB05-A/CB06-A/CB07-B | Git blob `d8fa5b6d14b563f44008ba52234421a09182990a` | #4840 PASS; #4841 approval |
| C14 topology | Git blob `b8608a922d2d9adf5d776673252f709c52d4a518` | bound parent |
| C13 schema | commit `0faf2f55e178f1b111c5ae108380a505a68c8feb`; schema blob `47313a8a85ac71ac56df93ce212593820cb95a13` | structure and physical-name locator authority only |

This document authorizes no SQL or proposal artifact generation, transformation, database/catalog/network access, provider choice, Q01-Q06 authoring or execution, Prisma or schema edit, migration, runner, seed, authority manifest/root/tuple, execution binding, Git publication, deployment, staging, production, or destructive action. Approval of this document would authorize only later documentary proposal authoring against its exact approved blob.

## 2. Terminology: what `OWNER` means

PostgreSQL functions are schema-scoped objects. They are not physically contained by a table. PostgreSQL role ownership (`pg_proc.proowner`) is a separate catalog/security concept and is outside this proposal.

Within Capacity V2, `OWNER` means the **semantic relation-use anchor** used to prove company scope, trigger attachment, provenance, seed allocation, and anti-misownership. It does not mean physical containment and does not make a relation the SQL-schema owner of a function. For checks, exclusions, ordinary triggers, and constraint triggers, the semantic anchor is also their single physical attachment relation. For a function, the anchor must equal the closed relation set reached through exact trigger-to-function `EXECUTES` dependencies. `ATTACHMENT` continues to locate an object in a C14 child/snapshot and to encode trigger events; it does not assert function containment. A trigger remains singly relation-owned.

Header-first, first-trigger, declaration-order, lexical-first-as-primary, or renderer-discovery inference is invalid. Ordering a set is serialization, not primacy.

## 3. Exact six-function inventory and usage graph

The following is the complete allowlist. Relation arrays are in canonical unsigned UTF-8 order of the exact `PHYSICAL_IDENTIFIER.renderedIdentity`; no member is primary. Every trigger is a separately counted DB object and remains owned by exactly its displayed relation.

| CX | Function ObjectId | Closed ordered relation-use set | Exact trigger ObjectIds and trigger relation |
|---|---|---|---|
| CX10 | `function:fn_cajas_formula_version_min_line` | [`"public"."cajas_formula_line"`, `"public"."cajas_formula_version"`] | `constraintTrigger:ctrg_cajas_formula_version_min_line_on_line` @ `"public"."cajas_formula_line"`; `constraintTrigger:ctrg_cajas_formula_version_min_line_on_version` @ `"public"."cajas_formula_version"` |
| CX11 | `function:fn_cajas_control_min_line` | [`"public"."cajas_control"`, `"public"."cajas_control_line"`] | `constraintTrigger:ctrg_cajas_control_min_line_on_control` @ `"public"."cajas_control"`; `constraintTrigger:ctrg_cajas_control_min_line_on_line` @ `"public"."cajas_control_line"` |
| CX13 | `function:fn_cajas_dispatch_min_line` | [`"public"."cajas_dispatch"`, `"public"."cajas_dispatch_line"`] | `constraintTrigger:ctrg_cajas_dispatch_min_line_on_dispatch` @ `"public"."cajas_dispatch"`; `constraintTrigger:ctrg_cajas_dispatch_min_line_on_line` @ `"public"."cajas_dispatch_line"` |
| CX13 | `function:fn_cajas_return_min_line` | [`"public"."cajas_return_confirmation"`, `"public"."cajas_return_line"`] | `constraintTrigger:ctrg_cajas_return_min_line_on_return` @ `"public"."cajas_return_confirmation"`; `constraintTrigger:ctrg_cajas_return_min_line_on_line` @ `"public"."cajas_return_line"` |
| CX13 | `function:fn_cajas_consumption_min_line` | [`"public"."cajas_consumption_confirmation"`, `"public"."cajas_consumption_line"`] | `constraintTrigger:ctrg_cajas_consumption_min_line_on_consumption` @ `"public"."cajas_consumption_confirmation"`; `constraintTrigger:ctrg_cajas_consumption_min_line_on_line` @ `"public"."cajas_consumption_line"` |
| CX12 | `function:fn_cajas_stock_link_guard` | [`"public"."cajas_dispatch_line"`, `"public"."cajas_disposition"`] | `trigger:trg_cajas_dispatch_line_stock_link_guard` @ `"public"."cajas_dispatch_line"`; `trigger:trg_cajas_disposition_stock_link_guard` @ `"public"."cajas_disposition"` |

The graph has exactly six shared function nodes, twelve trigger nodes, twelve `EXECUTES` dependency edges, and twelve trigger-to-relation attachment edges. For minimum-line triggers, events remain the approved P16-B/D matrix: header `AFTER INSERT`; line `AFTER UPDATE OR DELETE`; all are `FOR EACH ROW`, `DEFERRABLE INITIALLY DEFERRED`. The two Stock-link triggers remain the approved U02-A ordinary-guard attachments. No generic family expansion is permitted.

Exact authority locators are: canonical proposal §§5, 7, and 8 at blob `b1045fd3f66defcbb0bac7a1cc0adcadf783b81a`; Binding D at blob `a860049af04a6ff07fbe9fae6ddb512a8ef0adc8`; and each exact model/`@@map` declaration in schema blob `47313a8a85ac71ac56df93ce212593820cb95a13`. A later row graph must also bind each function and trigger declaration span, each trigger relation `PHYSICAL_IDENTIFIER`, each trigger `ATTACHMENT`, and each trigger-to-function `DEPENDENCY` through exact proposal-fragment locators. This addendum supplies no SQL bytes or invented byte offsets.

## 4. SFO01 alternatives

There is one architecture decision cell. Its mechanics are non-severable because OWNER shape, inventory projection, seeds, roots, and transition hashes must agree.

### SFO01-A — explicit primary relation owner

Each function keeps one existing `RELATION` OWNER. Franco would have to select one exact primary relation for each matrix row; the second relation appears only through its trigger OWNER/ATTACHMENT and trigger-to-function dependency.

- **Schema/stable IDs:** no OWNER schema change; six function `ownerRowId` values point to selected singleton relation rows. Six separately selectable primary choices would be required and hash-bound.
- **Counts:** DB objects/fragments remain 169; OWNER row count has no set-owner delta; ATTACHMENT/OBJECT/DEPENDENCY/EVENT DB-object counts do not change.
- **Seed/inventory/transition:** function OBJECT/FUNCTION_BODY seeds use the chosen singleton `expectedOwnerRowId`; neutral inventory serializes one chosen identity; both staged and materialized roots must carry the same six choices.
- **Review/SQL/evolution:** compact, but semantically false for the secondary trigger relation. Renaming, removing, or moving the arbitrarily primary trigger causes ownership churn even if the function still serves the other relation. Reviewers may mistake serialization primacy for PostgreSQL containment or business responsibility.

This alternative rejects inference: each of six primaries must be explicitly approved. It is not recommended.

### SFO01-B — closed ordered multi-relation function owner

Each object still references exactly one OWNER row. Only the six allowlisted functions use a two-member `FUNCTION_RELATION_SET` OWNER; every other object uses DATABASE or singleton RELATION. Trigger objects remain singly relation-owned. Trigger-to-function dependencies prove the set.

- **Schema/stable IDs:** OWNER becomes a closed common shape with an ordered array and explicit nullable primary. Six new semantic set-owner identities are emitted by the six function OBJECT seeds. Existing semantic and row IDs are retained; new OWNER row IDs are deterministically appended after singleton OWNER rows within their CX in parent function-object order.
- **Counts:** DB objects/fragments remain 169. Compared with a one-relation V2 row graph, OWNER proposal rows increase by exactly six. OBJECT_INVENTORY, OBJECT, PHYSICAL_IDENTIFIER, ATTACHMENT, BODY, and DB-object counts do not increase. Exactly twelve trigger-to-function EXECUTES rows are required; this is zero delta from any complete graph already representing those declarations, otherwise the incomplete graph must add the missing edge rows before hashing.
- **Seed/inventory/transition:** each function OBJECT seed uniquely EMITS its set OWNER; its BODY and related seeds `REFERENCES_SHARED` that row. Neutral inventory carries both relations and remains byte-identical between staged and materialized catalog states. Six function owner references and all dependent row/root hashes change.
- **Review/SQL/evolution:** faithfully represents actual use, makes no primary claim, and lets a future third relation be an explicit set/version change. It adds finite schema machinery but no SQL or database object.

**Recommendation: SFO01-B.** It preserves truth without arbitrary primacy, is mechanically finite (six exact two-member sets), and derives ownership from the already required trigger/dependency graph. This recommendation does not select or approve B for Franco.

### SFO01-C — function-family/non-relation owner identity

Each shared function points to a new non-relation `FUNCTION_FAMILY` owner identity; exact relation uses live only in new owner-to-relation usage/attachment edges plus trigger dependencies.

- **Schema/stable IDs:** adds OWNER kind FUNCTION_FAMILY, six family IDs, and a new relation-usage row variant or widens ATTACHMENT beyond its current object/snapshot/event role.
- **Counts:** DB objects/fragments remain 169; at least six family-owner rows plus twelve explicit family-to-relation usage rows are added, in addition to existing twelve trigger dependencies.
- **Seed/inventory/transition:** seeds and neutral inventory bind family identity plus separate edge IDs; staged/materialized transition must carry both inventories.
- **Review/SQL/evolution:** cleanly acknowledges schema-scoped functions, but creates a second ownership ontology and duplicates relation usage already provable from trigger OWNER/ATTACHMENT plus EXECUTES. It has the largest FK, locator, cardinality, and review surface.

This is coherent but not recommended while no broader function-family owner concept is approved.

## 5. Recommended B — exact closed schema amendment

This section is conditional: it applies only if Franco selects SFO01-B on this exact future blob.

### 5.1 Version and OWNER shape

The approved immutable V2/V2C schemas are not mutated under their old version literals. A later proposal uses ownership revision suffix `-SFO1` on profile, row, root, neutral-inventory, artifact-set, and transition schema literals and on their domain-separation ASCII tags. Existing ID prefixes remain `C14P2`/`C14P2C`; schema revision is not encoded by silently changing IDs.

OWNER replaces its scalar field with exactly:

```text
OwnerV2Sfo1={ownerId:NString,
 ownerKind:"DATABASE"|"RELATION"|"FUNCTION_RELATION_SET",
 ownerPhysicalIdentifierRowIds:ProposalRowId[],
 primaryOwnerPhysicalIdentifierRowId:ProposalRowId|null,
 companyScoped:Boolean,provenanceRowId:ProposalRowId}
```

Unknown keys fail. DATABASE requires one DATABASE physical row, `primary=sole`, and `companyScoped=false`. RELATION requires one RELATION physical row, `primary=sole`, and `companyScoped=true`. FUNCTION_RELATION_SET requires exactly two distinct RELATION physical rows, `primary=null`, and `companyScoped=true`; only the six function ObjectIds in §3 may reference it. The array is sorted by unsigned UTF-8 bytes of resolved `renderedIdentity` and must equal the exact matrix array. A set OWNER is referenced by exactly one OBJECT/OBJECT_INVENTORY pair: its named function.

Exact set semantic owner IDs are:

```text
C14PKS-CX10-fn_cajas_formula_version_min_line
C14PKS-CX11-fn_cajas_control_min_line
C14PKS-CX12-fn_cajas_stock_link_guard
C14PKS-CX13-fn_cajas_dispatch_min_line
C14PKS-CX13-fn_cajas_return_min_line
C14PKS-CX13-fn_cajas_consumption_min_line
```

Their OWNER row IDs use existing `C14P2-CXnn-OWNER-dddd` grammar. To preserve all existing row IDs, singleton OWNER rows retain their ordinals; set OWNER rows append after them, ordered by the parent §5 function ObjectId order. Staged parent-shaped rows use the same IDs. No renderer may invent a concrete `dddd` before the complete singleton OWNER inventory is frozen.

### 5.2 OBJECT, inventory, attachment, dependency, and seed equations

For object `f`, define `OwnerRelations(f)` as the resolved ordered relation rows in its OWNER. Define:

```text
CallingTriggers(f) = {t | DEPENDENCY(t,f,"EXECUTES") exists}
TriggerRelations(f) = orderedUnique({sole RELATION owner of t | t in CallingTriggers(f)})
```

For each six-function `f`, require `|CallingTriggers(f)|=2`, `OwnerRelations(f)=TriggerRelations(f)=the exact §3 set`, and a bijection between those triggers and set members. Each dependency's source span/locator is in that trigger declaration; each trigger ATTACHMENT points to its singleton OWNER and exact event set. For every other function, `|OwnerRelations(f)|=1`. A missing/extra trigger, edge, relation, duplicate member, wrong order, set on a non-allowlisted function, singleton on an allowlisted function, or non-null set primary fails.

The existing physical equation remains: FUNCTION has `PHYSICAL_IDENTIFIER.relationPhysicalIdentifierRowId=null`. For relation-contained objects, the scalar equation becomes equality to the sole OWNER array member. `ATTACHMENT.ownerRowId`, OBJECT/INVENTORY/root `ownerRowId`, and non-null seed `expectedOwnerRowId` still resolve exactly one OWNER row; multi-relation never means multiple owner-row FKs.

Each shared function OBJECT seed EMITS exactly its new OWNER row. Function BODY, FUNCTION_BODY, DEPENDENCY, and locator seeds reference that same owner as required; no trigger seed may emit it. The EMITS disjoint-union and REFERENCES_SHARED equations remain unchanged. Stable ObjectIds, block paths, object ordinals, function bytes, trigger bytes, and P16/U01/U02 selections do not change because of ownership metadata.

### 5.3 Neutral inventory and staged/materialized transition

`ExpectedOwnerIdentityV1` is superseded only in an SFO1 profile by:

```text
ExpectedOwnerIdentitySfo1={ownerKind:"DATABASE"|"RELATION"|"FUNCTION_RELATION_SET",
 renderedIdentities:NString[],primaryRenderedIdentity:NString|null,companyScoped:Boolean}
```

It obeys the same 1/1/2 cardinality and primary rules as OWNER. `ExpectedObjectInventoryRowV1` becomes `...Sfo1`, retaining exactly 169 rows. The six function rows carry the two-member arrays; every other row carries a singleton. The neutral inventory CJL1 bytes and digest are recomputed once and must be byte-identical in staged and materialized roots.

The catalog transition remains CX01-only: 169 expected = 168 concrete + one deferred in staged, then 169 concrete + zero deferred. It must preserve the SFO1 neutral inventory bytes/digest, all six set OWNER rows, all twelve trigger/function edges, and the 168 non-CX01 fragments byte-for-byte. It may remove only the CX01 deferred anchor and add only the approved CX01 materialized graph/fragment. Ownership metadata cannot create, remove, or substitute a DB object.

### 5.4 Closed profile/root/count impact

An SFO1 profile adds exactly `sharedFunctionOwnershipAddendumBlob:Hex40` and `sharedFunctionOwnershipApprovalObservation:PosInt` and changes the relevant schema/domain literals to `-SFO1`. Therefore base V2 profile is 22 fields; V2C staged profile is 26 fields; V2C materialized profile is 32 fields.

Each corresponding root core adds exactly `sharedFunctionOwnershipAddendumBlob:Hex40`, `sharedFunctionOwnershipApprovalEvidenceRowId:<state-valid evidence row ID>`, and `ownershipDecisionIds:["SFO01"]`. Therefore base root is 42 core/43 total fields; staged V2C root is 54 core/55 total; materialized V2C root is 57 core/58 total. Decision inventory contains one selected SFO01 row only after approval; before approval it is unresolved and blocks proposal completeness.

The row-kind count remains 26 and the base closed-variant count remains 27: OWNER uses one common key set, not three tagged subvariants. Staged remains 27 kinds/28 variants because only `DEFERRED_CATALOG_OBJECT` is added. Let `O_old` be the OWNER-row count under the one-relation graph and `R_old` total proposal rows. Then both states require `OWNER=O_old+6` and `R=R_old+6`, excluding any independently missing dependency rows. DB equations remain:

```text
|ExpectedDbObjects|=169
|StagedConcreteDbObjects|=168; |StagedDeferred|=1
|MaterializedConcreteDbObjects|=169; |MaterializedDeferred|=0
|ObjectFragments|=168 staged / 169 materialized
CX counts=[1,11,6,9,3,8,12,11,5,14,22,51,16]
```

The separate U02 audit remains 25 trigger-list rows/170 column occurrences. OWNER rows, relation-set members, dependencies, and attachments are proposal metadata and never enter the 169 DB-object count.

### 5.5 Canonical hashes, DAG, and anti-substitution

All SFO1 row/profile/root/neutral/transition hashes use their exact revised closed schemas and `-SFO1` domain tags. The DAG is:

```text
approved parent blobs + approved SFO01 blob/evidence + exact fragments
 -> profile/evidence/provenance/physical/OWNER/attachment/dependency/seed rows
 -> row hashes -> row set and 169-row neutral inventory
 -> staged root
 -> catalog observation/selection/overlay (separately authorized only)
 -> transition preserving neutral bytes and non-CX01 graph
 -> materialized root
```

No row contains its own hash; no profile contains its profile hash; each root excludes only its own root hash; transition excludes the materialized-root hash. OWNER set rows contain stable row-ID references, never referenced-row hashes. Thus OWNER↔trigger/dependency verification is by FK/equality after hashing and creates no hash cycle. Recomputed hashes without exact approved SFO01 evidence grant no authority.

Anti-substitution additionally requires: exact six-function allowlist; exact twelve triggers and relation pairs; exact set equality and order; singleton trigger owners; dependency direction trigger→function; physical FUNCTION relation null; no PostgreSQL role owner claim; neutral inventory byte equality across catalog states; and unchanged 169 object identity/path set. Aggregate counts alone cannot satisfy these checks.

## 6. Compatibility and migration of documentary data

No database migration exists or is authorized. “Migration” here means deterministic reserialization of not-yet-approved proposal rows.

1. Verify exact parent blobs and reject any pre-existing staged/materialized root as an input authority.
2. Copy all non-OWNER semantic IDs, ObjectIds, block paths, fragment bytes, and singleton OWNER rows unchanged.
3. Rewrite every singleton OWNER to the SFO1 common shape: scalar owner physical ID becomes a one-element array and `primary` equals that member. Its semantic owner ID and row ID remain unchanged; its row hash changes.
4. For the six functions only, do not convert or steal a singleton relation OWNER used by other objects. Append one exact set OWNER row per §5.1; redirect only that function's OBJECT, OBJECT_INVENTORY, ATTACHMENT, root ExpectedObject, fragment inventory owner reference, and relevant seed expected-owner/reference projections.
5. Require and verify the exact twelve trigger→function EXECUTES dependencies and their trigger locators. Do not manufacture a duplicate edge when one already exists.
6. Rebuild all affected row hashes, seed expected-output IDs/cardinalities, row counts, neutral inventory, decision inventory, profile, artifact set, transition, and roots under SFO1 domains. Preserve `.sqlfrag` bytes.
7. Re-run staged/materialized equality, FK, EMITS, count, canonical-order, DAG, and anti-misownership checks. A mixed V2/V2C/SFO1 root, old scalar OWNER, changed fragment, or guessed primary fails closed.

Future authority manifests may translate the approved relation-use set to a closed ordered relation array or to exact per-trigger usage edges, but must bind this addendum, preserve all twelve trigger attachments, and keep function SQL identity schema-scoped. They may not reinterpret the first member as primary. Later binding manifests must bind the exact approved proposal/authority roots and cannot gain execution authority from this decision.

## 7. Worked audits

**One-relation function.** `function:fn_stock_lot_append_only` keeps one RELATION OWNER resolving only `"public"."StockLot"`; `primary` equals that member. `trigger:trg_stock_lot_append_only` has its own singleton relation owner/attachment and one EXECUTES dependency to the function. OBJECT and trigger remain two of the same 169 DB objects. A two-member set here fails because the function is not allowlisted.

**Two-relation function.** `function:fn_cajas_stock_link_guard` has owner ID `C14PKS-CX12-fn_cajas_stock_link_guard`, ordered members [`"public"."cajas_dispatch_line"`, `"public"."cajas_disposition"`], and `primary=null`. The exact two calling triggers are `trigger:trg_cajas_dispatch_line_stock_link_guard` and `trigger:trg_cajas_disposition_stock_link_guard`; each is singly owned/attached to the corresponding member and has one EXECUTES edge to the function. Choosing dispatch-line because its trigger is listed first is invalid; the same ordered bytes are a set serialization, not primacy.

## 8. Decision and approval boundary

| Cell | A | B | C | Recommendation | Selection status |
|---|---|---|---|---|---|
| SFO01 | Six explicit primary relation owners; secondary use only | Six exact closed two-relation function OWNER sets; triggers singleton-owned | Six non-relation function-family owners plus twelve usage edges | **B**, truth-preserving and finite | **UNRESOLVED** |

**Exact approval question:** Does Franco approve this exact addendum blob and select exactly one SFO01 alternative—A with six separately stated primary relation selections, B with the six exact no-primary ordered relation sets and closed SFO1 schema above, or C with a separately completed exact family-owner/usage-edge schema—solely to authorize later non-executable proposal reserialization and independent review?

Until Franco answers against the exact reviewed blob, SFO01 remains unresolved, staged V2C and materialized proposal authoring remain blocked on ownership, and no recommendation is a selection.
