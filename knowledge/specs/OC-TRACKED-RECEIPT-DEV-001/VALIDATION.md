# Tracked receipt validation — 2026-10-04 continuation

## Done
Consolidated mocked regression and independent production-source re-review completed. Existing backend/UI implementation preserved.

## Changed
Diagnose: three old hook/dialog tests could not submit because their fixture omitted the canonical trace policy. All dialog callers were inspected; the production caller already passes verified policies. Added explicit `tracePolicies={{ item: "NONE" }}` only to the old test harness. No production fallback or contract change.

## Files
- `src/__tests__/unit/useOrdenesCompra-receipt-reconciliation.test.tsx` — one-line fixture alignment.
- Current task folder/lock — bounded continuation evidence and ownership.

## Validations
Run from `E:\OSSUM_COR_ANTIGRAVITY\ux-ui`:

```powershell
node node_modules/vitest/vitest.mjs run src/__tests__/unit/orden-compra-tracked-receipt.test.ts src/__tests__/unit/orden-compra-stock-receipt.test.ts src/__tests__/unit/orden-compra-stock-receipt-route.test.ts src/__tests__/unit/orden-compra-validators.test.ts src/__tests__/components/ReceiveOrdenCompraDialog.test.tsx src/__tests__/components/TrackedReceiveOrdenCompraDialog.test.tsx src/__tests__/components/OrdenCompraEmitAction.test.tsx src/__tests__/unit/useOrdenesCompra-receipt-reconciliation.test.tsx
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

- **PASS mocked:** 200 tests, eight files. Before fixture alignment: 197 PASS/3 FAIL, solely the omitted policy harness.
- **PASS source review:** `confident-harlequin-guppy`, independent read-only review of production backend corrections and UI/callers/constraints. Warning persistence and post-commit WARNING content, exact Decimal spellings, company-wide serial constraint and transaction rollback structure, UTC calendar-date policy, legacy NONE intent, reordered tracked replay and uncertain trace freeze confirmed by inspection. Reviewer identified the same fixture defect; corrected and tests repeated by coordinator. Review is not live concurrency evidence.
- **FAIL global types:** only `next.config.ts(10,3) TS2353` unsupported `eslint` property, foreign reserved configuration. First 120-second invocation timed out; second invocation completed with this one error. No check disabled or configuration edited.
- **NOT RUN build:** readiness owns the running DEV5000/shared `.next`; no build/typegen/restart over that reservation.
- **PASS authenticated preflight:** existing listener PID21948; cold login initially exceeded short timeouts, later HTTP200 after35s. Subsequent actual `dev-session.mjs preflight` returned authenticated/200 JSON exact-company membership with the same external saved state, browser closed. Initial transient BLOCKED was not classified as expired Auth or functional regression.
- **PASS QA syntax/discovery:** node --check runner; node scripts/qa/run-compras-tracked-process.mjs --list. Two saved tests discovered, browser/DB NOT RUN.
- **PASS independent PRE-LIVE QA source review:** prime-aquamarine-shark checked actual payload schemas/statuses/projections/selectors/guards. Nonblocking clarification applied: OC route reads latest100 company-wide; removed ignored supplier/take query parameters, retained cap guards.
- **PASS scoped QA Diagnose:** author timed out after leaving three files. Coordinator reproduced ten TypeScript errors in the new spec (empty arrays inferred never[] and callback-assigned nativeIntent control-flow). Added explicit snapshot-array types and a checked local submittedIntent; repeated tsc reports only the known foreign next.config.ts error, no owned errors. No business code changed.
- **BLOCKED tracked live acceptance:** exact offline runner configuration emitted `E2E blocked by expired authentication state` for the existing saved file. Normal app preflight refreshed in memory, but that does not make the saved file fresh; do not bypass the runner's gate. Fresh manual login required. No new tracked fixtures, receipts, movements or identities written.
- **BLOCKED recipient WARNING notice persistence/replay acceptance:** existing actor exclusion and recipient-only notification API require authorized QA recipient readback. The saved second test explicitly fails this prerequisite rather than claiming a green overall acceptance. See REPLAY.md.

## Risks
Company-wide serial concurrency/rollback and actual traced readbacks still need real isolated DEV acceptance. In-app notice delivery retains existing best-effort recipient/mute behavior; durable warning evidence is distinct from guaranteed delivery. No complete downstream expiry-safe Cajas/serialized lifecycle claim.

## Next
Review the saved isolated tracked QA test before live writes. Reuse only the unchanged confirmed disposable DEV target `codevdistricorr1000000000` on the readiness-owned runtime, exact-company/role preflight and synthetic fixtures. Never run held Sol1 suites, modify real records, cleanup, Auth, schema, fiscal/mail, Git publication or deploy.

## Actual DEV follow-up — current result
- **PASS manual session:** Franco “Si abrilo”; headed manual capture and authenticated exact-company200 preflight. New external state, no overwrite/credentials automation; contexts closed.
- **PASS strict dates:** four invalid-calendar/date-format requests400 with unchanged full snapshots before ingress.
- **PASS native receiving:** retained new QA main OC `cmutyb50s0038xohuqs84k5ff` received LOT_EXPIRY + LOT_SERIAL_EXPIRY, quantity2+2, native200/Recibida, expired advisory and post-acceptance warning visible, two durable expired audit warnings, no expired ingress block. Receipt `cmutz3iqf0048xohu593e5jqf`.
- **PASS actual canonical readback:** saved READBACK.mjs repeated after stronger exact order/item/allocation/line/movement/identity bijections and explicit company/static readpath guards. Four ReceiptLines/four movements/two ACTIVE serials, exact dates/lots/series/location/actor and OC/Receipt links. Initial full spec stopped on a cold direct canonical GET15s; focused readback confirmed persisted state, GET timeout45s now retains fixed global budget.
- **PASS actual accepted-operation verification:** VERIFY_ACCEPTED.mjs on same fixtures, no new catalog/OC creation; original key matched actual OC audit/Receipt idempotency. Exact and reordered allocations/equivalent Decimal spellings200 with unchanged orders/stock/identities/receipts/audits. Changed trace409 and cross-article serial409 unchanged. Concurrent unique-company serial race on two untouched sibling articles/OCs produced exactly one200/one409, one new identity/Receipt/movement, original data unchanged, loser rollback, full winner actor/location/trace/line/unit/audit pointers, reload unchanged.
- **PASS fresh NONE actual regression:** existing frozen runner/fixture preparation with new SKU and OC; stock0→1→4, two receipts/movements, replays/conflicts/overflow and reload checks. Earlier completed OCs untouched.
- **BLOCKED recipient notice:** actor is excluded, needs manual state for another existing authorized QA Admin/Logistics recipient to verify actual WARNING content/metadata/persistence/replay deduplication. Current second full-spec test intentionally fails this prerequisite.
- **No uninterrupted complete tracked spec PASS:** receiving/canonical/accepted verification were retained-case segments after Diagnose. Do not aggregate them into a claim that the original full runner passed. All business writes synthetic, no cleanup/backfill; all browser contexts closed; source implementation untouched.
- **PASS final checkpoint review:** outside-moccasin-lynx cross-checked source, saved verification result and bounded claims; no material inconsistency. Latest exact mocked allowlist repeated200/200 at12:52local, syntax/discovery/owned whitespace PASS; latest tsc still only the foreign next.configeslint error. No active writer; QA/docs lock reserved while awaiting recipient login.
