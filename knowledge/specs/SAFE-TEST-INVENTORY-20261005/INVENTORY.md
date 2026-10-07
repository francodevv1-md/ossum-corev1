# INVENTORY — Offline test safety (roadmap task 003) — evidence-only revision

**Workspace:** `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`
**Branch / HEAD:** `ux/antigravity-redesign` @ `2138552` (dirty, unrelated local changes preserved).
**Inspection date:** 2026-10-05.
**Owner:** MiniMax-M3 (MiniMax), bounded read-only inventory.
**Sol1 DB hold:** respected absolutely — no DB connections, queries, seed, cleanup, migrations, forensics, or environment probing performed in this session.

## 1. Scope, method, and explicit limits

### 1.1 Total file count (computed from disk, 2026-10-05)

| Directory | Count |
| --- | ---: |
| `E:\OSSUM_COR_ANTIGRAVITY\ux-ui\src\__tests__\unit\` (`*.test.ts*`) | 202 |
| `E:\OSSUM_COR_ANTIGRAVITY\ux-ui\src\__tests__\components\` (`*.test.tsx`) | 97 |
| `E:\OSSUM_COR_ANTIGRAVITY\ux-ui\src\__tests__\integration\` (`*.test.ts*`) | 16 |
| **Total** | **315** |

The full per-file name list is in `PATHS_315.md` (annex). The 315 paths are the only files this package inventories.

### 1.2 Files NOT inventoried

- `E:\OSSUM_COR_ANTIGRAVITY\ux-ui\e2e\compras-oc-receipt.spec.ts`
- `E:\OSSUM_COR_ANTIGRAVITY\ux-ui\e2e\surgery-intake-approval.spec.ts`
- Any other Playwright spec under the root `e2e/` directory
- Any test file under `playwright.*.config.ts` configurations

These are out of scope per the task brief and **must not** be added to the offline allowlist.

### 1.3 Method

1. **Allowlist (8 files):** per-file import-closure walk recorded in `RUNTIME_CLOSURE.md` (test → SUT → first-level transitive modules; grep for risk markers at every level).
2. **DB/EXTERNAL (11 files):** per-file top-of-file inspection confirmed direct `import prisma from "@/lib/prisma"`, real `PrismaClient` instantiation, `dotenv` import, and/or env-flag-gated integration with a disposable DEV target. Each file has a concrete evidence entry in §3.
3. **`surgeries-create-api.test.ts`:** top-of-file inspection confirmed `vi.mock("@/lib/prisma", …)`. Classified as **VERIFIED OFFLINE (mocked, outside allowlist)**, not as DB/EXTERNAL.
4. **All other files (292):** no per-file closure inspection in this session (except `mail-stage1-api.test.ts`, which has a non-allowlist walk row `UNV-1` in `RUNTIME_CLOSURE.md` and is held `UNVERIFIED` by conservative decision; that row does not change its category). Classified as **UNVERIFIED** at the file-list level only. I do not claim VERIFIED OFFLINE for them; I do not claim DB/EXTERNAL for them either.

### 1.4 Safety categories (disjoint, sum to 315)

| Category | Count | Definition |
| --- | ---: | --- |
| **VERIFIED OFFLINE — allowlist** | 11 | Files with **static, first-level import-closure evidence** in `RUNTIME_CLOSURE.md` (test → SUT → first-level transitive modules, grep for risk markers). The on-disk Vitest run is **historical evidence** for the original 8 files, not a re-execution or re-certification in any revision. See `RUNTIME_CLOSURE.md` and `REPLAY.md` §2. |
| **VERIFIED OFFLINE — mocked, outside allowlist** | 1 | `surgeries-create-api.test.ts`: mocks `@/lib/prisma` with `vi.mock`; not in the allowlist because of historical scope convention, not because of evidence. |
| **DB/EXTERNAL** | 11 | Files with concrete evidence of real-client or disposable-target-gated integration (see §3). |
| **UNVERIFIED** | 292 | Files with no per-file closure walk in this session, **except** `mail-stage1-api.test.ts`, which has a non-allowlist per-file walk row `UNV-1` recorded in `RUNTIME_CLOSURE.md` §"Non-allowlist walked in round 2 (held UNV by conservative decision)" and is held `UNVERIFIED` by the round-2 conservative decision. The UNV bucket also includes the 1 `describe.skip` file. |
| **Total** | **315** | Disjoint union. |

`UNVERIFIED` and `DB/EXTERNAL` are the only mutually exclusive safety categories for the 304 non-allowlist files. The 12 `VERIFIED OFFLINE` files (11 + 1) are mutually exclusive with both. `NOT RUN` is an **execution status**, not a safety category, and is not counted in this table; see §5.

**Round-2 redistribution (2026-10-05, second correction by MiniMax, no execution, no DB):**

| Round | ALLOW | MOCKED | DB-EXT | UNV | Sum |
| ---: | ---: | ---: | ---: | ---: | ---: |
| Round 1 (prior accepted correction) | 8 | 1 | 11 | 295 | 315 |
| Round 2 (this revision) | **11** | 1 | 11 | **292** | 315 |

Reclassified as ALLOW by round 2 (full per-file evidence in `RUNTIME_CLOSURE.md` §"Round-2 added rows"):

- `src/__tests__\integration\coordination-ezequiel-dev-overlay.test.ts` — pure ports-in-memory SUT, zero DB / network / filesystem / env, `STATIC REVIEW — first-level closure / exercised paths`.
- `src/__tests__\integration\coordination-shipping-persistence-artifact.test.ts` — only `readFileSync` of two static files + string assertions, zero runtime SUT, `STATIC REVIEW — first-level closure / exercised paths`.
- `src/__tests__\integration\contacts-backend-authority-migration-artifact.test.ts` — only `readFileSync` of one static file + string assertions, zero runtime SUT, `STATIC REVIEW — first-level closure / exercised paths`.

Held UNV by round 2 (conservative, see §4 for evidence note):

- `src/__tests__\integration\mail-stage1-api.test.ts` — full first-level chain walked in this session; the per-file walk row `UNV-1` is recorded in `RUNTIME_CLOSURE.md` §"Non-allowlist walked in round 2 (held UNV by conservative decision)". The static walk found no `@/lib/prisma`/`pg`/Supabase in the chain; auth + extractor + `resolveCompanySurgery` are `vi.mock`-stubbed; the `mail-stage1/repository` and `mail-stage1/evidence-store` paths use a singleton `FileSystemMailStage1Repository` + `FileSystemMailEvidenceStore` writing to a per-run `os.tmpdir()/ossum-mail-stage1-api-test-<timestamp>/` directory set via `vi.hoisted` before module load and removed by `afterAll`. Side effects on the filesystem are real but confined to a per-run disposable temp directory; no DB, no network, no R2/S3 instantiation in test (`canUseR2Store` returns false when `NODE_ENV === "test"` and `MAIL_EVIDENCE_STORE_FORCE !== "r2"`), no Supabase call. **Conservative decision:** the file is **not** added to the allowlist because (a) the historical `MOCKED-OFFLINE` convention applies to files that mock `@/lib/prisma` specifically, and this file mocks different modules; (b) the file is the only `integration/*` test with a partial-mocks + filesystem-side-effect profile; (c) real filesystem writes plus partial `vi.mock` justify keeping it `UNVERIFIED` rather than fabricating a `STATIC REVIEW — first-level closure / exercised paths` label that the allowlist convention requires for `ALLOW`. The walk is on the record; the classification is `UNVERIFIED`.

### 1.5 Files NOT RUN (execution status only)

The following files are **execution status: NOT RUN**. Their safety classification is independent and given in §2 / §3 / §4.

| File | Reason for NOT RUN |
| --- | --- |
| All 11 DB/EXTERNAL files in §3 | Sol1 DB hold; not executed in this session. |
| All 292 UNVERIFIED files in §4 | No closure walk; not executed in this session. |
| `surgeries-create-api.test.ts` | Outside allowlist; not executed in this session. |
| The 3 round-2 ALLOW additions (`#9`, `#10`, `#11` in §2) | No on-disk run evidence in this folder; the round-2 classification is static only. Their NOT RUN is consistent with the prior correction's status for any non-run allowlist file. |

## 2. Allowlist — static, first-level closure (11 files)

Each file has a row in `RUNTIME_CLOSURE.md` with the first-level transitive walk and a uniform closure label. The on-disk SHA-256 hashes recorded in `REPLAY.md` §2.6 are a **single pre-run capture** from the prior session; **no post-run hash file is in this folder**, so the package does not claim a non-mutating run. The Vitest summary and exit code in `EVIDENCE_*.txt` / `EXITCODE.txt` are **on-disk historical evidence** from the prior session; they are not re-certified in any revision. The 3 round-2 additions (#9–#11) have **no on-disk run evidence**; they are added to the allowlist by static review only.

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
| 9 | `src/__tests__\integration\coordination-ezequiel-dev-overlay.test.ts` (round 2) |
| 10 | `src/__tests__\integration\coordination-shipping-persistence-artifact.test.ts` (round 2) |
| 11 | `src/__tests__\integration\contacts-backend-authority-migration-artifact.test.ts` (round 2) |

Closure classification per file (see `RUNTIME_CLOSURE.md` for the per-file walk):

- **STATIC REVIEW — first-level closure / exercised paths** (test → SUT → first-level transitive modules walked; no `?raw` imports, no `vi.mock` of the SUT, no risk markers in chain): #1, #2, #3, #4, #5, #9, #10, #11.
- **STATIC REVIEW — partial closure / exercised paths** (SUT accepts `prisma`/`db` as parameter; transitive modules walked at the first level; non-exercised exported helpers in the SUT or second-level framework/UI modules not walked): #6, #7, #8.

The label `first-level closure` means test → SUT → first-level transitive modules of the SUT. It does **not** mean a full transitive walk to every leaf. The label `partial closure` is used when one or more second-level modules (UI primitives, framework modules, non-exercised SUT exports) were not walked. See `RUNTIME_CLOSURE.md` for the per-file scope of each walk, including the new round-2 rows for #9, #10, #11.

## 3. DB/EXTERNAL — concrete evidence (11 files)

Each file has at least one concrete piece of evidence. Directory membership is **not** a safety signal here: `surgeries-create-api.test.ts` lives under `integration/` but is OFFLINE (mocked); the 11 below are DB/EXTERNAL because of the listed evidence.

| Path | Evidence |
| --- | --- |
| `src/__tests__\integration\cajas-preparation-postgres.test.ts` | `import type { Prisma, PrismaClient } from "@prisma/client"`; `let db: PrismaClient`; gate on `OSSUM_RUN_CAJAS_DEV_INTEGRATION=true`; target URL must match `db.${REF}.supabase.co` or `aws-1-sa-east-1.pooler.supabase.com`. |
| `src/__tests__\integration\contacts-code-concurrency-postgres.test.ts` | `import type { PrismaClient } from "@prisma/client"`; `let prisma: PrismaClient`; opt-in env flag. |
| `src/__tests__\integration\documentation-transactions.test.ts` | `import type { PrismaClient } from "@prisma/client"`; opt-in env flag; target URL gate. |
| `src/__tests__\integration\personal-calendar-postgres.test.ts` | `import { config } from "dotenv"`; `import { prisma } from "@/lib/prisma"`; describe block named "personal calendar real PostgreSQL persistence & acceptance". |
| `src/__tests__\integration\presupuesto-revision-postgres.test.ts` | `throw new Error("Presupuesto PostgreSQL test refused: explicit confirmed disposable DEV gate missing")`; opt-in env flag. |
| `src/__tests__\integration\surgery-visible-number-uniqueness-migration.test.ts` | `import { config as loadEnv } from "dotenv"`; `import type { PrismaClient } from "@prisma/client"`; opt-in env flag. |
| `src/__tests__\integration\consumos-api.test.ts` | `import prisma from "@/lib/prisma"` (L20). |
| `src/__tests__\integration\devoluciones-api.test.ts` | `import prisma from "@/lib/prisma"` (L20). |
| `src/__tests__\integration\invoices-payments-api.test.ts` | `import prisma from "@/lib/prisma"` (L20). |
| `src/__tests__\integration\presupuestos-api.test.ts` | `import prisma from "@/lib/prisma"` (L20). |
| `src/__tests__\integration\remitos-api.test.ts` | `import prisma from "@/lib/prisma"` (L20); cited by `HOJA_DE_RUTA_MVP_2026-10-04.md:73` and `DEV_ENV_AND_PROCESS_TESTS.md:11` as a non-inocuous suite. |

DB/EXTERNAL total: **11**.

## 4. UNVERIFIED — 292 files, file-list evidence only (with one non-allowlist per-file walk row)

These 292 files are listed in `PATHS_315.md` (annex, group "UNVERIFIED — 292 files"). All of them are held `UNVERIFIED` at the file-list level only, **except** `mail-stage1-api.test.ts`, which has a per-file walk row `UNV-1` recorded in `RUNTIME_CLOSURE.md` §"Non-allowlist walked in round 2 (held UNV by conservative decision)"; the per-file walk is on the record, the classification is held `UNVERIFIED` for the conservative reasons in that row. They include:

- All 196 other `src/__tests__\unit\*.test.ts*` files (202 total − 6 ALLOW = 196; round 2 does not move any `unit/` file, so the UNV count here is unchanged: 195 plain + 1 `UNV (describe.skip)` = `remitos-022.test.ts`).
- All 95 other `src/__tests__\components\*.test.tsx` files (97 total − 2 ALLOW = 95).
- The 1 `src/__tests__\integration\` file still in the UNV bucket:
  - `mail-stage1-api.test.ts` — round 2 walked the first-level runtime chain and found no DB / network / R2 / Supabase call. Three `vi.mock`s stub the auth context, `resolveCompanySurgery`, and the AI extractor. The persisted state is a singleton `FileSystemMailStage1Repository` + `FileSystemMailEvidenceStore` writing to `os.tmpdir()/ossum-mail-stage1-api-test-<timestamp>/` (set via `vi.hoisted` before module load, removed by `afterAll`). `canUseR2Store()` is `false` in test unless `MAIL_EVIDENCE_STORE_FORCE=r2` is set, and the test does not set it; the `R2MailEvidenceStore` / `S3Client` is therefore never instantiated. The full per-file walk evidence is recorded in `RUNTIME_CLOSURE.md` row `UNV-1` (§"Non-allowlist walked in round 2 (held UNV by conservative decision)"). **Conservative decision:** held UNV in this revision, see §1.4 round-2 redistribution; the walk is on the record but the classification remains `UNVERIFIED` for the reasons in `RUNTIME_CLOSURE.md` row `UNV-1`.
- The 1 `describe.skip` file:
  - `src/__tests__\unit\remitos-022.test.ts` — both `describe.skip`; not a DB risk on its own but no closure walk was performed.

**Total UNVERIFIED: 292.** Arithmetic from the per-file table in `PATHS_315.md`:

- `unit/` (202): 6 ALLOW + 196 UNV (195 plain + 1 `UNV (describe.skip)` = `remitos-022.test.ts`).
- `components/` (97): 2 ALLOW + 95 UNV.
- `integration/` (16): 11 DB-EXT + 1 MOCKED-OFFLINE + 3 ALLOW (round 2) + 1 UNV.
- 196 + 95 + 1 = **292**.
- Total file count check: 6 + 196 + 2 + 95 + 11 + 1 + 3 + 1 = 315. ✓

The per-file table in `PATHS_315.md` is the authoritative index.

## 5. NOT RUN — execution status only

NOT RUN is a status that applies to every file this package did not execute:

- All 11 DB/EXTERNAL files: NOT RUN.
- All 292 UNVERIFIED files: NOT RUN.
- `surgeries-create-api.test.ts`: NOT RUN (outside allowlist).
- The 8 original allowlist files: status is **PASS** (see `REPLAY.md` §3 and `EXITCODE.txt`).
- The 3 round-2 ALLOW additions (`#9`, `#10`, `#11` in §2): NOT RUN in this session; the round-2 classification is static only and did not perform or capture a Vitest run.

The previous package's claim that `unit/remitos-022.test.ts` "is NOT RUN because of `describe.skip`" is preserved: that file is also NOT RUN in this session, on the same grounds, with safety classification **UNVERIFIED**.

## 6. Claims withdrawn for lack of evidence

- The previous `INVENTORY.md` reported "VERIFIED OFFLINE: 299 / DB/EXTERNAL: 15 / NOT RUN: 1" based on a directory-level heuristic. That classification is **withdrawn**; this package uses per-file evidence instead and the 299 figure is replaced by 9 (8 allowlist + 1 mocked-offline).
- The previous `RUNTIME_CLOSURE.md` claimed "full import-closure" for the 8 allowlist files while admitting that transitive closure was not walked. This revision replaces the wording with a uniform static-review label: 5 files are labelled `STATIC REVIEW — first-level closure / exercised paths` and 3 files are labelled `STATIC REVIEW — partial closure / exercised paths`. The `RUNTIME_CLOSURE.md` document explicitly states that neither label is a proof of total transitive closure.
- The previous `REPLAY.md` claimed that "the Node `--localstorage-file` warning explains the PowerShell exit code". That causal claim is **withdrawn**; see `REPLAY.md` §3 for the corrected wording. Only the captured values in `EXITCODE.txt` and the on-disk stdout/stderr are reported as evidence.
- The previous `HANDOFF.md` described the prior 44-test run's exit code as "unresolved". That description is preserved but separated from the new run's evidence; see `HANDOFF.md` §3.

**Round 2 — claims preserved or added (no claim is withdrawn in round 2):**

- The round-1 category split (8 ALLOW + 1 MOCKED + 11 DB-EXT + 295 UNV = 315) is preserved as the prior accepted correction. Round 2 reclassifies 3 of the 4 `integration/*` files previously UNV to ALLOW and holds 1 (`mail-stage1-api.test.ts`) UNV; the 315 sum is preserved (11 + 1 + 11 + 292 = 315).
- Round 2 does not claim any of the 3 new ALLOW files has been executed; they are added on static-review evidence only and are reported as NOT RUN in §5.
- Round 2 does not claim `mail-stage1-api.test.ts` is DB/EXTERNAL or ALLOW; the conservative UNV assignment is documented in §1.4 and §4.
- Round 2 does not introduce any new on-disk evidence files (`EVIDENCE_*.txt`, `EXITCODE.txt`, `HASHES_*.txt`); the existing three files are preserved unchanged.

## 7. Annex — `PATHS_315.md`

The annex lists each of the 315 paths together with its safety classification. It is the canonical auditable index for the 315-file count.
