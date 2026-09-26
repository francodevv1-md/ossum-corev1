# CX11 Exact Rendering Proposal

Status: **PROPOSED / HUMAN APPROVAL REQUIRED / NON-EXECUTABLE**

## 1. Purpose and boundary

This directory proposes 22 byte-exact CX11 object blocks: seven CHECKs, seven functions, six ordinary triggers, and two constraint triggers. It is documentary candidate material only: no migration, runner, transaction wrapper, authority-root mutation, SQL execution, schema mutation, deployment, or publication is authorized.

## 2. Bound authority

| Parent | Exact binding |
|---|---|
| C13 | Commit `0faf2f55e178f1b111c5ae108380a505a68c8feb`; schema blob `47313a8a85ac71ac56df93ce212593820cb95a13`; exact mapped Cajas names and unmapped Stock names. |
| U/TEI | U01-A/U02-A; TEI blob `237c7c5e18e4a3cf22d223c3d77b117efa400014`; native CHECKs remain native and seven raised sites use C14E1/R0001. |
| SFO | Blob `1e5a4df989b9831343a54cd3c62237e4c8916614`; `fn_cajas_control_min_line` has the closed two-relation owner set and exactly two calling triggers. |
| ISO | Blob `09408f21b209cda10068d60fe5ee546b460a3f06`; ISW-CX11-01..03 and WCB-03/04 own complete payload, authorization, ordered locks, reread, retry, and audit. |
| DT/PCA2 | DT blob `fdbdaa1da1fe97d4cac24ae347c94c6a3dff6947`; PCA2 inventory `2a7a0d519ec426249e7fcf2385f3046e8f09a802f4462aea7acd8c774520f3aa`; this proposal remains pending adoption. |
| P19 | Serialization `bdc0fd13f3126567ade7e13c8f65f6e376a9940f`; Capacity V2 `1304c0911e858a4995f0621a5c478650f4fe4ccd`; exact fragments and projected child must remain `<=350` lines. |

## 3. Non-severable rendering decisions

| Cell | Exact decision |
|---|---|
| CX11-R01 | Emit the seven closed row-local CHECK identities as separate `ALTER TABLE ... ADD CONSTRAINT` blocks ending in `IS TRUE`. |
| CX11-R02 | Assignment lifecycle is exactly active `(1, all end fields null)` or terminal `(null, all end fields nonnull)`. |
| CX11-R03 | Assignment guard proves the C13 unit/article parent and rejects an active assignment when any positive-live same-unit reservation lacks an exact same-company assignment/reservation/position correlation. Terminal history makes no active claim. Correlation is not inferred from equal unit alone. |
| CX11-R04 | Preparation box guard proves exact assignment/formula-version company and box Article; pointer guard proves nullable latest-control and accepted-change ownership by the same assignment. |
| CX11-R05 | Correlation shape is native CHECK plus C13 composite FKs. WCB-03/ISW-CX11-01 remains authoritative for reservation evidence, lock, payload, and identified-unit coherence that a row-local correlation trigger cannot safely own. |
| CX11-R06 | Correlation, control, and control-line ledgers are insert-only: one unconditional TEI APPEND_ONLY site each, attached to all-column `BEFORE UPDATE OR DELETE`. |
| CX11-R07 | Control minimum-line uses the SFO function, validates the inserted header and every OLD/NEW parent affected by line UPDATE/DELETE, and is called only by P16-B `AFTER ... DEFERRABLE INITIALLY DEFERRED` triggers. |
| CX11-R08 | Ordinary guards use U02-A all-column `BEFORE INSERT OR UPDATE`; no `UPDATE OF` narrowing. All triggers are `FOR EACH ROW`. |
| CX11-R09 | Functions are `LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = ''`; relations/functions are quoted and public-qualified. |
| CX11-R10 | DT dependencies are exactly eight EXECUTES edges plus nine deduped PHYSICAL_RELATION READS; no WRITES, pseudo-column target, inferred dependency, or duplicate Prisma FK/unique/index. |
| CX11-R11 | TEI identities use runtime `TG_*`, literal function ObjectId/name, R0001, exact family, function-derived messageId, and no business value in diagnostics. |
| CX11-R12 | Hashes are acyclic: ordered leaves, manifest core, then detached root over LF-terminated data lines excluding its own comment. |

## 4. Complete inventories

Object order is exactly filenames 01..22. Owners: assignment CHECK/function/trigger -> `cajas_assignment`; preparation CHECK and both guard pairs -> `cajas_preparation`; preparation-line CHECK -> `cajas_preparation_line`; correlation CHECKs and append-only pair -> `cajas_reservation_correlation`; control CHECK/append-only pair/header constraint trigger -> `cajas_control`; control-line CHECK/append-only pair/line constraint trigger -> `cajas_control_line`; the shared minimum-line function owns the SFO ordered relation set `[cajas_control,cajas_control_line]`.

Branches are exactly 13: assignment, preparation-box, and preparation-pointer guards each `IS_TRUE/RETURN_NEW` plus `ELSE/RAISE`; three append-only functions each one unconditional RAISE; minimum-line outer dispatch `TG_TABLE_NAME_EQ_CAJAS_CONTROL/SELECT_HEADER_PARENT` plus `ELSE/SELECT_LINE_OLD_NEW_PARENTS`, then `IS_TRUE/RETURN_NEW` plus `ELSE/RAISE`. The two outer outcomes are `CX11-B0010` and `CX11-B0011`, with exact `[177,383)` and `[383,827)` byte spans and hashes in `branchSourceSpanInventory`; the final decision outcomes are `CX11-B0012` and `CX11-B0013`. Errors are exactly seven R0001 sites. Events are exactly 15 scalar outcomes: ordinary guards 6, append-only 6, constraint triggers 3. Trigger-to-function EXECUTES edges are exactly 8 and PHYSICAL_RELATION READS edges are exactly 9.

READS inventory is complete and deduped by source/target: assignment guard reads `StockIdentifiedUnit`, `StockReservation`, `StockReservationEvidence`, and `cajas_reservation_correlation`; preparation-box reads `cajas_assignment` and `cajas_formula_version`; preparation-pointer reads `cajas_control` and `cajas_composition_change`; minimum-line reads `cajas_control_line`. Append-only functions read no relation.

## 5. Enforcement boundary and review

The SQL fragments do not lock anchors, authorize tenants, prove complete future sibling payloads, or replace ISO. WCB-03 freezes Unit/Position/Reservation/Assignment anchors for correlation; WCB-04 freezes assignment plus all future-line units/positions, inserts one control with one-or-more lines, forces deferred constraints, and commits once. Missing/late anchors, payload drift, unauthorized direct writers, or absent DTO manifest remain fail-closed ISO concerns.

Independent read-only review must reproduce all 22 leaf hashes, manifest hash, detached root, object/class/owner order, CHECK truth closure, SFO owner/caller equality, ISO split, 15 events, 8 EXECUTES edges, complete READS set, seven TEI sites, UTF-8/NFC/LF profile, placeholder absence, and the exact P19 line forecast `<=350`. It must execute no SQL, Prisma, database, network, migration, runner, global file, or artifact mutation.

## 6. Approval question

After independent PASS, does Franco approve the exact detached root in `hashes.sha256` and select CX11-R01..R12 as one non-severable decision, approving only these 22 byte-exact documentary object blocks and inventories while granting no execution, migration, schema, database, global-root, deployment, staging, production, or publication authority?
