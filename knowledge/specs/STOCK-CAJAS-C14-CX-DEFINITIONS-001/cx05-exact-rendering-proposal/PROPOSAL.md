# CX05 Exact Rendering Proposal

Status: **PROPOSED / HUMAN APPROVAL REQUIRED / NON-EXECUTABLE**

## 1. Purpose and boundary

This artifact proposes byte-exact rendering for the three CX05 CHECK objects already fixed by approved C04/C05 semantics and the final C13 structure. It changes no schema, migration, runner, binding, authority root, or global file. The `.sqlfrag` files are documentary object blocks and MUST NOT be executed.

CX05 remains attached to `C14-12` after `S07` and owns only row-local checks. The overlap exclusion, opening cross-row guard, and append-only behavior remain CX13-owned and absent here.

## 2. Bound parents

| Parent | Exact binding |
|---|---|
| C04/C05 semantics | Engram `#4318-r1`, `#4319-r2`, closure `#4321`; `#4324-r3`, closure `#4329`: valid window, nonnegative opening quantity, scale `0..4`. |
| CX inventory | Engram `#4751-r1`, CX05: exactly these three checks and no function/trigger. |
| Canonical rendering | `CANONICAL_RENDERING_OWNERSHIP_MANIFEST_PROPOSAL.md` blob `b1045fd3f66defcbb0bac7a1cc0adcadf783b81a`; approved choices P16-B/U01-A/U02-A in `#4802`. |
| Proposal serialization | `P19_PROPOSAL_SERIALIZATION_ADDENDUM.md` blob `bdc0fd13f3126567ade7e13c8f65f6e376a9940f`; `P19_PROPOSAL_SCHEMA_CAPACITY_ADDENDUM.md` blob `1304c0911e858a4995f0621a5c478650f4fe4ccd`. |
| C13 structure | Commit `0faf2f55e178f1b111c5ae108380a505a68c8feb`, `prisma/schema.prisma` blob `47313a8a85ac71ac56df93ce212593820cb95a13`. |
| C14 topology | Blob `b8608a922d2d9adf5d776673252f709c52d4a518`; `C14-12`, after/covers `S07`. |

Authority precedence remains `AGENTS.md`, approved parent bytes/evidence, this pending proposal, then derived hashes. This proposal does not approve itself.

## 3. Explicit decisions

| Cell | Choice, alternative, rationale |
|---|---|
| `CX05-R01` | Use one post-C13 `ALTER TABLE ... ADD CONSTRAINT ... CHECK` block per object. Inline DDL cannot attach to the already-bound schema. |
| `CX05-R02` | Render valid window as `validUntil IS NULL OR validUntil > cutoffAt`. `>=` would admit an empty interval; substituting `tstzrange` would import CX13 exclusion representation. |
| `CX05-R03` | Render quantity as `quantity >= 0`. `> 0` contradicts approved opening semantics. |
| `CX05-R04` | Render scale as two inclusive tests, `>= 0` and `<= 4`. `BETWEEN` is equivalent but hides the two D9 atom occurrences. |
| `CX05-R05` | End each complete Boolean expression with `IS TRUE`; bare CHECK would accept UNKNOWN. C13 columns are required, but fail-closed bytes remain canonical. |
| `CX05-R06` | Use quoted physical identifiers, explicit `"public"`, uppercase keywords, two-space expression indentation, UTF-8/NFC/LF, and one terminal LF. |
| `CX05-R07` | Inventory three expression roots and five rendered atomic tests. The prior six-predicate estimation ledger mixed three CHECK abstractions with three logic labels; it is not a parser-derived atom inventory and is not mutated here. |
| `CX05-R08` | Dependencies and trigger events are exact empty sets: CHECK column references are not D9 object-to-object dependencies, and CHECKs own no trigger events. |
| `CX05-R09` | Use the acyclic leaf/manifest/root hash rule in §6; no file hashes itself. |

## 4. Exact inventories

Object order is fixed: `check:ck_sab_valid_window` on `"public"."StockActivationBoundary"`; `check:ck_sop_quantity_nonnegative` and `check:ck_sop_scale_snapshot` on `"public"."StockOpeningPosition"`. The manifest is authoritative for exact expression roots, atom occurrences, source spans, dependencies, and semantic/physical locators. Branch, function, trigger, event, and error inventories are empty.

## 5. Forecast and assembly

The three fragments contain 15 physical lines. A later P19 child would add four fixed header/`BEGIN` lines, two blank separators, and one `COMMIT` line: exact `lowerLines=pointLines=upperLines=22`, safely `<=350`. Unknown future 64-hex wrapper values do not change width or line count. No split is required.

## 6. Hash and detached-root rule

Let `H(x)=SHA256(x)`. Leaf order is `PROPOSAL.md`, then the three fragments. `rendering-manifest.cj1` records leaf hashes but excludes itself and the root. `hashes.sha256` has five LF-terminated data lines: the four leaves then the manifest. The final comment is excluded from the root preimage. `detachedProposalRootSha256 = H(ASCII("CX05-EXACT-RENDERING-PROPOSAL-ROOT-V1") || NUL || the exact five data lines)`. The comment stores that root; the complete hashes-file hash is validation output only.

## 7. Static validation contract

Read-only standard-library validation must prove: exactly three `.sqlfrag`; exact paths/order/object owners; C13 relation/column existence and physical names; UTF-8/NFC/LF/no-BOM/no-NUL/no-CR/no trailing whitespace; one terminal LF; statement/parenthesis balance; forbidden execution/migration/transaction tokens absent; TRUE-only CHECKs; exact root/atom/span/locator closure; empty dependency/event sets; leaf/manifest/root hashes; exact 22-line forecast; no placeholders; and `git diff --check`. PostgreSQL, Prisma, database/network, runner, migration, and artifact mutation are forbidden.

## 8. Approval question

After independent PASS, does Franco approve the detached root in `hashes.sha256` and select `CX05-R01` through `CX05-R09` as one non-severable documentary rendering decision, approving only these three byte-exact CHECK blocks and inventories for later authority construction, with no execution, migration, schema, database, runner, binding, deployment, or production authority?
