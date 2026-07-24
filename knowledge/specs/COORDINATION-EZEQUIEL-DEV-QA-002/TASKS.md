# TASKS — COORDINATION-EZEQUIEL-DEV-QA-002

Status: amended for the final PASS DESIGN and Franco-authorized bounded productive scope. T0a and T1 remain completed/released evidence; T2 remains partial/released and must be migrated replacement-not-reset. No DB, T0b, server, browser, N=8 APPLY, or cleanup has run.

## Review workload forecast

| Field | Value |
| --- | --- |
| Estimated changed lines | 1,400–2,200 |
| Delivery strategy | `auto-chain` |
| Suggested split | W1 UUID authority → W2 eleven-path T2 replacement → W3 independent build/DCE review → W4 runtime/QA/cleanup |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

Review units authorize no Git write. If Git delivery is separately requested, PR 1 base is the tracker branch, PR 2 base is PR 1, and PR 3 base is PR 2; each child diff must contain only its own unit.

## 1. Authority, paths, and immutable boundaries

Approved root (`ROOT`): `C:\Users\franc\AppData\Local\Temp\opencode\coordination-ezequiel-dev-qa-002`.

- Immutable authority directory: `ROOT\authority\`; never create, rename, copy, hardlink, rewrite, delete, or ACL-change it.
- Exact authority file: `ROOT\authority\baseline.v1.candidate.json`.
- Approved unchanged-byte SHA-256: `c2221aa29cafa0cb0594da5b2a0638a892fc20ac9a9f50db9ff0929ec7d51782`.
- Runtime lock directory: `ROOT\locks\`; unused before the reviewed runtime runner exists.
- Runtime task-evidence directory: `ROOT\runs\<cryptographically-random-task-run-id>\` (`TASK_RUN`); unused by T0a/T1/T2.
- Runtime operation-chain directory: separate absent-before-create `ROOT\runs\<cryptographically-random-operation-run-id>\` (`OP_RUN`), established by T4 and reused by T6/T7.
- Post-T2 task handoff evidence: `TASK_RUN\handoffs\<exact-task-id>.json`. T0a/T1/T2 instead use the exact orchestrator handoff record in §2; the strict repository allowlist contains no worklog file, so no repository worklog write is allowed.

`OP_RUN` writes are limited to `manifest.json`, `events\<zero-padded-sequence>-<state>.json`, `reconciliation\<operation>.json`, `audits\<operation>.json`, `custody-hold.json`, and `custody-release.json`. `TASK_RUN` writes are limited to `preflight-attestation.json`, `final-preflight-attestation.json`, `inventory\<task-id>.json`, `bundle-scan\<task-id>.json`, `handoffs\<task-id>.json`, and task-specific browser/review paths declared below. Sequence/state names are derived from the validated chain, never user input; no other external file is permitted.

The exact eleven-path repository source/test allowlist is:

- preserve/modify partial `src/lib/services/coordination-ezequiel-dev-overlay.service.ts`;
- preserve/modify partial `scripts/dev/coordination-ezequiel-dev-overlay.ts`;
- preserve/modify partial `src/__tests__/unit/coordination-ezequiel-dev-overlay.service.test.ts`;
- preserve/modify partial `src/__tests__/integration/coordination-ezequiel-dev-overlay.test.ts`;
- preserve/modify partial `e2e/coordination-ezequiel-dev-qa.spec.ts`;
- preserve/modify partial `src/__tests__/components/CoordinatorInboxView.test.tsx`;
- modify `src/lib/api/surgery-adapter.ts`;
- modify `src/components/coordinadores/coordination-filtering.ts`;
- modify `src/components/coordinadores/CoordinatorInboxView.tsx`;
- modify `src/__tests__/unit/backend-active-surgeries-adapter.test.ts`;
- modify `src/__tests__/unit/coordination-filtering.test.ts`.

All other repository paths are read-only except declared generated outputs. Explicitly forbidden: `src/hooks/useCoordinationView.ts`, every preview component/surface/banner/root, schema/migrations/seeds, Auth, API/routes/services/permissions beyond the overlay service, package/lockfile, current bootstrap, Remitos, store/base types, and any general lifecycle/pending rule. `uuid@11.1.0` is already installed; no dependency resolution/install/update is allowed. Package-manager caches are forbidden/unneeded except normal read access by the exact approved `npm run build`; no production/foreign-company operation is allowed.

### 1.1 Preserved T0a/T1 and partial T2 evidence

- T0a and T1 remain completed with `CEQ-L0A`/`CEQ-L1` released; do not rerun/reset them unless authority or owned bytes drift.
- T2 remains PARTIAL, not PASS; old `CEQ-L2` is released. Prior `58/58` evidence is historical only and cannot satisfy the amended eleven-path gate.
- Accepted replacement baselines: service `70F04E4403E084539AAB4BE8D0387BAEE2BCBDA1E364BB02EA90D304122C9DBE`; runner `F789B3BC2DFDCD7B0DCCAE9E6FC44B1585A92681E7DF322866F7BF341C03BD93`; unit test `6386C2B0B6BC7B37CE04869EA65BE9727F06B8C3F536B226E6774EF399178D7E`; integration test `2E8FCF6C018B30337733F28135F34CAE05367A52D6B21BD66104C63CF2C5FD5B`; E2E `8CBAF00FAF037D08300B7A86B014B90262CA536120610D4D08BDB4920653DE3C`; component test `CBB3E75274BDB0615E898AF15A59EB4161AB14C5A46F7E49C045E72D4CD0181A`; generated `next-env.d.ts` baseline `4E4DA12AA061AAC172FB1BCB48E9B6E4B293080D2F494327925FDBA8F39632AC`.
- New `CEQ-L2R` is the single resumed implementation lock over all eleven paths. Before editing, require every accepted six-path hash and `next-env.d.ts` hash above, record the five newly authorized paths' current hashes, then preserve valid partial work and surgically replace random Surgery IDs, prior finalized/eligibility flags, preview discovery, and unanchored notes. Never delete/recreate/reset/revert the partial delta.

### 1.2 Frozen UUIDv5 Surgery identity authority

Algorithm is exact `UUIDv5/SHA-1`; namespace is standard URL `6ba7b811-9dad-11d1-80b4-00c04fd430c8`; implementation import is `import { v5 as uuidv5 } from "uuid"` from installed `uuid@11.1.0`.

| Key | Exact canonical name | Lowercase Surgery UUID |
| --- | --- | --- |
| A | `urn:ossum-cor:coordination-ezequiel-dev-qa-002:surgery:A` | `c9590681-82d3-5430-833a-325739743862` |
| B | `urn:ossum-cor:coordination-ezequiel-dev-qa-002:surgery:B` | `48b74ece-07b2-549a-941a-8d1fce013449` |
| C | `urn:ossum-cor:coordination-ezequiel-dev-qa-002:surgery:C` | `9f408eac-a9d5-5153-b604-f8e29f51b32a` |
| D | `urn:ossum-cor:coordination-ezequiel-dev-qa-002:surgery:D` | `7d243a45-c030-5b07-a28f-7d9b271cd6a5` |
| E | `urn:ossum-cor:coordination-ezequiel-dev-qa-002:surgery:E` | `f6a783a6-2b26-5568-b9f7-949e7c42e515` |
| F | `urn:ossum-cor:coordination-ezequiel-dev-qa-002:surgery:F` | `78173716-30b2-5367-b027-d87685f80c9d` |
| G | `urn:ossum-cor:coordination-ezequiel-dev-qa-002:surgery:G` | `b318570e-2007-545c-9dd6-75182343c88f` |
| H | `urn:ossum-cor:coordination-ezequiel-dev-qa-002:surgery:H` | `0d2ad460-cba6-540e-9ca3-521af69a21b6` |

Fixed-order minified UTF-8 authority bytes are exactly:

```json
{"algorithm":"UUIDv5/SHA-1","namespace":"6ba7b811-9dad-11d1-80b4-00c04fd430c8","entries":[{"stableKey":"A","name":"urn:ossum-cor:coordination-ezequiel-dev-qa-002:surgery:A","surgeryId":"c9590681-82d3-5430-833a-325739743862"},{"stableKey":"B","name":"urn:ossum-cor:coordination-ezequiel-dev-qa-002:surgery:B","surgeryId":"48b74ece-07b2-549a-941a-8d1fce013449"},{"stableKey":"C","name":"urn:ossum-cor:coordination-ezequiel-dev-qa-002:surgery:C","surgeryId":"9f408eac-a9d5-5153-b604-f8e29f51b32a"},{"stableKey":"D","name":"urn:ossum-cor:coordination-ezequiel-dev-qa-002:surgery:D","surgeryId":"7d243a45-c030-5b07-a28f-7d9b271cd6a5"},{"stableKey":"E","name":"urn:ossum-cor:coordination-ezequiel-dev-qa-002:surgery:E","surgeryId":"f6a783a6-2b26-5568-b9f7-949e7c42e515"},{"stableKey":"F","name":"urn:ossum-cor:coordination-ezequiel-dev-qa-002:surgery:F","surgeryId":"78173716-30b2-5367-b027-d87685f80c9d"},{"stableKey":"G","name":"urn:ossum-cor:coordination-ezequiel-dev-qa-002:surgery:G","surgeryId":"b318570e-2007-545c-9dd6-75182343c88f"},{"stableKey":"H","name":"urn:ossum-cor:coordination-ezequiel-dev-qa-002:surgery:H","surgeryId":"0d2ad460-cba6-540e-9ca3-521af69a21b6"}]}
```

SHA-256 is `e742282463489eaaa3035be3a63a1b0c929b9b26916658e249f777cd94ae2e52`. Franco's standing `N=8` implementation authorization approves these initial implementation IDs only after `T-ID` independently reproduces all eight UUIDs, canonical bytes, and digest with zero DB/network/file writes. Any future algorithm/namespace/name/byte/UUID/digest change stops and requires explicit Franco reapproval.

## 2. Separate coordination and runtime locks

### 2.1 AGENTS-visible orchestrator lock register

Repository/file ownership is coordinated only by the orchestrator record; it is not a filesystem or DB lock and claims no `LockStore`, DACL, fsync, checksum, PID, or stale-recovery guarantee. One register row contains exact `lockId`, task ID, owner role/model, scope, repository files/generated outputs/external evidence paths, state, timestamp, and predecessor handoff. States are `reserved → editing → review → released`; read-only/review/QA uses `reserved → review → released`. The orchestrator records each transition before work continues, refuses a second non-released row, and starts no successor until the predecessor's Spanish Caveman handoff records `released`. No helper or repository file is needed.

| Lock | Task | Exact ownership summary |
| --- | --- | --- |
| `CEQ-L0A` | T0a | static repository/authority reads; orchestrator handoff only |
| `CEQ-L1` | T1 | completed/released service, runner, unit evidence |
| `CEQ-L2` | historical T2 | partial six-path transfer, released; never reopen |
| `CEQ-LID` | T-ID | pure UUID authority generation/review; no repository/DB write |
| `CEQ-L2R` | T2R | one resumed replacement lock over exact eleven paths/generated outputs |
| `CEQ-L3` | T3 | independent read-only source review/validation outputs |
| `CEQ-L0B` | T0b | runtime preflight attestation and read-only DB scope |
| `CEQ-L4` | T4 | exact A–H create/reconcile runtime scope |
| `CEQ-L5` | T5 | controlled server/browser QA outputs |
| `CEQ-L6` | T6 | exact no-op/reconcile runtime scope |
| `CEQ-L7` | T7 | exact cleanup or custody-hold scope |
| `CEQ-L8` | T8 | final read-only verification/attestation scope |

`CEQ-LID` is a read-only coordination/review row with no file ownership. `CEQ-L2R` is the single new implementation/file-ownership lock; it replaces but never reopens historical `CEQ-L2`.

T-ID/T2R handoff format in the orchestrator record is exactly: `Lock: <CEQ-L*>; Task: <exact ID>; Owner: <role/model>; Scope: <exact scope>; Files: <exact paths>; State: released; Done/Changed/Files/Validations/Risks/Next`. Historical T0a/T1/T2 records remain unchanged. This coordination record performs no runtime evidence or DB operation and creates no helper/file.

### 2.2 Runtime `LockStore`

T1 implemented/unit-tested runtime `LockStore`; T2R preserves it and completes amended integration tests; T3 independently reviews it. Only after T3 has completed source review and recorded GO may T3's final inventory/handoff and T0b/later runtime commands touch `ROOT\runs\**`, runtime evidence, or DB. Each such command internally acquires exact `ROOT\locks\operation.lock` with atomic CreateNew JSON containing host, PID, process start-time, run-id, operation, nonce, timestamp, authority digest, chain anchor, and checksum; it uses current-user/SYSTEM-only DACL, sync/readback, owner/nonce transitions, and always releases after preflight/create/noop/reconcile/cleanup/custody-hold completes or fails terminally. No standalone lock-transition helper is exposed.

Contention stops. Only `--mode reconcile` may recover runtime `operation.lock` after ≥15 minutes when same-host PID is absent/start-time differs and owner/run-id/nonce/paths/checksum/ACL/authority validate. For create crashing before its first event, `OP_RUN` must be absent and no chain is required: atomically rename the exact lock to `ROOT\locks\recovered-operation-<run-id>-<nonce>.json`, sync/read back separate recovery evidence, then CreateNew the retry lock. Evidence-only modes instead require their exact next `TASK_RUN` output absent and all existing task evidence valid. Live, reused-PID, foreign-host, young, existing create `OP_RUN`, ambiguous, or unverifiable locks stop. Authority remains immutable.

## 3. Commands and generated-output contract

Exact local executable inventory is `.\node_modules\.bin\vitest.cmd`, `next.cmd`, `tsc.cmd`, `tsx.cmd`, `playwright.cmd`, PATH-resolved `node.exe` for T-ID only, and the repository's exact `npm run build` script (`next build --webpack`). Tasks below provide every literal invocation; placeholders and command aliases are forbidden. `vitest.cmd` always receives `--no-cache`.

T2R implements/tests and T3 reviews these exact bounded runner modes: `inventory`, `handoff`, `server-start`, `server-stop`, and `bundle-scan`. `bundle-scan --build-root .next --stdout-only` performs a pure local read of generated artifacts and writes nothing; after T3 source review GO, task-id-bound `bundle-scan` writes only `TASK_RUN\bundle-scan\<task-id>.json`. Other runtime modes retain their prior exact outputs/LockStore rules. Orchestrator `CEQ-L*` transitions remain record-only.

After T3 GO, the orchestrator supplies a cryptographically random task run ID only through protected process environment `OSSUM_COORDINATION_RUN_ID`; T4 additionally establishes protected `OSSUM_COORDINATION_OPERATION_RUN_ID`, reused unchanged by T6/T7 for the same manifest chain. Commands using `$TASK_RUN` first set `$TASK_RUN = Join-Path 'C:\Users\franc\AppData\Local\Temp\opencode\coordination-ezequiel-dev-qa-002\runs' $env:OSSUM_COORDINATION_RUN_ID` without output. Missing, reused-for-wrong-task, client-supplied, equal task/operation IDs, or mismatched IDs stop.

`next typegen`, `npm run build`, and controlled `next dev` may write `.next\**` and `next-env.d.ts`; build may also write generated manifests/maps/bundles only under `.next\**`. These generated outputs are task-owned and inventoried before/after; any unknown pre-existing ownership stops. `tsc --incremental false` creates no `.tsbuildinfo`; Vitest creates no coverage/snapshot/cache output. Playwright outputs remain external as previously bounded. T2R/T3/T8 may additionally write only `TASK_RUN\bundle-scan\<task-id>.json` after reviewed-mode eligibility.

Exact repository inspection commands use all eleven allowlist paths:

```powershell
git status --short --untracked-files=all -- src/lib/services/coordination-ezequiel-dev-overlay.service.ts scripts/dev/coordination-ezequiel-dev-overlay.ts src/__tests__/unit/coordination-ezequiel-dev-overlay.service.test.ts src/__tests__/integration/coordination-ezequiel-dev-overlay.test.ts e2e/coordination-ezequiel-dev-qa.spec.ts src/__tests__/components/CoordinatorInboxView.test.tsx src/lib/api/surgery-adapter.ts src/components/coordinadores/coordination-filtering.ts src/components/coordinadores/CoordinatorInboxView.tsx src/__tests__/unit/backend-active-surgeries-adapter.test.ts src/__tests__/unit/coordination-filtering.test.ts
git diff -- src/lib/services/coordination-ezequiel-dev-overlay.service.ts scripts/dev/coordination-ezequiel-dev-overlay.ts src/__tests__/unit/coordination-ezequiel-dev-overlay.service.test.ts src/__tests__/integration/coordination-ezequiel-dev-overlay.test.ts e2e/coordination-ezequiel-dev-qa.spec.ts src/__tests__/components/CoordinatorInboxView.test.tsx src/lib/api/surgery-adapter.ts src/components/coordinadores/coordination-filtering.ts src/components/coordinadores/CoordinatorInboxView.tsx src/__tests__/unit/backend-active-surgeries-adapter.test.ts src/__tests__/unit/coordination-filtering.test.ts
git diff --check -- src/lib/services/coordination-ezequiel-dev-overlay.service.ts scripts/dev/coordination-ezequiel-dev-overlay.ts src/__tests__/unit/coordination-ezequiel-dev-overlay.service.test.ts src/__tests__/integration/coordination-ezequiel-dev-overlay.test.ts e2e/coordination-ezequiel-dev-qa.spec.ts src/__tests__/components/CoordinatorInboxView.test.tsx src/lib/api/surgery-adapter.ts src/components/coordinadores/coordination-filtering.ts src/components/coordinadores/CoordinatorInboxView.tsx src/__tests__/unit/backend-active-surgeries-adapter.test.ts src/__tests__/unit/coordination-filtering.test.ts
```

No inline evaluation except the exact offline/no-write T-ID command, arbitrary DB probe, direct SQL/`psql`, Prisma Studio, migration/push/reset/seed, dependency command, generic import/backfill/delete/cleanup script, or production deployment command is allowed. `npm run build` is the sole package-script execution exception.

### 3.1 Production DCE/bundle-scan gate

T2R must implement exact runner mode `bundle-scan`. After `npm run build`, invoke `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode bundle-scan --build-root .next --stdout-only`; T3/T8 use the same mode with their exact `--task-id`. Scan every emitted `.next\static\**`, `.next\server\**`, source map, build/app/pages manifest, and text bundle for: `coordination-ezequiel-dev-qa-002`, `coord-ezequiel-qa-002:`, `urn:ossum-cor:coordination-ezequiel-dev-qa-002:surgery:`, all eight frozen UUIDs, identity/matrix/fixture digests, envelope keys `idAuthorityDigest`/`matrixDigest`, and exact symbols `parseCoordinationEzequielDevEnvelope`, `coordinationEzequielDevDiagnostic`, `acceptCoordinationEzequielDevFacts`.

Production client artifacts must contain zero forbidden occurrences. Any unexpected retained synthetic parser/diagnostic/marker in server/app output also fails closed. The scanner records path, marker, count, artifact class, and aggregate scan digest without printing bundle contents. No allowlist exception or waiver is permitted; retained code requires redesign before T0b.

## 4. Evidence and REQ-07 contract

`TASK_RUN\preflight-attestation.json` and `TASK_RUN\final-preflight-attestation.json` are post-auth attestations outside the manifest and hash chain. Their exact schema is `{schemaVersion, kind, taskId, runId, actorUserId, companyId, projectRef, deploymentTier, baselineDigest, checkedAt, checks, result, attestationDigest}` where `kind` is `preflight-attestation` or `final-preflight-attestation`, `result` is `PASS|FAIL`, and no `status`, `state`, `previousHash`, `manifestHash`, sequence number, or manifest-state value is permitted. Pre-auth failure writes no attestation and emits only a fixed process code. Attestations never reserve ownership. The canonical chain begins only with `prepared`, attributable `rejected`, or exact-overlay `noop` during create/cleanup operations; a standalone preflight never appends an event.

Every attributable external event (`prepared`, `applied`, `failed-zero`, `applied-unknown`, `rejected`, `noop`, `cleanup-prepared`, `cleaned`, `cleanup-unknown`) contains explicit `actorUserId`, `companyId`, `projectRef`, `deploymentTier`, `baselineDigest`, `runId`, `operationId`, action, state/outcome, event and operation timestamps, `manifestHash`, `previousHash`, deterministic A–H keys, relevant intended/observed row/assignment IDs and audit refs, and a fixed redacted `errorCode`; never token, credential, DSN, PII, clinical data, or dynamic ID on stdout. A rejection before operator authentication is non-attributable, creates no run/manifest/event, and emits only a fixed process error code.

The canonical external event evidence is the complete immutable hash chain; attestations, inventories, handoffs, and custody markers remain separately digested artifacts outside it. DB `AuditEvent` rows are created only inside the successful Serializable create transaction (`applied` audit refs) and successful Serializable cleanup transaction (`cleaned` cleanup refs), with the authenticated operator as `userId`; `prepared`, `failed-zero`, `applied-unknown`, `rejected`, `noop`, `cleanup-prepared`, and `cleanup-unknown` are external-only and must perform zero audit/domain writes. Reconciliation reads DB/audits, verifies external intended/observed IDs and refs, and appends the correct external terminal event; it never invents actor/company identity or silently repairs domain rows.

### 4.1 DEV parser, context, identity, manifest, audit, and cleanup pins

- Runner parsing is closed-world: exact modes/flags only, no duplicate/unknown positional or client-controlled authority arguments. `preflight|create|reconcile|cleanup|custody-hold` require `NODE_ENV === "development"`, approved deployment/project/company environment, authenticated operator, and protected run IDs; production is inert/fail-closed before DB/evidence mutation.
- `source` is exactly `coord-ezequiel-qa-002:A` through `:H`; no generic marker/inference is allowed. `Surgery.notes` canonical UTF-8 bytes use exact ordered keys `{schemaVersion,package,stableKey,surgeryId,cxName,company,target,baselineDigest,idAuthorityDigest,matrixDigest,metrics,availabilityDate,pending,checksum}`.
- `surgery-adapter.ts` performs a direct `process.env.NODE_ENV === "development"` guard before parsing. It requires canonical bytes, v1, checksum, exact frozen backend UUID/key/source, baseline/identity/matrix digests, and allowed values; production returns no facts. The diagnostic remains adapter-local and inert.
- `CoordinatorInboxView.tsx` independently requires development, authenticated productive personal mode/surface, accepted current context, exact DEV company marker, exact resolved Ezequiel subject, exact assignment to that contact, active base eligibility, and full UUID/envelope/matrix match. Preview/global/wrong tenant/subject/unowned/tampered cases render no category and only fixed sanitized code plus A–H key. No dynamic company/contact/user ID is compiled.
- `coordination-filtering.ts` consumes direct accepted A–D memberships only after the conjunction above; E–H have none. Existing authorization, subject/tenant/base eligibility, AND, dedupe, advanced predicates, and lifecycle remain unchanged.
- Prepared manifest pins the eight exact UUIDs and ordered `{stableKey,source,canonicalEnvelopeBytes,sha256}` plus baseline, identity, matrix, and fixture aggregate digests before DB work. Create sets each explicit Surgery PK; no random/adopted/company-derived Surgery ID is permitted.
- T0b globally queries all eight PKs and requires absence. Create repeats global absence inside Serializable transaction; any preexisting/racing/other-tenant PK is collision, writes zero rows/audits, never adopts, and stops.
- Applied/noop/reconcile/audit acceptance requires exact PK/key/source/bytes/digests/company/Ezequiel assignment, prepared/applied manifest, and operator AuditEvent. Checksum alone never proves ownership.
- Cleanup validates the same conjunction and exact DB bytes for all eight before deleting anything; one drift/tamper/collision/owner mismatch causes zero delete/zero partial cleanup. Successful cleanup deletes only manifested rows/assignments, records cleanup audit evidence, and independently restores `21/8/8/5`.

## 5. Serialized execution and task declarations

Mandatory order is `T0a[completed] → T1[completed] → T-ID → T2R → T3 → T0b → T4 → T5 → T6 → T7 → T8`. Historical T2 remains partial/released and is replaced by T2R, never reset. Every active predecessor releases its `CEQ-L*` row and provides Spanish Caveman before the successor reserves. Unknown/active ownership or accepted-hash drift stops; existing dirty work is never reverted, formatted, staged, committed, cleaned, or absorbed.

Any failed test, typecheck, runner, reconciliation, server, or browser flow enters Diagnose (`Reproduce → Scope → Evidence → Hypothesis → Minimal Fix → Validate → Regression Check → Handoff`). Review/QA returns defects to the owning writer and never edits. Out-of-allowlist fixes, untruthful operator attribution, unverifiable custody, scope expansion, or non-fail-closed cleanup stop for Franco.

### T0a — Preserved static authority/hash/path/ownership evidence

- **Declaration/evidence:** `COORDINATION-EZEQUIEL-DEV-QA-002-T0A`; `CEQ-L0A`; completed/released. Preserve its exact authority path/digest/ACL/static ownership evidence; do not rerun or rewrite it during this amendment.

### T1 — Preserved reviewed runner/LockStore foundation

- **Declaration/evidence:** `COORDINATION-EZEQUIEL-DEV-QA-002-T1`; `CEQ-L1`; completed/released. Preserve accepted LockStore/authority/chain foundation and historical tests; T2R may replace only superseded partial implementation under the new contract.

### T-ID — Pure deterministic UUIDv5 generation and independent review

- **Declaration:** `COORDINATION-EZEQUIEL-DEV-QA-002-T-ID`; `CEQ-LID`; Independent identity reviewer; `openai/gpt-5.6-sol`; pure offline read-only generation/review. Own only the orchestrator record; no repository/generated/DB/network/runtime evidence write.
- **Command:** `$payload='KGFzeW5jKCk9Pntjb25zdCB7djU6dXVpZHY1fT1hd2FpdCBpbXBvcnQoInV1aWQiKTtjb25zdCB7Y3JlYXRlSGFzaH09YXdhaXQgaW1wb3J0KCJub2RlOmNyeXB0byIpO2NvbnN0IGFsZ29yaXRobT0iVVVJRHY1L1NIQS0xIixuYW1lc3BhY2U9dXVpZHY1LlVSTCxrZXlzPVsuLi4iQUJDREVGR0giXSxwcmVmaXg9InVybjpvc3N1bS1jb3I6Y29vcmRpbmF0aW9uLWV6ZXF1aWVsLWRldi1xYS0wMDI6c3VyZ2VyeToiO2lmKG5hbWVzcGFjZSE9PSI2YmE3YjgxMS05ZGFkLTExZDEtODBiNC0wMGMwNGZkNDMwYzgiKXRocm93IG5ldyBFcnJvcigiTkFNRVNQQUNFX01JU01BVENIIik7Y29uc3QgZW50cmllcz1rZXlzLm1hcChzdGFibGVLZXk9Pntjb25zdCBuYW1lPXByZWZpeCtzdGFibGVLZXk7cmV0dXJue3N0YWJsZUtleSxuYW1lLHN1cmdlcnlJZDp1dWlkdjUobmFtZSxuYW1lc3BhY2UpfX0pLGNhbm9uaWNhbD1KU09OLnN0cmluZ2lmeSh7YWxnb3JpdGhtLG5hbWVzcGFjZSxlbnRyaWVzfSksZGlnZXN0PWNyZWF0ZUhhc2goInNoYTI1NiIpLnVwZGF0ZShjYW5vbmljYWwsInV0ZjgiKS5kaWdlc3QoImhleCIpO2NvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHtjYW5vbmljYWwsZGlnZXN0fSkpfSkoKS5jYXRjaCgoKT0+e2NvbnNvbGUuZXJyb3IoIklERU5USVRZX1JFVklFV19GQUlMRUQiKTtwcm9jZXNzLmV4aXRDb2RlPTF9KQ=='; $scriptBytes=[Convert]::FromBase64String($payload); $scriptHash=[BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash($scriptBytes)).Replace('-','').ToLowerInvariant(); if($scriptHash -ne 'a38adebaeed33f542149d2716e7a16c8039ce3a30639cc2c1bbaea3538fc3aa6'){throw 'IDENTITY_SCRIPT_HASH_MISMATCH'}; $node=(Get-Command node.exe -ErrorAction Stop).Source; & $node -e "eval(Buffer.from('$payload','base64').toString('utf8'))"; if($LASTEXITCODE -ne 0){throw 'IDENTITY_REVIEW_FAILED'}`.
- **Gate/handoff:** require decoded-script SHA-256 `a38adebaeed33f542149d2716e7a16c8039ce3a30639cc2c1bbaea3538fc3aa6`, exact byte equality with §1.2, all eight lowercase UUIDs, and digest `e742282463489eaaa3035be3a63a1b0c929b9b26916658e249f777cd94ae2e52`; inspect command/output independently, record `CEQ-LID reserved → review → released`, and emit no value beyond canonical authority/digest. PASS activates Franco's standing approval for these initial IDs; any mismatch/change stops for reapproval before T2R.

### T2R — Eleven-path productive replacement of partial T2

- **Declaration:** `COORDINATION-EZEQUIEL-DEV-QA-002-T2R`; `CEQ-L2R`; Backend/productive UI implementer; `openai/gpt-5.6-sol`; replacement-not-reset implementation/testing with no live DB/T0b/server/browser/runtime operation. Own exactly eleven paths, `.next\**`, and `next-env.d.ts`; no other path.
- **Commands:** `$expected=@{'src/lib/services/coordination-ezequiel-dev-overlay.service.ts'='70F04E4403E084539AAB4BE8D0387BAEE2BCBDA1E364BB02EA90D304122C9DBE';'scripts/dev/coordination-ezequiel-dev-overlay.ts'='F789B3BC2DFDCD7B0DCCAE9E6FC44B1585A92681E7DF322866F7BF341C03BD93';'src/__tests__/unit/coordination-ezequiel-dev-overlay.service.test.ts'='6386C2B0B6BC7B37CE04869EA65BE9727F06B8C3F536B226E6774EF399178D7E';'src/__tests__/integration/coordination-ezequiel-dev-overlay.test.ts'='2E8FCF6C018B30337733F28135F34CAE05367A52D6B21BD66104C63CF2C5FD5B';'e2e/coordination-ezequiel-dev-qa.spec.ts'='8CBAF00FAF037D08300B7A86B014B90262CA536120610D4D08BDB4920653DE3C';'src/__tests__/components/CoordinatorInboxView.test.tsx'='CBB3E75274BDB0615E898AF15A59EB4161AB14C5A46F7E49C045E72D4CD0181A';'next-env.d.ts'='4E4DA12AA061AAC172FB1BCB48E9B6E4B293080D2F494327925FDBA8F39632AC'};foreach($p in $expected.Keys){if((Get-FileHash -Algorithm SHA256 -LiteralPath $p).Hash -ne $expected[$p]){throw "ACCEPTED_HASH_DRIFT:$p"}}`; `Get-FileHash -Algorithm SHA256 -LiteralPath @('src/lib/api/surgery-adapter.ts','src/components/coordinadores/coordination-filtering.ts','src/components/coordinadores/CoordinatorInboxView.tsx','src/__tests__/unit/backend-active-surgeries-adapter.test.ts','src/__tests__/unit/coordination-filtering.test.ts')`; execute all three literal eleven-path Git commands in §3; `.\node_modules\.bin\vitest.cmd run .\src\__tests__\unit\coordination-ezequiel-dev-overlay.service.test.ts .\src\__tests__\integration\coordination-ezequiel-dev-overlay.test.ts .\src\__tests__\components\CoordinatorInboxView.test.tsx .\src\__tests__\unit\backend-active-surgeries-adapter.test.ts .\src\__tests__\unit\coordination-filtering.test.ts --no-cache`; `.\node_modules\.bin\next.cmd typegen`; `.\node_modules\.bin\tsc.cmd --noEmit --incremental false`; `npm run build`; `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode bundle-scan --build-root .next --stdout-only`; then execute the literal eleven-path `git diff --check` from §3.
- **Implementation gate:** replace random Surgery IDs with §1.2 UUIDs; make A–H active; replace preview discovery/unanchored notes with §4.1 parser/context/envelope contract; keep preview/`useCoordinationView` untouched; add `bundle-scan`; preserve valid partial LockStore/evidence/server lifecycle. Production parser test must force `NODE_ENV=production` and return no facts.
- **Tests/gate:** add deterministic UUID/digest, initial/global/racing/other-tenant collision no-adopt, envelope checksum/bytes/ID/source/digest tamper, wrong tenant/subject/assignment/preview/global context, manifest/audit drift, noop/reconcile, cleanup whole-operation zero-delete, active A–H direct memberships, active E/F/G/H disclosure/H-none, keyboard/touch/focus, and zero mutation tests covering SC-01–11/REQ-01–10. Build and scan must PASS with zero forbidden production artifacts. Release `CEQ-L2R` only with exact eleven-path hashes/diff and replacement-not-reset Caveman.

### T3 — Independent source/security review; no live access

- **Declaration:** `COORDINATION-EZEQUIEL-DEV-QA-002-T3`; `CEQ-L3`; Independent reviewer; `openai/gpt-5.6-sol`; read-only full eleven-path security/productive/DCE review. Own generated `.next\**`/`next-env.d.ts`, `TASK_RUN\inventory\COORDINATION-EZEQUIEL-DEV-QA-002-T3.json`, `TASK_RUN\bundle-scan\COORDINATION-EZEQUIEL-DEV-QA-002-T3.json`, and `TASK_RUN\handoffs\COORDINATION-EZEQUIEL-DEV-QA-002-T3.json`; source remains read-only.
- **Commands:** `.\node_modules\.bin\vitest.cmd run .\src\__tests__\unit\coordination-ezequiel-dev-overlay.service.test.ts .\src\__tests__\integration\coordination-ezequiel-dev-overlay.test.ts .\src\__tests__\components\CoordinatorInboxView.test.tsx .\src\__tests__\unit\backend-active-surgeries-adapter.test.ts .\src\__tests__\unit\coordination-filtering.test.ts --no-cache`; `.\node_modules\.bin\next.cmd typegen`; `.\node_modules\.bin\tsc.cmd --noEmit --incremental false`; `npm run build`; all three literal eleven-path Git commands in §3; after source-review GO, `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode inventory --task-id COORDINATION-EZEQUIEL-DEV-QA-002-T3`; `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode bundle-scan --build-root .next --task-id COORDINATION-EZEQUIEL-DEV-QA-002-T3`; `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode handoff --task-id COORDINATION-EZEQUIEL-DEV-QA-002-T3`.
- **Gate/handoff:** independently verify §1.2 authority, all §4.1 conjunctions, production inert parser/direct DCE, no preview/useCoordinationView change, exact eleven-path scope, partial replacement provenance, collision/race/tenant/tamper zero-write behavior, transactions/audits/cleanup, active productive E–H, and all tests/build/scan. Any defect returns via Diagnose to T2R and repeats T3; only signed GO permits T0b.

### T0b — Exact tracked live preflight, read-only

- **Declaration:** `COORDINATION-EZEQUIEL-DEV-QA-002-T0B`; `CEQ-L0B`; Authenticated DEV preflight operator; `openai/gpt-5.6-sol`; read-only DB plus attestation outside the chain. Own `TASK_RUN\inventory\COORDINATION-EZEQUIEL-DEV-QA-002-T0B.json`, `TASK_RUN\preflight-attestation.json`, and `TASK_RUN\handoffs\COORDINATION-EZEQUIEL-DEV-QA-002-T0B.json`; no repository/generated output.
- **Commands:** `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode inventory --task-id COORDINATION-EZEQUIEL-DEV-QA-002-T0B`; `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode preflight --read-only --task-id COORDINATION-EZEQUIEL-DEV-QA-002-T0B`; `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode handoff --task-id COORDINATION-EZEQUIEL-DEV-QA-002-T0B`.
- **Gate/handoff:** under transient runtime `operation.lock`, authenticate bearer and prove exact operator/access, DEV/project/company/target/authority, exact ordered `21/8/8/5`, and global absence of every §1.2 UUID in DB-enforced read-only mode. Any one PK in any tenant is `GLOBAL_SURGERY_ID_COLLISION`, writes no event/domain/audit, is never adopted, and stops for Franco. Attestation pins baseline/identity digest and collision result; release runtime lock on PASS/FAIL before `CEQ-L0B`.

### T4 — Authorized DEV create N=8 and immediate reconciliation

- **Declaration:** `COORDINATION-EZEQUIEL-DEV-QA-002-T4`; `CEQ-L4`; Authorized DEV operator; `openai/gpt-5.6-sol`; bounded implementation execution. Own `TASK_RUN\inventory\COORDINATION-EZEQUIEL-DEV-QA-002-T4.json`, `TASK_RUN\handoffs\COORDINATION-EZEQUIEL-DEV-QA-002-T4.json`, and separate `OP_RUN\manifest.json`, canonical `events\**`, `reconciliation\create.json`, `audits\create.json`; no repository/generated output.
- **Commands:** `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode inventory --task-id COORDINATION-EZEQUIEL-DEV-QA-002-T4`; `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode create`; `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode reconcile`; `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode handoff --task-id COORDINATION-EZEQUIEL-DEV-QA-002-T4`.
- **Gate/handoff:** each runtime command internally acquires/releases `operation.lock`; durable prepared authority pins all eight UUIDs, exact source/envelope bytes and row hashes plus baseline/identity/matrix/fixture digests before DB. Serializable create globally rechecks all UUIDs absent, explicitly creates those PKs and exact Ezequiel assignments/audits, and commits only at `29/16/8/5`. Any race/collision/other-tenant row rolls back all. Applied/reconcile repeat IDs/bytes/digests/ownership/audit refs; uncertainty preserves evidence but never a live lock and stops before QA.

### T5 — Controlled authenticated desktop/mobile browser QA

- **Declaration:** `COORDINATION-EZEQUIEL-DEV-QA-002-T5`; `CEQ-L5`; Browser QA operator; `openai/gpt-5.6-sol`; QA with read-only product interactions. Own `TASK_RUN\inventory\COORDINATION-EZEQUIEL-DEV-QA-002-T5.json`, `TASK_RUN\handoffs\COORDINATION-EZEQUIEL-DEV-QA-002-T5.json`, `TASK_RUN\browser\server-ownership.json`, `server-shutdown.json`, `server.stdout.log`, `server.stderr.log`, `qa.redacted.json`, `playwright-output\`, and generated `.next\**` plus `next-env.d.ts`; no DB/chain mutation.
- **Server commands:** `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode inventory --task-id COORDINATION-EZEQUIEL-DEV-QA-002-T5`; `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode server-start --host 127.0.0.1 --port 3000`; after browser/context closure, `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode server-stop --host 127.0.0.1 --port 3000`; then `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode handoff --task-id COORDINATION-EZEQUIEL-DEV-QA-002-T5`.
- **Server provenance gate:** `server-start` requires port 3000 free, exact repository cwd, local Node/Next executables, exact args `next dev --hostname 127.0.0.1 --port 3000`, and records parent/descendant PIDs, start times, executable identities, cwd, args, and bind in `server-ownership.json`. Pre-existing server reuse is forbidden; if Playwright would launch its configured package-manager-backed server instead of observing this attested server, stop.
- **Browser command:** `$playwrightOutput = Join-Path $TASK_RUN 'browser\playwright-output'; & '.\node_modules\.bin\playwright.cmd' test '.\e2e\coordination-ezequiel-dev-qa.spec.ts' '--project=chromium' '--workers=1' '--retries=0' '--reporter=line' "--output=$playwrightOutput"`.
- **Auth/browser gate:** use fresh desktop `1440×900` and mobile `390×844` touch contexts with no storageState. Authenticate the exact Ezequiel DEV user against the exact DEV Supabase project and navigate only to `http://127.0.0.1:3000/login?next=/coordinadores/mi-bandeja`; assert productive personal mode, exact active company, exact resolved Ezequiel subject/assignment, accepted context, and all A–H active. Assert no `CoordinationPreviewBanner`, `CoordinationPreviewRoot`, preview controls/surface, or visible `Vista previa`; E2E must not discover/select preview. Bound only the exact Supabase auth local-storage key before freezing continuous no-mutation hooks. Verify metric/advanced-filter matrix, stable unique rows, active E/F `"Cierre pendiente: 1 requisito faltante"`, active G `"Cierre pendiente: 3 requisitos faltantes"`, active H no control, exact categories, Enter/Space/touch, false→true→false, focus, and zero post-auth network/store/storage/cookie/preference mutation.
- **Cleanup/handoff:** in mandatory `finally`, close page/context/browser first. `server-stop` reads `server-ownership.json`, re-enumerates descendants from recorded parent PID, matches each PID start-time/executable identity, terminates bounded leaves-first only matched T5 identities, disposes handlers/streams/process handles, and proves every owned PID absent plus no listener on `127.0.0.1:3000`. Never kill preexisting/foreign PID; ambiguity/timeout is FAIL. Clear credentials, inventory outputs, verify no repository browser artifacts, release runtime/CEQ locks; failures return to T2R through Diagnose.

### T6 — Idempotent no-op evidence and retention boundary

- **Declaration:** `COORDINATION-EZEQUIEL-DEV-QA-002-T6`; `CEQ-L6`; DEV idempotency operator; `openai/gpt-5.6-sol`; bounded testing execution. Own `TASK_RUN\inventory\COORDINATION-EZEQUIEL-DEV-QA-002-T6.json`, `TASK_RUN\handoffs\COORDINATION-EZEQUIEL-DEV-QA-002-T6.json`, and existing `OP_RUN` manifest/chain plus new `noop` event and `reconciliation\noop.json`; no repository/generated output or DB/audit mutation.
- **Commands:** `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode inventory --task-id COORDINATION-EZEQUIEL-DEV-QA-002-T6`; `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode create`; `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode reconcile`; `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode handoff --task-id COORDINATION-EZEQUIEL-DEV-QA-002-T6`.
- **Gate/handoff:** require `noop` only when all eight frozen PKs, key/source/envelope bytes, row/aggregate digests, company, Ezequiel assignments, prepared/applied manifests, and audits match exactly; prove zero domain/audit change and `29/16/8/5`. Any ID/byte/tenant/audit drift is rejection, never repair/adopt. Default next action remains cleanup; retention still requires explicit Franco decision and no runtime lock remains.

### T7 — Exact-manifest cleanup or explicit temporary hold

- **Declaration:** `COORDINATION-EZEQUIEL-DEV-QA-002-T7`; `CEQ-L7`; Authorized cleanup operator; `openai/gpt-5.6-sol`; cleanup or retention-marker execution. Own `TASK_RUN\inventory\COORDINATION-EZEQUIEL-DEV-QA-002-T7.json`, `TASK_RUN\handoffs\COORDINATION-EZEQUIEL-DEV-QA-002-T7.json`, and existing `OP_RUN` manifest/chain, cleanup events, `reconciliation\cleanup.json`, `audits\cleanup.json`, optional immutable `custody-hold.json`/`custody-release.json`; no repository/generated output.
- **Commands:** `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode inventory --task-id COORDINATION-EZEQUIEL-DEV-QA-002-T7`. Default: `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode cleanup`; then `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode reconcile`. Explicit retention only: `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode custody-hold`. Finally: `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode handoff --task-id COORDINATION-EZEQUIEL-DEV-QA-002-T7`.
- **Gate/handoff:** default cleanup validates every frozen PK/source/exact envelope byte/digest/company/assignment/manifest/audit before deletion; one mismatch causes zero delete/zero cleanup audit. Valid cleanup deletes only exact manifested A–H/assignments, reconciles unchanged originals and `21/8/8/5`, then records cleaned/audits. Existing custody-hold behavior remains immutable/non-locking; retention is PARTIAL and later cleanup reacquires runtime lock and revalidates all bytes.

### T8 — Final independent verification

- **Declaration:** `COORDINATION-EZEQUIEL-DEV-QA-002-T8`; `CEQ-L8`; Independent final verifier; `openai/gpt-5.6-sol`; read-only verification plus final attestation outside the chain. Own `TASK_RUN\inventory\COORDINATION-EZEQUIEL-DEV-QA-002-T8.json`, `final-preflight-attestation.json`, `bundle-scan\COORDINATION-EZEQUIEL-DEV-QA-002-T8.json`, `handoffs\COORDINATION-EZEQUIEL-DEV-QA-002-T8.json`, generated `.next\**`/`next-env.d.ts`; read-only `OP_RUN`; no domain/audit write.
- **Commands:** `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode inventory --task-id COORDINATION-EZEQUIEL-DEV-QA-002-T8`; `.\node_modules\.bin\vitest.cmd run .\src\__tests__\unit\coordination-ezequiel-dev-overlay.service.test.ts .\src\__tests__\integration\coordination-ezequiel-dev-overlay.test.ts .\src\__tests__\components\CoordinatorInboxView.test.tsx .\src\__tests__\unit\backend-active-surgeries-adapter.test.ts .\src\__tests__\unit\coordination-filtering.test.ts --no-cache`; `.\node_modules\.bin\next.cmd typegen`; `.\node_modules\.bin\tsc.cmd --noEmit --incremental false`; `npm run build`; all three literal eleven-path Git commands in §3; `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode bundle-scan --build-root .next --task-id COORDINATION-EZEQUIEL-DEV-QA-002-T8`; `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode preflight --read-only --task-id COORDINATION-EZEQUIEL-DEV-QA-002-T8`; `.\node_modules\.bin\tsx.cmd .\scripts\dev\coordination-ezequiel-dev-overlay.ts --mode handoff --task-id COORDINATION-EZEQUIEL-DEV-QA-002-T8`.
- **Gate/handoff:** transient runtime lock is released after final preflight; write only `final-preflight-attestation.json`, never a chain event. Default proves terminal chain and restored `21/8/8/5` for PASS. Retained branch validates immutable custody hold and exact retained `29/16/8/5`, releases runtime lock, and reports PARTIAL with mandatory later T7. Prove all REQ/SC, allowed/generated outputs, no forbidden change/cache/secret/PII, and release `CEQ-L8`.

## 6. Traceability

| Authority | Tasks/evidence |
| --- | --- |
| REQ-01 / SC-01 | T0b baseline/global UUID absence; T-ID authority; T2R tests; T4 `29/16/8/5`; T7 restoration |
| REQ-02 / SC-02 | T0a/T0b gates; UUID collision/race/tenant rejection; T2R/T3 negative tests |
| REQ-03 | T0b exact resolver; T2R context tests; T4 transaction recheck |
| REQ-04 / SC-03 | T-ID UUIDs; §4.1 manifest/ownership; T4 assignment; T6 exact-byte no-op |
| REQ-05 / SC-04 | T2R active A–H direct memberships/filter tests; T5 productive matrix/stability |
| REQ-06 / SC-05 / H01 | T2R active E–H component/E2E tests; T5 accessibility/zero mutation |
| REQ-07 / SC-06/07/08 | §4 evidence; manifest/audit/tamper tests; T4 audits; T6 no-op; T7 whole cleanup; T8 reconciliation |
| REQ-08 / SC-09 | Eleven-path/global prohibitions; production bundle gate; T3/T8 scope review |
| REQ-09 / SC-10 | DEV adapter plus independent productive-personal context conjunction; T3/T5 acceptance |
| REQ-10 / SC-11 | UUID/source/envelope/digest/owner/audit conjunction and production/wrong-context/tamper isolation across T2R–T8 |

## 7. Final gate

Further implementation may begin only with T-ID, preserving completed T0a/T1 and partial T2 hashes. T-ID PASS activates Franco's standing authorization for the exact initial §1.2 IDs; any authority-byte/ID drift requires reapproval. T2R/T3 must PASS eleven-path focused tests, production build, and zero-marker bundle scan before T0b. Authorization does not survive baseline/operator/context/tenant/ownership drift, forbidden scope, unsafe cleanup, quantity other than `N=8`, or categories beyond `Documentación`, `Consumo`, and `Facturación`. Default close remains exact cleanup/restoration.
