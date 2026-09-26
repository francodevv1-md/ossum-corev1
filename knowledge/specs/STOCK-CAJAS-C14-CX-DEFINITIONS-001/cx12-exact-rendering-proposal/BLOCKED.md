# CX12 Exact Rendering Proposal — Size-Gate Blocker

Status: **BLOCKED / NON-EXECUTABLE / NO PROPOSAL ROOT CREATED**

## Boundary

This stop report is the only artifact produced for `C14-CX12-EXACT-RENDERING-PROPOSAL-001`. No SQL fragment, rendering manifest, hash list, detached proposal root, migration, runner input, schema change, or global file is created. Creating a partial 51-object package or shortening required semantics would misrepresent completeness.

## Exact topology evidence

The selected topology is one child, `C14-33`, attached after `S21` and covering `S16` through `S21`. The current CX12 inventory is exactly 51 ordinary objects:

| Class | Ordinals | Count |
|---|---:|---:|
| CHECK | 1–18 | 18 |
| function | 19–34 | 16 |
| ordinary trigger | 35–51 | 17 |
| **Total** | **1–51** | **51** |

The 17 triggers are the twelve append-only triggers, `trg_cajas_dispatch_ceiling`, both shared-function Stock-link triggers (`trg_cajas_dispatch_line_stock_link_guard` and `trg_cajas_disposition_stock_link_guard`), `trg_cajas_disposition_fold_guard`, and `trg_cajas_condition_assignment_guard`. A 50-object topology containing one generic `trg_cajas_stock_link_guard` is stale and contradicts `CANONICAL_RENDERING_OWNERSHIP_MANIFEST_PROPOSAL.md` §§5/8 and `SHARED_FUNCTION_OWNERSHIP_ADDENDUM.md`.

## Exact line lower bound

P19 defines final-child lines as:

```text
4 wrapper lines + sum(fragment LF counts) + (objectCount - 1) separators + 1 COMMIT line
```

For 51 objects, fixed wrapper/separator cost is therefore:

```text
4 + 50 + 1 = 55 lines
```

Complete U/TEI append-only rendering uses the established exact 23-LF block shape, evidenced by `cx07-exact-rendering-proposal/05-function-fn-stock-evidence-append-only.sqlfrag` lines 1–23. CX12 has twelve such function identities, each requiring the same complete declaration, security/search-path clauses, unconditional R0001 raise, C14E1 DETAIL, function-specific HINT, diagnostic fields, body terminator, and terminal LF:

```text
12 × 23 = 276 fragment lines
```

The other 39 required objects are non-empty `.sqlfrag` files ending in exactly one LF, so even an inadmissible one-line lower bound contributes:

```text
39 × 1 = 39 fragment lines
```

Thus the non-compressible lower bound is:

```text
55 + 276 + 39 = 370 projected child lines
370 - 350 = 20 lines over the gate
```

This bound excludes the actual multiline content of all 18 CHECKs, all 17 triggers, and the four semantic guard functions for dispatch ceiling, shared Stock-link validation, disposition folding, and condition-assignment coherence. Complete-command ISW2, Addendum A, composition/difference/dispatch/Return/Consumption/replacement semantics, U/TEI/DT/PCA2/C13 inventories, branches, dependencies, errors, and locators can only increase the projection.

The documentary estimate of 264 lines is not admissible exact evidence: it predates the split Stock-link trigger topology and is an occurrence-based estimate, not a sum of byte-exact fragment LF counts under P19.

## Stop decision

Authoring stops before fragments and hashes. Satisfying `<=350` would require at least one prohibited action: compressing the established TEI block bytes, omitting required objects or semantics, or revising/splitting the approved `C14-33` topology. Any of those requires a new explicit topology/rendering decision before byte-exact CX12 proposal authoring can resume.
