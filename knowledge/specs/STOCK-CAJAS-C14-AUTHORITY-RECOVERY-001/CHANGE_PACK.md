# Change Pack — C14 Canonical Authority Recovery and RTS1B Continuation

Status: **PREPARED / PRECONDITION-BLOCKED / HUMAN APPROVAL REQUIRED / NON-EXECUTABLE**

Change ID: `STOCK-CAJAS-C14-AUTHORITY-RECOVERY-001`

Engram `#5028` authorizes preparation of this file only. Exploration `#5029` proves that execution is currently blocked. This pack cannot authorize itself, satisfy a prerequisite, approve unknown bytes, access a database/catalog, or activate execution.

## 1. Authority layers and safe approval choice

The five non-transitive layers are: (1) this preparation; (2) external prerequisite satisfaction and exact adoption; (3) later approval of this exact pack for its finite process plus an accurate `AGENTS.md` active record; (4) one later human adoption of the independently passed exact canonical `AuthorityTuple`/root; and (5) automatic deterministic RTS1B reserialization, Package B authoring/review, and ledger closure. Passing one layer grants no later layer.

Governance-safe choice: **do not approve a dormant execution envelope now**. Independently review this prepared file now, but Franco may approve its process only after every §3 prerequisite exists at exact immutable identities. That approval still cannot adopt the then-unknown authority or Package B bytes. No `AGENTS.md` change occurs in this task.

## 2. Fixed sources

| Source | Exact current identity / authority |
|---|---|
| Canonical rendering/authority contract | `CANONICAL_RENDERING_OWNERSHIP_MANIFEST_PROPOSAL.md` blob `b1045fd3f66defcbb0bac7a1cc0adcadf783b81a`; P01–P19 + P16-B/U01-A/U02-A approved by `#4802` |
| Catalog binding | `BTREE_GIST_CATALOG_BINDING_ADDENDUM.md` blob `d8fa5b6d14b563f44008ba52234421a09182990a`; CB01-C/CB02-B/CB03-A/CB04-A/CB05-A/CB06-A/CB07-B approved by `#4841` |
| Topology | `RENDERING_TOPOLOGY_SPLIT_ADDENDUM.md` blob `8f822836e8a4d14140dc2eb77e77f8ca996d024b`; independently passed `#4986`; approved through Pack B `#4995` |
| Rendering Pack A | blob `6ee3c1f8e672ada1c85df35519ca52fbf4458bcb`; root `eaa312845cfa5ad0c4af755774e603db577eac0462cf37a83c3f6cb2f11edb28`; `#4995` |
| Rendering Design Pack B | blob `8c7ffaa34cad432a75ac3fd0ed148c39f98c7074`; root `d79e313ece953dacfdcc9e3f2b3d902bbe310912a8d2eee01d9a67012feaa818`; `#4995` |
| Refreshed CX08 | proposal blob `b124a0f795fe4ce74300f5dde3a899f14277cc1b`; root `dcdd12fd13e50368dec6d16e04e8ff8e146b3a6aa0edba0e1ef6cf7d95af2b`; adopted `#5017` |
| Passed CX08 seal | seal blob `cd543667c914e7ce60e007ea8c223b094a2ce100`; `semanticSealSha256=09e3687e115f23dcac6093a7f8d22ea992eb293699e011eada00d04fcf543302`; PASS EvidenceRef blob `66668af2aa2b3f819d16d56aefb8e776779d1d92`; reviews `#5021/#5023` |
| Governing continuous pack / current ledger | pack blob `8dd880ee1661ac1d80d220bc1e62b185026eb6f6`; ledger blob `137298adabe02f9de9ef9d1496a2deb355591384`; ledger status `HARD STOP — PACKAGE B INPUT AUTHORITY ABSENT`; PASS `#5027` |

Hash mismatch, supersession, or canonical contradiction stops the process. Known design/rendering material is not a substitute for the missing target-specific exact bytes.

## 3. External prerequisite — outside the recovery write scope

Define the sole artifact base `D = knowledge/specs/STOCK-CAJAS-C14-CX-DEFINITIONS-001/`. Every relative predecessor, recovery, Package B, PASS, and ledger path below is resolved directly under `D`; no other base or alias is valid.

All of the following must be independently passed and exactly adopted before process approval:

1. one approved target binding;
2. one approved command identity and exact Q01–Q06 query artifacts/contracts;
3. separately authorized read-only catalog observation, with immutable raw/canonical results;
4. independently passed and Franco-approved exact observation, selection, target identity, snapshot, optional script proof, overlay, and transition;
5. one independently passed and Franco-adopted target-specific **materialized** proposal containing all 169 concrete objects/fragments, including exact final CX01, CX04, CX07, and CX12 bytes.

No staged/deferred CX01 record/root is authority-eligible. This pack authorizes no catalog, DB, network, SQL, or command execution.

The immutable read-only predecessor is exactly 172 paths under `D/canonical-sql-v1-proposal/`: `profile.cj1`; `blocks/CXnn/dddd.sqlfrag` for counts CX01..CX13 `[1,11,6,9,3,8,12,11,5,14,22,51,16]`, with `dddd=0001..count` (169 paths); `proposal-rows.cjl1`; `proposal-root.cj1`. Required profile, artifact-set, row-set, transition, materialized-root, PASS, adoption, target, command, query, observation, selection, and EvidenceRef identities remain literal **pending** until externally approved. Their absence or mismatch blocks before lock acquisition.

## 4. Exact recovery allowlist and arithmetic

No path outside this section may be written after activation.

### 4.1 `D/c14-authority-v1/**` — 217 new paths

- `seed-registry.csr1` (1).
- `slots/CXnn/{OBJ,ATM,BRN,BDY,DEP,EVT,LOC}.cjl1` (13×7=91).
- `descriptors/CXnn/{OBJ,ATM,BRN,BDY,DEP,EVT,LOC}.cj1` (91).
- `source-sets/CXnn.css1` and `source-set-descriptors/CXnn.cj1` (13+13=26).
- `aggregates/{child-inventory,parent-bindings,authority-root,authority-tuple}.cj1` (4).
- `governance/authoring-ledger.md`, `governance/independent-pass-evidence.md`, `governance/exact-adoption-evidence.md`, `governance/approval-envelope.cj1` (4).

Arithmetic: `1+91+91+13+13+4+4=217`.

### 4.2 `D/c14-authority-rts1b/**` plus continuation — 216 new paths + one existing update

- `slots/CXnn/{OBJ,ATM,BRN,BDY,DEP,EVT,LOC}.cjl1` and matching `descriptors/...cj1` (91+91=182).
- Exactly 24 single-file bundles `projections/NN-C14-CC.bundle.cj1`: `01-C14-01`, `02-C14-06`, `03-C14-08`, `04-C14-10`, `05-C14-12`, `06-C14-14`, `07-C14-16A`, `08-C14-16B`, `09-C14-18A`, `10-C14-18B`, `11-C14-18C`, `12-C14-20`, `13-C14-22`, `14-C14-26`, `15-C14-33A`, `16-C14-33B`, `17-C14-33C`, `18-C14-33D`, `19-C14-33E`, `20-C14-33F`, `21-C14-33G`, `22-C14-33H`, `23-C14-33I`, `24-C14-37`. Each closed bundle contains exactly one canonical `RenderingChildProjection`, its ordered non-empty `ProjectionSlotRow[1..7]`, and one `RenderingSourceSlotSetDescriptor`; PSS1 is the byte-exact CJ1 concatenation of those rows and must recompute inside the bundle validator (24).
- `state/{profile.cj1,proposal-rows.cjl1,proposal-root.cj1,parent-bindings.cj1,topology-core.cj1,child-inventory.cj1,authority-root.cj1,authority-tuple-candidate.cj1}` (8).
- `D/RENDERING_TOPOLOGY_PACKAGE_B_RTS1B.md` and `D/RENDERING_TOPOLOGY_PACKAGE_B_RTS1B_PASS_EVIDENCE.md` (2 new), plus exactly one update to `D/C14_CX_CONTINUOUS_EVIDENCE_LEDGER_AND_HANDOFF.md` (1 existing).

Arithmetic: `182+24+8+2+1=217`; both phases: `217+217=434` paths, exactly **433 new + one existing ledger update**. The 172 predecessor paths are read-only and excluded from 434. No standalone RTS08 file exists.

## 5. Deterministic naming, serialization, and validators

`CXnn` is exactly `CX01..CX13` in ordinal order. Category rank is exactly `OBJ,ATM,BRN,BDY,DEP,EVT,LOC`; slot is `C14A-CXnn-CAT`; row is `C14A-CXnn-CAT-dddd`, contiguous from `0001`. Object ordinals are contiguous per §3 counts and proposal path `blocks/CXnn/dddd.sqlfrag`. No aliases, optional slots, eighth category, path scan, or mutable selection exists.

All text is strict UTF-8 without BOM, NFC, LF-only, no NUL/CR/trailing horizontal whitespace, and exactly one terminal LF except valid zero-byte empty CJL1 slots. CJ1/CJL1/CSR1/CSS1/PSS1, key order, declared array order, domain-separated SHA-256 preimages, and unknown-key rejection follow the fixed sources exactly.

Authority validation must prove: CSR1 `SeedRow` order and hashes; at least one seed per CX; every seed/output cardinality and all seven row categories; contiguous IDs; exact 169-object equality to the materialized predecessor; complete parser-derived Boolean spans/AST leaves/three-valued routing, branches/outcomes, loops, exception coverage, bodies, EVT set, DEP equality, locators and raw/normalized spans; exactly 91 slots/descriptors including empty slots; 13 CSS1 sets/descriptors; parent bindings; child inventory; root; tuple; envelope; immutable nonempty EvidenceRefs. No generated output proves an input.

RTS1B validation must prove full parent-row reserialization without semantic mutation; 91 state descriptors; non-LOC partition and LOC referring-projection completeness; exact 24 projection partitions of 169 objects; 24 non-empty PSS1 bundles/source-set descriptors; 9 ParentBindings with instantiated seal/addendum identities; 25-field profile; 47-core/48-total proposal root; 21-field authority root; topology/profile/row-set/child-inventory/parent/root/tuple hashes; byte-identical seal, projections, topology core, and parent identities wherever required. Package B embeds inseparable RTS00/RTS07/RTS08/RTS12 and the passed seal.

## 6. Evidence and unknown identities

The authoring ledger records every input path/blob/raw SHA-256 where applicable, writer lock transition, output identity, validator result, reviewer, verdict, and exclusions. EvidenceRef is only the canonical closed `ENGRAM` or `GIT_BLOB` variant and always resolves immutable exact content. A file never attests to its own containing blob; later evidence may attest earlier files. Unknown values stay the literal word `pending` in documentary ledgers/templates and never enter CJ1, hashes, roots, tuples, approvals, or execution claims. Writers cannot self-review or self-attest; only genuine independent PASS evidence advances a gate.

## 7. Ownership, reviews, and ordered gates

One persistent documentary writer owns the complete allowlist; lock states are `reserved → editing → review → released`; no concurrent allowlist writes. Reviewers are independent and read-only. Author CX-scoped slices, preferably below 400 changed lines; review each CX/category slice before the next. Create aggregates only after all 13 CX slices pass.

Ordered gates:

1. Prove §3 exact prerequisites and unchanged §2 sources.
2. Independently verify this exact pack; Franco gives the §11 process approval; a separate approved task appends and independently reviews an exact active record in `AGENTS.md`. Until all three exist, stop.
3. Author/review CSR1, all 91 slots/descriptors, CSS1, aggregates, tuple candidate, and PASS evidence.
4. Present exactly one root/AuthorityTuple adoption statement. Franco's exact adoption is projected immutably; then create/verify the approval envelope. This is the sole future authority-byte gate.
5. Automatically and deterministically reserialize RTS1B, create/review 91 slots/descriptors, 24 bundles, eight state files, non-severable Package B, and Package-B PASS evidence.
6. Update the existing ledger once with hard closure, release the lock, and stop.

Package B remains a reviewed **approval candidate**. This pack cannot governance-validly adopt its unknown bytes; later adoption, implementation, or execution requires separate authority.

## 8. Allowed commands

Allowed only against exact read-only sources/allowlisted paths: file reads; `git status --short -- <paths>`; `git diff -- <paths>`; `git diff --no-index -- /dev/null <new-file>`; `git diff --check -- <paths>`; `git hash-object -- <file>` without `-w`; raw SHA-256; and offline deterministic Node/PowerShell assertions for UTF-8/NFC/LF, CJ1/CJL1/CSR1/CSS1/PSS1, paths/counts, parser completeness, hashes, set equality, order, cardinality, graph, root, tuple, topology, and EvidenceRef resolution. Engram retrieval is allowed. No command may contact a DB, catalog, network, provider, or service other than Engram retrieval.

## 9. Permanent exclusions and hard stops

Excluded: schema; migrations; DB/catalog access; SQL execution; seed/backfill; Prisma; runtime/application; Auth; security; permissions; multi-company; providers/storage; dependencies, installs, manifests, lockfiles; Git staging, commit, amend, rebase, merge, tag, push, PR, publication; deploy, staging, production; destructive actions; and every path outside §4 (including `AGENTS.md` in this task).

Stop and preserve evidence on: absent/mismatched prerequisite; staged/deferred CX01; source/hash conflict; new semantic/business/environment choice; review FAIL not minimally resolvable through Diagnose; writer overlap; path/count expansion; unresolved or mutable EvidenceRef; validator/parser/cardinality/set/hash failure; any excluded action. No retry may conceal the stop.

## 10. Rollback, completion, and non-authority

Before independent PASS, rollback changes only the current unapproved allowlisted slice and never resets/stashes/checks out unrelated work. A passed or adopted artifact is immutable; any correction invalidates descendants and returns to the earliest affected gate. Completion requires exact prerequisite evidence, process approval/active record, all 434 writes at exact arithmetic, all independent PASS records, one exact AuthorityTuple adoption/envelope, Package B PASS, one truthful ledger closure, and released locks.

Completion grants no authority for Package B adoption, SQL execution, schema/migration, DB/catalog, runtime, implementation, Git publication, deployment, staging, or production.

## 11. Future process approval statement

Only after §3 is complete and this exact pack is independently verified may Franco state:

> I approve `STOCK-CAJAS-C14-AUTHORITY-RECOVERY-001` at exact Git blob `<change-pack-blob>` and raw SHA-256 `<change-pack-sha256>` for the finite documentary process exactly as written, after verifying the exact approved target binding `<target-binding>`, command/Q01–Q06 set `<query-set>`, observation/selection `<observation-selection>`, target-specific 169-object materialized proposal root `<materialized-root>`, its independent PASS EvidenceRef `<materialized-pass>`, and its human adoption evidence `<materialized-adoption>`. I authorize the separate append-only `AGENTS.md` active record, one persistent writer, independent read-only reviews, one later exact AuthorityTuple/root adoption gate, and automatic deterministic RTS1B/Package-B continuation only after that adoption passes. I do not approve unknown authority, envelope, RTS1B, Package B, or ledger hashes. I approve no database/catalog/network access, SQL execution, schema, migration, Prisma, runtime, application, Auth, security, permissions, multi-company, provider, storage, dependency, install, Git staging/commit/publication, deployment, staging, production, destructive, or out-of-allowlist action.

Placeholder text is a request template only. It cannot activate execution. Every bracketed value must be replaced by a complete exact immutable identity and independently equality-reviewed; while prerequisites remain absent, status stays **PREPARED / PRECONDITION-BLOCKED / HUMAN APPROVAL REQUIRED / NON-EXECUTABLE**.
