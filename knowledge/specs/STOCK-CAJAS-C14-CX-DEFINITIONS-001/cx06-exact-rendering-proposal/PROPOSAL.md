# CX06 Exact Rendering Proposal

Status: **PROPOSED / HUMAN APPROVAL REQUIRED / NON-EXECUTABLE**

## 1. Boundary and authority

This directory proposes byte-exact rendering for the eight approved CX06 identities: two native CHECKs, three trigger functions, and three ordinary triggers. It is not a migration, executable package, authority tuple, schema change, runner, or approval. No file may be executed against a database.

| Binding | Exact parent and CX06 use |
|---|---|
| Canonical | `CANONICAL_RENDERING_OWNERSHIP_MANIFEST_PROPOSAL.md` blob `b1045fd3f66defcbb0bac7a1cc0adcadf783b81a`; P01–P19, P16-B, UTF-8/LF, quoted public qualification, TRUE-only CHECKs, dedicated functions, ordinary-trigger matrix. |
| C13 | Commit `0faf2f55e178f1b111c5ae108380a505a68c8feb`, schema blob `47313a8a85ac71ac56df93ce212593820cb95a13`; exact relations, scalar columns, enums, FKs, uniques, and indexes. |
| A–D | `BINDING_FINALIZATION_ADDENDUM.md` blob `a860049af04a6ff07fbe9fae6ddb512a8ef0adc8`; CX06 adds no lock anchor, extension, projection, or deferred-trigger behavior. |
| J1 / integrated D3 | `RECOMMENDED_PACKAGES.md` blob `0fd2959cd149d3c37b4162cdb2c232dd9dd35a71`; approved T03 six-arm attempt outcome and T04 three-arm effect target semantics. D3 adds no CX06 claim predicate. |
| U | Approved U01-A/U02-A: trigger raises use SQLSTATE `23514`; append-only events are all-column `UPDATE OR DELETE`; semantic intent is all-column `INSERT OR UPDATE`. |
| TEI | `TRIGGER_ERROR_IDENTITY_ADDENDUM.md` blob `237c7c5e18e4a3cf22d223c3d77b117efa400014`; TEI01-B/TEI02-A/TEI03-A/TEI04-A, exact C14E1 diagnostics, R0001, and ERROR × trigger × scalar-operation binding. |
| DT | `DEPENDENCY_TARGET_ADDENDUM.md` blob `fdbdaa1da1fe97d4cac24ae347c94c6a3dff6947`; DT01-B/DT02-A/DT03-A/DT04-A. Three EXECUTES edges target generated functions; one READS edge targets the physical acceptance relation. |
| PCA | `POST_EAV_CANDIDATE_ADOPTION_ADDENDUM.md` PCA2; this pending proposal is not enrolled, adopted, or authoritative and changes no EAV/PCA root. |
| Topology | `C14-14` after PS08/S08, topology blob `b8608a922d2d9adf5d776673252f709c52d4a518`. |

Authority remains human boundaries, approved exact parent bytes/selections, this pending proposal, then derived hashes. Silence is not authority.

## 2. Finite rendering decisions

| Cell | Exact recommendation |
|---|---|
| `CX06-R01` | Render each CHECK as one post-C13 `ALTER TABLE ... ADD CONSTRAINT`; no inline DDL or domain constraint. |
| `CX06-R02` | Render T04 as exactly three exhaustive arms: DOMAIN_ONLY/null/null, STOCK_EVIDENCE/non-null/null, STOCK_RESERVATION_EVIDENCE/null/non-null. |
| `CX06-R03` | Render T03 as exactly six exhaustive arms; ACCEPTED requires acceptance+audit, every other outcome forbids acceptance and requires audit. |
| `CX06-R04` | Wrap each complete CHECK expression in `(...) IS TRUE`; UNKNOWN never passes. |
| `CX06-R05` | Append-only functions contain one unconditional TEI raise; one R0001 site covers their closed UPDATE/DELETE events. |
| `CX06-R06` | Semantic conflict means another acceptance with the same `(companyId,domain,sourceOperationId,checkpoint,scopeKey)` but a different `intentHash`, `resultEntityType`, or `resultEntityId`; compare nullable-safe with `IS DISTINCT FROM`. |
| `CX06-R07` | Exclude the same row by `id <> NEW.id`; exact prior same-intent/result reuse is left to the native semantic unique plus writer-side idempotent replay and is not falsely classified as conflict. |
| `CX06-R08` | Compute one `NOT EXISTS` Boolean, return NEW only on `IS TRUE`, and use one explicit ELSE/R0001 reject; no write, lock, dynamic SQL, or hidden fallback. |
| `CX06-R09` | Use U02-A all-column triggers: append-only `BEFORE UPDATE OR DELETE`; guard `BEFORE INSERT OR UPDATE`; all are `FOR EACH ROW`. |
| `CX06-R10` | Use uppercase keywords, two-space indentation, quoted identifiers, explicit `"public"`, `$c14fn$`, `VOLATILE SECURITY INVOKER SET search_path = ''`, and one terminal LF. |
| `CX06-R11` | Use the acyclic leaf/manifest/hashes/detached-root construction in §6; no artifact hashes itself. |

Approval must select all eleven cells as one non-severable CX06 rendering decision.

## 3. Exact object and owner inventory

| # | Object ID | Owner |
|---:|---|---|
| 1 | `check:ck_oce_target_shape` | `"public"."OperationalCommandEffect"` |
| 2 | `check:ck_ocat_outcome` | `"public"."OperationalCommandAttempt"` |
| 3 | `function:fn_operational_acceptance_append_only` | `"public"."OperationalCommandAcceptance"` |
| 4 | `function:fn_operational_effect_append_only` | `"public"."OperationalCommandEffect"` |
| 5 | `function:fn_operational_semantic_intent_guard` | `"public"."OperationalCommandAcceptance"` |
| 6 | `trigger:trg_operational_acceptance_append_only` | `"public"."OperationalCommandAcceptance"` |
| 7 | `trigger:trg_operational_effect_append_only` | `"public"."OperationalCommandEffect"` |
| 8 | `trigger:trg_operational_semantic_intent_guard` | `"public"."OperationalCommandAcceptance"` |

## 4. Complete semantic inventory

- **Atoms:** 37 rendered Boolean leaves: target CHECK 9; outcome CHECK 18; semantic guard 10 (five key equalities, row-ID inequality, three conflict comparisons, one `v_coherent IS TRUE`).
- **Decision outcomes:** exactly two guard outcomes: TRUE→RETURN NEW and ELSE→RAISE. CHECK enum arms are explicit predicates, not PL/pgSQL branch rows.
- **Errors:** exactly three R0001 sites: two `APPEND_ONLY`, one `ROW_OR_CROSS_ROW_GUARD`; native CHECKs have no TEI site.
- **Events:** six D9 occurrences: acceptance append-only UPDATE/DELETE; effect append-only UPDATE/DELETE; semantic guard INSERT/UPDATE.
- **Dependencies:** four unique directed edges: each trigger EXECUTES its function; semantic guard READS `"public"."OperationalCommandAcceptance"`. Repeated acceptance-column references remain one READS edge.
- **Writes/locks:** zero function WRITES edges, zero lock anchors, zero dynamic SQL, zero exception handlers, zero loops.
- **Source closure:** `rendering-manifest.cj1` records every object, fragment byte/line/hash, atom, outcome, error, event, dependency, owner, and exact full-fragment span. No placeholder or generic future arm is admitted.

## 5. Byte profile and line gate

All artifacts are UTF-8/NFC without BOM, NUL, or CR; LF only; no trailing horizontal whitespace; exactly one terminal LF. Each `.sqlfrag` is one complete object block without comment, transaction wrapper, migration metadata, `IF NOT EXISTS`, `CASCADE`, or ambient `search_path`.

P19 projection is three required comments, `BEGIN;`, eight object blocks in ordinal order, seven blank separators, and `COMMIT;`. The manifest supplies exact fragment lines and the derived final count. The count MUST be one exact value at or below 350; proposal prose never enters that SQL child.

## 6. Manifest, hashes, and detached root

Let `H(x)=SHA256(x)`. Ordered leaves are `PROPOSAL.md` then the eight fragments. `manifestCoreSha256=H(ASCII("CX06-RENDERING-MANIFEST-CORE-V1") || NUL || exact rendering-manifest.cj1 bytes)`. The manifest contains neither its own hash nor the detached root. `hashes.sha256` has ten data lines for nine leaves plus the manifest, then one root comment. `detachedProposalRootSha256=H(ASCII("CX06-EXACT-RENDERING-PROPOSAL-ROOT-V1") || NUL || exact ten LF-terminated data lines)`. The root comment is excluded from its own preimage.

## 7. Static review contract and approval question

Independent read-only review must reproduce every byte/hash/root, exact 8-object/class/owner inventory, 37 atoms, 2 outcomes, 3 errors, 6 events, 4 dependencies, TEI diagnostics and message IDs, trigger timing/level/events, C13 identifiers, full-fragment spans, forbidden-token absence, and P19 count `<=350`. It must execute no SQL, Prisma, database, catalog, network, migration, runner, or global mutation.

After independent PASS, does Franco approve the exact detached root in `hashes.sha256` and select `CX06-R01` through `CX06-R11` as one non-severable decision solely for later candidate serialization/review, with no schema, migration, execution, root-adoption, deployment, staging, production, or publication authority?
