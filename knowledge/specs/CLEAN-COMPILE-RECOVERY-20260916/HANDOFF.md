# Compile Recovery — Review Handoff

## Done
- Resolved all 30 reproduced TypeScript diagnostics at baseline HEAD `90edeee`; final full no-emit check exits 0.
- Standard-mode apply, internal auto-chain units A-E; original workspace read-only. Runtime model: developer-declared `openai/gpt-6-astra`, not independently attested.
- Compile acceptance: **YES**, independent reviewer `tragic-aquamarine-lynx` / Engram #6909 accepted bounded A-E recovery with no confirmed introduced blocker or role widening.
- Functional/runtime acceptance: **BLOCKED**, not a completed product. Lock **released** after review and parent regression evidence.

## Changed / Files
| Unit | Exact review inventory | Root cause / recovery |
| --- | --- | --- |
| A | `src/lib/code128.ts`, `src/lib/gs1.ts`, `package.json`, `package-lock.json`, `src/__tests__/unit/recovered-identifiers.test.ts` | Omitted pure utilities/QR dependency. Existing implementations and reference dependency versions restored. Narrow size exception covers generated QR lockfile closure. |
| B | `src/lib/api/presupuestos.ts`, `src/components/email/SendExistingFinancialDocumentDialog.tsx`, `src/lib/permissions/financial-document-email.ts`, `src/__tests__/unit/recovered-financial-client.test.ts` | Omitted read client, dialog and existing role policy. API remains final authority; no role widening. |
| C | `src/lib/services/ai/azure-document-intelligence.ts`, `src/components/compras/ComprasOcrWorkspace.tsx`, `src/hooks/useComprasOcrForm.ts`, `src/__tests__/unit/recovered-ocr.test.ts`, `src/__tests__/unit/recovered-receipt-form.test.tsx` | Omitted OCR transport and component/hook callback contract. Failed async confirmation preserves input and does not claim success. |
| D | `prisma/schema.prisma`, `src/lib/services/presupuesto.service.ts`, `src/__tests__/unit/recovered-schema-contract.test.ts` | Missing Article/eligibility declarations and budget query fields. Source-backed minimal projection, zero-based position propagation, read-slot projection; existing monetary/state rules unchanged. |
| E | `src/lib/validators/surgery.validator.ts`, `src/__tests__/unit/recovered-surgery-timestamp.test.ts` | Unknown input wasn't narrowed through regex-result guard. Explicit string guard, no masking cast. |
| Docs | package `CHANGE_PACK.md`, `LOCK.md`, `HANDOFF.md`; `knowledge/worklog/WORKLOG.md` milestone | Approval, ownership, evidence and runtime caveats. |

## Validations
Executed from `E:/OSSUM_COR_WORKTREES/ossum-clean`:

```powershell
node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false
node node_modules/prisma/build/index.js format --config C:/Users/franc/AppData/Local/Temp/opencode/clean-compile-recovery-prisma.config.ts
node node_modules/prisma/build/index.js generate --config C:/Users/franc/AppData/Local/Temp/opencode/clean-compile-recovery-prisma.config.ts
node node_modules/vitest/vitest.mjs run src/__tests__/unit/recovered-identifiers.test.ts src/__tests__/unit/recovered-financial-client.test.ts src/__tests__/unit/recovered-ocr.test.ts src/__tests__/unit/recovered-receipt-form.test.tsx src/__tests__/unit/recovered-surgery-timestamp.test.ts src/__tests__/unit/recovered-schema-contract.test.ts src/__tests__/unit/pending-invoice-sources-hook.test.tsx src/__tests__/unit/compras-document-extractor.test.ts src/__tests__/components/FacturacionPage.backend.test.tsx src/__tests__/unit/presupuesto-service.test.ts src/__tests__/unit/invoice-service.test.ts src/__tests__/unit/invoice-create-route.test.ts src/__tests__/unit/pending-invoices-page.test.tsx src/__tests__/unit/payment-service.test.ts
git diff --check
npm run build
```

- TypeScript: **0 diagnostics** after generation and again after build.
- Prisma: **7.8.0**, format/generate exit 0, schema-only temporary config with no datasource or dotenv import. No migration/DB command.
- Tests: **86/86 passed, 14 files**, final combined run 2.92s. Prior exploratory runs are not added to this count. Nonfatal Node localstorage-file warnings observed; no storage failure.
- Independent evidence: reviewer #6909 and parent independently reran full no-emit TypeScript (**0 diagnostics**) and `git diff --check` (**PASS**). Separately, parent reports **41/41 passed across the original 8 geo/contact non-DB files** after recovery, using Vitest `startVitest` with `envFile: false` / `envDir: false`. These are separate from the implementer's 86 recovery tests; not a single combined run. No tests rerun during this documentation-only release.
- Pinned correction hash regression passes: `78d1320aafd9d18313b821af541bbe80accb26b0e6524da6ef9aa5ed6ffefe01`. SQL/test/geography documents unchanged by this executor.
- `git diff --check`: exit 0, CRLF warnings on tracked files. Untracked source validated by tsc/tests rather than this Git check.
- Build: webpack compilation **passed (25s)**; page-data collection **failed** with `Missing required environment variable: SUPABASE_URL`, reported for audit-events/OCR API imports. One attempt; no Auth/env workaround.
- Existing `next.config.ts` has `ignoreBuildErrors: true`; unchanged. Independent tsc, NOT the build's skipped type validation, establishes the typecheck result.

## Risks
- No connected DB certification: schema is a bounded source projection, not a complete schema sync or migration baseline. Do not run migrate/db push from this recovery. Existing migration/history debt untouched.
- Financial email dialog's POST `/invoices/[invoiceId]/email` is absent in clean (pre-existing gap). Reference closure adds outbound-email/Resend and React-PDF. The restored composer is not proof that email delivery works.
- Receipt callback's POST `/receipts` is absent in clean (pre-existing gap). Component/hook contract is repaired; receipt backend/stock persistence remains unavailable.
- Legacy budget writes omit family/contact/commercial fields required by the source authority migration, its slot/state lifecycle/check, and rate propagation consumed by `invoice.service`. This is a mutation/contract compatibility gate, not merely an empty pending list. Restored fields/read projection do not recover authority compatibility; setting approved budgets CURRENT alone is insufficient and must not be used as a workaround.
- `ArticleTraceabilityPolicy.policy` is required in the recovered historical V1.1 projection, but later source migration `20260824180000_guided_traceability_profile` permits NULL and introduces normalized profiles. The intended/live baseline and runtime reads against that later contract are not certified. Generated delegates and historical provenance do not establish compatibility. Partial-index upsert behavior and later taxonomy evolution also remain untested against a DB.
- Browser QA not run (belongs to parent). Live Azure/provider requests not made; tests use synthetic responses.
- No staging/commit/push/deploy, migration, business-data operation or secret/state inspection performed.

## Next
- Independent bounded compile review is accepted; ownership lock released.
- Parent will request explicit approval for bounded local environment recovery of the missing SUPABASE_URL precondition before attempting a fix or another build/browser validation. No environment/Auth fix attempted here.
- Treat missing email/receipt backend, budget authority compatibility and traceability baseline alignment as explicit runtime recovery scope decisions, not hidden compile success. Prior geography artifacts remain untouched.
