# Controlled No-Reset Baseline Plan — Return to Fiscal DEV

## Status

**PLAN ONLY — blocked pending approval.** The final external search did not recover either missing migration artifact. This plan does not authorize database creation, schema introspection, dump/restore, generated SQL, migration execution, secret configuration or Fiscal provider work.

## Objective

Treat the current disposable DEV database schema as authoritative without changing its `_prisma_migrations` history, without reset, and without reconstructing either missing historical `migration.sql`. Establish a separately isolated DEV baseline that can receive the fiscal delta safely.

## Closed search result

No raw-byte SHA-256 match was found for either required artifact after searching accessible Git refs, reflogs, unreachable objects, physical project copies, worktrees, temp clones, ZIP/RAR manifests, backups and available GitHub artifacts.

| Missing artifact | Expected DEV SHA-256 |
| --- | --- |
| `20260820190000_receipt_preparation_v1/migration.sql` | `f044745e16341711f17796b9439bf7ff51941c76f669e075f9307ec2ebd2f963` |
| `20260903030000_surgery_visible_number_uniqueness/migration.sql` | `efa3d2e676fdd9f68048024a6fa2538abf18ce84622049fd54228f09064caa2b` |

The two exact artifacts already found remain preserved as evidence only. They are not restored while the pair above remains incomplete.

## Direction

Do **not** repair historical local migration files by inference and do **not** alter the legacy DEV database or its Prisma history. Instead, create a new, named, disposable **fiscal-reconciliation DEV database** whose migration lineage starts from one reviewed baseline generated from the authoritative legacy DEV schema.

This creates a forward-only technical baseline for Fiscal DEV. It does not rewrite history, claim that missing migrations were recovered, or authorize production adoption.

## Controlled sequence

### 1. Freeze and evidence the legacy DEV source — read-only

1. Record database identity, PostgreSQL version, current schema hash, `prisma migrate status` output and a read-only export of `_prisma_migrations`.
2. Capture a schema-only, no-data dump of the legacy DEV database.
3. Introspect into a temporary, isolated Prisma schema using `prisma db pull`; never overwrite the project schema during this step.
4. Compare the schema-only dump with the introspected model and enumerate Prisma-unsupported objects (views, triggers, extensions, policies, generated constructs or raw SQL constraints).
5. Store hashes and reports as reconciliation evidence, never as replacement migration artifacts.

**Gate:** stop if the source is not confirmed disposable DEV, contains real data, or has unsupported objects that cannot be preserved/reapplied with reviewed SQL.

### 2. Construct a reviewable baseline in isolation

1. Build a new isolated reconciliation workspace/branch; do not modify the active project migration directory.
2. Generate a candidate baseline SQL artifact from the isolated introspected schema (for example, Prisma `migrate diff --from-empty --to-schema-datamodel ... --script`).
3. Treat generated SQL as a candidate, not as proof: review it against the legacy schema-only dump and explicitly preserve any Prisma-unsupported objects with separately reviewed SQL.
4. Create a fresh, named disposable fiscal-reconciliation DEV database; this is a new target, not a reset of the legacy DEV database.
5. Apply only the reviewed baseline to that target and verify schema parity object-by-object: tables, columns, types, defaults, indexes, keys, constraints and required unsupported objects.

**Gate:** do not copy or mutate legacy DEV data, `_prisma_migrations`, or local historical migrations. Abort if parity evidence is incomplete.

### 3. Rebase Fiscal DEV onto the verified baseline

1. Recreate the FISCAL-02 schema delta from the verified baseline using the existing approved fiscal specification; preserve the original blocked migration as evidence, not as an applied migration in the new lineage.
2. Generate and review one new fiscal delta migration against the isolated baseline.
3. Apply it only to the fiscal-reconciliation DEV database.
4. Run Prisma validate/generate, focused FISCAL-02 tests, schema parity checks and a smoke query against the new target.
5. Continue to FISCAL-03 only after FISCAL-02 is independently reviewed and the new target is explicitly confirmed as the active disposable DEV integration database.

## Invariants

- Never execute `prisma migrate reset`.
- Never execute `prisma migrate resolve`.
- Never write `_prisma_migrations` directly.
- Never reconstruct a missing historical migration and call it original.
- Never change the legacy DEV database while establishing the baseline.
- Never use real fiscal data, production credentials or production configuration.
- Keep the original legacy migration lineage and all checksum evidence available for future forensic recovery.

## Risks and controls

| Risk | Control |
| --- | --- |
| Prisma introspection omits unsupported PostgreSQL objects | Compare with schema-only dump; preserve every omission explicitly before parity approval. |
| Generated baseline differs subtly from legacy DEV | Require object-by-object parity report before Fiscal delta generation. |
| New baseline hides historical drift | Preserve old migration evidence and label the new lineage as DEV reconciliation baseline, not historical recovery. |
| Fiscal delta accidentally includes unrelated schema changes | Generate delta only from verified baseline to approved FISCAL-02 schema; independent diff review. |
| Legacy DEV is changed by recovery work | Use read-only source access; apply only to a new named disposable target. |

## Required approval before execution

Franco must explicitly approve the controlled baseline route, including creation of a new disposable fiscal-reconciliation DEV database and generation/application of reviewed baseline and fiscal-delta migrations. This is a migration-strategy decision; it is not implied by the previous Fiscal DEV approval.

## Immediate return to Fiscal

Once the isolated target passes parity and the fiscal delta is applied, the next work is exactly FISCAL-02 verification and then FISCAL-03. No provider commercial capability, NC/ND, payments, account current, Auth, Cirugías refactor or unrelated module work enters this route.
