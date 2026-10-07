## Done
- Removed exactly the three legacy summary cards (Cliente / Presupuesto base / Saldo pendiente). No replacement calculations, queries, indicators or placeholders.
- Sol / effective model `openai/gpt-6.1-sol`; exact ownership released.

## Changed
- Removed unused `formatCurrency`, `LABEL_CLS`, `latestPR` and `_remitos` binding.
- Preserved the full parent prop interface, including Antigravity's pre-existing `onAutorizar`, and the four original child props by identity.
- Kept existing section title/icon/container and child integration; no general redesign.

## Files
- `src/components/expediente/ComercialTabContent.tsx` — deletion-only cleanup relative to received working-tree source. The `onAutorizar` addition shown vs HEAD is pre-existing foreign work, not this task's addition.
- `src/__tests__/components/ComercialTabContent.test.tsx` — isolated parent regression test with a prop-recording child stub.
- `knowledge/specs/SURGERY-COMPROBANTES-PARENT-CLEANUP-DEV-001/{TASK_BRIEF,LOCK,HANDOFF}.md` — bounded scope and released snapshot.

## Validations
- Exact allowlist: `node_modules/.bin/vitest.cmd run src/__tests__/components/ComercialTabContent.test.tsx` — 1 file / 1 test passed (1.59s). Contradictory legacy client/numbers/amounts and retired card labels absent; child remains mounted with unchanged object references; no parent fetch or callbacks fired.
- `node_modules/.bin/tsc.cmd --noEmit --incremental false` — passed without errors.
- `git diff --check -- src/components/expediente/ComercialTabContent.tsx` — passed. Focused diff inspected; original foreign prop addition preserved.
- Parent final Git blob: `036693fb33ad786263bf87249abb517a70793591`.
- New test final Git blob: `4908a7025a34b9d702909c1f4caaca4ca96082a2`.
- Validated panel/hook/previous HTTP test unchanged, hashes still `36df47e893319626fc1696294a4f13636fd8b892` / `34b069aa5fe26d1c07a83238a0b8e0427b2bf5bc` / `8ec1aac0acaf8af4f22e6bdea6e6044dbcbac3b7`. Previous 11 tests NOT rerun.

## Risks
- No new browser acceptance claim: MiniMax owns the planned rehearsal. Its inspected QA lock is application read-only; current OWNERSHIP excludes browser; no active browser/source freeze found. Reservation/release notice is published in this task lock, not its documents. Sol did not take over its context, server or reports.
- Parent test deliberately stubs the already-validated child and only certifies parent cleanup/prop integration, not backend persistence.
- No APIs/states/store/types/schema/Auth/permissions/Cajas/DB/fiscalization/dependencies/server changes; no build/commit/push/deploy.

## Next
- MiniMax: use the released parent hash above for the separately authorized browser rehearsal. Open `/cirugias` → existing Ficha CX → Comprobantes; the backend panel now sits directly below the section heading, without the three legacy cards. No backend-panel QA rerun required solely for this parent deletion.
