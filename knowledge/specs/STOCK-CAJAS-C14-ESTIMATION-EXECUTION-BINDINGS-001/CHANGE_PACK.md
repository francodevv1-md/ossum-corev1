# Change Pack — C14 External Estimation Execution Bindings

Status: **CX BINDINGS FINALIZED — EXECUTION BLOCKED (0/13 UNRESOLVED)**  
Change ID: `STOCK-CAJAS-C14-ESTIMATION-EXECUTION-BINDINGS-001`  
Risk: **T3 — migration estimation tooling; no estimation run authorized**  
Mode: **documentary bindings plus tested runner; verification modes only**

## 1. Authority and exact boundary

Franco approved the non-severable A–D binding addendum at exact Git content hash `a860049af04a6ff07fbe9fae6ddb512a8ef0adc8` (Engram #4779) and authorized one atomic writer to finalize the coupled catalog, CX01–CX13 vectors, runner, tests, contracts, manifests, and hashes (Engram #4780). Prior preparation authority is Engram #4774. Semantic authority is C04 #4318r1/#4319r2/#4321, C05 #4324r3/#4329, J1 #4767, P3 #4769, integrated D3 #4771, D8a #4762, final C13 commit `0faf2f55e178f1b111c5ae108380a505a68c8feb` / schema `47313a8a85ac71ac56df93ce212593820cb95a13`, recommendation blob `0fd2959cd149d3c37b4162cdb2c232dd9dd35a71`, matrix blob `4f8536560fd94ba0af92091739a333986ee75eee`, and topology blob `b8608a922d2d9adf5d776673252f709c52d4a518`.

These approvals are documentary and NON-EXECUTABLE. No artifact here grants authority to generate estimation evidence, create the external root, invoke Prisma, access a database or network, write/transform/accept migration SQL, modify repository content outside this directory, stage, commit, contact remotes, deploy, or act in production. `bindings/toolchain.json.executionApproval` remains deliberately `null`.

## 2. Complete hash-coupled set

Exactly these 12 files comprise the set:

1. `CHANGE_PACK.md`
2. `runner.mjs`
3. `runner.test.mjs`
4. `bindings/toolchain.json`
5. `bindings/commands.json`
6. `bindings/projection-manifest.jsonl`
7. `bindings/cx-catalog.json`
8. `bindings/cx-occurrences.jsonl`
9. `bindings/cx-vectors.jsonl`
10. `bindings/isolation.json`
11. `bindings/evidence-layout.json`
12. `hashes.sha256`

`hashes.sha256` covers the other eleven files exactly, in lexical path order, with lowercase SHA-256, two ASCII spaces, forward-slash relative paths, and LF. The detached binding-set root is `SHA256(exact hashes.sha256 bytes)` and is reported outside the covered set to avoid a circular rewrite.

## 3. Final CX catalog and vectors

`bindings/cx-catalog.json` is finalized as `c14-cx-catalog-v1-a860049a`. It contains exactly 11 canonical renderer units: transaction/provenance scaffold, extension, check, function, ordinary trigger, exclusion, constraint trigger, predicate, branch, dependency, and event. Every unit binds:

- exact UTF-8/LF template bytes and placeholder grammar;
- zero- and one-occurrence fixtures and rendered bytes;
- measured physical-line delta and exact delta formula;
- named authority citation;
- source, template, and fixture SHA-256.

`bindings/cx-occurrences.jsonl` is the canonical hash-bound provenance ledger. Its 610 entries enumerate 168 objects, 194 predicates, 80 mutually exclusive branches, 59 directed dependencies, and 109 trigger events. Every occurrence has a stable ID, owning CX, category-specific data, pinpoint canonical citation, and SHA-256 over canonical core JSON. Per-CX ledger count/hash bindings prevent omission, reassignment, or coordinated vector tampering.

`bindings/cx-vectors.jsonl` contains exactly CX01–CX13 at the topology-approved attachment points. Every row has `unresolved=false`, `reviewStatus="approved-documentary"`, `splitRequired=false`, no semantic questions, exact named custom objects/invariants, complete citations, and ledger-derived object/occurrence counts and forecasts. The maximum forecast is CX12 at 264 lines, below the 350-line gate. Custom identities are globally unique and explicitly exclude Prisma-supported tables, enums, columns, PKs, FKs, uniques, and indexes.

The approved A–D consequences are preserved:

- CX03/CX04/CX07/CX08/CX11/CX12 bind ordered stable-parent `FOR UPDATE NOWAIT` serialization and retry semantics as documentary invariants.
- CX01 binds the exact catalog-selected `btree_gist` tuple, `public.gist_text_ops`, create-or-exact-no-op, ownership/privilege checks, and fail-closed postconditions.
- CX09 omits `ck_spp_available` and any projection-fold function/trigger while retaining row-local structural checks; the context-sensitive arm remains deferred to C19/C31.
- Minimum-line D9 event occurrences are exactly CX10=3, CX11=3, CX12=0, and CX13=9, with five dedicated family functions and ten constraint triggers overall.

## 4. Runner verification contracts

`runner.mjs verify-bindings` verifies:

- exact ten-file hash coverage and detached root;
- finalized 11-unit catalog inventory and all per-unit hashes/renders/deltas;
- exact occurrence-ledger schema, stable IDs, categories, ownership, citations, per-entry hashes, per-CX hashes, and referential integrity;
- exact CX ID/child/attachment/snapshot topology;
- ledger-derived named-object class counts and global non-overlap;
- addendum citation, empty semantic questions, and finalized review state;
- ledger-derived predicate/branch/dependency/event totals, renderer forecast recomputation, and the 350-line ceiling;
- A–D fixed consequences, projection-manifest counts, pinned local identities, and frozen Git provenance;
- continued execution blocking because exact detached-root execution approval is absent.

`runner.mjs verify-projections` remains read-only: it uses only pinned Git, reconstructs all 25 projections in memory, and proves semantic `P22=P21` and `P24=P23`. `parser-self-test` remains a deterministic in-memory 12-case worker. Neither mode creates the external root or invokes Prisma, a database, or a network endpoint.

The `run` mode remains implemented only as a future separately approvable path. It is forbidden by this task and fails before containment/root/process work unless the finalized rows/catalog and a later exact execution approval all bind the detached root and frozen parent identities.

## 5. Projection, process, and evidence contracts

The existing projection quarantine remains 32 models, 14 enums, and 57 inverse fields, with 24 accepted models and eight never models. Every projection is independently constructed from raw Git snapshots; projected states are never chained. PS22 and PS24 remain required no-op identities.

The existing shell-free process, sanitized environment, path containment/reparse rejection, immutable command capture, PostgreSQL lexical blocking, write-once evidence, repository guards, acyclic completion, and no-network tradeoff contracts remain unchanged except that the pre-root gate is now the absent exact execution approval rather than unresolved CX rows. `bindings/isolation.json`, `bindings/commands.json`, and `bindings/evidence-layout.json` expose the finalized machine-readable contracts.

## 6. Permitted validation and explicit prohibition

Permitted now:

```text
node --check runner.mjs
node --test runner.test.mjs
node runner.mjs verify-bindings
node runner.mjs verify-projections
node runner.mjs parser-self-test
exact hash coverage/detached-root checks
path-limited git status/diff/diff --check
```

Forbidden now: `node runner.mjs run` or any equivalent invocation; real Prisma format/validate/diff; external-root creation; SQL/migration/DB/network work; repository edits outside this directory; staging, commit, remotes, deployment, or production.

## 7. Closure condition

This package is review-ready and internally finalized, but intentionally non-executable. `verify-bindings` must report `unresolvedCx=0` and `executionBlocked=true`. An independent read-only verifier must reproduce all checks and the detached root. Any future estimation execution requires a new exact Franco approval bound to that root and all frozen parent/toolchain identities; no current approval is transitive.
