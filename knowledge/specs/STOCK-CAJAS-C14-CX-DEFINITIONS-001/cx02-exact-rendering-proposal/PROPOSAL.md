# CX02 Exact Rendering Proposal

Status: **PROPOSED / HUMAN APPROVAL REQUIRED / NON-EXECUTABLE**

## 1. Purpose and boundary

This artifact resolves the documentary gap recorded in Engram #4921 by proposing complete byte-exact SQL rendering for the 11 approved CX02 object identities. It is a rendering proposal, not a migration, runner, authority tuple, executable SQL package, schema change, or approval of its own bytes. Continuous documentary authority #4842 permits preparation and independent review only.

No file in this directory may be executed against a database. No fragment contains transaction wrappers, migration metadata, dynamic SQL, `IF NOT EXISTS`, `CASCADE`, or ambient `search_path`. Adoption requires an independent byte/semantic review followed by Franco's approval of the exact detached proposal root and every decision cell below.

## 2. Bound parents

| Parent | Exact binding and use |
|---|---|
| Canonical P01–P19 | `CANONICAL_RENDERING_OWNERSHIP_MANIFEST_PROPOSAL.md`, blob `b1045fd3f66defcbb0bac7a1cc0adcadf783b81a`; approved P16-B/U01-A/U02-A in #4802. |
| Binding Addendum A–D | `BINDING_FINALIZATION_ADDENDUM.md`, blob `a860049af04a6ff07fbe9fae6ddb512a8ef0adc8`; serialization, catalog, CX09, and minimum-line boundaries. CX02 inherits no new lock anchor. |
| J1/P3/integrated D3 | `RECOMMENDED_PACKAGES.md`, blob `0fd2959cd149d3c37b4162cdb2c232dd9dd35a71`; approvals #4767/#4769/#4771. CX02 uses J1 T01 and T02 lot semantics; P3/D3 add no CX02 predicate. |
| P19 serialization/capacity | `P19_PROPOSAL_SERIALIZATION_ADDENDUM.md` and `P19_PROPOSAL_SCHEMA_CAPACITY_ADDENDUM.md`; raw `.sqlfrag`, CJ1/CJL1, object-order, span, parser, and line-gate contracts. Illustrative fixture bytes are not imported. |
| U01-A/U02-A/P16-B | U01-A is SQLSTATE `23514`; U02-A is all-column `BEFORE INSERT OR UPDATE` for the ordinary coherence guard; append-only triggers remain all-column `BEFORE UPDATE OR DELETE`; P16-B does not alter CX02 identities. |
| SFO | `SHARED_FUNCTION_OWNERSHIP_ADDENDUM.md`, blob `1e5a4df989b9831343a54cd3c62237e4c8916614`; all four CX02 functions remain one-relation functions. |
| EAV/BS/PCA | Fixed five-observation EAV1, BS1 selection set, and `POST_EAV_CANDIDATE_ADOPTION_ADDENDUM.md`; this proposal is a new pending candidate and does not mutate those roots or claim adoption. |
| ISW2 | `INSERT_SERIALIZATION_OWNERSHIP_ADDENDUM.md`, blob `09408f21b209cda10068d60fe5ee546b460a3f06`; no CX02 INSERT writer contract exists, so this proposal creates none. |
| TEI | `TRIGGER_ERROR_IDENTITY_ADDENDUM.md`, blob `237c7c5e18e4a3cf22d223c3d77b117efa400014`; exact C14E1 diagnostics, function message IDs, branch tokens, and ERROR × trigger × scalar-operation binding. |
| C13 structure | Commit `0faf2f55e178f1b111c5ae108380a505a68c8feb`, `prisma/schema.prisma` blob `47313a8a85ac71ac56df93ce212593820cb95a13`; exact physical relations, columns, enums, FKs, and uniques. |
| C14 topology | Blob `b8608a922d2d9adf5d776673252f709c52d4a518`; CX02 attaches to C14-06 after S04. |

Authority precedence remains `AGENTS.md` human boundaries, exact approved parent bytes and selections, this pending proposal, then derived hashes. Silence is not authority.

## 3. Finite rendering decisions

Each cell is new proposal content. Approval must select the recommendation for every cell as one non-severable CX02 rendering decision; no cell is silently inherited from illustrative fixtures.

| Cell | Decision, alternatives, tradeoff, recommendation |
|---|---|
| `CX02-R01` | Render each CHECK as one `ALTER TABLE ... ADD CONSTRAINT ... CHECK` block. Alternative inline table DDL is inapplicable after C13; a domain CHECK would misown the object. **Recommend ALTER TABLE.** |
| `CX02-R02` | Close lot-observation kind shape to two accepted arms: ORIGINAL/null target and CORRECTION/non-null different target; REVERSAL and ANNULMENT have no arm and fail. Alternative repurposes the correction link, forbidden by J1. **Recommend two-arm fail-closed expression.** |
| `CX02-R03` | Use the existing owner-qualified FK for correction target company/Article coherence and the CHECK for self-rejection. Duplicating parent reads in a trigger adds an unapproved object. **Recommend native FK + CHECK composition.** |
| `CX02-R04` | Order review pairs by exact ID bytes using `COLLATE "C"` and `<`. Default collation is environment-dependent; `<=` permits equality. **Recommend explicit C collation strict order.** |
| `CX02-R05` | Render four explicit result arms: MATCH requires canonical lot and forbids resolution; DISCREPANCY and REJECTED forbid both; RESOLVED_EQUIVALENT requires resolution and permits canonical lot. A grouped fallback hides enum outcomes. **Recommend four arms.** |
| `CX02-R06` | Wrap every CHECK's complete Boolean expression in `(...) IS TRUE`. Bare CHECK accepts UNKNOWN. **Recommend TRUE-only checks.** |
| `CX02-R07` | Implement each append-only function as one unconditional TEI raise. Its trigger event set is closed to UPDATE/DELETE, so no dead accept branch, generic fallback, or duplicated per-operation ERROR site is introduced. Alternative operation branches duplicate ERROR sites and destabilize TEI identities. **Recommend one raise site per function.** |
| `CX02-R08` | Coherence reads exact C13 relations using four EXISTS predicates: left, right, optional resolution observation, optional canonical lot. FKs provide owner existence; the function additionally proves normalized-code equality. A multi-row JOIN risks multiplicity without semantic benefit. **Recommend EXISTS composition.** |
| `CX02-R09` | Store coherence in declared `v_coherent boolean`; only `IS TRUE` returns NEW. FALSE or UNKNOWN falls through to the explicit ELSE arm and its one R0001 raise. Omitting ELSE creates an implicit branch that is harder to inventory. **Recommend TRUE-only return with explicit fallback reject.** |
| `CX02-R10` | Use one coherence error site and one function-specific message ID. Splitting failures by left/right/result would invent public diagnostic business identities. **Recommend one stable row/cross-row invariant.** |
| `CX02-R11` | Use U02-A exact events: append-only UPDATE/DELETE and coherence INSERT/UPDATE, all `BEFORE`, `FOR EACH ROW`, with no UPDATE column list. **Recommend approved event matrix.** |
| `CX02-R12` | Use uppercase SQL keywords, two-space indentation, quoted object/column identifiers, quoted `"public"` qualification, `$c14fn$`, and clause-per-line declarations. Other formatting is semantically valid but changes all bytes and spans. **Recommend these exact bytes.** |
| `CX02-R13` | Hash leaf files directly, exclude the manifest and hashes file from their own content sets, hash a declared manifest core without its root field, and derive a detached proposal root from ordered leaf hashes plus the manifest-core hash. Self-inclusion is cyclic. **Recommend the acyclic rule in §7.** |

## 4. Exact object inventory

| Ordinal | Object ID | Owner |
|---:|---|---|
| 1 | `check:ck_slo_correction_shape` | `"public"."StockLotObservation"` |
| 2 | `check:ck_slr_observation_order` | `"public"."StockLotReview"` |
| 3 | `check:ck_slr_result_shape` | `"public"."StockLotReview"` |
| 4 | `function:fn_stock_lot_append_only` | `"public"."StockLot"` |
| 5 | `function:fn_stock_lot_observation_append_only` | `"public"."StockLotObservation"` |
| 6 | `function:fn_stock_lot_review_append_only` | `"public"."StockLotReview"` |
| 7 | `function:fn_stock_lot_review_coherence` | `"public"."StockLotReview"` |
| 8 | `trigger:trg_stock_lot_append_only` | `"public"."StockLot"` |
| 9 | `trigger:trg_stock_lot_observation_append_only` | `"public"."StockLotObservation"` |
| 10 | `trigger:trg_stock_lot_review_append_only` | `"public"."StockLotReview"` |
| 11 | `trigger:trg_stock_lot_review_coherence` | `"public"."StockLotReview"` |

## 5. Semantic and byte profile

- Encoding is UTF-8, NFC, no BOM/NUL/CR, LF only, no trailing horizontal whitespace, and exactly one terminal LF per file.
- Every fragment is one complete object block and contains no provenance comment or transaction wrapper.
- Physical C13 names are case-sensitive unmapped Prisma names: `StockLot`, `StockLotObservation`, `StockLotReview`, and their camelCase columns.
- Native CHECK failures remain native `23514` with null TEI trigger outcome. Trigger raises use C14E1, U01-A, exact runtime `TG_*`, literal function identity, R0001, function-derived message ID, and the approved family.
- Append-only triggers reject both UPDATE and DELETE. The coherence trigger accepts only a TRUE complete coherence result; FALSE/UNKNOWN rejects. No function writes data.
- The manifest records exact byte spans, branches, dependencies, events, and error sites. Counts are parser forecast inputs, not approved P19 rows.

## 6. Dependencies, events, and forecast

The only SQL object dependencies are four trigger `EXECUTES` edges and two coherence `READS` edges, one to `StockLotObservation` and one to `StockLot`. Repeated observation reads count once under D9. Events are exactly eight: three append-only triggers each own UPDATE/DELETE and coherence owns INSERT/UPDATE. Functions write no relation.

The projected P19 C14-06 CX02 child has three required comments, `BEGIN;`, 11 object blocks, ten blank separators, `COMMIT;`, and the exact fragment LF total recorded in the manifest. Its point/lower/upper forecast is one exact value and must remain at or below 350 lines.

## 7. Acyclic manifest and detached-root rule

Let `H(x)=SHA256(x)` over exact bytes.

1. `leafFiles` are `PROPOSAL.md` followed by the 11 `.sqlfrag` paths in ordinal order. The manifest records their ordered hashes but never hashes itself.
2. `manifestCoreSha256 = H(ASCII("CX02-RENDERING-MANIFEST-CORE-V1") || NUL || exact rendering-manifest.cj1 bytes)`. The manifest carries no self-hash or detached-root field, so this preimage is acyclic.
3. `hashes.sha256` contains exactly 13 data lines: `H(file)`, two spaces, and path for the 12 leaves followed by the exact manifest file. It then contains one final comment line with the detached root; that comment is excluded from the root preimage.
4. `detachedProposalRootSha256 = H(ASCII("CX02-EXACT-RENDERING-PROPOSAL-ROOT-V1") || NUL || exact first 13 LF-terminated data lines of hashes.sha256)`. The root therefore covers the proposal, all 11 fragments, and the exact manifest while excluding only its own final comment.
5. `hashesFileSha256 = H(exact hashes.sha256 bytes including the root comment)` is validation output only and is not embedded in an upstream artifact.

All CJ1 keys are Unicode-scalar sorted, arrays retain declared order, JSON has no insignificant whitespace, and each document has one terminal LF.

## 8. Static validation contract

Validation is standard-library and read-only only. It must prove: exact 11-path and object/event inventory; pinned relation/column identifiers; UTF-8/NFC/LF profile; declaration terminators and dollar/body/parenthesis balance; forbidden-token absence; CHECK TRUE-only and four/two-arm closure; trigger timing/level/events; TEI message/detail/hint/constraint/schema/table identity; contiguous R0001 sites; source-span byte offsets and hashes; branch/dependency/error closure; leaf, hashes-file, manifest-core, and detached-root hashes; P19 line forecast; placeholder scan; and `git diff --check`. It must not parse by executing PostgreSQL, invoke Prisma, access a database/network, or mutate artifacts.

## 9. Approval question

After independent PASS, does Franco approve the exact detached proposal root recorded in `rendering-manifest.cj1` and select `CX02-R01` through `CX02-R13` as one non-severable rendering decision, thereby approving only these 11 byte-exact CX02 object blocks, their exact spans/branches/dependencies/events/error sites, and their projected P19 line count for later candidate serialization and review, while granting no SQL execution, migration, schema, database, runner, authority-root, deployment, staging, production, or publication authority?
