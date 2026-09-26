# CX09 Exact Rendering Proposal

Status: **PROPOSED / HUMAN APPROVAL REQUIRED / NON-EXECUTABLE**

## 1. Purpose and boundary

This directory proposes byte-exact documentary rendering for the five fixed CX09 CHECK objects. It changes no schema, migration, runner, database, authority root, binding, or global file. The five `.sqlfrag` files MUST NOT be executed.

CX09 is structural only. It derives, mutates, repairs, and rebuilds no projection; creates no function, trigger, event, branch, error, fold, or availability object; and reserves `trg_stock_projection_fold_guard` for C19/C31.

## 2. Canonical parents

| Parent | Exact binding and use |
|---|---|
| C04/C05 disposition semantics | Engram `#4318-r1`, governing `#4319-r2`, closure `#4321-r1`; `#4324-r3`, closure `#4329-r1`: nonnegative projection values, positive versions, canonical HEADER/LINE scope, deterministic-only normalized targets, positive observed version. |
| C13 | Commit `0faf2f55e178f1b111c5ae108380a505a68c8feb`, `prisma/schema.prisma` blob `47313a8a85ac71ac56df93ce212593820cb95a13`; exact owner relations, columns, enum values, nullability, FKs, uniques, and indexes. |
| Canonical P01-P19 | Blob `b1045fd3f66defcbb0bac7a1cc0adcadf783b81a`; fixed CX09 identities, rendering profile, P16-B, U01-A, U02-A, and P19 line gate. Serialization/capacity blobs: `bdc0fd13f3126567ade7e13c8f65f6e376a9940f` / `1304c0911e858a4995f0621a5c478650f4fe4ccd`. |
| Binding A-D | Blob `a860049af04a6ff07fbe9fae6ddb512a8ef0adc8`; supersedes `ck_spp_available` and the projection skeleton, retaining only row-local `ck_spp_values` and the other four fixed CHECKs. |
| DT | Blob `fdbdaa1da1fe97d4cac24ae347c94c6a3dff6947`; CHECK column occurrences are locator evidence, not dependencies. CX09 therefore has an exact empty dependency inventory. |
| PCA2 | Addendum blob `d4ec678a129e85dcfff75283b224395dc80368ff`; inventory hash `2a7a0d519ec426249e7fcf2385f3046e8f09a802f4462aea7acd8c774520f3aa`; this proposal is a pending candidate input and creates no final PCA2 root. |

Authority precedence is `AGENTS.md`, approved parent bytes/selections, this pending proposal, then derived hashes. This proposal does not approve itself.

## 3. Explicit finite decisions

| Cell | Exact proposal decision |
|---|---|
| `CX09-R01` | Render exactly five post-C13 `ALTER TABLE ... ADD CONSTRAINT ... CHECK` blocks in canonical object order; add no sixth object. |
| `CX09-R02` | `ck_srp_values` requires `activeQuantity >= 0`, `appliedQuantity >= 0`, and `version > 0`; status remains native enum structure and is not acceptance authority. |
| `CX09-R03` | `ck_spp_values` requires all five C13 quantity columns to be nonnegative and `version > 0`; no equality, availability, identified-unit cardinality, parent-context, policy, or fold predicate is added. |
| `CX09-R04` | `ck_scr_scope_key` exactly mirrors the approved HEADER/LINE canonical key: HEADER has null line and `H:` plus entity ID; LINE has non-null line and `L:` plus line ID. |
| `CX09-R05` | `ck_scr_target` requires `articleId` for `DETERMINISTICALLY_MAPPABLE`; `positionId` and `identifiedUnitId` remain optional normalized refinements governed by C13 composite FKs. The other three dispositions require all normalized target IDs null. |
| `CX09-R06` | `ck_pr_version` requires `observedVersion > 0`; result, watermark, repair correlation, and reconciliation scheduling gain no inferred semantics. |
| `CX09-R07` | Every complete Boolean expression ends with `IS TRUE`; FALSE and UNKNOWN reject. Numeric comparisons are explicit atomic occurrences, not `BETWEEN` or folded aliases. |
| `CX09-R08` | Use quoted physical identifiers, explicit `"public"`, uppercase SQL keywords, UTF-8/NFC/LF, no BOM/NUL/CR/trailing whitespace, and exactly one terminal LF. |
| `CX09-R09` | Inventory exactly five expressions, thirty atoms, zero dependencies/events/branches/errors/functions/triggers, and semantic/physical/rendering/topology locators. |
| `CX09-R10` | Hashing is acyclic: direct hashes cover this proposal and five fragments; the manifest is hashed next; the detached root covers the ordered seven data lines in `hashes.sha256` and excludes its final comment. |

## 4. Exact objects and expressions

| Ordinal | Object | Owner | Expression summary |
|---:|---|---|---|
| 1 | `check:ck_srp_values` | `"public"."StockReservationProjection"` | Two nonnegative quantities; positive version. |
| 2 | `check:ck_spp_values` | `"public"."StockPositionProjection"` | Five nonnegative quantities; positive version. |
| 3 | `check:ck_scr_scope_key` | `"public"."StockCompatibilityReference"` | Closed HEADER/LINE canonical-scope disjunction. |
| 4 | `check:ck_scr_target` | `"public"."StockCompatibilityReference"` | Deterministic Article target or targetless non-deterministic disposition. |
| 5 | `check:ck_pr_version` | `"public"."ProjectionReconciliation"` | Positive observed version. |

The manifest binds exact expression roots, atom byte spans/hashes, whole-object spans, object hashes, and locators. Native enum membership and C13 FK behavior are structural parents, not extra CX09 atoms.

## 5. Forecast, hashes, and static validation

The five fragments contain 74 physical lines. A later P19 wrapper adds four fixed header/`BEGIN` lines, four blank separators, and one `COMMIT` line: exact `lowerLines=pointLines=upperLines=83`, safely `<=350`; no split is required.

Let `H(x)=SHA256(x)`. `hashes.sha256` contains seven ordered LF-terminated data lines: `PROPOSAL.md`, five fragments, and `rendering-manifest.cj1`. The detached root is `H(ASCII("CX09-EXACT-RENDERING-PROPOSAL-ROOT-V1") || NUL || exact seven data lines)`; its final comment is excluded from the preimage.

Static read-only validation must prove exactly five fragments; canonical owners/names/order; C13 relation/column/enum existence; TRUE-only checks; exact five-expression/thirty-atom span closure; exact empty DT dependency/event/branch/error inventories; locator closure; byte profile; direct hashes and detached root; exact 83-line forecast; placeholder/transaction/execution-token absence; and path-limited `git diff --check`. It MUST NOT execute SQL, Prisma, a migration, database/catalog/network access, or a runner.

## 6. Approval question

After independent PASS, does Franco approve the detached root in `hashes.sha256` and select `CX09-R01` through `CX09-R10` as one non-severable documentary rendering decision, approving only these five CHECK fragments and inventories for later PCA2 candidate processing, with no execution, migration, schema, database, fold, repair, authority-root, global-binding, publication, deployment, staging, or production authority?
