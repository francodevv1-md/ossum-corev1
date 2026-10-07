# Sol1 Preparation/Remito baseline — QA fixtures — 2026-10-02

Bounded fixture correction against `73e3e1b4b930fa0bc4bf44636c78529d73b33208`. This is a mechanical baseline repair, not a global READY verdict for runtime, build, Preparation or Remito.

## Task and evidence boundary

- Owner: QA fixture maintainer; model: current runtime `openai/gpt-6.1-sol`.
- Exact ownership and commands: `BASELINE_LOCK.md`.
- Explorer verification supplied by the orchestrator: all 19 certified source/test manifest blobs match the isolated commit. Canonical blob list: `knowledge/specs/PRESUPUESTOS-COMMIT-ISOLATION-DEV-001/MANIFEST.md`. The released local commit lock also records the 19-blob verification and preservation of the prior working tree.
- Previous orchestrator baseline: 101 tests passed. This is inherited evidence, not a 101-test rerun by this owner.
- Local preflight: HEAD equals the certified commit; all four fixture diffs and all four `git show 73e3e1b:<file>` outputs inspected. Earlier working-tree fixture regressions coexist with certified committed fixes.

## Baseline classification

| Evidence / residual | Classification | Handling |
| --- | --- | --- |
| Certified 19 manifest blobs in isolated commit | Certified committed baseline; explorer-verified | Preserve; distinguish from dirty working-tree state |
| Missing integration emission/version revision tokens and revision response types | Mechanical fixture regression | Restore only certified request/type hunks |
| Concurrency/journey Prisma mocks cloned through JSON | Mechanical fixture regression | Restore certified Date/Decimal-preserving clone helpers and mock return calls |
| Service SQL call-count assertions weakened and forbidden-update assertion removed | Mechanical coverage regression | Restore exact counts and no-update assertion/mock |
| `presupuesto.service.ts` permissive date serialization and current-time fallback | BUSINESS AMBIGUOUS | Unchanged; requires separate business/domain resolution |
| Invoice service/tests and pending-invoicing billing-gate residuals | Foreign billing-gate work | Prohibited ownership; preserve |
| Stock/Cajas/Movimientos/schema/Auth/dependencies and other dirty paths | Out of scope | Preserve |
| Runtime/build/real-DB evidence | Not globally READY | No DB/browser/build executed in this task |

## Diagnose

### Reproduce

Commands run from `E:/OSSUM_COR_ANTIGRAVITY/ux-ui` before fixture edits:

```text
node node_modules/vitest/vitest.mjs run src/__tests__/unit/presupuesto-concurrency.test.ts src/__tests__/unit/presupuesto-connected-journey-e2e.test.ts src/__tests__/unit/presupuesto-service.test.ts
node node_modules/vitest/vitest.mjs run src/__tests__/unit/presupuesto-api-routes.test.ts src/__tests__/unit/presupuesto-mvp-closure.test.ts
```

Results: 20/20 unit tests and 22/22 adjacent API/closure tests passed, respectively. Node emitted the existing `--localstorage-file` invalid-path warning; no failing assertion occurred.

### Scope

Four test fixtures only. No service, API contract, invoice behavior, persistence or business-rule changes. The DB integration file is inspected statically and excluded from execution: its hooks load DB credentials, delete scoped data and seed records unconditionally. No authorized disposable DB prerequisites are provided for this task.

### Evidence

- `git diff` and `git show 73e3e1b:<file>` show precisely the requested regressions, with no unrelated fixture hunks.
- Integration fixture drops `revision: number` from create/emit response types, drops emission JSON headers/body, and omits version `expectedRevision`. Existing validators require positive revision tokens (`src/lib/validators/presupuesto.ts`); existing API/closure tests exercise token-bearing requests.
- Concurrency mock has three JSON-cloned returns; journey presupuesto mock has four. JSON serialization converts Date/Decimal instances to strings rather than modeling Prisma rows. The certified fixture helpers preserve both types recursively.
- Service fixture replaces `$queryRaw` count 2 / `$executeRaw` count 1 with generic called assertions and removes `update` mock/no-update verification for invalid transitions.
- Read-only service diff confirms permissive string date handling and current-time fallback. Green unit tests do not establish fixture fidelity or resolve that business ambiguity.

### Hypothesis

The preserved prior working-tree fixture versions drifted from the separately certified commit. Current permissive date serialization allows JSON-cloned mock rows to pass, while weakened assertions reduce regression detection. Integration's token mismatch remains directly visible without executing DB hooks. Correcting certified fixture hunks is sufficient; changing source behavior is outside this evidence and approval boundary.

### Minimal Fix

Completed with hunk-only apply_patch corrections:

- Integration: restore create/emit response `revision` types, emission JSON header/body with the created revision, and version request token from the emitted revision.
- Concurrency: restore the certified recursive clone helper and three presupuesto mock returns, preserving Date/Decimal instances.
- Journey: restore the certified recursive clone helper and four presupuesto mock returns. Invoice mock/behavior unchanged.
- Service: restore `$queryRaw` count 2, `$executeRaw` count 1, invalid-transition `update` mock and `not.toHaveBeenCalled()` assertion.

No whole-file restore, new fixture abstraction or weakened check.

### Validate

Focused checks were run immediately after each fixture correction:

| Correction | Command after edit | Result |
| --- | --- | --- |
| Integration revision tokens | `node node_modules/vitest/vitest.mjs run src/__tests__/unit/presupuesto-api-routes.test.ts src/__tests__/unit/presupuesto-mvp-closure.test.ts` | 22/22 passed; adjacent DB-free contract checks, not execution of the integration fixture |
| Concurrency mock | `node node_modules/vitest/vitest.mjs run src/__tests__/unit/presupuesto-concurrency.test.ts` | 10/10 passed |
| Journey mock | `node node_modules/vitest/vitest.mjs run src/__tests__/unit/presupuesto-connected-journey-e2e.test.ts` | 1/1 passed |
| Service assertions | `node node_modules/vitest/vitest.mjs run src/__tests__/unit/presupuesto-service.test.ts` | 9/9 passed |

Final TypeScript: `node node_modules/typescript/bin/tsc --noEmit --incremental false` passed with no diagnostics on a 600-second-budget rerun. Initial identical command exceeded the tool's 120-second timeout with no output; that first attempt was inconclusive, not a compiler-error diagnosis. No source/configuration fix was applied for the timeout.

Integration execution remains excluded: no DB hooks imported/run, credentials checked or DB operations performed. Static certified comparison and adjacent unit checks do not substitute for real-DB runtime evidence.

### Regression Check

Final combined command:

```text
node node_modules/vitest/vitest.mjs run src/__tests__/unit/presupuesto-concurrency.test.ts src/__tests__/unit/presupuesto-connected-journey-e2e.test.ts src/__tests__/unit/presupuesto-service.test.ts src/__tests__/unit/presupuesto-api-routes.test.ts src/__tests__/unit/presupuesto-mvp-closure.test.ts
```

Result: 5 files / 42 tests passed. This includes SQL lock-order and mocked revision-race checks; it is not proof of real PostgreSQL concurrency or browser E2E. The journey's invoice calls use its injected Prisma mock.

`git diff --exit-code 73e3e1b -- <four owned fixtures>` passed with empty diff; focused `git diff --check` passed. Read-only `git hash-object --path=<path> <path>` produced all four canonical manifest blobs:

| Fixture | Verified final canonical blob |
| --- | --- |
| src/__tests__/integration/presupuestos-api.test.ts | a1e1853a2b646265b30a4cde6b7e0bf40d8a37ad |
| src/__tests__/unit/presupuesto-concurrency.test.ts | 838ceaca0eeeb125056d87bb8bdc8772cbe32918 |
| src/__tests__/unit/presupuesto-connected-journey-e2e.test.ts | 30c3b763656647b2f89f4ab6e87b5b385f15f617 |
| src/__tests__/unit/presupuesto-service.test.ts | 7ed77d6db564633c29b46b4f6d22e29a1132df68 |

Git reported the existing LF/CRLF conversion notices. Canonical blobs match; no Git restore/staging/commit was used.

### Handoff

Done: bounded mechanical fixture correction completed; fixture lock released.

Changed: revision-token request/types, seven Prisma-preserving mock returns with certified helpers, exact SQL call-count and forbidden-update assertions.

Files: the four exact fixtures in the verified table, plus this BASELINE.md and explicitly requested BASELINE_LOCK.md only.

Validations: pre-edit 20+22 tests passed; per-change 22/10/1/9 tests passed; final 42/42 passed; non-incremental TypeScript passed after timeout rerun; four certified blob comparisons and focused whitespace check passed. Explorer's 19-blob verification and orchestrator's previous 101-test baseline remain attributed inherited evidence.

Risks: service residual date/time fallback is BUSINESS AMBIGUOUS; foreign billing-gate work remains outside ownership; real-DB integration unexecuted; runtime/build not globally READY. No DB/browser/build or prohibited Git operation performed.

Next: orchestrator combines this fixture baseline with the independent read-only Preparation/Remito trace; resolve date/time semantics separately before any readiness decision.
