# C14 Rendering Topology Split Addendum

Status: **PROPOSED / HUMAN APPROVAL REQUIRED / NON-EXECUTABLE**

## 1. Decision and parents

This addendum changes documentary rendering topology only. It authorizes no SQL authoring, migration, schema/database access, runner, execution, Git publication, deployment, staging, or production action.

| Parent | Git blob |
|---|---|
| Canonical P01–P19 | `b1045fd3f66defcbb0bac7a1cc0adcadf783b81a` |
| P19 serialization A01–A06 | `bdc0fd13f3126567ade7e13c8f65f6e376a9940f` |
| P19 capacity C01–C06 | `1304c0911e858a4995f0621a5c478650f4fe4ccd` |
| Approved C14 topology | `b8608a922d2d9adf5d776673252f709c52d4a518` |
| CX07 corrected stop | `4e393636cea2ef5662e0214be626afc32a91425b` |
| CX08 blocked evidence | `d5f350e812171b62a4cf1c13ba8ca0c662fd48a2` |
| CX12 size stop | `08ec555339498b3adaa453e510f46f7690e60c49` |
| C13 commit / schema | `0faf2f55e178f1b111c5ae108380a505a68c8feb` / `47313a8a85ac71ac56df93ce212593820cb95a13` |

Decisions are: `RTS00` version the rendering topology/projection schemas; `RTS07` replace CX07's one child by two; `RTS08` replace CX08's one child by three subject to §4; `RTS12` replace CX12's one child by nine. A suffix is identity, not a decimal child and not renumbering.

No working-tree CX08 semantic candidate is a normative parent or prefilled RTS1B value, and every failed prior revision is excluded. RTS1B binds only the immutable, independently passed and human-approved exact candidate supplied at instantiation through `Cx08SemanticSeal.semanticCandidateBlob`; that concrete value cannot be changed under the same seal or root.

## 2. Common topology contract

Every split member retains its CX's structural attachment: CX07 uses `afterSnapshot=S09,coversSnapshots=["S09"]`; CX08 uses `S10,["S10"]`; CX12 uses `S21,["S16","S17","S18","S19","S20","S21"]`. `attachmentAfter` is the immediate child predecessor below; it never replaces `afterSnapshot`. All members are projection-stage peers over the same approved projected snapshot: the first consumes that snapshot, later members consume the preceding member's customized-object state only. No member advances `P09`, `P10`, or `P21`.

For child `c` with ordered complete object blocks `O(c)` and LF counts `L(o)`:

```text
lines(c)=4+sum(L(o))+max(0,|O(c)|-1)+1
bytesPrefix(c)=length("-- c14-cx-child: " + c + "\n")+91+92+7
startByte(o_i)=bytesPrefix(c)+sum(bytes(o_j),j<i)+(i-1)
startLine(o_i)=5+sum(L(o_j),j<i)+(i-1)
```

The two complete digest-comment lines are 91 and 92 bytes and `BEGIN;\n` is 7. Thus suffixed IDs change the old 214-byte prefix to 215 bytes, never the five fixed physical lines. Every final numeric forecast is exact, not a range; `lines(c)>350` blocks.

## 3. CX07 — exact two-child split

| Child | `attachmentAfter` | Exact parent ordinals / objects | Lines | Margin |
|---|---|---|---:|---:|
| `C14-16A` | `C14-15` | 1–6, 9–10: four checks; two append-only functions; their two triggers | `113` | `237` |
| `C14-16B` | `C14-16A` | 7–8, 11–12: parent/trace and quantity-scale functions; their triggers | `287` | `63` |

`C14-16B → C14-17`. Trigger/function pairs are inseparable. Cross-child generated-object dependencies are empty; B may read relations affected by A but executes no A function. The union is exactly 12 objects, 380 fragment LFs, 14 dependency edges/17 occurrences; intersection is empty. This supersedes only the withdrawn 396-line one-child projection.

## 4. CX08 — exact conditional three-child split

| Child | `attachmentAfter` | Fixed object set | Current exact lines | Final deterministic equation |
|---|---|---|---:|---|
| `C14-18A` | `C14-17` | ordinals 1–6, 8–10 | `129` | `13 + ΣL(1..6,8..10)` |
| `C14-18B` | `C14-18A` | ordinal 7, `fn_stock_reservation_ceiling` | `350` | `5 + L(7)` |
| `C14-18C` | `C14-18B` | ordinal 11, its trigger | `9` | `5 + L(11)` |

`C14-18C → C14-19`. Under dependency direction `fromObject → toObject`, the sole cross-child generated-object edge is **C→B**: trigger 11 in `C14-18C` `EXECUTES` function 7 in `C14-18B`. The other three generated edges are internal to A: 8→4, 9→5, and 10→6. Therefore the exact CX08 cross-child `GENERATED_OBJECT` set is `{(C14-18C,trigger:trg_stock_reservation_ceiling,C14-18B,function:fn_stock_reservation_ceiling,EXECUTES)}`; no B→C edge exists.

Approval of `RTS08` is effective only after one `Cx08SemanticSeal` binds a separately approved CX08 semantic addendum resolving `CX08-MD01..03`, preserving exactly these 11 DB-object identities, and carrying an ordinal-ordered `FragmentSeal[11]`, where `FragmentSeal={objectOrdinal:1..11,objectId:ObjectId,fragmentPath:RepoPath,lfCount:PosInt,fragmentSha256:Hex64}`. The set must contain every ordinal, identity, path, final LF count, and final domain-separated V2 fragment hash exactly once—even for byte-unchanged fragments—and each value must recompute from the final bytes. The instantiated equations must be `13+ΣL(1..6,8..10)<=350`, `5+L(7)<=350`, and `5+L(11)<=350`, equivalently `ΣA<=337`, `L(7)<=345`, and `L(11)<=345`; `margin(c)=350-lines(c)`. Until that exact seal exists, final values are uninstantiated, never ranges, and CX08 remains blocked. Added/removed DB objects, missing seals, a failing equation, or changed pairing requires another amendment.

## 5. CX12 — concrete nine-child split

Parent ordinals are checks 1–18, functions 19–34, and triggers 35–51; triggers 35–46 match functions 19–30. Bounds below preserve every object. `lower` uses 23 LFs for each append-only function and one LF for every other object; `upper=350` is an admission cap, not a forecast.

| Child | `attachmentAfter` | Exact ordinals | Semantic group | Bounds / margin above lower |
|---|---|---|---|---|
| `C14-33A` | `C14-32` | 1–7,19–22,35–38 | composition + difference | `122..350 / 228` |
| `C14-33B` | `C14-33A` | 8–9,23–24,39–40 | dispatch append-only | `60..350 / 290` |
| `C14-33C` | `C14-33B` | 10–12,25–26,41–42 | return append-only | `62..350 / 288` |
| `C14-33D` | `C14-33C` | 13–14,27–29,43–45 | replacement + consumption | `86..350 / 264` |
| `C14-33E` | `C14-33D` | 15–17,30,46 | disposition append-only | `36..350 / 314` |
| `C14-33F` | `C14-33E` | 31,47 | dispatch ceiling pair | `8..350 / 342` |
| `C14-33G` | `C14-33F` | 32,48–49 | shared Stock-link function + both triggers | `10..350 / 340` |
| `C14-33H` | `C14-33G` | 33,50 | disposition fold pair | `8..350 / 342` |
| `C14-33I` | `C14-33H` | 18,34,51 | condition counts/assignment pair | `10..350 / 340` |

`C14-33I → C14-34`. The exact 17 trigger→function edges are internal: 35→19, 36→20, 37→21, 38→22 in A; 39→23 and 40→24 in B; 41→25 and 42→26 in C; 43→27, 44→28, and 45→29 in D; 46→30 in E; 47→31 in F; 48→32 and 49→32 in G; 50→33 in H; and 51→34 in I. G keeps the shared function and both callers inseparable. The CX12 cross-child `GENERATED_OBJECT` set is exactly empty. Any future edge deviation requires a new topology amendment; rendering may not enlarge this set. Each package must later replace its bound with one exact P19 value; any single function block above its package budget blocks rather than being split or shortened.

## 6. RTS00 — closed projection and source-set contract

### 6.1 States, child order, and projection rows

Old types are not widened. `RTS1A` selects `RTS00/RTS07/RTS12`, retains unsplit `C14-18`, and has exactly 22 rendering children in this order:

```text
C14-01,06,08,10,12,14,16A,16B,18,20,22,26,
C14-33A,33B,33C,33D,33E,33F,33G,33H,33I,37
```

`RTS1B` cumulatively selects `RTS00/RTS07/RTS08/RTS12`, replaces `C14-18` in that order by `C14-18A,18B,18C`, and has exactly 24. These expanded spellings mean the exact prefixed IDs used elsewhere. The complete 91 authority slots and 169 DB objects remain unchanged.

`RenderingChildProjectionCore={schemaVersion:"C14-RTS-PROJECTION-V1",state:"RTS1A"|"RTS1B",renderingOrdinal:PosInt,c14Child:C14ChildRTS1,cx:Cx,attachmentAfter:NString,afterSnapshot:NString,coversSnapshots:NString[],objectOrdinals:PosInt[],objectIds:ObjectId[]}`. Arrays are nonempty, equal-length, duplicate-free, and pairwise equal to the sections above or the unchanged parent CX inventory. Ordinals are parent CX object ordinals in ascending order inside each child; IDs are their exact projection. `renderingOrdinal` is contiguous in the state order. `attachmentAfter`, snapshots, and covers equal §§2–5. For exact state `S`, `RenderingChildProjection` adds only `projectionSha256=SHA256(ASCII("C14-RTS-PROJECTION-"||S||"-V1")||NUL||CJ1(core))`.

Across one state, object pairs partition all 169 parent `(cx,ordinal,ObjectId)` tuples exactly once. The unchanged ten CXs contribute one projection each. CX07/CX12 use §§3/5; RTS1A assigns all CX08 objects to `C14-18`; RTS1B uses §4. Projection order is the state order above. No path scan, dependency discovery, or renderer choice changes membership.

### 6.2 State authority reserialization and exact membership

Parent authority rows/descriptors are semantic inputs only. They are never `Members`, never hashed into PSS1, and never referenced by a `ProjectionSlotRow`. For state `S`, deterministically construct the complete RTS authority graph first:

1. Preserve the 91 slot IDs, each row ID, category, semantic payload, seed/source-locator references, and parent slot order.
2. For each non-LOC row, its unique projection is the one containing `ownerObjectId`; replace `schemaVersion` by `C14A-ROW-<S>-V1` and `attachment` by that projection's exact `{c14Child,afterSnapshot,coversSnapshots}`.
3. For LOC row `q`, let `ReferringProjections_S(q)` be the rendering-ordinal-ordered set of projections containing at least one reserialized non-LOC row whose `sourceLocatorIds` contains `q.id`. It must be nonempty. Its home is the first member; reserialize `q` once in its original LOC slot with the home attachment and state schema. Later membership may reference that same state row from every referring projection; this is source reuse, not duplicate authority ownership.
4. Recompute every state row `sha256=SHA256(ASCII("C14A-ROW-"||S||"-V1")||NUL||CJ1(state-row core))`. For each slot, concatenate all reserialized rows in preserved slot order, compute the state-specific content hash, and build its state `ChildDescriptor`; these 91 descriptors are the only descriptors usable below.

For state descriptor `d_S` and projection `p` of the same CX, define `Members_S(p,d_S)` exclusively over the exact reserialized rows covered by `d_S`, in their state slot order:

- `OBJ|ATM|BRN|BDY|DEP|EVT`: rows whose non-null `ownerObjectId` belongs to `p.objectIds`;
- `LOC`: rows `q` for which `p ∈ ReferringProjections_S(q)`.

Non-LOC state rows partition exactly once; a state LOC row appears in each and only each referring projection. Let `ProjectedBytes_S(p,d_S)=concat(CJ1(stateRow) for stateRow in Members_S(p,d_S))`, with no prefix or separator beyond each state row's LF.

`ProjectionSlotRowCore={schemaVersion:"C14-RTS-PROJECTION-SLOT-ROW-V1",state:S,c14Child,cx,projectionSha256,slotId,category,authorityDescriptorSha256,memberRowCount:PosInt,memberRowIds:RowId[],memberRowSha256s:Hex64[],projectedContentSha256:Hex64}`. The authority descriptor is exactly `d_S.descriptorSha256`; IDs/hashes are aligned, nonempty, and equal the selected state rows. `projectedContentSha256=SHA256(ASCII("C14-RTS-PROJECTED-SLOT-CONTENT-"||S||"-V1")||NUL||ProjectedBytes_S(p,d_S))`. `ProjectionSlotRow` adds only `projectionSlotRowSha256=SHA256(ASCII("C14-RTS-PROJECTION-SLOT-ROW-"||S||"-V1")||NUL||CJ1(core))`.

If `Members_S(p,d_S)=[]`, no `ProjectionSlotRow` exists. Its mathematical digest is `SHA256(ASCII("C14-RTS-PROJECTED-SLOT-CONTENT-"||S||"-V1")||NUL)`, but it cannot enter a set. Every projection has a nonempty OBJ row, so every descriptor below has `rowCount>=1`. Slot rows are ordered `OBJ,ATM,BRN,BDY,DEP,EVT,LOC`, at most one per category.

### 6.3 Per-child source-slot sets

For state `S` projection `p`, let `PSRows_S(p)` be its nonempty state `ProjectionSlotRow`s in category order and `PSS1_S(p)=concat(CJ1(r) for r in PSRows_S(p))`. Then, for **every** listed child independently:

```text
sourceSlotSetSha256_S(p)=
  SHA256(ASCII("C14-RTS-SOURCE-SLOT-SET-" || S || "-V1")
         || NUL || PSS1_S(p))
```

`RenderingSourceSlotSetDescriptor={schemaVersion:"C14-RTS-SOURCE-SLOT-SET-DESCRIPTOR-V1",state:S,c14Child,cx,renderingOrdinal,projectionSha256,rowCount:PosInt,sourceSlotSetSha256:Hex64}`. `rowCount=|PSRows_S(p)|` is `1..7`. Descriptors are ordered by rendering ordinal, exactly 22/24, and each final child's third wrapper comment uses its own state digest. Empty PSS1 has a deterministic state hash but is invalid. Parent CSS1 bytes/digests/descriptors, another child's digest, or a mutable file list cannot substitute.

### 6.4 Exact ParentBinding arrays

`ParentBinding` remains exactly `{rank:PosInt,authority:NString,identity:NString,state:"BOUND"|"PROPOSED_ABSENT"}` with no null or unknown key. Define `RenderingTopologyAddendumBindingCore={schemaVersion:"C14-RTS-ADDENDUM-BINDING-V1",addendumBlob:Hex40,approvalEvidence:EvidenceRef}` and `addendumBindingSha256=SHA256(ASCII("C14-RTS-ADDENDUM-BINDING-V1")||NUL||CJ1(core))`. Rank identity `RTS_ADDENDUM(b)` is exactly lowercase ASCII `rts-addendum:` + `b.addendumBlob` + `:` + `b.addendumBindingSha256`. `CX08_SEAL(s)` is exactly lowercase ASCII `cx08-semantic-seal:` + `s.semanticCandidateBlob` + `:` + `s.semanticSealSha256`. These constructors must be instantiated with concrete values; constructor notation never enters a root.

RTS1A `parentBindings` is exactly this ordered array; the new addendum is inserted before the superseded topology, and inherited relative order is preserved:

| Rank | `authority` exact string | `identity` exact string/construction | `state` |
|---:|---|---|---|
| 1 | `RTS authority tuple` | `schema:C14A-AUTHORITY-TUPLE-RTS1A-V1;status:absent` | `PROPOSED_ABSENT` |
| 2 | `Binding Finalization Addendum` | `git:a860049af04a6ff07fbe9fae6ddb512a8ef0adc8` | `BOUND` |
| 3 | `J1/P3/integrated D3` | `git:0fd2959cd149d3c37b4162cdb2c232dd9dd35a71;approvals:4767,4769,4771` | `BOUND` |
| 4 | `Matrix/decision framing` | `matrices-git:4f8536560fd94ba0af92091739a333986ee75eee;decision-packet-git:fcaa6460fa96a032d4e803bd1c393d965a03d6d1;scope:approved-only` | `BOUND` |
| 5 | `C14 rendering topology split addendum` | `RTS_ADDENDUM(renderingTopologyAddendumBinding)` | `BOUND` |
| 6 | `C14 topology parent` | `git:b8608a922d2d9adf5d776673252f709c52d4a518` | `BOUND` |
| 7 | `C13 structure` | `commit:0faf2f55e178f1b111c5ae108380a505a68c8feb;schema-git:47313a8a85ac71ac56df93ce212593820cb95a13;scope:structure-only` | `BOUND` |
| 8 | `C04/C05 closures` | `engram:4318r1,4319r2,4321,4324r3,4329;scope:within-closures` | `BOUND` |

RTS1B is exactly the same precedence with the semantic seal inserted immediately before the topology split addendum; ranks 1 and 6–9 are therefore state-specific:

| Rank | `authority` exact string | `identity` exact string/construction | `state` |
|---:|---|---|---|
| 1 | `RTS authority tuple` | `schema:C14A-AUTHORITY-TUPLE-RTS1B-V1;status:absent` | `PROPOSED_ABSENT` |
| 2 | `Binding Finalization Addendum` | `git:a860049af04a6ff07fbe9fae6ddb512a8ef0adc8` | `BOUND` |
| 3 | `J1/P3/integrated D3` | `git:0fd2959cd149d3c37b4162cdb2c232dd9dd35a71;approvals:4767,4769,4771` | `BOUND` |
| 4 | `Matrix/decision framing` | `matrices-git:4f8536560fd94ba0af92091739a333986ee75eee;decision-packet-git:fcaa6460fa96a032d4e803bd1c393d965a03d6d1;scope:approved-only` | `BOUND` |
| 5 | `CX08 semantic seal` | `CX08_SEAL(cx08SemanticSeal)` | `BOUND` |
| 6 | `C14 rendering topology split addendum` | `RTS_ADDENDUM(renderingTopologyAddendumBinding)` | `BOUND` |
| 7 | `C14 topology parent` | `git:b8608a922d2d9adf5d776673252f709c52d4a518` | `BOUND` |
| 8 | `C13 structure` | `commit:0faf2f55e178f1b111c5ae108380a505a68c8feb;schema-git:47313a8a85ac71ac56df93ce212593820cb95a13;scope:structure-only` | `BOUND` |
| 9 | `C04/C05 closures` | `engram:4318r1,4319r2,4321,4324r3,4329;scope:within-closures` | `BOUND` |

In exact CJ1, each object key order is `authority,identity,rank,state`; array order is table rank; there is no whitespace and the array document has one terminal LF. Let `ParentBindingsCJ1_S=CJ1(the fully instantiated exact array)`. Then `parentBindingsSha256_S=SHA256(ASCII("C14A-PARENTS-"||S||"-V1")||NUL||ParentBindingsCJ1_S)`. Any insertion, stale rank, alternative label, unresolved constructor, evidence/blob change, or different key/array bytes changes this hash, root, tuple, and envelope. Rank 1 stays absent until the later tuple exists and is never backfilled into the already hashed root.

### 6.5 Complete RTS ChildDescriptor schemas

For state `S`, `ChildDescriptorCore_S` has exactly seven required, non-null fields: `{schemaVersion:"C14A-CHILD-DESCRIPTOR-<S>-V1",slotId:SlotId,cx:Cx,category:Category,rowCount:UInt,lineCount:UInt,contentSha256:Hex64}`. The literal is exactly `C14A-CHILD-DESCRIPTOR-RTS1A-V1` or `C14A-CHILD-DESCRIPTOR-RTS1B-V1`. `slotId/cx/category` must agree; `rowCount=0` iff `lineCount=0` and state slot bytes are empty; otherwise `lineCount=rowCount` because each state row is one CJL1 line. No field is nullable. Unknown/duplicate/missing fields fail.

The conceptual field list above serializes in exact CJ1 key order `category,contentSha256,cx,lineCount,rowCount,schemaVersion,slotId`. `ChildDescriptor_S` adds only non-null `descriptorSha256:Hex64`; its complete CJ1 key order is `category,contentSha256,cx,descriptorSha256,lineCount,rowCount,schemaVersion,slotId`. The self-hash is excluded only from its own preimage:

```text
descriptorSha256 = SHA256(
  ASCII("C14A-CHILD-DESCRIPTOR-" || S || "-V1") || NUL ||
  CJ1(ChildDescriptorCore_S))
```

`contentSha256` is the state-specific hash of the complete reserialized slot bytes from §6.2, never projected bytes. Root `children` is exactly `ChildDescriptor_S[91]` ordered CX01..CX13 then `OBJ,ATM,BRN,BDY,DEP,EVT,LOC`; `childInventorySha256` hashes that complete array. Each `ProjectionSlotRow.authorityDescriptorSha256` resolves exactly one member of this array and its selected row IDs/hashes must be a subset of that descriptor's exact state slot. `RenderingSourceSlotSetDescriptor` references projection/slot-row hashes, not ChildDescriptor as a replacement. Root arrays are disjoint roles: `children[91]` proves complete authority slots; `sqlChildSourceSets[22|24]` proves per-rendering-child projected membership. Neither array may be derived from or substituted by the other's aggregate digest.

### 6.6 Profile/root fields, counts, and hash DAG

`Cx08SemanticSealCore={schemaVersion:"C14-RTS-CX08-SEMANTIC-SEAL-V1",semanticCandidateBlob:Hex40,semanticCandidatePath:"knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/CX08_COMMAND_TRACE_COMPLETENESS_ADDENDUM.md",semanticCandidateByteLength:PosInt,semanticCandidateSha256:Hex64,semanticDecisionIds:["CX08-MD01","CX08-MD02","CX08-MD03"],independentPassEvidence:EvidenceRef[],humanApprovalEvidence:EvidenceRef,dbObjectCount:11,dbObjectDelta:0,fragmentSeals:FragmentSeal[11]}`. `Cx08SemanticSeal` adds only `semanticSealSha256=SHA256(ASCII("C14-RTS-CX08-SEMANTIC-SEAL-V1")||NUL||CJ1(core))`. Evidence is nonempty, immutable, and explicitly identifies the same exact candidate blob; Git blob, raw-byte length/SHA-256, path bytes, decision set, object count/delta, all fragment seals, and approval must verify. No current/latest marker, omitted field, null, mutable path lookup, or failed-review evidence is valid.

Relative to the exact Capacity-V2 parent schemas, `profile.cj1` keeps `serializationProfile:"CJ1_CJL1_SQLFRAG_V2"` and changes exactly `schemaVersion`, `rowSchemaVersion`, and `rootSchemaVersion` to `C14P-PROFILE-V2-RTS1A|B`, `C14P-ROW-V2-RTS1A|B`, and `C14P-ROOT-V2-RTS1A|B`. RTS1A adds exactly four fields—`renderingTopologyAddendumBlob`, `renderingTopologyApprovalObservation`, `renderingTopologyState:"RTS1A"`, `renderingDecisionIds:["RTS00","RTS07","RTS12"]`—so it has **24 fields**. RTS1B adds those four with state/decisions `RTS1B/["RTS00","RTS07","RTS08","RTS12"]` plus one `cx08SemanticSeal:Cx08SemanticSeal` field, so it has **25 fields**. No nullable placeholder is valid.

Capacity-V2 `ProposalRootCore` adds exactly seven common fields: `renderingTopologyAddendumBlob`, `renderingTopologyApprovalEvidenceRowId`, `renderingTopologyState`, `renderingDecisionIds`, `renderingProjectionCount`, complete `renderingProjections`, and `renderingTopologySha256`. RTS1A is **46 core/47 total** fields and fixes count/array length 22. RTS1B adds one `cx08SemanticSeal` field and is **47 core/48 total**, count/length 24.

For hashing, each topology approval row resolves to its exact existing `EvidenceRef`; row IDs never enter the topology hash. `TopologyHashCoreA={schemaVersion:"C14-RTS-TOPOLOGY-CORE-RTS1A-V1",state:"RTS1A",renderingTopologyAddendumBlob,renderingTopologyApprovalEvidence:EvidenceRef,renderingDecisionIds:["RTS00","RTS07","RTS12"],renderingProjections:RenderingChildProjection[22]}`. `TopologyHashCoreB` has schema/state `...RTS1B.../RTS1B`, decisions `["RTS00","RTS07","RTS08","RTS12"]`, the same addendum fields, one complete `cx08SemanticSeal:Cx08SemanticSeal`, and `renderingProjections[24]`. Their exact hashes are respectively `SHA256(ASCII("C14-RTS-TOPOLOGY-RTS1A-V1")||NUL||CJ1(TopologyHashCoreA))` and `SHA256(ASCII("C14-RTS-TOPOLOGY-RTS1B-V1")||NUL||CJ1(TopologyHashCoreB))`.

The canonical 13-field authority RootPayload is versioned similarly. It retains all parent fields, replaces `parentBindings` by the exact §6.4 RTS1A[8]/RTS1B[9] array, changes `sqlChildSourceSets` to `RenderingSourceSlotSetDescriptor[22|24]`, and adds seven common fields corresponding to the proposal fields except that topology approval row ID is replaced by its resolved `EvidenceRef`; RTS1A is **20 fields**, has eight parent bindings, and 22 projections/descriptors. RTS1B adds the same complete `cx08SemanticSeal` field, is **21 fields**, has nine parent bindings, and 24 projections/descriptors. Proposal and authority projections, semantic seal, resolved TopologyHashCore, and topology digest must be byte-identical. Authority `children` remains the exact §6.5 91 reserialized state descriptors. Every referenced approval evidence resolves exactly.

### 6.7 File, manifest, and state-specific hash changes

The four proposal file classes and every `.sqlfrag` path stay unchanged. `fragmentSha256=SHA256(ASCII("C14P-OBJECT-BLOCK-V2")||NUL||fragment bytes)` also stays unchanged, permitting the 11 CX08 seals to bind final bytes directly. Proposal ATTACHMENT rows use the state's `C14ChildRTS1` and exact projection child; all row IDs remain stable, but every changed attachment row and every row transitively containing its hash/reference is reserialized. No old proposal or authority root is an input root.

For state `S` equal exactly `RTS1A` or `RTS1B`, the following domain tags and preimages replace only their parent counterparts:

| Value | Exact preimage |
|---|---|
| `profileSha256` | `SHA256(ASCII("C14P-PROFILE-V2-"||S)||NUL||exact profile.cj1 bytes)` |
| proposal `rowSha256` | `SHA256(ASCII("C14P-ROW-V2-"||S)||NUL||CJ1(row core))` |
| `rowSetSha256` | `SHA256(ASCII("C14P-ROW-SET-V2-"||S)||NUL||exact proposal-rows.cjl1 bytes)` |
| `proposalRootSha256` | `SHA256(ASCII("C14P-ROOT-V2-"||S)||NUL||CJ1(ProposalRootCore))` |
| authority child-row `sha256` | `SHA256(ASCII("C14A-ROW-"||S||"-V1")||NUL||CJ1(child-row core))` |
| authority slot `contentSha256` | `SHA256(ASCII("C14A-CHILD-CONTENT-"||S||"-V1")||NUL||exact slot CJL1 bytes)` |
| authority `descriptorSha256` | `SHA256(ASCII("C14A-CHILD-DESCRIPTOR-"||S||"-V1")||NUL||CJ1(descriptor core))` |
| `childInventorySha256` | `SHA256(ASCII("C14A-CHILD-INVENTORY-"||S||"-V1")||NUL||CJ1(91 descriptors))` |
| `parentBindingsSha256` | `SHA256(ASCII("C14A-PARENTS-"||S||"-V1")||NUL||ParentBindingsCJ1_S)` |
| authority `rootSha256` | `SHA256(ASCII("C14A-ROOT-"||S||"-V1")||NUL||CJ1(RootPayload))` |
| `tupleSha256` | `SHA256(ASCII("C14A-AUTHORITY-TUPLE-"||S||"-V1")||NUL||CJ1(tuple core))` |
| `envelopeSha256` | `SHA256(ASCII("C14A-APPROVAL-ENVELOPE-"||S||"-V1")||NUL||CJ1(envelope core))` |

Here `ASCII(prefix||S||suffix)` means literal concatenation before hashing, yielding for example `C14P-ROOT-V2-RTS1A`; it is not CJ1. Every named core excludes only its own displayed self-hash. State-specific authority row/root schema literals match their domain tags. All 91 slot descriptors remain present, including empty slots; an empty authority slot uses its state-specific content domain with no payload bytes. Proposal inventories retain 169 objects/fragments; topology projections and source-set descriptors are additional root arrays, not DB objects or authority slots.

```text
parent semantic rows + state + projections -> complete RTS state rows
RTS state rows -> 91 state slot contents/descriptors -> child inventory hash
RTS state rows/descriptors -> Members_S -> projected content/slot rows
state slot rows -> PSS1_S -> per-child sourceSlotSetSha256
addendum binding + optional CX08 seal -> exact ParentBindingsCJ1_S/hash
approved Cx08SemanticSeal + projections -> renderingTopologySha256
all above + semantic inventories -> proposal/authority root
root + parentBindingsSha256 + review evidence -> tuple -> envelope
sealed fragment bytes -> exact wrappers -> per-child P19 gate
```

No node contains its own hash. Profile/projection/slot/set/topology/root domains are distinct. Aggregate impact is RTS1A: 24 PS + 22 CX = **46 migration-bearing / 48 including gates**; RTS1B: 24 PS + 24 CX = **48 / 50**. Both retain 91 authority slots and 169 objects. Source-set descriptors are 22 or 24, never 13. No downstream numeric ID changes.

Example: the RTS state descriptor for slot `C14A-CX12-OBJ` hashes the complete reserialized CX12 OBJ slot, while G's OBJ `ProjectionSlotRow` points to that descriptor and selects only state rows owned by objects 32, 48, and 49. G's applicable DEP/LOC projection rows follow the same descriptor-subset rule; no non-LOC row enters F/H. A shared LOC enters another child only upon an exact state-row reference. The 91-descriptor root array therefore remains complete while G's source-set digest remains projection-specific.

## 7. Supersession, alternatives, approval, and review

This narrowly supersedes the old `C14-16`, `C14-18`, and `C14-33` attachment values; canonical `C14Child` enum/pair table; 13-child CSS1 cardinality; “13 generated CX SQL children”; and fixed 214-byte-prefix statement. It does not supersede semantics, object identity/count/order within a projection, P19's 350 gate, or prior non-authority boundaries. Old blocked roots and one-child forecasts remain evidence only and cannot be adopted.

Rejected alternatives: semantic compression violates P19; topology-only splitting without projection/source-set versioning permits substitution; one atomic three-CX approval unnecessarily blocks CX07/CX12 on unresolved CX08. **Recommendation:** approve two cumulative finite packages: Package A = non-severable `RTS00+RTS07+RTS12` (`RTS1A`); Package B = non-severable `RTS00+RTS07+RTS08+RTS12+one exact approved Cx08SemanticSeal` (`RTS1B`, superseding RTS1A). RTS00 bytes must be identical in both; conflicting selections require RTS2.

**Exact approval questions after independent PASS:**

1. Does Franco approve Package A on this exact reviewed blob—`RTS00`, `RTS07`, and `RTS12`—solely to authorize later non-executable per-child proposal regeneration and review?
2. After the CX08 semantic candidate is independently passed and approved, does Franco approve cumulative Package B on this exact topology blob and the exact `Cx08SemanticSeal.semanticSealSha256`—`RTS00`, `RTS07`, `RTS08`, `RTS12`, the sealed semantic candidate, and all 11 sealed fragments—only if §4's equations instantiate at `<=350`?

Independent review must recompute all parent/document blobs; verify the exact 8/9 ParentBinding entries, insertion order, instantiated identity constructors, CJ1 bytes, parent-binding hashes, both seven-field/eight-field ChildDescriptor forms and 91-row arrays, set union/disjointness, full parent→RTS state reserialization, state-only membership/preimages, canonical order, empty behavior, snapshots, predecessor DAG, exact CX07/CX08/CX12 generated-edge sets, 22/24 projections/source-set descriptors, the complete CX08 semantic seal, formulas/margins, profile/root field counts, and non-authority language; then run `git diff --check -- knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/RENDERING_TOPOLOGY_SPLIT_ADDENDUM.md`. The document cannot contain its own Git blob without circularity; the reviewer reports the exact blob externally and Franco's answer must quote it.
