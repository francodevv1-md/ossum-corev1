# Task Brief — C14 WCB-06 command/reservation uniqueness

Status: implemented source artifact; migration is **forward-only and not applied**.

Approval: the task owner explicitly authorized this bounded stabilization package, including the Prisma declaration, forward migration artifact, validation, GGA #7221, and local commit only if every gate passes. This approval excludes migration execution, database access, deploy, push, and production.

## Objective

Allow one accepted WCB-06 command to persist evidence for multiple distinct reservations while preserving one evidence record per company, command acceptance, and reservation.

## Scope

- Change `StockReservationEvidence` Prisma uniqueness from `uq_sre_command` to `uq_sre_command_reservation` on `[companyId, commandAcceptanceId, reservationId]`.
- Preserve the existing valid C14 schema candidate and tenant-isolation worktree deltas; this task's only schema semantic delta is the uniqueness declaration above.
- Add one transactional PostgreSQL migration artifact. It verifies the exact legacy unique index, creates the new protection first, then drops the legacy index.
- Reject duplicate reservation IDs in a WCB-06 payload before DML.
- Cover distinct reservations, duplicate reservation rejection, idempotent retry, and tenant-isolation replay validation in the focused unit suite.

## Exclusions

- No migration execution, database access, seed/backfill, deployment, or production action.
- No replacement of the current schema candidate or unrelated worktree changes.
- PostgreSQL integration remains opt-in/skipped.

## Validation

- `prisma format` and `prisma generate`
- Typecheck and focused WCB-06 tests
- Static migration assertions and GGA #7221 review

## Rollback

Do not apply this migration outside a disposable approved DEV database. Before application, rollback is deletion of this unexecuted migration artifact and restoration of the one Prisma uniqueness declaration.
