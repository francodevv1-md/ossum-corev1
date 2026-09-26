# C14 CX EAV1 Bootstrap Addendum

Status: **PROPOSED / HUMAN APPROVAL REQUIRED / NON-EXECUTABLE**

## 1. Boundary and decision

This addendum resolves #4862 and independent FAIL #4865. Authority precedence is `AGENTS.md` human boundaries > later Franco approval of this exact addendum > approved EAV1 blob `d50185a0a17ef4d8ee84f877cd98b46a46032a32` > #4842 documentary preparation. Git proves bytes, never approval; predicted evidence, self-reference, transitive authority, and search/latest are invalid.

| Cell | Alternative | Disposition |
|---|---|---|
| AB01-A | Enroll #4860 as sixth semantic approval. | Reject: inventory/version cascade; no exact-root approval. |
| AB01-B | Pending candidate root, independent PASS, Franco PASS-bound approval, external envelope. | **Recommend as one non-severable choice.** |
| AB01-C | Separate adoption evidence channel. | Reject: it needs the same bootstrap. |

## 2. Preserved and changed domains

The five semantic values remain byte-for-byte `[2320f177e6406f222a39faef34d66f5cf42dcc8aaa1bfcfa8a126a3a39b17feb,77c8a9bf1270b51acb557d980ab0905b96289fa523cd04bd284b404f72adc44c,cf18391b1957b6d3589c1ddf5ec5157867103fe14e91096e4500e99aaac835cc,26f231e2637845231cf10ac8c5e9687895bf53e2c01ad05bb78bd0cc641287a9,e8404460c348752297c4b012c0c84437a732b002a99c3229bc722ef421c44229]`. Their domain is exactly `ENGRAM-SEMANTIC-APPROVAL-V1`; inventory domain remains exactly `ENGRAM-SEMANTIC-APPROVAL-INVENTORY-V1`; inventory hash remains `f9143060666090f0a63ccd77f6b5fc74f4ac1f3288d23fc8f3f9900e614d2f3a`. #4860 is informational only and absent from rows, inventory, root, PASS, approval, and envelope.

| Class | Exact EAV1 §5.3 positions/domains | Count |
|---|---|---:|
| Preserved approved evidence | 1–2 | 2 |
| Preserved unchanged preimages | 12,14–16,18–19,23,35 | 8 |
| BS1 changed downstream preimages | 3–11,13,17,20–22,24–34,36–39; same exact domain names with final `-BS1` | 29 |
| Preserved EAV1 unchanged frontier | all 21 domains in EAV1 §5.3 | 21 |
| New BS1 domains | `C14P-EAV1-SELECTION-SET-V1-BS1`; `C14P-EAV1-INDEPENDENT-PASS-V1-BS1`; `C14P-EAV1-FRANCO-APPROVAL-V1-BS1`; `C14P-EAV1-FINAL-ENVELOPE-V1-BS1` | 4 |

Thus 31 exact domains are preserved and 33 are changed/new. No unchanged preimage is renamed. `C14P-EAV1-MODEL-ADOPTION-V1-BS1` is removed: EAV1 blob plus the exact selection set already bind adoption through candidate rows, R, P, A, and H; another digest adds no distinguishable semantic input.

| New domain | Exact preimage | Output field | Direct consumer(s) |
|---|---|---|---|
| `C14P-EAV1-SELECTION-SET-V1-BS1` | `CJ1(CandidateSelection[10])` | `selectionSetSha256` | PassTuple, ApprovalTuple, EnvelopeCore |
| `C14P-EAV1-INDEPENDENT-PASS-V1-BS1` | `CJ1(IndependentPassRecord except passRecordSha256)` | `passRecordSha256` | ApprovalTuple; EnvelopeCore record/digest |
| `C14P-EAV1-FRANCO-APPROVAL-V1-BS1` | `CJ1(FrancoApprovalRecord except approvalRecordSha256)` | `approvalRecordSha256` | EnvelopeCore record/digest |
| `C14P-EAV1-FINAL-ENVELOPE-V1-BS1` | `CJ1(EnvelopeCore)` | detached `envelopeSha256` | later manifest/binding pair `(R,H)` |

Every hash is `SHA256(ASCII(domain)||NUL||preimage)`. The 29 BS1 positions retain EAV1 §5.3's one preimage owner and downstream consumers with only changed bytes/domain suffix. `ModelAdoptionCandidate` has no self-hash/domain: it is an exact PROVENANCE field consumed by changed row domain positions 3/4, then row-set/root domains. Domain→preimage→field→consumer cardinality is `33→33→33→nonempty`; orphan count is zero.

## 3. Candidate schema and counts

Closed CJ1 rejects unknown/duplicate/missing keys:

```text
CandidateSelection={cellId:"E01"|...|"E10",alternativeId:"E01-B"|...|"E10-B",decisionRowId:ProposalRowId,alternativeRowId:ProposalRowId,alternativeSemanticSha256:Hex64}
ModelAdoptionCandidate={eav1Blob:"d50185a0a17ef4d8ee84f877cd98b46a46032a32",bootstrapAddendumBlob:Hex40,selections:CandidateSelection[10],state:"PENDING_EXTERNAL_ADOPTION",nonAuthority:true}
```

Only changed row/profile/root schemas gain final `-BS1`. `PROVENANCE` gains non-authoritative `MODEL_ADOPTION_CANDIDATE` with the model object, E01–E10 external IDs, and empty evidence/fragment arrays. `PROPOSED_DECISION` gains `candidateAlternativeRowId` and `UNRESOLVED|PENDING_ADOPTION|SELECTED`; pending requires candidate B and selected null. Exactly ten E01–E10 rows are pending, not schema selections; alternatives and total row count are unchanged.

Profiles add `bootstrapAddendumBlob`: base/staged/materialized fields `26/30/36`. Roots add `bootstrapAddendumBlob`, `modelAdoptionState`, `candidateSelections`; core/total fields `50/51`, `62/63`, `65/66`. Row kind/variant counts remain `26/27` base/materialized and `27/28` staged. Evidence rows remain five.

## 4. PASS, approval, and envelope

`UtcSeconds` is `YYYY-MM-DDTHH:MM:SSZ`. `expectedCreated` must equal the live Engram `Created` text; `observedCreatedUtc` is its exact space-to-`T`, append-`Z` projection. UTC provenance remains residual Engram-server trust.

```text
PassTuple={schemaVersion:"C14P-EAV1-PASS-TUPLE-V1-BS1",project:"ossum_cor_project",purpose:"C14_CX_EAV1_BS1_STAGED_ROOT_ADOPTION",reviewerIdentityClaim:NString,identityAssurance:"UNATTESTED_CONTENT_CLAIM",reviewedRootSchemaVersion:"C14P-ROOT-V2C-STAGED-SFO1-EAV1-BS1",reviewedRootId:"C14-CX-PROPOSAL-ROOT-V2C-STAGED-SFO1-EAV1-BS1",reviewedRootSha256:Hex64,eav1Blob:"d50185a0a17ef4d8ee84f877cd98b46a46032a32",eav1ByteSha256:"9dac5cf55c366fab70e43276c1d89b0bf7bab93b3e07f9ce1a6dbfa24f2c573d",bootstrapAddendumBlob:Hex40,selections:CandidateSelection[10],selectionSetSha256:Hex64,semanticInventoryVersion:"ENGRAM_SEMANTIC_APPROVAL_INVENTORY_V1",semanticInventorySha256:"f9143060666090f0a63ccd77f6b5fc74f4ac1f3288d23fc8f3f9900e614d2f3a",semanticObservationIds:[4802,4816,4831,4841,4850],verdict:"PASS",executionAuthority:false}
IndependentPassRecord={schemaVersion:"C14P-EAV1-INDEPENDENT-PASS-RECORD-V1-BS1",project:"ossum_cor_project",scope:"project",observationId:PosInt,expectedType:NString,expectedTitle:NString,expectedTopic:NString,expectedRevisionCount:1,expectedCreated:NString,expectedContent:ExpectedStructuredContent,observedCreatedUtc:UtcSeconds,pass:PassTuple,passRecordSha256:Hex64}
ApprovalTuple={schemaVersion:"C14P-EAV1-APPROVAL-TUPLE-V1-BS1",project:"ossum_cor_project",purpose:"C14_CX_EAV1_BS1_STAGED_ROOT_ADOPTION",passObservationId:PosInt,passRecordSha256:Hex64,reviewerIdentityClaim:NString,passObservedCreatedUtc:UtcSeconds,reviewedRootSchemaVersion:"C14P-ROOT-V2C-STAGED-SFO1-EAV1-BS1",reviewedRootId:"C14-CX-PROPOSAL-ROOT-V2C-STAGED-SFO1-EAV1-BS1",reviewedRootSha256:Hex64,eav1Blob:"d50185a0a17ef4d8ee84f877cd98b46a46032a32",eav1ByteSha256:"9dac5cf55c366fab70e43276c1d89b0bf7bab93b3e07f9ce1a6dbfa24f2c573d",bootstrapAddendumBlob:Hex40,selections:CandidateSelection[10],selectionSetSha256:Hex64,semanticInventoryVersion:"ENGRAM_SEMANTIC_APPROVAL_INVENTORY_V1",semanticInventorySha256:"f9143060666090f0a63ccd77f6b5fc74f4ac1f3288d23fc8f3f9900e614d2f3a",semanticObservationIds:[4802,4816,4831,4841,4850],verdict:"PASS",adopts:"AB01-B_AND_E01-B_THROUGH_E10-B",authorityScope:"DOCUMENTARY_MODEL_ADOPTION_AND_EXACT_ROOT_ONLY",executionAuthority:false}
FrancoApprovalRecord={schemaVersion:"C14P-EAV1-FRANCO-APPROVAL-RECORD-V1-BS1",project:"ossum_cor_project",scope:"project",observationId:PosInt,expectedType:"decision",expectedTitle:NString,expectedTopic:NString,expectedRevisionCount:1,expectedCreated:NString,expectedContent:ExpectedStructuredContent,observedCreatedUtc:UtcSeconds,approval:ApprovalTuple,approvalRecordSha256:Hex64}
EnvelopeCore={schemaVersion:"C14P-EAV1-FINAL-ENVELOPE-V1-BS1",project:"ossum_cor_project",purpose:"C14_CX_EAV1_BS1_STAGED_ROOT_ADOPTION",candidateRootSchemaVersion:"C14P-ROOT-V2C-STAGED-SFO1-EAV1-BS1",candidateRootId:"C14-CX-PROPOSAL-ROOT-V2C-STAGED-SFO1-EAV1-BS1",candidateRootSha256:Hex64,eav1Blob:"d50185a0a17ef4d8ee84f877cd98b46a46032a32",eav1ByteSha256:"9dac5cf55c366fab70e43276c1d89b0bf7bab93b3e07f9ce1a6dbfa24f2c573d",bootstrapAddendumBlob:Hex40,selections:CandidateSelection[10],selectionSetSha256:Hex64,semanticInventoryVersion:"ENGRAM_SEMANTIC_APPROVAL_INVENTORY_V1",semanticInventorySha256:"f9143060666090f0a63ccd77f6b5fc74f4ac1f3288d23fc8f3f9900e614d2f3a",semanticObservationIds:[4802,4816,4831,4841,4850],independentPass:IndependentPassRecord,passRecordSha256:Hex64,passObservedCreatedUtc:UtcSeconds,francoApproval:FrancoApprovalRecord,approvalRecordSha256:Hex64,approvalObservedCreatedUtc:UtcSeconds,authorityScope:"DOCUMENTARY_MODEL_ADOPTION_AND_EXACT_ROOT_ONLY",executionAuthority:false}
```

Tuple/record/envelope hashes use their named New-BS1 domain, NUL, and CJ1 excluding only their own hash; selection-set hash uses its named domain and CJ1(selections). Fixed parsing derives each tuple only from its record's exact four-field `expectedContent`; surrounding prose grants nothing. Field counts: `PassTuple=18`, `IndependentPassRecord=13`, `ApprovalTuple=22`, `FrancoApprovalRecord=13`, `EnvelopeCore/file=22/23`.

Verifier uses exact-ID `mem_get_observation` twice and fixed EAV1 parsing. It requires every repeated field equal, `passRecordSha256` equal inside A/H, `approvalRecordSha256` equal H, and `P.observedCreatedUtc < A.observedCreatedUtc` by UTC instant; equality/reversal fails. Wrong root/model/selection/project/purpose, alternate same-root PASS, missing reviewer/PASS/root/model binding, revision drift, changed reread, cross-context replay, or substitution fails closed; byte-identical replay is idempotent.

## 5. DAG, example, and gate

```text
five semantic hashes→preserved inventory→candidate rows/profile→R→P(R)→A(R,P)→H(R,P,A)
```

R contains no P/A/H value and is never regenerated. Example: `R=11…11`, P #6001/hash `22…22` at `10:00:00Z`, A #6002 binding P at `10:01:00Z`, H `33…33` passes. Alternate P hash, A at `10:00:00Z`, E09-A substitution, changed model blob/root/revision, or absent reviewer fails. Verified `(R,H)` becomes documentary `ADOPTED`; later manifests/bindings bind both hashes.

No SQL/DB/catalog/network/provider, Prisma, schema/migration, runner, publication, deployment, staging, production, destructive action, or execution is authorized.

## 6. Approval question

Does Franco approve this exact addendum blob and AB01-B with preserved EAV1 evidence domains/inventory, mandatory exact PASS-before-approval binding, external envelope, no root regeneration, and no execution authority?
