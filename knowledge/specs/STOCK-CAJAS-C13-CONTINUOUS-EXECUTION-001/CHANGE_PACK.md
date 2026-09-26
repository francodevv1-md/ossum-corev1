# Change Pack — Stock/Cajas C13 Continuous Execution

Status: **APPROVED FOR EXECUTION — S18–S24 EXACT SCOPE ONLY**
Change ID: `STOCK-CAJAS-C13-CONTINUOUS-EXECUTION-001`
Risk: **T3 — schema, persistence architecture, multi-company lineage, and local Git provenance**
Language: English

This pack defines one finite autonomous execution envelope: recover the reviewed S18 snapshot and complete C13 sequentially through S24. Preparing this document does not authorize implementation.

## 1. Decision requested

Approve the agent to execute S18–S24 continuously without routine confirmation, but only inside this pack's exact scope, ownership, commands, validations, and stop conditions.

Approval of this pack would authorize:

- one exclusive schema writer at a time;
- local implementation and independent review of S18–S24 in strict sequence;
- local hook-enabled commits for each accepted child using the subjects in §6;
- a repository-visible governance evidence update in each child commit so GGA can evaluate the approval context;
- automatic continuation to the next child after all acceptance gates pass.

Approval would **not** authorize migrations, database access, seed/backfill, provider changes, dependency declaration/version changes, C14 implementation, C15–C32, push, pull request, merge, deployment, or production actions. It authorizes `prisma generate` as the mandatory local quality gate defined in §§7–8, with no accepted repository output outside the allowlist. Franco separately authorized one reproducible isolated-worktree `npm ci` recovery from the unchanged lockfile after the generate blocker; see §13.

## 2. Proven starting state

| Item | Proven state |
| --- | --- |
| Accepted C13 snapshots | S01–S17 committed and independently accepted |
| Accepted predecessor commit | `ab444b61b585a49149994acb4338f44a16996365` |
| Accepted S17 schema blob | `6a2fa2f6c1a6044a2fa3bcc9cfa455719638bb76` |
| S18 schema blob | `4bf945809f476d20ed8303dff30bb6fa1778853a` |
| S18 state | exact schema blob staged, independent DB PASS, commit-authorized under the earlier scope, but uncommitted and review-held after GGA rejection |
| Migration tree | `5c6e4b9e6e4e7fd5a632d3fb68a2dc161f62ad9c`; must remain unchanged |
| Active isolated worktree | `C:\Users\franc\AppData\Local\Temp\opencode\ossum-c13` |

The older 23-snapshot brief is superseded only for numbering by the approved E3 split: current C13 contains S01–S24. Current S18 is F2 dispatch accounting; S19–S24 are the remaining children below.

## 3. Ownership and lock

| Field | Binding value |
| --- | --- |
| Task | `C13 / S18–S24 continuous schema completion` |
| Agent role | Backend/DB schema implementer coordinated under T3 safeguards |
| Selected LLM | `openai/gpt-5.6-sol` |
| Mode | implementation → independent review → local commit → post-commit verification |
| Writer | exactly one active writer |
| Lock | `C13-S18-S24/P:P`; current S18 status `review`; transitioned per later child as `reserved → editing → review → released` |
| Production write path | `prisma/schema.prisma` only |
| Governance evidence path | this `CHANGE_PACK.md` only, limited to the child evidence ledger in §9 |
| Authoritative approval path | root `AGENTS.md`, limited to the active C13 T3 approval record authorized in Engram #4653 |
| Milestone worklog path | `knowledge/worklog/WORKLOG.md`, S24 completion entry only |
| Concurrency | none across S18–S24; independent reviewer is read-only |

No child may reserve its lock until the immediate predecessor is committed, independently accepted, recorded in §9, and released.

## 4. Exact scope

### Allowed repository files

1. `prisma/schema.prisma` — exact child schema delta only.
2. `knowledge/specs/STOCK-CAJAS-C13-CONTINUOUS-EXECUTION-001/CHANGE_PACK.md` — before S18, update only the status and execution-approval record in the header/§13 after Franco's actual approval; during S18–S24, update only the active child evidence row in §9 so the staged review packet contains repository-visible approval context.
3. `AGENTS.md` — add and preserve only the exact active C13 T3 approval record authorized by Franco in Engram #4653; no existing rule may be modified or weakened.
4. `knowledge/worklog/WORKLOG.md` — one C13 completion entry in S24 only, after proving the isolated-worktree path is clean and unowned.

When explicitly approved, this pack is a narrow amendment to the earlier C13 repository allowlist and schema-only commit-tree boundary. It permits governance evidence beside the schema in S18–S24 commits, the authoritative task-specific approval record in root `AGENTS.md`, and the mandatory worklog milestone in S24. It does not expand the production implementation boundary: `prisma/schema.prisma` remains the only production file.

### Read-only context

- `AGENTS.md`.
- `knowledge/KNOWLEDGE_INDEX.md`.
- `knowledge/core/PROJECT_BRIEF.md`.
- `knowledge/core/CANONICAL_DECISIONS.md`.
- `knowledge/domain/STOCK_CAJAS_TRAZABILIDAD.md`.
- accepted Stock/Cajas and Cajas ADRs.
- `prisma/migrations/**`, package manifests, `.gga`, and focused Git history.
- approved Engram plan, manifest, implementation, review, approval, and closure evidence.

### Forbidden files and systems

- `prisma/migrations/**`, `prisma/seed.ts`, generated Prisma artifacts, and database state.
- Auth, permissions, security, provider, environment, API, service, validator, source, UI, shared type, Surgery/Record, Expediente, and business-rule files.
- package manifests, lockfiles, hooks, `.gga`, every part of `AGENTS.md` except the exact §14 approval record authorized in Engram #4653, canonical ADR/domain/core documents, and unrelated dirty files.

## 5. Continuous execution contract

For each child, the agent must:

1. verify the immediate predecessor commit, tree, schema blob, migration tree, clean owned paths, and exclusive lock;
2. run the child-specific static RED assertion against the predecessor;
3. edit only the child-allowed paths from §4;
4. run Prisma format, validate, and generate plus the identical GREEN assertion;
5. prove no future child declaration, migration change, generated artifact, forbidden-path diff, or unrelated staged file exists;
6. obtain an independent read-only Backend/DB PASS against the exact schema blob and staged governance evidence;
7. run GGA through the normal commit hook and never bypass or weaken it;
8. create the authorized local commit only if every gate passes;
9. verify the resulting commit, tree, schema blob, path list, generated-artifact status, and unchanged migration tree;
10. persist the accepted commit/tree/blob and review evidence in Engram, release the child lock, and continue automatically. Repository ledger rows contain only evidence knowable before their own commit; the next child row receives the accepted predecessor commit during its preflight.

A routine successful handoff is not a stop. Diagnose is mandatory before any fix after a failed validation.

## 6. Ordered children and authorized local commit subjects

| Snapshot | Child | Exact declaration boundary | Local commit subject |
| --- | --- | --- | --- |
| S18 | `C13-F2` | Preserve the already reviewed replacement of dispatch-accounting header/line with approved owner-qualified lineage | `feat(db): replace cajas dispatch accounting models` |
| S19 | `C13-F3` | Replace return confirmation, return line, and replacement-pair declarations | `feat(db): replace cajas return accounting models` |
| S20 | `C13-F4` | Replace consumption confirmation and consumption-line declarations | `feat(db): replace cajas consumption accounting models` |
| S21 | `C13-F5` | Replace disposition and condition-projection declarations | `feat(db): replace cajas disposition models` |
| S22 | `C13-G1` | Add the approved C04 existing-target candidate keys and reconcile inverse relations on exactly `Company`, `User`, `Surgery`, `AuditEvent`, and `Remito` | `feat(db): reconcile cajas owner relations` |
| S23 | `C13-G2` | Reconcile inverse relations on exactly `RemitoItem`, `Consumo`, `ConsumoItem`, `Devolucion`, and `DevolucionItem`, then complete the approved supported composite FK/index reconciliation | `feat(db): reconcile cajas inverse relations` |
| S24 | `C13-G3` | Final static inventory/reconciliation; no new domain declaration; structural no-op allowed only with explicit reviewed proof | `chore(db): verify cajas schema reconciliation` |

Each child must remain independently reviewable and at or below 350 changed schema lines. Re-split before editing if the refined forecast exceeds 350 or after formatting if the actual schema delta exceeds 350.

## 7. Allowed and forbidden commands

### Allowed

- read/search operations;
- path-limited `git status`, `git diff`, `git show`, `git log`, `git rev-parse`, and `git hash-object` without `-w`;
- child-specific inline Node static assertions;
- one `npm ci` in the isolated C13 worktree from the existing unchanged `package-lock.json`, authorized only for the S18 dependency-availability recovery recorded in §13;
- `npx prisma format --schema prisma/schema.prisma`;
- `npx prisma validate --schema prisma/schema.prisma`;
- `npx prisma generate --schema prisma/schema.prisma`;
- path-limited `git add` for the child-allowed files only;
- one normal `git commit` per accepted child using the exact subject in §6;
- post-commit read-only Git provenance checks.

### Forbidden

- `--no-verify`, hook removal or mutation, force operations, destructive Git, stash/reset/checkout restoration, amend, rebase, merge, tag, push, or PR;
- `prisma migrate *`, `prisma db *`, seed, database connections, introspection, migration authoring, or accepting generated-client changes outside ignored build/dependency output;
- dependency installation or package/config changes;
- any command affecting files outside the allowlist.

`prisma generate` is a mandatory quality gate, not authorization to retain generated repository changes. If it changes a tracked or non-ignored path outside the allowlist, stop and escalate; C13 still makes no database-readiness claim.

## 8. Validation and acceptance gates

Every child requires all of the following:

- predecessor commit/tree/schema blob match the accepted ledger;
- static RED fails for the intended missing child delta only;
- Prisma format and validate pass;
- Prisma generate passes without a tracked or non-ignored repository diff;
- static GREEN passes using the exact RED assertion;
- `git diff --check` passes on allowed files;
- schema changed-line count is at or below 350;
- migration tree is unchanged;
- no generated artifact or forbidden path changed;
- independent Backend/DB review returns PASS without fixing;
- GGA hook passes without bypass;
- post-commit commit/tree/schema/path evidence matches the reviewed staged content;
- Engram manifest/progress records are synchronized after acceptance.

S24 additionally requires an exact final declaration, relation, key, index, replacement/removal, and no-future-object inventory against the approved C13 contract.

## 9. Repository-visible child evidence ledger

Before execution starts, §13 must be updated from `pending` to the exact approval evidence actually provided by Franco. Only the active child row may then be updated during that child. Unknown hashes must remain `pending`; they must never be predicted. A row never contains the hash of the commit that contains that same row; accepted commit/tree provenance is stored in Engram and copied only into the next child's predecessor field.

| Snapshot | Predecessor commit | Target schema blob | Pre-commit review evidence | Status |
| --- | --- | --- | --- | --- |
| S18 | `ab444b61b585a49149994acb4338f44a16996365` | `4bf945809f476d20ed8303dff30bb6fa1778853a` | Engram #4636 PASS; execution #4647; environment #4649; whitespace #4651; AGENTS record #4653 | review-held |
| S19 | pending | pending | pending | blocked by S18 |
| S20 | pending | pending | pending | blocked by S19 |
| S21 | pending | pending | pending | blocked by S20 |
| S22 | pending | pending | pending | blocked by S21 |
| S23 | pending | pending | pending | blocked by S22 |
| S24 | pending | pending | pending | blocked by S23 |

## 10. Hard stops

Stop and ask one precise question if:

- this Change Pack has not received Franco's explicit execution approval;
- the S18 staged schema blob differs from `4bf945809f476d20ed8303dff30bb6fa1778853a`;
- predecessor or migration provenance differs from §2 or the accepted ledger;
- another writer or unexplained modification overlaps any child-allowed file;
- a child requires a file, declaration, rule, command, or changed-line budget outside this pack;
- Prisma, static assertions, independent review, or GGA fails and Diagnose cannot prove a minimal in-scope correction;
- a migration, DB/generated-client action, architecture/business-rule revision, destructive action, or publication is needed;
- canonical sources conflict and the authority order cannot resolve them.

Do not retry an unchanged failure indefinitely. Preserve the exact scoped evidence and lock state when stopping.

## 11. Rollback boundary

Rollback is child-local and may touch only that child's allowed paths before commit. Never restore, reset, stash, or overwrite unrelated work. An accepted committed predecessor is immutable for this execution chain; correcting an accepted child requires a new separately approved recovery task.

## 12. Completion boundary

This pack completes only when S18–S24 are independently accepted, locally committed, recorded in the C13 manifest, the S24 worklog milestone is recorded, and all locks are released.

Completion of C13 authorizes no migration or downstream implementation. The next safe action is a separate documentary C14 numbering/topology amendment and independent review. C14 migration authoring remains blocked pending a new exact Change Pack and Franco approval.

## 13. Approval record

Preparation approval: Franco approved preparation of this Change Pack in chat on 2026-08-02; Engram #4644.
Execution approval: **APPROVED on 2026-08-02**. Franco replied `confirmo` to the exact §13 approval request in chat; Engram #4647 records the binding scope and exclusions.

Environment recovery approval: **APPROVED on 2026-08-03**. Franco replied `autorizo` to the exact request to run `npm ci` in the isolated worktree from the existing `package-lock.json`, without modifying package manifests or the lockfile; Engram #4649.

Authoritative approval-record amendment: **APPROVED on 2026-08-03**. Franco replied `AUTORIZO` to adding a narrowly scoped C13 T3 approval record to root `AGENTS.md` and adding that file to this pack's allowlist so GGA can verify the approval; Engram #4653. This amendment may not modify or weaken any existing rule.

Before any further S18 action, including copying this pack into the isolated worktree, staging governance evidence, retrying GGA, or committing, the coordinator must verify that the dated approvals and Engram IDs above remain exact. The existing staged schema blob and review-held lock predate this pack and must remain unchanged until the authoritative approval packet is staged. The approved records must be present in the staged Change Pack and root `AGENTS.md` §14 so GGA receives the authorization context. No agent may manufacture or alter this evidence.

The exact approval requested is:

> I approve `STOCK-CAJAS-C13-CONTINUOUS-EXECUTION-001` exactly as written. Execute S18–S24 continuously, including the local hook-enabled commits and mandatory quality gates listed in §§6–8, and stop at every condition in §10. This approval does not include migrations, database actions, retained generated artifacts outside the allowlist, C14+, push, PR, deployment, or production.
