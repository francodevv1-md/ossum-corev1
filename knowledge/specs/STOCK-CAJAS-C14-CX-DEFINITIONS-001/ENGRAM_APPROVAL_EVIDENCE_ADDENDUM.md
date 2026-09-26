# C14 CX Engram Approval Evidence Addendum

Status: **PROPOSED / HUMAN APPROVAL REQUIRED / NON-EXECUTABLE**

## 1. Purpose, authority, and boundary

This addendum resolves only Engram #4852. Continuous documentary authorization #4842 permits preparation and review, but is not substantive approval evidence and is excluded from the inventory below. This document binds the approved proposal/addendum blobs and the project's established use of explicit Engram observation IDs as approval evidence. It neither claims that a Git document proves human approval nor weakens any approval boundary in `AGENTS.md`.

The current `mem_get_observation(id)` interface exposes a rendered record containing observation ID, type, title, structured `What`/`Why`/`Where`/`Learned` content, and rendered Session, Project, Scope, Topic, Duplicates, Revisions, and Created metadata. It does **not** expose canonical revision-export bytes, an export byte length/hash, a signed server receipt, an immutable revision identifier, a server attestation, deletion history, stale-read proof, or conflict/judgment state. Displayed metadata is verifiable interface output, not a cryptographic immutability guarantee.

No DB or external network access, SQL generation/execution, schema/migration, Prisma, runner, provider/target/binding choice, Git publication, deployment, staging, production, or destructive action is authorized. Local Engram MCP reads and documentary hashing only are permitted.

## 2. Decision cells and alternatives

| Cell | Exact choice | Alternatives / tradeoff | Recommendation |
|---|---|---|---|
| E01 | Replace unavailable proposal-stage `ENGRAM_OBSERVATION` export-byte evidence with `ENGRAM_SEMANTIC_APPROVAL_V1`. | A: externally supplied canonical revision-export bytes are strongest if later attested, but unavailable now. B: semantic projection is mechanically available but trusts Engram's live rendering. C: Git/signed ledger can be stronger, but a ledger entry cannot approve itself and no approved external signer/ledger exists. | **B** |
| E02 | Bind one exact observation ID and closed expected metadata/content/decision tuple; never ID alone. | ID-only permits semantic substitution. | **B** |
| E03 | Parse four exact structured fields and fixed metadata labels by grammar and equality. | Free-form regex or surrounding-chat inference is ambiguous. | **B** |
| E04 | Hash CJ1 projection with a dedicated domain. | Hashing rendered transport text would recreate the unavailable-export dependency. | **B** |
| E05 | Fail closed on any mismatch, ambiguity, truncation, duplicate key/value, or unknown field. | Best-effort acceptance weakens approval. | **B** |
| E06 | Keep a finite five-record parent-approval inventory; additions require an explicit reviewed schema revision and exact row. | Latest-memory lookup, wildcard inventory, and transitive authority are rejected. | **B** |
| E07 | Record unavailable conflict/judgment proof as a residual requiring human reconfirmation at exact-root approval. | Pretending the interface proves absence is false. | **B** |
| E08 | Use revised `-EAV1` profile/row/root/hash domains; old and new evidence forms cannot mix. | Silent mutation under existing literals permits downgrade/substitution. | **B** |
| E09 | Require one independent verifier pass immediately before exact-root approval. | Author-only verification does not separate evidence construction from review. | **B** |
| E10 | Treat semantic integrity separately from server attestation. | Calling this immutable export evidence overstates the trust model. | **B** |

**Single recommendation:** approve E01-B through E10-B as one non-severable package. A future externally attested export or signed ledger may supersede EAV1 only through a separately approved revision; document blobs remain artifact identity, not approval proof.

## 3. Closed `ENGRAM_SEMANTIC_APPROVAL_V1` contract

All objects use parent CJ1 exactly, reject unknown/duplicate keys, and require every listed key. Arrays are ordered and duplicate-free. `ExpectedStructuredContent` values are exact NFC strings, not normalized prose.

```text
ExpectedStructuredContent={what:NString,why:NString,where:NString,learned:NString}
ApprovedArtifact={kind:"GIT_BLOB",objectFormat:"SHA1",hash:Hex40,path:RepoPath}
DecisionTuple={subject:NString,approvedArtifact:ApprovedArtifact,
 selections:NString[],allowedScope:NString[],forbiddenScope:NString[]}
EngramSemanticApprovalV1={schemaVersion:"ENGRAM_SEMANTIC_APPROVAL_V1",
 project:"ossum_cor_project",scope:"project",observationId:PosInt,
 expectedTitle:NString,expectedType:"decision",expectedTopic:NString,
 expectedRevisionCount:PosInt,expectedCreated:NString,
 expectedContent:ExpectedStructuredContent,decision:DecisionTuple}
SemanticApprovalEvidence={evidenceKind:"ENGRAM_SEMANTIC_APPROVAL",
 semanticApproval:EngramSemanticApprovalV1,semanticApprovalSha256:Hex64}
EngramSemanticApprovalInventoryV1={schemaVersion:"ENGRAM_SEMANTIC_APPROVAL_INVENTORY_V1",
 entries:EngramSemanticApprovalV1[5],semanticApprovalSha256s:Hex64[5]}
semanticApprovalSha256=SHA256(ASCII("ENGRAM-SEMANTIC-APPROVAL-V1")||NUL||
 CJ1(EngramSemanticApprovalV1))
engramSemanticApprovalInventorySha256=
 SHA256(ASCII("ENGRAM-SEMANTIC-APPROVAL-INVENTORY-V1")||NUL||
 CJ1(EngramSemanticApprovalInventoryV1))
```

`expectedRevisionCount` and `expectedCreated` are included only because all five live reads expose them. Their equality detects displayed revision drift; it does not prove immutability or clock authenticity.

### Verification algorithm

1. Load the exact finite expected record by `observationId`; call only `mem_get_observation(id)`, never search/latest/topic lookup.
2. Reject tool error, truncation marker, omitted text, non-text result, or an ID other than requested.
3. Parse exactly one header `#<id> [<type>] <title>`, then exactly four body lines in order beginning `**What**: `, `**Why**: `, `**Where**: `, `**Learned**: `, then exactly seven footer lines `Session`, `Project`, `Scope`, `Topic`, `Duplicates`, `Revisions`, `Created` with no unknown or duplicate labels. Session and Duplicates are parsed but are not projected because they are operational metadata; duplicate labels or multiple candidate values fail. A character-scanning fixed-label parser is required; regex/prose search is forbidden.
4. Require exact equality for ID, title, type, project, scope, topic, revision count, created timestamp, and all four structured strings. Project aliases, case folding, trimming, Markdown normalization, and inferred values fail.
5. Derive `decision` only from the inventory entry paired with those exact strings; require exact tuple equality. No surrounding chat, document text, recommendation, or observation relationship may add a selection or permission.
6. Recompute the CJ1/domain hash and evidence-row hash. Any semantic, metadata, schema, or hash mismatch fails.
7. Re-read every ID after the complete root is serialized and before independent sign-off. Any changed rendering/revision fails as stale or revised memory. If the interface later exposes conflict/judgment state, require one unambiguous effective record with no pending/conflicting judgment. Under today's interface that property is `NOT_EXPOSED`; an independent report may issue technical PASS with this explicit residual, but root eligibility remains blocked until Franco reconfirms the finite inventory and exact root in the final approval statement.

## 4. Finite expected parent-approval inventory V1

The following JSON array is normative source notation for exactly five `EngramSemanticApprovalV1` values. A verifier parses it as JSON, rejects duplicate/unknown/missing keys, then serializes each array member independently as parent CJ1 (sorted keys, no insignificant whitespace, exactly one terminal LF). Scope tokens are normative literals supplied here; they are never extracted or inferred from prose. Array order is observation ID order and is semantic. #4842 is absent and MUST NOT produce an evidence row.

```json
[
  {
    "schemaVersion":"ENGRAM_SEMANTIC_APPROVAL_V1","project":"ossum_cor_project","scope":"project","observationId":4802,
    "expectedTitle":"Approved C14 CX canonical rendering proposal","expectedType":"decision","expectedTopic":"architecture/c14-cx-canonical-rendering-approval","expectedRevisionCount":1,"expectedCreated":"2026-08-04 10:14:27",
    "expectedContent":{"what":"Franco explicitly approved the complete non-severable P01–P19 canonical rendering/ownership/completeness proposal at exact Git content hash `b1045fd3f66defcbb0bac7a1cc0adcadf783b81a`, selecting P16-B, U01-A, and U02-A.","why":"Establish the finite semantic contract required to author a canonical seed registry and 91 child manifests without invention, omission, misownership, or substitution.","where":"`knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/CANONICAL_RENDERING_OWNERSHIP_MANIFEST_PROPOSAL.md`.","learned":"Selected P16-B uses deterministic globally identifiable split trigger names; U01-A uses SQLSTATE `23514`; U02-A attaches guards to all-column UPDATE for fail-safe schema evolution. This approval does not authorize seed/manifest authoring, authority tuple approval, execution-binding remediation, runner `run`, Prisma, SQL execution, DB/migrations, external root, or estimation execution; each remains separately gated."},
    "decision":{"subject":"C14_CX_CANONICAL_RENDERING_P01_P19","approvedArtifact":{"kind":"GIT_BLOB","objectFormat":"SHA1","hash":"b1045fd3f66defcbb0bac7a1cc0adcadf783b81a","path":"knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/CANONICAL_RENDERING_OWNERSHIP_MANIFEST_PROPOSAL.md"},"selections":["P16-B","U01-A","U02-A"],"allowedScope":["ESTABLISH_P01_P19_FINITE_SEMANTIC_CONTRACT"],"forbiddenScope":["AUTHOR_SEED_OR_MANIFEST","APPROVE_AUTHORITY_TUPLE","REMEDIATE_EXECUTION_BINDING","RUN_RUNNER","USE_PRISMA","EXECUTE_SQL","ACCESS_DATABASE","CREATE_OR_APPLY_MIGRATION","AUTHOR_EXTERNAL_ROOT","EXECUTE_ESTIMATION"]}
  },
  {
    "schemaVersion":"ENGRAM_SEMANTIC_APPROVAL_V1","project":"ossum_cor_project","scope":"project","observationId":4816,
    "expectedTitle":"Approved P19 proposal serialization addendum","expectedType":"decision","expectedTopic":"architecture/c14-cx-p19-proposal-serialization-approval","expectedRevisionCount":1,"expectedCreated":"2026-08-04 10:44:51",
    "expectedContent":{"what":"Franco explicitly approved the complete non-severable A01–A06 P19 proposal-serialization addendum at exact Git blob `bdc0fd13f3126567ade7e13c8f65f6e376a9940f`.","why":"Resolve proposal-stage header/digest circularity through immutable `.sqlfrag` payloads and deterministic later P19 authority wrappers.","where":"`knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/P19_PROPOSAL_SERIALIZATION_ADDENDUM.md`.","learned":"Approval authorizes only resuming documentary byte-exact SQL/body/locator proposal authoring. It does not authorize SQL execution, seed/91-manifest/root authoring, bindings, migrations, Prisma, DB/network, Git publication, deployment, staging, production, or estimation."},
    "decision":{"subject":"P19_PROPOSAL_SERIALIZATION_A01_A06","approvedArtifact":{"kind":"GIT_BLOB","objectFormat":"SHA1","hash":"bdc0fd13f3126567ade7e13c8f65f6e376a9940f","path":"knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/P19_PROPOSAL_SERIALIZATION_ADDENDUM.md"},"selections":["A01","A02","A03","A04","A05","A06"],"allowedScope":["RESUME_DOCUMENTARY_BYTE_EXACT_SQL_BODY_LOCATOR_PROPOSAL_AUTHORING"],"forbiddenScope":["EXECUTE_SQL","AUTHOR_SEED_OR_91_MANIFEST_OR_ROOT","AUTHOR_BINDING","CREATE_OR_APPLY_MIGRATION","USE_PRISMA","ACCESS_DATABASE_OR_NETWORK","PUBLISH_GIT","DEPLOY","USE_STAGING","USE_PRODUCTION","EXECUTE_ESTIMATION"]}
  },
  {
    "schemaVersion":"ENGRAM_SEMANTIC_APPROVAL_V1","project":"ossum_cor_project","scope":"project","observationId":4831,
    "expectedTitle":"Approved P19 proposal schema-capacity package","expectedType":"decision","expectedTopic":"architecture/c14-cx-p19-schema-capacity-approval","expectedRevisionCount":1,"expectedCreated":"2026-08-04 15:34:27",
    "expectedContent":{"what":"Franco explicitly approved the complete non-severable C01-A through C06-A P19 proposal schema-capacity package at exact Git blob `1304c0911e858a4995f0621a5c478650f4fe4ccd`.","why":"Close all representability, provenance, hashing, locator, decision, inventory, and completeness fields required to author the byte-exact C14 CX SQL/body/locator proposal inside the approved four-class V2 profile.","where":"`knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/P19_PROPOSAL_SCHEMA_CAPACITY_ADDENDUM.md`.","learned":"Approval authorizes only resuming documentary byte-exact proposal authoring using `profile.cj1`, `.sqlfrag`, `proposal-rows.cjl1`, and `proposal-root.cj1`. It does not authorize SQL execution, seed/91-manifest/root/tuple authoring, bindings, runner, Prisma, schema/migrations, DB/network, Git publication, deployment, staging, production, or estimation."},
    "decision":{"subject":"P19_PROPOSAL_SCHEMA_CAPACITY_C01_C06","approvedArtifact":{"kind":"GIT_BLOB","objectFormat":"SHA1","hash":"1304c0911e858a4995f0621a5c478650f4fe4ccd","path":"knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/P19_PROPOSAL_SCHEMA_CAPACITY_ADDENDUM.md"},"selections":["C01-A","C02-A","C03-A","C04-A","C05-A","C06-A"],"allowedScope":["RESUME_DOCUMENTARY_FOUR_CLASS_V2_PROPOSAL_AUTHORING"],"forbiddenScope":["EXECUTE_SQL","AUTHOR_SEED_OR_91_MANIFEST_OR_ROOT_OR_TUPLE","AUTHOR_BINDING","RUN_RUNNER","USE_PRISMA","EDIT_SCHEMA","CREATE_OR_APPLY_MIGRATION","ACCESS_DATABASE_OR_NETWORK","PUBLISH_GIT","DEPLOY","USE_STAGING","USE_PRODUCTION","EXECUTE_ESTIMATION"]}
  },
  {
    "schemaVersion":"ENGRAM_SEMANTIC_APPROVAL_V1","project":"ossum_cor_project","scope":"project","observationId":4841,
    "expectedTitle":"Approved btree_gist staged catalog-binding package","expectedType":"decision","expectedTopic":"architecture/c14-cx-btree-gist-catalog-binding-approval","expectedRevisionCount":1,"expectedCreated":"2026-08-04 21:26:46",
    "expectedContent":{"what":"Franco explicitly approved the complete non-severable `btree_gist` catalog-binding package at exact Git blob `d8fa5b6d14b563f44008ba52234421a09182990a`, selecting CB01-C, CB02-B, CB03-A, CB04-A, CB05-A, CB06-A, and CB07-B.","why":"Establish the staged generic V2C model with 168 concrete objects plus one deferred CX01 extension, followed by separately approved target-specific catalog observation/materialization restoring 169 concrete objects.","where":"`knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/BTREE_GIST_CATALOG_BINDING_ADDENDUM.md`.","learned":"Approval does not authorize proposal/root/manifest/binding authoring, DB/catalog/network access, provider selection, Q01–Q06 authoring/execution, SQL generation/execution, schema/migrations, Prisma, runner, Git publication, deployment, staging, production, or estimation. Each remains separately gated."},
    "decision":{"subject":"C14_CX_BTREE_GIST_CATALOG_BINDING_CB01_CB07","approvedArtifact":{"kind":"GIT_BLOB","objectFormat":"SHA1","hash":"d8fa5b6d14b563f44008ba52234421a09182990a","path":"knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/BTREE_GIST_CATALOG_BINDING_ADDENDUM.md"},"selections":["CB01-C","CB02-B","CB03-A","CB04-A","CB05-A","CB06-A","CB07-B"],"allowedScope":["ESTABLISH_STAGED_GENERIC_V2C_CATALOG_BINDING_MODEL"],"forbiddenScope":["AUTHOR_PROPOSAL_OR_ROOT_OR_MANIFEST_OR_BINDING","ACCESS_DATABASE_OR_CATALOG_OR_NETWORK","SELECT_PROVIDER","AUTHOR_OR_EXECUTE_Q01_Q06","GENERATE_OR_EXECUTE_SQL","EDIT_SCHEMA","CREATE_OR_APPLY_MIGRATION","USE_PRISMA","RUN_RUNNER","PUBLISH_GIT","DEPLOY","USE_STAGING","USE_PRODUCTION","EXECUTE_ESTIMATION"]}
  },
  {
    "schemaVersion":"ENGRAM_SEMANTIC_APPROVAL_V1","project":"ossum_cor_project","scope":"project","observationId":4850,
    "expectedTitle":"Approved multi-relation ownership for shared C14 functions","expectedType":"decision","expectedTopic":"architecture/c14-cx-shared-function-ownership-approval","expectedRevisionCount":1,"expectedCreated":"2026-08-05 08:04:17",
    "expectedContent":{"what":"Franco explicitly approved SFO01-B at exact Git blob `1e5a4df989b9831343a54cd3c62237e4c8916614`.","why":"Represent six intentionally shared functions truthfully with exact ordered two-relation semantic owner sets, avoiding arbitrary primary owners.","where":"`knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/SHARED_FUNCTION_OWNERSHIP_ADDENDUM.md`; downstream staged/materialized V2C profiles and authority manifests.","learned":"SFO01-B adds exactly six proposal OWNER rows while preserving 169 database objects; graph remains six functions, 12 triggers, 12 EXECUTES edges, and 12 relation attachments. Approval authorizes later non-executable proposal reserialization/review under continuous documentary authority #4842, but no DB/SQL execution/migration/provider/production action."},
    "decision":{"subject":"C14_CX_SHARED_FUNCTION_OWNERSHIP_SFO01","approvedArtifact":{"kind":"GIT_BLOB","objectFormat":"SHA1","hash":"1e5a4df989b9831343a54cd3c62237e4c8916614","path":"knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/SHARED_FUNCTION_OWNERSHIP_ADDENDUM.md"},"selections":["SFO01-B"],"allowedScope":["RESERIALIZE_AND_REVIEW_NON_EXECUTABLE_PROPOSAL_UNDER_OBSERVATION_4842"],"forbiddenScope":["ACCESS_DATABASE_OR_NETWORK","EXECUTE_SQL","CREATE_OR_APPLY_MIGRATION","SELECT_PROVIDER","USE_PRODUCTION"]}
  }
]
```

Subjects and artifact paths are unique, stable, nonempty literals. `ApprovedArtifact.path` always identifies the one Git blob-bearing approval artifact and is never derived from `expectedContent.where`; #4850 therefore binds only `SHARED_FUNCTION_OWNERSHIP_ADDENDUM.md`, not the downstream targets named after its semicolon. The exact hash results are listed in §6.

## 5. P19 replacement, schemas, counts, and DAG

Under this revision, `EvidenceEngramObservationV2` and `evidenceKind:"ENGRAM_OBSERVATION"` are superseded and invalid. `EvidenceGitBlobV2Sfo1Eav1` preserves the exact old Git key set. `EvidenceEngramSemanticApprovalV1` is exactly:

```text
{evidenceKind:"ENGRAM_SEMANTIC_APPROVAL",gitObjectFormat:null,blob:null,path:null,
 byteLength:null,byteSha256:null,semanticApproval:EngramSemanticApprovalV1,
 semanticApprovalSha256:Hex64}
```

`EvidenceV2Sfo1Eav1` is the disjoint union of only `EvidenceGitBlobV2Sfo1Eav1` and `EvidenceEngramSemanticApprovalV1`. `ProposalRowV2Sfo1Eav1` is the exact Capacity-V2-SFO1 26-kind/27-variant union with schemaVersion `C14P-ROW-V2-SFO1-EAV1`: the ordered kind set is `EVIDENCE,PROVENANCE,PROPOSED_DECISION,DECISION_ALTERNATIVE,PHYSICAL_IDENTIFIER,OWNER,ATTACHMENT,OBJECT_INVENTORY,SEED_SOURCE,OBJECT,BODY,SOURCE_SPAN,LOCATOR,ATOM,ATOM_OCCURRENCE,BOOLEAN,EXPRESSION_ROOT,LOOP,EXTENSION_DECISION_POINT,DECISION_POINT,DECISION_OUTCOME,BRANCH,ACTION,DEPENDENCY,EVENT,ERROR`. EVIDENCE uses the preceding two variants; OWNER uses exact SFO1 shape; every other variant is type-for-type the approved parent variant with only the common schemaVersion and row-hash domain changed.

`StagedProposalRowV2CSfo1Eav1` is the exact staged union of `ProposalRowV2Sfo1Eav1` adapted to staged schemaVersion `C14P-ROW-V2C-STAGED-SFO1-EAV1`, staged SEED_SOURCE outputs, plus sole `DEFERRED_CATALOG_OBJECT`; it accepts parent `C14P2-*` IDs plus the one approved `C14P2C-*` deferred ID. `MaterializedProposalRowV2CSfo1Eav1` is a normative alias, not a new union:

```text
type MaterializedProposalRowV2CSfo1Eav1 = ProposalRowV2Sfo1Eav1
```

Alias equality is byte-for-byte and type-for-type. It accepts only schemaVersion `C14P-ROW-V2-SFO1-EAV1`, the exact 26-kind/27-variant set above, parent `C14P2-*` IDs, and row domain `C14P-ROW-V2-SFO1-EAV1`; it rejects `DEFERRED_CATALOG_OBJECT`, `C14P2C-*`, staged SEED_SOURCE shape, and staged schemaVersion. The alias has no independent schema or hash domain.

### 5.1 Exact schemaVersion and root-ID literals

| Artifact/type | Exact `schemaVersion` | Exact root ID where applicable |
|---|---|---|
| Semantic projection | `ENGRAM_SEMANTIC_APPROVAL_V1` | — |
| Finite inventory | `ENGRAM_SEMANTIC_APPROVAL_INVENTORY_V1` | — |
| Base row | `C14P-ROW-V2-SFO1-EAV1` | — |
| Staged row/deferred row | `C14P-ROW-V2C-STAGED-SFO1-EAV1` | — |
| Base profile | `C14P-PROFILE-V2-SFO1-EAV1` | — |
| Staged profile | `C14P-PROFILE-V2C-STAGED-SFO1-EAV1` | — |
| Materialized profile | `C14P-PROFILE-V2C-MATERIALIZED-SFO1-EAV1` | — |
| Base root | `C14P-ROOT-V2-SFO1-EAV1` | `C14-CX-PROPOSAL-ROOT-V2-SFO1-EAV1` |
| Staged root | `C14P-ROOT-V2C-STAGED-SFO1-EAV1` | `C14-CX-PROPOSAL-ROOT-V2C-STAGED-SFO1-EAV1` |
| Materialized root | `C14P-ROOT-V2C-MATERIALIZED-SFO1-EAV1` | `C14-CX-PROPOSAL-ROOT-V2C-MATERIALIZED-SFO1-EAV1` |
| Neutral expected-inventory row | `C14P-EXPECTED-OBJECT-INVENTORY-ROW-V1-SFO1-EAV1` | — |
| Staged artifact set | `C14P-ARTIFACT-SET-V2C-STAGED-SFO1-EAV1` | — |
| Materialized artifact set | `C14P-ARTIFACT-SET-V2C-MATERIALIZED-SFO1-EAV1` | — |
| Catalog transition | `C14P-CATALOG-TRANSITION-V1-SFO1-EAV1` | — |
| Catalog request | `C14C-CATALOG-REQUEST-V1-SFO1-EAV1` | — |
| Catalog query result | `C14C-QUERY-RESULT-V1-SFO1-EAV1` | — |
| Catalog observation | `C14C-CATALOG-OBSERVATION-V1-SFO1-EAV1` | — |
| Catalog selection result | `C14C-CATALOG-SELECTION-RESULT-V1-SFO1-EAV1` | — |

Materialized ordinary rows deliberately use `C14P-ROW-V2-SFO1-EAV1`; there is no `C14P-ROW-V2C-MATERIALIZED-SFO1-EAV1` row schema. The staged deferred/common rows use only the staged row literal. Existing stable `C14P2-*` and `C14P2C-*` row-ID grammars do not change.

The EAV1 closure registry contains exactly 33 named types: `ExpectedStructuredContent`, `ApprovedArtifact`, `DecisionTuple`, `EngramSemanticApprovalV1`, `SemanticApprovalEvidence`, `EngramSemanticApprovalInventoryV1`, `EvidenceGitBlobV2Sfo1Eav1`, `EvidenceEngramSemanticApprovalV1`, `EvidenceV2Sfo1Eav1`, `ProposalRowV2Sfo1Eav1`, `StagedProposalRowV2CSfo1Eav1`, `MaterializedProposalRowV2CSfo1Eav1`, `FragmentInventoryEntryV2Sfo1Eav1`, `FragmentInventoryEntryV2CStagedSfo1Eav1`, `FragmentInventoryEntryV2CMaterializedSfo1Eav1`, `ProposalProfileV2Sfo1Eav1Core`, `ProposalProfileV2CStagedSfo1Eav1Core`, `ProposalProfileV2CMaterializedSfo1Eav1Core`, `ProposalRootV2Sfo1Eav1Core`, `ProposalRootV2CStagedSfo1Eav1Core`, `ProposalRootV2CMaterializedSfo1Eav1Core`, `ExpectedObjectInventoryRowV1Sfo1Eav1Core`, `ExpectedObjectInventoryRowV1Sfo1Eav1`, `ConcreteObjectBindingV2CSfo1Eav1`, `DeferredInventoryEntrySfo1Eav1`, `DeferredCatalogObjectV2CStagedSfo1Eav1`, `StagedArtifactSetCoreSfo1Eav1`, `MaterializedArtifactSetCoreSfo1Eav1`, `CatalogSelectionRequestCoreSfo1Eav1`, `QueryResultCoreSfo1Eav1`, `CatalogObservationCoreSfo1Eav1`, `CatalogSelectionResultCoreSfo1Eav1`, and `TransitionCoreSfo1Eav1`. Exact parent nested types not named here are inherited byte-for-byte and MUST NOT accept revised schema/profile literals unless an EAV1 type above contains them.

### 5.2 Exact field and count changes

The three profiles use these exact revision literals; all other fields follow the complete key arrays below and their already bound values:

```text
ProposalProfileV2Sfo1Eav1Core:
 schemaVersion="C14P-PROFILE-V2-SFO1-EAV1"
 serializationProfile="CJ1_CJL1_SQLFRAG_V2_SFO1_EAV1"
 rowSchemaVersion="C14P-ROW-V2-SFO1-EAV1"
 rootSchemaVersion="C14P-ROOT-V2-SFO1-EAV1"
ProposalProfileV2CStagedSfo1Eav1Core:
 schemaVersion="C14P-PROFILE-V2C-STAGED-SFO1-EAV1"
 serializationProfile="CJ1_CJL1_SQLFRAG_V2C_STAGED_SFO1_EAV1"
 rowSchemaVersions=["C14P-ROW-V2-SFO1-EAV1","C14P-ROW-V2C-STAGED-SFO1-EAV1"]
 rootSchemaVersion="C14P-ROOT-V2C-STAGED-SFO1-EAV1"
ProposalProfileV2CMaterializedSfo1Eav1Core:
 schemaVersion="C14P-PROFILE-V2C-MATERIALIZED-SFO1-EAV1"
 serializationProfile="CJ1_CJL1_SQLFRAG_V2C_MATERIALIZED_SFO1_EAV1"
 rowSchemaVersions=["C14P-ROW-V2-SFO1-EAV1"]
 rootSchemaVersion="C14P-ROOT-V2C-MATERIALIZED-SFO1-EAV1"
```

The fragment inventory types are closed and reject unknown/duplicate/missing keys:

```text
FragmentInventoryEntryV2Sfo1Eav1={fragmentPath:RepoPath,cx:Cx,objectOrdinal:Ordinal4,
 objectRowId:ParentProposalRowIdV2,objectId:ObjectId,byteLength:PosInt,lfCount:PosInt,
 fragmentSha256:Hex64,profileVersion:"C14P-PROFILE-V2-SFO1-EAV1",
 ownerRowId:ParentProposalRowIdV2,attachmentRowId:ParentProposalRowIdV2}
FragmentInventoryEntryV2CStagedSfo1Eav1={fragmentPath:RepoPath,cx:Cx,objectOrdinal:Ordinal4,
 objectRowId:ParentProposalRowIdV2,objectId:ObjectId,byteLength:PosInt,lfCount:PosInt,
 fragmentSha256:Hex64,profileVersion:"C14P-PROFILE-V2C-STAGED-SFO1-EAV1",
 ownerRowId:ParentProposalRowIdV2,attachmentRowId:ParentProposalRowIdV2}
FragmentInventoryEntryV2CMaterializedSfo1Eav1={fragmentPath:RepoPath,cx:Cx,
 objectOrdinal:Ordinal4,objectRowId:ParentProposalRowIdV2,objectId:ObjectId,
 byteLength:PosInt,lfCount:PosInt,fragmentSha256:Hex64,
 profileVersion:"C14P-PROFILE-V2C-MATERIALIZED-SFO1-EAV1",
 ownerRowId:ParentProposalRowIdV2,attachmentRowId:ParentProposalRowIdV2}
```

Every entry has exactly 11 fields. Entries have no self-hash. `fragmentSha256` retains exact domain `C14P-OBJECT-BLOCK-V2` because `.sqlfrag` bytes do not change. Arrays are ordered strictly by `fragmentPath` UTF-8 bytes: base/materialized contain 169 entries; staged contains 168 and excludes only `blocks/CX01/0001.sqlfrag`. For each common staged/materialized path, all ten non-`profileVersion` fields are byte-equal; the profileVersion values MUST differ exactly as above. Base/materialized structural schemas share ten field types but are not aliases because their profileVersion literal differs. A stale parent profile literal, cross-state entry, reordered path, or otherwise equal entry under the wrong type fails before inventory hashing.

Root nested references are exact: base `fragmentInventory:FragmentInventoryEntryV2Sfo1Eav1[169]`; staged `fragmentInventory:FragmentInventoryEntryV2CStagedSfo1Eav1[168]`; materialized `fragmentInventory:FragmentInventoryEntryV2CMaterializedSfo1Eav1[169]`. Their array hashes use the state domains in §5.3 and exclude no field.

Each profile adds exactly three fields: `engramApprovalEvidenceAddendumBlob:Hex40`, `engramSemanticApprovalInventoryVersion:"ENGRAM_SEMANTIC_APPROVAL_INVENTORY_V1"`, and `engramSemanticApprovalInventorySha256:Hex64`. Therefore profile field counts are base `25`, staged `29`, materialized `35` (from SFO1 `22/26/32`).

Each root core adds exactly five fields: `engramApprovalEvidenceAddendumBlob:Hex40`, `engramSemanticApprovalInventoryVersion:"ENGRAM_SEMANTIC_APPROVAL_INVENTORY_V1"`, `engramSemanticApprovalInventorySha256:Hex64`, `engramSemanticApprovalEvidenceRowIds:<state-valid evidence row ID>[5]`, and `engramEvidenceDecisionIds:["E01","E02","E03","E04","E05","E06","E07","E08","E09","E10"]`. Root core/total counts are base `47/48`, staged `59/60`, materialized `62/63` (from SFO1 `42/43`, `54/55`, `57/58`). The five evidence-row IDs are in observation-ID order and resolve bijectively to #4802/#4816/#4831/#4841/#4850.

The five old Engram evidence rows are replaced one-for-one: `EVIDENCE_new=EVIDENCE_old`; no sixth row exists. Base/materialized remain 26 row kinds/27 variants; staged remains 27/28. OWNER remains `O_old+6`; DB objects remain 169; fragments remain 168 staged/169 materialized. The decision inventory gains exactly ten selected decision cells after this addendum is approved. EAV substitution itself has zero total-row delta; decision/alternative row cardinalities are governed separately by the exact E01–E10 decision serialization and are not fabricated by this evidence inventory.

The exact profile field-name arrays are:

```text
BaseProfileFieldNames[25]=[schemaVersion,status,serializationProfile,rowSchemaVersion,
 rootSchemaVersion,parentProposalBlob,parentProposalApprovalObservation,
 serializationAddendumBlob,serializationApprovalObservation,capacityAddendumBlob,
 capacityApprovalObservation,bindingAddendumBlob,topologyBlob,c13Commit,c13SchemaBlob,
 p16Choice,u01Choice,u02Choice,artifactClasses,unknownKeys,
 sharedFunctionOwnershipAddendumBlob,sharedFunctionOwnershipApprovalObservation,
 engramApprovalEvidenceAddendumBlob,engramSemanticApprovalInventoryVersion,
 engramSemanticApprovalInventorySha256]
StagedProfileFieldNames[29]=[schemaVersion,status,serializationProfile,rowSchemaVersions,
 rootSchemaVersion,parentProposalBlob,parentProposalApprovalObservation,
 serializationAddendumBlob,serializationApprovalObservation,capacityAddendumBlob,
 capacityApprovalObservation,catalogBindingAddendumBlob,catalogBindingApprovalObservation,
 bindingAddendumBlob,topologyBlob,c13Commit,c13SchemaBlob,p16Choice,u01Choice,u02Choice,
 artifactClasses,unknownKeys,catalogSelectionPolicySha256,catalogStage,
 sharedFunctionOwnershipAddendumBlob,sharedFunctionOwnershipApprovalObservation,
 engramApprovalEvidenceAddendumBlob,engramSemanticApprovalInventoryVersion,
 engramSemanticApprovalInventorySha256]
MaterializedProfileFieldNames[35]=[schemaVersion,status,serializationProfile,rowSchemaVersions,
 rootSchemaVersion,parentProposalBlob,parentProposalApprovalObservation,
 serializationAddendumBlob,serializationApprovalObservation,capacityAddendumBlob,
 capacityApprovalObservation,catalogBindingAddendumBlob,catalogBindingApprovalObservation,
 bindingAddendumBlob,topologyBlob,c13Commit,c13SchemaBlob,p16Choice,u01Choice,u02Choice,
 artifactClasses,unknownKeys,catalogSelectionPolicySha256,catalogStage,stagedProposalRootSha256,
 targetBindingSha256,catalogRequestSha256,catalogSnapshotSha256,catalogSelectionResultSha256,
 catalogOverlayInputSha256,sharedFunctionOwnershipAddendumBlob,
 sharedFunctionOwnershipApprovalObservation,engramApprovalEvidenceAddendumBlob,
 engramSemanticApprovalInventoryVersion,engramSemanticApprovalInventorySha256]
```

The exact root-core field-name arrays are:

```text
BaseRootCoreFieldNames[47]=[schemaVersion,rootId,status,gateState,nonAuthority,profileSha256,
 parentProposalBlob,parentProposalApprovalEvidenceRowId,serializationAddendumBlob,
 serializationApprovalEvidenceRowId,capacityAddendumBlob,capacityApprovalEvidenceRowId,
 bindingAddendumBlob,topologyBlob,c13Commit,c13SchemaBlob,coreDecisionIds,p16Choice,u01Choice,
 u02Choice,serializationDecisionIds,capacityDecisionIds,cxInventory,expectedObjectInventory,
 objectInventorySha256,objectCount,fragmentInventory,fragmentInventorySha256,fragmentCount,
 rowCount,rowCountsByKind,rowSetSha256,proposedDecisionInventory,decisionInventorySha256,
 decisionStatusSummary,completenessSummary,hashCoverage,hashExclusions,nextApprovalBoundary,
 sharedFunctionOwnershipAddendumBlob,sharedFunctionOwnershipApprovalEvidenceRowId,
 ownershipDecisionIds,engramApprovalEvidenceAddendumBlob,
 engramSemanticApprovalInventoryVersion,engramSemanticApprovalInventorySha256,
 engramSemanticApprovalEvidenceRowIds,engramEvidenceDecisionIds]
StagedRootCoreFieldNames[59]=[schemaVersion,rootId,status,gateState,nonAuthority,
 stagedProfileSha256,parentProposalBlob,parentProposalApprovalEvidenceRowId,
 serializationAddendumBlob,serializationApprovalEvidenceRowId,capacityAddendumBlob,
 capacityApprovalEvidenceRowId,bindingAddendumBlob,catalogBindingAddendumBlob,
 catalogBindingApprovalEvidenceRowId,topologyBlob,c13Commit,c13SchemaBlob,coreDecisionIds,
 p16Choice,u01Choice,u02Choice,serializationDecisionIds,capacityDecisionIds,catalogDecisionIds,
 cxInventory,expectedObjectInventory,expectedObjectInventoryCjl1,
 expectedObjectInventorySha256,expectedObjectCount,concreteObjectInventory,
 concreteObjectInventorySha256,concreteObjectCount,deferredCatalogInventory,
 deferredCatalogInventorySha256,deferredCatalogObjectCount,expectedFragmentCount,
 fragmentInventory,fragmentInventorySha256,fragmentCount,rowCount,rowCountsByKind,rowSetSha256,
 artifactSetSha256,proposedDecisionInventory,decisionInventorySha256,decisionStatusSummary,
 completenessSummary,hashCoverage,hashExclusions,nextApprovalBoundary,
 sharedFunctionOwnershipAddendumBlob,sharedFunctionOwnershipApprovalEvidenceRowId,
 ownershipDecisionIds,engramApprovalEvidenceAddendumBlob,
 engramSemanticApprovalInventoryVersion,engramSemanticApprovalInventorySha256,
 engramSemanticApprovalEvidenceRowIds,engramEvidenceDecisionIds]
MaterializedRootCoreFieldNames[62]=[schemaVersion,rootId,status,gateState,nonAuthority,
 materializedProfileSha256,parentProposalBlob,parentProposalApprovalEvidenceRowId,
 serializationAddendumBlob,serializationApprovalEvidenceRowId,capacityAddendumBlob,
 capacityApprovalEvidenceRowId,bindingAddendumBlob,catalogBindingAddendumBlob,
 catalogBindingApprovalEvidenceRowId,topologyBlob,c13Commit,c13SchemaBlob,
 stagedProposalRootSha256,targetBindingSha256,catalogRequestSha256,catalogSnapshotSha256,
 catalogSelectionResultSha256,catalogOverlayInputSha256,transitionSha256,coreDecisionIds,
 p16Choice,u01Choice,u02Choice,serializationDecisionIds,capacityDecisionIds,catalogDecisionIds,
 cxInventory,expectedObjectInventory,expectedObjectInventoryCjl1,
 expectedObjectInventorySha256,expectedObjectCount,concreteObjectInventory,
 concreteObjectInventorySha256,concreteObjectCount,fragmentInventory,fragmentInventorySha256,
 fragmentCount,rowCount,rowCountsByKind,rowSetSha256,artifactSetSha256,
 proposedDecisionInventory,decisionInventorySha256,decisionStatusSummary,completenessSummary,
 hashCoverage,hashExclusions,nextApprovalBoundary,sharedFunctionOwnershipAddendumBlob,
 sharedFunctionOwnershipApprovalEvidenceRowId,ownershipDecisionIds,
 engramApprovalEvidenceAddendumBlob,engramSemanticApprovalInventoryVersion,
 engramSemanticApprovalInventorySha256,engramSemanticApprovalEvidenceRowIds,
 engramEvidenceDecisionIds]
```

These are schema key sets, not serialization order; CJ1 sorts object keys by Unicode scalar value. Each root file adds only `proposalRootSha256`, producing the stated total count. No other profile/root field is present.

The remaining changed nested types are closed as follows:

```text
ExpectedObjectInventoryRowV1Sfo1Eav1Core={
 schemaVersion:"C14P-EXPECTED-OBJECT-INVENTORY-ROW-V1-SFO1-EAV1",
 globalOrdinal:PosInt,cx:Cx,objectOrdinal:Ordinal4,objectId:ObjectId,
 objectClass:"extension"|"check"|"function"|"trigger"|"exclusion"|"constraintTrigger",
 ownerIdentity:ExpectedOwnerIdentitySfo1,physicalIdentity:ExpectedPhysicalIdentityV1,
 attachmentIdentity:ExpectedAttachmentIdentityV1,expectedFragmentPath:RepoPath}
ExpectedObjectInventoryRowV1Sfo1Eav1=ExpectedObjectInventoryRowV1Sfo1Eav1Core+
 {rowSha256:Hex64}
ConcreteObjectBindingV2CSfo1Eav1={expectedObjectRowSha256:Hex64,
 inventoryRowId:ParentProposalRowIdV2,objectRowId:ParentProposalRowIdV2,fragmentPath:RepoPath}
DeferredInventoryEntrySfo1Eav1={deferredRowId:"C14P2C-CX01-DEFERRED_CATALOG_OBJECT-0001",
 expectedObjectRowSha256:Hex64,objectId:"extension:btree_gist",cx:"CX01",objectOrdinal:1,
 expectedFragmentPath:"blocks/CX01/0001.sqlfrag",deferredContractSha256:Hex64}
StagedArtifactSetCoreSfo1Eav1={schemaVersion:"C14P-ARTIFACT-SET-V2C-STAGED-SFO1-EAV1",
 profile:ArtifactPathEntry,fragments:ArtifactPathEntry[168],rows:ArtifactPathEntry,
 orderedPaths:RepoPath[170]}
MaterializedArtifactSetCoreSfo1Eav1={
 schemaVersion:"C14P-ARTIFACT-SET-V2C-MATERIALIZED-SFO1-EAV1",
 profile:ArtifactPathEntry,fragments:ArtifactPathEntry[169],rows:ArtifactPathEntry,
 orderedPaths:RepoPath[171]}
```

Staged root nested references are exactly `expectedObjectInventory:ExpectedObjectInventoryRowV1Sfo1Eav1[169]`, `concreteObjectInventory:ConcreteObjectBindingV2CSfo1Eav1[168]`, `deferredCatalogInventory:DeferredInventoryEntrySfo1Eav1[1]`, and `fragmentInventory:FragmentInventoryEntryV2CStagedSfo1Eav1[168]`. Materialized references are the same expected type, `ConcreteObjectBindingV2CSfo1Eav1[169]`, no deferred inventory field, and `FragmentInventoryEntryV2CMaterializedSfo1Eav1[169]`. The transition embeds the same 169 expected rows as exact CJL1 bytes and digest. Base root retains exact Capacity-V2 `ExpectedObject[169]` projection but hashes it under the revised base object-inventory domain.

`DeferredCatalogObjectV2CStagedSfo1Eav1` is normatively the complete approved `DEFERRED_CATALOG_OBJECT` key set with exactly these substitutions: `schemaVersion="C14P-ROW-V2C-STAGED-SFO1-EAV1"`; OWNER references resolve SFO1 OWNER rows; `deferredContractSha256` uses `C14P-DEFERRED-CATALOG-CONTRACT-V2C-STAGED-SFO1-EAV1`; and `rowSha256` uses `C14P-ROW-V2C-STAGED-SFO1-EAV1`. Its other exact fields are `rowId,kind,cx,ordinal,deferredCatalogObjectId,anchorRowId,objectId,objectClass,objectInventoryRowId,ownerRowId,physicalIdentifierRowId,attachmentRowId,expectedFragmentPath,deferredReason,selectionPolicySha256,requiredBindingKinds,parentEvidenceRowIds,catalogEvidenceRowIds,locatorRowIds,seedSourceRowIds,anchoredRows,anchorOwnershipSha256,materializationRequired,antiPlaceholderRule,provenanceRowId,deferredContractSha256,rowSha256`; no field is omitted or added. `deferredContractSha256` hashes every preceding field through `provenanceRowId`, including revised schemaVersion and revised `anchorOwnershipSha256`, and excludes only itself and `rowSha256`.

The catalog cascade types preserve their complete parent key/type/null/order contracts and change only the exact schemaVersion plus the revised hash-typed inputs stated here:

```text
CatalogSelectionRequestCoreSfo1Eav1 = CatalogSelectionRequestCore with
 schemaVersion="C14C-CATALOG-REQUEST-V1-SFO1-EAV1" and
 stagedProposalRootSha256=the exact EAV1 staged root hash.
QueryResultCoreSfo1Eav1 = QueryResultCore with
 schemaVersion="C14C-QUERY-RESULT-V1-SFO1-EAV1" and
 requestSha256=the exact EAV1 catalog request hash.
CatalogObservationCoreSfo1Eav1 = CatalogObservationCore with
 schemaVersion="C14C-CATALOG-OBSERVATION-V1-SFO1-EAV1",
 requestSha256=the exact EAV1 request hash, and
 queryResults=[six values Q01..Q06, each equal to QueryResultCoreSfo1Eav1 plus only
 rawResultSha256,canonicalResultSha256,queryResultSha256].
CatalogSelectionResultCoreSfo1Eav1 = CatalogSelectionResultCore with
 schemaVersion="C14C-CATALOG-SELECTION-RESULT-V1-SFO1-EAV1",
 requestSha256=the exact EAV1 request hash and snapshotSha256=the exact EAV1 snapshot hash.
TransitionCoreSfo1Eav1 = TransitionCore with
 schemaVersion="C14P-CATALOG-TRANSITION-V1-SFO1-EAV1",
 stagedProposalRootSha256/materializedProfileSha256/expectedObjectInventorySha256/
 unchangedNonCatalogSemanticRowsSha256/materializedRowSetSha256/materializedArtifactSetSha256
 equal to their exact EAV1 hashes and expectedObjectInventoryCjl1 equal to the exact EAV1 bytes.
```

“With” above is a closed substitution operator over the exact parent core at catalog-binding blob `d8fa5b6d14b563f44008ba52234421a09182990a`: the key set, every unmentioned field value/type/null rule, and canonical order remain byte-for-byte identical; any additional substitution fails. QueryResult file adds only its existing three hashes; CatalogObservation/SelectionResult files add only their existing self-hash fields under revised domains. Raw/canonical query result bytes and hashes remain unchanged, while QueryResult hashes change because the revised core contains the EAV1 request/schema literals.

### 5.3 Exhaustive changed-preimage domains and supersession

Dependency traversal in §5.4 establishes this exact indexed bijection. For every position `i`, the hash is `SHA256(ASCII(domain[i])||NUL||preimageOwner[i])`. Positions are normative; no grouping, repetition, elision, or implied expansion is permitted.

| # | Exact changed domain | One exact preimage owner |
|---:|---|---|
| 1 | `ENGRAM-SEMANTIC-APPROVAL-V1` | `CJ1(one EngramSemanticApprovalV1)` |
| 2 | `ENGRAM-SEMANTIC-APPROVAL-INVENTORY-V1` | `CJ1(EngramSemanticApprovalInventoryV1)` |
| 3 | `C14P-ROW-V2-SFO1-EAV1` | `CJ1(one ProposalRowV2Sfo1Eav1 core excluding rowSha256)` |
| 4 | `C14P-ROW-V2C-STAGED-SFO1-EAV1` | `CJ1(one StagedProposalRowV2CSfo1Eav1 core excluding rowSha256)` |
| 5 | `C14P-PROFILE-V2-SFO1-EAV1` | `CJ1(ProposalProfileV2Sfo1Eav1Core)` |
| 6 | `C14P-PROFILE-V2C-STAGED-SFO1-EAV1` | `CJ1(ProposalProfileV2CStagedSfo1Eav1Core)` |
| 7 | `C14P-PROFILE-V2C-MATERIALIZED-SFO1-EAV1` | `CJ1(ProposalProfileV2CMaterializedSfo1Eav1Core)` |
| 8 | `C14P-ROW-SET-V2-SFO1-EAV1` | Exact base `proposal-rows.cjl1` bytes |
| 9 | `C14P-ROW-SET-V2C-STAGED-SFO1-EAV1` | Exact staged `proposal-rows.cjl1` bytes |
| 10 | `C14P-ROW-SET-V2C-MATERIALIZED-SFO1-EAV1` | Exact materialized `proposal-rows.cjl1` bytes |
| 11 | `C14P-DECISION-INVENTORY-V2-SFO1-EAV1` | `CJ1(root.proposedDecisionInventory)` |
| 12 | `C14P-OBJECT-INVENTORY-V2-SFO1-EAV1` | `CJ1(Capacity-V2 base ExpectedObject[169])` |
| 13 | `C14P-FRAGMENT-INVENTORY-V2-SFO1-EAV1` | `CJ1(FragmentInventoryEntryV2Sfo1Eav1[169])` |
| 14 | `C14P-EXPECTED-OBJECT-INVENTORY-ROW-V1-SFO1-EAV1` | `CJ1(one ExpectedObjectInventoryRowV1Sfo1Eav1Core)` |
| 15 | `C14P-EXPECTED-OBJECT-INVENTORY-SET-V1-SFO1-EAV1` | Exact CJL1 concatenation of `ExpectedObjectInventoryRowV1Sfo1Eav1[169]` |
| 16 | `C14P-DEFERRED-ANCHOR-OWNERSHIP-V2C-STAGED-SFO1-EAV1` | `CJ1(StagedAnchorOwnershipEntry[] anchoredRows)` |
| 17 | `C14P-DEFERRED-CATALOG-CONTRACT-V2C-STAGED-SFO1-EAV1` | `CJ1(DeferredCatalogObjectV2CStagedSfo1Eav1 excluding deferredContractSha256,rowSha256)` |
| 18 | `C14P-STAGED-SEED-STABLE-ROW-SET-V2C-SFO1-EAV1` | `CJ1({kind,mode,cardinality,stableRowIds})` for one staged seed output |
| 19 | `C14P-CONCRETE-OBJECT-INVENTORY-V2C-STAGED-SFO1-EAV1` | `CJ1(ConcreteObjectBindingV2CSfo1Eav1[168])` |
| 20 | `C14P-DEFERRED-CATALOG-INVENTORY-V2C-STAGED-SFO1-EAV1` | `CJ1(DeferredInventoryEntrySfo1Eav1[1])` |
| 21 | `C14P-FRAGMENT-INVENTORY-V2C-STAGED-SFO1-EAV1` | `CJ1(FragmentInventoryEntryV2CStagedSfo1Eav1[168])` |
| 22 | `C14P-ARTIFACT-SET-V2C-STAGED-SFO1-EAV1` | `CJ1(StagedArtifactSetCoreSfo1Eav1)` |
| 23 | `C14P-CONCRETE-OBJECT-INVENTORY-V2C-MATERIALIZED-SFO1-EAV1` | `CJ1(ConcreteObjectBindingV2CSfo1Eav1[169])` |
| 24 | `C14P-FRAGMENT-INVENTORY-V2C-MATERIALIZED-SFO1-EAV1` | `CJ1(FragmentInventoryEntryV2CMaterializedSfo1Eav1[169])` |
| 25 | `C14P-ARTIFACT-SET-V2C-MATERIALIZED-SFO1-EAV1` | `CJ1(MaterializedArtifactSetCoreSfo1Eav1)` |
| 26 | `C14P-ROOT-V2-SFO1-EAV1` | `CJ1(ProposalRootV2Sfo1Eav1Core)` |
| 27 | `C14P-ROOT-V2C-STAGED-SFO1-EAV1` | `CJ1(ProposalRootV2CStagedSfo1Eav1Core)` |
| 28 | `C14P-ROOT-V2C-MATERIALIZED-SFO1-EAV1` | `CJ1(ProposalRootV2CMaterializedSfo1Eav1Core)` |
| 29 | `C14C-CATALOG-REQUEST-V1-SFO1-EAV1` | `CJ1(CatalogSelectionRequestCoreSfo1Eav1)` |
| 30 | `C14C-QUERY-RESULT-V1-SFO1-EAV1` | `CJ1({core:QueryResultCoreSfo1Eav1,rawResultSha256,canonicalResultSha256})` |
| 31 | `C14C-CATALOG-SNAPSHOT-V1-SFO1-EAV1` | `CJ1(CatalogObservationCoreSfo1Eav1)` |
| 32 | `C14C-CATALOG-SELECTION-RESULT-V1-SFO1-EAV1` | `CJ1(CatalogSelectionResultCoreSfo1Eav1)` |
| 33 | `C14C-CATALOG-OVERLAY-INPUT-V1-SFO1-EAV1` | `CJ1({stagedProposalRootSha256,requestSha256,snapshotSha256,selectionResultSha256,cx01FragmentSha256,cx01ExtensionContractSha256})` |
| 34 | `C14P-CATALOG-TRANSITION-V1-SFO1-EAV1` | `CJ1(TransitionCoreSfo1Eav1)` |
| 35 | `C14P-UNCHANGED-168-FRAGMENTS-V1-SFO1-EAV1` | `CJ1(UnchangedFragmentEntry[168] in staged path order)` |
| 36 | `C14P-UNCHANGED-NONCATALOG-ROWS-V1-SFO1-EAV1` | Exact `NonCatalogSemanticCoreCjl1Bytes` |
| 37 | `C14P-SEED-RANKS-1-26-TRANSITION-V1-SFO1-EAV1` | `CJ1({stagedExpectedOutputs,materializedExpectedOutputs})` for one seed |
| 38 | `C14P-SEED-PROJECTION-TRANSITION-V1-SFO1-EAV1` | `CJ1(SeedTransitionEntry[] in stable seed-ID order)` |
| 39 | `C14P-ANCHOR-OWNERSHIP-TRANSITION-V1-SFO1-EAV1` | `CJ1(AnchorOwnershipTransitionEntry[] in staged anchor order)` |

Count/order proof: the index column is the contiguous integer sequence `1..39`; every domain is unique; every preimage owner cell is singular; positions 13, 21, and 24 are respectively the base, staged, and materialized fragment-inventory arrays and occur exactly once. Position 14 begins the neutral expected-inventory branch, so no position shifts after 14. No prose list supplements this table.

Row self-hash excludes only `rowSha256`; root self-hash excludes only `proposalRootSha256`; profiles, fragment entries, concrete/deferred inventory entries, and artifact sets contain no self-hash; neutral expected-inventory rows exclude only their `rowSha256`; deferred contract excludes `deferredContractSha256` and row hash; transition excludes materialized root hash; artifact sets exclude roots. `semanticApprovalSha256` is outside its semantic object. `engramSemanticApprovalInventorySha256` is outside its inventory object.

Every one of the 39 corresponding parent/SFO1 domains without final `-EAV1`, plus `ENGRAM_OBSERVATION`, `exportByteLength`, and `exportSha256`, is superseded for EAV1 roots and invalid as an input. The exact unchanged-domain frontier is: `C14P-OBJECT-BLOCK-V2`, `C14P-SOURCE-SPAN-V2`, `C14P-NORMALIZED-SPAN-V2`, `C14P-DECISION-QUESTION-V2`, `C14P-DECISION-ALTERNATIVE-V2`, `C14P-SEED-SOURCE-SEMANTIC-V2`, `C14P-ATOM-NORMALIZED-SQL-V2`, `C14P-BOOLEAN-NORMALIZED-NODE-V2`, `C14P-PROVENANCE-ASSERTION-V2`, `C14P-EXTENSION-CATALOG-CONTRACT-V2`, `C14C-CATALOG-POLICY-V1`, `C14C-TARGET-IDENTITY-V1`, `C14C-QUERY-ARTIFACT-V1`, `C14C-COMMAND-IDENTITY-V1`, `C14C-QUERY-SET-V1`, `C14C-QUERY-PROJECTION-SCHEMA-V1`, `C14C-QUERY-RAW-RESULT-V1`, `C14C-QUERY-CANONICAL-RESULT-V1`, `C14C-SCRIPT-SET-V1`, `C14C-COMPONENT-PROOF-SET-V1`, and `C14C-SCRIPT-PRIVILEGE-PROOF-V1`. Their exact preimage bytes do not contain a revised schema/profile/root/row/inventory hash and therefore MUST retain those domains. Any domain not in the 39 changed set or this 21-domain unchanged frontier is outside the current staged/materialized dependency graph and cannot be claimed by this addendum.

### 5.4 Exhaustive dependency traversal and stale-domain audit

The traversal starts from every byte changed by this addendum and follows every hash-valued consumer until a terminal external approval boundary:

| Layer | Changed byte/value | Exact direct domain(s) | Exhaustive downstream consumers |
|---|---|---|---|
| T0 | Five live semantic tuples | `ENGRAM-SEMANTIC-APPROVAL-V1`; inventory domain | Five EVIDENCE rows, provenance/seed rows, all state row sets |
| T1 | Base/staged row schemaVersion; EVIDENCE/OWNER/decision rows | Base/staged row domains | Base/staged/materialized row sets; staged noncatalog-row transition digest; roots/artifact sets |
| T2 | Three profile schema/serialization/row/root literals and EAV fields | Three profile domains | Profile ArtifactPathEntry; staged/materialized artifact sets; three roots; materialized profile also enters transition |
| T3 | Branch A: Capacity-V2 base `ExpectedObject[169]` projection. Branch B: neutral `ExpectedObjectInventoryRowV1Sfo1Eav1[169]` schemaVersion/SFO1 owner bytes. | A: base object-inventory domain only. B: neutral row/set domains only. | A feeds only base object inventory → base root. B feeds staged/materialized concrete inventories, staged deferred inventory, both V2C roots, and transition expected bytes/hash. The same neutral CJL1 bytes/hash are mandatory in staged and materialized states. |
| T4 | Three FragmentInventoryEntry `profileVersion` literals | Base/staged/materialized fragment-inventory domains | Corresponding root; staged root then catalog cascade; materialized root then external approval. Artifact sets change independently through profile/row entries, not through fragment-inventory entries. |
| T5 | Staged deferred schemaVersion/OWNER/evidence/domain values | Anchor, deferred-contract, staged-stable-set, staged-row domains | Deferred inventory, staged row set/artifact set/root, catalog request cascade |
| T6 | Ten E01–E10 selected decisions | Decision-inventory domain and row domains | Three roots and every root approval boundary |
| T7 | EAV1 staged root hash | Catalog request domain | Six QueryResult hashes → observation snapshot → selection result → overlay input → materialized profile |
| T8 | Revised request/query-result/snapshot/selection/overlay hashes | Five `C14C-*-SFO1-EAV1` domains | Materialized profile, catalog evidence rows, materialized row set/artifact set/root |
| T9 | Revised base ExpectedObject hash; separately revised neutral expected/concrete/deferred/fragment/row/profile hashes | State inventory/artifact/root domains | Base ExpectedObject inventory terminates at base root. Neutral expected bytes/hash are shared byte-identically by staged/materialized/transition; staged values also enter catalog cascade; materialized values enter transition and materialized root. |
| T10 | Revised staged/materialized hashes and revised noncatalog row-core bytes | Six transition-family domains | Transition hash → materialized root |
| T11 | Each complete root core | Three root domains | Detached root self-hash → independent review → external Franco approval; traversal stops |

Normative aggregate equations for the previously omitted nodes are:

```text
baseObjectInventorySha256=SHA256(ASCII("C14P-OBJECT-INVENTORY-V2-SFO1-EAV1")||NUL||
 CJ1(Capacity-V2 base ExpectedObject[169]))
baseFragmentInventorySha256=SHA256(ASCII("C14P-FRAGMENT-INVENTORY-V2-SFO1-EAV1")||NUL||
 CJ1(FragmentInventoryEntryV2Sfo1Eav1[169]))
expectedObjectInventoryRowSha256=SHA256(
 ASCII("C14P-EXPECTED-OBJECT-INVENTORY-ROW-V1-SFO1-EAV1")||NUL||
 CJ1(one ExpectedObjectInventoryRowV1Sfo1Eav1Core))
expectedObjectInventorySha256=SHA256(
 ASCII("C14P-EXPECTED-OBJECT-INVENTORY-SET-V1-SFO1-EAV1")||NUL||
 exact neutral ExpectedObjectInventoryRowV1Sfo1Eav1[169] CJL1 bytes)
stagedConcreteObjectInventorySha256=SHA256(
 ASCII("C14P-CONCRETE-OBJECT-INVENTORY-V2C-STAGED-SFO1-EAV1")||NUL||
 CJ1(ConcreteObjectBindingV2CSfo1Eav1[168]))
stagedDeferredCatalogInventorySha256=SHA256(
 ASCII("C14P-DEFERRED-CATALOG-INVENTORY-V2C-STAGED-SFO1-EAV1")||NUL||
 CJ1(DeferredInventoryEntrySfo1Eav1[1]))
stagedFragmentInventorySha256=SHA256(
 ASCII("C14P-FRAGMENT-INVENTORY-V2C-STAGED-SFO1-EAV1")||NUL||
 CJ1(FragmentInventoryEntryV2CStagedSfo1Eav1[168]))
materializedConcreteObjectInventorySha256=SHA256(
 ASCII("C14P-CONCRETE-OBJECT-INVENTORY-V2C-MATERIALIZED-SFO1-EAV1")||NUL||
 CJ1(ConcreteObjectBindingV2CSfo1Eav1[169]))
materializedFragmentInventorySha256=SHA256(
 ASCII("C14P-FRAGMENT-INVENTORY-V2C-MATERIALIZED-SFO1-EAV1")||NUL||
 CJ1(FragmentInventoryEntryV2CMaterializedSfo1Eav1[169]))
deferredContractSha256=SHA256(
 ASCII("C14P-DEFERRED-CATALOG-CONTRACT-V2C-STAGED-SFO1-EAV1")||NUL||
 CJ1(DeferredCatalogObjectV2CStagedSfo1Eav1 excluding deferredContractSha256,rowSha256))
```

Traversal audit result: every changed leaf reaches exactly one or more indexed domains in §5.3; each aggregate's consumers are listed above; every terminal path ends at a detached root hash; and none returns to an upstream preimage. Capacity-V2 base `ExpectedObject[169]` has no edge to neutral row/set domains, staged/materialized concrete/deferred inventories, or transition. Neutral expected-inventory rows have no edge to the base object-inventory domain/root; their exact 169-row CJL1 bytes and set hash are byte-identical across staged root, materialized root, and transition. Static schema/profileVersion literals flow downward but no profile hash enters a fragment entry. Roots do not enter their own preimages; materialized root is excluded from transition; external approvals are outside roots. Searching the traversal for any superseded unsuffixed/SFO1 domain is a hard failure. The 21-domain unchanged frontier was reviewed field-by-field and has no path from a changed byte.

### 5.5 Closed future enrollment and cycle rule

Inventory V1 contains exactly five observations and is closed. Approval of this addendum, an independent review, or final root approval is an external gate and is **not** inserted into the root it approves. There is no generic sixth observation, wildcard, placeholder, pending tuple, or self-enrollment.

Adding any approval requires a new `ENGRAM_SEMANTIC_APPROVAL_INVENTORY_V<n+1>` addendum blob containing the complete prior finite entries plus each new entry's exact ID, metadata, content, subject, artifact path/hash, selections, scopes, and computed semantic hash. It requires an independent PASS and Franco's approval of that exact addendum blob. The semantic entry schema remains `ENGRAM_SEMANTIC_APPROVAL_V1` only if its key/type/normalization contract is byte-identical; otherwise it advances to `ENGRAM_SEMANTIC_APPROVAL_V2` and all entries are explicitly reserialized. In either case the inventory schema/version/domain advances, its hash changes, every profile/root inventory version/hash changes, all dependent profile/row/provenance/seed/row-set/artifact-set/transition/root hashes invalidate, and a new exact root plus final human approval is required. A new approval never retroactively validates an old root.

The DAG is acyclic:

```text
five live exact-ID renderings + five closed expected tuples -> five semantic hashes
five semantic hashes + five tuples -> finite inventory hash
artifact blobs + finite inventory + five EAV1 rows -> evidence/provenance/seed rows -> row set
Capacity-V2 ExpectedObject[169] -> base object inventory -> base root
neutral expected rows[169] -> one shared CJL1/hash -> staged root + materialized root + transition
staged profile/inventories/row set -> staged root -> catalog cascade
materialized profile/inventories/row set + transition -> materialized root
independent PASS + human exact-root approval envelope remain outside the approved root
```

No semantic evidence contains its proposal-row hash or root hash; no root contains its own hash. Document blob proves artifact bytes, while EAV1 proves only equality of the currently rendered memory semantics to the approved expected tuple. Neither alone grants execution authority.

## 6. Threats, examples, and independent verification

The exact normative hashes recomputed from §4 under `ASCII("ENGRAM-SEMANTIC-APPROVAL-V1")||NUL||CJ1(entry)` are:

| Observation | `DecisionTuple.subject` | `ApprovedArtifact.path` | `semanticApprovalSha256` |
|---:|---|---|---|
| 4802 | `C14_CX_CANONICAL_RENDERING_P01_P19` | `knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/CANONICAL_RENDERING_OWNERSHIP_MANIFEST_PROPOSAL.md` | `2320f177e6406f222a39faef34d66f5cf42dcc8aaa1bfcfa8a126a3a39b17feb` |
| 4816 | `P19_PROPOSAL_SERIALIZATION_A01_A06` | `knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/P19_PROPOSAL_SERIALIZATION_ADDENDUM.md` | `77c8a9bf1270b51acb557d980ab0905b96289fa523cd04bd284b404f72adc44c` |
| 4831 | `P19_PROPOSAL_SCHEMA_CAPACITY_C01_C06` | `knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/P19_PROPOSAL_SCHEMA_CAPACITY_ADDENDUM.md` | `cf18391b1957b6d3589c1ddf5ec5157867103fe14e91096e4500e99aaac835cc` |
| 4841 | `C14_CX_BTREE_GIST_CATALOG_BINDING_CB01_CB07` | `knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/BTREE_GIST_CATALOG_BINDING_ADDENDUM.md` | `26f231e2637845231cf10ac8c5e9687895bf53e2c01ad05bb78bd0cc641287a9` |
| 4850 | `C14_CX_SHARED_FUNCTION_OWNERSHIP_SFO01` | `knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/SHARED_FUNCTION_OWNERSHIP_ADDENDUM.md` | `e8404460c348752297c4b012c0c84437a732b002a99c3229bc722ef421c44229` |

The exact V1 inventory hash is `f9143060666090f0a63ccd77f6b5fc74f4ac1f3288d23fc8f3f9900e614d2f3a` under `ASCII("ENGRAM-SEMANTIC-APPROVAL-INVENTORY-V1")||NUL||CJ1(InventoryV1)` as defined in §5.3.

- **Anti-substitution/project isolation:** exact ID, project, scope, title/type/topic, four content fields, tuple, artifact path/hash, and selections must all agree.
- **Anti-replay:** an observation approving another artifact/root/scope cannot be reused; every root carries the ordered finite evidence-row IDs and hashes. Cross-project and transitive references fail.
- **Revision drift/stale memory:** revision/created/rendering mismatch or changed second read fails. Same-revision server-side mutation cannot be disproved by this interface and requires human reconfirmation.
- **Conflict/judgment:** absence cannot currently be read. A verifier records `NOT_EXPOSED`, not `CLEAN`; final human reconfirmation is mandatory. If later exposed, pending, duplicate-effective, superseded, or conflicting state fails.
- **Unknown/ambiguous format:** unknown key/label, missing field, duplicate field, multiline/truncated structured field, or parser-version drift fails; no fallback regex exists.

**Worked valid:** #4850 returns the exact metadata and four fields in §4; canonicalization produces semantic hash `e8404460c348752297c4b012c0c84437a732b002a99c3229bc722ef421c44229`, binding exact subject `C14_CX_SHARED_FUNCTION_OWNERSHIP_SFO01`, exact shared-ownership path, blob `1e5a4df989b9831343a54cd3c62237e4c8916614`, selection `SFO01-B`, and its literal scope arrays. Verification passes subject to the declared attestation residual.

**Tampered:** the same ID changes `SFO01-B` to `SFO01-A` or the blob by one hex digit. Exact content/tuple equality and hash both fail.

**Revised:** #4850 reports `Revisions: 2` or a changed Created/content value. Expected revision/metadata equality fails; a new finite reviewed inventory revision and human approval are required.

**Format drift:** `**Decision**:` replaces `**What**:`, a fifth structured field appears, or output is truncated. Closed grammar fails before semantic projection.

One independent verifier, not the author, must: re-read exactly the five §4 observations; compare literal fields and metadata; recompute the five semantic hashes, V1 inventory hash, and every dependent evidence/row/profile/inventory/catalog/transition/root hash; audit all 18 schemaVersion literals, 33 named closure types, 39 changed domains, 21 unchanged-frontier domains, unknown keys, cardinalities, project isolation, enrollment closure, DAG acyclicity, and prohibitions; record the conflict/judgment limitation; and issue PASS/FAIL against one exact addendum Git blob and exact root. Franco may then issue an external approval statement naming that exact root, inventory version, inventory hash, and five ordered observation IDs. The statement binds the finite inventory despite the interface limitation but is not inserted into the root or V1 inventory; doing so would create circularity and require V2. Residual trust remains Engram-server trust plus human reconfirmation, not cryptographic server attestation.

## 7. Approval question

Does Franco approve this exact addendum blob and select the non-severable E01-B through E10-B package, accepting the explicitly stated residual trust in Engram's live `mem_get_observation` rendering and requiring one independent PASS plus final human reconfirmation of the exact finite evidence inventory and exact root, solely to resume non-executable documentary proposal authoring and review?
