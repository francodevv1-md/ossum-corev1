# CX08 Semantic Seal

Status: **SEAL CANDIDATE / INDEPENDENT REVIEW REQUIRED / NON-EXECUTABLE**

## 1. Purpose and authority boundary

This file instantiates exactly the canonical `Cx08SemanticSealCore` defined by `RENDERING_TOPOLOGY_SPLIT_ADDENDUM.md` §6.6. It binds the fixed approved CX08 semantic candidate to the separately adopted refreshed rendering fragment identities. It does not instantiate Package B / `RTS1B`, does not record independent seal PASS, and does not update the combined ledger.

The fixed semantic candidate and refreshed rendering are distinct identity classes. The `semanticCandidate*` fields below identify only `CX08_COMMAND_TRACE_COMPLETENESS_ADDENDUM.md`. The refreshed proposal blob and detached root support adoption of the eleven `fragmentSeals` but do not occupy any semantic-candidate field and do not enter the canonical core.

This seal is documentary and non-executable. It grants no schema, migration, database/catalog access, SQL execution, Prisma, runtime implementation, Auth, security, permissions, multi-company change, dependency, Git staging/commit/publication, deployment, staging, production, destructive, remote, or final-completion authority.

## 2. Canonical `Cx08SemanticSealCore` CJ1 bytes

The following fenced content is the complete canonical core: UTF-8/NFC, object keys sorted by Unicode scalar value, arrays in declared order, no insignificant whitespace, and exactly one LF after the closing brace. The fence markers and their surrounding Markdown are not part of the core.

```cj1
{"dbObjectCount":11,"dbObjectDelta":0,"fragmentSeals":[{"fragmentPath":"01-check-ck-sr-scope-key.sqlfrag","fragmentSha256":"7e30710cc982d5073655767061e2748b9b0473d999225778e31928f216a5a119","lfCount":13,"objectId":"check:ck_sr_scope_key","objectOrdinal":1},{"fragmentPath":"02-check-ck-sre-qty-positive.sqlfrag","fragmentSha256":"ad46f921cccc6a787fba83052172308ca67a5e88f4aab9471d1ecd5eae401655","lfCount":3,"objectId":"check:ck_sre_qty_positive","objectOrdinal":2},{"fragmentPath":"03-check-ck-sre-scale.sqlfrag","fragmentSha256":"922e9afcdb7da59e597c073acd08a960a79136341f02cc5745fb0ed1fcd16173","lfCount":3,"objectId":"check:ck_sre_scale","objectOrdinal":3},{"fragmentPath":"04-function-fn-stock-reservation-append-only.sqlfrag","fragmentSha256":"0cb04ff768a4ac395670d4756b27bc3fe21efd43e654acff37bf9d3be5172d98","lfCount":20,"objectId":"function:fn_stock_reservation_append_only","objectOrdinal":4},{"fragmentPath":"05-function-fn-stock-reservation-evidence-append-only.sqlfrag","fragmentSha256":"02f864cc1f914e58dbb88dfe9d54f37d2badcea24dd10e80dc3a6a02b9dafeec","lfCount":20,"objectId":"function:fn_stock_reservation_evidence_append_only","objectOrdinal":5},{"fragmentPath":"06-function-fn-stock-reservation-position-guard.sqlfrag","fragmentSha256":"eb9e54347ad7b761f61872b35a9adfff23289337c257b5768d237bd1f3d0d996","lfCount":45,"objectId":"function:fn_stock_reservation_position_guard","objectOrdinal":6},{"fragmentPath":"07-function-fn-stock-reservation-ceiling.sqlfrag","fragmentSha256":"e3c6ca5d1488a43dba87169a422833949e4b7fae9945dbcaa717c4fe14731693","lfCount":273,"objectId":"function:fn_stock_reservation_ceiling","objectOrdinal":7},{"fragmentPath":"08-trigger-trg-stock-reservation-append-only.sqlfrag","fragmentSha256":"d46cd7e157d4b7f5381635e067d9f19086045ede6c541ee3c970521a3af9be55","lfCount":4,"objectId":"trigger:trg_stock_reservation_append_only","objectOrdinal":8},{"fragmentPath":"09-trigger-trg-stock-reservation-evidence-append-only.sqlfrag","fragmentSha256":"2689f478119eddcfe4e165ab588fd32e072357c1a07730e3a2fb1fba340cdeaa","lfCount":4,"objectId":"trigger:trg_stock_reservation_evidence_append_only","objectOrdinal":9},{"fragmentPath":"10-trigger-trg-stock-reservation-position-guard.sqlfrag","fragmentSha256":"e74840c0355cab6d58a7797d1efa16abf69b7aef7fb24c715f3bbdc652ecba16","lfCount":4,"objectId":"trigger:trg_stock_reservation_position_guard","objectOrdinal":10},{"fragmentPath":"11-trigger-trg-stock-reservation-ceiling.sqlfrag","fragmentSha256":"a413cf33aaf53e85fde6d516efadc8dbd04ba70a57d137bf7148b2dc7a481b3c","lfCount":4,"objectId":"trigger:trg_stock_reservation_ceiling","objectOrdinal":11}],"humanApprovalEvidence":{"blob":"db4341c713034c49598d5c267a3c071c365ef5b3","kind":"GIT_BLOB","path":"knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/CX08_SEMANTIC_CANDIDATE_EVIDENCE.md"},"independentPassEvidence":[{"blob":"db4341c713034c49598d5c267a3c071c365ef5b3","kind":"GIT_BLOB","path":"knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/CX08_SEMANTIC_CANDIDATE_EVIDENCE.md"}],"schemaVersion":"C14-RTS-CX08-SEMANTIC-SEAL-V1","semanticCandidateBlob":"714f7a14c0095de4f014375f5f09418170ac568e","semanticCandidateByteLength":82064,"semanticCandidatePath":"knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/CX08_COMMAND_TRACE_COMPLETENESS_ADDENDUM.md","semanticCandidateSha256":"eff3b6c5507f17e5e1f76cad738bf2a9abc8dc01dae1250a0a855d1ccd677fa7","semanticDecisionIds":["CX08-MD01","CX08-MD02","CX08-MD03"]}
```

The core has exactly eleven top-level fields in canonical key order:

```text
dbObjectCount,dbObjectDelta,fragmentSeals,humanApprovalEvidence,independentPassEvidence,schemaVersion,semanticCandidateBlob,semanticCandidateByteLength,semanticCandidatePath,semanticCandidateSha256,semanticDecisionIds
```

Each `FragmentSeal` has exactly five keys in canonical order `fragmentPath,fragmentSha256,lfCount,objectId,objectOrdinal`. Each `EvidenceRef` has exactly three keys in canonical order `blob,kind,path`. `independentPassEvidence` contains exactly one element. No null, placeholder, current/latest lookup, omitted field, duplicate evidence-array element, unknown field, proposal blob, or detached proposal root occurs in the core.

## 3. Complete seal preimage and result

Let `coreCj1Bytes` be exactly the LF-terminated fenced line in §2. The complete preimage is:

```text
ASCII("C14-RTS-CX08-SEMANTIC-SEAL-V1") || 0x00 || coreCj1Bytes
```

The computed identities are:

| Field | Exact value |
|---|---|
| Schema/domain literal | `C14-RTS-CX08-SEMANTIC-SEAL-V1` |
| Core CJ1 byte length | `3439` |
| Core CJ1 raw SHA-256 | `048ddebd6084350fca9bf0b6d99d1319781d13c31fe5b8461eaa2ab810abc0ac` |
| `semanticSealSha256` | `09e3687e115f23dcac6093a7f8d22ea992eb293699e011eada00d04fcf543302` |

`Cx08SemanticSeal` adds only that `semanticSealSha256` to the core. The self-hash is not part of its own preimage.

## 4. Fixed semantic candidate and EvidenceRef resolution

| Field | Exact bound value |
|---|---|
| Semantic candidate path | `knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/CX08_COMMAND_TRACE_COMPLETENESS_ADDENDUM.md` |
| Semantic candidate Git blob | `714f7a14c0095de4f014375f5f09418170ac568e` |
| Semantic candidate byte length | `82064` |
| Semantic candidate raw SHA-256 | `eff3b6c5507f17e5e1f76cad738bf2a9abc8dc01dae1250a0a855d1ccd677fa7` |
| Semantic decision IDs | `CX08-MD01`, `CX08-MD02`, `CX08-MD03` in that order |
| Semantic evidence projection | `{"kind":"GIT_BLOB","blob":"db4341c713034c49598d5c267a3c071c365ef5b3","path":"knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/CX08_SEMANTIC_CANDIDATE_EVIDENCE.md"}` |
| Projection independent PASS | Engram `#5013` |

The single immutable projection referenced in both evidence fields contains separately labeled claims. `independentPassEvidence[0]` resolves §2 of that file, which projects Engram `#4986` direct independent PASS for the fixed child blob. `humanApprovalEvidence` resolves §§3–4, which project Engram `#4995` approval of exact Design Pack B and mechanically resolve canonical row 2 to the same child path/blob and decision set. Reusing the same canonical `GIT_BLOB` EvidenceRef across these two differently typed fields is permitted by the Change Pack; the one-element independent-PASS array contains no duplicate.

The projection file recomputes to Git blob `db4341c713034c49598d5c267a3c071c365ef5b3`. Its repository immutability does not cryptographically attest the Engram service; the residual rendered-interface trust stated by that projection remains.

## 5. Separately adopted refreshed fragment identities

The eleven `fragmentSeals` are ordinal-ordered and bind the final refreshed fragment bytes. For each row, `fragmentSha256=SHA256(ASCII("C14P-OBJECT-BLOCK-V2") || 0x00 || exact fragment bytes)`; `lfCount` is counted from those same bytes. All paths are relative to `knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/cx08-exact-rendering-proposal/`.

| Ordinal | Object ID | Fragment path | V2 SHA-256 | LF | Bytes |
|---:|---|---|---|---:|---:|
| 1 | `check:ck_sr_scope_key` | `01-check-ck-sr-scope-key.sqlfrag` | `7e30710cc982d5073655767061e2748b9b0473d999225778e31928f216a5a119` | 13 | 347 |
| 2 | `check:ck_sre_qty_positive` | `02-check-ck-sre-qty-positive.sqlfrag` | `ad46f921cccc6a787fba83052172308ca67a5e88f4aab9471d1ecd5eae401655` | 3 | 128 |
| 3 | `check:ck_sre_scale` | `03-check-ck-sre-scale.sqlfrag` | `922e9afcdb7da59e597c073acd08a960a79136341f02cc5745fb0ed1fcd16173` | 3 | 129 |
| 4 | `function:fn_stock_reservation_append_only` | `04-function-fn-stock-reservation-append-only.sqlfrag` | `0cb04ff768a4ac395670d4756b27bc3fe21efd43e654acff37bf9d3be5172d98` | 20 | 745 |
| 5 | `function:fn_stock_reservation_evidence_append_only` | `05-function-fn-stock-reservation-evidence-append-only.sqlfrag` | `02f864cc1f914e58dbb88dfe9d54f37d2badcea24dd10e80dc3a6a02b9dafeec` | 20 | 781 |
| 6 | `function:fn_stock_reservation_position_guard` | `06-function-fn-stock-reservation-position-guard.sqlfrag` | `eb9e54347ad7b761f61872b35a9adfff23289337c257b5768d237bd1f3d0d996` | 45 | 1557 |
| 7 | `function:fn_stock_reservation_ceiling` | `07-function-fn-stock-reservation-ceiling.sqlfrag` | `e3c6ca5d1488a43dba87169a422833949e4b7fae9945dbcaa717c4fe14731693` | 273 | 16119 |
| 8 | `trigger:trg_stock_reservation_append_only` | `08-trigger-trg-stock-reservation-append-only.sqlfrag` | `d46cd7e157d4b7f5381635e067d9f19086045ede6c541ee3c970521a3af9be55` | 4 | 183 |
| 9 | `trigger:trg_stock_reservation_evidence_append_only` | `09-trigger-trg-stock-reservation-evidence-append-only.sqlfrag` | `2689f478119eddcfe4e165ab588fd32e072357c1a07730e3a2fb1fba340cdeaa` | 4 | 209 |
| 10 | `trigger:trg_stock_reservation_position_guard` | `10-trigger-trg-stock-reservation-position-guard.sqlfrag` | `e74840c0355cab6d58a7797d1efa16abf69b7aef7fb24c715f3bbdc652ecba16` | 4 | 189 |
| 11 | `trigger:trg_stock_reservation_ceiling` | `11-trigger-trg-stock-reservation-ceiling.sqlfrag` | `a413cf33aaf53e85fde6d516efadc8dbd04ba70a57d137bf7148b2dc7a481b3c` | 4 | 183 |

These tuples were separately adopted with proposal blob `b124a0f795fe4ce74300f5dde3a899f14277cc1b`, detached proposal root `dcdd12fd13e50368dec6d16e04e8ff8e146b3a6aa0edba0e1ef6cf7d95af2b0d`, and adoption evidence blob `df4464cb60a31da8c4929da9e0851a53afdaa867` through the bounded decision recorded by Engram `#5017`. Independent adoption-evidence review Engram `#5019` returned PASS. Those proposal/root/adoption identities establish the source of the fragment tuple but remain external to `Cx08SemanticSealCore`.

The fixed inventory remains exactly `dbObjectCount=11` and `dbObjectDelta=0`. The instantiated capacities are A `13+(13+3+3+20+20+45+4+4+4)=129<=350`, B `5+273=278<=350`, and C `5+4=9<=350`.

## 6. Review hold

This seal remains review-held. An independent read-only reviewer must recompute the fixed candidate and evidence-projection identities; resolve the separately labeled `#4986` and `#4995` claims; recompute the adopted proposal/adoption identities; recompute every final fragment byte length, LF count, and V2 hash; verify all three capacity equations; extract and byte-compare the exact CJ1 core; verify canonical keys, arrays, counts, decision order, and evidence cardinality; and recompute the complete domain-separated preimage and `semanticSealSha256`.

No `CX08_SEMANTIC_SEAL_PASS_EVIDENCE.md`, ledger update, Package B / `RTS1B`, or completion claim may be created from this writer stage. Only a genuine independent PASS may release the seal for the next approved documentary stage.
