# REPLAY — Verified offline allowlist (roadmap task 003) — evidence-only revision

**Workspace:** `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`
**Branch / HEAD:** `ux/antigravity-redesign` @ `2138552`
**Runner (described, not re-checked in this revision):** Vitest 4.1.6, Node v25.2.1, environment `jsdom`, alias `@` → `./src`. See `vitest.config.ts` and `src/__tests__\setup.ts` (read in this session, see `RUNTIME_CLOSURE.md`).
**Constraint:** pass **explicit file paths only**. No whole-directory, wildcard, or substring selection.

## 1. Allowlist (11 files)

Each file below has a per-file static, first-level walk row in `RUNTIME_CLOSURE.md`. The eight files labelled `STATIC REVIEW — first-level closure / exercised paths` (including the 3 round-2 additions: #9, #10, #11) and the three files labelled `STATIC REVIEW — partial closure / exercised paths` (#6, #7, #8) are listed together; the closure label is in `RUNTIME_CLOSURE.md` and is not repeated here. Neither label is a proof of total transitive closure.

| # | Path (relative to `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`) |
| --- | --- |
| 1 | `src/__tests__\unit\cirugias-optabs.test.ts` |
| 2 | `src/__tests__\unit\cirugias-date-columns.test.ts` |
| 3 | `src/__tests__\unit\surgery.service-coordinator-read.test.ts` |
| 4 | `src/__tests__\unit\compras-movimientos.service.test.ts` |
| 5 | `src/__tests__\unit\stock-movement-origin-projection.test.ts` |
| 6 | `src/__tests__\unit\invoice-service.test.ts` |
| 7 | `src/__tests__\components\RolesPageRedirect.test.tsx` |
| 8 | `src/__tests__\components\ConfiguracionPageHonest.test.tsx` |
| 9 | `src/__tests__\integration\coordination-ezequiel-dev-overlay.test.ts` (round 2, static only) |
| 10 | `src/__tests__\integration\coordination-shipping-persistence-artifact.test.ts` (round 2, static only) |
| 11 | `src/__tests__\integration\contacts-backend-authority-migration-artifact.test.ts` (round 2, static only) |

The two previously included components (`SurgeryPalette.test.tsx`, `ChangeStateDialog.test.tsx`) are removed from this allowlist because they are in the active editing scope of the surgery-palette writer (lock `SURGERY-PALETTE-ORDER-CORRECTION-20261005`).

The 3 round-2 additions (#9–#11) are static-review classifications; no on-disk run evidence for them exists in this folder. They are reported as `NOT RUN` in `INVENTORY.md` §5. A future reproduction run that includes them must be authorised in a separate session and must capture fresh `HASHES_PRE.txt` / `HASHES_POST.txt` evidence before claiming non-mutation.

## 2. Process evidence on disk (preserved from previous session, 2026-10-05 17:07)

This revision does not re-execute tests. The evidence below is the on-disk evidence captured during the prior session of this package and is reported **as found**, not re-certified.

### 2.1 On-disk evidence files

- `E:\OSSUM_COR_ANTIGRAVITY\ux-ui\knowledge\specs\SAFE-TEST-INVENTORY-20261005\EVIDENCE_stdout.txt` — the stdout of a single prior `vitest.cmd run` call that targeted the 8 allowlist files.
- `E:\OSSUM_COR_ANTIGRAVITY\ux-ui\knowledge\specs\SAFE-TEST-INVENTORY-20261005\EVIDENCE_stderr.txt` — the corresponding stderr.
- `E:\OSSUM_COR_ANTIGRAVITY\ux-ui\knowledge\specs\SAFE-TEST-INVENTORY-20261005\EXITCODE.txt` — contains the single line `EXITCODE=0`, captured by the prior session immediately after the `vitest.cmd run` call via `$LASTEXITCODE`.

These three files are not modified by this revision. Their contents are quoted below for reference; the canonical record is the file itself.

### 2.2 Verbatim content of `EVIDENCE_stdout.txt` (as found)

```
 RUN  v4.1.6 E:/OSSUM_COR_ANTIGRAVITY/ux-ui

 Test Files  8 passed (8)
      Tests  39 passed (39)
   Start at  17:07:47
   Duration  3.87s (transform 1.30s, setup 1.21s, import 4.83s, tests 480ms, environment 9.20s)

EXITCODE=0
```

### 2.3 Verbatim content of `EVIDENCE_stderr.txt` (as found)

```
(node:22624) Warning: `--localstorage-file` was provided without a valid path
(node:1948) Warning: `--localstorage-file` was provided without a valid path
(node:8660) Warning: `--localstorage-file` was provided without a valid path
(node:23064) Warning: `--localstorage-file` was provided without a valid path
(node:24496) Warning: `--localstorage-file` was provided without a valid path
(node:23004) Warning: `--localstorage-file` was provided without a valid path
(node:23484) Warning: `--localstorage-file` was provided without a valid path
(node:9912) Warning: `--localstorage-file` was provided without a valid path

EXITCODE=0
```

### 2.4 Verbatim content of `EXITCODE.txt` (as found)

```
EXITCODE=0
```

### 2.5 What the evidence supports

The on-disk evidence in `EVIDENCE_stdout.txt`, `EVIDENCE_stderr.txt`, and `EXITCODE.txt` was generated in the prior session of this package. The following facts are reported **as on-disk evidence**, not as re-certified execution in this revision:

- `EVIDENCE_stdout.txt` reports a Vitest summary of `Test Files 8 passed (8)` and `Tests 39 passed (39)`, with the run starting at `17:07:47` and lasting `3.87s`.
- `EVIDENCE_stderr.txt` contains only Node `--localstorage-file` warnings, no test failure, no stack trace, no DB connection attempt.
- `EXITCODE.txt` contains `EXITCODE=0`, captured by the prior session via `$LASTEXITCODE` immediately after the `vitest.cmd run` call.

The following are **not** supported by the on-disk evidence and are therefore **not** claimed:

- The value of `$?` during the prior run. The prior session did not capture `$?`; only `$LASTEXITCODE` was captured. No value for `$?` is on disk.
- A causal relationship between the Node warning and the PowerShell exit code. The prior `REPLAY.md` claimed that the Node warning "explains" the PowerShell exit code; that claim is **withdrawn** here. The Node warning is present in `EVIDENCE_stderr.txt`; the captured exit code is `0`. No inference about causation is supported.
- The result of the earlier 44-test run. The earlier run's Vitest summary (`Test Files 8 passed (8)`, `Tests 44 passed (44)`) is historical evidence as reported in the previous `REPLAY.md`. It is not re-certified in this revision and its PowerShell exit code is **undetermined** because the prior session did not capture it.

### 2.6 Hashes (single capture, not re-computed in this revision)

The pre-run SHA-256 hashes for the 8 allowlist files were captured by the prior session and are recorded in the table below. The corresponding pre-run capture script was `Get-FileHash -Algorithm SHA256 <path>`. The capture moment was the prior session of this package (2026-10-05, around 17:07 local time).

| # | File | SHA-256 (single pre-run capture, as on disk) |
| --- | --- | --- |
| 1 | `…/unit/cirugias-optabs.test.ts` | `25B049E65EA090A033C3FB503330EC9E4C5023D72613EC180B0BD38C64EC9906` |
| 2 | `…/unit/cirugias-date-columns.test.ts` | `367EEC0F354207BA04C1F442857DB91C0966A31B1CA1D5E94F5162FAA0DDC4E1` |
| 3 | `…/unit/surgery.service-coordinator-read.test.ts` | `DFE22796B70615643E3CD259BA62E3EBF00BECCE876CDBA871A73145A7FAEE35` |
| 4 | `…/unit/compras-movimientos.service.test.ts` | `134FD8108D89C53AC1B4226B385247811369E3E290474DDA59D47725396411A0` |
| 5 | `…/unit/stock-movement-origin-projection.test.ts` | `EC84DBEAF3080554F40CE827408AFD868A18C3A400AF82C188C7AAF6FD52319D` |
| 6 | `…/unit/invoice-service.test.ts` | `3A7395FB831E47A94BB9CB501174E4080359BD09D0F8156FCB7A5FC5E21F4735` |
| 7 | `…/components/RolesPageRedirect.test.tsx` | `2C88DAFB744837253D6826CD060A710CA866FD4E315FFBBA8A6FAEDACD9C6BD3` |
| 8 | `…/components/ConfiguracionPageHonest.test.tsx` | `F0DDC16160612F1879909E024DB15E3D5E8A47B401E28408EACD3B35153F62FE` |

The previous `REPLAY.md` also reported a post-run hash capture and claimed that the post-run values "matched" the pre-run values. **The post-run capture is not in this package as a separate on-disk artifact.** No `POST_HASHES.txt` or equivalent file is in `knowledge\specs\SAFE-TEST-INVENTORY-20261005\`. The post-run values were reported only in the prior `REPLAY.md` text. **The hash-equality claim is therefore not verifiable from the on-disk evidence in this folder** and is **withdrawn** as evidence; the single pre-run capture in the table above is the only hash evidence preserved.

If a non-mutating run claim is needed, it must be re-established in a new session by capturing pre-run and post-run hashes to separate files inside this folder.

## 3. Adding a new file to the allowlist — required steps

Do **not** add a file by directory or by name. Each addition must:

1. Read the candidate file in full and grep it for the risk markers listed in `RUNTIME_CLOSURE.md` (test entry).
2. Read the SUT(s) the candidate imports at runtime, and walk at least the first-level transitive modules of each SUT, grepping for the same risk markers.
3. Record the import-closure inspection in `RUNTIME_CLOSURE.md` (add a row to the table) with a closure label: `STATIC REVIEW — first-level closure / exercised paths` or `STATIC REVIEW — partial closure / exercised paths`. Neither label is a proof of total transitive closure.
4. If a hash is needed, capture it to a file inside this folder (e.g. `HASHES.txt`) before any run; capture again after the run to a separate file; require match before claiming non-mutation.
5. Capture the process exit code to a separate file immediately after the run.
6. Only then add the file path to §1 of this document.

If any step fails or is unclear, leave the file as UNVERIFIED and **do not run it**.

## 4. Files and paths blocked by Sol1 DB hold (text only — no commands)

The following paths are blocked and **must not** be executed in this package. The list is text only; do not copy-paste a `vitest run` command for any of them. The list below is the DB/EXTERNAL category of `INVENTORY.md` §3, repeated here as a single named group for ease of reference.

| Blocked path | Reason |
| --- | --- |
| `src/__tests__\integration\cajas-preparation-postgres.test.ts` | Real `PrismaClient` + opt-in env flag + disposable DEV target required (Sol1 hold). |
| `src/__tests__\integration\consumos-api.test.ts` | `import prisma from "@/lib/prisma"` (L20). |
| `src/__tests__\integration\contacts-code-concurrency-postgres.test.ts` | Real `PrismaClient` + opt-in flag. |
| `src/__tests__\integration\devoluciones-api.test.ts` | `import prisma from "@/lib/prisma"` (L20). |
| `src/__tests__\integration\documentation-transactions.test.ts` | Real `PrismaClient` + opt-in flag + target URL gate. |
| `src/__tests__\integration\invoices-payments-api.test.ts` | `import prisma from "@/lib/prisma"` (L20). |
| `src/__tests__\integration\personal-calendar-postgres.test.ts` | `import prisma from "@/lib/prisma"` + `dotenv`; real Postgres. |
| `src/__tests__\integration\presupuesto-revision-postgres.test.ts` | Real `PrismaClient` + opt-in flag; refuses to import without disposable DEV target. |
| `src/__tests__\integration\presupuestos-api.test.ts` | `import prisma from "@/lib/prisma"` (L20). |
| `src/__tests__\integration\remitos-api.test.ts` | `import prisma from "@/lib/prisma"` (L20). |
| `src/__tests__\integration\surgery-visible-number-uniqueness-migration.test.ts` | `dotenv` + `PrismaClient` + opt-in flag. |

The 1 UNVERIFIED `integration/*` file (`mail-stage1-api.test.ts`) is also not in the allowlist; its status is UNVERIFIED, not BLOCKED, but it is not executable under the same per-file closure procedure as the allowlist. The other 3 `integration/*` files of the previous round 1 bucket (`coordination-ezequiel-dev-overlay.test.ts`, `coordination-shipping-persistence-artifact.test.ts`, `contacts-backend-authority-migration-artifact.test.ts`) were reclassified as ALLOW in round 2 — see `INVENTORY.md` §1.4 round-2 redistribution and `RUNTIME_CLOSURE.md` §"Round-2 added rows".

Also forbidden (text only, no commands): `npm test`, `npm run test:unit`, `vitest run` (without explicit file paths), `vitest run src/__tests__/unit`, `vitest run src/__tests__/components`, `vitest run src/__tests__/integration`, `npm run db:*`, `prisma db push`, `prisma migrate dev`, `prisma db seed`, `prisma migrate reset`, `playwright test`, `next build`, `next dev`, `next start`, and any command that touches `.next/`, `node_modules/.cache/`, the shared Cloudflare build output, or the surgery-palette files under the active palette locks.

## 5. Replay reproduction (to be done in a separately approved session)

To reproduce the on-disk evidence above, or to extend the allowlist, a separately approved session must:

1. Open a PowerShell terminal in `E:\OSSUM_COR_ANTIGRAVITY\ux-ui` at HEAD `2138552`.
2. Capture pre-run hashes for the 8 files in §1 to `HASHES_PRE.txt` (new file in this folder, not yet present).
3. Run the command quoted below, redirecting stdout and stderr to new files in this folder.
4. Capture `$LASTEXITCODE` immediately, write to `EXITCODE_NEW.txt` (new file). Do not overwrite the existing `EXITCODE.txt`.
5. Capture stdout to `EVIDENCE_NEW_stdout.txt` and stderr to `EVIDENCE_NEW_stderr.txt`. Do not overwrite the existing `EVIDENCE_*.txt`.
6. Capture post-run hashes for the 8 files to `HASHES_POST.txt` (new file).
7. Compare `HASHES_PRE.txt` and `HASHES_POST.txt`; require all 8 lines to match.
8. If step 4 returns non-zero, do not interpret the Vitest summary as PASS. Report FAIL with the captured exit code, exit, and re-evaluate per task §6.

The command is for reference only; do not run it under this package.

```powershell
.\node_modules\.bin\vitest.cmd run `
  src/__tests__/unit/cirugias-optabs.test.ts `
  src/__tests__/unit/cirugias-date-columns.test.ts `
  src/__tests__/unit/surgery.service-coordinator-read.test.ts `
  src/__tests__/unit/compras-movimientos.service.test.ts `
  src/__tests__/unit/stock-movement-origin-projection.test.ts `
  src/__tests__/unit/invoice-service.test.ts `
  src/__tests__/components/RolesPageRedirect.test.tsx `
  src/__tests__/components/ConfiguracionPageHonest.test.tsx
```

The 3 round-2 allowlist additions (`#9`, `#10`, `#11` in §1) are intentionally **not** included in this command. They have no on-disk run evidence in this folder; reproducing them is the responsibility of a separately approved session that must capture fresh `HASHES_PRE.txt` / `HASHES_POST.txt` for them before any `vitest run` call. Adding them to the command above without that pre-capture would be inconsistent with `RUNTIME_CLOSURE.md` §"What this inspection did and did not cover" and would risk an undocumented mutation.
