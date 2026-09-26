# C14 CX Binding Finalization Addendum

Status: **PROPOSED / HUMAN APPROVAL REQUIRED / NON-EXECUTABLE**

## Authority and boundary

This addendum closes only A–D from #4775 and binds C04 #4318r1/#4319r2/#4321; C05 #4324r3/#4329; C13 commit `0faf2f55e178f1b111c5ae108380a505a68c8feb`/schema `47313a8a85ac71ac56df93ce212593820cb95a13`; topology `b8608a922d2d9adf5d776673252f709c52d4a518`; recommendation `0fd2959cd149d3c37b4162cdb2c232dd9dd35a71`; matrix `4f8536560fd94ba0af92091739a333986ee75eee`; #4767/#4769/#4771/#4774/#4762/#4754.

## A — Transaction serialization

**Decision.** Every insert/update path, before testing absence or writing, must `FOR UPDATE NOWAIT` all deduplicated stable anchors ordered by `(rank, companyId UTF-8, id UTF-8)`: (1) `StockIdentifiedUnit`; (2) `StockPosition`; (3) `StockReservation`; (4) target `StockEvidence`; (5) `CajasAssignment`; (6) `CajasDispatch`; (7) `CajasDispatchLine`. Reread under `READ COMMITTED`; a later anchor forces rollback/restart. No advisory lock/schema object.

| CX | Required existing anchors |
|---|---|
| CX03 | unit; every affected position/reservation/assignment |
| CX04 | unit; old/new positions; affected reservation/assignment |
| CX07 | ORIGINAL base evidence; every line-owned unit/position/reservation |
| CX08 | position, reservation, optional unit, correlated assignment |
| CX11 | assignment, unit, correlated position/reservation |
| CX12 | assignment, current/target dispatch, affected dispatch lines, units/positions/reservations |

`StockPosition` serializes physical/hold/reservation acceptance, ORIGINAL `StockEvidence` its cross-lineage child, and `CajasDispatchLine` shared remainder. Reject unsupported nonconforming writers: `READ COMMITTED` does not predicate-lock absence.

On `55P03`/`40P01`/`40001`, roll back and retry the same semantic key twice (25 ms, 100 ms); exhaustion returns conflict without accepted rows. Other errors do not retry. Ordering prevents only conforming-anchor cycles. Reject projection/process locks, unlocked prechecks, `SKIP LOCKED`, and advisory hashes.

## B — CX01 `btree_gist` contract

Select the unique `pg_available_extension_versions` row for `name='btree_gist'` and `version=pg_available_extensions.default_version`; freeze `(name,version,superuser,trusted,relocatable,schema,requires)` and require `schema IS NULL OR schema='public'`. C13 exclusion keys are two `text` equalities plus one `tstzrange` overlap. Its only required `btree_gist` member, used twice, is `(public.gist_text_ops, pg_am.amname='gist', opcintype=pg_catalog.text)`; range GiST support is core.

**Existing path:** exact-no-op requires `pg_extension` name/version/`extnamespace=public`/relocatability/frozen `extowner`; exact installed `requires`; and `pg_depend.deptype='e'` opclass membership. Freeze owner OID/`pg_roles.rolname`; equality to `current_user` is unnecessary because alteration is forbidden, but require `has_schema_privilege(current_user,'public','USAGE')` and `'CREATE'`. Any mismatch fails closed.

**Absent path:** require the tuple, `has_database_privilege(current_user,current_database(),'CREATE')`, `has_schema_privilege(current_user,'public','USAGE')` and `'CREATE'`, and (`pg_roles.rolsuper` or `superuser=false` or `trusted=true`); when `superuser=true`, only trusted permits non-superuser creation. `requires` must already exact-match; no `CASCADE`. Use explicit `SCHEMA public` and `VERSION`, no `IF NOT EXISTS`; owner becomes `current_user`. Rerun existing-path postconditions. One duplicate-race recheck is allowed. No generic extension ACL/provider assumption; unknowns fail closed.

## C — CX09 disposition

This addendum explicitly revises and supersedes, for C14, C04 `StockPositionProjection.ck_spp_available` and the C05 CX09 structural projection CHECK/guard skeleton: their context/policy-sensitive availability arm is deferred to C19/C31 because final C13 projection rows lack context/policy facts and PostgreSQL CHECK cannot query parents. CX09 retains row-local `ck_spp_values` (all quantities nonnegative; version positive), scalar/nullability/type checks, and the existing position FK; no parent trigger/fold is added. Separately, P3 defers `CajasConditionProjection` condition/eligibility/lifecycle semantics and is not authority for this Stock revision.

## D — D7 minimum-line event matrix

Each identity is an `AFTER`, `FOR EACH ROW`, `DEFERRABLE INITIALLY DEFERRED` PostgreSQL constraint trigger on a plain table. This is syntactically representable; no body is defined here.

| Family / owner | Header trigger event | Line trigger events | D9 events |
|---|---|---|---:|
| Formula / CX10 | `INSERT` | `UPDATE OR DELETE` | 3 |
| Control / CX11 | `INSERT` | `UPDATE OR DELETE` | 3 |
| Dispatch / CX13 | `INSERT` | `UPDATE OR DELETE` | 3 |
| Return / CX13 | `INSERT` | `UPDATE OR DELETE` | 3 |
| Consumption / CX13 | `INSERT` | `UPDATE OR DELETE` | 3 |

Count-family effects: A freezes no object count; B fixes CX01 at one extension identity; C adds zero CX09 semantic predicates/functions/triggers/events; D yields CX10 `1` function/`2` constraint triggers/`3` events, CX11 the same, CX13 `3`/`6`/`9`, and CX12 zero D7 objects/events. Other counts and final vectors remain renderer-derived and unfrozen.

## Approval, consequences, and revision

**Exact non-severable approval sentence:** `I approve BINDING_FINALIZATION_ADDENDUM.md as one non-severable A–D decision: mandatory ordered stable-parent FOR UPDATE NOWAIT serialization and retry behavior for CX03/CX04/CX07/CX08/CX11/CX12, rejecting nonconforming writers because READ COMMITTED does not lock absence; CX01's exact catalog-selected btree_gist tuple, public.gist_text_ops membership, authorization, compatible-owner, create-or-exact-no-op, and postcondition contract; CX09's explicit C14 revision/supersession of StockPositionProjection.ck_spp_available and the C05 structural projection CHECK/guard skeleton by deferring their context-sensitive arm to C19/C31 while retaining row-local ck_spp_values, separately from P3's Cajas deferral; and D's unchanged five-family DEFERRABLE INITIALLY DEFERRED event matrix and D9 occurrences.`

Approval enables later rendering, not final counts. Revise if anchors fail, B cannot prove its catalog contract, C19/C31 changes C, or the minimum-line contract changes D.

This document contains no SQL bodies and alone updates no vectors, catalog, templates, fixtures, manifests, hashes, or runner. It authorizes no Prisma, schema/DB/migration/extension execution, run, external root, staging, commit, remote action, deploy, or production action.
