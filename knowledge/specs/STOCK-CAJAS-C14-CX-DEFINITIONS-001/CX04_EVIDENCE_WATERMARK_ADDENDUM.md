# CX04 Evidence-Watermark Addendum

Status: **REVISED AFTER FAIL / HUMAN APPROVAL REQUIRED / NON-EXECUTABLE**

## Decision and authority

FAIL **#4979** withdraws the exact-line/FK recommendation and blob `17b1097376a0f19319d9529c502eda858ecde6dd`. Authority is C04 **#4318 rev1 + governing #4319 rev2**, closure **#4321 rev1**; C13 commit/schema `0faf2f55e178f1b111c5ae108380a505a68c8feb`/`47313a8a85ac71ac56df93ce212593820cb95a13`; and topology blob `b8608a922d2d9adf5d776673252f709c52d4a518`. C14-10 follows S06 `66165aefa077073335e9821fd10752cfc1c37e59`/`2433f98922be3684efd512ad0515adbd4621dc73`, before Stock evidence at C14-15/CX07 C14-16.

## Alternatives

| Alternative | Consequence | Decision |
|---|---|---|
| Opaque, format-closed transition correlation token | Topology-safe correlation without evidence or replay authority. | **Recommend** |
| `StockEvidenceLine.id` or `StockEvidence.id` | Crosses into later CX07 relations and falsely implies accepted/effective evidence. | Reject/withdraw |
| Command/evidence tuple | Requires unavailable command/evidence semantics and a new encoding contract. | Reject |
| Arbitrary nonempty string | Opaque but not mechanically bounded or safely comparable. | Reject |

## Exact recommended model

`evidenceWatermark` is a required, opaque, non-authoritative **transition correlation token**. It is not an idempotency mechanism, Stock evidence, evidence-line, command, audit, or business identity and must never be dereferenced or used to claim accepted/effective movement or replay prevention.

- **Type/nullability:** existing non-null `String`; no schema change. Domain: exactly 69 ASCII bytes matching `^cx04:[0-9a-f]{64}$`; CX04 does not interpret the payload.
- **Every INSERT/UPDATE:** `NEW.evidenceWatermark` must match the token domain, including same-position updates.
- **INSERT:** `version = 1`; `id`, `companyId`, `identifiedUnitId`, and `currentPositionId` are required by C13. Existing company-qualified FKs/uniques remain the only position/unit authority.
- **Every UPDATE:** `id`, `companyId`, `identifiedUnitId`, and `createdAt` are immutable.
- **Same-position UPDATE:** `currentPositionId` unchanged requires both `evidenceWatermark` and `version` unchanged. Technical `updatedAt` may change; no transition is inferred.
- **Position-changing UPDATE:** token differs byte-for-byte from OLD; `version = OLD.version + 1`; overflow/nonpositive results reject. Token change proves only a distinct marker.
- **NULL/terminal:** NULL is impossible; no empty, terminal, tombstone, removal, correction, reversal, or evidence-fold meaning exists.

### Exact examples

Let `T1=cx04:0000000000000000000000000000000000000000000000000000000000000001` and `T2=cx04:0000000000000000000000000000000000000000000000000000000000000002`.

- INSERT `(P1,version=1,T1)` is locally valid; version 2, NULL, uppercase hex, or 63 hex digits reject.
- Same-position UPDATE `P1→P1` is locally valid only with unchanged `version=1,token=T1`; changing only token to `T2` or version to `2` rejects.
- Position UPDATE `P1→P2` is locally valid with `version 1→2` and `T1→T2`; unchanged `T1` or version `3` rejects.
- Any UPDATE changing `id`, `companyId`, `identifiedUnitId`, or `createdAt` rejects. Reusing `T1` after a later transition or on another row is not detectable or prevented by CX04.

## Local CX04 exclusivity boundary

C14-10 uses only S06 authority: `StockIdentifiedUnit`, `StockPosition`, `StockIdentifiedUnitOccupancy`, their company-qualified keys, and `StockContext` classification without movement evidence. Local semantics are exactly one occupancy per company/unit, one occupancy per company/current-position, same-company/unit position, immutable occupancy identity, one-step version advance, and the token rules.

CX04 does not read or decide evidence, command acceptance, reservations, dispositions, correction/reversal effectiveness, or atomicity. Integrated D3 **#4771** binds package/matrix blobs `0fd2959cd149d3c37b4162cdb2c232dd9dd35a71`/`4f8536560fd94ba0af92091739a333986ee75eee`; it is a successor writer obligation, not a CX04 dependency.

## Replay limits and later responsibility

The current row detects only immediate equality. There is no token unique key, history, or idempotent retry contract. CX04 cannot detect reuse of an older token, reuse on another unit/company, malicious fresh-token replay, duplicate concurrent intent, or semantic mismatch.

Approved ISW blob `09408f21b209cda10068d60fe5ee546b460a3f06` has **15 contracts/11 bundles and does not cover occupancy INSERT or UPDATE**. Evidence-backed occupancy writing requires a separately designed, independently reviewed, Franco-approved successor; current ISW grants no such authority.

Successor semantics are J1 **#4767** at blob `0fd2959cd149d3c37b4162cdb2c232dd9dd35a71`; topology places evidence at PS09/C14-15 and CX07/C14-16 under the cited topology blob. These are citations, not dependency edges. A successor may carry the token but validates evidence independently. No stale-replay, correction/reversal, or reverse-atomicity claim is made.

## Rendering, counts, hashes, and DAG

- Object identities remain **CX04 9 = 3 checks + 3 functions + 3 ordinary triggers**; global **169 = 1/55/53/49/10/1**. Events remain **6 = INSERT 2 / UPDATE 3 / DELETE 1**.
- **Closed TEI recommendation:** each function has exactly one R0001 raise site. `fn_stock_position_append_only` has one unconditional RAISE outcome; each of `fn_stock_position_parent_guard` and `fn_stock_identified_unit_exclusivity` has exactly `v_valid IS TRUE → RETURN NEW` and explicit `ELSE → RAISE`. Therefore function outcomes are exactly five and TEI bindings exactly six: parent INSERT/UPDATE, exclusivity INSERT/UPDATE, append-only UPDATE/DELETE.
- `ck_siuo_version_positive` remains unchanged. `fn_stock_identified_unit_exclusivity` renders only the finite INSERT/UPDATE rules above; its all-column `BEFORE INSERT OR UPDATE` attachment is unchanged.
- The withdrawn `StockEvidenceLine`/`StockEvidence` reads and **+2 DT edges are removed**. This function has exactly zero cross-topology dependency targets and zero evidence/command/FK additions. Its exact atoms/branches/spans/lines are derived only after byte rendering.
- DAG: `C04 rev1+rev2 closure + C13/S06 + topology + #4979 -> this decision -> local CX04 rendering -> independent PASS -> Franco approval`. CX07/ISW evidence coherence is a later successor obligation, not a CX04 dependency.

The revised file’s exact Git blob is reported after writing; embedding it here would be self-referential.

**Approval question:** Does Franco approve the opaque `cx04:<64-lowercase-hex>` transition-correlation model, exact examples/rules/replay limits, one-R0001-per-function TEI closure, explicit non-coverage by current ISW 15/11, withdrawal of all evidence/FK/cross-topology claims, unchanged object/event counts, and zero evidence/command DT targets, solely for later non-executable CX04 rendering and independent review?

No SQL, schema, FK, migration, Prisma, database, runner, commit, remote, deployment, staging, or production action is authorized.
