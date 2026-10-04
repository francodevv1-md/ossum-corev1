# Continue tracked OC receiving — Antigravity

Work directly in **E:\OSSUM_COR_ANTIGRAVITY\ux-ui**. Finish the existing tracked receiving implementation; do not restart it or create another inventory architecture.

## Objective
Validate and finish native OC receiving with lots, serials and expiration, preserving one atomic OC + Receipt + StockMovement + identity/audit transaction and replay safety. Existing NONE quantity receiving already has real DEV acceptance; extend it without regressions.

## Required context and ownership
Read AGENTS.md, this task's TASK_BRIEF.md, HANDOFF.md and .opencode/locks/OC-TRACKED-RECEIPT-DEV-001.lock.md. Load at most two relevant project skills: ossum-safe-changes and ossum-process-e2e. Inspect git status/diff and all current locks before writing. The previous backend/UI/recovery writers for this task have finished; take a new explicit lock for the exact files you edit. Other tasks/agents may still be active: do not assume their files or runtime are free.

Use your configured model; do not change providers, models, OpenCode configuration or permission rules. Continue engineering within this approved DEV outcome without asking approval for internal phases. Ask only for genuine scope/ownership/security/real-data/architecture boundaries.

## Confirmed business rules — do not re-ask
- Physical receiving remains Admin/Logistics only; no coordinator stock rights. Reuse existing guards/capabilities; no global role/Auth/RLS changes.
- Serial numbers are unique across the entire company, including different articles and retired identities. Existing accepted-operation replay is not another registration. Returns/reactivation are separate, not new OC units.
- Valid expired material **is received and generates a warning**, without blocking receiving or inventing quarantine. Persist warning evidence and show it to the user/in-app notice. Do not change downstream Cajas/use/preparation policies or claim a complete serialized lifecycle.
- Expiration input is a strict real YYYY-MM-DD calendar date. Current implementation uses UTC calendar days: before today is expired; today is not expired.
- Preserve old NONE normalized intent JSON exactly. Same accepted key/normalized payload returns prior effects without duplicate Receipt/unit/movement/audit/notice; changed trace under the same key conflicts.

## Already implemented — preserve
Backend allocation contract:
`receivedByItem[].allocations?: [{ quantity, lotCode?, serialNumber?, expirationDate? }]`.

Six policies: NONE, LOT, LOT_EXPIRY, SERIAL, SERIAL_EXPIRY, LOT_SERIAL_EXPIRY. Required trace fields follow current server-owned Article policy. Exact Decimal allocation sums match received totals. Serial allocation quantity is one. Multiple ReceiptLines map to one OC item via lineNumber/itemsByLine; increment the OC total once per item.

Scoped OC/Article locks, active company/organization/supplier/article eligibility, company-wide serial registration through existing helper/constraint, lot/expiry conflicts, transaction rollback and accepted-key lookup before final state rejection are implemented. No schema changes were made. Existing shared ledger remains the only physical balance authority.

UI supports allocation rows, canonical policy lookup with exact Article fallback, expired advisories, and frozen trace/location/key/payload on uncertain outcomes. Selectors include `receipt-item-{itemId}` and `receipt-allocation-{itemId}-{index}`. Missing/unknown policies must not silently become NONE.

Prior review found two backend defects and a recovery writer fixed them:
1. Persisted expired warnings now reach the post-commit in-app notice as WARNING/body/metadata, with no duplicate notice on replay.
2. Exact Decimal spellings such as 1.00000, 1.00000e0 and 0.00001e5 normalize to one; significant excess precision still rejects.

## Evidence — honest status
- Backend recovery reports **147 mocked tests / four files PASS**; before fixes, eight added checks failed.
- UI owner reports **46 mocked checks / three suites PASS**.
- These were phase-specific runs, not a fresh consolidated final run or live traced acceptance.
- TypeScript reports the known foreign `next.config.ts` unsupported `eslint` property; do not edit unrelated configuration or disable checks to obtain green.
- **Tracked browser/real DB acceptance has NOT RUN.** No new tracked SKU/OC/live serial registry mutations have been executed by this task.

## Remaining work — execute in order
1. Run the consolidated focused allowlist below. Older `useOrdenesCompra-receipt-reconciliation.test.tsx` fixtures omit the new readonly policy prop: add explicit NONE policy to those test fixtures if required, not a production NONE fallback.
2. Independently re-review the two backend corrections and UI integration. Fix only reproduced defects with Diagnose. Confirm warning content/persistence/replay, Decimal compatibility, trace-field freeze, date validation, serial duplication and lot/expiry conflict behavior.
3. Create a saved reusable Playwright test for fresh isolated DEV fixtures. Exercise native receiving with representative lot/expiry and serial/combined policies, valid expired acceptance + visible/persistent warning, same-key replay/reordered allocations, changed-trace conflict, duplicate serial across different articles, and unchanged stock/OC/identity counts after rejection.
4. Verify canonical ReceiptLine + StockMovement lot/serial/expiration, explicit location, physical balance, identity registration and actor/audit links after reload. Verify NONE regression. Use only new QA SKUs/OCs; do not backfill earlier completed OCs or modify real records.
5. Obtain final independent review, update this task's HANDOFF/worklog, release ownership, and give Franco the same runnable replay command with PASS/FAIL/BLOCKED/NOT RUN.

### Focused commands
From the worktree, use the installed runner, not whole `npm test`:

```powershell
node node_modules/vitest/vitest.mjs run src/__tests__/unit/orden-compra-tracked-receipt.test.ts src/__tests__/unit/orden-compra-stock-receipt.test.ts src/__tests__/unit/orden-compra-stock-receipt-route.test.ts src/__tests__/unit/orden-compra-validators.test.ts src/__tests__/components/ReceiveOrdenCompraDialog.test.tsx src/__tests__/components/TrackedReceiveOrdenCompraDialog.test.tsx src/__tests__/components/OrdenCompraEmitAction.test.tsx src/__tests__/unit/useOrdenesCompra-receipt-reconciliation.test.tsx
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

## Source focus
- src/lib/services/orden-compra.service.ts
- src/lib/services/receipt.service.ts
- src/lib/validators/orden-compra.ts; src/lib/api/ordenes-compra.ts
- src/components/compras/ReceiveOrdenCompraDialog.tsx
- src/app/compras/ordenes-compra/page.tsx
- Focused tests above; new scoped QA artifacts after declaring ownership.

Read-only reuse: stock-physical-unit helper, stock-ledger and existing permissions. Preserve unrelated dirty schema/source. No StockPhysicalUnit/Cajas lifecycle rewrite or new ledger.

## Runtime and hard limits
Previously identified disposable DEV company is **codevdistricorr1000000000**; server was listening on127.0.0.1:5000, owned by the readiness task. Reverify the same target and ownership before mutations; localhost is not target proof. Do not repeatedly ask for the same confirmed target if unchanged. If target/config changed, stop.

Auth is a prerequisite: fresh headed manual login when saved state is expired, save outside Git, authenticated company/role200 preflight, reuse it. Never modify Auth or automate credentials to rescue tests. Do not read/publish session or .env values into chat. Browser sessions max20minutes; close on block and report it.

Do not run held Sol1 DB suites/forensics, migrations/reset/cleanup, production/staging, fiscal/mail issuance, commit/push/PR/deploy. No installs/new dependencies unless truly part of an explicitly approved task. Current stored QA state from prior tasks is likely expired: do not assume it is usable or commit it.

Close once with **Done / Changed / Files / Validations / Risks / Next**. Do not call mocked checks or source review a real operational PASS.
