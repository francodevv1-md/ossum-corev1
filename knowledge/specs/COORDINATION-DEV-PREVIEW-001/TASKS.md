# TASKS — COORDINATION-DEV-PREVIEW-001

Status: reconciled after completed T0 and Franco's explicit Districorr DEV data/configuration approval; ready for strictly serialized APPLY beginning with T-3 local server configuration  
Change: `COORDINATION-DEV-PREVIEW-001`  
Language: English; executor handoffs and visible UI copy are Spanish  
Based on: `PROPOSAL.md` → amended `DESIGN.md` → amended `SPEC.md`

---

## 1. Execution contract

### 1.1 Mandatory order

Execute **T-3 → T-2 → T-1 → T0 → T1 → T2 → T3 → T4 → T5 → T6**. T-3 first resolves the one exact active Districorr DEV company through a database-enforced read-only query and configures the three approved server-only values in the gitignored local server environment. T-2 consumes that configuration and captures the immutable external DEV baseline under a database-enforced read-only transaction. T-1 is the newly approved, bounded DEV bootstrap and must consume that baseline. T0 is then rerun as the read-only post-bootstrap and ownership gate. The original T-2–T6 tasks otherwise remain serialized after the configuration gate. No implementation writer may run in parallel, and no task starts until its predecessor passes and releases or explicitly transfers every shared lock.

The order is security-significant:

1. resolve exactly one active `Districorr DEV` company under active organization `ossum-dev` through a DB-enforced read-only query and configure only the approved server-only values in `.env.local` without disclosure;
2. capture, without database or repository mutation, the exact company identity/markers and exact sorted 21-active-surgery-ID set in a restricted external baseline with an integrity checksum;
3. create or reuse only the two approved coordinator contacts and converge that exact Districorr DEV baseline to `8 / 8 / 5` atomically;
4. rerun T0 to prove the committed DEV state, current-tree ownership, resolved assignment semantics, and feasibility of a closed preview-only presentation graph;
5. preserve assignments through the company-scoped read select, DTO, adapter, and client shape;
6. establish trustworthy backend loading, hydration, and UI states;
7. add strict personal resolution and the exact server-only, GET-only Coordination view boundary;
8. render production Coordination plus a separate mutation-free preview presentation graph;
9. independently verify security, production isolation, and regressions; and
10. perform authenticated desktop/mobile browser QA.

No later task may hide, repair, or compensate for a failed earlier gate.

### 1.2 Global prohibitions and the sole write exception

Every task forbids:

- schema changes, migrations, Prisma push/reset/seed, fixtures, generalized imports/backfills/repairs, or data normalization;
- dependency, package-manifest, lockfile, build-configuration, provider, or Auth-provider changes;
- Auth impersonation, token substitution, synthetic login, actor switching, role redesign, or audit-actor replacement;
- assignment-write feature changes or changes to bucket, subgroup, SLA, availability, incident, next-action, CX, preparation, logistics, or global-panel business semantics;
- a production personal-inbox selector, subject query override, browser-storage override, default coordinator, first-match rule, or `Nelson` fallback;
- preview authority derived from `NODE_ENV`, `NEXT_PUBLIC_*`, browser state, client role checks, hidden controls, URL visibility, or a client-supplied company ID;
- persisted preview state or any mutation capability in the rendered preview graph; and
- formatting, reverting, staging, committing, cleaning, or reconciling unrelated dirty work.

The sole data-write exception is T-1. T-3 is database read-only and its sole filesystem-write exception is the repository-root `.env.local`, which must already be proven untracked and ignored; it may preserve existing content and add only the three approved server-only entries. T-2 is strictly database read-only and may write only its restricted temporary baseline outside the repository. T-1 may create only the exact two DEV contacts, their two exact-company coordinator links, and sixteen canonical coordinator assignments in the exact configured Districorr DEV company, inside one transaction and only after every specified precondition passes. No other task may write data. The Coordination preview API and presentation graph are GET-only.

### 1.3 Dirty-tree and lock protocol

The source tree is already heavily modified, including sensitive files in the service → adapter → store → Coordination chain. Dirty does not imply ownership.

Before each task:

1. publish its full task declaration from this artifact;
2. record `git status --short --untracked-files=all` and a path-limited diff for every owned path;
3. identify the provenance of every pre-existing modification or untracked allowlist path;
4. obtain explicit owner release/handoff or stop; never overwrite or absorb unknown work;
5. move the lock through `reserved → editing → review → released` (`read-only` tasks omit `editing`);
6. preserve baseline hashes outside the repository in the approved orchestration record; create no repo lock/evidence file; and
7. compare only task-owned deltas against that baseline and report unrelated pre-existing changes separately.

An active overlap, unknown dirty provenance, changed baseline after reservation, or need to edit an unlisted path is an immediate stop. Locks transfer only after validation and acceptance of the Spanish Caveman handoff.

### 1.4 Lock register

| Lock | Holder | Exact ownership | Initial state |
| --- | --- | --- | --- |
| `CDP-LC` | T-3 | Read-only exact-company resolution and the repository-root gitignored `.env.local` configuration mutation | planned |
| `CDP-LB0` | T-2 | Exact-company read-only DB snapshot and restricted external baseline until verified custody transfer | planned |
| `CDP-LB` | T-1 | Dedicated DEV bootstrap service/runner/test, transferred external baseline custody/cleanup, and the approved exact-company transactional write | planned |
| `CDP-L0` | T0 | Read-only post-bootstrap/current-tree evidence in the external orchestration record | planned |
| `CDP-L1` | T1 | Surgery read select/DTO, assignment resolver, shared adapter/client assignment shape, focused tests | planned |
| `CDP-L2` | T2 | Backend Coordination loading controller, store hydration boundary, UI state model, focused tests | planned |
| `CDP-L3` | T3 | Personal resolver, preview capability/view service, validator, GET-only route/client, security tests | planned |
| `CDP-L4` | T4 | Production Coordination UI plus isolated preview-only presentation graph and focused tests | planned |
| `CDP-L5` | T5 | Independent read-only verification | planned |
| `CDP-L6` | T6 | Authenticated read-only browser QA | planned |

`prisma/schema.prisma`, `src/lib/db.ts`, `src/lib/services/surgery.service.ts`, `src/lib/api/surgery-adapter.ts`, `src/types/index.ts`, `src/lib/store.ts`, `src/hooks/useBackendActiveSurgeries.ts`, `src/lib/api/backend-surgeries.ts`, `src/components/coordinadores/CoordinatorInboxView.tsx`, `src/app/coordinadores/page.tsx`, and all Auth/guard/API paths are sensitive. T-1 may read but never edit `prisma/schema.prisma` or `src/lib/db.ts`. Sensitive files may never have concurrent writers.

### 1.5 Resolved normative contracts

The former DESIGN/SPEC assignment discrepancy is resolved and is not a T0 decision:

- form the complete union of every eligible relational coordinator assignment `contactId` and every non-empty existing legacy flat coordinator contact ID;
- discard empty values and deduplicate exact-equal contact IDs before cardinality;
- zero unique IDs is `none`/unassigned, one is `resolved(contactId)`, and more than one is `ambiguous`;
- `isPrimary` may affect stable diagnostic serialization only; it never removes a candidate, establishes source precedence, or selects among distinct IDs; and
- labels, array order, first row, relational precedence, legacy precedence, and local state never determine ownership.

The exact server-only company gate is also frozen. `OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID` must be non-empty and must exactly equal the operation/request company ID, authenticated `ctx.companyId` when a request context exists, and loaded database `Company.id`. The loaded company must additionally be active, named exactly `Districorr DEV`, and belong to the active organization with slug exactly `ossum-dev`. Name and slug are markers, never substitutes for exact configured ID equality. The configured ID is never client input or client-visible authority.

The old incomplete mutation-route manifest/marker strategy is removed. No task may add a preview marker to selected mutation routes or claim safety from a partial route inventory. Preview safety is implemented and verified through a private GET-only data boundary plus a dedicated preview presentation graph with no mutation-capable descendant, callback, client, dialog, workspace, link, or navigation target.

### 1.6 Validation and failure handling

- Use only commands explicitly allowed by the active task.
- Except for the exact T-1 runner, do not execute any database-write command.
- Never run `npm install`, dependency upgrades, Prisma generation, migration/push/reset/seed, cleanup/import/delete/backfill scripts, Git-write commands, or production commands.
- Any failed test, typecheck, build, server start, or browser flow requires Diagnose: Reproduce / Scope / Evidence / Hypothesis / Minimal Fix / Validate / Regression Check / Handoff.
- QA tasks report failures to the owning writer and do not fix source.
- Every task output is a Spanish Caveman handoff: `Done / Changed / Files / Validations / Risks / Next`.

---

## 2. T-3 — Resolve exact DEV target and configure local server environment

### Task declaration

- **Task ID / Name:** `COORDINATION-DEV-PREVIEW-001-T-3 / Exact DEV local server configuration`
- **Agent role:** Backend/DB configuration operator
- **Selected model:** `openai/gpt-5.6-sol`
- **Mode:** `read-only DB resolution plus one restricted local configuration write`
- **Depends on:** Franco's explicit approval of the server-only flags and exact Districorr DEV targeting; no DB writer, environment writer, T-2 capture process, or application server active
- **Scope:** resolve exactly one active company named exactly `Districorr DEV` under the one active organization whose slug is exactly `ossum-dev`, using one database-enforced read-only transaction, then configure the approved values in the repository-root gitignored `.env.local` without exposing any resolved or pre-existing value.
- **Allowed file/target:** read the minimum company/organization identity fields from the already configured DEV database; create or modify only repository-root `.env.local`, and only after Git proves that exact path is ignored and untracked.
- **Forbidden files/targets:** every other repository or temporary path, including `.gitignore`, `.env`, `.env.development`, `.env.development.local`, `.env.example`, source, tests, schema, migration, seed, package, lock, evidence, backup, runner, transcript, and worklog files; every DB write/DDL/session side effect; every non-target domain row.
- **Output:** non-disclosing pass/fail attestation and Spanish Caveman handoff. Never print, log, diff, echo, paste, return, or otherwise disclose the resolved company ID, connection values, existing environment entries, or file contents.
- **Expected handoff:** confirmation that exact-one resolution, DB read-only enforcement, ignore/untracked gates, value-shape verification, preservation, no-disclosure checks, and zero tracked/DB mutation passed; release `CDP-LC` before T-2 starts.

### Exact resolution and write contract

Lock `CDP-LC` exclusively owns the minimal DB read scope and `.env.local` from preflight through verification. It moves `reserved → editing → review → released`; no T-2 process, app/dev server, or other environment reader/writer may overlap because server environment is process-start configuration.

1. Start with shell tracing, transcripts, Prisma query logging, and debug logging disabled. Capture the initial existence state and exact bytes of `.env.local` only in process memory; never emit them and never write a backup, temp, evidence, or runner file.
2. Prove with Git that `.env.local` is matched by the repository's effective ignore rules and is not tracked, staged, force-added, symlinked, or a reparse point. A missing file is allowed; an existing regular ignored file is allowed. Any other condition is a hard stop before DB access or filesystem mutation.
3. Load the already configured DEV database connection through the project's normal server environment loading without printing effective variables. Open one PostgreSQL `REPEATABLE READ, READ ONLY` transaction before the company query and prove `transaction_read_only = on`; unsupported or unprovable database-level read-only enforcement is a hard stop.
4. Query only the minimum company and organization identity/active fields needed to select `Company.name === "Districorr DEV"`, `Company.isActive === true`, active organization, and `Organization.slug === "ossum-dev"`. Require exactly one matching company and one non-empty company ID. Zero or multiple matching companies, duplicate organization matches, inactive markers, or malformed/empty ID fail closed. Never select a first row and never print the candidate count or any value beyond a pass/fail label.
5. In the same non-logging process, keep the resolved ID only in memory and prepare exactly these server-only entries: `OSSUM_DEPLOYMENT_TIER=development`, `OSSUM_ENABLE_COORDINATOR_PREVIEW=true`, and `OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID=<resolved exact id>`. No `NEXT_PUBLIC_*` mirror or client-visible copy is permitted.
6. Parse `.env.local` without expanding, normalizing, sorting, or reserializing unrelated entries. Preserve every pre-existing byte, comment, blank line, key, value, ordering, newline convention, and final-newline state except the minimum insertion of missing approved entries. If any of the three keys already appears more than once, uses an unsupported multiline form, or has a different value, stop without changing the file; an existing exact single entry is retained byte-for-byte. Add only missing entries, once each.
7. Perform at most one direct write to `.env.local`; create no same-directory temporary or backup file. Immediately re-read it without display and prove all original bytes/entries remain intact, each approved key occurs exactly once, the tier and flag equal the exact literals above, and the company ID equals the in-memory resolved ID. Clear in-memory buffers and disconnect after verification.
8. On any failure before the write, leave the file untouched. On any failure during or after the write, restore the original in-memory bytes directly, or delete `.env.local` if it did not previously exist; verify restoration/absence without output, clear buffers, disconnect, retain the lock, and stop. If rollback cannot be proven, do not run T-2 and escalate for manual security handling.
9. On success, retain `.env.local` for T-2 and later local server execution; cleanup consists only of clearing in-memory resolved/file values, closing the read-only transaction/client, and proving no auxiliary artifact, transcript, or log was created. A later authorized rollback removes only entries added by this task, or restores only exact pre-task values retained by an approved secure operator record; it must never rewrite unrelated entries.

### Allowed commands and validation gates

```powershell
git status --short --untracked-files=all -- .env.local knowledge/specs/COORDINATION-DEV-PREVIEW-001/TASKS.md
git check-ignore -q -- .env.local
git ls-files --error-unmatch -- .env.local  # expected non-zero: the path must not be tracked
git diff --cached --quiet -- .env.local
npx tsx -e "<approved inline non-logging T-3 runner: enforce DB read-only exact-one query and update only .env.local without output>"
git check-ignore -q -- .env.local
git status --short --untracked-files=all -- .env.local
git diff --quiet -- .env.local
git diff --cached --quiet -- .env.local
git diff --check -- knowledge/specs/COORDINATION-DEV-PREVIEW-001/TASKS.md
git diff -- knowledge/specs/COORDINATION-DEV-PREVIEW-001/TASKS.md
```

The `npx tsx -e` body must be reviewed before invocation, supplied inline without secret interpolation, and implement the complete contract above in one process. It may import only the already installed environment loader/Prisma/Node standard-library facilities, must configure Prisma with no logs, and must emit only a fixed success token or a fixed redacted failure code. It must not receive or return the company ID through arguments, stdin, stdout/stderr, shell variables, command substitution, clipboard, or an auxiliary file.

Before release, validate without displaying `.env.local` or effective environment values:

- exactly one active exact-name company under the exact active organization slug was resolved in a DB-enforced read-only repeatable-read transaction; zero/multiple matches were tested fail-closed by runner control flow;
- `.env.local` is a regular non-link repository-root file, remains ignored, is absent from tracked/staged/status output, and produces no tracked or staged diff;
- all pre-existing environment bytes/entries remain unchanged and no unrelated key was added, removed, reordered, normalized, expanded, or disclosed;
- the three approved keys each occur exactly once and match the exact approved literals/in-memory resolved ID, without printing any value;
- DB before/after metadata proves zero writes, DDL, sequence changes, or non-target reads/effects;
- process output and retained artifacts contain no ID, DSN, credential, token, environment content, query payload, or secret; and
- failure-injection evidence proves pre-write no-op plus exact restore/delete rollback after a simulated post-write failure, with no auxiliary file.

### Lock lifecycle and stop conditions

`CDP-LC: reserved → editing → review → released` only after every non-disclosing validation passes. Release is the explicit handoff that permits T-2 to start a fresh process and consume the three `.env.local` values. The environment file itself is not a lock/evidence artifact and remains local and ignored.

Stop before mutation for an active overlapping process, dirty/unknown `.env.local` ownership, ineffective ignore rule, tracked/staged/force-added path, link/reparse point, unavailable normal DEV connection, inability to enforce DB read-only mode, zero/multiple exact active matches, malformed/empty resolved ID, conflicting/duplicate target key, multiline ambiguity, required write outside `.env.local`, logging/output exposure, or inability to preserve exact unrelated content. Stop and roll back for any verification, no-diff, no-secret, or DB-zero-write failure. Never weaken exact-one matching, read-only enforcement, ignore/untracked checks, preservation, or non-disclosure to proceed.

---

## 3. T-2 — Restricted external Districorr DEV baseline capture

### Task declaration

- **Task ID / Name:** `COORDINATION-DEV-PREVIEW-001-T-2 / Restricted exact DEV baseline capture`
- **Agent role:** Backend/DB read-only evidence operator
- **Selected model:** `openai/gpt-5.6-sol`
- **Mode:** `read-only DB validation/evidence capture`
- **Depends on:** T-3 passed and `CDP-LC` released; Franco's explicit 2026-07-16 DEV-data approval; no DB writer or T-1 source writer active
- **Scope:** in one database-enforced read-only transaction against the exact configured Districorr DEV company, capture the exact lexically sorted set of 21 active, non-archived surgery IDs together with exact company/organization identity markers and a SHA-256 integrity checksum in the single approved external temporary file.
- **Allowed target:** read only the exact configured Districorr DEV company, its organization markers, and its active non-archived surgery IDs; write only `C:\Users\franc\AppData\Local\Temp\opencode\coordination-dev-preview\coordination-dev-preview-baseline.json` and only under the restrictive handling contract below.
- **Forbidden files/targets:** every repository path, every other temporary path, every DB row outside the exact target, and every DB create/update/delete/upsert/DDL/session-side-effect operation; no env, schema, migration, seed, package, source, test, worklog, lockfile, or evidence-file change in the repository.
- **Output:** non-disclosing pass/fail attestation and Spanish Caveman handoff; the baseline contents, surgery IDs, company/organization IDs, and checksum value must never be printed, copied into repository artifacts, attached, pasted, logged, or returned to the user.
- **Expected handoff:** confirmation of read-only transaction enforcement, exact marker/count/sort/checksum validation, restrictive file custody transfer to T-1, zero DB/repo mutation, and go/stop for T-1 without disclosing baseline values.

### Exact capture and restrictive handling contract

Lock `CDP-LB0` exclusively owns the exact DB read scope, temporary directory, and baseline file until T-1 reserves `CDP-LB` and explicitly accepts custody. No other task/process may read, copy, move, upload, index, back up, synchronize, log, or retain the file.

1. Load and consume the T-3 local server configuration in a fresh process. Require `OSSUM_DEPLOYMENT_TIER === "development"`, `OSSUM_ENABLE_COORDINATOR_PREVIEW === "true"`, and a non-empty server-only `OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID`; do not accept any of these values from CLI arguments, stdin, browser state, client-visible variables, or output parsing.
2. Connect only through the already configured DEV database connection. Begin one PostgreSQL `REPEATABLE READ, READ ONLY` transaction before domain queries and prove `transaction_read_only = on`; unsupported or unprovable database-level read-only enforcement is a hard stop.
3. Load exactly one company by exact configured ID and prove `Company.id` exact equality, `Company.isActive === true`, name exactly `Districorr DEV`, active organization identity, and organization slug exactly `ossum-dev`. Names/slugs are markers, never substitutes for configured-ID equality.
4. In the same snapshot, select only IDs for active, non-archived surgeries belonging to that exact company, sort by exact ID lexical order, and require exactly 21 distinct non-empty IDs. Count-only evidence is insufficient.
5. Build a minimal canonical payload with fixed property order and only: format version, company `{ id, name, isActive }`, organization `{ id, slug, isActive }`, and `activeSurgeryIds`. Include no connection string, credentials, token, user/contact/patient/clinical data, labels, dates, or assignment state.
6. Compute lowercase SHA-256 over the UTF-8 bytes of that canonical payload and prepare a single JSON envelope containing the payload and checksum only in process memory. Do not write it until the protected-directory and ACL gate in step 7 passes. After atomic file creation, re-read the file, recompute the checksum, and prove byte/canonical equivalence, exact lexical ordering, distinctness, and count `21` without emitting any value.
7. Before any payload, baseline, or auxiliary-runner write, atomically create the exact dedicated directory `C:\Users\franc\AppData\Local\Temp\opencode\coordination-dev-preview\` with an explicit protected Windows DACL supplied at creation time: ACL inheritance disabled and access granted only to the current Windows process-token user and `SYSTEM`. Refuse a pre-existing dedicated directory or baseline path. The enclosing `opencode` directory may have permissive ACLs and must never be treated as custody evidence; prove only that the canonical dedicated path remains beneath the approved root and that no traversed component is a symlink/reparse point. Immediately read back and validate the dedicated directory ACL before writing any content: no inherited ACE, no other principal, and no grant beyond the current user plus `SYSTEM`. Only after that gate passes, create the baseline through a same-directory exclusive temporary name carrying the same protected DACL, validate its ACL, atomically rename it to the exact baseline filename, and validate the final path/type/ACL before acceptance.
8. Disable transcript/debug/query logging for the capture; never place baseline contents in command history, process arguments, stdout/stderr, test output, shell variables echoed by the shell, clipboard, or user-visible evidence. Any auxiliary runner may exist only in the same restricted temporary directory, must contain no captured values, and must be securely cleaned before handoff.
9. Commit/close the read-only transaction only after the external file verifies. T-2 never deletes the accepted baseline; it transfers the still-protected dedicated directory and baseline directly to T-1. On any failure before transfer, best-effort overwrite and flush every partial/final baseline or captured-value artifact, delete every file created inside the dedicated directory, delete the dedicated directory itself regardless of whether cleanup first finds it non-empty, verify the exact directory path is absent, and stop. Failure to remove or prove absence of the dedicated directory is a security failure.

### Allowed commands and validation gates

```powershell
git status --short --untracked-files=all
git diff -- knowledge/specs/COORDINATION-DEV-PREVIEW-001/TASKS.md
```

The DB capture itself must use an approved non-logging ephemeral runner under the exact restricted temporary directory and the repository's already installed Prisma/`tsx` toolchain without creating or modifying a repository file. Its invocation must disclose no IDs, checksum, credentials, or baseline content. Before custody transfer, validate all of the following without user-visible values:

- the DB reports a read-only transaction and all reads share one repeatable-read snapshot;
- exact configured company ID, exact active `Districorr DEV` marker, and exact active `ossum-dev` organization marker pass;
- the payload contains exactly 21 distinct, non-empty, lexically sorted active/non-archived exact-company surgery IDs;
- the stored SHA-256 matches a fresh canonical recomputation;
- the dedicated directory was atomically created with inheritance disabled before any content write, its ACL was validated first, and neither its custody nor acceptance relies on the enclosing parent's ACL;
- the final file is the only retained artifact inside that directory, is at the exact external path, is not a link/reparse point, and both file and directory grant access only to the current Windows user and `SYSTEM`, with no inherited ACEs;
- repository status and the path-limited TASKS diff are unchanged by execution; and
- database before/after transaction metadata proves zero writes, DDL, sequence changes, or non-target effects.

### Lock lifecycle and stop conditions

`CDP-LB0: reserved → review → released` only after T-1 reserves `CDP-LB`, independently verifies file path/type/ACL/envelope/checksum without disclosure, and accepts custody. There is no repository `editing` state.

Stop and remove the exact dedicated directory for a non-DEV tier, missing/wrong configured ID, marker mismatch, inactive company/organization, inability to enforce/read back DB read-only mode, any non-target or mutable query, any count other than exactly 21, duplicate/empty/unsorted IDs, checksum/canonicalization mismatch, pre-existing dedicated path/file, non-atomic protected-directory creation, permissive/unverifiable/inherited ACL, any principal other than the current Windows user or `SYSTEM`, symlink/reparse point, logging/output exposure, active DB/source writer, repository delta, or inability to prove zero DB/repo mutation. A permissive enclosing parent is not itself a failure and is never custody evidence. Never weaken the transaction, dedicated-directory ACL, exact-ID gate, cleanup, or evidence suppression to proceed.

---

## 4. T-1 — Exact transactional Districorr DEV bootstrap

### Task declaration

- **Task ID / Name:** `COORDINATION-DEV-PREVIEW-001-T-1 / Exact Districorr DEV coordinator bootstrap`
- **Agent role:** Backend/DB bootstrap implementer and approved DEV operator
- **Selected model:** `openai/gpt-5.6-sol`
- **Mode:** `implementation/testing`, followed by one approved DEV convergence invocation; no second live invocation after baseline cleanup
- **Depends on:** T-2 passed; `CDP-LB0` custody transferred to reserved `CDP-LB`; Franco's explicit 2026-07-16 DEV-data approval; no source writer active
- **Scope:** implement, test, and run one setup-only operation that atomically creates or reuses `Nelson DEV` and `Ezequiel DEV`, assigns exactly `8 / 8`, leaves exactly `5` unassigned, and rolls back on every mismatch.
- **Allowed files/target:** only the exact source/test allowlist below plus the exact configured Districorr DEV database records authorized here.
- **Forbidden files/targets:** every other file and every other database record/company; especially schema, migrations, seeds, packages, env files, production data, Auth, users/accesses, company/organization rows, surgery fields, and generalized data tooling.
- **Output:** code/tests, redacted transactional execution evidence, and Spanish Caveman handoff.
- **Expected handoff:** first-run or exact no-op result, post-transaction `2 / 8 / 8 / 5` proof, exact 21-ID-set proof, verified baseline cleanup, zero foreign/production effects, and go/stop for rerun T0.

### Exact allowlist and lock

Create only after baseline/provenance confirms each path is absent:

- `src/lib/services/coordination-dev-bootstrap.service.ts`
- `scripts/dev/bootstrap-coordination-preview.ts`
- `src/__tests__/unit/coordination-dev-bootstrap.service.test.ts`

The runner is setup-only, server-side, not imported by application startup, routes, UI, or production code. It receives no client arguments. It reads server-only environment values and calls the dedicated service. Lock `CDP-LB` owns all three paths, the transferred external baseline from acceptance through verified cleanup, and the one approved transactional DEV execution.

### Exact preconditions and transaction contract

Before opening any write-capable transaction, T-1 must accept T-2's non-disclosing attestation that the directory was protected before payload creation and accept custody of the exact dedicated directory and baseline without moving, copying, recreating, re-ACLing, relaxing, or inheriting access. It must independently prove that the directory and file are the exact canonical non-link/non-reparse paths and that both current DACLs have inheritance disabled and grant access only to the current Windows process-token user plus `SYSTEM`; the enclosing parent's ACL is irrelevant and never custody evidence. It must then load the baseline only from that protected path, validate its minimal envelope/schema, recompute and constant-time compare its SHA-256 checksum, and validate exact company/organization markers, exactly 21 distinct non-empty lexically sorted IDs, and no extra fields or sensitive content. It must never print or copy any baseline value. Any custody or payload failure must securely remove all contents and the exact dedicated directory, verify directory absence, and stop before mutation. Then, before any create operation, the same database transaction must prove:

1. `OSSUM_DEPLOYMENT_TIER === "development"`;
2. server-only `OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID` is present and is the sole accepted company ID;
3. the loaded `Company.id` equals that configured ID exactly, is active, is named exactly `Districorr DEV`, and belongs to the active organization whose slug is exactly `ossum-dev`;
4. the sorted set of active, non-archived surgery IDs for that company equals, element-for-element and in canonical lexical order, the exact sorted 21-ID baseline captured by T-2; count-only, subset, reordered, or checksum-only equality is insufficient;
5. the initial state is either the exact empty approved baseline or the exact final bootstrap state—partial, duplicate, conflicting, extra-coordinator, extra-assignment, wrong-role, wrong-link, foreign-link, or repartitioned state is a mismatch; and
6. every selected/read/write record is constrained to the exact company and approved 21 surgery IDs.

Inside one Prisma interactive transaction:

- identify the two bootstrap contacts only by fixed exact keys `legalName === "Nelson DEV"` and `legalName === "Ezequiel DEV"`, `isCompany === false`, and their exact-company link; fuzzy/case-folded/name-fragment/first-match lookup is forbidden;
- on the empty baseline, create exactly those two active contacts with no invented email, phone, document, Auth relation, or cross-company link, plus exactly one active exact-company link per contact with role exactly `coordinator`;
- use only the already validated baseline array, preserving its canonical lexical order, and assign positions `1–8` to `Nelson DEV`, `9–16` to `Ezequiel DEV`, and `17–21` to no coordinator; never rederive the partition from dates, labels, statuses, patients, database/insertion order, current assignments, or randomness;
- create exactly sixteen `SurgeryContactAssignment` rows with role exactly `coordinator`; `isPrimary` may be `true` for each sole assignment but has no resolution authority;
- never update/delete/adopt/reassign existing mismatching data and never create a generalized seed or repair mode; and
- after writes and before commit, re-read the exact target set and prove exactly two eligible contacts, two exact-company links, sixteen canonical relational assignments, disjoint `8 / 8`, five surgeries with no relational or legacy coordinator candidate, and zero out-of-company effects.

Idempotency means state convergence. If the single approved invocation begins in the exact final state, it returns typed success/no-op and performs no create/update/delete/reassignment. Automated tests must prove the same no-op contract for a hypothetical exact rerun, but a committed first run may not be invoked again because its baseline is immediately destroyed. Any precondition, intermediate, postcondition, count, ID-set, mapping, role, duplicate, or simulated exception throws inside the transaction and rolls back all contacts, links, and assignments from that run. T-1 must preserve the transferred protected custody unchanged throughout validation and execution. In an outer `finally` that runs after either confirmed commit/no-op or confirmed abort/rollback, T-1 must best-effort overwrite and flush the baseline, delete every baseline/temporary/auxiliary artifact inside the dedicated directory, delete the exact dedicated directory itself, and verify that the directory path is absent. Cleanup is mandatory even for a pre-transaction custody/payload failure. Cleanup failure is a failed T-1 gate and forbids retry or T0 progression; no baseline value may enter cleanup logs.

### Allowed commands and validation gates

```powershell
git status --short --untracked-files=all
git diff -- src/lib/services/coordination-dev-bootstrap.service.ts scripts/dev/bootstrap-coordination-preview.ts src/__tests__/unit/coordination-dev-bootstrap.service.test.ts
npx vitest run src/__tests__/unit/coordination-dev-bootstrap.service.test.ts
npm run typecheck
git diff --check -- src/lib/services/coordination-dev-bootstrap.service.ts scripts/dev/bootstrap-coordination-preview.ts src/__tests__/unit/coordination-dev-bootstrap.service.test.ts
$runnerPath = "C:\Users\franc\AppData\Local\Temp\opencode\coordination-dev-preview\t1-runner.ts"
npx tsx "$runnerPath"
```

The live runner must be an ephemeral `.ts` file created only after T-1 accepts custody and revalidates the protected dedicated directory and file ACLs. It must have the same protected DACL, contain no captured value, and use no top-level `await`. Its executable structure must be `async function main() { ... }` followed by `void main().catch(...)`; `main()` must retain the outer mandatory cleanup path for commit, no-op, abort, pre-transaction failure, and loader/runtime failure, while the catch handler emits only a fixed redacted failure code and sets a failing exit status. Because the runner lives outside the repository, every bare package it uses must be resolved and loaded through `createRequire` anchored to the repository package boundary, for example `const requireFromRepo = createRequire(path.join(repoRoot, "package.json"))`; current working directory, `NODE_PATH`, tsconfig aliases, or the temporary file's location are not accepted as package-resolution authority.

Before any environment/baseline read, database-client construction, or DB use, prevalidate this exact loader pattern with an inert ephemeral `.ts` probe under the same protected directory and DACL. The probe may load only the required already-installed package entry points through the repository-anchored `createRequire`, must use the same `async function main()` plus `void main().catch(...)` lifecycle, must perform no environment, baseline, Prisma-client construction, network, or database operation, and may emit only a fixed pass token or fixed redacted failure code. Invoke both the inert probe and, after the probe is securely overwritten/deleted and absence is verified, the one approved live runner canonically as `npx tsx "$runnerPath"`. `tsx -e`, `npx tsx -e`, inline evaluation, top-level await, and alternate `tsx` argument transports are forbidden. A loader-probe failure triggers the existing mandatory secure cleanup and stops before DB use.

The live `npx tsx "$runnerPath"` command may run exactly once for the approved convergence action after the inert loader prevalidation, tests/typecheck, protected-ACL checks, exact server-only variables, independent DEV confirmation, and the transaction validation phase all pass. Do not edit `.env*`, pass a company ID on the command line, or run any existing cleanup/import/seed command. In its outer `finally`, the invocation must securely destroy the baseline, the inert probe if any remnant exists, the live runner, every other auxiliary artifact, and the exact dedicated directory after commit/no-op or abort, then verify directory absence. A second live invocation is forbidden; the exact rerun no-op contract is proved by automated tests.

Tests must cover wrong path, existing link/reparse point, permissive or inherited directory/file/runner ACL, any principal other than the current Windows user or `SYSTEM`, custody preservation, inert loader prevalidation before any DB use, repository-anchored bare-package resolution, no top-level-await runner lifecycle, malformed/extra-field envelope, checksum mismatch, noncanonical/duplicate/empty/not-21 IDs, every wrong/missing tier, ID, company marker, organization marker, active state, DB-vs-baseline exact-set mismatch, duplicate identity, partial state, foreign link, conflicting assignment, changed partition, wrong role, final mismatch, and simulated exception; deterministic baseline-derived first-run exact `2 / 8 / 8 / 5`; exact rerun no-op; one transaction; dedicated-directory deletion after commit, no-op, abort, pre-transaction failure, and loader/runtime failure; cleanup-failure stop; no secret/ID output; and zero schema/production/foreign/unrelated writes.

### Acceptance mapping

`BOOTSTRAP-01`–`BOOTSTRAP-09`; scenarios `DB-1`–`DB-4`; `REG-04`–`REG-05` bootstrap scope.

### Lock lifecycle and stop conditions

`CDP-LB: reserved → editing → review → released`. The transferred baseline and DB operation remain part of the lock until the single invocation's postcondition, automated no-op evidence, and verified secure cleanup pass.

Stop before mutation for any unavailable, exposed, unsafe, malformed, checksum-invalid, permissively accessible, inherited, custody-altered, or DB-mismatching exact 21-ID baseline; any directory/file ACL principal other than the current Windows user or `SYSTEM`; any non-DEV tier, missing/wrong configured ID, marker mismatch, existing non-bootstrap coordinator/contact/link/assignment state, partial bootstrap state, unknown dirty allowlist path, inability to prove one transaction, need for schema/migration/seed/package/env/Auth/company/surgery-field changes, or any target outside the exact company. On any failure, require rollback evidence when applicable, securely remove all custody artifacts and the exact dedicated directory, verify directory absence, and stop; never retry with reconciliation. If secure cleanup or absence verification fails after commit, no-op, abort, or pre-transaction failure, retain the lock, disclose no values, and stop for manual security handling.

---

## 5. T0 — Rerun current-tree, ownership, contracts, and post-bootstrap read-only preflight

### Task declaration

- **Task ID / Name:** `COORDINATION-DEV-PREVIEW-001-T0 / Post-bootstrap read-only preflight`
- **Agent role:** Implementation lead / repository preflight reviewer
- **Selected model:** `openai/gpt-5.6-sol`
- **Mode:** `read-only`
- **Depends on:** T-1 passed and `CDP-LB` released
- **Scope:** re-establish ownership/baselines, verify exact committed bootstrap state through aggregate evidence, confirm the already-resolved union semantics, and freeze the dedicated preview-only import/navigation graph.
- **Allowed files:** read any source/test/config path needed for the inventories below; write none.
- **Forbidden files/actions:** every repository write and every DB write; especially source, tests, SDD artifacts, schema, migrations, env, packages, data, worklog, and lock files.
- **Output:** external preflight evidence plus Spanish Caveman handoff.
- **Expected handoff:** baseline/provenance table, lock decision, exact assignment contract confirmation, frozen preview graph/file plan, `2 / 8 / 8 / 5` aggregate result, and go/stop for T1.

### Allowed commands

```powershell
git status --short --untracked-files=all
git diff --name-only
git diff -- src/lib/services/surgery.service.ts src/lib/api/surgery-adapter.ts src/types/index.ts src/__tests__/unit/backend-active-surgeries-adapter.test.ts src/lib/services/surgery-coordinator-read-model.ts src/__tests__/unit/surgery-coordinator-read-model.test.ts src/__tests__/unit/surgery.service-coordinator-read.test.ts src/lib/api/backend-surgeries.ts src/hooks/useBackendActiveSurgeries.ts src/lib/store.ts src/__tests__/unit/useBackendActiveSurgeries.test.tsx src/components/coordinadores/coordination-ui-state.ts src/__tests__/unit/coordination-ui-state.test.ts src/lib/services/personal-coordinator-resolver.service.ts src/lib/services/coordination-preview-capability.service.ts src/lib/services/coordination-view.service.ts src/lib/validators/coordination-view.validator.ts src/lib/api/coordination-view.ts src/app/api/companies/[companyId]/coordination/view/route.ts src/__tests__/unit/personal-coordinator-resolver.test.ts src/__tests__/unit/coordination-preview-capability.test.ts src/__tests__/unit/coordination-view.service.test.ts src/__tests__/unit/coordination-view-route.test.ts src/components/coordinadores/CoordinatorInboxView.tsx src/app/coordinadores/mi-bandeja/page.tsx src/app/coordinadores/page.tsx src/components/coordinadores/coordinator-queue.helpers.ts src/components/coordinadores/CoordinationStateSurface.tsx src/components/coordinadores/CoordinationSecondaryFilters.tsx src/components/coordinadores/preview/CoordinationPreviewRoot.tsx src/components/coordinadores/preview/CoordinationPreviewBanner.tsx src/components/coordinadores/preview/CoordinationPreviewControls.tsx src/components/coordinadores/preview/CoordinationPreviewCaseRow.tsx src/components/coordinadores/preview/CoordinationPreviewPersonal.tsx src/components/coordinadores/preview/CoordinationPreviewGlobal.tsx src/hooks/useCoordinationView.ts src/__tests__/components/CoordinatorInboxView.test.tsx src/__tests__/components/CoordinadoresPage.test.tsx src/__tests__/components/CoordinationStateSurface.test.tsx src/__tests__/components/CoordinationPreviewBoundary.test.tsx src/__tests__/unit/coordinator-queue.helpers.test.ts src/__tests__/unit/useCoordinationView.test.tsx
git ls-files --others --exclude-standard -- src/lib/services/surgery-coordinator-read-model.ts src/__tests__/unit/surgery-coordinator-read-model.test.ts src/__tests__/unit/surgery.service-coordinator-read.test.ts src/components/coordinadores/coordination-ui-state.ts src/__tests__/unit/coordination-ui-state.test.ts src/lib/services/personal-coordinator-resolver.service.ts src/lib/services/coordination-preview-capability.service.ts src/lib/services/coordination-view.service.ts src/lib/validators/coordination-view.validator.ts src/lib/api/coordination-view.ts src/app/api/companies/[companyId]/coordination/view/route.ts src/__tests__/unit/personal-coordinator-resolver.test.ts src/__tests__/unit/coordination-preview-capability.test.ts src/__tests__/unit/coordination-view.service.test.ts src/__tests__/unit/coordination-view-route.test.ts src/components/coordinadores/CoordinationStateSurface.tsx src/components/coordinadores/CoordinationSecondaryFilters.tsx src/components/coordinadores/preview/CoordinationPreviewRoot.tsx src/components/coordinadores/preview/CoordinationPreviewBanner.tsx src/components/coordinadores/preview/CoordinationPreviewControls.tsx src/components/coordinadores/preview/CoordinationPreviewCaseRow.tsx src/components/coordinadores/preview/CoordinationPreviewPersonal.tsx src/components/coordinadores/preview/CoordinationPreviewGlobal.tsx src/hooks/useCoordinationView.ts src/__tests__/components/CoordinationStateSurface.test.tsx src/__tests__/components/CoordinationPreviewBoundary.test.tsx src/__tests__/unit/useCoordinationView.test.tsx
rg -n "contactAssignments|coordinadorContactId|coordinadorCx|DEFAULT_COORDINATOR|Nelson|useBackendActiveSurgeries|useCirugiaActions|apiFetch|POST|PUT|PATCH|DELETE|router\.|Link" src
npx vitest run src/__tests__/unit/coordination-dev-bootstrap.service.test.ts
```

After source review proves it performs only reads, T0 may run one aggregate-only DEV query through the existing Prisma/`tsx` toolchain. It must use the exact server-only configured company ID, be transactionally read-only where supported, compare the exact 21-ID set, emit no PII/clinical fields, and perform no create/update/delete/upsert.

### Work and validations

1. Record current baselines and provenance for every anticipated T1–T4 path; obtain explicit release/handoff for dirty paths.
2. Confirm the current service, route, adapter, store, loader, inbox, global panel, Auth context, company guards, and focused tests still match the amended DESIGN inventory.
3. Confirm and record, without reopening design, the exact relational-plus-legacy union/dedupe/cardinality semantics in §1.5.
4. Freeze exact new-file names in T1–T4. An unexpectedly existing path requires provenance before reuse.
5. Inspect current production inbox/global imports and identify pure derivation helpers that preview may reuse. Freeze the T4 preview graph as a separate root/rows/controls tree that cannot import or navigate to mutation hooks, dialogs, general Cirugías/Expediente workspaces, writable forms, mutation clients, or mutation-capable route targets.
6. Confirm T3 can implement `GET /api/companies/{companyId}/coordination/view` without touching mutation routes or general guards, and can require real Supabase Auth, exact `admin`, exact configured company-ID equality, exact company/organization markers, and normal company access.
7. Read-only verify exactly 21 baseline active surgeries, exactly two eligible fixed DEV contacts/links, exactly sixteen canonical relational coordinator assignments, disjoint `8 / 8`, five unassigned across both representations, and no cross-company candidates.
8. Confirm production data and every non-target company are untouched and no additional data creation/repair is needed.

### Exit gate

- All dirty allowlist paths have explicit ownership transfer and unchanged baselines.
- Exact union/dedupe/cardinality and `isPrimary` diagnostic-only semantics are recorded as resolved.
- The exact server-only company-ID gate is feasible without client authority.
- The dedicated preview-only GET/import/navigation graph is complete and needs no mutation-route manifest.
- The exact post-bootstrap `2 / 8 / 8 / 5` state and exact 21-ID set pass read-only verification.
- T1's exact paths are safe to reserve.

### Lock lifecycle and stop conditions

`CDP-L0: reserved → review → released`. T0 never enters `editing`.

Stop for unknown/active dirty ownership, changed baselines, bootstrap mismatch, any non-target write evidence, role values contradicting exact `coordinator`, unavailable safe read-only evidence, any attempt to reopen source precedence/`isPrimary` selection, inability to isolate preview in a GET-only mutation-free graph, or any requirement for schema/data/Auth/permission/provider/dependency work.

---

## 6. T1 — Assignment read select, DTO/adapter contract, and focused tests

### Task declaration

- **Task ID / Name:** `COORDINATION-DEV-PREVIEW-001-T1 / Assignment read-select and adapter contract`
- **Agent role:** Backend read-model implementer
- **Selected model:** `openai/gpt-5.6-sol`
- **Mode:** `implementation/testing`
- **Depends on:** T0 passed and `CDP-L0` released
- **Scope:** preserve persisted coordinator candidates from company-scoped service read through DTO and shared adapter; implement the resolved exact-ID union and explicit ambiguity; perform no loading/UI/preview or data-write work.
- **Allowed files:** exactly the list below.
- **Forbidden files:** every other file, especially routes, store, loader/hook, coordinator UI, Auth/guards, schema/migrations/data/bootstrap, packages, and docs.
- **Output:** code/tests plus Spanish Caveman handoff.
- **Expected handoff:** frozen DTO/client mapping, union/dedupe evidence, path-limited diff, and confirmation of zero writes/business-rule changes.

### Exact allowlist and lock

Modify only:

- `src/lib/services/surgery.service.ts`
- `src/lib/api/surgery-adapter.ts`
- `src/types/index.ts`
- `src/__tests__/unit/backend-active-surgeries-adapter.test.ts`

Create only if T0 confirms absent:

- `src/lib/services/surgery-coordinator-read-model.ts`
- `src/__tests__/unit/surgery-coordinator-read-model.test.ts`
- `src/__tests__/unit/surgery.service-coordinator-read.test.ts`

Lock `CDP-L1` owns this inseparable chain.

### Implementation requirements

1. Extend only the company-scoped active surgery projection for canonical `role === "coordinator"` assignments and active, non-company contacts with active exact-company coordinator links.
2. Serialize deterministic assignment DTOs; stable sorting may use `isPrimary` descending, `createdAt` ascending, then assignment ID, but resolution must use the complete candidate union.
3. Union every eligible relational contact ID with every non-empty legacy flat contact ID, dedupe exact IDs, then resolve `0 = none`, `1 = resolved`, `>1 = ambiguous`. `isPrimary`, source, label, and row order never choose ownership.
4. Equal relational/legacy IDs dedupe; conflicting IDs remain ambiguous; absent remains unassigned. Map labels for display only.
5. `none`/`ambiguous` clear singular backend coordinator fields while retaining only approved diagnostic state. Local/mock labels cannot revive them.
6. Keep list/detail company predicates and all mutation behavior unchanged.

### Allowed commands and validation gates

```powershell
npx vitest run src/__tests__/unit/surgery-coordinator-read-model.test.ts src/__tests__/unit/surgery.service-coordinator-read.test.ts src/__tests__/unit/backend-active-surgeries-adapter.test.ts
npm run typecheck
git diff --check -- src/lib/services/surgery.service.ts src/lib/services/surgery-coordinator-read-model.ts src/lib/api/surgery-adapter.ts src/types/index.ts src/__tests__/unit/surgery-coordinator-read-model.test.ts src/__tests__/unit/surgery.service-coordinator-read.test.ts src/__tests__/unit/backend-active-surgeries-adapter.test.ts
git diff -- src/lib/services/surgery.service.ts src/lib/services/surgery-coordinator-read-model.ts src/lib/api/surgery-adapter.ts src/types/index.ts src/__tests__/unit/surgery-coordinator-read-model.test.ts src/__tests__/unit/surgery.service-coordinator-read.test.ts src/__tests__/unit/backend-active-surgeries-adapter.test.ts
```

Tests must cover relational-only, flat-only, equal dual, conflicting dual, duplicate relational IDs, multiple distinct relational IDs with exactly one primary, legacy conflict with a primary relational row, absent, wrong-company/inactive/non-coordinator exclusion, duplicate labels/distinct IDs, one row per surgery, and zero write calls.

### Acceptance mapping

`RPATH-01`–`RPATH-08`, including `RPATH-05A`–`RPATH-05B`; scenarios `RP-1`–`RP-5B`; `SEC-02`; assignment portions of `REG-01`–`REG-02`.

### Lock lifecycle and stop conditions

`CDP-L1: reserved → editing → review → released`.

Stop if implementation would use source/primary/first-row precedence; persisted data requires repair; a company predicate cannot be proven; schema, route, store, UI, Auth, permission, bootstrap, or write paths are needed; or an allowlist baseline differs from T0. Diagnose failures before a minimal in-scope correction.

---

## 7. T2 — Coordination backend loading, hydration boundary, and UI state model

### Task declaration

- **Task ID / Name:** `COORDINATION-DEV-PREVIEW-001-T2 / Coordination loading and state model`
- **Agent role:** Client data-controller implementer
- **Selected model:** `openai/gpt-5.6-sol`
- **Mode:** `implementation/testing`
- **Depends on:** T1 passed and `CDP-L1` released
- **Scope:** make direct production Coordination entry initiate trustworthy backend loading, hydrate only successful same-context data, and model all required states without preview authorization or final presentation.
- **Allowed files:** exactly the list below.
- **Forbidden files:** every other file, especially T1 files, coordinator pages/components, API routes, Auth/guards, schema/data/bootstrap/packages/docs.
- **Output:** controller/state code and tests plus Spanish Caveman handoff.
- **Expected handoff:** state-transition evidence, same-context refresh behavior, trust-context clearing contract, and transfer to T3/T4.

### Exact allowlist and lock

Modify only:

- `src/lib/api/backend-surgeries.ts`
- `src/hooks/useBackendActiveSurgeries.ts`
- `src/lib/store.ts`
- `src/__tests__/unit/useBackendActiveSurgeries.test.tsx`

Create only if T0 confirms absent:

- `src/components/coordinadores/coordination-ui-state.ts`
- `src/__tests__/unit/coordination-ui-state.test.ts`

Lock: `CDP-L2`.

### Implementation requirements

1. Separate waiting-auth, initial loading, refresh, initial/refresh error, blocked identity, preview denial, real empty, filtered empty, and populated states under SPEC precedence.
2. Direct production-route consumers must start/reuse a company-scoped backend read before counts, buckets, or emptiness.
3. Replace production hydrated surgeries only after success; preserve same-context rows during refresh; clear rows immediately on actor/company/mode/subject change or block/denial.
4. Never treat initial mocks, persisted Zustand content, or pending state as successful empty data. Store is not identity or preview authority.
5. Retry only the identical trust context. Add no persistence key. Preview-local rows remain outside the global mutation-capable store and are implemented later.

### Allowed commands and validation gates

```powershell
npx vitest run src/__tests__/unit/backend-active-surgeries-adapter.test.ts src/__tests__/unit/useBackendActiveSurgeries.test.tsx src/__tests__/unit/coordination-ui-state.test.ts
npm run typecheck
git diff --check -- src/lib/api/backend-surgeries.ts src/hooks/useBackendActiveSurgeries.ts src/lib/store.ts src/components/coordinadores/coordination-ui-state.ts src/__tests__/unit/useBackendActiveSurgeries.test.tsx src/__tests__/unit/coordination-ui-state.test.ts
git diff -- src/lib/api/backend-surgeries.ts src/hooks/useBackendActiveSurgeries.ts src/lib/store.ts src/components/coordinadores/coordination-ui-state.ts src/__tests__/unit/useBackendActiveSurgeries.test.tsx src/__tests__/unit/coordination-ui-state.test.ts
```

Tests prove no false-zero/empty flash, successful-only replacement, refresh preservation, retry-context stability, and clearing on trust-context change/block/denial.

### Acceptance mapping

`RPATH-09`–`RPATH-15`; `UISTATE-01`–`UISTATE-06`; scenarios `RP-6`, `RP-7`, `UX-1A`, `UX-1B`, and `UX-2`.

### Lock lifecycle and stop conditions

`CDP-L2: reserved → editing → review → released`.

Stop if correct state requires persistence, client authority, an Auth change, out-of-scope T1 rework, UI edits, or an unlisted file; or if refresh can leak prior actor/company/subject/mode rows.

---

## 8. T3 — Strict personal context and server-only GET preview data boundary

### Task declaration

- **Task ID / Name:** `COORDINATION-DEV-PREVIEW-001-T3 / Server personal and GET-only DEV preview boundary`
- **Agent role:** Backend security and API implementer
- **Selected model:** `openai/gpt-5.6-sol`
- **Mode:** `implementation/testing`
- **Depends on:** T2 passed and `CDP-L2` released
- **Scope:** implement strict production personal resolution, exact server-only preview gating, allowlisted subjects, and the private GET-only Coordination view response/client. Do not modify or enumerate mutation routes.
- **Allowed files:** exactly the list below.
- **Forbidden files:** every other file, especially Auth provider/session behavior, general guards/permissions, all mutation routes/services, schema/data/bootstrap/packages, store/types/adapter, coordinator UI, and env files.
- **Output:** server/read-client contracts and security tests plus Spanish Caveman handoff.
- **Expected handoff:** denial/tenant matrices, exact ID-gate evidence, actor preservation, GET-only/no-write/cache evidence, and T4 DTO contract.

### Exact allowlist and lock

Create only if T0 confirms absent:

- `src/lib/services/personal-coordinator-resolver.service.ts`
- `src/lib/services/coordination-preview-capability.service.ts`
- `src/lib/services/coordination-view.service.ts`
- `src/lib/validators/coordination-view.validator.ts`
- `src/lib/api/coordination-view.ts`
- `src/app/api/companies/[companyId]/coordination/view/route.ts`
- `src/__tests__/unit/personal-coordinator-resolver.test.ts`
- `src/__tests__/unit/coordination-preview-capability.test.ts`
- `src/__tests__/unit/coordination-view.service.test.ts`
- `src/__tests__/unit/coordination-view-route.test.ts`

No existing guard or mutation route is allowlisted. Lock `CDP-L3` owns only these GET-boundary paths.

### Implementation requirements

1. Implement exact normalized email/full-name union matching, deduped by contact ID, returning only `resolved`, `unresolved`, or `ambiguous`; no fuzzy/first/default/Nelson path. Blocked personal responses contain no cases/candidate details.
2. Require conjunctively: `OSSUM_DEPLOYMENT_TIER === "development"`; preview flag exactly `true`; non-empty `OSSUM_COORDINATION_DEV_PREVIEW_COMPANY_ID`; exact equality with route company ID, `ctx.companyId`, and loaded `Company.id`; active company named `Districorr DEV`; active organization slug `ossum-dev`; real Supabase Auth source/non-null ID; active user/access; exact role `admin`.
3. Treat configured company ID as mandatory server-only authority. Never accept, return, infer, or override it from the client; name/slug do not substitute for ID equality.
4. Derive/sort a minimum same-company coordinator allowlist server-side and revalidate exact `contactId` every request. Unknown/foreign targets are non-disclosing.
5. Export only `GET /api/companies/{companyId}/coordination/view` with exact query combinations/statuses/private-no-store headers. The route file must export no POST/PUT/PATCH/DELETE handler; unsupported methods remain 405 by framework contract.
6. Filter personal reads by trusted server-derived contact ID and exact company. Global remains permission-governed and company-wide. Production personal accepts no subject.
7. Return a presentation-only DTO: context, capability/targets when fully allowed, and read rows. It contains no mutation callback, action capability, writable form model, mutation URL, route target, or method selector.
8. Preserve real actor/session/company/role/audit identity. Use existing non-persisted observability only. Preview does no write and never hydrates its rows into a mutation-capable global surface.
9. The client helper performs authenticated GET only, sends no production subject, sends only server-returned contact IDs for preview personal, and persists nothing.

### Allowed commands and validation gates

```powershell
npx vitest run src/__tests__/unit/personal-coordinator-resolver.test.ts src/__tests__/unit/coordination-preview-capability.test.ts src/__tests__/unit/coordination-view.service.test.ts src/__tests__/unit/coordination-view-route.test.ts
npm run typecheck
git diff --check -- src/lib/services/personal-coordinator-resolver.service.ts src/lib/services/coordination-preview-capability.service.ts src/lib/services/coordination-view.service.ts src/lib/validators/coordination-view.validator.ts src/lib/api/coordination-view.ts src/app/api/companies/[companyId]/coordination/view/route.ts src/__tests__/unit/personal-coordinator-resolver.test.ts src/__tests__/unit/coordination-preview-capability.test.ts src/__tests__/unit/coordination-view.service.test.ts src/__tests__/unit/coordination-view-route.test.ts
git diff -- src/lib/services/personal-coordinator-resolver.service.ts src/lib/services/coordination-preview-capability.service.ts src/lib/services/coordination-view.service.ts src/lib/validators/coordination-view.validator.ts src/lib/api/coordination-view.ts src/app/api/companies/[companyId]/coordination/view/route.ts src/__tests__/unit/personal-coordinator-resolver.test.ts src/__tests__/unit/coordination-preview-capability.test.ts src/__tests__/unit/coordination-view.service.test.ts src/__tests__/unit/coordination-view-route.test.ts
rg -n "export (async )?function (POST|PUT|PATCH|DELETE)|method:\s*[\"'](POST|PUT|PATCH|DELETE)|mutation|actionUrl|routeTarget" src/app/api/companies/[companyId]/coordination/view/route.ts src/lib/api/coordination-view.ts
```

Required evidence includes every wrong/missing gate, production and DEV-header denial, exact configured-ID mismatch at route/context/database, copied name/slug with wrong ID, non-admin/unknown role, malformed/duplicate query, wrong-company actor/subject/surgery/global attempts, stale capability/target, private/no-store headers on success/error, unsupported methods, unchanged actor, GET-only client/route, presentation-only DTO, and zero database/audit/preference/domain writes.

### Acceptance mapping

`PERSONAL-01`–`PERSONAL-07`; `GLOBAL-01`–`GLOBAL-04`; `PREVIEW-01`–`PREVIEW-12`; `READONLY-01`–`READONLY-02`, `READONLY-06`–`READONLY-07`, `READONLY-09`; `SEC-01`–`SEC-06`; `OBS-01`–`OBS-04`; scenarios `PI-1`–`PI-4`, `GP-1`–`GP-2`, `DP-1`–`DP-6`, and server-side portions of `RO-2`.

### Lock lifecycle and stop conditions

`CDP-L3: reserved → editing → review → released`.

Stop if implementation requires any mutation-route/guard edit, client-supplied company authority, non-GET preview method, mutation/action field in the DTO, production preview exposure, Auth/permission architecture change, persistent observability, inability to prove company isolation/real actor, or any normal mutation semantic change. Do not fall back to an incomplete mutation manifest or preview request marker.

---

## 9. T4 — Production Coordination UX and dedicated read-only preview presentation boundary

### Task declaration

- **Task ID / Name:** `COORDINATION-DEV-PREVIEW-001-T4 / Production UX and isolated preview presentation`
- **Agent role:** Coordination frontend implementer
- **Selected model:** `openai/gpt-5.6-sol`
- **Mode:** `implementation/testing`
- **Depends on:** T3 passed and `CDP-L3` released
- **Scope:** consume the trusted GET view contract, remove production subject switching, render explicit states, and implement preview personal/global through a separate mutation-free presentation graph.
- **Allowed files:** exactly the list below.
- **Forbidden files:** every other file, especially server/API/guard/Auth/store/type/adapter files, mutation routes/clients/hooks/dialogs, general Cirugías/Expediente components, schema/data/bootstrap/packages/docs.
- **Output:** UI/tests plus Spanish Caveman handoff.
- **Expected handoff:** production/preview evidence, complete preview import/navigation graph proof, GET-only network proof, responsive/accessibility evidence, and T5 package.

### Exact allowlist and lock

Modify only:

- `src/components/coordinadores/CoordinatorInboxView.tsx`
- `src/app/coordinadores/mi-bandeja/page.tsx`
- `src/app/coordinadores/page.tsx`
- `src/components/coordinadores/coordinator-queue.helpers.ts` only for contact-ID filtering/explicit ambiguous display without changing shared derivations
- `src/__tests__/components/CoordinatorInboxView.test.tsx`
- `src/__tests__/components/CoordinadoresPage.test.tsx`
- `src/__tests__/unit/coordinator-queue.helpers.test.ts`

Create only if T0 confirms absent:

- `src/components/coordinadores/preview/CoordinationPreviewRoot.tsx`
- `src/components/coordinadores/preview/CoordinationPreviewBanner.tsx`
- `src/components/coordinadores/preview/CoordinationPreviewControls.tsx`
- `src/components/coordinadores/preview/CoordinationPreviewCaseRow.tsx`
- `src/components/coordinadores/preview/CoordinationPreviewPersonal.tsx`
- `src/components/coordinadores/preview/CoordinationPreviewGlobal.tsx`
- `src/components/coordinadores/CoordinationStateSurface.tsx`
- `src/components/coordinadores/CoordinationSecondaryFilters.tsx`
- `src/hooks/useCoordinationView.ts`
- `src/__tests__/components/CoordinationPreviewBoundary.test.tsx`
- `src/__tests__/components/CoordinationStateSurface.test.tsx`
- `src/__tests__/unit/useCoordinationView.test.tsx`

Lock `CDP-L4` covers this complete UI graph. Preview files under `preview/` may import only React/UI primitives, pure read DTO/types, the GET-only `coordination-view` client through the controller, pure coordinator derivation helpers, and other preview files in this allowlist.

### Implementation requirements

1. Production `Mi bandeja` renders server-resolved fixed identity and no selector, `?coord`, browser override, `Ver otros coordinadores`, default, or local subject inference. `Panel global` remains the permitted cross-coordinator production surface.
2. Drive results from T2 state semantics and T3 response. Initial/refresh loading, initial/refresh error, unresolved, ambiguous, true empty, filtered empty, populated, and denied/stale preview are visibly distinct with approved Spanish copy/actions.
3. Clear prior trust-context rows on actor/company/mode/subject change or denial; preserve same-context rows while refreshing.
4. Preview controls render only from `previewCapability.enabled === true`; contact-ID selection performs a full server GET refetch and is mount-memory only. Never locally derive a personal preview from a downloaded global set.
5. Preview mounts `CoordinationPreviewRoot`, which chooses only preview personal/global descendants and owns preview-local immutable rows. It must not render production `CoordinatorInboxView` or the production `/coordinadores` component tree.
6. Every preview descendant is read-only by construction: no mutation hook/client, action callback, mutation URL/method, action menu, dialog, form submitter, uploader, general surgery/Expediente workspace, or link/router target to a mutation-capable screen. Row inspection remains a bounded static summary inside the preview tree.
7. Allowed preview interactions are only GET refetch, local filtering, local disclosure/expansion, static inspection, and exit to the real actor's production Coordination entry. Exit tears down preview state before navigation.
8. Keep a compact persistent DEV/`Solo lectura` banner distinguishing real actor from viewed coordinator/global. Reuse pure shared bucket/subgroup/SLA/availability/incident/next-action helpers; compare owner by contact ID; one surgery equals one row.
9. Apply compact metrics, quick filters first, progressive secondary filters, flatter/wider desktop, nonzero-only alert emphasis, and recent-finalized collapsed by default on mobile.
10. At `412x915`, first representative result begins no later than the second viewport; targets are at least `44x44`; focus/order/names/live-region behavior meets SPEC.

### Allowed commands and validation gates

```powershell
npx vitest run src/__tests__/unit/coordinator-queue.helpers.test.ts src/__tests__/unit/useCoordinationView.test.tsx src/__tests__/components/CoordinatorInboxView.test.tsx src/__tests__/components/CoordinadoresPage.test.tsx src/__tests__/components/CoordinationStateSurface.test.tsx src/__tests__/components/CoordinationPreviewBoundary.test.tsx
npm run typecheck
git diff --check -- src/components/coordinadores/CoordinatorInboxView.tsx src/app/coordinadores/mi-bandeja/page.tsx src/app/coordinadores/page.tsx src/components/coordinadores/coordinator-queue.helpers.ts src/components/coordinadores/CoordinationStateSurface.tsx src/components/coordinadores/CoordinationSecondaryFilters.tsx src/components/coordinadores/preview/CoordinationPreviewRoot.tsx src/components/coordinadores/preview/CoordinationPreviewBanner.tsx src/components/coordinadores/preview/CoordinationPreviewControls.tsx src/components/coordinadores/preview/CoordinationPreviewCaseRow.tsx src/components/coordinadores/preview/CoordinationPreviewPersonal.tsx src/components/coordinadores/preview/CoordinationPreviewGlobal.tsx src/hooks/useCoordinationView.ts src/__tests__/components/CoordinatorInboxView.test.tsx src/__tests__/components/CoordinadoresPage.test.tsx src/__tests__/components/CoordinationStateSurface.test.tsx src/__tests__/components/CoordinationPreviewBoundary.test.tsx src/__tests__/unit/coordinator-queue.helpers.test.ts src/__tests__/unit/useCoordinationView.test.tsx
git diff -- src/components/coordinadores/CoordinatorInboxView.tsx src/app/coordinadores/mi-bandeja/page.tsx src/app/coordinadores/page.tsx src/components/coordinadores/coordinator-queue.helpers.ts src/components/coordinadores/CoordinationStateSurface.tsx src/components/coordinadores/CoordinationSecondaryFilters.tsx src/components/coordinadores/preview/CoordinationPreviewRoot.tsx src/components/coordinadores/preview/CoordinationPreviewBanner.tsx src/components/coordinadores/preview/CoordinationPreviewControls.tsx src/components/coordinadores/preview/CoordinationPreviewCaseRow.tsx src/components/coordinadores/preview/CoordinationPreviewPersonal.tsx src/components/coordinadores/preview/CoordinationPreviewGlobal.tsx src/hooks/useCoordinationView.ts src/__tests__/components/CoordinatorInboxView.test.tsx src/__tests__/components/CoordinadoresPage.test.tsx src/__tests__/components/CoordinationStateSurface.test.tsx src/__tests__/components/CoordinationPreviewBoundary.test.tsx src/__tests__/unit/coordinator-queue.helpers.test.ts src/__tests__/unit/useCoordinationView.test.tsx
rg -n "useCirugiaActions|CoordinatorManagementDialog|ExpedienteFullView|ChangeStateDialog|ChangeDateDialog|SuspendDialog|CancelDialog|AddNoteDialog|PresupuestoDialog|FacturarDialog|POST|PUT|PATCH|DELETE|router\.|href=" src/components/coordinadores/preview src/__tests__/components/CoordinationPreviewBoundary.test.tsx
```

The boundary test must recursively account for the complete static and dynamic preview import graph and assert: no mutation-capable descendant/import/callback/client; no production mutation-capable component tree; no mutation route target/navigation; DTO props contain no action capability; every network call is the approved GET; row inspection remains local/static; filters/disclosure emit no request; subject/surface/retry/refresh emit GET only; preview rows never enter the mutation-capable global store; and teardown precedes exit.

Component tests must also prove state precedence/copy, no false zero, fixed production owner, no production selector, capability-only controls, refetch by contact ID, actor/subject distinction, refresh preservation/context clearing, accessibility, and one row per surgery.

### Acceptance mapping

`GLOBAL-05`; `READONLY-03`–`READONLY-05`, including `READONLY-03A`–`READONLY-03B`, and `READONLY-08`; `UISTATE-01`–`UISTATE-10`; `RESP-01`–`RESP-08`; scenarios `RO-1`, `RO-1A`, `RO-3`, `UX-1A`–`UX-4`, and UI portions of `PI-1`–`PI-4`, `DP-3`, and `DP-6`.

### Lock lifecycle and stop conditions

`CDP-L4: reserved → editing → review → released`.

Stop if any preview path imports, renders, receives, dynamically reaches, or navigates to a mutation-capable hook/client/dialog/component/route/workspace; emits a non-GET request; publishes rows into the mutation-capable global surface; requires a mutation-route guard/manifest; changes shared derivations; needs production client subject state; or requires an unlisted path/broad Cirugías/Expediente/navigation edit.

---

## 10. T5 — Independent verification and security regression

### Task declaration

- **Task ID / Name:** `COORDINATION-DEV-PREVIEW-001-T5 / Independent security and regression review`
- **Agent role:** Independent QA/security reviewer
- **Selected model:** `openai/gpt-5.6-sol`
- **Mode:** `QA/review, read-only`
- **Depends on:** T-3, T-2, T-1, and T0–T4 passed; all writer locks released and the external baseline is verified absent
- **Scope:** independently verify bootstrap scope, acceptance, exact server gates, GET-only preview graph, final diff isolation, production non-impact, and regressions. Do not fix findings.
- **Allowed files:** read only the SDD artifacts, non-disclosing external T-3/T-2/T-1/T0 attestations, T-1/T1–T4 paths/tests, and path-limited diffs; never inspect `.env.local`, recover any server-only value, or receive the deleted baseline contents.
- **Forbidden files/actions:** all writes, snapshots, generated files, env changes, lock/worklog updates, Git writes, schema/data commands, and browser automation.
- **Output:** evidence matrix and Spanish Caveman handoff.
- **Expected handoff:** pass/fail by requirement family, Diagnose-formatted findings routed to owners, and browser-QA go/no-go.

### Allowed commands and validation gates

```powershell
$coordinationLintPaths = @(
  "src/lib/services/coordination-dev-bootstrap.service.ts",
  "scripts/dev/bootstrap-coordination-preview.ts",
  "src/__tests__/unit/coordination-dev-bootstrap.service.test.ts",
  "src/lib/services/surgery.service.ts",
  "src/lib/api/surgery-adapter.ts",
  "src/types/index.ts",
  "src/__tests__/unit/backend-active-surgeries-adapter.test.ts",
  "src/lib/services/surgery-coordinator-read-model.ts",
  "src/__tests__/unit/surgery-coordinator-read-model.test.ts",
  "src/__tests__/unit/surgery.service-coordinator-read.test.ts",
  "src/lib/api/backend-surgeries.ts",
  "src/hooks/useBackendActiveSurgeries.ts",
  "src/lib/store.ts",
  "src/__tests__/unit/useBackendActiveSurgeries.test.tsx",
  "src/components/coordinadores/coordination-ui-state.ts",
  "src/__tests__/unit/coordination-ui-state.test.ts",
  "src/lib/services/personal-coordinator-resolver.service.ts",
  "src/lib/services/coordination-preview-capability.service.ts",
  "src/lib/services/coordination-view.service.ts",
  "src/lib/validators/coordination-view.validator.ts",
  "src/lib/api/coordination-view.ts",
  "src/app/api/companies/[companyId]/coordination/view/route.ts",
  "src/__tests__/unit/personal-coordinator-resolver.test.ts",
  "src/__tests__/unit/coordination-preview-capability.test.ts",
  "src/__tests__/unit/coordination-view.service.test.ts",
  "src/__tests__/unit/coordination-view-route.test.ts",
  "src/components/coordinadores/CoordinatorInboxView.tsx",
  "src/app/coordinadores/mi-bandeja/page.tsx",
  "src/app/coordinadores/page.tsx",
  "src/components/coordinadores/coordinator-queue.helpers.ts",
  "src/__tests__/components/CoordinatorInboxView.test.tsx",
  "src/__tests__/components/CoordinadoresPage.test.tsx",
  "src/__tests__/unit/coordinator-queue.helpers.test.ts",
  "src/components/coordinadores/preview/CoordinationPreviewRoot.tsx",
  "src/components/coordinadores/preview/CoordinationPreviewBanner.tsx",
  "src/components/coordinadores/preview/CoordinationPreviewControls.tsx",
  "src/components/coordinadores/preview/CoordinationPreviewCaseRow.tsx",
  "src/components/coordinadores/preview/CoordinationPreviewPersonal.tsx",
  "src/components/coordinadores/preview/CoordinationPreviewGlobal.tsx",
  "src/components/coordinadores/CoordinationStateSurface.tsx",
  "src/components/coordinadores/CoordinationSecondaryFilters.tsx",
  "src/hooks/useCoordinationView.ts",
  "src/__tests__/components/CoordinationPreviewBoundary.test.tsx",
  "src/__tests__/components/CoordinationStateSurface.test.tsx",
  "src/__tests__/unit/useCoordinationView.test.tsx"
)
if ($coordinationLintPaths.Count -ne 45 -or @($coordinationLintPaths | Sort-Object -Unique).Count -ne 45 -or @($coordinationLintPaths | Where-Object { -not (Test-Path -LiteralPath $_) }).Count -ne 0) { throw "Coordination lint allowlist mismatch" }
npx eslint -- $coordinationLintPaths # Non-autofix gate: --fix and --fix-dry-run are forbidden.
npx vitest run src/__tests__/unit/coordination-dev-bootstrap.service.test.ts src/__tests__/unit/surgery-coordinator-read-model.test.ts src/__tests__/unit/surgery.service-coordinator-read.test.ts src/__tests__/unit/backend-active-surgeries-adapter.test.ts src/__tests__/unit/useBackendActiveSurgeries.test.tsx src/__tests__/unit/coordination-ui-state.test.ts src/__tests__/unit/personal-coordinator-resolver.test.ts src/__tests__/unit/coordination-preview-capability.test.ts src/__tests__/unit/coordination-view.service.test.ts src/__tests__/unit/coordination-view-route.test.ts src/__tests__/unit/coordinator-queue.helpers.test.ts src/__tests__/unit/useCoordinationView.test.tsx src/__tests__/components/CoordinatorInboxView.test.tsx src/__tests__/components/CoordinadoresPage.test.tsx src/__tests__/components/CoordinationStateSurface.test.tsx src/__tests__/components/CoordinationPreviewBoundary.test.tsx
npm run typecheck
npm run lint # Informational global baseline/report; the scoped rule below governs its expected non-zero result.
npm test
npm run build
git diff --check -- src/lib/services/coordination-dev-bootstrap.service.ts scripts/dev/bootstrap-coordination-preview.ts src/__tests__/unit/coordination-dev-bootstrap.service.test.ts src/lib/services/surgery.service.ts src/lib/services/surgery-coordinator-read-model.ts src/lib/api/surgery-adapter.ts src/types/index.ts src/__tests__/unit/surgery-coordinator-read-model.test.ts src/__tests__/unit/surgery.service-coordinator-read.test.ts src/__tests__/unit/backend-active-surgeries-adapter.test.ts src/lib/api/backend-surgeries.ts src/hooks/useBackendActiveSurgeries.ts src/lib/store.ts src/components/coordinadores/coordination-ui-state.ts src/__tests__/unit/useBackendActiveSurgeries.test.tsx src/__tests__/unit/coordination-ui-state.test.ts src/lib/services/personal-coordinator-resolver.service.ts src/lib/services/coordination-preview-capability.service.ts src/lib/services/coordination-view.service.ts src/lib/validators/coordination-view.validator.ts src/lib/api/coordination-view.ts src/app/api/companies/[companyId]/coordination/view/route.ts src/__tests__/unit/personal-coordinator-resolver.test.ts src/__tests__/unit/coordination-preview-capability.test.ts src/__tests__/unit/coordination-view.service.test.ts src/__tests__/unit/coordination-view-route.test.ts src/components/coordinadores/CoordinatorInboxView.tsx src/app/coordinadores/mi-bandeja/page.tsx src/app/coordinadores/page.tsx src/components/coordinadores/coordinator-queue.helpers.ts src/components/coordinadores/CoordinationStateSurface.tsx src/components/coordinadores/CoordinationSecondaryFilters.tsx src/components/coordinadores/preview/CoordinationPreviewRoot.tsx src/components/coordinadores/preview/CoordinationPreviewBanner.tsx src/components/coordinadores/preview/CoordinationPreviewControls.tsx src/components/coordinadores/preview/CoordinationPreviewCaseRow.tsx src/components/coordinadores/preview/CoordinationPreviewPersonal.tsx src/components/coordinadores/preview/CoordinationPreviewGlobal.tsx src/hooks/useCoordinationView.ts src/__tests__/components/CoordinatorInboxView.test.tsx src/__tests__/components/CoordinadoresPage.test.tsx src/__tests__/components/CoordinationStateSurface.test.tsx src/__tests__/components/CoordinationPreviewBoundary.test.tsx src/__tests__/unit/coordinator-queue.helpers.test.ts src/__tests__/unit/useCoordinationView.test.tsx
git diff --name-only
git status --short --untracked-files=all
rg -n "Nelson|DEFAULT_COORDINATOR|NEXT_PUBLIC_.*PREVIEW|NODE_ENV|subjectContactId|X-Ossum-Coordination-Mode|POST|PUT|PATCH|DELETE|router\.|href=" src/lib/services/surgery.service.ts src/lib/services/surgery-coordinator-read-model.ts src/lib/api/surgery-adapter.ts src/types/index.ts src/lib/api/backend-surgeries.ts src/hooks/useBackendActiveSurgeries.ts src/lib/store.ts src/components/coordinadores/coordination-ui-state.ts src/lib/services/personal-coordinator-resolver.service.ts src/lib/services/coordination-preview-capability.service.ts src/lib/services/coordination-view.service.ts src/lib/validators/coordination-view.validator.ts src/lib/api/coordination-view.ts src/app/api/companies/[companyId]/coordination/view/route.ts src/components/coordinadores/CoordinatorInboxView.tsx src/app/coordinadores/mi-bandeja/page.tsx src/app/coordinadores/page.tsx src/components/coordinadores/coordinator-queue.helpers.ts src/components/coordinadores/CoordinationStateSurface.tsx src/components/coordinadores/CoordinationSecondaryFilters.tsx src/components/coordinadores/preview/CoordinationPreviewRoot.tsx src/components/coordinadores/preview/CoordinationPreviewBanner.tsx src/components/coordinadores/preview/CoordinationPreviewControls.tsx src/components/coordinadores/preview/CoordinationPreviewCaseRow.tsx src/components/coordinadores/preview/CoordinationPreviewPersonal.tsx src/components/coordinadores/preview/CoordinationPreviewGlobal.tsx src/hooks/useCoordinationView.ts
```

Franco explicitly approved Option A for this change after the latest formal T5 run established the following immutable comparison baseline: global lint `1070` problems (`277` errors + `793` warnings); inside the complete T-1/T1–T4 Coordination allowlists `0` errors + `4` warnings; outside those allowlists `277` errors + `789` warnings. In the same run, the T5 focused suite passed `151/151`, the T2 suite `29/29`, the T3 suite `38/38`, the T4 suite `64/64`, global tests passed `128/128` files with `1434` passed, `10` skipped, and `0` failed, and TypeScript plus build passed.

The 45-entry `$coordinationLintPaths` array above is the exact union of every T-1 and T1–T4 source/test allowlist in §§4 and 6–9, including every newly created T4 preview, state, hook, and test path. Before linting, T5 must reconcile it one-for-one against those sections, reject duplicates, and hard-stop if any listed path is absent or any task allowlist path is missing; the count guard is an additional check, not authority to omit a path. `npx eslint -- $coordinationLintPaths` deliberately supplies no fix option and is the blocking lint gate: it must complete with zero errors. Its warnings remain visible and reported; the verified baseline is four.

`npm run lint` remains mandatory as an informational whole-repository report. Its non-zero exit is non-blocking only when T5 proves that every in-scope error count remains zero and the outside-allowlist result is fully attributable to the recorded external baseline of `277` errors + `789` warnings; any in-scope error, any outside-baseline increase, any lint issue caused by a task-owned delta, or any result that cannot be partitioned reproducibly is blocking. A reduction must be reported as debt reduction and must not be used to hide a new issue. This waiver is scoped solely to `COORDINATION-DEV-PREVIEW-001`; it neither accepts, approves, erases, nor generalizes the external repository lint debt.

The reviewer must:

1. map every SPEC requirement/scenario to automated evidence or T6 evidence;
2. verify from redacted attestations that T-3 enforced exact-one DB read-only resolution, ignored/untracked `.env.local`, exact preservation, rollback, non-disclosure, and zero tracked/DB mutation; then verify T-2's DB-enforced read-only capture, restrictive custody, canonical checksum validation, non-disclosure, and zero DB/repo mutation, plus T-1's exact baseline equality, deterministic baseline-derived partition, one transaction, first-run/no-op behavior, `2 / 8 / 8 / 5`, rollback matrix, cleanup-after-commit/abort, and zero production/foreign/schema effect, without inspecting server-only values, recovering the baseline, or rerunning a write;
3. rerun assignment union/dedupe tests proving `isPrimary` diagnostic-only and no source precedence;
4. rerun the exact configured-company-ID, denial, cross-company, malformed, stale, cache, actor, GET-only, and no-write matrices;
5. recursively inspect the complete preview import/render/navigation/network graph and prove zero mutation-capable descendants and only approved GET calls; do not look for or accept a selected-route mutation manifest;
6. compare paths with T0 baselines and prove no schema, migration, generalized seed/fixture/data, package/lockfile, Auth impersonation, mutation-route/guard, assignment-write feature, production selector, preview persistence, or unrelated source change entered the diff;
7. verify production data/authorization and normal global/personal derivations remain unchanged except for specified strict-personal, assignment-read, and honest-state behavior; and
8. classify unrelated pre-existing failures separately and do not repair them.

### Acceptance mapping

All requirements, with particular ownership of `BOOTSTRAP-01`–`BOOTSTRAP-09`, `SEC-01`–`SEC-06`, `REG-01`–`REG-05`, `OBS-01`–`OBS-04`, `READONLY-03A`–`READONLY-07`, `RO-1`, `RO-1A`, `RO-2`, `RG-1`–`RG-2`, and `OB-1`.

### Lock lifecycle and stop conditions

`CDP-L5: reserved → review → released`; no `editing` state. Release requires formal T5 PASS under the amended Coordination-allowlist lint gate and the scoped global-baseline rule above.

Stop release and return a Diagnose-formatted finding for any failed gate, bootstrap mismatch, non-target effect, union/source-precedence violation, client-controlled company gate, incomplete preview graph, mutation-capable descendant/navigation, non-GET preview request, protected-data disclosure, write/audit side effect, actor confusion, production preview exposure, unaccounted dirty delta, or regression. T6 may not start until T5 passes.

---

## 11. T6 — Authenticated desktop/mobile browser QA

### Task declaration

- **Task ID / Name:** `COORDINATION-DEV-PREVIEW-001-T6 / Authenticated browser QA`
- **Agent role:** Browser QA operator
- **Selected model:** `openai/gpt-5.6-sol`
- **Mode:** `testing, read-only`
- **Depends on:** formal T5 PASS under the amended lint gate, `CDP-L5` released, and approved exact DEV environment/session available
- **Scope:** verify real authenticated production-personal behavior and dedicated DEV read-only preview at desktop and `412x915` without changing data, identity, flags, or source.
- **Allowed files:** none for writing; read SDD/T5 evidence only.
- **Forbidden actions:** all repo/data/preference writes, test-data creation, Auth impersonation, client flag injection, env/deployment edits, production access, mutation requests, and PII-bearing evidence.
- **Output:** redacted browser/network evidence and Spanish Caveman handoff.
- **Expected handoff:** viewport/scenario matrix, accessibility/network evidence, zero-write confirmation, risks, and final go/no-go.

### Allowed command and environment

```powershell
npm run dev
```

Use a real Supabase-authenticated exact-role `admin` with existing access to the exact server-configured active `Districorr DEV` company. Server-only variables must already be configured by the approved owner; T6 may not inspect/disclose/edit them. Use only T-1's verified persisted `8 / 8 / 5` state.

### Browser validation gates

At representative desktop and exactly `412x915`:

1. verify direct-entry loading, populated, refresh, safe simulated initial/refresh error, true empty, filtered empty/clear, unresolved, and ambiguous states without writes;
2. verify production personal contains only the server-resolved coordinator and no selector/query/storage override or preview labels;
3. verify normal global access remains permission-governed, cross-coordinator, and company-scoped;
4. preview both `Nelson DEV` and `Ezequiel DEV` inboxes and the global panel, confirming persisted `8 / 8 / 5`, GET refetches, and persistent real-actor/view-subject/`Solo lectura` banner;
5. inspect network during subject/surface changes, filters, row inspection, retry, refresh, disclosure, and exit: preview issues GET only and performs no domain/preference/audit mutation;
6. verify row inspection remains inside the bounded preview summary and no action control, dialog, writable form, general Expediente/Cirugías workspace, or mutation-capable navigation is mounted/reachable;
7. verify stale target/capability denial clears preview rows and offers `Volver a mi bandeja` without gate/contact disclosure;
8. verify keyboard order, visible focus, accessible names/live regions, quick-filter scrolling, secondary-filter disclosure, `44x44` targets, banner legibility, and first populated result no later than the second mobile viewport;
9. verify no console errors and no actor/session/company change before, during, or after preview; and
10. capture redacted evidence only—no tokens, emails, patient details, coordinator lists beyond the two approved labels, company IDs, or server-only values.

### Acceptance mapping

SPEC §14.2; scenarios `PI-1`–`PI-4`, `GP-1`–`GP-2`, `DP-1`, `DP-3`–`DP-6`, `RO-1`, `RO-1A`, `RO-3`, `UX-1A`–`UX-4`, and production non-impact scenario `RG-2`.

### Lock lifecycle and stop conditions

`CDP-L6: reserved → review → released`; no source `editing` state.

Stop immediately for a non-GET preview request, mutation-capable descendant/control/navigation, cross-company/cross-subject data, wrong `8 / 8 / 5` result, missing actor/subject distinction, production selector/preview capability, stale preview rows presented as current, Auth/session/company change, unavailable real Supabase admin, or need to alter data/env/source. Return failures through Diagnose; do not fix in T6.

---

## 12. Dependency and acceptance matrix

| Requirement family | Implemented by | Verified by | Hard dependency |
| --- | --- | --- | --- |
| Exact DEV target resolution and local server configuration | T-3 | T-2, T5 | Franco approval + exclusive `CDP-LC` |
| Restricted exact DEV baseline capture/custody | T-2 | T-1, T5 | T-3 |
| Exact transactional DEV bootstrap and baseline cleanup | T-1 | T0, T5, T6 | T-2 custody transfer |
| Dirty-tree isolation and post-bootstrap evidence | T0 | T5 | T-1 |
| Assignment union/dedupe/DTO/adapter/client shape | T1 | T5, T6 | T0 |
| Backend loading, hydration, state precedence | T2 | T4, T5, T6 | T1 |
| Strict personal resolver/global separation | T3 | T5, T6 | T2 |
| Exact server-only company-ID gate/allowlist/GET API/cache | T3 | T5, T6 | T2 |
| Production personal UX | T4 | T5, T6 | T3 |
| Dedicated mutation-free preview presentation graph | T4 | T5, T6 | T3 |
| Responsive/accessibility hierarchy | T4 | T5, T6 | T3 |
| Full regression/prohibited-diff/production review | T5 | T6 go/no-go | T-3, T-2, T-1, T0–T4 |
| Real authenticated desktop/mobile evidence | T6 | final human review | T5 |

## 13. Final release gate

The change is not complete until T6 releases `CDP-L6` and the final handoff proves:

- exact Districorr DEV targeting through the mandatory server-only configured company ID and markers;
- T-3 resolved exactly one active target through a DB-enforced read-only query and configured only the three approved server-only values in ignored, untracked `.env.local`, preserving all unrelated entries without disclosure or tracked diff;
- one DB-enforced read-only capture produced the restricted external canonical 21-ID baseline and checksum with zero DB/repo mutation or user-visible values, then transferred custody only to T-1;
- one atomic idempotent bootstrap produced/reused exactly two contacts, `8 / 8` assignments, five unassigned surgeries, and no production/foreign/schema effect;
- T-1 proved exact element-for-element DB equality before writes, derived the deterministic `8 / 8 / 5` partition only from that sorted baseline, and securely cleaned the baseline after commit or abort with verified absence;
- persisted assignments survive service → DTO → adapter → hydration under the complete exact-ID union/dedupe contract, with `isPrimary` diagnostic-only;
- production personal identity is server-derived/fail-closed and production contains no selector or preview capability;
- DEV preview requires every exact server gate, preserves the real actor, receives GET-only presentation data, and renders only through a dedicated graph with no mutation-capable descendant or navigation target;
- loading/error/blocked/empty states are honest and desktop/mobile/accessibility requirements pass; and
- the final task-local diff contains no schema, migration, dependency, generalized data tooling, Auth impersonation, mutation-route/guard manifest, assignment-write feature, business-rule, persisted-preview, production-data, or unrelated dirty-work change.

**Recommended first APPLY task:** T-3 only. After its exact-one read-only resolution and restricted `.env.local` configuration pass and `CDP-LC` is released, run T-2 in a fresh process to consume the three server-only values. After T-2's read-only capture and restricted custody transfer pass, run T-1 exactly once; after T-1's atomic postcondition, automated no-op proof, and verified baseline cleanup pass, rerun T0 before reserving any read-path source file.
