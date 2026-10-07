# Preparation caller implementation — source ready

## Done
- Bounded Preparation callers authored in the existing Cajas physical-units panel. Source ready for sole-runner QA; package acceptance remains PARTIAL.
- Ownership preflight read UI_TASK_BRIEF, UI_PREPARATION_LOCK, DB_TESTS_BLOCKED and active Coordination LOCK (explicit Preparation/Remito/Stock/Cajas exclusion). Own lock changed to editing before source writes; released after source inspection.

## Changed
- Selection uses existing selectPreparationLineApi: physicalUnitId OR backend sourceMovementId, quantity, append and remove. Existing physical selector retained; native movement-ID, quantity and append fields added. Current schemas validate all complete commands before sending.
- Reserve from the list first displays detail; it never reserves the unseen version. Detail shows preparation.version separately from formula version and exposes cause. Reserve/control/recontrol submit observed expectedVersion, UUID and cause; recontrol keeps its kind.
- Resolution submits maximum observed resolution sequence (zero for an observed empty history), UUID, explanation, supporting reference and cause. Missing history requires reload. Latest closing resolution is reflected without assuming closedAt is populated.
- Per-command intent signature includes company/article/assignment/line-or-difference/kind/version/cause/options. Rejected identical retries retain key/payload/version. Relevant edits invalidate only their command; explicit successful reload creates fresh intent even if version is unchanged.
- Rejections retain input and display errors. Accepted commands clear only submitted input; removal retains unsubmitted selection fields. Write acceptance and refresh errors have separate paths. Accepted-write refresh failures show a warning and block further mutations until explicit successful reload.
- Successful preparation actions refresh assignment detail and list. A component key isolates company/article state; assignment request epochs suppress obsolete detail/surgery reads, follow-up reads and toasts. A synchronous pending ref blocks duplicate writes. In-flight inputs and dialog closes are disabled.
- Surgery selector uses backendId and blocks absent backend identity; no manual visible-ID fallback.

## Files
- src/components/stock/CajasPhysicalUnitsSection.tsx — only source implementation edit.
- src/__tests__/components/CajasPreparation.http.test.tsx — new exact runner target.
- UI_PREPARATION_LOCK.md; UI_PREPARATION_IMPLEMENTATION.md — own ownership/handoff.
- src/lib/api/cajas-assignments.ts needed no descriptor changes; pre-existing transport patch preserved without edits.

## Validations
- Read-only traced current Cajas HTTP clients, apiFetch, selection/reservation/control/resolution validators and corresponding server services. No service execution/import in authored tests.
- Inspected package.json, vitest.config.ts and existing test setup/dependencies.
- Auth token accessor and global fetch are mocked; all Cajas/physical-unit/backend-surgery HTTP clients and apiFetch remain real. The surgery presentation adapter is mocked to exclude its service dependency. Native dialog shell is mocked to isolate command behavior.
- Explicit GET fixtures and per-test write handlers; unexpected requests throw and fail an afterEach assertion.
- Authored HTTP checks cover IDs/auth headers/version/UUID, physical and source-movement quantity/append/remove, reserve observation, full control/recontrol, resolution sequence 0/latest, invalid quantities, identical retries after409/network failure, edits/refreshed intent, pending duplicates, rejected input retention, accepted-write/failed-refresh distinction, missing surgery backend ID, context-change mutation suppression and obsolete assignment read suppression.
- git diff --check on modified component: passed (line-ending notice only).
- Tests/TypeScript/build/browser/Node/npm/scripts/DB: not run; orchestrator alone may execute inspected allowlisted files.

## Risks
- Source-only implementation; test assertions, TypeScript and runtime behavior are not yet execution-verified.
- Dialog focus/portal behavior and real backend journey are outside this mocked component suite. No browser/DB acceptance claimed; DB_TESTS_BLOCKED stays in force.
- Existing transports cannot cancel an already dispatched write; obsolete completion is ignored locally and cannot trigger a refresh, toast or another mutation in the replacement context.

## Next
- Orchestrator inspects and executes exactly src/__tests__/components/CajasPreparation.http.test.tsx, performs narrow TypeScript/QA and supplies evidence to the read-only reviewer.
- Any requested source correction resumes only with explicit orchestrator ownership under this lock.
