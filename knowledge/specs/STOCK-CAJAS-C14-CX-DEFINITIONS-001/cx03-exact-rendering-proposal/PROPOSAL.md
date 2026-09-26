# CX03 Exact Rendering Proposal

Status: **PROPOSED / HUMAN APPROVAL REQUIRED / NON-EXECUTABLE**

## 1. Purpose and boundary

This V2 artifact revises the independently failed V1 root `021da5bbbb528411033c2617354ef42e95ff13b06bee1a0c31db6ebd6e320405` and proposes complete byte-exact SQL rendering for the six approved CX03 object identities. It closes only the reservation-reachability and parser-inventory blockers in verify report #4971. It is a detached rendering proposal, not a migration, runner input, authority tuple, executable SQL package, schema change, or approval of its own bytes. Continuous documentary authority permits preparation and independent review only.

No file in this directory may be executed against a database. No fragment contains transaction wrappers, migration metadata, dynamic SQL, `IF NOT EXISTS`, `CASCADE`, or ambient `search_path`. Adoption requires independent byte/semantic review followed by Franco's approval of the exact detached proposal root and every rendering decision below.

## 2. Bound parents

| Parent | Exact binding and use |
|---|---|
| Canonical P01–P19 | `CANONICAL_RENDERING_OWNERSHIP_MANIFEST_PROPOSAL.md`, blob `b1045fd3f66defcbb0bac7a1cc0adcadf783b81a`; exact CX03 six-object inventory, P16-B/U01-A/U02-A, physical-name mapping, formatting, and P19 gate. |
| Binding Addendum A–D | `BINDING_FINALIZATION_ADDENDUM.md`, blob `a860049af04a6ff07fbe9fae6ddb512a8ef0adc8`; CX03 ordered stable-parent `FOR UPDATE NOWAIT` writer contract remains external to these trigger bytes. |
| J1/P3/integrated D3 | `RECOMMENDED_PACKAGES.md`, blob `0fd2959cd149d3c37b4162cdb2c232dd9dd35a71`; approvals #4767/#4769/#4771. Reservation live quantity, active assignment, custody-as-external occupancy, and disposition hold/terminal semantics are rendered here; P3 projection fields are not acceptance authority. |
| P19 serialization/capacity | `P19_PROPOSAL_SERIALIZATION_ADDENDUM.md` and `P19_PROPOSAL_SCHEMA_CAPACITY_ADDENDUM.md`; raw `.sqlfrag`, CJ1/CJL1, object order, block-local spans, parser, and line-gate contracts. |
| U01-A/U02-A/P16-B | Trigger raises use SQLSTATE `23514`; the ordinary current guard is all-column `BEFORE INSERT OR UPDATE`; append-only is all-column `BEFORE UPDATE OR DELETE`; P16-B does not alter CX03. |
| SFO | `SHARED_FUNCTION_OWNERSHIP_ADDENDUM.md`, blob `1e5a4df989b9831343a54cd3c62237e4c8916614`; both CX03 functions remain one-relation functions. |
| ISO | `INSERT_SERIALIZATION_OWNERSHIP_ADDENDUM.md`, blob `09408f21b209cda10068d60fe5ee546b460a3f06`; `ISW-CX03-01` owns INSERT serialization, so no lock statement or extra INSERT trigger is invented here. |
| TEI | `TRIGGER_ERROR_IDENTITY_ADDENDUM.md`, blob `237c7c5e18e4a3cf22d223c3d77b117efa400014`; exact C14E1 diagnostics, function-derived message IDs, R0001 tokens, and ERROR × trigger × scalar-operation binding. |
| DT/PCA2 | `DEPENDENCY_TARGET_ADDENDUM.md`, blob `fdbdaa1da1fe97d4cac24ae347c94c6a3dff6947`, and `POST_EAV_CANDIDATE_ADOPTION_ADDENDUM.md`; generated-object EXECUTES and company-scoped PHYSICAL_RELATION READS only. This proposal is a pending future rendering and mutates no PCA2 root. |
| C13 structure | Commit `0faf2f55e178f1b111c5ae108380a505a68c8feb`, `prisma/schema.prisma` blob `47313a8a85ac71ac56df93ce212593820cb95a13`; exact physical relations, columns, enums, FKs, and uniques. |
| C14 topology | Blob `b8608a922d2d9adf5d776673252f709c52d4a518`; CX03 attaches to C14-08 after S05. |

Authority precedence remains `AGENTS.md` human boundaries, exact approved parent bytes and selections, this pending proposal, then derived hashes. Silence is not authority.

## 3. Finite rendering decisions

Each cell is new proposal content. Approval must select every recommendation as one non-severable CX03 rendering decision.

| Cell | Decision, alternatives, tradeoff, recommendation |
|---|---|
| `CX03-R01` | Render each positive-version invariant as one relation-owned `ALTER TABLE ... ADD CONSTRAINT ... CHECK`. Inline DDL would reopen C13. **Recommend two ALTER TABLE blocks.** |
| `CX03-R02` | Wrap each complete CHECK predicate in `(...) IS TRUE`; a bare CHECK admits UNKNOWN. **Recommend TRUE-only checks.** |
| `CX03-R03` | Treat INSERT as initial current state only: target configuration `versionNumber=1`, `previousVersionId IS NULL`, and projection `version=1`. Permitting an arbitrary initial pointer would skip immutable chain history. **Recommend exact initial state.** |
| `CX03-R04` | Treat UPDATE as one contiguous D2 advance: unchanged company/unit, target predecessor equals OLD target, target number is OLD target number plus one, and projection version is OLD version plus one. Gaps, rewinds, owner changes, and no-op updates reject. **Recommend contiguous direct advance.** |
| `CX03-R05` | Require copied `internalCode` equality and null-safe `serialNumber IS NOT DISTINCT FROM` equality with the target version. Plain `=` would reject two null serials as UNKNOWN. **Recommend exact copied identity.** |
| `CX03-R06` | Derive active reservation from immutable event algebra: unreplaced RESERVE/REPLACE acquisition leaves minus RELEASE/CANCEL/APPLY_TO_DISPATCH, and block only when the resulting live quantity is positive. Reach each reservation exactly once through its tenant-qualified position join, then match the unit when either `reservation.identifiedUnitId` or `reservationPosition.identifiedUnitId` equals the guarded unit. The single joined reservation row plus one OR predicate prevents duplicate fold evaluation. Projection status is forbidden by J1/P3. **Recommend tenant-qualified position reachability with row-level dedupe.** |
| `CX03-R07` | Derive active assignment from the complete approved active tuple: `active_slot=1` and every end field null. Historical closed assignments do not block. **Recommend complete tuple.** |
| `CX03-R08` | Derive custody only from current occupancy whose position context is `EXTERNAL_CUSTODY`; no independent custody row or branch exists. **Recommend occupancy-derived custody.** |
| `CX03-R09` | Derive pending disposition as positive signed `UNDER_REVIEW` hold grouped by dispatch line and linked through its Stock position to the unit. Final returned/consumed/missing/damaged history and net-zero reversed hold do not block. **Recommend J1 hold semantics.** |
| `CX03-R10` | Evaluate claims from transaction-visible immutable rows and permit same-transaction release/end/move/neutralization before current-pointer advance. Do not add locks: Addendum A/ISO owns serialization before DML. **Recommend post-transition read with external lock contract.** |
| `CX03-R11` | Compose target/claim checks into declared `v_valid boolean`; only TRUE returns NEW, while FALSE/UNKNOWN reaches one explicit ELSE rejection. Splitting public errors by claim would invent diagnostic identities. **Recommend one guard error site.** |
| `CX03-R12` | Implement append-only as one unconditional TEI raise and use exact U02-A events: append-only UPDATE/DELETE; current guard INSERT/UPDATE; all `BEFORE`, `FOR EACH ROW`, no UPDATE column list. **Recommend closed four-event matrix.** |
| `CX03-R13` | Use uppercase SQL keywords, two-space indentation, quoted identifiers, explicit `"public"` qualification, `$c14fn$`, clause-per-line declarations, UTF-8/LF, and no comments inside fragments. **Recommend these exact bytes.** |
| `CX03-R14` | Hash ordered leaves directly, hash the exact manifest separately, and derive the detached root from only LF-terminated hashes data lines under a CX03 domain; exclude only the root comment from its own preimage. **Recommend the acyclic rule in §7.** |

## 4. Exact object inventory

| Ordinal | Object ID | Owner |
|---:|---|---|
| 1 | `check:ck_siucv_version_positive` | `"public"."StockIdentifiedUnitConfigurationVersion"` |
| 2 | `check:ck_siucc_version_positive` | `"public"."StockIdentifiedUnitCurrentConfiguration"` |
| 3 | `function:fn_stock_unit_config_append_only` | `"public"."StockIdentifiedUnitConfigurationVersion"` |
| 4 | `function:fn_stock_unit_config_current_guard` | `"public"."StockIdentifiedUnitCurrentConfiguration"` |
| 5 | `trigger:trg_stock_unit_config_append_only` | `"public"."StockIdentifiedUnitConfigurationVersion"` |
| 6 | `trigger:trg_stock_unit_config_current_guard` | `"public"."StockIdentifiedUnitCurrentConfiguration"` |

## 5. Semantic and byte profile

- Encoding is UTF-8, NFC, no BOM/NUL/CR, LF only, no trailing horizontal whitespace, and exactly one terminal LF per file.
- Every fragment is one complete object block with one declaration and no provenance comment or transaction wrapper.
- Native CHECK failures remain native `23514` with null TEI trigger outcome. Trigger raises use C14E1, exact runtime `TG_*`, literal function identity, R0001, function-derived message ID, and the approved family.
- Append-only rejects UPDATE and DELETE. The current guard accepts only an exact initial pointer or one contiguous direct advance after all four pending-claim predicates are false in the transaction-visible state.
- No function writes data, acquires locks, consults a projection, or introduces a helper object.

## 6. Exact spans, branches, dependencies, events, errors, and forecast

The manifest records each whole-object byte span and every source occurrence span used by a dependency or error site. Parser profile `CX03-STATIC-BOOLEAN-PARSER-V2` extracts exactly 20 Boolean roots: two CHECK roots, one complete SELECT root, six ON roots, seven WHERE roots, one HAVING root, two CASE-WHEN roots, and one PL/pgSQL IF root. Their complete source-preserving AST inventory has 93 Boolean nodes, 65 SINGLE_OCCURRENCE atoms, and 65 atom occurrences. Every root and occurrence owns an exact zero-based half-open UTF-8 source span; object leaf hashes plus the domain-separated atom- and span-inventory digests bind all slices. Nested clause roots are explicit and no broader SQL expression is claimed as an atom.

Branches are exactly two: current-guard `v_valid IS TRUE → RETURN NEW`, then explicit ELSE → RAISE. Errors are exactly two source-backed R0001 sites: append-only and row/cross-row current guard. TEI expansion is exactly four bindings: append-only UPDATE/DELETE and current guard INSERT/UPDATE.

Dependencies are exactly two trigger `EXECUTES` edges plus current-guard `READS` edges to nine company-scoped physical relations: `StockIdentifiedUnitConfigurationVersion`, `StockReservation`, `StockReservationEvidence`, `cajas_assignment`, `StockIdentifiedUnitOccupancy`, `StockPosition`, `StockContext`, `cajas_disposition`, and `cajas_dispatch_line`. Repeated reads of a relation count once under DT/D9; source occurrence arrays retain all 15 exact references, including three `StockPosition` occurrences. There are no WRITES edges.

Events are exactly four: append-only UPDATE/DELETE and current guard INSERT/UPDATE. The projected P19 C14-08 child has three comments, `BEGIN;`, six object blocks, five blank separators, `COMMIT;`, and 191 exact physical lines. Point/lower/upper are all 191, below the 350-line gate.

## 7. Acyclic manifest and detached-root rule

Let `H(x)=SHA256(x)` over exact bytes.

1. `leafFiles` are `PROPOSAL.md` followed by the six `.sqlfrag` paths in ordinal order. The manifest records their ordered direct hashes but never hashes itself.
2. `manifestCoreSha256 = H(ASCII("CX03-RENDERING-MANIFEST-CORE-V2") || NUL || exact rendering-manifest.cj1 bytes)`. The manifest carries no self-hash or detached-root field.
3. `hashes.sha256` contains exactly eight data lines: seven leaves followed by the exact manifest file. It then contains one final root comment excluded from the root preimage.
4. `detachedProposalRootSha256 = H(ASCII("CX03-EXACT-RENDERING-PROPOSAL-ROOT-V2") || NUL || exact first eight LF-terminated data lines of hashes.sha256)`.
5. `hashesFileSha256 = H(exact hashes.sha256 bytes including the root comment)` is validation output only and is embedded nowhere upstream.

All CJ1 keys are Unicode-scalar sorted, arrays retain declared order, JSON has no insignificant whitespace, and each document has one terminal LF.

## 8. Static validation contract

Validation is standard-library and read-only only. It must prove: exact nine-path inventory with exactly six `.sqlfrag`; object order/identity/owner; pinned C13 relation/column identifiers; UTF-8/NFC/LF profile; one declaration per fragment; statement, dollar/body, and parenthesis balance; forbidden-token and placeholder absence; TRUE-only CHECKs; exact initial/advance/copied-identity predicates; reservation reachability through direct unit OR tenant-qualified position unit with one reservation-row fold; assignment/custody/hold closure; trigger timing/level/events; complete TEI fields and four bindings; contiguous R0001 sites; exact 20-root/93-node/65-atom/65-occurrence parser inventory; all 108 source-span offsets/hashes; exact two branches, 11 dependency edges/15 references, four events, two error sites; leaf/manifest/root hashes; exact 191-line forecast; and path-limited `git diff --check`. It must not execute PostgreSQL, invoke Prisma, access a database/network, stage files, or mutate artifacts.

## 9. Approval question

After independent PASS, does Franco approve the exact V2 detached proposal root recorded in `hashes.sha256` and select `CX03-R01` through `CX03-R14` as one non-severable rendering decision, thereby approving only these six byte-exact CX03 object blocks, their exact parser-derived spans/expressions/atoms/occurrences/branches/dependencies/events/TEI errors, and exact 191-line P19 forecast for later candidate serialization and review, while granting no SQL execution, migration, schema, database, Prisma, runner, global staged-file, authority-root, deployment, staging, production, or publication authority?
