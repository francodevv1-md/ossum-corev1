# HANDOFF — MAIL-SIMULATION-HONESTY-010 (roadmap 010)

## Current continuation — 2026-10-06

**Outcome: bounded code correction and mocked validation complete; full operational acceptance remains partial.** The dated records below are historical, not the current test verdict.

- Workspace: `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`, HEAD `685ef3229da012ed988388d512d91f3e3c4bad2e` plus the existing dirty tree.
- Owner: GPT-6.1 Sol (`openrouter/openai/gpt-6.1-sol`); Franco explicitly transferred the reserved package for hung-test diagnosis and validation. No Auth, credentials, real send, DB mutation, build/deploy or publication authorized for this continuation.
- Lock: transferred `reserved → editing → review → released`; only this package's lock released. Other local changes preserved.

### Diagnose

1. **Reproduce:** isolated `SendEmailModal.test.tsx` finished but the simulated case announced provider acceptance. Isolated `CoordinatorShareDialog.test.tsx` exceeded 30 seconds.
2. **Scope:** the two UI callers consume the same mail API; no route/service contract changes required.
3. **Evidence:** `ok()` returns `{ data }`, but both callers read `devMode` and `id` at the outer level. The Coordinator test allocated fresh feed/store arrays on every render; these invalidate `evidenceItems` and retrigger the selection effect. Once stabilized, the test finished rather than timing out. Its animation exit boundary and outdated selectors then prevented reaching the send action.
4. **Hypothesis / minimal fix:** unwrap `body.data` in both callers; read nested API error messages; reject missing success/ID instead of reporting success. Keep hook fixture collections stable; bypass only `AnimatePresence` in the Coordinator command test and use actual accessible recipient/send controls. Correct the audit mock argument types. Preserve existing transport, auth headers, templates, domain logic and foreign hunks.
5. **Validate / regression:** current four-file run **PASS, 16/16, exit 0**. Tests cover service simulation/acceptance/errors, route audit copy, both UI modes, provider ID callback, simulated Coordinator tracking, nested HTTP errors and malformed success bodies without success/close/tracking. Network and DB are mocked; this is not proof of real delivery or persistence.
6. **Review:** independent read-only general reviewer (`ses_eee62b3cdffedq10WaPd0umyTY`) reported **PASS** for this bounded correction with no confirmed regression. Reviewer did not rerun tests or typecheck.

### Files / validation / risks / next

- Changed source: `src/components/mail/SendEmailModal.tsx`, `src/components/coordinadores/CoordinatorShareDialog.tsx` (response handling only; the larger pre-existing Coordinator diff is not this continuation's work).
- Changed checks: `src/__tests__/components/SendEmailModal.test.tsx`, `src/__tests__/components/CoordinatorShareDialog.test.tsx`, `src/__tests__/unit/mail-send-honesty.test.ts`.
- **PASS:** focused mocked suite, 16/16; independent source review; scoped `git diff --check`.
- **FAIL:** global `tsc --noEmit --incremental false --pretty false`, exit 2, with four diagnostics outside this package: `next.config.ts:10` (`eslint` unsupported by `NextConfig`), `CoordinationPreviewBoundary.test.tsx:53,58` (missing `surgeryTimeSpecified`), `src/app/cirugias-api/page.tsx:179` (possibly undefined argument). No diagnostics remain in the five changed files. These files were not repaired or excluded to manufacture a green result.
- **NOT RUN:** build, real browser QA, DB integration/persistence and real Resend send. No server/browser session or env inspection started. The original full email task is not declared complete by these mocked checks.
- Before live acceptance: verify disposable DEV target, fixture/company and ownership; review the route's existing surgery resolution **after** dispatch and swallowed seguimiento failure; verify authorization data (the existing modal can substitute sample materials/administrator when absent). These are separate safety/domain boundaries, not silently changed by this UI-test package. Confirm explicit live-send scope and recipients before invoking the provider.
- Full current source snapshot hashes and exact replay commands: `VALIDATION_20261006.md`. Raw current runs: `EVIDENCE_20261006_tests.txt` and `EVIDENCE_20261006_typecheck.txt`. Historical failures remain below and in their original evidence files.

---

## Historical record — 2026-10-05

**Workspace:** `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`
**Branch / HEAD:** `ux/antigravity-redesign` @ `2138552`
**Lock:** `.opencode\locks\MAIL-SIMULATION-HONESTY-010-20261005.lock.md` (state: `reserved`; release NOT done in this session).
**Owner:** MiniMax-M3 (MiniMax), bounded honest-UI + audit-only edit.

## 1. What this package changed

The Resend mail-send path used to claim success in three places even when the email was only simulated or only accepted by the provider. This package removes those lies without touching the provider, credentials, or fallback behavior:

1. **API audit entry** (`src/app/api/companies/[companyId]/mail/send/route.ts`): the `createSeguimientoEntry` call now branches on `result.devMode` so the persisted note never says "Correo enviado". It always names the id, the recipients, the subject, the attachments, and explicitly says whether the id is simulated or accepted.
2. **SendEmailModal toast** (`src/components/mail/SendEmailModal.tsx`): the `toast.success(...)` after a successful send is now per-mode. The error path is untouched.
3. **CoordinatorShareDialog toast + tracking** (`src/components/coordinadores/CoordinatorShareDialog.tsx`): the `toast.success(...)` is now per-mode. The internal `registerTrackingEvent` now accepts an optional `simulated` flag and rewrites the action label so the seguimiento note carries the simulation tag when applicable. The `doctor-share` and `ntfy-broadcast` flows were not modified (they don't go through the Resend path).

## 2. Test inventory (after the evidence correction pass)

The previous `mail-send-honesty.test.ts` had three "service branches" that exercised a `vi.fn()` mock, not the real service. That was a real defect: a mock that returns a hard-coded shape is not a test of behavior. This pass splits the coverage into three focalized test files, each testing the real code path, with mocks only where they are required by the unit boundary:

| File | Layer | What it tests | Mocks used | How env/network is controlled |
| --- | --- | --- | --- | --- |
| `src/__tests__/unit/resend.service.test.ts` | service (real) | 5 cases: simulated (empty key), simulated (`mock_key` sentinel), provider-accepted (2xx), provider-error (non-2xx), thrown (fetch rejects) | `vi.spyOn(globalThis, "fetch")` only for the 2xx/non-2xx/thrown cases; simulated cases assert `fetch` was NOT called | `vi.stubEnv("RESEND_API_KEY", ...)` + `vi.unstubAllEnvs()` in `afterEach`; no real `process.env` read leaks across tests |
| `src/__tests__/unit/mail-send-honesty.test.ts` | route (real) | 3 cases: DEV/simulated audit copy, provider-accepted audit copy, error → no audit | `sendEmailWithResend` is mocked here (the route's contract is "compose the right audit copy from the service result"; the real service is covered above); `createSeguimientoEntry`, `resolveCompanySurgery`, `getApiAuthContext`, `requireCompanyMutationAccess`, `@/lib/prisma` | No env probe; no fetch; no DB |
| `src/__tests__/components/SendEmailModal.test.tsx` | UI (real) | 2 cases: devMode=true → "🧪 Correo simulado; no fue entregado."; devMode=false → "📨 Proveedor aceptó el envío (la entrega depende del proveedor)." | `useAuth` stub; `globalThis.fetch` mocked; `sonner.toast.success/error` spied | jsdom; no real network; the modal's own `fetch` is what the spy intercepts |
| `src/__tests__/components/CoordinatorShareDialog.test.tsx` | UI (real) | 2 cases: same two toast strings, on the email-formal path of the dialog | `useAuth`, `useOrtoTrackStore`, `useSeguimientoFeed` stubs; `globalThis.fetch` mocked; `sonner.toast.success/error` spied | jsdom; no real network; dialog's own `fetch` intercepted |

**Total cases authored (not executed in this session): 12.**
- Service: 5 (2 simulated + 1 accepted + 1 provider-error + 1 thrown)
- Route: 3 (simulated audit / accepted audit / error no-audit)
- UI: 4 (2 callers × 2 modes)

**Removed:** the previous "service contract" sanity case that only verified a mock was a function — gone, per the brief.

## 3. Exact messages by mode

| Mode | API `data.devMode` | `toast.success` (UI) | `Seguimiento` entry content header | `Seguimiento` entry summary |
| --- | --- | --- | --- | --- |
| DEV / simulated | `true` | `🧪 Correo simulado; no fue entregado.` | `🧪 Correo simulado; no fue entregado.` | `Simulación de correo formal a <to>…` |
| Provider accepted | `false` (undefined) | `📨 Proveedor aceptó el envío (la entrega depende del proveedor).` | `📧 Correo aceptado por el proveedor (no se confirma entrega).` | `Aceptación de correo formal a <to>…` |
| Error | n/a (400) | n/a (`toast.error(err.message)`) | n/a (no seguimiento entry written) | n/a |

## 4. Files in this package (final)

- `src/app/api/companies/[companyId]/mail/send/route.ts` — audit copy honest per mode.
- `src/components/mail/SendEmailModal.tsx` — toast per mode.
- `src/components/coordinadores/CoordinatorShareDialog.tsx` — toast per mode + `registerTrackingEvent` accepts `{ simulated }`.
- `src/lib/services/resend.service.ts` — read-only review confirmed the existing `devMode` field; no code change.
- `src/__tests__/unit/resend.service.test.ts` — new (real service, env-stubbed).
- `src/__tests__/unit/mail-send-honesty.test.ts` — rewritten: route layer only, with the service mocked at the route boundary (the only place the route contract is "what we put in the audit").
- `src/__tests__/components/SendEmailModal.test.tsx` — new (real modal, fetch mocked, toast spied).
- `src/__tests__/components/CoordinatorShareDialog.test.tsx` — new (real dialog, hooks mocked, fetch mocked, toast spied).
- `knowledge/specs/MAIL-SIMULATION-HONESTY-010-20261005/TASK_BRIEF.md` and `HANDOFF.md` — this file.
- `.opencode/locks/MAIL-SIMULATION-HONESTY-010-20261005.lock.md` — `reserved` (NOT released in this session).

## 5. Status (PASS / FAIL / BLOCKED / NOT RUN, separated)

- **Unit (real service, env-stubbed) — `resend.service.test.ts`:** **NOT RUN** in this session. The file was authored and reviewed; vitest was not invoked. When run, it must execute with no network and no real env probe.
- **Unit (route, service mocked) — `mail-send-honesty.test.ts`:** **NOT RUN**. Same status.
- **Component (UI, fetch mocked) — `SendEmailModal.test.tsx`:** **NOT RUN**.
- **Component (UI, hooks + fetch mocked) — `CoordinatorShareDialog.test.tsx`:** **NOT RUN**.
- **Integration (real DB) / browser QA:** **NOT IN SCOPE** for this package.
- **Real Resend / real send:** **NOT IN SCOPE AND NOT RUN**. No `RESEND_API_KEY` was set, no `fetch("https://api.resend.com/...")` was invoked.

Honest net: 12 test cases across 4 files are **authored and ready**, but their **runtime is NOT RUN** in this session. Roadmap 010 is **partially closed**: code + audit wiring in place, tests authored. The next MiniMax session must run `vitest run` on the four files and record PASS / FAIL per case; only then can the lock move to `released`.

## 8. Governance correction (2026-10-05, MiniMax)

Two governance / test-lifecycle defects were found in the previous revision of the UI test files and corrected without adding new tests or changing production behavior.

### 8.1 Lock scope (write allowlist) — corrected before any test edit

Before this correction, the lock's `owned files (write allowlist)` listed only the original `mail-send-honesty.test.ts` plus the production files. The three test files introduced in the evidence-fix pass (`resend.service.test.ts`, `SendEmailModal.test.tsx`, `CoordinatorShareDialog.test.tsx`) were not in the allowlist. That is a governance gap: writing them while they were not in the allowlist left the lock under-specified.

**Fix:** the lock now lists all four test files explicitly, with one-line scope notes per file. The lock remains `reserved`. No other lock content was changed.

### 8.2 Spy lifecycle in the two UI tests — corrected

Both `SendEmailModal.test.tsx` and `CoordinatorShareDialog.test.tsx` declared their `sonner.success` / `sonner.error` spies at module top-level with `vi.spyOn(sonner, "success").mockImplementation(() => {})`. The `afterEach` hook called `vi.restoreAllMocks()`. That is a real defect: `vi.restoreAllMocks()` restores **every** mock and spy, including the module-level sonner spies. The first test ran fine, but after the first `afterEach` the sonner spies were restored to the real `sonner.success` / `sonner.error`. The second test (and any subsequent one) had disconnected spies and would silently fail to observe any toast call.

**Fix (minimum, per the brief):**

- Keep the sonner spies declared at module top-level (persistent across cases).
- In `beforeEach`, clear call history with `toastSuccessSpy.mockClear()` / `toastErrorSpy.mockClear()` (already present).
- In `afterEach`, **do not** call `vi.restoreAllMocks()`. Instead, capture the per-test `fetch` spy in a local `let fetchSpy: ReturnType<typeof vi.spyOn> | null = null` and restore only that one with `fetchSpy?.mockRestore()` at the end of the case. The sonner spies stay connected for the next case.
- Both cases in each file now use `fetchSpy = mockFetchOnce(...)` instead of discarding the return value.

The spies are recreated implicitly on the first call because `vi.spyOn` returns the same mock object reference for the same `object.method` pair within the same module. No behavior change in production code; no new test cases; no new test files.

### 8.3 Status (this correction pass)

- All 4 test files: **NOT RUN** in this session. The brief explicitly said "no ejecutar tests todavía".
- Lock: `reserved` (NOT released).
- Production code (`resend.service.ts`, `mail/send/route.ts`, `SendEmailModal.tsx`, `CoordinatorShareDialog.tsx`): NOT touched in this correction pass.

## 6. Risks

- `vi.stubEnv` requires Vitest ≥ 0.26 and the runner must be configured to honor env stubs. The repo uses Vitest 4.1.6; this is safe. If a future runner downgrade breaks `vi.stubEnv`, the simulated-branch test will need to be rewritten with manual `process.env` save/restore.
- The `SendEmailModal` test renders the real `Dialog` from `@/components/ui/dialog` (Radix). Radix is happy in jsdom but a few `ResizeObserver` / `matchMedia` calls may emit warnings; they do not affect the test outcome.
- The `CoordinatorShareDialog` test is the most fragile of the four because the component has the most side-effecting hooks. If a future edit to the dialog changes the tab labels or the button text, the `getByRole("button", { name: /reporte formal/i })` selector must be updated. The test is kept intentionally narrow (one assertion per case) to localize breakage.
- The two UI tests assert the exact `toast.success` string. If the strings drift, both UI tests fail. The strings are mirrored in the audit-entry content and in the route's content header; if any one of the three drifts, all three layers (UI / route / audit) need a coordinated update.

## 7. Next

A separately approved session must:

1. Run `vitest run src/__tests__/unit/resend.service.test.ts src/__tests__/unit/mail-send-honesty.test.ts src/__tests__/components/SendEmailModal.test.tsx src/__tests__/components/CoordinatorShareDialog.test.tsx` (no network, no env probe) and record PASS / FAIL per case.
2. If all four files pass, release the lock `MAIL-SIMULATION-HONESTY-010-20261005.lock.md` to `released` and consider roadmap 010 closed for the in-scope surface (Resend path only).
3. If any test fails, the failure is local to one of the four cases and the fix is in code, not in the test (the tests are honest mirrors of the contract).
4. If the brief is ever extended to other providers (mail-stage1, ntfy, WhatsApp), do it in a separate, named task.

## 9. Diagnose fix: sonner import shape (2026-10-05, MiniMax)

The isolated test run (previous step) reported that the two UI test files failed at module load with `Error: The property "success" is not defined on the object` at the `vi.spyOn(sonner, "success")` line. The failure is a module-shape mismatch, not a logic bug.

**Root cause.** The two tests used `import * as sonner from "sonner"`. In this build of `sonner`, `success` and `error` are not enumerable properties of the namespace object; they live on the `toast` named export. Calling `vi.spyOn(sonner, "success")` on the namespace throws "property not defined". The service and route tests were unaffected because they do not import sonner.

**Fix (minimum, per the diagnose-fix brief).** Switch the import to the canonical `toast` named export (the same shape used by all production callers in this repo, e.g. `src/components/mail/SendEmailModal.tsx` line 32: `import { toast } from "sonner"`), and spy on the toast object's methods. No helper extraction, no global component, no production change.

- `src/__tests__/components/SendEmailModal.test.tsx`: `import * as sonner from "sonner"` → `import { toast } from "sonner"`; `vi.spyOn(sonner, "success")` → `vi.spyOn(toast, "success")`; same for `error`. The `mockClear` / `mockRestore` lifecycle in `beforeEach` / `afterEach` is unchanged (the `fetchSpy?.mockRestore()` pattern from §8.2 is preserved; the sonner spies stay persistent across cases as documented there).
- `src/__tests__/components/CoordinatorShareDialog.test.tsx`: same three-line edit.

**Status of this pass.**

- All 4 test files: **NOT RUN** in this session. The brief said "No ejecutar tests todavía".

## 10. Radix dialog mock + final validation attempt (2026-10-05, MiniMax)

After the rerun reported 4 UI test failures caused by a `Maximum update depth exceeded` loop in `@radix-ui/react-presence`, the next brief asked to mock `@/components/ui/dialog` (and `@/components/ui/sheet` for the mobile-only path in `CoordinatorShareDialog`) with native `div` / `h2` shells, then re-run the same 4-file command.

**Fix applied (only inside the 2 UI test files):**

- `src/__tests__/components/SendEmailModal.test.tsx`: added `vi.mock("@/components/ui/dialog", () => ({ Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter }))` with native primitives. Pattern lifted from the repo precedent `src/__tests__/components/CajasPreparation.http.test.tsx` line 17.
- `src/__tests__/components/CoordinatorShareDialog.test.tsx`: same `vi.mock("@/components/ui/dialog", …)` plus `vi.mock("@/components/ui/sheet", …)` for the mobile-only `Sheet*` path. The mock for the sheet module is still required even though the desktop path is taken in jsdom, because the production file imports both at module top-level.

No production change. No `components/ui/dialog` / `components/ui/sheet` / Radix / accessibility / productive copy touched.

**Final validation attempt — outcome: PROCESS HUNG, EXITCODE NOT CAPTURED, LOCK REMAINS `reserved`.**

The exact command from the brief was invoked:

```powershell
$dir = "knowledge\specs\MAIL-SIMULATION-HONESTY-010-20261005"
& .\node_modules\.bin\vitest.cmd run `
  src/__tests__/unit/resend.service.test.ts `
  src/__tests__/unit/mail-send-honesty.test.ts `
  src/__tests__/components/SendEmailModal.test.tsx `
  src/__tests__/components/CoordinatorShareDialog.test.tsx `
  1> "$dir\EVIDENCE_RERUN2_stdout.txt" `
  2> "$dir\EVIDENCE_RERUN2_stderr.txt"
$exitCode = $LASTEXITCODE
"EXITCODE=$exitCode" | Set-Content -Encoding utf8 "$dir\EXITCODE_RERUN2.txt"
```

The process exceeded the 300 s hard timeout and was killed by the host. Partial evidence captured before kill:

- `EVIDENCE_RERUN2_stdout.txt`: only the vitest header line ` RUN  v4.1.6 E:/OSSUM_COR_ANTIGRAVITY/ux-ui` followed by a blank line. No test report, no per-file breakdown, no PASS / FAIL counts. The four test files had not finished loading or running.
- `EVIDENCE_RERUN2_stderr.txt`: four Node `--localstorage-file` warnings (the same as the prior two runs); no test output, no error stack, no module-load failure. The process was alive but had not produced any test output before the timeout.
- `EXITCODE_RERUN2.txt`: **not created** — the timeout interrupted the command before the `"EXITCODE=$exitCode" | Set-Content` line ran.

Because the run hung without producing a report, the partial `EVIDENCE_RERUN2_*.txt` files were not credible evidence of a specific failure and were removed. The two complete historical evidence sets are preserved untouched:

- First run: `EVIDENCE_stdout.txt`, `EVIDENCE_stderr.txt`, `EXITCODE.txt` (module-load FAIL, EXITCODE=1).
- Second run (after sonner fix): `EVIDENCE_RERUN_stdout.txt`, `EVIDENCE_RERUN_stderr.txt`, `EXITCODE_RERUN.txt` (Radix Presence infinite loop, EXITCODE=1).

**Status of this package, after the timeout:**

- **Unit (service, real, env-stubbed) — `resend.service.test.ts`:** PASS (5/5 in the second run, 2026-10-05 18:19). Not re-executed in this attempt.
- **Unit (route, service mocked) — `mail-send-honesty.test.ts`:** PASS (3/3 in the second run, 2026-10-05 18:19). Not re-executed in this attempt.
- **Component (UI, dialog + sheet + fetch + sonner + hooks mocked) — `SendEmailModal.test.tsx`:** **UNKNOWN** — could not observe a verdict in this attempt because the whole invocation hung before producing any test output. The mock was applied but could not be validated in isolation in this session.
- **Component (UI, same mock set) — `CoordinatorShareDialog.test.tsx`:** **UNKNOWN** — same reason. The component is the most fragile of the four (most side-effecting hooks, mobile/desktop branch).
- **Integration (real DB) / browser QA:** NOT IN SCOPE.
- **Real Resend / real send:** NOT IN SCOPE.

**Lock state:** `reserved` (NOT released). The brief was explicit: "Si falla: Mantener lock reserved. No tocar producción. Registrar evidencia exacta y detenerse; no aplicar otro fix automático." The process did not produce a `EXITCODE=0`; the timeout itself is the "failure" signal. No further automatic fix is applied.

**Honest net:** the package is **partially closed and currently stuck**. The service + route layers are independently validated (8/8 PASS in run 2). The UI layer was edited with the Radix dialog + sheet mock per the brief, but the post-fix run hung for 300+ s with no test report and no exit code. Roadmap 010 remains **partially closed for the Resend audit path**; full closure of the package requires either (a) a new diagnostic session to identify the cause of the hang (the previous run produced a 4 s report with a clear Radix error, this run produced no report, which suggests a different problem — possibly a hook mock returning unstable references, or `useEffect`-driven re-render loops in `CoordinatorShareDialog`'s `useEffect` block at line 421-427 which iterates over `evidenceItems` and calls `setSelectedEvidenceIds` / `setSelectedSingleEvidenceId` on every render), or (b) further mock narrowing or component-mock substitution. Neither is in scope of this brief.
- Lock: `reserved` (NOT released).
- Production code: NOT touched. `git diff` confirms no new diffs on `resend.service.ts`, `mail/send/route.ts`, `SendEmailModal.tsx`, or `CoordinatorShareDialog.tsx` (the pre-existing diff on the last one is from the original package 010 session, not this pass).
- Evidence files: NOT modified. The previous run's `EVIDENCE_stdout.txt` / `EVIDENCE_stderr.txt` / `EXITCODE.txt` are preserved as historical evidence of the failed module load and remain the canonical record until the next isolated run.

## 11. Isolated per-file diagnostic round (2026-10-05, MiniMax)

Per brief, ran each UI test in isolation with 60 s timeout. The full per-file evidence is in DIAG_INDEX.md and the six DIAG_*_*.txt files. Summary:

- SendEmailModal.test.tsx: **TIMEOUT_60S**. Only the vitest RUN v4.1.6 banner was captured in stdout; 1 Node --localstorage-file warning in stderr. No test report, no error stack, no PASS/FAIL counts. The vitest process was alive but did not finish loading or running before the 60 s kill.
- CoordinatorShareDialog.test.tsx: **TIMEOUT_60S**. Same empty symptom: only the RUN v4.1.6 banner in stdout and 1 Node warning in stderr. No test report, no error stack. Same alive-but-stuck behaviour before the 60 s kill.

**Observed vs hypothesised:**

- OBSERVED: both runs produce only the vitest header + 1 Node warning; zero error stack, zero PASS/FAIL, zero unhandled-rejection output, zero Maximum update depth exceeded.
- NOT OBSERVED: the @radix-ui/react-presence stack from run 2 - so the Radix Presence loop is **not** the active cause of the current hang. The sendEmailModal hang in particular cannot be caused by useEffect in CoordinatorShareDialog because that component is not loaded by that test. The cause of the current hang is unknown; without a stack or unhandled-rejection dump, no file/hook/mock can be attributed.

**No fix applied.** Per the brief: do not apply an automatic fix; record evidence and stop. Lock remains eserved. Roadmap 010 remains partial / blocked. See DIAG_INDEX.md for the per-file raw captures, the observed-vs-hypothesised split, and the residual hypotheses (top-level unresolving Promise, persistent setTimeout, beforeAll/afterAll hook hang, etc.) that a future session with a wider tool allowance (e.g. --inspect, unhandled-rejection capture, or per-test isolation) can investigate.

