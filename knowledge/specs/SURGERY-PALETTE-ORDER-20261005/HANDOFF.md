# Surgery palette and order — partial acceptance

## Outcome

Existing statuses now use white (unauthorized/no date), yellow (pending/authorized dated), light blue (in transit), green (performed), dark blue (finalized), violet (suspended), burgundy (cancelled), and grey (without consumption). Existing state names and persisted transitions are unchanged. The non-authorizing-user category is explicitly deferred by Franco; no authorization permission bypass exists in this change.

The color guide uses the existing `ALL_STATES` order: unauthorized/no date, pending/authorized, in transit, performed, finalized, suspended, cancelled, without consumption. Authorization remains a distinct existing alias, not a new state.

## Scope and ownership

- Workspace: `E:/OSSUM_COR_ANTIGRAVITY/ux-ui`, base HEAD `21385527dcfbc6ebc5b1507096d03a2c402d8c4d` plus preserved foreign local changes.
- Source delegate failed without changes. Coordinator recovered inline under `.opencode/locks/SURGERY-PALETTE-ORDER-20261005.lock.md`.
- Shared palettes, Cirugías status cell/legacy row/grid row/column/mobile card, Ficha header, color guide and focused tests only.
- Ficha header already had foreign changes: only the palette import and lookup were changed here. No page/hooks/store/types/adapter/API/service/schema edits.
- Read-only date context selects white for `Autorizada` with explicit empty/null date and yellow with a date. It never replaces the stored label. Views with only a state string continue using the static palette; date-specific styling in legacy previews/calendar is outside this finite correction.
- Consumption/invoice facts are not reclassified or fetched by this correction. Green/dark blue apply to existing `Realizada`/`Finalizada` states; they are not proof of authoritative consumption/invoice evidence.

## Validation

Run from the delivery workspace:

```powershell
node node_modules/vitest/vitest.mjs run src/__tests__/components/SurgeryPalette.test.tsx src/__tests__/unit/cirugias-estado-prep-separation.test.ts
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

- PASS: explicit mocked unit/component allowlist, 42/42 tests, 2026-10-05 16:43 local. Palette consistency, retained order/state set, date-dependent authorization styling without label mutation, solid-label readability and actual guide component render/order.
- PASS: scoped tracked whitespace checks.
- FAIL (pre-existing): global TypeScript only `next.config.ts(10,3)` unsupported `eslint` property. Same failure reproduced before source editing. Foreign config unchanged; no checks disabled.
- Detector: warnings for near-black slate text on yellow/light-blue surfaces; these deliberately replace unreadable white text. No unrelated aesthetic rewrite performed.
- BLOCKED: independent final source review `fat-bronze-felidae` returned ERROR `Delegation failed`, actual notified result retrieved. Source and advisory delegations also failed; direct subagent tooling returned permission denied. No independent review PASS. All delegates ended; this task's lock released with frozen source and incomplete acceptance, not feature certification.
- Advisory review `jittery-gray-panther`: ERROR, `Delegation failed`; notified result retrieved, no findings or independent acceptance produced. This was advisory only and does not replace the pending final review. No source changes made in response.
- NOT RUN: browser QA and build; reserved DEV5000/`.next` not taken over. No operational acceptance claimed.
- BLOCKED: Sol1 Preparation→Remito DB acceptance remains under its existing hold. No DB queries, integrations, seed, cleanup or forensics executed.

## Next

Obtain independent read-only review from another available session (for example Sol2), using the exact file allowlist in this task's released lock and this handoff. No source write ownership transfers implicitly. Resolve confirmed findings sequentially under a fresh scoped lock and re-run the exact test allowlist if changed. Coordinate a browser validation window separately; do not restart/build the reserved runtime or navigate DB-backed fixtures without their authorized prerequisites. No commit, push or deploy requested or performed.
