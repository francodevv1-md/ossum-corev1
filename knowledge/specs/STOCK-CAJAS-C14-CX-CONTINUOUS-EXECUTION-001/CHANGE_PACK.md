# Change Pack — C14 CX Continuous Documentary Execution

Status: **PREPARED / HUMAN APPROVAL REQUIRED / NON-EXECUTABLE**
Change ID: `STOCK-CAJAS-C14-CX-CONTINUOUS-EXECUTION-001`
Risk: **T3 — architecture, business semantics, exact-byte adoption, and governance evidence**
Language: English

This Change Pack defines one finite documentary chain. It does not authorize its own execution. Every SQL fragment covered here is documentary, non-executable text. Nothing in this pack grants SQL execution, migration, schema, database, Prisma, runtime, deployment, production, or implementation authority.

## 1. Decision and approval layers

Preparation approval permits only drafting and independent review of this Change Pack. It is not execution approval.

Execution approval may be given only after this exact Change Pack is independently verified and its Git blob is known. It authorizes one writer to run the ordered documentary process below, automatically continuing after each mechanical or independent-review gate passes, subject to the exact-byte adoption gate in §8 and every stop in §13.

Process approval is not approval of unknown future bytes. `Cx08SemanticSeal.semanticCandidate*` always identifies the existing approved semantic addendum in §2, never the future refreshed rendering proposal. Engram `#4986` and `#4995` are respectively its existing independent PASS and human approval sources; they must be projected truthfully into immutable repository EvidenceRefs before the seal is created. The process contains one unavoidable future exact-byte gate after the refreshed CX08 package receives independent PASS, but that gate adopts the separate refreshed proposal blob/root and ordered 11 `FragmentSeal` tuples while reaffirming the fixed semantic candidate. If no governance-valid approval explicitly binds both identity classes, the chain stops. No agent may claim that this pack's approval adopted a future hash.

Package B / `RTS1B` is created and independently reviewed as an approval candidate only. This pack does not adopt its unknown future exact bytes.

## 2. Proven starting state

The executor must recompute every identity before writing. Any mismatch is a hard stop.

| Input | Exact identity / authority |
| --- | --- |
| Rendering Approval Pack A | Git blob `6ee3c1f8e672ada1c85df35519ca52fbf4458bcb`; detached root `eaa312845cfa5ad0c4af755774e603db577eac0462cf37a83c3f6cb2f11edb28` |
| Rendering Design Approval Pack B | Git blob `8c7ffaa34cad432a75ac3fd0ed148c39f98c7074`; detached root `d79e313ece953dacfdcc9e3f2b3d902bbe310912a8d2eee01d9a67012feaa818` |
| Human approval of both packs | Engram `#4995`; documentary and non-executable |
| Independent PASS for the semantic candidate | Engram `#4986`; explicitly passed CX08-CCT-1 blob `714f7a14c0095de4f014375f5f09418170ac568e` |
| Pack B semantic-child resolution | Approved Design Pack B blob `8c7ffaa34cad432a75ac3fd0ed148c39f98c7074`, canonical row 2, binds CX08-CCT-1 blob `714f7a14c0095de4f014375f5f09418170ac568e` and `CX08-MD01..03`; `#4995` approves the exact aggregate, not an invented direct child quotation |
| Successor-stage intent | Engram `#4996`; authorizes preparation/review of non-executable successor design artifacts, not unknown-byte adoption |
| Exploration blocker | Engram `#4997`; current fragments are blocked pre-successor bytes, fragment 7 has zero margin, immutable approval EvidenceRefs are absent, and RTS08 has no standalone canonical artifact |
| Approved CX08 semantic source | `CX08_COMMAND_TRACE_COMPLETENESS_ADDENDUM.md`; Git blob `714f7a14c0095de4f014375f5f09418170ac568e`; raw byte length `82064`; raw SHA-256 `eff3b6c5507f17e5e1f76cad738bf2a9abc8dc01dae1250a0a855d1ccd677fa7` |
| Approved topology source | `RENDERING_TOPOLOGY_SPLIT_ADDENDUM.md`; Git blob `8f822836e8a4d14140dc2eb77e77f8ca996d024b` |
| Blocked CX08 proposal | `cx08-exact-rendering-proposal/PROPOSAL.md`; Git blob `d5f350e812171b62a4cf1c13ba8ca0c662fd48a2`; detached blocked root `4840afff2e98dad1e3b155685e5da7b0578940f22b0914ff9c83e97ce3be3395` |

Packs A and B remain approved only at their exact blobs and roots. This pack neither rewrites their history nor enlarges their authority.

## 3. Ownership and lock

| Field | Binding |
| --- | --- |
| Task | `C14-CX-CONTINUOUS-EXECUTION-001` |
| Writer | exactly one documentary writer |
| Reviewer | independent and read-only; must not fix reviewed bytes |
| Lock | one chain lock, transitioned `reserved → editing → review → released` at each stage |
| Concurrency | no parallel write anywhere in the allowlist |
| Continuation | automatic only after the current gate passes and no stop applies |

Another writer, an unexplained overlap, or a reviewer modifying bytes stops the chain. A failed validation enters Diagnose before any minimal in-scope correction; after correction, all affected hashes and review evidence are invalid and must be regenerated.

## 4. Exact future writable paths

No path other than the following may be written during execution.

### 4.1 Existing 14-file CX08 package

Under `knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/cx08-exact-rendering-proposal/`:

1. `PROPOSAL.md`
2. `01-check-ck-sr-scope-key.sqlfrag`
3. `02-check-ck-sre-qty-positive.sqlfrag`
4. `03-check-ck-sre-scale.sqlfrag`
5. `04-function-fn-stock-reservation-append-only.sqlfrag`
6. `05-function-fn-stock-reservation-evidence-append-only.sqlfrag`
7. `06-function-fn-stock-reservation-position-guard.sqlfrag`
8. `07-function-fn-stock-reservation-ceiling.sqlfrag`
9. `08-trigger-trg-stock-reservation-append-only.sqlfrag`
10. `09-trigger-trg-stock-reservation-evidence-append-only.sqlfrag`
11. `10-trigger-trg-stock-reservation-position-guard.sqlfrag`
12. `11-trigger-trg-stock-reservation-ceiling.sqlfrag`
13. `rendering-manifest.cj1`
14. `hashes.sha256`

### 4.2 New successor evidence files

Under `knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/`:

1. `CX08_SEMANTIC_CANDIDATE_EVIDENCE.md`
2. `CX08_REFRESHED_RENDERING_PASS_EVIDENCE.md`
3. `CX08_REFRESHED_RENDERING_ADOPTION_EVIDENCE.md`
4. `CX08_SEMANTIC_SEAL.md`
5. `CX08_SEMANTIC_SEAL_PASS_EVIDENCE.md`
6. `RENDERING_TOPOLOGY_PACKAGE_B_RTS1B.md`
7. `RENDERING_TOPOLOGY_PACKAGE_B_RTS1B_PASS_EVIDENCE.md`
8. `C14_CX_CONTINUOUS_EVIDENCE_LEDGER_AND_HANDOFF.md`

`RTS08` must be embedded as an inseparable decision inside `RENDERING_TOPOLOGY_PACKAGE_B_RTS1B.md`. A standalone RTS08 file is forbidden.

The future execution boundary is exactly 22 documentary paths: the 14 existing package files plus the eight successor files above. The approved Change Pack itself becomes immutable during execution. Unknown hashes belong in the combined evidence ledger/handoff, never backfilled into this pack.

## 5. Documentary SQL boundary

The eleven `.sqlfrag` files are reviewable documentary renderings only. They are not migrations, runner inputs, database instructions, deployable assets, or implementation authority. Their `.sqlfrag` extension, syntactic validity, deterministic hashes, independent PASS, human adoption, seal, or inclusion in Package B does not make them executable.

No command may parse them for execution, submit them to PostgreSQL, Prisma, a migration tool, a runner, a shell database client, staging, or production. The same non-executable boundary applies at every stage and survives completion.

## 6. Deterministic byte and serialization contract

All owned documentary files must be UTF-8/NFC, LF-only, without BOM, NUL, CR, or trailing horizontal whitespace, and with exactly one terminal LF. CJ1/CJL1 ordering and domain-separated preimages remain exactly those in the approved sources; no convenient reserialization is allowed.

For the CX08 package:

- preserve exactly 11 DB-object identities and ordinals, with `dbObjectDelta=0`;
- incorporate approved `CX08-MD01`, `CX08-MD02`, and `CX08-MD03` semantics from blob `714f7a14...` without inventing a fourth semantic decision;
- recompute each raw SHA-256, each `SHA256(ASCII("C14P-OBJECT-BLOCK-V2") || NUL || fragmentBytes)` value, LF count, byte length, manifest field, ordered 13-line `hashes.sha256` ledger, and detached proposal root;
- derive rather than predict every hash;
- instantiate and pass `13+ΣL(1..6,8..10)<=350`, `5+L(7)<=350`, and `5+L(11)<=350` before a semantic seal can pass;
- preserve the exact generated-object cross-child edge C→B and all topology invariants from the approved topology source.

The seal identity classes are disjoint and must never be substituted:

- fixed semantic candidate: path `knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/CX08_COMMAND_TRACE_COMPLETENESS_ADDENDUM.md`, Git blob `714f7a14c0095de4f014375f5f09418170ac568e`, byte length `82064`, raw SHA-256 `eff3b6c5507f17e5e1f76cad738bf2a9abc8dc01dae1250a0a855d1ccd677fa7`, and decision IDs `CX08-MD01`, `CX08-MD02`, `CX08-MD03`;
- future refreshed rendering: the separately derived `cx08-exact-rendering-proposal/PROPOSAL.md` Git blob, detached proposal root, and ordered 11 `FragmentSeal` tuples computed from final fragment bytes.

`semanticCandidateBlob`, `semanticCandidatePath`, `semanticCandidateByteLength`, `semanticCandidateSha256`, and `semanticDecisionIds` take only the fixed values above. The refreshed proposal blob/root never occupies a `semanticCandidate*` field. Only `fragmentSeals` binds refreshed fragment identities inside `Cx08SemanticSeal`.

Any semantic change outside the three approved MD decisions, object addition/removal, pairing change, or failed capacity equation is outside scope.

## 7. Ordered continuous stages

1. **Preflight and fixed-candidate evidence.** Recompute §2, prove all allowed paths are free of conflicting ownership, read the exact sources, and establish the exclusive lock. Create `CX08_SEMANTIC_CANDIDATE_EVIDENCE.md` as one immutable repository file with separately labeled exact projections of Engram `#4986` PASS and `#4995` human approval, explicitly binding the fixed addendum path/blob/byte length/raw SHA-256/decision IDs. The approval projection must quote `#4995` only as approval of exact Design Pack B blob/root, then mechanically resolve that approved aggregate's canonical row 2 to semantic child blob `714f7a14...`; it must not fabricate a direct child-blob statement in `#4995`. Independently verify both projection equalities, the Pack B child resolution, and the governing `EvidenceRef` representation before any refresh. If the canonical contract permits one `GIT_BLOB` EvidenceRef to that combined file, `independentPassEvidence[0]` and `humanApprovalEvidence` may use the same file reference while each resolves its separately labeled source projection; no duplicate occurs inside the one-element array.
2. **CX08 refresh.** Rewrite only the 14 files in §4.1. Replace blocked semantics with the approved MD01–MD03 rendering, regenerate the deterministic manifest/hash ledger/root, and retain explicit non-executable language.
3. **Independent refreshed-rendering review.** A read-only reviewer recomputes every refreshed leaf, domain hash, manifest field, proposal root, identity, dependency/event/error inventory, semantic mapping, byte profile, and topology equation. The writer may record only a genuine PASS in `CX08_REFRESHED_RENDERING_PASS_EVIDENCE.md` and the combined ledger/handoff.
4. **One exact-byte adoption gate.** Apply §8. If exact approval is absent, stop without creating a seal. If it is valid, create `CX08_REFRESHED_RENDERING_ADOPTION_EVIDENCE.md` as the immutable repository projection and continue automatically. This is the only future approval gate in the chain.
5. **`Cx08SemanticSeal`.** Create `CX08_SEMANTIC_SEAL.md` exactly from the approved topology schema. Its five `semanticCandidate*` fields and three decision IDs bind only the fixed addendum identity in §6; `independentPassEvidence[0]` resolves the separately labeled `#4986` projection and `humanApprovalEvidence` resolves the separately labeled `#4995` projection in the immutable semantic-candidate evidence file; `fragmentSeals` binds only the separately adopted refreshed fragment bytes. Bind `dbObjectCount=11`, `dbObjectDelta=0`, and recompute `semanticSealSha256` under `C14-RTS-CX08-SEMANTIC-SEAL-V1`. The refreshed proposal blob/root remain external supporting identities and never substitute for a seal field.
6. **Independent seal review.** Verify every EvidenceRef against its immutable repository projection and source record; verify the fixed semantic candidate identity, separate refreshed proposal/root and all fragment bytes, ordering, equations, and seal preimage. Record PASS only in `CX08_SEMANTIC_SEAL_PASS_EVIDENCE.md` and the combined ledger/handoff.
7. **Package B / `RTS1B`.** Create one non-severable `RENDERING_TOPOLOGY_PACKAGE_B_RTS1B.md` embedding `RTS08` with `RTS00`, `RTS07`, `RTS12`, and the exact passed seal. Instantiate the nine ParentBindings, 24 projections/source-set descriptors, topology hash, field/count contracts, and all Package B equations. Do not create an RTS08 side artifact.
8. **Independent final review.** Recompute all source blobs, EvidenceRefs, seal and topology hashes, ParentBindings, projection partitions, descriptors, DAG, equations, and non-authority language. Record genuine PASS in `RENDERING_TOPOLOGY_PACKAGE_B_RTS1B_PASS_EVIDENCE.md` and the combined ledger/handoff.
9. **Handoff.** Finalize `C14_CX_CONTINUOUS_EVIDENCE_LEDGER_AND_HANDOFF.md`, release all locks, and stop. Package B remains a reviewed, non-executable approval candidate; later exact-byte adoption is outside this pack.

A successful gate is not a reason to ask a routine question. Continue automatically except at §8 or a §13 stop.

## 8. Safe preauthorization and exact-byte adoption

Franco's execution approval of this pack preauthorizes the process, bounded writes, deterministic derivation, independent reviews, corrections through Diagnose, and automatic continuation. It does not preapprove the future refreshed proposal blob, detached root, or 11 fragment tuples. The fixed semantic candidate is already the exact approved addendum identified in §2; its source PASS and approval are `#4986` and `#4995`.

After independent refreshed-rendering PASS, the coordinator must present exactly one adoption statement containing the future proposal Git blob, detached root SHA-256, all 11 fragment V2 hashes/LF counts, and refreshed-rendering PASS EvidenceRef. The same statement must reaffirm the distinct fixed semantic candidate path/blob/byte length/raw SHA-256/decision IDs and its `#4986`/`#4995` evidence. Franco must approve that combined tuple. A response that omits, abbreviates, changes, or conflates either identity class is not adoption evidence.

The exact statement template is:

> I approve the refreshed non-executable CX08 exact-rendering proposal at Git blob `<refreshed-proposal-blob>`, detached root `<refreshed-proposal-root-sha256>`, with the exact ordered 11 `FragmentSeal` tuples and independent refreshed-rendering PASS EvidenceRef `<refreshed-pass-evidence-ref>` recorded in `CX08_REFRESHED_RENDERING_PASS_EVIDENCE.md`. Separately, I reaffirm that `Cx08SemanticSeal.semanticCandidate*` identifies only `knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/CX08_COMMAND_TRACE_COMPLETENESS_ADDENDUM.md`, Git blob `714f7a14c0095de4f014375f5f09418170ac568e`, byte length `82064`, raw SHA-256 `eff3b6c5507f17e5e1f76cad738bf2a9abc8dc01dae1250a0a855d1ccd677fa7`, and decision IDs `CX08-MD01`, `CX08-MD02`, `CX08-MD03`, with independent PASS source Engram `#4986` and human approval source Engram `#4995`. I confirm that the refreshed rendering preserves exactly 11 DB-object identities with zero object delta and passes all three RTS08 capacity equations. I authorize creation and independent verification of the exact `Cx08SemanticSeal` with those fixed semantic-candidate fields and the separately adopted 11 fragment seals, followed automatically by the non-severable Package B / `RTS1B` candidate with RTS08 embedded, under `STOCK-CAJAS-C14-CX-CONTINUOUS-EXECUTION-001`. This remains documentary and non-executable and grants no schema, migration, database, runtime, implementation, commit, publication, deployment, or production authority.

The writer then creates `CX08_REFRESHED_RENDERING_ADOPTION_EVIDENCE.md` as an exact repository projection of the actual response and its Engram observation metadata, computes its Git blob, and obtains read-only equality review. `CX08_SEMANTIC_CANDIDATE_EVIDENCE.md` separately projects the already existing `#4986` PASS and `#4995` approval for the fixed addendum. The adoption projection may bind and reaffirm both identity classes, but `Cx08SemanticSeal.independentPassEvidence` and `.humanApprovalEvidence` must explicitly identify the fixed addendum candidate exactly as canonical §6.6 requires; they must not identify the refreshed proposal as `semanticCandidateBlob`. Repository projections do not manufacture human approval: they bind exact source records and state the residual trust of the Engram interface. If the governing `EvidenceRef` contract cannot represent either proof without false immutability, stop. No placeholder, `latest`, mutable lookup, predicted hash, or process-approval substitution is valid.

## 9. Evidence ledger

`C14_CX_CONTINUOUS_EVIDENCE_LEDGER_AND_HANDOFF.md` is append-only by stage until its final handoff section is closed and contains only evidence already known. Initial unknowns are literal `pending` and must never be guessed.

| Evidence | Initial value |
| --- | --- |
| Change Pack Git blob / raw SHA-256 | pending until this file is finalized |
| Execution approval record / AGENTS active-record blob | pending |
| Fixed semantic candidate path / blob / byte length / raw SHA-256 / MD01–MD03 | `CX08_COMMAND_TRACE_COMPLETENESS_ADDENDUM.md` / `714f7a14c0095de4f014375f5f09418170ac568e` / `82064` / `eff3b6c5507f17e5e1f76cad738bf2a9abc8dc01dae1250a0a855d1ccd677fa7` / fixed |
| Fixed semantic candidate PASS / approval projections | Engram `#4986` / `#4995`; repository EvidenceRefs pending |
| Refreshed CX08 proposal blob / detached root | pending |
| Ordered 11 fragment V2 hashes and LF counts | pending |
| Refreshed-rendering independent PASS EvidenceRef | pending |
| Refreshed-rendering adoption source / repository EvidenceRef | pending |
| `semanticSealSha256` / seal PASS EvidenceRef | pending |
| Package B blob / `renderingTopologySha256` | pending |
| Package B final PASS EvidenceRef | pending |
| Final handoff blob | pending |

Every evidence file states its subject path, exact Git blob, raw SHA-256 where applicable, reviewer role, verdict, checks performed, exclusions, and source evidence. A ledger row cannot attest to its own containing blob; self-referential values remain external or are entered only in a later artifact.

## 10. Allowed commands

Only read/search and the following path-limited, non-destructive command classes are allowed:

- `git status --short -- <exact-allowlisted-paths>`;
- `git diff -- <exact-allowlisted-paths>` and `git diff --no-index -- /dev/null <new-file>` where supported;
- `git diff --check -- <exact-allowlisted-paths>`;
- `git hash-object -- <exact-allowlisted-file>` without `-w`;
- `git show`, `git log`, and `git rev-parse` only for read-only provenance checks;
- SHA-256 calculation over exact allowlisted file bytes;
- read-only Node or PowerShell assertions that load only approved sources/allowlisted artifacts and compute byte profile, CJ1/CJL1 serialization, SHA-256/domain preimages, line counts, set equality, ordering, graph, and capacity equations;
- Engram exact-ID reads and evidence persistence required by the approved process.

Assertions must be deterministic, offline, and read-only. They may not access a database, network service other than the existing local Engram interface, runtime application, Prisma, or package installer. No dependency installation or declaration change is allowed.

## 11. Git and governance record

Default: **no commits**. This pack authorizes no `git add`, commit, amend, rebase, merge, tag, push, PR, or publication. A commit requires separate explicit approval and a new bounded task.

After Franco approves this exact Change Pack for execution, but before stage 1, one separately bounded governance action may append one new exact active T3 approval section to root `AGENTS.md`. That section may state only: approved Change ID, exact approved Change Pack Git blob, approval date and Engram observation ID, one-writer documentary scope, exact exclusions, and the §8 exact-byte gate. It must not edit, reorder, reinterpret, supersede, or weaken any existing rule. The append receives its own lock, path-limited diff, independent read-only review, `git diff --check`, Git blob, and release. No execution may rely on an absent or inaccurate active record.

This conditional append is the only future `AGENTS.md` write contemplated here. It is not performed while preparing this pack and is not authority to alter `AGENTS.md` in any other way.

## 12. Explicit exclusions

Excluded without exception: `prisma/schema.prisma`; migrations; database or catalog access; SQL execution; seed/backfill; application/runtime code; Auth; security; permissions; multi-company changes; provider or storage changes; dependencies, manifests, lockfiles, or installs; API/service/validator/UI changes; Git staging/commits/amend/rebase/merge/tag/push/PR; deploy/staging/production; destructive actions; publication; C14 implementation; authority-root implementation; and any file not in §4 or the separately bounded §11 append.

## 13. Hard stops

Stop, preserve evidence, and release or freeze the lock safely if:

- this exact pack lacks execution approval or the authoritative `AGENTS.md` active record;
- any §2 source blob/root mismatches;
- a required path, semantic decision, object, command, or scope expands;
- another writer or unexplained modification overlaps an owned path;
- independent review returns FAIL and Diagnose cannot prove a minimal in-scope correction;
- an EvidenceRef, fixed-candidate PASS/approval, refreshed-rendering adoption, source record, or immutable projection cannot be represented truthfully or fails to keep the two identity classes distinct;
- a canonical source conflict cannot be resolved by the authority order;
- any RTS08 equation fails, the 11-object set changes, or Package B would be severed;
- schema, migration, database, Prisma, runtime, C14 implementation, production, destructive, commit, or publication action is needed.

Do not retry unchanged failures indefinitely. A stop asks only the one precise question needed to resolve the breached boundary.

## 14. Rollback and completion

Before an artifact receives independent PASS, rollback may alter only that stage's allowlisted unapproved files and must not restore, reset, stash, checkout, or overwrite unrelated work. Once exact bytes receive independent PASS or human adoption, they are immutable for this chain. Correcting them invalidates all downstream hashes/evidence and requires returning to the earliest affected stage; changing approved semantics or adopted bytes requires a new separately approved task.

Completion requires: truthful immutable repository projections of `#4986` PASS and `#4995` approval for the fixed semantic addendum; refreshed 14-file CX08 package; independent refreshed-rendering PASS; one valid exact-byte adoption of the distinct refreshed proposal/root and 11 fragment tuples while reaffirming the fixed candidate; created and independently passed `Cx08SemanticSeal` whose `semanticCandidate*` fields remain fixed to blob `714f7a14...`; created non-severable Package B / `RTS1B` with embedded RTS08; independent final PASS; complete combined evidence ledger/handoff; no forbidden-path changes; and all locks released.

Completion grants no execution, migration, schema, database, runtime, implementation, commit, publication, deployment, or production authority.

## 15. Execution approval request

After independent verification reports this Change Pack's exact Git blob and raw SHA-256, Franco may answer once with the following statement:

> I approve `STOCK-CAJAS-C14-CX-CONTINUOUS-EXECUTION-001` at exact Git blob `<change-pack-blob>` and raw SHA-256 `<change-pack-sha256>` for the finite continuous documentary process exactly as written, including the separately bounded append-only `AGENTS.md` active record, one writer, automatic continuation after passing gates, and the mandatory §8 exact-byte adoption gate. I do not approve unknown future hashes by this statement. I approve no schema, migration, database, SQL execution, runtime, implementation, dependency, commit, push, PR, deployment, production, destructive, or publication action.

Until Franco supplies that exact response against the independently verified pack bytes and the active record is appended and reviewed, status remains **PREPARED / HUMAN APPROVAL REQUIRED / NON-EXECUTABLE**.
