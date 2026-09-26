# External Recovery Plan — Prisma Migration Baselines

## Status

**BLOCKED — read-only recovery.** Do not run `prisma migrate reset`, `prisma migrate resolve`, modify `_prisma_migrations`, reconstruct SQL, or restore any candidate until both missing artifacts pass exact checksum verification.

## Objective

Recover the two authoritative `migration.sql` artifacts required to reconcile the disposable DEV database history before applying pending Stock and Fiscal migrations.

## Acceptance rule

An artifact is authoritative only when the raw bytes of `migration.sql` produce the exact SHA-256 stored in DEV `_prisma_migrations`. Filename, migration name, SQL similarity, branch, timestamp and a successful schema validation are not substitutes.

| Required migration | Expected DEV SHA-256 |
| --- | --- |
| `20260820190000_receipt_preparation_v1` | `f044745e16341711f17796b9439bf7ff51941c76f669e075f9307ec2ebd2f963` |
| `20260903030000_surgery_visible_number_uniqueness` | `efa3d2e676fdd9f68048024a6fa2538abf18ce84622049fd54228f09064caa2b` |

## Evidence already recovered — preserve, do not restore yet

| Migration | Expected DEV SHA-256 | Exact source |
| --- | --- | --- |
| `20260813000000_remito_stock_atomic_dispatch_persistence_001` | `670e672a539edfeb6133e8e95b30b4e7f388aef8f93dcfb46eaca4d7f60742d8` | reachable Git history, including `stabilization/ossum-20261002` |
| `20260824160000_fix_stock_policy_guard_null_eligibility` | `bd58a3a2622487ea0facf88dea03da66e50a9975127aca15ae9f0de1350eb1f9` | unreachable Git tree `e3401fac7a222d35106e64d50e5797ed8a07ebbe` |

The recovered Geo/GPS migration remains exact and is not part of the unresolved baseline set.

## Sources searched

| Source | Result |
| --- | --- |
| All local/remote refs, worktrees, reflogs, 1,261 unreachable commits/trees and 640 unreachable blobs | No exact artifact for either required migration |
| `origin/main`, `origin/integration/ossum-clean`, `stabilization/ossum-20261002` | No exact artifact for either required migration |
| GitHub remote `francodevv1-md/ossum-corev1` | Authenticated; three branches, one merged PR, no Actions runs/artifacts or releases available |
| Local clones/worktrees | Visible-number copies found, but SHA-256 `2d30791f...`, not expected `efa3d2e...` |
| `backup/old-dirty-worktree-20260918` | Receipt candidate SHA-256 `8472986d...`, not expected `f044745e...` |
| ZIP backups examined | `pre-v2.2.4-20260806-163129.zip` and `stitch_traumacorr_erp_v2.2.zip` do not contain either target path |

## Recovery sequence

1. Obtain candidate files from an external backup/export, former workstation, CI artifact retention store, hosted repository mirror, or collaborator copy.
2. Preserve each candidate as read-only evidence; do not overwrite the local migration file.
3. Compute SHA-256 from the candidate's raw bytes.
4. Compare it with the exact expected value above.
5. Record source, acquisition date, raw checksum and match result.
6. Only after **both** exact artifacts are available, create a narrowly scoped restoration task.
7. In that task, restore exact artifacts, run `prisma migrate status`, `prisma validate`, `prisma generate`, and then evaluate whether `prisma migrate dev` can apply the already pending Stock/Fiscal migrations without reset.

## Rejected recovery paths

- Rewriting SQL from current schema or inference.
- Treating a similar candidate as equivalent.
- `prisma migrate reset`.
- `prisma migrate resolve`.
- Direct edits to `_prisma_migrations`.
- Restoring only one of the two missing files and claiming history is reconciled.

## Current fiscal impact

`20260923134500_fiscal_tusfacturas_dev` remains unapplied. FISCAL-03 and later tasks must not start until migration history is reconciled and the fiscal migration applies successfully in disposable DEV.
