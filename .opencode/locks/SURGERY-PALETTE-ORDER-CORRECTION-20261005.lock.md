# Surgery Palette Order Correction — Bounded Fixes

- task: SURGERY-PALETTE-ORDER-CORRECTION-20261005
- owner/role/model: Antigravity / sole implementation owner
- status: released (independent source review PASS by Sol2; 54/54 tests exit 0; reviewed source preserved)
- workspace: E:/OSSUM_COR_ANTIGRAVITY/ux-ui; base HEAD 21385527dcfbc6ebc5b1507096d03a2c402d8c4d
- approval: Franco requested bounded correction of confirmed Sol2 findings F1/F2/F3 and complementary header/sticky presentation defects.
- brief:
  1. F1: Removed claims of consumption/invoicing evidence from guide copy in ColorReferenceDialog.tsx. Added explicit disclaimer that colors reflect operational status without proving backend records.
  2. F2: Extended explicit empty-date branch in shared-constants.ts to Pendiente (undated -> white, dated -> yellow), preserving displayed label and undefined-date static fallback.
  3. F3: Added read-only optional date context to ChangeStateDialog.tsx dialogSurgery prop and used contextual lookup for current/new case previews while preserving static option dots, evidence handlers and foreign changes.
  4. White Ficha status button: Added minimal visible boundary styling (`border border-slate-300 dark:border-slate-700`) for white backgrounds in ExpedienteHeader.tsx for both themes without redesign.
  5. Solid variants: Aligned sticky/solid-state handling for variants "a" and "d" across CirugiaRow.tsx and CirugiasGridRow.tsx without altering selection or table interaction semantics.
- reviewed files and verified hashes (SHA-256):
  - src/lib/shared-constants.ts: F405690D467824545442A26EAADC2C449DE1383506E1AA8E5B6988ED6AFB22D6
  - src/components/cirugias/view-customization/ColorReferenceDialog.tsx: D32A18822A83D26676BA2B7D81EF943AA00A57931EFC1F2A5EFD7CEBEF48D437
  - src/components/cirugias/dialogs/ChangeStateDialog.tsx: 810EA6F2F8F8DDD6CB043FA252F204607090597B29C21B9753A078CEC392630E
  - src/components/expediente/ExpedienteHeader.tsx: 6659AC970B1593DED8BFD95C1D23267BC05476019F906CED135CB1E321045E25
  - src/components/cirugias/CirugiaRow.tsx: 954A13F477AD1153F6DCF74D2030F9E012902BFFFC5073F829774779CCE86749
  - src/components/cirugias/CirugiasGridRow.tsx: 96BE0384EFB7E40228ECBC61A5500B5046A3BF482D0FB48010A372F89765844D
  - src/__tests__/components/SurgeryPalette.test.tsx: 257A35D58E0C7BA35EDF1325F42C027663C42753BF149A17E4FAA6601BBFBDBE
- documentary lock reconciliation:
  - Sol2 independently verified that all 7 application source/test hashes match the declared snapshot identically.
  - The previous handoff text referenced a lock hash prefix (872B8AE1...) which differed from the re-review hash (F3B26F3E...); this discrepancy is purely documentary/provenance and does not represent any source code drift.
- validation evidence:
  - Independent source review: PASS (Sol2 REREVIEW-SOL2-20261005-1716)
  - Scoped Vitest allowlist: PASS (54/54 tests, 5 files, exit 0)
  - Global TypeScript: FAIL (compiler exit 2, sole pre-existing TS2353 at next.config.ts:10 for unsupported eslint; zero errors in palette/application code)
  - Tracked diff & whitespace: PASS (git diff --check exit 0, zero trailing whitespace findings)
  - Browser acceptance: BLOCKED / NOT RUN (no live dev server or authenticated session executed; pending separate window)
  - Satellite views: EXCLUDED (Coordinadores and Calendario surfaces remain outside this bounded correction package)
  - Database hold: Sol1 DB hold remains active and intact; no DB queries, connections, seeds, or mutations were run
- foreign preservation: preserved dirty foreign authorization hunks in ExpedienteHeader.tsx and ChangeStateDialog.tsx exactly.
