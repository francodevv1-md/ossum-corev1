# P19 Proposal Serialization Addendum

Status: **PROPOSED / HUMAN APPROVAL REQUIRED / NON-EXECUTABLE**

## 1. Authority, scope, and contradiction

This addendum binds the approved P01–P19 parent proposal at Git blob `b1045fd3f66defcbb0bac7a1cc0adcadf783b81a`, Binding Finalization Addendum `a860049af04a6ff07fbe9fae6ddb512a8ef0adc8`, C14 topology `b8608a922d2d9adf5d776673252f709c52d4a518`, and final C13 commit `0faf2f55e178f1b111c5ae108380a505a68c8feb` / `prisma/schema.prisma` blob `47313a8a85ac71ac56df93ce212593820cb95a13`. Independent PASS is Engram #4801; Franco's exact parent approval is #4802 with P16-B/U01-A/U02-A. #4807 authorized documentary byte-exact SQL proposal preparation; #4810 recorded the blocker; #4811 authorizes only this corrective addendum's preparation.

The contradiction is exact: parent P19 requires every SQL child to start with exactly three comments containing a future approved `authority-root-sha256` and `source-slot-set-sha256`, then `BEGIN;`. Proposal authoring must preserve non-executable proposal provenance, but those two digests do not exist before seed/91-child manifests and the authority root exist. Putting provenance into that header changes P19; putting placeholders or predicted digests there fabricates authority. Therefore proposal bytes cannot be final child bytes.

This addendum amends only proposal-stage representation. It does not reopen P01–P18, P19 final SQL semantics, topology, selected choices, object semantics, or the invalidity stated in P18.

## 2. Decision cells (six; one non-severable package)

| Cell | Exact decision |
|---|---|
| A01 | Use proposal-local immutable object-block payloads plus a later authority wrapper. |
| A02 | Store each object block as raw bytes in a `.sqlfrag` file; store provenance and coordinates only in CJ1/CJL1 records. |
| A03 | Make every proposal span block-local, zero-based, half-open, and translate it mechanically to final-child coordinates. |
| A04 | Use domain-separated artifact, row, set, and proposal-root hashes with only upstream inputs. |
| A05 | After authority approval, wrap unchanged blocks with P19's exact three comments, `BEGIN;`, separators, and `COMMIT;`. |
| A06 | Require exact approved proposal and authority identities independently; neither hash family grants the other's authority. |

These cells are non-severable: changing storage changes artifact identity and coordinates; changing coordinates changes rows; changing rows changes the proposal root and final anti-substitution proof. **Recommendation:** approve A01–A06 as one package. This is a recommendation, not approval.

Rejected alternatives are (1) placeholder/future digests in SQL bytes, which falsely imply authority; (2) proposal headers later mutated in place, which destroy byte identity; and (3) base64 SQL inside JSON, which adds decoder canonicality and obscures direct byte review. Raw `.sqlfrag` files are reviewable but must remain documentary fragments, never runner inputs.

## 3. Exact proposal profile

The closed directory is `canonical-sql-v1-proposal/` with only:

```text
profile.cj1
blocks/CXnn/dddd.sqlfrag
proposal-rows.cjl1
proposal-root.cj1
```

`CXnn` is `CX01..CX13`; `dddd` is the approved contiguous object ordinal `0001..9999`. Paths use `/`, ASCII components, and lexical CX/ordinal order. No final-child `.sql`, header, transaction wrapper, generated digest comment, sidecar, template, or unlisted file is permitted.

All files are UTF-8 without BOM, NFC, contain no NUL or CR, end in exactly one LF, and have no space/tab before LF. No blank line is permitted in CJL1. CJ1/CJL1 are exactly parent P02. Each `.sqlfrag` is one complete P19 object block, including approved comments and complete statement/body terminator, and contains no proposal provenance. SQL/body payload is raw, not JSON-encoded. `profile.cj1` and `proposal-root.cj1` carry documentary provenance; provenance never enters semantic block bytes.

`profile.cj1` is exactly `{schemaVersion:"C14P-PROFILE-V1",status:"PROPOSED_NON_EXECUTABLE",parentProposalBlob:Hex40,serializationAddendumBlob:Hex40,bindingAddendumBlob:Hex40,topologyBlob:Hex40,c13Commit:Hex40,c13SchemaBlob:Hex40,p16Choice:"B",u01Choice:"A",u02Choice:"A"}`. `serializationAddendumBlob` is this file's later independently passed and Franco-approved Git blob; it cannot be embedded in this file itself.

`ProposalSpan` is exactly `{spanId:NString,kind:"OBJECT"|"BODY"|"BOOLEAN"|"BRANCH"|"ACTION",startByte:UInt,endByte:PosInt,startLine:PosInt,startColumn:PosInt,endLine:PosInt,endColumn:PosInt,rawSha256:Hex64}`. Spans are non-empty, on UTF-8 code-point boundaries, contained in one block, and ordered by `(startByte,endByte,kind,spanId UTF-8 bytes)`; duplicate IDs are forbidden. BODY/BOOLEAN/BRANCH/ACTION spans use the same raw semantic bytes later consumed by P02/P14/P15.

`ProposalRowCore` is exactly `{schemaVersion:"C14P-ROW-V1",cx:Cx,c14Child:C14Child,objectOrdinal:PosInt,objectId:ObjectId,blockPath:RepoPath,blockByteLength:PosInt,blockLfCount:PosInt,artifactSha256:Hex64,spans:ProposalSpan[]}`. `ProposalRow` adds only `rowSha256:Hex64`. Rows are ordered by CX ordinal then `objectOrdinal`; ordinals are contiguous per CX; each block is referenced exactly once; each row has exactly one OBJECT span `[0,blockByteLength)` and all required semantic spans.

Coordinates are derived, never trusted independently. For block bytes `B` and offset `p` in `0..|B|`, `line_B(p)=1+count(0A in B[0:p])`; `column_B(p)=1+p-q`, where `q` is zero if no LF precedes `p`, otherwise one plus the greatest LF index below `p`. Columns are one-based UTF-8 byte columns. Thus an end offset immediately after terminal LF is `(blockLfCount+1,1)`.

## 4. Proposal hash DAG

All hashes are lowercase SHA-256; `NUL` is `00` and `CJ1(x)` includes its one terminal LF.

```text
artifactSha256 = SHA256(ASCII("C14P-OBJECT-BLOCK-V1") || NUL || exact .sqlfrag bytes)
span.rawSha256 = SHA256(ASCII("C14P-SPAN-V1") || NUL || B[startByte:endByte])
rowSha256      = SHA256(ASCII("C14P-ROW-V1") || NUL || CJ1(ProposalRowCore))
rowSetSha256   = SHA256(ASCII("C14P-ROW-SET-V1") || NUL || exact proposal-rows.cjl1 bytes)
proposalRootSha256 = SHA256(ASCII("C14P-ROOT-V1") || NUL || CJ1(ProposalRootCore))
```

`proposal-rows.cjl1` is the direct concatenation of ordered `CJ1(ProposalRow)` bytes. `ProposalRootCore` is exactly `{schemaVersion:"C14P-ROOT-V1",profileSha256:Hex64,rowCount:PosInt,objectCount:PosInt,rowSetSha256:Hex64}` where `profileSha256=SHA256(ASCII("C14P-PROFILE-V1") || NUL || exact profile.cj1 bytes)` and both counts equal the number of rows. `proposal-root.cj1` is `ProposalRootCore` plus only `proposalRootSha256`.

The DAG is acyclic: immutable authorities → profile → profile hash; block bytes → artifact/span hashes → rows → row set; profile hash + row set → proposal root. Every self-hash is excluded from only its own preimage. No proposal preimage contains `proposalRootSha256`, future authority root, source-slot digest, child hash, tuple hash, approval evidence, or final wrapper bytes. The proposal root never substitutes for any P19/authority digest.

## 5. Deterministic final-child generation and locators

Only after seed/91-child manifests, source-slot sets, authority root, tuple, independent review, and Franco's exact authority approval exist, generate each child as parent P19 already requires:

```text
-- c14-cx-child: <C14 child ID>\n
-- authority-root-sha256: <64hex>\n
-- source-slot-set-sha256: <64hex>\n
BEGIN;\n
B1
\n
B2 ... Bn
COMMIT;\n
```

The three comment lines, `BEGIN;`, object order, one LF-only separator, and `COMMIT;` are unchanged from P19. For every current six-byte C14 child ID, fixed prefix `H` through `BEGIN;\n` is exactly 214 bytes and 4 LFs; unknown digest values do not affect width. Let block `i` have byte length `b_i` and LF count `L_i`. Its final start is `S_i=214+Σ(j<i)b_j+(i-1)`. A local half-open span `[a,e)` becomes `[S_i+a,S_i+e)`. Its start/end line is `4+Σ(j<i)L_j+(i-1)+localLine`; its column is unchanged. These equations also apply when `e=b_i`: the local terminal-LF endpoint remains the next line, column 1. Final child bytes are `214+Σb_i+max(0,n-1)+8`; lines are `4+ΣL_i+max(0,n-1)+1`, exactly P19.

**Worked two-object audit with symbolic 64-hex digests:** let `B1=CREATE EXTENSION "x";\n` (`b1=22,L1=1`) and `B2=CHECK (TRUE);\n` (`b2=14,L2=1`). `S1=214`, line 5; `S2=214+22+1=237`, line 7, with line 6 blank. B2's local `TRUE` span `[7,11)`, line 1 columns 8..12, becomes child bytes `[244,248)`, line 7 columns 8..12. B1's full `[0,22)` ends locally at `(2,1)` and finally at `(6,1)`, before the separator LF. Total is 259 bytes and 8 lines. No off-by-one or terminal-LF interpretation remains.

The `<=350` gate uses exact `L_i` and the fixed five wrapper/commit lines plus separators. Proposal forecasts are therefore exact despite unknown digest values. No range, topology split, semantic compression, omitted comment, or altered block is allowed.

## 6. Anti-substitution and sequence

Final generation must verify: exact approved serialization-addendum blob and proposal-root hash; each extracted final object block byte-equal to its approved `.sqlfrag` and matching artifact/span hashes; order/identity/count equality; wrapper digests equal the separately approved authority root/source-slot descriptor; authority rows bind the same object/body bytes; and final locator translations satisfy the equations above. Recomputed proposal hashes without exact Franco approval prove only internal consistency. Proposal approval cannot approve different block bytes, and no proposal value can fabricate authority.

Required sequence is: (1) independent PASS on this exact addendum blob; (2) Franco approves that exact hash; (3) separately resume byte-exact SQL/body/locator proposal authoring; (4) independent semantic/byte/hash review and Franco approval of the exact proposal root/artifact set; (5) resume seed-registry and 91-manifest authoring; (6) independent semantic/hash review of manifests, source-slot sets, root, and tuple; (7) Franco approves the exact authority tuple; (8) separately generate and verify final P19 children with real digests and the `<=350` gate; (9) only then request any separately authorized execution-binding remediation.

Publication of this file authorizes nothing. It authorizes no SQL proposal generation, SQL execution/transformation, seed/manifest/root authoring, Prisma, schema, migration, DB/network, runner, binding change, estimation, commit, remote publication, deployment, staging, or production action.
