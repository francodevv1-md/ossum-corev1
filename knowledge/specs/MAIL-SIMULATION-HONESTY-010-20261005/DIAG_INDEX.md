# DIAG_INDEX — MAIL-SIMULATION-HONESTY-010 isolated UI test hangs

**Date:** 2026-10-05
**Workspace:** `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`
**Lock:** `MAIL-SIMULATION-HONESTY-010-20261005.lock.md` — `reserved` (NOT released).
**Brief:** run each UI test in isolation with 60 s timeout; capture stdout/stderr/exitcode as evidence; do not apply fixes.
**Tests NOT executed in this round (separate brief).** No production touched.

## Method

For each test file, in sequence (never parallel):

```powershell
$process = Start-Process -FilePath ".\node_modules\.bin\vitest.cmd" `
  -ArgumentList @("run", $test) `
  -RedirectStandardOutput "$dir\$name`_stdout.txt" `
  -RedirectStandardError "$dir\$name`_stderr.txt" `
  -PassThru -NoNewWindow
if ($process.WaitForExit(60000)) {
  "EXITCODE=$($process.ExitCode)" | Set-Content -Encoding utf8 "$dir\$name`_exitcode.txt"
} else {
  taskkill /PID $process.Id /T /F | Out-File -Append -Encoding utf8 "$dir\$name`_stderr.txt"
  "EXITCODE=TIMEOUT_60S" | Set-Content -Encoding utf8 "$dir\$name`_exitcode.txt"
}
```

Captured per file: `<name>_stdout.txt`, `<name>_stderr.txt`, `<name>_exitcode.txt`.

## Per-file result

| # | Test file | Status | Exit code | Wall time | Last observable output |
| --- | --- | --- | --- | --- | --- |
| 1 | `src/__tests__/components/SendEmailModal.test.tsx` | **TIMEOUT_60S** | `EXITCODE=TIMEOUT_60S` (set after `taskkill /T /F`) | ≥ 60 s, killed by host | `RUN  v4.1.6 E:/OSSUM_COR_ANTIGRAVITY/ux-ui` (stdout) + 1× `Warning: --localstorage-file was provided without a valid path` from PID 13168 (stderr). No test report, no error stack, no per-file breakdown, no PASS/FAIL counts. The vitest process did not finish loading or running. |
| 2 | `src/__tests__/components/CoordinatorShareDialog.test.tsx` | **TIMEOUT_60S** | `EXITCODE=TIMEOUT_60S` (set after `taskkill /T /F`) | ≥ 60 s, killed by host | `RUN  v4.1.6 E:/OSSUM_COR_ANTIGRAVITY/ux-ui` (stdout) + 1× `Warning: --localstorage-file was provided without a valid path` from PID 14656 (stderr). Same empty symptom as file 1. |

## Observed vs hypothesised

### Observed (from the captured stdout/stderr)

- Both runs emit only the vitest `RUN  v4.1.6 …` banner to stdout and one Node `--localstorage-file` warning to stderr.
- No "Maximum update depth exceeded" stack this time (that stack was seen in the **previous** run, `EVIDENCE_RERUN_stderr.txt`, when `@/components/ui/dialog` was NOT mocked).
- No module-load `TypeError` (the previous sonner import fix still holds).
- The Node PIDs in the stderr warning are 13168 and 14656 (one per test). `taskkill /T /F` was issued; the host shell reported "El proceso no puede obtener acceso al archivo … DIAG_*_stderr.txt porque está siendo utilizado en otro proceso" because the child Node process still held the redirect file handle. The `taskkill` did execute (the exit-code file was written successfully on the next pipeline stage).

### NOT observed (no evidence to attribute cause)

- **NOT observed:** a `Maximum update depth exceeded` stack from `@radix-ui/react-presence`. The run-2 evidence file `EVIDENCE_RERUN_stderr.txt` had this stack when `@/components/ui/dialog` was the real Radix component; this run, with native `div` shells, has none. So **the Radix Presence loop hypothesis is **not** the active cause of the current hang**.
- **NOT observed:** any error stack pointing to `useEffect` / `useState` in `SendEmailModal` or `CoordinatorShareDialog`. There is no React error boundary output at all.
- **NOT observed:** any error from `vi.mock` resolution, `sonner` import, `useAuth` / `useOrtoTrackStore` / `useSeguimientoFeed` / `fetch` mocks.
- **NOT observed:** Node out-of-memory or heap-grow message. The process simply did not produce further output before the 60 s kill.

### Hypotheses to investigate in a future session (NOT applied now)

The symptom is "the vitest child stays alive past 60 s after printing only the banner". This pattern is consistent with the child process waiting for a non-Node resource that never resolves, e.g.:

- A top-level `await` of a `Promise` that never resolves, in the test module body or in a mock factory.
- A `setTimeout` / `setInterval` that never clears.
- An open file handle / socket / worker that keeps the event loop alive.
- A `beforeAll` / `afterAll` hook that hangs.

Without a stack trace, an unhandled-rejection dump, or a `--inspect` heap snapshot, the cause cannot be attributed to a specific file, hook, or mock. The brief is explicit: do not apply an automatic fix; record evidence and stop.

## Zombi / leftover processes (informational, NOT touched in this round)

`Get-Process` after the two kills showed Node PIDs 13168 and 14656 (the killed vitest children) plus their parent cmd PIDs and several pre-existing PIDs from earlier in the session. The brief did not authorise process management, so this is recorded as observation only.

## Conclusion for this diagnostic round

- **SendEmailModal.test.tsx** — hangs silently at 60 s. Verdict: **TIMEOUT_60S**.
- **CoordinatorShareDialog.test.tsx** — hangs silently at 60 s. Verdict: **TIMEOUT_60S**.

Both UI tests are unresponsive in their current state; neither produces a reportable PASS/FAIL. The package is **stuck**, not blocked on a known cause. Lock remains `reserved`. Roadmap 010 remains partial.
