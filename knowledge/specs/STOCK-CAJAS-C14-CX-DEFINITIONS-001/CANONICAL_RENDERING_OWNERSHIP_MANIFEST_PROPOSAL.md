# C14 Canonical Rendering, Ownership, and Completeness Manifest Proposal

Status: **PROPOSED / HUMAN APPROVAL REQUIRED / NON-EXECUTABLE**

This revision responds to an independent **FAIL** on proposal blob `59d07fde1b0c12dd17a2a9c7c4136c4e2dfb997f`. Every new rule is **PROPOSED** unless labelled **BOUND**. This file authorizes no child-manifest authoring, SQL, transformation, migration, Prisma, database/network operation, runner invocation, external root, binding edit, Git publication, deployment, or production action.

## 1. P01 — immutable parents and precedence

| Rank | Authority | Immutable identity | State |
|---:|---|---|---|
| 1 | Future approved authority tuple defined in §2.4 and verified under §10 | exact tuple bytes and `rootSha256` | PROPOSED; absent |
| 2 | Binding Finalization Addendum | Git blob `a860049af04a6ff07fbe9fae6ddb512a8ef0adc8` | BOUND; reverified before this revision |
| 3 | J1/P3/integrated D3 | `RECOMMENDED_PACKAGES.md` blob `0fd2959cd149d3c37b4162cdb2c232dd9dd35a71`; #4767/#4769/#4771 | BOUND |
| 4 | Matrix/decision framing | `MATRICES_PROPOSAL.md` blob `4f8536560fd94ba0af92091739a333986ee75eee`; `DECISION_PACKET.md` blob `fcaa6460fa96a032d4e803bd1c393d965a03d6d1` | BOUND only where approved |
| 5 | C14 topology | blob `b8608a922d2d9adf5d776673252f709c52d4a518` | BOUND |
| 6 | C13 structure | commit `0faf2f55e178f1b111c5ae108380a505a68c8feb`; schema blob `47313a8a85ac71ac56df93ce212593820cb95a13` | BOUND structure only |
| 7 | C04/C05 | #4318r1/#4319r2/#4321; #4324r3/#4329 | BOUND within closures |

**PROPOSED precedence:** lower ranks may render only semantics fixed by higher ranks. Silence, conflict, absent exact locator, or multiple renderings is `UNRESOLVED`. Generated hashes, counts, catalog rows, vectors, SQL, and summaries never outrank approved source bytes.

## 2. P02 — exact serialization and hash domains

### 2.1 Canonical JSON (`CJ1`)

**PROPOSED:** UTF-8 without BOM; Unicode strings NFC; object keys unique and sorted by Unicode scalar value; arrays preserve declared order; only `null`, Boolean, base-10 integers with no leading zero, strings, arrays, and objects are permitted; floating-point numbers are forbidden. Strings use JSON escaping only for quotation mark, reverse solidus, and U+0000–U+001F, with lowercase `\u00xx`; all other characters are literal UTF-8. No insignificant whitespace exists. A CJ1 document is `canonicalValue + LF`. CJ1 comparison and ordering use the resulting unsigned UTF-8 bytes.

### 2.2 Canonical JSONL (`CJL1`)

**PROPOSED:** each row is one CJ1 value without its terminal LF, followed by one LF; zero blank lines; rows ordered by `(cxOrdinal, categoryRank, rowOrdinal, id)` where `CX01..CX13=1..13`, `SEED=0,OBJ=1,ATM=2,BRN=3,BDY=4,DEP=5,EVT=6,LOC=7`, integers ascending, then ID UTF-8 bytes. CR, BOM, duplicate ID, duplicate ordinal, or nonterminal LF fails.

### 2.3 Hash function and preimages

All hashes below are lowercase SHA-256. `||` means byte concatenation and `NUL` is one `00` byte.

| Hash | Exact preimage |
|---|---|
| Row `sha256` | `ASCII("C14A-ROW-V1") || NUL || CJ1(row without sha256)` |
| Child `contentSha256` | `ASCII("C14A-CHILD-CONTENT-V1") || NUL || exact CJL1 row bytes` |
| Child `descriptorSha256` | `ASCII("C14A-CHILD-DESCRIPTOR-V1") || NUL || CJ1(descriptor without descriptorSha256)` |
| `childInventorySha256` | `ASCII("C14A-CHILD-INVENTORY-V1") || NUL || CJ1(the exact ordered array of 91 complete ChildDescriptor objects)` |
| `rootSha256` | `ASCII("C14A-ROOT-V1") || NUL || CJ1(root payload defined below)` |
| Authority tuple hash | `ASCII("C14A-AUTHORITY-TUPLE-V1") || NUL || CJ1(authority tuple without tupleSha256)` |
| Approval envelope hash | `ASCII("C14A-APPROVAL-ENVELOPE-V1") || NUL || CJ1(approval envelope without envelopeSha256)` |

### 2.4 Closed schemas

All objects below reject unknown or duplicate keys. Every listed field is required and non-null unless explicitly marked nullable. Arrays are required; empty-array rules are stated per field. There are no optional object fields.

**Scalar domains:** `Hex40` is lowercase `[0-9a-f]{40}`; `Hex64` is lowercase `[0-9a-f]{64}`; `UInt` is a CJ1 integer `0..9007199254740991`; `PosInt` is `1..9007199254740991`; `NString` is an NFC string of 1..1024 Unicode scalar values with no NUL or C0 control; `RepoPath` is an `NString` using forward slashes, no leading slash, empty/dot/dot-dot segment, or backslash; `UtcMillis` is exactly UTC RFC3339 `YYYY-MM-DDTHH:MM:SS.sssZ`; `SqlUtf8Lf` is an NFC string whose encoded bytes contain no BOM/NUL/CR, end in exactly one LF, contain no trailing space/tab before any LF, and are non-empty; `Cx` is one literal `CX01..CX13`; `Category` is one literal `OBJ|ATM|BRN|BDY|DEP|EVT|LOC`; `C14Child` is one literal `C14-01|C14-06|C14-08|C14-10|C14-12|C14-14|C14-16|C14-18|C14-20|C14-22|C14-26|C14-33|C14-37`; `SlotId` is the literal grammar `C14A-CX(01..13)-(OBJ|ATM|BRN|BDY|DEP|EVT|LOC)`; `RowId` is `SlotId` plus `-dddd` with `dddd=0001..9999`; `ObjectId` is an `NString` matching `^(extension|check|function|trigger|exclusion|constraintTrigger):` followed by one exact §5 physical identity; `PhysicalRelation` is either `null` only under the rules below or a quoted `"public"."identifier"`; `PhysicalColumn` is a quoted PostgreSQL identifier; `Attachment` is the object `{c14Child:C14Child,afterSnapshot,coversSnapshots}` where `afterSnapshot` is respectively one literal `baseline|S04|S05|S06|S07|S08|S09|S10|S11|S12|S15|S21|S24`, and `coversSnapshots` is respectively `[]`, `["S04"]`, `["S05"]`, `["S06"]`, `["S07"]`, `["S08"]`, `["S09"]`, `["S10"]`, `["S11"]`, `["S12"]`, `["S13","S14","S15"]`, `["S16","S17","S18","S19","S20","S21"]`, `["S24"]` in the fixed C14Child order. No other pairing is valid.

**EvidenceRef** is exactly one variant: `{kind:"ENGRAM",observationId:PosInt,revision:PosInt,contentSha256:Hex64}` or `{kind:"GIT_BLOB",blob:Hex40,path:RepoPath}`. Engram `contentSha256=SHA256(exact UTF-8/LF observation-export bytes with one terminal LF)`; Git evidence is identified by the Git blob algorithm and path. It contains no free-form evidence payload. `EvidenceRef[]` is non-empty and ordered by `(kind, observationId/revision or blob/path bytes)` with duplicates forbidden wherever used.

**ParentBinding** is `{rank:PosInt,authority:NString,identity:NString,state:"BOUND"|"PROPOSED_ABSENT"}`. The root has exactly seven, rank `1..7`, in rank order and byte-equal identities to §1.

**Root payload** is `{schemaVersion:"C14A-ROOT-V1",rootId:"C14-CX-AUTHORITY-ROOT-V1",proposalBlob:Hex40,parentBindings:ParentBinding[7],coreDecisionIds:["P01","P02","P03","P04","P05","P06","P07","P08","P09","P10","P11","P12","P13","P14","P15","P16","P17","P18","P19"],p16Choice:"A"|"B",u01Choice:"A"|"B",u02Choice:"A"|"B",normalizationProfileId:"C14A-NORM-V1",seedRegistrySha256:Hex64,childInventorySha256:Hex64,sqlChildSourceSets:SourceSlotSetDescriptor[13],children:ChildDescriptor[91]}`. Decision IDs, source sets, and children use their canonical orders; none may be empty.

**ChildDescriptor** is `{schemaVersion:"C14A-CHILD-DESCRIPTOR-V1",slotId:SlotId,cx:Cx,category:Category,rowCount:UInt,lineCount:UInt,contentSha256:Hex64,descriptorSha256:Hex64}`. `rowCount=0` requires `lineCount=0` and exact empty CJL1 bytes; otherwise `lineCount=rowCount` because each canonical row occupies one physical line. Descriptors are ordered by CX then category rank.

For an empty slot, CJL1 content bytes are exactly zero bytes and `contentSha256=SHA256(ASCII("C14A-CHILD-CONTENT-V1") || NUL)`; the slot and descriptor still exist. Non-empty content is the direct concatenation of ordered CJ1 row bytes, each already carrying exactly one LF.

**Child row common schema** is `{schemaVersion:"C14A-ROW-V1",id:RowId,slotId:SlotId,cx:Cx,category:Category,rowOrdinal:PosInt,seedIds:SeedId[],ownerObjectId:ObjectId|null,ownerRelation:PhysicalRelation,attachment:Attachment,sourceLocatorIds:RowId[],canonicalPayload:Payload(category),sha256:Hex64}`. `seedIds` is non-empty, duplicate-free, sorted by UTF-8 bytes. For LOC, owner fields are null and `sourceLocatorIds=[]`; for the CX01 extension OBJ, owner fields are also null but source locator IDs remain non-empty; every other row has non-null owner fields and non-empty source locator IDs. Locator IDs are duplicate-free, sorted, match `C14A-<same CX>-LOC-dddd`, and resolve inside that LOC slot. `rowOrdinal` is contiguous from 1 in CJL1 order; id/slot/cx/category must agree lexically.

**Category payloads:**

- OBJ: `{objectClass:"extension"|"check"|"function"|"trigger"|"exclusion"|"constraintTrigger",sqlIdentity:NString,declarationUtf8Lf:SqlUtf8Lf,expressionRoots:ExpressionRootRecord[]}`. Extension owner relation is null; every other owner relation is non-null. `sqlIdentity` is the exact quoted physical identity, not a logical alias. `expressionRoots` is empty only when the declaration contains no Boolean-bearing source span; otherwise it is non-empty and sorted by `(span.startByte,expressionRootId)`.
- ATM: `{atomicExpressionUtf8Lf:SqlUtf8Lf,reuseMode:"SINGLE_OCCURRENCE"|"REUSABLE_IDENTICAL"}`. An ATM is one Boolean primary leaf only. Its parsed root may be a comparison, NULL/TRUE/FALSE test, Boolean-returning call, or EXISTS primary, but may contain no top-level or nested unassigned Boolean `AND`, `OR`, unary `NOT`, CASE condition, PL/pgSQL condition, or second Boolean primary. Every nested Boolean-bearing subspan, including a subquery WHERE/HAVING/FILTER condition, receives its own ExpressionRootRecord and ATM leaves; it cannot be hidden inside an ATM.
- BRN: `{decisionPointId:DecisionPointId,outcomeOrdinal:PosInt,outcomeKind:"WHEN"|"ELSE"|"OTHERS"|"LOOP_TAKEN"|"LOOP_NOT_TAKEN"|"WHILE_TRUE"|"WHILE_NOT_TRUE"|"IMPLICIT_FALLTHROUGH"|"IMPLICIT_RETHROW_REMAINDER"|"IMPLICIT_RETHROW_QUERY_CANCELED"|"IMPLICIT_RETHROW_ASSERT_FAILURE"|"IMPLICIT_NULL"|"IMPLICIT_CASE_NOT_FOUND",selectionRule:"IS_TRUE"|"IS_NOT_TRUE"|"MATCHES"|"UNCONDITIONAL",conditionKind:"BOOLEAN_ROOT"|"MATCH_VALUE"|"UNCONDITIONAL",conditionExpressionRootId:ExpressionRootId|null,conditionValueSpan:SourceSpan|null,resultCode:"RETURN_NEW"|"RETURN_OLD"|"RAISE"|"CREATE_EXTENSION"|"EXECUTE_SPAN"|"LOOP_ENTER"|"LOOP_EXIT"|"LOOP_CONTINUE"|"RESULT_NULL"|"CASE_NOT_FOUND"|"NO_OP"|"RETHROW",resultPayload:BranchResult,terminalBehavior:"RETURN"|"RAISE"|"FALLTHROUGH"|"CONTINUE_BODY"|"ENTER_LOOP_BODY"|"LOOP_EXIT"|"NEXT_ITERATION"|"RETHROW"|"YIELD_VALUE"|"YIELD_NULL",nestedDecisionPointIds:DecisionPointId[]}`. It contains no free-form condition or generic outcome and must equal the corresponding DecisionOutcome after renaming `ordinal→outcomeOrdinal` and omitting only `branchRowId`.
- BDY: `{functionIdentity:ObjectId,declarationAndBodyUtf8Lf:SqlUtf8Lf,loops:LoopRecord[],expressionRoots:ExpressionRootRecord[],decisionPoints:DecisionPointRecord[]}`; function identity must equal `ownerObjectId` and the bytes include complete header, body, `END;`, dollar terminator, and statement semicolon. Arrays may be empty only when mechanical extraction finds no corresponding site and otherwise use source-span order.
- DEP: `{fromObjectId:ObjectId,toObjectId:ObjectId,referenceKind:"EXECUTES"|"READS"|"WRITES"|"VALIDATES"|"REQUIRES"}`; it must equal the common owner object and one approved dependency seed edge.
- EVT: `{triggerObjectId:ObjectId,timing:"BEFORE"|"AFTER",level:"ROW",event:"INSERT"|"UPDATE"|"DELETE",updateColumns:null|PhysicalColumn[]}`. `updateColumns` is null for INSERT/DELETE and U02-A UPDATE; for U02-B UPDATE it is non-empty, duplicate-free, in physical table ordinal order.
- LOC: `{authorityId:NString,authorityRevisionOrBlob:NString,sectionPath:NString,fragmentUtf8LfSha256:Hex64}`. All strings are non-empty; source-fragment bytes are constructed by the exact `lfTerminated(raw)` rule below and `fragmentUtf8LfSha256=SHA256(those bytes)`. The locator is not a regex or mutable line range.

There is no template payload, placeholder grammar, or deferred body field in V1. OBJ and BDY carry final complete `SqlUtf8Lf` bytes; a future authoring tool may use private templates, but template bytes cannot enter or substitute approved authority.

`Payload(category)` means exactly the matching category payload variant above and no other variant. `ExpressionRootId` is `C14E-CXnn-dddd`, `AtomOccurrenceId` is `C14O-CXnn-dddd`, `DecisionPointId` is `C14D-CXnn-dddd`, and `LoopId` is `C14L-CXnn-dddd`; each sequence is contiguous within its CX after source-span ordering.

**SourceSpan** is `{ownerObjectId:ObjectId,containerField:"declarationUtf8Lf"|"declarationAndBodyUtf8Lf",startByte:UInt,endByte:PosInt,rawSpanSha256:Hex64,normalizedSpanUtf8Lf:SqlUtf8Lf,normalizedSpanSha256:Hex64}`. Offsets are zero-based half-open UTF-8 byte offsets, satisfy `startByte<endByte`, land on code-point boundaries, and remain inside the named exact OBJ/BDY field. Let `raw` be those exact sliced bytes. `rawSpanSha256=SHA256(ASCII("C14A-SOURCE-SPAN-V1") || NUL || raw)`. Define `lfTerminated(raw)` exactly: if the final byte is `0A`, return `raw` unchanged; otherwise return `raw || 0A`. It never trims an existing LF and never appends a second LF to a span already ending in LF. Locator fragment bytes for this span are exactly `lfTerminated(raw)` and `fragmentUtf8LfSha256=SHA256(lfTerminated(raw))`. Normalization tokenizes PostgreSQL/PLpgSQL, removes comments, converts each non-literal inter-token whitespace run to one ASCII space, trims all outer whitespace including any existing terminal LF to form `normalizedCore`, preserves every token/literal/quoted/dollar-quoted byte and parenthesis in original order, then sets `normalizedSpanUtf8Lf=normalizedCore || LF` exactly once; `normalizedSpanSha256=SHA256(ASCII("C14A-NORMALIZED-SPAN-V1") || NUL || normalizedSpanUtf8Lf bytes)`. Normalization never reorders, folds, distributes, negates, or evaluates expressions.

**BooleanNode** preserves parsed source order and grouping: `{kind:"TRUE"}` or `{kind:"FALSE"}`; `{kind:"ATOM",atomRowId:RowId,occurrenceId:AtomOccurrenceId,span:SourceSpan}`; `{kind:"GROUP",child:BooleanNode}`; `{kind:"NOT",child:BooleanNode}`; `{kind:"AND",children:BooleanNode[]}` or `{kind:"OR",children:BooleanNode[]}` with arity 2..256. GROUP/NOT have arity 1; other leaves arity 0. AND/OR children remain left-to-right source order—never sorted or deduplicated—and explicit GROUP nodes are never flattened. Maximum depth is 64 and total nodes 4096. This preserves SQL three-valued semantics, parentheses, and potential evaluation/error behavior.

**ExpressionRootRecord** is `{expressionRootId:ExpressionRootId,ownerObjectId:ObjectId,span:SourceSpan,root:BooleanNode,applicableAtomRowIds:RowId[],leafOccurrenceIds:AtomOccurrenceId[]}`. Owner and span owner must equal the containing OBJ/BDY. Atom IDs are unique and byte-sorted; occurrence IDs are unique in left-to-right AST traversal order. The normalized SQL rendered from the root must be byte-equal to `span.normalizedSpanUtf8Lf`; its hash must equal `span.normalizedSpanSha256`. The containing row's `sourceLocatorIds` must include exactly one LOC whose fragment bytes equal `lfTerminated(raw)` and whose hash matches. Every Boolean-bearing owner span has exactly one root record and no two root spans overlap except strict containment for separately parsed nested subquery/branch conditions.

For `SINGLE_OCCURRENCE`, the ATM row appears in exactly one ATOM node across all roots in its CX. For `REUSABLE_IDENTICAL`, it appears one or more times, but every occurrence span normalizes byte-equal to `atomicExpressionUtf8Lf`; each occurrence has a distinct AtomOccurrenceId. For every root, `applicableAtomRowIds` equals the unique ATM IDs reachable from that root and `leafOccurrenceIds` equals its exact traversal leaves. Globally every ATM is reachable under one of these two rules; no orphan ATM, missing ATM, duplicate occurrence ID, or unlisted reachable ATM is valid.

**DecisionOutcome** is `{ordinal:PosInt,branchRowId:RowId,outcomeKind:"WHEN"|"ELSE"|"OTHERS"|"LOOP_TAKEN"|"LOOP_NOT_TAKEN"|"WHILE_TRUE"|"WHILE_NOT_TRUE"|"IMPLICIT_FALLTHROUGH"|"IMPLICIT_RETHROW_REMAINDER"|"IMPLICIT_RETHROW_QUERY_CANCELED"|"IMPLICIT_RETHROW_ASSERT_FAILURE"|"IMPLICIT_NULL"|"IMPLICIT_CASE_NOT_FOUND",selectionRule:"IS_TRUE"|"IS_NOT_TRUE"|"MATCHES"|"UNCONDITIONAL",conditionKind:"BOOLEAN_ROOT"|"MATCH_VALUE"|"UNCONDITIONAL",conditionExpressionRootId:ExpressionRootId|null,conditionValueSpan:SourceSpan|null,resultCode:"RETURN_NEW"|"RETURN_OLD"|"RAISE"|"CREATE_EXTENSION"|"EXECUTE_SPAN"|"LOOP_ENTER"|"LOOP_EXIT"|"LOOP_CONTINUE"|"RESULT_NULL"|"CASE_NOT_FOUND"|"NO_OP"|"RETHROW",resultPayload:BranchResult,terminalBehavior:"RETURN"|"RAISE"|"FALLTHROUGH"|"CONTINUE_BODY"|"ENTER_LOOP_BODY"|"LOOP_EXIT"|"NEXT_ITERATION"|"RETHROW"|"YIELD_VALUE"|"YIELD_NULL",nestedDecisionPointIds:DecisionPointId[]}`. Ordinals are contiguous from 1. Searched Boolean conditions use BOOLEAN_ROOT with IS_TRUE/IS_NOT_TRUE as specified below. Simple-CASE values and every explicit EXCEPTION matcher, including OTHERS, use MATCH_VALUE/MATCHES; an EXCEPTION `conditionValueSpan` covers the exact full source matcher list represented by its ExceptionHandler. ELSE and implicit outcomes use UNCONDITIONAL. Result/terminal compatibility is exact: RETURN_NEW/RETURN_OLD→RETURN, RAISE/CASE_NOT_FOUND→RAISE, LOOP_ENTER→ENTER_LOOP_BODY, LOOP_EXIT→LOOP_EXIT, LOOP_CONTINUE→NEXT_ITERATION, RETHROW→RETHROW, RESULT_NULL→YIELD_NULL, NO_OP→FALLTHROUGH or CONTINUE_BODY, CREATE_EXTENSION→CONTINUE_BODY, and EXECUTE_SPAN→CONTINUE_BODY, FALLTHROUGH, or YIELD_VALUE. EXECUTE_SPAN is invalid for ENTER_LOOP_BODY/LOOP_EXIT/NEXT_ITERATION.

**LoopRecord** is `{loopId:LoopId,ownerBodyObjectId:ObjectId,loopKind:"LOOP"|"WHILE"|"FOR"|"FOREACH",loopSpan:SourceSpan,label:NString|null,parentLoopId:LoopId|null}`. Records are source-span ordered. Labels preserve the parser-resolved identifier and are unique in lexical scope. An unlabeled EXIT/CONTINUE targets the smallest containing loop; a label resolves to exactly one containing LoopRecord. Labeled EXIT targeting a non-loop block is outside V1 and fails authoring rather than being encoded as EXECUTE_SPAN.

**ExceptionHandler** is `{ordinal:PosInt,branchRowId:RowId,conditionSpans:SourceSpan[],conditionKeys:NString[],effectiveConditionKeys:NString[]}`. Arrays are non-empty and source ordered. Keys are exact PostgreSQL condition names, category names, five-character SQLSTATEs, or `OTHERS`. Effective keys remove conditions already matched by earlier handlers and must remain non-empty; duplicate or fully shadowed handlers fail. Selection uses the first ordered handler whose effective PostgreSQL condition set contains the raised SQLSTATE.

**ExceptionCoverage** is `{orderedHandlers:ExceptionHandler[],hasOthers:Boolean,queryCanceledCovered:Boolean,assertFailureCovered:Boolean,complete:Boolean,implicitRethrowKinds:("REMAINDER"|"QUERY_CANCELED"|"ASSERT_FAILURE")[]}`. `hasOthers` is true exactly when one effective handler key is `OTHERS`. `queryCanceledCovered`/`assertFailureCovered` are true exactly when an effective explicit non-OTHERS handler condition set contains SQLSTATE `57014`/`P0004`; `OTHERS` never sets either flag because PostgreSQL excludes those conditions from `OTHERS`. `implicitRethrowKinds` contains REMAINDER exactly when `hasOthers=false`, QUERY_CANCELED exactly when `queryCanceledCovered=false`, and ASSERT_FAILURE exactly when `assertFailureCovered=false`, in that literal order. REMAINDER denotes unmatched SQLSTATEs other than `57014` and `P0004`, so the three implicit kinds are disjoint. `complete = hasOthers && queryCanceledCovered && assertFailureCovered`, equivalently `implicitRethrowKinds=[]`. Each listed kind produces exactly one matching IMPLICIT_RETHROW_* outcome with RETHROW payload of the same kind; no unlisted implicit rethrow outcome is allowed. Errors raised inside a selected handler propagate outside this decision point and are not duplicate outcomes.

**DecisionPointRecord** is `{decisionPointId:DecisionPointId,ownerBodyObjectId:ObjectId,siteKind:"PLPGSQL_IF"|"PLPGSQL_CASE"|"PLPGSQL_EXCEPTION"|"PLPGSQL_LOOP_GUARD"|"PLPGSQL_WHILE_GUARD"|"SQL_CASE",siteSpan:SourceSpan,parentDecisionPointId:DecisionPointId|null,loopTransferKind:"EXIT"|"CONTINUE"|"WHILE"|null,targetLoopId:LoopId|null,targetLoopLabel:NString|null,exceptionCoverage:ExceptionCoverage|null,orderedOutcomes:DecisionOutcome[],branchRowIds:RowId[]}`. Owner is the containing BDY function. Outcomes are non-empty and source ordered; `branchRowIds` is byte-for-byte the ordered projection of outcome branch IDs. Parent is null only for a top-level site; nested sites point to the unique smallest containing decision point. For PLPGSQL_LOOP_GUARD/PLPGSQL_WHILE_GUARD, `loopTransferKind` and `targetLoopId` are non-null and `targetLoopLabel` is the exact parser-resolved label or null for an unlabeled transfer/loop; all three fields are null for every other site kind. `exceptionCoverage` is non-null only for PLPGSQL_EXCEPTION. The containing BDY child row's `sourceLocatorIds` must include exact locator fragments for the site span, every condition/value span, and every EXECUTE_SPAN action, each constructed by `lfTerminated(raw)`.

**BranchResult** is determined by `resultCode`: RETURN_NEW uses `{kind:"RETURN_NEW"}`; RETURN_OLD uses `{kind:"RETURN_OLD"}`; NO_OP uses `{kind:"NO_OP"}`; RESULT_NULL uses `{kind:"RESULT_NULL"}`; CASE_NOT_FOUND uses `{kind:"CASE_NOT_FOUND",sqlstate:"20000"}`; LOOP_ENTER uses `{kind:"LOOP_ENTER",targetLoopId:LoopId,label:NString|null}`; LOOP_EXIT uses `{kind:"LOOP_EXIT",targetLoopId:LoopId,label:NString|null}`; LOOP_CONTINUE uses `{kind:"LOOP_CONTINUE",targetLoopId:LoopId,label:NString|null}`; RETHROW uses `{kind:"RETHROW",unmatchedKind:"REMAINDER"|"QUERY_CANCELED"|"ASSERT_FAILURE"|"CURRENT_EXCEPTION"}`; EXECUTE_SPAN uses `{kind:"EXECUTE_SPAN",actionSpan:SourceSpan}` and binds exact action/value bytes but is prohibited for any loop-control transfer; RAISE uses `{kind:"RAISE",failureFamily:"APPEND_ONLY"|"ROW_OR_CROSS_ROW_GUARD"|"AGGREGATE_OR_SERIALIZATION_GUARD"|"MINIMUM_LINE",messageId:NString}`; CREATE_EXTENSION uses `{kind:"CREATE_EXTENSION",extensionName:"btree_gist",schema:"public",versionSourceLocatorId:RowId}` where the ID resolves to the same CX LOC slot. Loop result target/label must byte-equal its DecisionPoint loop fields. Mismatched variants or empty message IDs fail.

**Normative three-valued branch routing:** `IS_TRUE` selects an outcome only when its BOOLEAN_ROOT evaluates SQL TRUE; FALSE and UNKNOWN do not select it. `IS_NOT_TRUE` selects exactly FALSE or UNKNOWN. In an IF/ELSIF or searched PL/pgSQL/SQL CASE chain, conditions are tested in source order and the first TRUE outcome is selected; FALSE/UNKNOWN proceeds to the next condition and ultimately to explicit ELSE or the required implicit outcome. In a simple CASE, MATCHES selects only when the PostgreSQL equality comparison is TRUE; FALSE/UNKNOWN proceeds, so a NULL comparison does not match unless authored semantics explicitly make it TRUE. EXCEPTION MATCHES uses the first effective ordered handler set containing the raised SQLSTATE; OTHERS is a matcher for every still-unmatched condition except `57014` and `P0004`, never an unconditional branch. EXIT/CONTINUE WHEN has exactly a LOOP_TAKEN `IS_TRUE` outcome carrying LOOP_EXIT/LOOP_CONTINUE and a LOOP_NOT_TAKEN `IS_NOT_TRUE` NO_OP/CONTINUE_BODY outcome; therefore FALSE/UNKNOWN never transfers control. WHILE has exactly WHILE_TRUE `IS_TRUE` LOOP_ENTER/ENTER_LOOP_BODY and WHILE_NOT_TRUE `IS_NOT_TRUE` LOOP_EXIT/LOOP_EXIT outcomes. UNCONDITIONAL is valid only for ELSE and required implicit outcomes after prior ordered candidates fail. No renderer or verifier may coerce UNKNOWN to FALSE before applying these selection rules, although both route identically for `IS_NOT_TRUE`.

**AuthorityTuple** is `{schemaVersion:"C14A-AUTHORITY-TUPLE-V1",rootId:"C14-CX-AUTHORITY-ROOT-V1",proposalBlob:Hex40,parentBindingsSha256:Hex64,seedRegistrySha256:Hex64,childInventorySha256:Hex64,rootSha256:Hex64,independentReviewEvidence:EvidenceRef[],tupleSha256:Hex64}`. `parentBindingsSha256 = SHA256(ASCII("C14A-PARENTS-V1") || NUL || CJ1(root.parentBindings))`. Its evidence array is non-empty. **ApprovalEnvelope** is `{schemaVersion:"C14A-APPROVAL-ENVELOPE-V1",tupleSha256:Hex64,humanApprovalEvidence:EvidenceRef,approvedAt:UtcMillis,envelopeSha256:Hex64}`. Human approval remains outside the tuple to avoid self-reference.

## 3. P03/P05 — stable IDs and 91 finite slots

These are **91 closed child-manifest identities/slots, not existing, authored, reviewed, or approved child contents**.

For each literal CX in `CX01,CX02,CX03,CX04,CX05,CX06,CX07,CX08,CX09,CX10,CX11,CX12,CX13`, the seven literal slot IDs are `C14A-<CX>-OBJ`, `C14A-<CX>-ATM`, `C14A-<CX>-BRN`, `C14A-<CX>-BDY`, `C14A-<CX>-DEP`, `C14A-<CX>-EVT`, and `C14A-<CX>-LOC`. Their Cartesian product is the complete 91-slot inventory; no eighth category, missing slot, alias, or optional slot is valid.

Later row IDs are `C14A-<CX>-<CATEGORY>-dddd`, four decimal digits, beginning `0001` and contiguous in each slot after canonical row ordering. IDs are assigned only after complete seed expansion; content changes after authority approval require a new root version and approval, not hash recomputation under V1.

## 4. P04/P06/P15 — non-circular seeds, locators, and completeness

### 4.1 Seed registry

The seed registry has its own serialization, **CSR1**, and does not reuse CJL1.

`OutputKind` is one literal `OBJ|ATM|BRN|BDY|DEP|EVT|LOC|EXPRESSION_ROOT|ATOM_OCCURRENCE|DECISION_POINT|LOOP_RECORD`. **SeedOutput** is `{outputKind:OutputKind,cardinality:PosInt}`; array is non-empty, ordered by the listed OutputKind order, no duplicate kind. Embedded output kinds count records inside OBJ/BDY payloads rather than child rows. **SeedDependency** is `{toSeedId:SeedId,referenceKind:"EXECUTES"|"READS"|"WRITES"|"VALIDATES"|"REQUIRES"}`; array may be empty, otherwise sorted `(toSeedId UTF-8 bytes,referenceKind)` with duplicates forbidden. `SeedId` is `C14S-CXnn-<seedClass>-dddd`, where seedClass is `OBJECT|RULE|BRANCH_FAMILY|FUNCTION_BODY|TRIGGER_ATTACHMENT|DEPENDENCY|LOCATOR`, and four digits are contiguous within `(CX,seedClass)`.

**SeedLocator** is exactly `{authorityId:NString,authorityRevisionOrBlob:NString,sectionPath:NString,fragmentUtf8LfSha256:Hex64}` with the same fragment-hash algorithm as LOC; locator arrays are non-empty, duplicate-free, sorted by CJ1 bytes. **SeedRowCore** has exactly `{schemaVersion:"C14A-SEED-ROW-V1",proposalBlob:Hex40,coreDecisionDigest:Hex64,seedId:SeedId,cx:Cx,seedClass:"OBJECT"|"RULE"|"BRANCH_FAMILY"|"FUNCTION_BODY"|"TRIGGER_ATTACHMENT"|"DEPENDENCY"|"LOCATOR",sourceLocators:SeedLocator[],expectedOwnerObjectId:ObjectId|null,expectedOwnerRelation:PhysicalRelation,expectedOutputs:SeedOutput[],dependencyTargets:SeedDependency[]}`. Owner fields are both null only for LOCATOR or database extension seeds; otherwise both are non-null. `coreDecisionDigest = SHA256(ASCII("C14A-CORE-DECISIONS-V1") || NUL || CJ1({proposalBlob:Hex40,p01ToP19:["P01","P02","P03","P04","P05","P06","P07","P08","P09","P10","P11","P12","P13","P14","P15","P16","P17","P18","P19"],p16Choice:"A"|"B",u01Choice:"A"|"B",u02Choice:"A"|"B"}))`, instantiated with the selected literal values and no type annotations in the actual CJ1 object.

**SeedRow** has exactly every SeedRowCore field plus final required `seedRowSha256:Hex64`; no other key is allowed. Its hash is `SHA256(ASCII("C14A-SEED-ROW-V1") || NUL || CJ1(SeedRowCore))`; no hash field is in its own preimage.

**CSR1 row bytes** are exact `CJ1(SeedRow)` bytes, including their one terminal LF. Rows are ordered by `(CX ordinal, seedClass rank OBJECT=1,RULE=2,BRANCH_FAMILY=3,FUNCTION_BODY=4,TRIGGER_ATTACHMENT=5,DEPENDENCY=6,LOCATOR=7, seedId UTF-8 bytes)`. CSR1 registry bytes are direct concatenation of ordered row bytes: no prefix, count, blank line, or separator beyond each row's terminal LF; CR/BOM and missing/additional terminal LF fail. The empty-set CSR1 byte string is exactly zero bytes and hashes deterministically, but an authority root rejects an empty seed registry and requires at least one seed for each CX.

`seedRegistrySha256 = SHA256(ASCII("C14A-SEED-REGISTRY-V1") || NUL || CSR1 registry bytes)`. The root and AuthorityTuple both carry this exact digest; every SeedRow carries the exact approved proposal blob and decision digest. Franco's later approval envelope binds the tuple hash. Changing or adding a seed changes its row hash, CSR1 bytes, registry hash, root hash, and tuple hash; recomputing generated child hashes cannot authorize it.

The registry must include every normative unit from Addendum A–D, J1 T01-R01..T12-R05, P3 T13-R01..R03, integrated D3 rows 1..15, C04/C05 named objects, and §5/§7 of this proposal. A broad section seed is invalid: each source decision row, named object, function family, trigger attachment, and dependency edge receives its own seed. No seed registry exists now; it becomes immutable only through the separately reviewed and Franco-approved authority tuple.

### 4.2 Completeness equations

For approved seed set `S` and generated rows `R`:

1. Define `expectedCardinality(seed,kind)` as the matching SeedOutput cardinality, or zero when that output kind is absent. `ExpectedIds(slot) = contiguous IDs 0001..Σ expectedCardinality(seed,slot.category)` after seeds are sorted by `seedId` and each seed's emitted rows by canonical payload bytes.
2. `ActualIds(slot) = IDs in that child`; require exact set and order equality.
3. For each embedded kind, `ExpectedEmbeddedIds(cx,kind)` is the contiguous ExpressionRootId, AtomOccurrenceId, DecisionPointId, or LoopId sequence sized by the approved SeedOutput cardinalities; require exact equality with IDs embedded across that CX's OBJ/BDY payloads.
4. `ExpectedEdges = {(fromObjectId,toObjectId,referenceKind)}` obtained only from approved `DEPENDENCY` seeds plus exact `dependencyTargets` of other approved seeds; require exact equality with DEP rows—no body-parsed edge may silently enlarge it.
5. Every OBJ/ATM/BRN/BDY/DEP/EVT row consumes at least one seed; every seed emits exactly its declared output kinds/cardinalities; every non-LOC row has at least one exact LOC; every SQL reference parsed from OBJ/BDY must equal one approved DEP edge.
6. `BooleanSpans(owner)` is the complete parser-extracted set of CHECK/exclusion predicates, PL/pgSQL IF/ELSIF/CASE/WHEN/WHILE/EXIT-WHEN/CONTINUE-WHEN conditions, SQL CASE-WHEN conditions, and nested SQL WHERE/HAVING/FILTER/ON predicates inside OBJ/BDY bytes. Require exact set equality with that owner's ExpressionRootRecord spans.
7. `AstLeaves(root)` is the left-to-right ATOM-node sequence. Its occurrence IDs equal `leafOccurrenceIds`; its unique atom IDs equal `applicableAtomRowIds`; all ATM rows satisfy the global SINGLE_OCCURRENCE/REUSABLE_IDENTICAL rules. Parsing/rendering/root-span equality and locator equality must all pass.
8. `LoopSites(body)` is the complete parser-extracted set of LOOP/WHILE/FOR/FOREACH constructs. Require exact span equality with BDY `loops`, source-order contiguous LoopIds, exact smallest-containing `parentLoopId`, and exact parser-resolved labels. Every loop-targeting DecisionPoint must resolve to one listed LoopRecord; every WHILE loop has one PLPGSQL_WHILE_GUARD decision point targeting itself.
9. `BranchSites(body)` is the complete parser-extracted set of PL/pgSQL IF/ELSIF chains, searched/simple CASE, EXCEPTION handler groups, WHILE guards, EXIT/CONTINUE WHEN guards, and SQL CASE expressions. Require exact span equality with BDY `decisionPoints`; nested sites use the smallest containing parent. Every syntactic WHEN/THEN, ELSE, exception handler, loop taken/not-taken result, WHILE true/not-true result, and CASE outcome is an outcome. Missing IF ELSE creates IMPLICIT_FALLTHROUGH/NO_OP; missing PL/pgSQL CASE ELSE creates IMPLICIT_CASE_NOT_FOUND/CASE_NOT_FOUND; missing SQL CASE ELSE creates IMPLICIT_NULL/RESULT_NULL. An EXCEPTION point's exact implicit outcomes are the ordered image of `exceptionCoverage.implicitRethrowKinds`: REMAINDER→IMPLICIT_RETHROW_REMAINDER, QUERY_CANCELED→IMPLICIT_RETHROW_QUERY_CANCELED, ASSERT_FAILURE→IMPLICIT_RETHROW_ASSERT_FAILURE; each uses RETHROW with the same unmatchedKind.
10. For each decision point, outcomes and `branchRowIds` are exact ordered bijections; each BRN payload must byte-equal its DecisionOutcome condition/result/terminal fields and carry one concrete BranchResult. Every BRN belongs to exactly one decision point/outcome; no orphan, duplicate, generic outcome, or unrepresented nested/exception branch exists. Outcome selection fields must satisfy the normative three-valued routing contract above.
11. BDY contains complete function bytes; EVT set equals §7 plus selected U02. Any parser error, unclassified Boolean span, loop, or control-flow site, unsafe hidden Boolean in ATM, unresolved loop target, exception-coverage mismatch, or span mismatch fails authority construction.

This proposal approves the seed schema and equations only. It does not supply or approve the future finite seed rows, atoms, branches, bodies, dependencies, or locators and therefore does not claim semantic closure today.

### 4.3 Worked internal model audit

**Three-valued Boolean example (illustrative, not authored authority):** owner span `("a" IS NULL OR "b" = "a") AND "c" IS TRUE` yields ATM rows `C14A-CX02-ATM-0001="a" IS NULL`, `C14A-CX02-ATM-0002="b" = "a"`, `C14A-CX02-ATM-0003="c" IS TRUE`; root `C14E-CX02-0001=AND(GROUP(OR(C14A-CX02-ATM-0001/C14O-CX02-0001,C14A-CX02-ATM-0002/C14O-CX02-0002)),C14A-CX02-ATM-0003/C14O-CX02-0003)` in source order. With `a=NULL,b=NULL,c=TRUE`, ATM-0001=TRUE, ATM-0002=UNKNOWN, OR=TRUE, result TRUE. Sorting, distributing, replacing `IS TRUE`, or collapsing UNKNOWN is forbidden; normalized root rendering must equal the owner span.

**UNKNOWN IF and nested branch example (illustrative, assuming U01-A solely for the example):** `IF A THEN IF B THEN RETURN NEW; ELSE RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='C14 invariant violation'; END IF; ELSIF C THEN RETURN OLD; END IF;` extracts outer `C14D-CX02-0001` with `C14A-CX02-BRN-0001` (A, IS_TRUE, CONTINUE_BODY, nested `C14D-CX02-0002`), `C14A-CX02-BRN-0002` (C, IS_TRUE, RETURN_OLD/RETURN), and `C14A-CX02-BRN-0003` (IMPLICIT_FALLTHROUGH/UNCONDITIONAL/NO_OP); decision `C14D-CX02-0002` has `C14A-CX02-BRN-0004` (B, IS_TRUE, RETURN_NEW/RETURN) and `C14A-CX02-BRN-0005` (ELSE, UNCONDITIONAL, concrete RAISE/RAISE). If A=UNKNOWN, A does not select BRN-0001 and evaluation proceeds to C; if C is also FALSE/UNKNOWN, only BRN-0003 is selected. A/B/C each point to one ExpressionRootRecord; nested parent is decision 0001; exact BRN set is `{0001,0002,0003,0004,0005}` with no orphan.

**EXIT/CONTINUE examples (illustrative):** `<<outer_loop>> LOOP EXIT outer_loop WHEN done; CONTINUE outer_loop WHEN retry; END LOOP outer_loop;` creates one LoopRecord with label `outer_loop` and two PLPGSQL_LOOP_GUARD points targeting that LoopId. The EXIT point has LOOP_TAKEN/IS_TRUE/LOOP_EXIT/LOOP_EXIT and LOOP_NOT_TAKEN/IS_NOT_TRUE/NO_OP/CONTINUE_BODY; the CONTINUE point has LOOP_TAKEN/IS_TRUE/LOOP_CONTINUE/NEXT_ITERATION and LOOP_NOT_TAKEN/IS_NOT_TRUE/NO_OP/CONTINUE_BODY. Both BranchResult labels are `outer_loop`. If `done` or `retry` is UNKNOWN, its not-taken outcome is selected; no EXECUTE_SPAN represents either transfer. An unlabeled guard carries label null and resolves to the smallest containing loop.

**EXCEPTION coverage examples (illustrative):** `WHEN query_canceled THEN ... WHEN assert_failure THEN ... WHEN OTHERS THEN ...` yields `hasOthers=true`, both covered flags true, `complete=true`, and no implicit rethrow outcome. `WHEN OTHERS THEN ...` yields no REMAINDER but exactly IMPLICIT_RETHROW_QUERY_CANCELED and IMPLICIT_RETHROW_ASSERT_FAILURE, so `complete=false`. `WHEN unique_violation THEN ...` yields exactly IMPLICIT_RETHROW_REMAINDER, IMPLICIT_RETHROW_QUERY_CANCELED, and IMPLICIT_RETHROW_ASSERT_FAILURE in that order. Each implicit outcome uses RETHROW with its matching unmatchedKind; handler-body errors remain outside this decision point.

**Raw-span LF examples (illustrative):** raw bytes `41` (`A`) produce `lfTerminated(raw)=41 0A`; raw bytes `41 0A` produce the same locator fragment bytes without appending another LF. Their `rawSpanSha256` values differ because their raw preimages differ, while both normalize to `41 0A` and therefore have the same normalized-span hash. Raw bytes `41 0A 0A` remain `41 0A 0A` for locator hashing—existing terminal LFs are never trimmed there—but normalize to exactly `41 0A` after outer-whitespace trimming plus one terminal LF. Offsets and raw hash always bind the original slice, never the locator-normalized or token-normalized bytes.

## 5. P07/P14 — exact owner seed requirements

Every later object seed must use an exact `ownerObjectId`; prose families are forbidden. The following **PROPOSED allocation seeds** are mandatory and are not object-body approval:

| CX | Exact owner relation → required object identities or authoring inventory |
|---|---|
| CX01 | database → `extension:btree_gist` |
| CX02 | `StockLotObservation` → `check:ck_slo_correction_shape`, `function:fn_stock_lot_observation_append_only`, `trigger:trg_stock_lot_observation_append_only`; `StockLotReview` → `check:ck_slr_observation_order`, `check:ck_slr_result_shape`, `function/trigger:fn/trg_stock_lot_review_append_only`, `function/trigger:fn/trg_stock_lot_review_coherence`; `StockLot` → `function/trigger:fn/trg_stock_lot_append_only` |
| CX03 | `StockIdentifiedUnitConfigurationVersion` → two version/append-only objects; `StockIdentifiedUnitCurrentConfiguration` → two version/current-guard objects, using the exact current identity registry names |
| CX04 | `StockPosition` → trace/scale checks and parent/append-only pairs; `StockIdentifiedUnitOccupancy` → version check and exclusivity pair |
| CX05 | `StockActivationBoundary` → `check:ck_sab_valid_window`; `StockOpeningPosition` → `check:ck_sop_quantity_nonnegative`, `check:ck_sop_scale_snapshot` only |
| CX06 | `OperationalCommandEffect` → target check/effect append-only; `OperationalCommandAttempt` → outcome check; `OperationalCommandAcceptance` → acceptance append-only/semantic-intent pairs |
| CX07 | `StockEvidence` → record-link check/header append-only; `StockEvidenceLine` → quantity/scale/position checks and line append-only/parent/scale pairs |
| CX08 | `StockReservation` → scope check/root append-only/position pairs; `StockReservationEvidence` → quantity/scale checks and evidence append-only/ceiling pairs |
| CX09 | exact checks: `StockReservationProjection.ck_srp_values`, `StockPositionProjection.ck_spp_values`, `StockCompatibilityReference.ck_scr_scope_key`, `StockCompatibilityReference.ck_scr_target`, `ProjectionReconciliation.ck_pr_version`; no fold/availability object |
| CX10 | exact current/version/line checks and pairs from the C04 registry plus the selected §7 formula minimum-line identities |
| CX11 | exact assignment/preparation/correlation/control checks and ordinary pairs from §8 plus selected §7 control minimum-line identities |
| CX12 | exact 18 checks and 12 append-only pairs already named in C04/J1; §8 replaces one under-attached Stock-link trigger with exact line/disposition trigger identities; ceiling/fold/condition owners are fixed in §8; no minimum-line object |
| CX13 | `StockActivationBoundary.ex_sab_position_window`; opening pair on `StockOpeningPosition`; policy-current pair on `StockArticleEligibility`; selected §7 dispatch/Return/Consumption minimum-line identities |

The **PROPOSED exact object-identity seed inventory** is below. Prefixes are part of each identity. P16 alternatives replace only the ten conditional constraint-trigger identities stated in §7.

| CX | Exact object identities |
|---|---|
| CX01 | `extension:btree_gist` |
| CX02 | `check:ck_slo_correction_shape`; `check:ck_slr_observation_order`; `check:ck_slr_result_shape`; `function:fn_stock_lot_append_only`; `function:fn_stock_lot_observation_append_only`; `function:fn_stock_lot_review_append_only`; `function:fn_stock_lot_review_coherence`; `trigger:trg_stock_lot_append_only`; `trigger:trg_stock_lot_observation_append_only`; `trigger:trg_stock_lot_review_append_only`; `trigger:trg_stock_lot_review_coherence` |
| CX03 | `check:ck_siucv_version_positive`; `check:ck_siucc_version_positive`; `function:fn_stock_unit_config_append_only`; `function:fn_stock_unit_config_current_guard`; `trigger:trg_stock_unit_config_append_only`; `trigger:trg_stock_unit_config_current_guard` |
| CX04 | `check:ck_sp_trace_axis`; `check:ck_sp_scale_range`; `check:ck_siuo_version_positive`; `function:fn_stock_position_parent_guard`; `function:fn_stock_identified_unit_exclusivity`; `function:fn_stock_position_append_only`; `trigger:trg_stock_position_parent_guard`; `trigger:trg_stock_identified_unit_exclusivity`; `trigger:trg_stock_position_append_only` |
| CX05 | `check:ck_sab_valid_window`; `check:ck_sop_quantity_nonnegative`; `check:ck_sop_scale_snapshot` |
| CX06 | `check:ck_oce_target_shape`; `check:ck_ocat_outcome`; `function:fn_operational_acceptance_append_only`; `function:fn_operational_effect_append_only`; `function:fn_operational_semantic_intent_guard`; `trigger:trg_operational_acceptance_append_only`; `trigger:trg_operational_effect_append_only`; `trigger:trg_operational_semantic_intent_guard` |
| CX07 | `check:ck_se_record_links`; `check:ck_sel_qty_positive`; `check:ck_sel_scale`; `check:ck_sel_position_shape`; `function:fn_stock_evidence_append_only`; `function:fn_stock_evidence_line_append_only`; `function:fn_stock_evidence_line_parent_guard`; `function:fn_stock_quantity_scale_guard`; `trigger:trg_stock_evidence_append_only`; `trigger:trg_stock_evidence_line_append_only`; `trigger:trg_stock_evidence_line_parent_guard`; `trigger:trg_stock_quantity_scale_guard` |
| CX08 | `check:ck_sr_scope_key`; `check:ck_sre_qty_positive`; `check:ck_sre_scale`; `function:fn_stock_reservation_append_only`; `function:fn_stock_reservation_evidence_append_only`; `function:fn_stock_reservation_position_guard`; `function:fn_stock_reservation_ceiling`; `trigger:trg_stock_reservation_append_only`; `trigger:trg_stock_reservation_evidence_append_only`; `trigger:trg_stock_reservation_position_guard`; `trigger:trg_stock_reservation_ceiling` |
| CX09 | `check:ck_srp_values`; `check:ck_spp_values`; `check:ck_scr_scope_key`; `check:ck_scr_target`; `check:ck_pr_version` |
| CX10 | `check:ck_cbf_next_version_positive`; `check:ck_cbf_version_positive`; `check:ck_cfv_version_positive`; `check:ck_cfl_quantity_positive`; `check:ck_cfl_scale_snapshot`; `function:fn_cajas_formula_current_guard`; `function:fn_cajas_formula_version_append_only`; `function:fn_cajas_formula_line_append_only`; `function:fn_cajas_formula_version_min_line`; `trigger:trg_cajas_formula_current_guard`; `trigger:trg_cajas_formula_version_append_only`; `trigger:trg_cajas_formula_line_append_only`; two P16 formula constraint-trigger identities |
| CX11 | `check:ck_ca_active_lifecycle`; `check:ck_cp_version_positive`; `check:ck_cpl_values`; `check:ck_crc_preparation_shape`; `check:ck_crc_quantity_shape`; `check:ck_cc_positive_sequence_version`; `check:ck_ccl_quantity_scale`; `function:fn_cajas_assignment_unit_guard`; `function:fn_cajas_preparation_box_guard`; `function:fn_cajas_preparation_pointer_guard`; `function:fn_cajas_correlation_append_only`; `function:fn_cajas_control_append_only`; `function:fn_cajas_control_line_append_only`; `function:fn_cajas_control_min_line`; `trigger:trg_cajas_assignment_unit_guard`; `trigger:trg_cajas_preparation_box_guard`; `trigger:trg_cajas_preparation_pointer_guard`; `trigger:trg_cajas_correlation_append_only`; `trigger:trg_cajas_control_append_only`; `trigger:trg_cajas_control_line_append_only`; two P16 control constraint-trigger identities |
| CX12 | checks `ck_cchg_version_step`, `ck_cchl_change_shape`, `ck_cchl_quantity_scale`, `ck_cd_origin_shape`, `ck_cdp_record_shape`, `ck_cdl_record_sign_shape`, `ck_cdl_quantity_scale`, `ck_cda_version_positive`, `ck_cdla_balance_scale_version`, `ck_crcfn_record_slot_version`, `ck_crl_dispatch_kind_shape`, `ck_crl_quantity_scale`, `ck_ccc_record_slot_version`, `ck_ccln_quantity_scale`, `ck_cdis_owner_shape`, `ck_cdis_record_sign_shape`, `ck_cdis_quantity_scale`, `ck_ccp_counts_version`; functions `fn_cajas_composition_append_only`, `fn_cajas_composition_line_append_only`, `fn_cajas_difference_append_only`, `fn_cajas_difference_resolution_append_only`, `fn_cajas_dispatch_append_only`, `fn_cajas_dispatch_line_append_only`, `fn_cajas_return_append_only`, `fn_cajas_return_line_append_only`, `fn_cajas_replacement_append_only`, `fn_cajas_consumption_append_only`, `fn_cajas_consumption_line_append_only`, `fn_cajas_disposition_append_only`, `fn_cajas_dispatch_ceiling`, `fn_cajas_stock_link_guard`, `fn_cajas_disposition_fold_guard`, `fn_cajas_condition_assignment_guard`; matching append-only triggers plus `trg_cajas_dispatch_ceiling`, `trg_cajas_dispatch_line_stock_link_guard`, `trg_cajas_disposition_stock_link_guard`, `trg_cajas_disposition_fold_guard`, `trg_cajas_condition_assignment_guard` exactly as §8 |
| CX13 | `exclusion:ex_sab_position_window`; `function:fn_stock_opening_guard`; `function:fn_stock_opening_append_only`; `function:fn_stock_policy_current_guard`; `function:fn_cajas_dispatch_min_line`; `function:fn_cajas_return_min_line`; `function:fn_cajas_consumption_min_line`; `trigger:trg_stock_opening_guard`; `trigger:trg_stock_opening_append_only`; `trigger:trg_stock_policy_current_guard`; six selected P16 dispatch/Return/Consumption constraint-trigger identities |

Where a CX12 table says “matching append-only triggers,” the exact identities are obtained by replacing the leading `function:fn_` of each of its first twelve append-only functions with `trigger:trg_`; this is a finite deterministic identity derivation approved by this cell, not author discretion. No trigger corresponds to the four final guard functions except the five exact guard identities stated. Each function seed must later contain complete declaration/body bytes, exact BooleanSpan/ExpressionRoot/ATM inventories, exact DecisionPoint/outcome/BRN inventories, owner spans and locators, exact owner relations read, exact error family, and every directed dependency. The authoring validator must parse first, create complete site inventories, then assign stable IDs; it may not author ATM/BRN rows before the owner root/site sets are frozen. Generic bodies, compound ATM leaves, unbound branches, owner-family aliases, inferred sharing, and deferred content are invalid in an authority tuple.

## 6. P08–P13 — normalization and transaction profile

All are **PROPOSED**: SQL UTF-8/LF/no BOM; quoted, `"public"`-qualified relations/functions; quoted object/column identifiers; uppercase keywords; no ambient `search_path`. Nullable tests use `IS NULL`/`IS NOT NULL`; CHECKs end with `(...) IS TRUE`. Quantity uses `numeric(24,4)`, integral scale `0..4`, no float/round/truncate/epsilon/conversion. Instants use `timestamptz(6)`; intervals are `tstzrange(cutoffAt,COALESCE(validUntil,'infinity'),'[)')`. Stable lock order/retry is exactly Addendum A; other row ordering uses explicit `COLLATE "C"` on text keys. Dedicated functions are `LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''`. No rule here changes Addendum serialization, SQLSTATE retry set, or transaction rollback behavior.

## 7. P16 — complete minimum-line trigger identity alternatives

All ten triggers are `AFTER`, `FOR EACH ROW`, `DEFERRABLE INITIALLY DEFERRED`; header event `INSERT`; line events `UPDATE OR DELETE`.

| Family | Owner pair | Alternative A: relation-qualified same name | Alternative B: deterministic split names |
|---|---|---|---|
| Formula | `"public"."cajas_formula_version"` / `"public"."cajas_formula_line"` | both `ctrg_cajas_formula_version_min_line` | `ctrg_cajas_formula_version_min_line_on_version` / `ctrg_cajas_formula_version_min_line_on_line` |
| Control | `"public"."cajas_control"` / `"public"."cajas_control_line"` | both `ctrg_cajas_control_min_line` | `ctrg_cajas_control_min_line_on_control` / `ctrg_cajas_control_min_line_on_line` |
| Dispatch | `"public"."cajas_dispatch"` / `"public"."cajas_dispatch_line"` | both `ctrg_cajas_dispatch_min_line` | `ctrg_cajas_dispatch_min_line_on_dispatch` / `ctrg_cajas_dispatch_min_line_on_line` |
| Return | `"public"."cajas_return_confirmation"` / `"public"."cajas_return_line"` | both `ctrg_cajas_return_min_line` | `ctrg_cajas_return_min_line_on_return` / `ctrg_cajas_return_min_line_on_line` |
| Consumption | `"public"."cajas_consumption_confirmation"` / `"public"."cajas_consumption_line"` | both `ctrg_cajas_consumption_min_line` | `ctrg_cajas_consumption_min_line_on_consumption` / `ctrg_cajas_consumption_min_line_on_line` |

Alternative A is valid because PostgreSQL trigger names are relation-local, but catalog/review references always require `(schema,relation,triggerName)`. Alternative B is globally readable and matches the current proposed identity inventory at the cost of longer names. **Recommendation: B**, because immutable ledgers and error evidence can identify a trigger without relying on an owner tuple. This is a P16 sub-choice, not approval.

## 8. U02 — exact UPDATE attachment choice

Append-only triggers are excluded from choice and always use all-column `BEFORE UPDATE OR DELETE`; narrowing them permits mutation through an omitted column. INSERT remains unchanged. U02 controls every non-append-only ordinary guard and the five deferred line triggers' `AFTER UPDATE` event.

**U02-A — all-column (recommended):** each ordinary guard is `BEFORE INSERT OR UPDATE`; each deferred line trigger is `AFTER UPDATE OR DELETE`. Any SET target fires the row-level function, including a no-value-change update. This is fail-safe under schema evolution but may execute on irrelevant updates.

**U02-B — exact narrow lists:** each ordinary guard is `BEFORE INSERT OR UPDATE OF <list>` and each deferred line trigger uses the list below. PostgreSQL fires when a listed column appears in SET, regardless of value change. A future semantic column omitted from the frozen list bypasses the trigger until a new approved root is issued.

Physical mapping is pinned to final C13 commit `0faf2f55e178f1b111c5ae108380a505a68c8feb`, schema blob `47313a8a85ac71ac56df93ce212593820cb95a13`, and topology blob `b8608a922d2d9adf5d776673252f709c52d4a518`. Mapping rule: physical relation is exact Prisma `@@map` value or, when absent, the model name; physical column is exact scalar-field `@map` value or, when absent, the field name. Relation pseudo-fields are forbidden. Every later seed must carry a locator to the exact model/field declaration fragment in that schema blob. A missing model, missing scalar field, ambiguous map, duplicate physical name, or field without a pinned physical identifier fails closed.

| Trigger @ exact physical relation | Complete U02-B physical `UPDATE OF` list |
|---|---|
| `trg_stock_lot_review_coherence@"public"."StockLotReview"` | `"companyId","articleId","normalizedLotCode","leftObservationId","rightObservationId","result","resolutionObservationId","canonicalLotId"` |
| `trg_stock_unit_config_current_guard@"public"."StockIdentifiedUnitCurrentConfiguration"` | `"companyId","identifiedUnitId","configurationVersionId","internalCode","serialNumber","version"` |
| `trg_stock_position_parent_guard@"public"."StockPosition"` | `"companyId","articleId","eligibilityId","policyVersionId","contextId","traceMode","lotId","identifiedUnitId","stockUnit","quantityScale","scopeKey"` |
| `trg_stock_identified_unit_exclusivity@"public"."StockIdentifiedUnitOccupancy"` | `"companyId","identifiedUnitId","currentPositionId","version","evidenceWatermark"` |
| `trg_operational_semantic_intent_guard@"public"."OperationalCommandAcceptance"` | `"companyId","domain","sourceOperationId","checkpoint","scopeKey","intentHash","resultEntityType","resultEntityId"` |
| `trg_stock_evidence_line_parent_guard@"public"."StockEvidenceLine"` | `"companyId","evidenceId","articleId","fromPositionId","toPositionId","reservationId"` |
| `trg_stock_quantity_scale_guard@"public"."StockEvidenceLine"` | `"companyId","evidenceId","articleId","quantity","stockUnit","scaleSnapshot"` |
| `trg_stock_reservation_position_guard@"public"."StockReservation"` | `"companyId","positionId","identifiedUnitId"` |
| `trg_stock_reservation_ceiling@"public"."StockReservationEvidence"` | `"companyId","reservationId","sequence","kind","quantity","stockUnit","scaleSnapshot","replacesEvidenceId","acceptedAt","commandAcceptanceId"` |
| `trg_cajas_formula_current_guard@"public"."cajas_box_formula"` | `"company_id","box_article_id","current_version_id","next_version_number","version"` |
| `trg_cajas_assignment_unit_guard@"public"."cajas_assignment"` | `"company_id","box_article_id","box_identified_unit_id","active_slot","ended_at","ended_by_id","end_cause","end_command_acceptance_id"` |
| `trg_cajas_preparation_box_guard@"public"."cajas_preparation"` | `"company_id","assignment_id","box_article_id","formula_version_id"` |
| `trg_cajas_preparation_pointer_guard@"public"."cajas_preparation"` | `"company_id","assignment_id","latest_control_id","last_accepted_change_id","version","evidence_watermark"` |
| `trg_cajas_dispatch_ceiling@"public"."cajas_dispatch_line"` | `"company_id","dispatch_id","assignment_id","remito_id","record_kind","accounting_sign","neutralizes_dispatch_line_id","source_control_line_id","source_preparation_id","source_preparation_line_id","article_id","stock_position_id","quantity","stock_unit","scale_snapshot","stock_evidence_line_id"` |
| `trg_cajas_dispatch_line_stock_link_guard@"public"."cajas_dispatch_line"` | `"company_id","dispatch_id","assignment_id","remito_id","article_id","stock_position_id","quantity","stock_unit","scale_snapshot","stock_evidence_line_id"` |
| `trg_cajas_disposition_stock_link_guard@"public"."cajas_disposition"` | `"company_id","dispatch_id","dispatch_line_id","article_id","record_kind","accounting_sign","kind","quantity","stock_unit","scale_snapshot","stock_position_id","return_confirmation_id","consumption_confirmation_id","return_line_id","consumption_line_id","neutralizes_disposition_id","stock_evidence_line_id","command_acceptance_id"` |
| `trg_cajas_disposition_fold_guard@"public"."cajas_disposition"` | `"company_id","dispatch_id","dispatch_line_id","article_id","record_kind","accounting_sign","kind","quantity","stock_unit","scale_snapshot","stock_position_id","return_confirmation_id","consumption_confirmation_id","return_line_id","consumption_line_id","neutralizes_disposition_id","stock_evidence_line_id","command_acceptance_id"` |
| `trg_cajas_condition_assignment_guard@"public"."cajas_condition_projection"` | `"company_id","box_identified_unit_id","assignment_id"` |
| `trg_stock_opening_guard@"public"."StockOpeningPosition"` | `"companyId","activationBoundaryId","positionId","cutoffAt","openingEvidenceLineId","quantity","stockUnit","scaleSnapshot","acceptedAt"` |
| `trg_stock_policy_current_guard@"public"."StockArticleEligibility"` | `"companyId","organizationId","articleId","currentPolicyVersionId","version"` |
| selected P16 formula line trigger @ `"public"."cajas_formula_line"` | `"formula_version_id"` |
| selected P16 control line trigger @ `"public"."cajas_control_line"` | `"control_id"` |
| selected P16 dispatch line trigger @ `"public"."cajas_dispatch_line"` | `"dispatch_id"` |
| selected P16 Return line trigger @ `"public"."cajas_return_line"` | `"return_confirmation_id"` |
| selected P16 Consumption line trigger @ `"public"."cajas_consumption_line"` | `"consumption_confirmation_id"` |

This is exactly 25 trigger-list rows and 170 physical trigger-column occurrences. The example mapping is confirmed where applicable: Cajas `companyId → company_id`; unmapped Stock `companyId → companyId`. P16 selects the exact line-trigger name from §7 without changing its physical owner/list.

**Recommendation: U02-A**, because this authority is safety-critical and schema evolution must fail by extra validation, not silently bypass a guard. Franco must choose A or B explicitly.

## 9. U01 — exact failure taxonomy choice

U01 affects only function-raised invariant failures in four families: `APPEND_ONLY`, `ROW_OR_CROSS_ROW_GUARD`, `AGGREGATE_OR_SERIALIZATION_GUARD`, and deferred `MINIMUM_LINE`. Native CHECK/exclusion/FK/unique errors retain PostgreSQL's native codes; Addendum lock/deadlock/serialization codes remain `55P03/40P01/40001` and are not replaced.

Every raised failure uses: `MESSAGE='C14 invariant violation'`; `DETAIL='invariantId=<stable object ID>;owner=<public.relation>;operation=<TG_OP>;family=<family>'`; `HINT='messageId=<stable message ID>'`; `CONSTRAINT=<physical object name>`. Values, IDs from business rows, free text, SQL fragments, and secrets are forbidden. Failure aborts the statement and marks the transaction failed; a deferred minimum-line failure occurs at constraint check/commit and aborts the transaction. Neither alternative is retryable under Addendum A.

| Choice | Exact SQLSTATE | Client consequence | Tradeoff |
|---|---|---|---|
| U01-A | `23514` | classify as `INTEGRITY_CONSTRAINT_VIOLATION`; HTTP/service mapping may use deterministic validation/conflict handling by stable message ID | Aligns trigger-enforced invariants with CHECK semantics; some clients may group it with native CHECK failures |
| U01-B | `P0001` | classify as `DOMAIN_TRIGGER_REJECTION`; clients must add an explicit PostgreSQL procedural-error mapping | Separates procedural rejection, but generic code weakens interoperability and requires custom taxonomy everywhere |

**Recommendation: U01-A (`23514`)** because the functions enforce database invariants and stable DETAIL/HINT/CONSTRAINT fields preserve subtype precision. Franco must choose A or B explicitly.

## 10. P17/P18 — authority verification and invalid current bindings

A future verifier first validates the exact approved authority tuple hash, then proposal/parent hashes, seed registry, 91 descriptors, child bytes, row hashes, completeness equations, owner allocation, BooleanSpan↔ExpressionRoot↔ATM occurrence equality, BranchSite↔DecisionPoint↔BRN bijections, deterministic CSS1 equations, selected P16/U01/U02 choices, SQL parse/dependency equality, and §11 forecasts. Generated catalog/vectors/ledger/SQL are outputs and cannot satisfy authority inputs.

The current 610-row ledger, catalog/vectors, and detached root `89944cd3589a2e26289a79e8a482d3f9e1514c953dc5b2b9af0f5804adc37c91` remain **INVALID AS SEMANTIC AUTHORITY**. Proposal review, Franco's proposal decision, new child hashes, or recomputed old hashes cannot legitimize them. Only a later separately approved remediation may replace them after the authority tuple is approved.

Anti-omission uses approved seed sets/cardinalities plus exact parser-extracted Boolean/branch site equality; anti-invention uses exact owner spans/root rendering/locator hashes; anti-misownership uses approved object seeds and containing OBJ/BDY IDs; anti-substitution compares the exact approved tuple hash and CSS1 descriptor equation. Any orphan ATM/BRN, unrooted Boolean span, uncovered decision site/outcome, duplicate occurrence, span mismatch, or CSS1 membership deviation fails even when aggregate counts and recomputed hashes agree. Arithmetic consistency never proves derivation.

**Hash dependency audit:** two parallel branches feed the root. Seed branch: `proposalBlob + selected decisions → coreDecisionDigest → seedRowSha256 → seedRegistrySha256`. Child branch: `child-row bytes (including seedIds as semantic references, but not seedRegistrySha256) → child-row sha256 → contentSha256/descriptorSha256 → childInventorySha256 → sourceSlotRowSha256/sourceSlotSetSha256`. Then `{proposalBlob,parentBindings,selected decisions,seedRegistrySha256,childInventorySha256,source-slot descriptors} → rootSha256 → tupleSha256 → envelopeSha256`. There is no seed-registry-hash→child-row-hash edge. Completeness equations separately prove that child `seedIds` resolve against the parallel approved registry. `parentBindingsSha256` enters the tuple and derives only from root parent bindings. Locator `fragmentUtf8LfSha256` and Engram EvidenceRef `contentSha256` enter rows/evidence before downstream hashes. Every self-hash field (`sha256`, `seedRowSha256`, `descriptorSha256`, `sourceSlotRowSha256`, `tupleSha256`, `envelopeSha256`) is excluded only from its own named preimage; aggregate digest fields have exact preimages above. No upstream object contains a downstream digest; human approval exists only in the final envelope. No other hash helper or hash field exists in V1.

## 11. P19 — exact rendered SQL line algorithm and ≤350 gate

### 11.1 Source-slot sets

**SourceSlotRowCore** is exactly `{schemaVersion:"C14A-SOURCE-SLOT-ROW-V1",c14Child:C14Child,cx:Cx,slotId:SlotId,contentSha256:Hex64,descriptorSha256:Hex64}`. The slot must belong to the same CX and its hashes must equal the root's ChildDescriptor. **SourceSlotRow** has exactly every SourceSlotRowCore field plus final required `sourceSlotRowSha256:Hex64`, computed as `SHA256(ASCII("C14A-SOURCE-SLOT-ROW-V1") || NUL || CJ1(SourceSlotRowCore))`.

For each literal `x` in CX01..CX13, let `A(x)` be the unique fixed Attachment value paired with x in §2.4, `D(x) = [d in root.children where d.cx=x]` in fixed category rank, and `N(x) = [d in D(x) where d.rowCount>0]`. The exact CSS1 membership equation is `CSSRows(x) = [SourceSlotRow(c14Child=A(x).c14Child,cx=x,slotId=d.slotId,contentSha256=d.contentSha256,descriptorSha256=d.descriptorSha256) for d in N(x)]`. No usage analysis, renderer choice, path scan, parent entry, or manually selected slot participates. Immutable parents are already bound by `root.parentBindings`/`parentBindingsSha256` and MUST NOT be duplicated in CSS1.

**CSS1 set bytes** are the direct concatenation of `CJ1(SourceSlotRow)` bytes from `CSSRows(x)`; every row has exactly one terminal LF, with no blank line, prefix, count, CR, or BOM. Empty slots remain in `root.children` but are excluded solely by `rowCount=0`. A valid root requires `|N(x)|>=1` for every CX; the mathematical empty-set bytes are zero bytes and hash deterministically but cannot enter a valid SourceSlotSetDescriptor. `sourceSlotSetSha256 = SHA256(ASCII("C14A-SOURCE-SLOT-SET-V1") || NUL || CSS1 set bytes)`. Identical ordered ChildDescriptor arrays necessarily produce identical `N(x)`, SourceSlotRows, CSS1 bytes, and set digests; different CSS1 membership with identical descriptors is impossible.

**SourceSlotSetDescriptor** is exactly `{schemaVersion:"C14A-SOURCE-SLOT-SET-DESCRIPTOR-V1",c14Child:C14Child,cx:Cx,rowCount:PosInt,sourceSlotSetSha256:Hex64}` with `rowCount=1..7` equal to the CSS1 row count. The root's `sqlChildSourceSets` contains exactly 13 descriptors in CX order, with one unique c14Child/CX pair from Attachment. Each generated SQL child's third comment carries the matching digest. A source-set row digest is also verified against the root's child descriptors, so neither a mutable file list nor recomputed SQL hash can substitute slots.

### 11.2 Rendered physical lines

Each of the 13 generated CX SQL children, not each authority slot, is measured from its eventual exact UTF-8 bytes. Rendering is:

1. Exactly three one-line comments: `-- c14-cx-child: <C14 child ID>`, `-- authority-root-sha256: <64hex>`, `-- source-slot-set-sha256: <64hex>`.
2. `BEGIN;` plus LF.
3. Object blocks ordered by approved OBJ row ordinal. A block is its exact complete declaration bytes: comments included if approved; function header/body/`END;`/dollar terminator included; trigger/constraint/exclusion statement terminator included. Every block ends in one LF and contains no CR/BOM/trailing horizontal whitespace.
4. Exactly one blank LF-only line between adjacent object blocks; none before the first or after the last.
5. `COMMIT;` plus one terminal LF.

For `n` object blocks with exact per-block LF counts `L_i`, `renderedPhysicalLines = 4 + ΣL_i + max(0,n-1) + 1`. Equivalently, after rendering and validating one terminal LF, it equals the count of byte `0A`; comment, blank, body, and terminator lines all count. ATM/BRN/DEP/EVT/LOC rows add no independent forecast line unless their bytes occur inside an approved object block. Forecast lower/point/upper are all this exact integer; ranges are forbidden.

The child-authoring task must generate all exact object blocks in memory, compute every `L_i`, aggregate by topology attachment CX01..CX13, and fail before acceptance if any result exceeds 350. It may not compress bodies, omit comments/dependencies, or split a topology child to pass. Exceeding 350 requires a separately approved topology/slot amendment and new proposal/root version.

## 12. Decision package and exact sequence

The proposal retains **19 core cells**:

| Cell | Exact subject |
|---|---|
| P01 | parents and precedence |
| P02 | CJ1/CJL1 schemas, hash domains, ExpressionRoot/DecisionPoint records, root and authority tuple |
| P03 | row-ID grammar/versioning |
| P04 | immutable locator schema |
| P05 | 91 child identity/slot inventory |
| P06 | seed registry plus ATM/root/branch/CSS1 completeness equations |
| P07 | CX owner/object allocation requirements |
| P08 | identifier qualification |
| P09 | null semantics |
| P10 | numeric/scale semantics |
| P11 | timestamp/range semantics |
| P12 | deterministic ordering preserving Boolean source order and SQL three-valued semantics |
| P13 | Addendum transaction/lock/retry inheritance |
| P14 | complete function/body, Boolean-span, decision-point, and branch extraction requirement |
| P15 | seed-fixed directed dependencies plus exact root-leaf/decision-BRN relations |
| P16 | minimum-line identity choice: A or B |
| P17 | parallel seed/child hash branches, deterministic CSS1, authority verification/root separation |
| P18 | continued invalidity of current 610-row/root |
| P19 | exact rendered-line algorithm and 350 gate |

P01–P19 are a non-severable core because their schemas, ownership, completeness, hashing, and verification compose one authority graph. `P16-A|B`, `U01-A|B`, and `U02-A|B` are three separately selectable choices recorded inside the approved core; rejecting one alternative does not reopen the other core cells.

**Approval question after independent PASS:** Does Franco approve core P01–P19 on this exact proposal blob and explicitly select one P16 alternative, one U01 alternative, and one U02 alternative, solely to authorize a later request to author the seed registry and 91 child-manifest contents?

Required sequence, with no transitive authority:

1. Independent PASS on this proposal blob.
2. Franco approves core P01–P19 and explicitly selects P16, U01, and U02.
3. Separately authorize seed-registry and 91 child-manifest content authoring.
4. Independent semantic/hash review of the resulting seed registry, child contents, root, and authority tuple.
5. Franco approves the exact authority tuple.
6. Separately authorize remediation of execution bindings.

This proposal is not approved, has no independent PASS, contains no authored child contents, does not create an authority tuple, and is not implementation-ready.
