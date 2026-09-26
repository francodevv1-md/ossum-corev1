# CX10 Exact Rendering Proposal

Status: **PROPOSED / HUMAN APPROVAL REQUIRED / NON-EXECUTABLE**

## 1. Purpose and boundary

This directory proposes byte-exact rendering for 14 CX10 identities: five CHECKs, four functions, three ordinary triggers, and two constraint triggers. It is non-executable documentary material, not a migration, schema change, runner input, authority root, or self-approval. Fragments exclude transaction wrappers, migration metadata, dynamic SQL, `IF NOT EXISTS`, `CASCADE`, and ambient `search_path`.

## 2. Bound authority

| Parent | Exact binding |
|---|---|
| C04/C05 | #4318r1/#4319r2/#4321 and #4324r3/#4329: formula shape, future-only pointer, immutable histories, customized-SQL boundary. |
| P01-P19/A-D | Blobs `b1045fd3f66defcbb0bac7a1cc0adcadf783b81a` and `a860049af04a6ff07fbe9fae6ddb512a8ef0adc8`: identities, P16-B/U01-A/U02-A, deferred events, bytes, P19. |
| SFO01-B | Blob `1e5a4df989b9831343a54cd3c62237e4c8916614`: ordered owner set [`cajas_formula_line`,`cajas_formula_version`] and two callers. |
| ISO/TEI | Blobs `09408f21b209cda10068d60fe5ee546b460a3f06` and `237c7c5e18e4a3cf22d223c3d77b117efa400014`: external writer ownership and C14E1 diagnostics. |
| DT/PCA2 | Blobs `fdbdaa1da1fe97d4cac24ae347c94c6a3dff6947` and `d4ec678a129e85dcfff75283b224395dc80368ff`: generated EXECUTES, physical READS, pending adoption. |
| C13/topology | Commit `0faf2f55e178f1b111c5ae108380a505a68c8feb`; schema `47313a8a85ac71ac56df93ce212593820cb95a13`; topology `b8608a922d2d9adf5d776673252f709c52d4a518`. |

## 3. Finite rendering decisions

| Cell | Exact proposed decision |
|---|---|
| `CX10-R01` | One post-C13 `ALTER TABLE ... ADD CONSTRAINT ... CHECK` block per row invariant. |
| `CX10-R02` | TRUE-only checks: positive next/current/version numbers and quantity; scale `0..4`. |
| `CX10-R03` | Formula INSERT is exactly an empty initial pointer: null current version, next version 1, projection version 1. |
| `CX10-R04` | UPDATE advances once: owner tuple unchanged; target belongs to it; predecessor equals OLD current; target number equals OLD next; NEW next/version increment. |
| `CX10-R05` | Version/line append-only functions each have one unconditional R0001 APPEND_ONLY raise on UPDATE/DELETE. |
| `CX10-R06` | The SFO01-B minimum-line function requires a visible line for the inserted version or OLD line parent; unknown context rejects. |
| `CX10-R07` | P16-B `..._on_version`/`..._on_line`; AFTER ROW, DEFERRABLE INITIALLY DEFERRED. |
| `CX10-R08` | Apply U02-A exactly: current guard INSERT/UPDATE, append-only UPDATE/DELETE, minimum header INSERT, minimum line UPDATE/DELETE; no UPDATE column list. |
| `CX10-R09` | TEI1 `23514`, fixed MESSAGE/C14E1/HINT/runtime diagnostics, one R0001 per function; CHECKs remain native. |
| `CX10-R10` | Five EXECUTES plus two READS (`cajas_formula_version`,`cajas_formula_line`); zero writes/locks. |
| `CX10-R11` | ISO inserts header/lines atomically and forces deferred checks; fragments do not replace that contract. |
| `CX10-R12` | Use quoted public-qualified identifiers, uppercase keywords, two-space indentation, `$c14fn$`, SECURITY INVOKER, and empty function `search_path`. |
| `CX10-R13` | One block per fragment; UTF-8/NFC/LF; no BOM/NUL/CR/trailing whitespace; one terminal LF. |
| `CX10-R14` | Hash ordered leaves and manifest acyclically; detached root covers only the LF-terminated data lines and excludes its own comment. |

## 4. Exact inventory

| Ordinal | Class | Object ID | Owner |
|---:|---|---|---|
| 1 | CHECK | `check:ck_cbf_next_version_positive` | `public.cajas_box_formula` |
| 2 | CHECK | `check:ck_cbf_version_positive` | `public.cajas_box_formula` |
| 3 | CHECK | `check:ck_cfv_version_positive` | `public.cajas_formula_version` |
| 4 | CHECK | `check:ck_cfl_quantity_positive` | `public.cajas_formula_line` |
| 5 | CHECK | `check:ck_cfl_scale_snapshot` | `public.cajas_formula_line` |
| 6 | FUNCTION | `function:fn_cajas_formula_current_guard` | `public.cajas_box_formula` |
| 7 | FUNCTION | `function:fn_cajas_formula_version_append_only` | `public.cajas_formula_version` |
| 8 | FUNCTION | `function:fn_cajas_formula_line_append_only` | `public.cajas_formula_line` |
| 9 | FUNCTION | `function:fn_cajas_formula_version_min_line` | SFO01-B [`public.cajas_formula_line`,`public.cajas_formula_version`] |
| 10 | TRIGGER | `trigger:trg_cajas_formula_current_guard` | `public.cajas_box_formula` |
| 11 | TRIGGER | `trigger:trg_cajas_formula_version_append_only` | `public.cajas_formula_version` |
| 12 | TRIGGER | `trigger:trg_cajas_formula_line_append_only` | `public.cajas_formula_line` |
| 13 | CONSTRAINT_TRIGGER | `constraintTrigger:ctrg_cajas_formula_version_min_line_on_version` | `public.cajas_formula_version` |
| 14 | CONSTRAINT_TRIGGER | `constraintTrigger:ctrg_cajas_formula_version_min_line_on_line` | `public.cajas_formula_line` |

## 5. Closed inventories and forecast

- Events are exactly nine: ordinary current INSERT/UPDATE; version append-only UPDATE/DELETE; line append-only UPDATE/DELETE; deferred version INSERT; deferred line UPDATE/DELETE.
- Errors are exactly four R0001 source sites and nine TEI bindings: current 2, append-only 2+2, minimum-line 3. Native CHECK failures remain native.
- Dependencies are exactly seven: five trigger-to-function EXECUTES plus two function-to-PHYSICAL_RELATION READS. Writes and lock dependencies are zero.
- P19 rendering is three provenance comments, `BEGIN;`, 14 blocks, 13 blank separators, and `COMMIT;`. Fragment LF total is 187; point/lower/upper are exactly **205**, below 350.

## 6. Hash and review contract

`hashes.sha256` has 16 data lines: `PROPOSAL.md`, 14 fragments, then `rendering-manifest.cj1`. The detached root is `SHA256(ASCII("CX10-EXACT-RENDERING-PROPOSAL-ROOT-V1") || NUL || exact 16 LF-terminated data lines)`; its final comment is excluded. The manifest core hash domain is `CX10-RENDERING-MANIFEST-CORE-V1`.

Review must reproduce identities, owners, bytes, hashes/root, predicates, SFO ownership, timing/events, TEI diagnostics, branches, dependencies, four errors, nine bindings, and 205 lines. It is static/read-only: no SQL, Prisma, database, network, migration, runner, global file, or mutation.

## 7. Approval question

After independent PASS, does Franco approve the exact detached root in `hashes.sha256` and select `CX10-R01` through `CX10-R14` as one non-severable rendering decision, approving only these 14 byte-exact blocks and closed inventories for later documentary PCA processing while granting no SQL execution, migration, schema, database, global-root, publication, deployment, staging, production, or destructive authority?
