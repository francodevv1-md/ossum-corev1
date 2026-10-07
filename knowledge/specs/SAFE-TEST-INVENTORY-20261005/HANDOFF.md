# HANDOFF — Safe-test inventory (roadmap task 003) — evidence-only revision

**Workspace:** `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`
**Branch / HEAD:** `ux/antigravity-redesign` @ `2138552`
**Lock:** `.opencode\locks\SAFE-TEST-INVENTORY-20261005-CORRECTION.lock.md` (state: `reserved`; this revision supersedes the previous `SAFE-TEST-INVENTORY-20261005` lock which is `released`).
**Owner:** MiniMax-M3 (MiniMax), bounded DEV inventory correction. No test/DB/runner/config/dependency changes in this revision.

## 1. What this package is — and is not

This package is a **read-only inventory** of the 315 Vitest test files under `src\__tests__\`, plus a small verified **offline allowlist** (8 files) and one **mocked-offline** file (1 file) that the developer can replay without touching the DB or external services. It is not a runner change, not a CI implementation, not a test-suite execution, and not a green light to run the full inventory. It does not close roadmap task 003.

## 2. Categories, mutually exclusive, sum to 315

| Category | Count | Definition |
| --- | ---: | --- |
| **VERIFIED OFFLINE — allowlist** | 11 | Per-file **static, first-level closure** evidence in `RUNTIME_CLOSURE.md` (test → SUT → first-level transitive modules; grep for risk markers). The on-disk Vitest run in `EVIDENCE_*.txt` and `EXITCODE.txt` is **historical evidence from the prior session** for the original 8 files; the 3 round-2 additions have no on-disk run evidence in this folder and are reported as **NOT RUN**. |
| **VERIFIED OFFLINE — mocked, outside allowlist** | 1 | `surgeries-create-api.test.ts`: `vi.mock("@/lib/prisma", …)`. Outside the allowlist by historical scope convention, not by evidence. |
| **DB/EXTERNAL** | 11 | Per-file concrete evidence of real-client or disposable-target-gated integration. See `INVENTORY.md` §3. |
| **UNVERIFIED** | 292 | File-list evidence only. See `INVENTORY.md` §4 and `PATHS_315.md`. |
| **Total** | **315** | 11 + 1 + 11 + 292 = 315. ✓ |

`NOT RUN` is **execution status**, not a safety category, and is not counted in this table. The 8 original allowlist files have status **PASS (on-disk evidence only, not re-certified in any revision)** — see §3. The 3 round-2 allowlist additions have status **NOT RUN (static-review only)**. The 304 non-allowlist files have status **NOT RUN**.

## 3. On-disk evidence (prior session, 2026-10-05 17:07, not re-certified)

The following files exist in this folder and are the only on-disk test-run evidence in this package:

- `EVIDENCE_stdout.txt` — Vitest summary `Test Files 8 passed (8) / Tests 39 passed (39)`, duration `3.87s`, start `17:07:47`, followed by `EXITCODE=0`. Verbatim contents reproduced in `REPLAY.md` §2.2.
- `EVIDENCE_stderr.txt` — Node 25 `--localstorage-file` warnings, eight occurrences, no test failure, no stack trace, no DB connection attempt. Verbatim contents reproduced in `REPLAY.md` §2.3.
- `EXITCODE.txt` — single line `EXITCODE=0`. Verbatim contents reproduced in `REPLAY.md` §2.4.

These three files were generated in the prior session of this package (2026-10-05, ~17:07 local time). They are not modified by this revision. The exit-code value is the only captured PowerShell `$LASTEXITCODE` value in this folder; the prior session did not capture `$?`.

What the on-disk evidence supports, as found:

- The Vitest summary reported PASS for 8 files and 39 tests in a 3.87 s run starting at 17:07:47.
- The process exit code (`$LASTEXITCODE`) was `0`.
- Stderr contained only Node `--localstorage-file` warnings, no test failure, no stack trace, no DB connection attempt.

What the on-disk evidence does **not** support:

- A causal relationship between the Node warning and the PowerShell exit code. The prior `REPLAY.md` claimed this; the claim is **withdrawn** here.
- The value of `$?` during the prior run. Not captured. **Undetermined.**
- A post-run hash capture. The prior `REPLAY.md` reported post-run values that "matched" the pre-run values, but no post-run file is in this folder. The hash-equality claim is **withdrawn** here. The single pre-run capture in `REPLAY.md` §2.6 is the only hash evidence preserved.
- The result of the earlier 44-test run. Historical evidence only; not re-certified; its PowerShell exit code is **undetermined** because the prior session did not capture it.
- The 304 non-allowlist files (1 mocked-offline + 11 DB/EXTERNAL + 292 UNVERIFIED). None was executed in this session.
- The 3 round-2 allowlist additions. None was executed in this session; the round-2 classification is static only.

## 4. Per-file execution status (historical on-disk evidence, not re-certified)

The status below is the on-disk evidence from the prior session's `vitest.cmd run` call (2026-10-05 17:07), as found in `EVIDENCE_stdout.txt`, `EVIDENCE_stderr.txt`, and `EXITCODE.txt`. The current revision did not re-execute any test. The status is reported as **historical on-disk evidence**, not as a re-certified PASS for this revision.

| # | File | Status (on-disk evidence) | Evidence |
| --- | --- | --- | --- |
| 1 | `src/__tests__/unit/cirugias-optabs.test.ts` | PASS (historical) | `EVIDENCE_stdout.txt` aggregate (file-level breakdown not in evidence) |
| 2 | `src/__tests__/unit/cirugias-date-columns.test.ts` | PASS (historical) | same |
| 3 | `src/__tests__/unit/surgery.service-coordinator-read.test.ts` | PASS (historical) | same |
| 4 | `src/__tests__/unit/compras-movimientos.service.test.ts` | PASS (historical) | same |
| 5 | `src/__tests__/unit/stock-movement-origin-projection.test.ts` | PASS (historical) | same |
| 6 | `src/__tests__/unit/invoice-service.test.ts` | PASS (historical) | same |
| 7 | `src/__tests__/components/RolesPageRedirect.test.tsx` | PASS (historical) | same |
| 8 | `src/__tests__/components/ConfiguracionPageHonest.test.tsx` | PASS (historical) | same |
| | **Aggregate** | **8 / 8 files, 39 / 39 tests, EXITCODE=0 (historical on-disk evidence)** | on-disk evidence in `EVIDENCE_stdout.txt` + `EXITCODE.txt` |

The status `PASS` is for the **aggregate** run, not per-file. The captured evidence does not break the run down into per-file PASS / FAIL counts; only the aggregate summary is on disk. This revision does not claim that the run is non-mutating; no post-run hash file is in this folder.

## 5. Claims withdrawn for lack of evidence

The following claims from earlier revisions of this package are **withdrawn** in this revision:

- The previous `INVENTORY.md` reported "VERIFIED OFFLINE: 299 / DB/EXTERNAL: 15 / NOT RUN: 1" based on a directory-level heuristic. Replaced by 9 VERIFIED OFFLINE (8 allowlist + 1 mocked-offline) + 11 DB/EXTERNAL + 295 UNVERIFIED in round 1; round 2 redistributes this to 12 VERIFIED OFFLINE (11 allowlist + 1 mocked-offline) + 11 DB/EXTERNAL + 292 UNVERIFIED (3 `integration/*` files reclassified as ALLOW, 1 held UNV conservatively). The 315 sum is preserved.
- The previous `RUNTIME_CLOSURE.md` described the 8 allowlist files as "full import-closure" while admitting that transitive closure was not walked. Replaced by per-file static, first-level closure label in `RUNTIME_CLOSURE.md`: 5 files labelled `STATIC REVIEW — first-level closure / exercised paths` and 3 files labelled `STATIC REVIEW — partial closure / exercised paths` in round 1; round 2 adds 3 more rows with the `STATIC REVIEW — first-level closure / exercised paths` label. Neither label is a proof of total transitive closure.
- The previous `REPLAY.md` claimed "the Node `--localstorage-file` warning explains the PowerShell exit code". Withdrawn. The Node warning is in `EVIDENCE_stderr.txt`; the exit code is `0` in `EXITCODE.txt`; no causal claim is supported.
- The previous `REPLAY.md` claimed post-run hash equality with the pre-run values. Withdrawn. No post-run hash file is in this folder. The single pre-run capture in `REPLAY.md` §2.6 is the only hash evidence preserved.
- The previous `HANDOFF.md` described the prior 44-test run's exit code as "unresolved". The description is preserved but tightened: the 44-test run's exit code is **undetermined** because the prior session did not capture it.
- The previous `INVENTORY.md` §4 included an arithmetic note that undercounted the unit UNVERIFIED count by 2. Replaced by the 196 (= 202 − 6) figure in this revision.

**Round 2 — claims preserved (no claim is withdrawn in round 2):**

- Round 2 reclassifies 3 of the 4 `integration/*` files previously UNV to ALLOW and holds 1 (`mail-stage1-api.test.ts`) UNV; the 315 sum is preserved.
- Round 2 does not claim any of the 3 new ALLOW files has been executed; they are added on static-review evidence only and are reported as NOT RUN in `INVENTORY.md` §5.
- Round 2 does not claim `mail-stage1-api.test.ts` is DB/EXTERNAL or ALLOW; the conservative UNV assignment is documented in `INVENTORY.md` §1.4 and §4 with the per-file first-level chain evidence.
- Round 2 does not introduce any new on-disk evidence files (`EVIDENCE_*.txt`, `EXITCODE.txt`, `HASHES_*.txt`); the existing three files are preserved unchanged.

## 6. Blockers and risks

- **Sol1 DB hold (active).** All 11 DB/EXTERNAL files are blocked until a separate explicit brief, an authorised disposable DEV target, and the matching opt-in flag are present. None were executed in this session.
- **Surgery-palette active scope.** `SURGERY-PALETTE-ORDER-CORRECTION-20261005` is `active`; the previous allowlist's `SurgeryPalette.test.tsx` and `ChangeStateDialog.test.tsx` are part of that scope and are removed from this allowlist. A new run that includes them must wait for the palette correction lock to be released.
- **292 of 315 files are UNVERIFIED.** This is honest. Adding them to the allowlist requires the per-file closure walk in `RUNTIME_CLOSURE.md` and the re-establishment procedure in `REPLAY.md` §5. The 1 `integration/*` file still in the UNV bucket (`mail-stage1-api.test.ts`) has a per-file first-level chain note in `INVENTORY.md` §4 that documents why it is not yet in the allowlist.
- **No fixture / schema coverage.** `prisma/schema.prisma`, fixtures, and `prisma.config.ts` were not queried. A future test that imports `@/lib/prisma` directly without a `vi.mock` line will need a separate inspection.
- **HEAD drift.** The current HEAD is `2138552`; the roadmap snapshot was `73e3e1b`. Several test files are dirty locally. The 8 allowlist files have a **single pre-run hash capture** on this snapshot; a re-run after the next sync is prudent.
- **Post-run hash evidence is missing on disk.** A non-mutating-run claim would require a new session to capture pre/post hashes to separate files inside this folder.
- **No `$?` capture.** The prior session captured only `$LASTEXITCODE`. A complete PowerShell exit-code picture would also capture `$?`.
- **`$LASTEXITCODE` value `0` does not by itself certify that the prior run was safe.** The Vitest summary and the absence of any DB/HTTP attempt in stderr are the safety-relevant facts; the exit code is corroborating only.

## 7. Files in this package

- `INVENTORY.md` — corrected categories, exact paths, hash references, evidence per DB/EXTERNAL file.
- `REPLAY.md` — 8-file allowlist, on-disk evidence, exit-code procedure, blocked paths as text.
- `RUNTIME_CLOSURE.md` — per-file import-closure for the 8 allowlist files.
- `HANDOFF.md` — this file.
- `PATHS_315.md` — annex with one row per file for the 315 total.
- `EXITCODE.txt` — `EXITCODE=0` (from prior session, not modified by this revision).
- `EVIDENCE_stdout.txt` — full stdout of the prior session's `vitest.cmd run` call.
- `EVIDENCE_stderr.txt` — full stderr of the same call.
- Lock: `.opencode/locks/SAFE-TEST-INVENTORY-20261005-CORRECTION.lock.md` (state `released`, as of the administrative closure recorded in §10).

## 8. Recommended next step (not part of this package)

A separately approved, bounded DEV session that:

1. Captures pre-run and post-run hashes for the 8 allowlist files to separate files inside this folder (`HASHES_PRE.txt`, `HASHES_POST.txt`) and confirms match.
2. Captures `$?` in addition to `$LASTEXITCODE` to a new file.
3. Performs the import-closure walk for each of the 196 other `unit/*` and 95 other `components/*` files, shrinking the UNVERIFIED bucket.
4. (Round-2 follow-up: this is already done in `RUNTIME_CLOSURE.md` row `UNV-1` — see §"Non-allowlist walked in round 2 (held UNV by conservative decision)". The file is walked; the classification is held `UNVERIFIED` for the conservative reasons in that row. A future separately approved session may either extend the `MOCKED-OFFLINE` convention to cover files that mock modules other than `@/lib/prisma` and have only filesystem side effects, or hold `UNVERIFIED` permanently with this row as the on-record evidence.) The 3 other previously-UNV `integration/*` files were reclassified as ALLOW in round 2 — see `INVENTORY.md` §1.4 round-2 redistribution.
5. Inventories the root `e2e/` Playwright specs (out of scope here).
6. Closes roadmap task 003 only after the above produces a stable allowlist that survives a re-run on the next HEAD sync.

This package does not perform any of (1)–(6).

## 10. Administrative closure (2026-10-05, MiniMax)

The `SAFE-TEST-INVENTORY-20261005` inventory / documentary-correction subpackage is **administratively closed** in this session, with the following explicit state:

- **Subpackage status:** closed (read-only inventory + documentary correction; no source/test/runner/dependency change in this round or any round).
- **Final category split (disjoint, sum to 315):** `VERIFIED OFFLINE — allowlist` 11 + `VERIFIED OFFLINE — mocked, outside allowlist` 1 + `DB/EXTERNAL` 11 + `UNVERIFIED` 292 = 315. Verified across `INVENTORY.md` §1.4, `HANDOFF.md` §2, and the `PATHS_315.md` annex.
- **Round-2 ALLOW additions (`#9`, `#10`, `#11` in `RUNTIME_CLOSURE.md`) and the non-allowlist `UNV-1` row for `mail-stage1-api.test.ts`:** static, first-level import-closure evidence only. No new `vitest run`, no new `HASHES_*.txt`, no post-run hash equality claim, no `EVIDENCE_*.txt` regeneration. The on-disk `EVIDENCE_stdout.txt` / `EVIDENCE_stderr.txt` / `EXITCODE.txt` are the historical evidence from the prior session and are preserved unchanged.
- **Execution evidence in this round:** none. The only on-disk evidence in this folder is the historical trio (`EVIDENCE_stdout.txt` aggregate `8/8 files, 39/39 tests`, `EVIDENCE_stderr.txt` Node `--localstorage-file` warnings, `EXITCODE.txt` `EXITCODE=0`); no new on-disk evidence was produced or captured in round 2 or the minimal doc fix.
- **Roadmap task 003:** **remains open**. This subpackage does not close roadmap task 003; it only closes the bounded inventory / documentary-correction work that was the deliverable of this lock. Closing task 003 requires the separately approved follow-up session described in §8.
- **Next work requires a separate brief** (per the AGENTS.md T2/T3 discipline): a new lock, a new written approval, and an independent reviewer. Candidates enumerated in §8 (pre/post hash capture, `$?` capture, import-closure walk for the remaining 196 `unit/*` and 95 `components/*`, root `e2e/` Playwright specs, optional extension of the `MOCKED-OFFLINE` convention for `mail-stage1-api.test.ts`).
- **Lock state:** the lock `E:\OSSUM_COR_ANTIGRAVITY\ux-ui\.opencode\locks\SAFE-TEST-INVENTORY-20261005-CORRECTION.lock.md` is moved to `released` in this same session. Other locks in `.opencode/locks/` are not touched.

This §10 does not modify any category, count, file path, or evidence file. It records the administrative closure of the subpackage and the explicit open status of roadmap task 003.

## 9. Lock release (historical note)

The lock
`E:\OSSUM_COR_ANTIGRAVITY\ux-ui\.opencode\locks\SAFE-TEST-INVENTORY-20261005-CORRECTION.lock.md`
was moved to state `released` during the administrative closure recorded in `HANDOFF.md` §10. This §9 preserves the prior conditional wording as a historical note for traceability, but it is no longer a pending action: the lock is `released` and remains `released` until a future separately approved session opens a new lock for follow-up work.

The deliverable files (`INVENTORY.md`, `REPLAY.md`, `RUNTIME_CLOSURE.md`, `HANDOFF.md`, `PATHS_315.md`, `EXITCODE.txt`, `EVIDENCE_*.txt`) must not be deleted until the next-step package in §8 has its own snapshot record; they are the canonical evidence for this snapshot.
