# C14 Post-EAV Candidate Adoption Addendum — PCA2

Status: **PROPOSED / HUMAN APPROVAL REQUIRED / NON-EXECUTABLE**

## 1. Authority, boundary, and finite decision

This PCA2 revision resolves Engram #4911 after Franco approved `DT01-B/DT02-A/DT03-A/DT04-A` at Dependency Target Addendum blob `fdbdaa1da1fe97d4cac24ae347c94c6a3dff6947` and detached diagnostic root `60eb98ad49d2ee6cd40711375a3d6b07ab4f57a536a0b8583ef0bc980dfd77d5`. Observation #4950 is external historical confirmation only: it is absent from every package row, inventory, profile, root, PASS preimage, and candidate evidence field. Git proves bytes, never final root adoption. Authority order remains `AGENTS.md` human boundaries > Franco approval of this exact PCA2 addendum blob > exact approved package blobs > continuous documentary preparation #4842.

The EAV1 inventory remains byte-for-byte the fixed five observations `[4802,4816,4831,4841,4850]`, semantic hashes `[2320f177e6406f222a39faef34d66f5cf42dcc8aaa1bfcfa8a126a3a39b17feb,77c8a9bf1270b51acb557d980ab0905b96289fa523cd04bd284b404f72adc44c,cf18391b1957b6d3589c1ddf5ec5157867103fe14e91096e4500e99aaac835cc,26f231e2637845231cf10ac8c5e9687895bf53e2c01ad05bb78bd0cc641287a9,e8404460c348752297c4b012c0c84437a732b002a99c3229bc722ef421c44229]`, domain `ENGRAM-SEMANTIC-APPROVAL-V1`, inventory domain `ENGRAM-SEMANTIC-APPROVAL-INVENTORY-V1`, and inventory hash `f9143060666090f0a63ccd77f6b5fc74f4ac1f3288d23fc8f3f9900e614d2f3a`. EAV1 is upstream evidence, not a PCA2 package. #4860 remains informational and absent.

PCA2 supersedes PCA1 as one finite candidate inventory: exactly four packages and fifteen selections in canonical order AB, ISO, TEI, DT. All four are `PENDING_ADOPTION`. A fifth package is schema-invalid; any later decision requires a separately reviewed and Franco-approved PCA3+ addendum/inventory, revised domains, a new root, and new final adoption.

## 2. Closed PCA2 schema, rows, and hashes

Common scalar/CJ1 rules are inherited unchanged. Unknown, duplicate, missing, null, wrong-type, extra, or out-of-order values fail. Arrays retain displayed order.

```text
DecisionSelectionV2={cellId:"AB01"|"ISO01"|"ISO02"|"ISO03"|"ISO04"|"ISO05"|"ISO06"|"TEI01"|"TEI02"|"TEI03"|"TEI04"|"DT01"|"DT02"|"DT03"|"DT04",selection:"A"|"B"}
SupportingSetHashV2={setId:NString,setSha256:Hex64}
PostEavCandidateDecisionPackageV2Core={schemaVersion:"C14-POST-EAV-CANDIDATE-DECISION-PACKAGE-V2-PCA2",packageId:"PCA2-AB01-B"|"PCA2-ISO01-ISO06-A"|"PCA2-TEI01-TEI04"|"PCA2-DT01-DT04",artifactPath:RepoPath,artifactBlob:Hex40,decisionSelections:DecisionSelectionV2[1|6|4],supportingScopes:NString[],supportingSetHashes:SupportingSetHashV2[],allowedScope:["CANDIDATE_ARTIFACT_GENERATION","INDEPENDENT_REVIEW","EXACT_ROOT_DOCUMENTARY_ADOPTION"],forbiddenScope:["DATABASE_EXECUTION","MIGRATION_OR_SCHEMA_CHANGE","AUTH_SECURITY_PERMISSION_OR_PROVIDER_CHANGE","DEPLOYMENT_STAGING_OR_PRODUCTION","ROOT_REGENERATION_AFTER_FINAL_APPROVAL"],status:"PENDING_ADOPTION",evidenceSemantics:"ARTIFACT_BLOB_AND_SELECTIONS_VERIFIED_BEFORE_ASSEMBLY",provenanceSemantics:"FINAL_ROOT_PASS_APPROVAL_ENVELOPE_ONLY_NO_ENGRAM_IN_ROOT"}
PostEavCandidateDecisionPackageV2=Core+{rowSha256:Hex64}
PostEavCandidateDecisionInventoryV2Core={schemaVersion:"C14-POST-EAV-CANDIDATE-DECISION-INVENTORY-V2-PCA2",inventoryId:"C14-POST-EAV-CANDIDATE-DECISION-INVENTORY-PCA2",canonicalPackageOrder:["PCA2-AB01-B","PCA2-ISO01-ISO06-A","PCA2-TEI01-TEI04","PCA2-DT01-DT04"],packageCount:4,decisionCount:15,packages:PostEavCandidateDecisionPackageV2[4]}
PostEavCandidateDecisionInventoryV2=Core+{inventorySha256:Hex64}
```

Normative full rows:

```jsonl
{"allowedScope":["CANDIDATE_ARTIFACT_GENERATION","INDEPENDENT_REVIEW","EXACT_ROOT_DOCUMENTARY_ADOPTION"],"artifactBlob":"e9af1b7dccb65573026f574fdc39bdd37fb53a77","artifactPath":"knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/EAV1_BOOTSTRAP_ADDENDUM.md","decisionSelections":[{"cellId":"AB01","selection":"B"}],"evidenceSemantics":"ARTIFACT_BLOB_AND_SELECTIONS_VERIFIED_BEFORE_ASSEMBLY","forbiddenScope":["DATABASE_EXECUTION","MIGRATION_OR_SCHEMA_CHANGE","AUTH_SECURITY_PERMISSION_OR_PROVIDER_CHANGE","DEPLOYMENT_STAGING_OR_PRODUCTION","ROOT_REGENERATION_AFTER_FINAL_APPROVAL"],"packageId":"PCA2-AB01-B","provenanceSemantics":"FINAL_ROOT_PASS_APPROVAL_ENVELOPE_ONLY_NO_ENGRAM_IN_ROOT","rowSha256":"6c33de25f2ece7c0bf68478485841b10f2e475adf8223448508f1062138147ee","schemaVersion":"C14-POST-EAV-CANDIDATE-DECISION-PACKAGE-V2-PCA2","status":"PENDING_ADOPTION","supportingScopes":["EAV1_FIXED_INVENTORY_ONLY"],"supportingSetHashes":[{"setId":"ENGRAM-SEMANTIC-APPROVAL-INVENTORY-V1","setSha256":"f9143060666090f0a63ccd77f6b5fc74f4ac1f3288d23fc8f3f9900e614d2f3a"}]}
{"allowedScope":["CANDIDATE_ARTIFACT_GENERATION","INDEPENDENT_REVIEW","EXACT_ROOT_DOCUMENTARY_ADOPTION"],"artifactBlob":"09408f21b209cda10068d60fe5ee546b460a3f06","artifactPath":"knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/INSERT_SERIALIZATION_OWNERSHIP_ADDENDUM.md","decisionSelections":[{"cellId":"ISO01","selection":"A"},{"cellId":"ISO02","selection":"A"},{"cellId":"ISO03","selection":"A"},{"cellId":"ISO04","selection":"A"},{"cellId":"ISO05","selection":"A"},{"cellId":"ISO06","selection":"A"}],"evidenceSemantics":"ARTIFACT_BLOB_AND_SELECTIONS_VERIFIED_BEFORE_ASSEMBLY","forbiddenScope":["DATABASE_EXECUTION","MIGRATION_OR_SCHEMA_CHANGE","AUTH_SECURITY_PERMISSION_OR_PROVIDER_CHANGE","DEPLOYMENT_STAGING_OR_PRODUCTION","ROOT_REGENERATION_AFTER_FINAL_APPROVAL"],"packageId":"PCA2-ISO01-ISO06-A","provenanceSemantics":"FINAL_ROOT_PASS_APPROVAL_ENVELOPE_ONLY_NO_ENGRAM_IN_ROOT","rowSha256":"a4f1df162a76320dfeea53641af4ccafd7afa4bbbeb2c30810f8653e1c8ef529","schemaVersion":"C14-POST-EAV-CANDIDATE-DECISION-PACKAGE-V2-PCA2","status":"PENDING_ADOPTION","supportingScopes":["INSERT_SERIALIZATION_CONTRACT_AND_BUNDLE_SETS_ONLY"],"supportingSetHashes":[{"setId":"C14-INSERT-WRITER-CONTRACT-SET-V1","setSha256":"a351ab89f8eee02fe4242dbd2ead324d865ff99efcc896bf7864c1c75d0ec005"},{"setId":"C14-WRITER-COMMAND-BUNDLE-SET-V1","setSha256":"2c8ffbfdf0b7961b76ae75478765a10ade72dc3eee14c37df6dec2d4f13fe1a0"}]}
{"allowedScope":["CANDIDATE_ARTIFACT_GENERATION","INDEPENDENT_REVIEW","EXACT_ROOT_DOCUMENTARY_ADOPTION"],"artifactBlob":"237c7c5e18e4a3cf22d223c3d77b117efa400014","artifactPath":"knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/TRIGGER_ERROR_IDENTITY_ADDENDUM.md","decisionSelections":[{"cellId":"TEI01","selection":"B"},{"cellId":"TEI02","selection":"A"},{"cellId":"TEI03","selection":"A"},{"cellId":"TEI04","selection":"A"}],"evidenceSemantics":"ARTIFACT_BLOB_AND_SELECTIONS_VERIFIED_BEFORE_ASSEMBLY","forbiddenScope":["DATABASE_EXECUTION","MIGRATION_OR_SCHEMA_CHANGE","AUTH_SECURITY_PERMISSION_OR_PROVIDER_CHANGE","DEPLOYMENT_STAGING_OR_PRODUCTION","ROOT_REGENERATION_AFTER_FINAL_APPROVAL"],"packageId":"PCA2-TEI01-TEI04","provenanceSemantics":"FINAL_ROOT_PASS_APPROVAL_ENVELOPE_ONLY_NO_ENGRAM_IN_ROOT","rowSha256":"6dca5ff198a7820275e3eec0c3e356a8a5f282e3ffbac49afdc1bd72bebca8d1","schemaVersion":"C14-POST-EAV-CANDIDATE-DECISION-PACKAGE-V2-PCA2","status":"PENDING_ADOPTION","supportingScopes":["TRIGGER_ERROR_IDENTITY_DECISIONS_ONLY"],"supportingSetHashes":[]}
{"allowedScope":["CANDIDATE_ARTIFACT_GENERATION","INDEPENDENT_REVIEW","EXACT_ROOT_DOCUMENTARY_ADOPTION"],"artifactBlob":"fdbdaa1da1fe97d4cac24ae347c94c6a3dff6947","artifactPath":"knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/DEPENDENCY_TARGET_ADDENDUM.md","decisionSelections":[{"cellId":"DT01","selection":"B"},{"cellId":"DT02","selection":"A"},{"cellId":"DT03","selection":"A"},{"cellId":"DT04","selection":"A"}],"evidenceSemantics":"ARTIFACT_BLOB_AND_SELECTIONS_VERIFIED_BEFORE_ASSEMBLY","forbiddenScope":["DATABASE_EXECUTION","MIGRATION_OR_SCHEMA_CHANGE","AUTH_SECURITY_PERMISSION_OR_PROVIDER_CHANGE","DEPLOYMENT_STAGING_OR_PRODUCTION","ROOT_REGENERATION_AFTER_FINAL_APPROVAL"],"packageId":"PCA2-DT01-DT04","provenanceSemantics":"FINAL_ROOT_PASS_APPROVAL_ENVELOPE_ONLY_NO_ENGRAM_IN_ROOT","rowSha256":"af702b22007a76c1dcf0dae1786a78078dbe5c14d6c4ef77bba51d57e3945874","schemaVersion":"C14-POST-EAV-CANDIDATE-DECISION-PACKAGE-V2-PCA2","status":"PENDING_ADOPTION","supportingScopes":["DEPENDENCY_TARGET_DECISIONS_ONLY","DETACHED_DIAGNOSTIC_EVIDENCE_ONLY","CX02_DT1_SLICE_ONLY","CX02_APPROVED_SQL_ROOT_ONLY","CX01_AND_CX03_THROUGH_CX13_DEPENDENCY_ROWS_PENDING_EXACT_RENDERING"],"supportingSetHashes":[{"setId":"C14-CX-DEPENDENCY-TARGET-DIAGNOSTIC-ROOT-V1","setSha256":"60eb98ad49d2ee6cd40711375a3d6b07ab4f57a536a0b8583ef0bc980dfd77d5"},{"setId":"C14P-TEMP-SLICE-CX02-V1-TEI1-PCA1-DT1","setSha256":"46cc34c2d62d858e7714108030298cb642a0b0e78760d3ff11b0b74fc94b3dd5"},{"setId":"CX02-EXACT-RENDERING-PROPOSAL-ROOT-V1","setSha256":"28834eafa15bf1f99227421892cbef18734a047642212fbafc1ca01f1d6139c2"}]}
```

The DT supporting scopes are exhaustive: its detached diagnostic proves the exact 385-row CX02 DT1 slice and unchanged eleven approved CX02 SQL fragments/root only; CX01 and CX03–CX13 dependency rows remain pending exact fragment rendering. It does not authorize those future rows or any execution.

```text
rowSha256=SHA256(ASCII("C14-POST-EAV-CANDIDATE-DECISION-PACKAGE-ROW-V2-PCA2")||NUL||CJ1(PackageV2Core))
inventorySha256=SHA256(ASCII("C14-POST-EAV-CANDIDATE-DECISION-INVENTORY-V2-PCA2")||NUL||CJ1(InventoryV2Core))
inventorySha256=2a7a0d519ec426249e7fcf2385f3046e8f09a802f4462aea7acd8c774520f3aa
```

CJ1 includes exactly one terminal LF. EAV1 equality in AB is anti-substitution, not duplicate enrollment. TEI parser-produced outcome/binding hashes remain downstream inventory inputs, not fixed package-row inputs.

## 3. Profile, root, row, domain, and count impact

Final schema/root/serialization/artifact/transition/catalog literals append `-DT1-PCA2` after `-TEI1`; examples are `C14P-PROFILE-V2C-STAGED-SFO1-EAV1-BS1-ISW2-TEI1-DT1-PCA2`, `C14P-ROOT-V2C-STAGED-SFO1-EAV1-BS1-ISW2-TEI1-DT1-PCA2`, and `CJ1_CJL1_SQLFRAG_V2C_STAGED_SFO1_EAV1_BS1_ISW2_TEI1_DT1_PCA2`. Final row literals are `C14P-ROW-V2-SFO1-EAV1-BS1-TEI1-DT1-PCA2` and `C14P-ROW-V2C-STAGED-SFO1-EAV1-BS1-TEI1-DT1-PCA2`. The diagnostic-only source hash domain `C14P-TEMP-SLICE-CX02-V1-TEI1-PCA1-DT1` remains immutable evidence; it is not a final row/profile domain.

PCA2 performs an exact value/type substitution over PCA1's six profile fields: `postEavCandidateAdoptionAddendumBlob:Hex40`, inventory version `C14-POST-EAV-CANDIDATE-DECISION-INVENTORY-V2-PCA2`, inventory hash `2a7a0d519ec426249e7fcf2385f3046e8f09a802f4462aea7acd8c774520f3aa`, package count `4`, decision count `15`, and state `PENDING_ADOPTION`. No key is added or removed; DT adds no separate profile field. Therefore the inherited DT1 counts are mechanically verified, not assumed: base/staged/materialized remain **42/46/52** (`42−6+6`, `46−6+6`, `52−6+6`). Every unmentioned field is byte/type exact and every extra key fails.

Root cores substitute the same six values and replace the PCA1 three-row array with `postEavCandidateDecisionInventory:PostEavCandidateDecisionPackageV2[4]`; no root key is added or removed. Therefore core/total counts remain base **71/72**, staged **83/84**, materialized **86/87** (`71−7+7`, `83−7+7`, `86−7+7`; file adds only detached `proposalRootSha256`). Existing ISO technical rows, TEI outcomes/bindings, `bootstrapAddendumBlob`, fixed EAV1 fields, and E01–E10 candidates remain. No #4950, package approval observation, future PASS, final approval, or envelope value enters a candidate root.

DB objects remain **169** (`1/55/53/49/10/1`); staged remains **168 concrete + one deferred**; materialized remains 169. DT1 changes the Dependency union only: base row kinds/variants become **26/28**, staged **27/29**. TEI outcomes remain **113** (`25/54/34`); EAV evidence rows remain five. The exact CX02 diagnostic remains 385 rows/66 locators/six dependencies/eight occurrences with slice hash `46cc34c2d62d858e7714108030298cb642a0b0e78760d3ff11b0b74fc94b3dd5`, but final S02 rows are regenerated under `-DT1-PCA2`.

New PCA2 package-row/inventory domains supersede PCA1's two domains. The two proposal-row domains and all affected row-set, seed-output, decision, profile, fragment-inventory, artifact-set, root, catalog, transition, PASS, approval, envelope, authority-manifest, and source-slot domains gain final `-DT1-PCA2`. Exact object-block, source-span, normalized SQL, TEI outcome/binding, ISO contract/bundle, fixed EAV1, BS1 selection-set, and established unchanged-frontier domains remain unchanged because their preimages contain no revised row/profile/root value. Any PCA1 or partial `-DT1` aggregate domain in a PCA2 root is stale and fails.

## 4. Correct generation DAG and lifecycle

`profile.cj1` must be absent during S01–S13. Fragments contain no profile hash. Temp slices, parser rows, and fragment entries bind only the exact immutable final `profileVersion` literal; they never predict `profileSha256`. S01 is regenerated under `-TEI1-DT1-PCA2`. The approved CX02 diagnostic is immutable source evidence, but S02 is also regenerated into final PCA2 row domains; its old PCA1-DT1 slice cannot be copied as final rows.

```text
approved blobs + exact PCA2 inventory + immutable diagnostic/SQL inputs
 -> invalidate/remove stale 39-field profile, every PCA1 profile/root, and unaccepted temp slices
 -> versioned S01-DT1-PCA2..S13-DT1-PCA2 fragment generation
 -> freeze concrete fragment bytes
 -> complete parsing; allocate rows/FKs under final DT1-PCA2 schemas
 -> row set + expected/concrete/deferred/fragment/decision/DT/TEI outcome/TEI binding inventories
 -> recompute every inventory hash
 -> generate exact profile from all known inventory hashes -> profileSha256
 -> generate artifact set including exact profile and rows
 -> generate root core last -> detached proposalRootSha256
 -> independent PASS(root,PCA2 inventory) -> Franco exact-root approval -> external AB envelope
```

Every hash is `SHA256(ASCII(domain)||NUL||exactPreimage)`. No inventory contains profile hash; fragment entries contain only profileVersion. Profile contains no artifact-set/root hash. Root is excluded from artifact set and contains no downstream evidence. Fresh temp directories and atomic per-file rename are mandatory; root is renamed last only after all hashes/counts/FKs pass. Crash before root leaves no authoritative candidate. Restart deletes unaccepted temps and deterministically recomputes from frozen inputs. Placeholder, stale-profile mutation, mixed PCA1/PCA2 rows, partial root, or root regeneration after PASS is forbidden.

## 5. Verification, attacks, and atomic adoption

An independent verifier must recompute four row hashes and PCA2 inventory hash; require package/decision counts `4/15`, canonical AB/ISO/TEI/DT order, exact paths/blobs/selections/scopes/supporting hashes, all statuses pending, no #4950, and no fifth package. It must reproduce the DT addendum blob, detached root, 385-row slice hash, approved CX02 SQL root, fixed EAV1, ISO sets, all profile/root count equations, changed/unchanged domain partition, and a topological hash traversal.

Required negative tests rehash after each mutation and must reject: omitted/duplicated/reordered/fifth package; AB/ISO/TEI/DT blob substitution; any selection change; diagnostic/slice/SQL-root/set mismatch; broadened DT scope; #4950 inserted as root evidence; `APPROVED` package status; stale PCA1 profile; copied PCA1-DT1 S02 rows; mixed profileVersion; profile generated before inventories; alternate inventory replay against the same root; or PASS replay against another root. Byte-identical replay is idempotent only for the same exact root and PCA2 inventory.

AB01-B's external PASS/approval/envelope records gain the exact PCA2 addendum blob, inventory version/hash, counts `4/15`, and ordered fifteen selections. The final approval adopts `AB01-B_AND_E01-B_THROUGH_E10-B_AND_PCA2_EXACT_15_SELECTIONS`. Order is immutable candidate root -> independent PASS -> Franco exact-root/PASS/PCA2 approval -> external envelope. The envelope stays outside the root, binds exact root plus exact PCA2 rows/hash/selections, and does not regenerate the root.

## 6. Decision cells and approval question

| Cell | Exact recommendation |
|---|---|
| `PCA01` | A — finite four-package/fifteen-selection PCA2 inventory; no EAV1 expansion or per-addendum bootstrap. |
| `PCA02` | A — fragments, rows, and all inventories first; profile after hashes; root last. |
| `PCA03` | A — one external AB01-B envelope atomically adopts E01–E10 and all PCA2 selections after independent PASS. |

**Exact approval question after independent PASS:** Does Franco approve this exact PCA2 addendum blob and select `PCA01-A`, `PCA02-A`, and `PCA03-A`, binding the unchanged five-observation EAV1 inventory/hash, exact four-package/fifteen-selection `PostEavCandidateDecisionInventoryV2` hash `2a7a0d519ec426249e7fcf2385f3046e8f09a802f4462aea7acd8c774520f3aa`, exact AB/ISO/TEI/DT paths/blobs/selections/supporting hashes/scopes, DT diagnostic root/CX02 slice/approved SQL root, `PENDING_ADOPTION` semantics, verified DT1 profile/root counts, fragments→rows→inventories→profile→root generation, atomic final AB01-B adoption after independent PASS, no root regeneration, and no execution authority?

No SQL/code execution, Prisma/schema/migration, database/catalog/network access, auth/security/permission/provider change, authority root, publication, deployment, staging, production, or destructive action is authorized.
