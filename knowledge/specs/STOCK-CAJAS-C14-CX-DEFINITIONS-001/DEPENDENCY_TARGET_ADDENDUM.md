# C14 Dependency Target Addendum

Status: **PROPOSED / HUMAN APPROVAL REQUIRED / NON-EXECUTABLE**

## 1. Decision, authority, and boundary

This addendum resolves Engram #4928. Continuous documentary preparation #4842 permits this proposal and review, not the new schema decision. It binds Capacity V2, approved D9 dependency semantics, C13 commit `0faf2f55e178f1b111c5ae108380a505a68c8feb` / schema blob `47313a8a85ac71ac56df93ce212593820cb95a13`, canonical P01–P19 blob `b1045fd3f66defcbb0bac7a1cc0adcadf783b81a`, SFO01-B, TEI1, PCA1, and the CX02 approved rendering root `28834eafa15bf1f99227421892cbef18734a047642212fbafc1ca01f1d6139c2`.

**Recommendation:** select a closed tagged target union with exactly `GENERATED_OBJECT | PHYSICAL_RELATION`. This preserves a generated-object edge as an OBJECT FK and a read/write of an existing C13 relation as a PHYSICAL_IDENTIFIER FK without inventing a database object. It authorizes no SQL/code generation or execution, Prisma/schema/migration change, database/catalog/network access, authority root, binding, publication, deployment, staging, or production action.

| Cell | Alternatives | Recommendation / status |
|---|---|---|
| `DT01` target model | A generated OBJECT only; B closed tagged union; C fake relation OBJECT rows; D free-form identity | **B / UNRESOLVED**. A omits truth, C corrupts the 169-object inventory, D loses FK/evidence closure. |
| `DT02` target set | A exactly GENERATED_OBJECT + PHYSICAL_RELATION; B add PHYSICAL_COLUMN/generic targets | **A / UNRESOLVED**. No additional target shape is proven. |
| `DT03` kind matrix | A closed matrix below; B permit any kind/target pair | **A / UNRESOLVED**. |
| `DT04` migration | A versioned `-DT1` reserialization with PCA2 adoption; B mutate old schemas/hashes | **A / UNRESOLVED**. |

## 2. Exact `DependencyV2Dt1` contract

Common scalar and row-ID domains remain the inherited PCA1 contracts. Unknown, duplicate, missing, null, wrong-variant, or extra keys fail. `DependencyKind` remains exactly `EXECUTES|READS|WRITES|VALIDATES|REQUIRES`; `CALLS`, `OWNS`, and `ATTACHES` are not aliases. Trigger invocation is `EXECUTES`; ownership and attachment remain OWNER/ATTACHMENT rows.

```text
DependencyGeneratedObjectV2Dt1={dependencyId:NString,sourceObjectRowId:ProposalRowId,
 dependencyKind:DependencyKind,targetKind:"GENERATED_OBJECT",targetObjectRowId:ProposalRowId,
 sourceSpanRowIds:ProposalRowId[],seedSourceRowIds:ProposalRowId[],provenanceRowId:ProposalRowId}

DependencyPhysicalRelationV2Dt1={dependencyId:NString,sourceObjectRowId:ProposalRowId,
 dependencyKind:DependencyKind,targetKind:"PHYSICAL_RELATION",
 targetPhysicalIdentifierRowId:ProposalRowId,targetOwnerRowId:ProposalRowId,
 tenantScope:"COMPANY_EXACT",sourceSpanRowIds:ProposalRowId[],
 seedSourceRowIds:ProposalRowId[],provenanceRowId:ProposalRowId}

DependencyV2Dt1=DependencyGeneratedObjectV2Dt1|DependencyPhysicalRelationV2Dt1
```

Both variants inherit common ProposalRow keys and add no nullable target field: the other variant's keys must be absent, not null. `sourceObjectRowId` resolves exactly one generated OBJECT in the row's CX. `GENERATED_OBJECT.targetObjectRowId` resolves exactly one OBJECT and its exact ObjectId; it never resolves PHYSICAL_IDENTIFIER. `PHYSICAL_RELATION.targetPhysicalIdentifierRowId` resolves exactly one same-CX PHYSICAL_IDENTIFIER with `identifierClass=RELATION`, `schemaName="public"`, null `relationPhysicalIdentifierRowId`, and `renderedIdentity=quote(schemaName)||"."||quote(localName)`. It creates no OBJECT/OBJECT_INVENTORY/root inventory member and contributes zero to object/fragment counts.

The physical target additionally requires exactly one `targetOwnerRowId` resolving a company-scoped singleton RELATION OWNER whose sole and primary physical member is that target. Its PHYSICAL_IDENTIFIER and OWNER provenance must reach the pinned C13 schema blob and exact model/`@@map` declaration. Every listed source span must be source ordered, duplicate-free, locator-covered, owned by the source OBJECT/BODY, and contain an exact public-qualified reference plus a company equality joining the referenced row to the trigger row's company. Missing company evidence, another relation, alias-only text, cross-company comparison, cross-CX row FK, or unresolved C13 mapping fails.

## 3. Allowed kind × target matrix

| `dependencyKind` | Source generated OBJECT | Target | Current 169-object use |
|---|---|---|---|
| `EXECUTES` | trigger or constraintTrigger | GENERATED_OBJECT function | Exact 59 trigger→function edges. |
| `READS` | function | PHYSICAL_RELATION | Relation reads; CX02 has two unique edges. |
| `WRITES` | function | PHYSICAL_RELATION | Schema-supported; all-CX audit currently proves zero. |
| `VALIDATES` | check or exclusion | GENERATED_OBJECT extension | Exact extension/opclass validation only. |
| `REQUIRES` | extension | GENERATED_OBJECT extension | Exact selected extension requirement only; current selected set is empty. |

Every other combination fails, including READS→OBJECT, EXECUTES→RELATION, function→function CALLS, OWN/ATTACH dependencies, self edges, and physical-column targets. The all-CX audit covered all 169 identities, the exact 53-function/59-trigger graph, P16/SFO trigger sharing, CX01 extension semantics, U02's 170 column occurrences, and every canonical owner relation family. It found only generated function/extension targets and physical relation targets. Columns are occurrence/locator evidence, not D9 dependency targets; therefore `PHYSICAL_COLUMN`, TYPE, SEQUENCE, SCHEMA, DATABASE, ROLE, and free-form targets are not admitted. A later proven shape requires a new closed version and Franco approval.

## 4. Identity, ordering, dedupe, and hashes

The unique edge key is `(source ObjectId,dependencyKind,targetKind,resolved target identity bytes)`. One row exists per key. `sourceSpanRowIds` contains every rendered reference occurrence in source order; repeated references enlarge this evidence array but D9 counts the edge once. Dependency IDs remain `C14PY-CXnn-dddd`; existing IDs are preserved. New IDs are assigned only after the complete edge set freezes, ordered by dependency-kind rank `EXECUTES,READS,WRITES,VALIDATES,REQUIRES`, source object ordinal, target-kind rank `GENERATED_OBJECT,PHYSICAL_RELATION`, resolved target identity unsigned UTF-8 bytes, then row ID bytes.

Rows retain exact seed/provenance/locator closure. Stable IDs, not target row hashes, form FKs. `rowSha256=SHA256(ASCII(row.schemaVersion)||NUL||CJ1(row core))`; the ordered CJL1 row set, inventories, profile, artifact set, transition, roots, PASS, approval, and envelope are recomputed under final `-DT1-PCA2` domains. Raw `.sqlfrag`, object-block, source-span, normalized SQL, TEI outcome, and TEI binding domains remain unchanged because their preimages do not contain the revised row schema. The DAG remains acyclic: C13/rendered bytes/evidence → physical/object/span/locator rows → dependency rows → seed outputs/row set/inventories → profile → roots → external PASS/approval.

## 5. Exact CX02 diagnostic migration

The rolled-back S02 diagnostic is the fixed 385-row, 66-locator, six-dependency PCA1 slice. DT1 preserves every row ID, semantic ID, object/fragment byte, row-kind count, and locator. It changes all 385 row hashes because the common row schema becomes `C14P-ROW-V2C-STAGED-SFO1-EAV1-BS1-TEI1-PCA1-DT1`; the eleven seed stable-row-set hashes use `C14P-STAGED-SEED-STABLE-ROW-SET-V2C-SFO1-EAV1-BS1-DT1`.

Dependencies 0001–0004 become `EXECUTES/GENERATED_OBJECT` and keep their trigger declaration spans. Dependency 0005 becomes `READS/PHYSICAL_RELATION` to PHYSICAL_IDENTIFIER-0001 / OWNER-0001 (`"public"."StockLotObservation"`) with evidence spans `0049,0050,0052` and locators `0032,0033,0035`; three rendered reads count once. Dependency 0006 targets PHYSICAL_IDENTIFIER-0003 / OWNER-0003 (`"public"."StockLot"`) with span `0054` / locator `0037`; one rendered read counts once.

| Dependency | DT1 row hash |
|---|---|
| 0001 | `74d92d2963e7debf07d59fc1d5d59b71e46eac490f91dc8ad0b60c2218976868` |
| 0002 | `e35b07c9c1327b27ae9d291841498046a97184a6d1633413f93da42b10137707` |
| 0003 | `cc0299332f0f5433dd5e27affd3831ccd883d24a9074171bb7e5eb24390f49bb` |
| 0004 | `197435ed6d3e649e79839d761e50887977e0d7b2a26f470ebe1fcfcb9024cc86` |
| 0005 | `e826062b79489be846838129575223f42d0cf243fd4fe19bf96ce5611dad81fd` |
| 0006 | `58e37524f775ed35c8f45968f8ea8958a5573f621ff7fb07b6fc10a10be2c000` |

The exact transformed diagnostic is 385 rows / 358089 CJL1 bytes with `SHA256("C14P-TEMP-SLICE-CX02-V1-TEI1-PCA1-DT1"||NUL||bytes)=46cc34c2d62d858e7714108030298cb642a0b0e78760d3ff11b0b74fc94b3dd5`. FK closure is 4 OBJECT targets + 2 RELATION PHYSICAL_IDENTIFIER targets + 2 exact OWNER targets; six unique D9 edges and four READ reference occurrences. TEI remains 8 outcomes hash `8f3d9c425e243e3785ee4bee66fab6f8ef3811f79f3b2faab5df436315c9f224` and 8 bindings hash `a6167232abef9bf6c4031dd6d76ab01e9a1088e6dfbc02ebe06f0e6df9df7a89`. Forecast remains 216 lines. The 11 approved SQL fragments and approved CX02 rendering root remain byte-identical.

## 6. Global impact and required tests

DB inventory remains exactly 169 (`1/55/53/49/10/1`); staged remains 168 concrete + one deferred; materialized remains 169. Base row kinds remain 26 while variants become 28 (EVIDENCE×2, DEPENDENCY×2); staged becomes 27 kinds/29 variants with DEFERRED_CATALOG_OBJECT. PCA1 cannot silently enroll this later decision: adoption requires a PCA2 inventory adding this exact blob and `DT01-B/DT02-A/DT03-A/DT04-A`; exact PCA2 package/inventory/profile/root hashes are unavailable until this blob independently passes and Franco approves it. PCA profile/root field counts can remain 42/46/52 and 71/72,83/84,86/87 by versioned PCA1→PCA2 value substitution; row/variant counts, dependency inventories, authority manifests, source-slot bindings, and all affected domains must use DT1/PCA2 types. Existing authority tuples/bindings remain invalid inputs and gain no execution authority.

Validation must: audit all 169 objects and reject an unproven target kind; prove the exact matrix; reproduce CX02 385 rows, hashes, six-edge/eight-occurrence closure (four EXECUTES plus four READ occurrences), and unchanged SQL/root; mutate target kind/FK/class/rendered identity/OWNER/company predicate/C13 locator to prove rejection; reject fake OBJECTs, aliases, wrong relations, cross-company/cross-CX rows, missing or duplicate spans, invalid kind pairs, and reordered/deduplicated evidence; prove row/count/hash/DAG closure; and run `git diff --check` plus exact blob verification.

Worked valid edges are `trg_stock_lot_append_only --EXECUTES--> fn_stock_lot_append_only` as GENERATED_OBJECT and `fn_stock_lot_review_coherence --READS--> "public"."StockLotObservation"` as PHYSICAL_RELATION. Invalid examples are READS→function OBJECT, EXECUTES→RELATION, READS→COLUMN, OWNS/ATTACHES dependency kinds, a free-form `public.StockLot`, or a relation row without exact tenant evidence.

### 6.1 Detached diagnostic evidence binding

Independent-review evidence is materialized under `dependency-target-diagnostic/`. This binding adds no recommendation, selection, authority root, staged proposal, global binding, or execution authority and does not alter DT01–DT04.

| Artifact | Exact SHA-256 |
|---|---|
| `cx02-proposal-rows.cjl1` | `dadbc067e2f75b2b173698ba572c8390f2bda509daaa7e30d0f039228891c243` |
| `all-cx-target-shapes.cj1` | `8f55133c8abed1cdee4dce0b1ccaf5607d82473aa06aed30ded7138c466bde4f` |
| `c13-physical-relation-evidence.cj1` | `95b60e6b6f4a42c18ac3d1227534d3ba93ed01defa3d36ce349764961dc2a843` |
| `validate.mjs` | `9b1c1e95647726dd4ffcdf38b0720d67cc7fba336279eeef5c3d14e5588c3dfa` |
| `validate.test.mjs` | `77bcf79cddbf323256570cf67f06b858ccb496f1ac08cd04d8cfb4245b926c07` |
| `manifest.cj1` | `b842bddd319cdcc53a6fc02cf9f2584924f395a48b0d231d4f5c0c767bd8cb71` |

`hashes.sha256` covers those six ordered leaves acyclically. Its detached diagnostic root is `60eb98ad49d2ee6cd40711375a3d6b07ab4f57a536a0b8583ef0bc980dfd77d5` under `C14-CX-DEPENDENCY-TARGET-DIAGNOSTIC-ROOT-V1`. The exact CX02 slice reproduces 385 rows, 66 locators, six dependencies, eight complete source-reference occurrences, 358089 bytes, and domain hash `46cc34c2d62d858e7714108030298cb642a0b0e78760d3ff11b0b74fc94b3dd5`; every occurrence is recomputed from its exact approved leaf path/hash through object-block bytes, exact parser-derived span offsets/coordinates/raw/LF/normalized hashes, source-fragment length/hash, containing identities, and locator relationships. The approved SQL rendering root remains `28834eafa15bf1f99227421892cbef18734a047642212fbafc1ca01f1d6139c2`.

Stable identity is independently derived from the immutable parser/source inventory, not from mutable candidate FKs. For immutable source entry `e` at inventory index `i`, `Descriptor(e)=(kindRank,containingObjectOrdinal,startByte,endByte,semanticSubtype,stableTieSha256,i)`, where `stableTieSha256=SHA256("C14-DT1-STABLE-IDENTITY-TIE-V1"||NUL||CJ1(identityProjection(e)))` and `identityProjection` excludes row hashes, row/semantic IDs, ordinals, every `*RowId`/`*RowIds`, and nested `stableRowIds`. For kind `k`, `ordinal(e)=1+position(e, immutableParserEmissionSequence filtered by k)`, `rowId(e)="C14P2-CX02-"||k||"-"||dddd(ordinal(e))`, and each contracted semantic ID uses its exact P19 prefix plus `-CX02-dddd(ordinal(e))`. The global CJL1 equation is the immutable 26-kind rank order followed by each kind's derived emission sequence; this slice materializes 21 kinds and 385 slots. Candidate FK/reference rewrites are validated separately and cannot change any derived slot or ID.

Seed allocation is independently bound from the immutable object/parser/decision inventories. Each of the 11 approved source units maps to exactly one object identity, seed class, owner, `CX02-R01..R13`, semantic statement/hash, and five-row authority evidence chain. `Allocation(seed,kind)` equals the immutable approved `EMITS|REFERENCES_SHARED` stable-row-ID set for that source unit and one of the 27 staged output kinds; cardinality, canonical ID order, uniqueness, target kind, and stable-set hash are recomputed. The exact 297 output slots produce 385 unique EMITS memberships, zero REFERENCES_SHARED memberships, and no duplicate or orphan. The inverse projection is variant-closed: 28 OBJECT_INVENTORY/OBJECT/DEPENDENCY rows carry their exact singleton emitter in `seedSourceRowIds`; the other 357 rows have the approved absent field; approved multi-membership count is zero. Candidate seed refs never derive this allocation.

Object allocation is independently closed over the immutable rendering-manifest, approved fragment bytes, C13 physical-relation identities, and exact parser inventory. The 11 approved source units form exact one-to-one bijections with 11 OBJECT_INVENTORY rows, 11 OBJECT rows, 11 PHYSICAL_IDENTIFIER rows, 11 ATTACHMENT rows, 11 declaration spans, 11 declaration locators, and 11 seed sources; exactly four function objects additionally map to four unique BODY rows. Fragment path, byte length, direct leaf hash, object-block hash, object ordinal/class/CX identity, declaration location, seed class, relation owner, and optional function body are recomputed rather than trusted from candidate references. The three exact relation-owner sets are closed to objects `{1,5,9}`, `{2,3,6,7,10,11}`, and `{4,8}` respectively; the rendering-manifest dependency/event inventories and all eight trigger-event-operation-integrity bindings are equality checked. Across the slice, 1,540 immutable row-field reference instances containing 2,289 reference values are compared against this source-derived graph before later FK-kind validation.

Validation results on 2026-08-05: both `node --check dependency-target-diagnostic/validate.mjs` and `node --check dependency-target-diagnostic/validate.test.mjs` passed; `node --test dependency-target-diagnostic/validate.test.mjs` passed **256/256 tests: one positive and 255 adversarial or coverage tests**; and `node dependency-target-diagnostic/validate.mjs` returned PASS with 11 seed sources, 297 output slots, 385 unique emissions, 28 inverse-bearing rows, 357 approved inverse-absent rows, zero shared/multi memberships, 21 identity kinds, 385 identity slots, 11 complete object graphs, four function bodies, three relation-owner sets, eight trigger-event-operation-integrity bindings, 1,540 immutable graph-reference fields, 2,289 graph-reference values, 66 locators, six dependencies, eight occurrences, and the exact slice hash above. The table-driven graph harness rejects mutations of all 62 mutable same-kind FK/reference fields plus 108 pairwise compatible-object swaps, for 170 full-rehash mutations with 15 explicit identical or unavailable-field exceptions; missing, dual, duplicate, and orphan graph-node allocations also reject. Full-rehash allocation swaps/substitutions across OBJECT, OBJECT_INVENTORY, BODY, SOURCE_SPAN, ATOM, BRANCH, DEPENDENCY, EVENT, ERROR, LOCATOR, OWNER, ATTACHMENT, and PHYSICAL_IDENTIFIER all reject, as do missing/extra/duplicate/wrong inverse memberships, orphan/duplicate emissions, coordinated output+inverse cross-object swaps, and source decision/owner/evidence/semantic substitutions. All earlier identity, occurrence-byte, provenance, target, company, FK-kind, approved-leaf, and same-length substitution regressions remain rejecting. Final hygiene additionally requires path-limited artifact hash reproduction and `git diff --check`.

Evidence limits are explicit. CX02 alone has materialized exact DT1 rows/FKs/spans/hashes. CX01 and CX03–CX13 record finite authority-backed object/target shapes and the exact 59-edge EXECUTES topology, but do not invent future fragment-derived dependency rows, spans, FKs, or hashes. The C13 sidecar duplicates only exact model locator metadata; the validator read-only resolves commit `0faf2f55e178f1b111c5ae108380a505a68c8feb` and path `prisma/schema.prisma` to blob `47313a8a85ac71ac56df93ce212593820cb95a13`, recomputes the Git blob and three model-fragment hashes, and executes no SQL, Prisma, database, or network operation. Unchanged TEI outcome/binding bytes remain outside this detached diagnostic and retain hashes `8f3d9c425e243e3785ee4bee66fab6f8ef3811f79f3b2faab5df436315c9f224` and `a6167232abef9bf6c4031dd6d76ab01e9a1088e6dfbc02ebe06f0e6df9df7a89`.

## 7. Approval boundary

**Exact approval question after independent PASS:** Does Franco approve this exact addendum blob and select `DT01-B`, `DT02-A`, `DT03-A`, and `DT04-A` as one non-severable decision, adopting the exact two-variant DependencyV2Dt1 target union and matrix, unchanged 169 DB objects, exact CX02 385-row diagnostic migration/hash and unchanged approved SQL/root, and the DT1/PCA2 profile/root/domain/manifest/binding cascade solely for later non-executable proposal reserialization and independent review?

Until that approval, Engram #4928 remains a proposal-authoring blocker; no recommendation, diagnostic hash, or recomputation grants execution authority.
